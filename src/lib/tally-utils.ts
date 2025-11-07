import { TALLY_API_URL, TALLY_API_KEY } from './constants';

// Simple in-memory cache for Tally API calls to avoid rate limiting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tallyGraphQLCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Request queue to prevent concurrent API calls
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let requestQueue: Promise<any> = Promise.resolve();
const REQUEST_DELAY = 1000; // 1 second between requests

/**
 * Generate cache key from query and variables
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCacheKey(query: string, variables: Record<string, any>): string {
  return `${query.substring(0, 50)}_${JSON.stringify(variables)}`;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const TALLY_GOVERNOR_QUERY = `
  query Governor($input: GovernorInput!) {
    governor(input: $input) {
      id
      name
      chainId
      organization {
        id
        name
      }
      token {
        name
        symbol
        decimals
      }
      proposalStats {
        total
      }
    }
  }
`;

export const TALLY_PROPOSALS_QUERY = `
  query Proposals($input: ProposalsInput!) {
    proposals(input: $input) {
      nodes {
        ... on Proposal {
          id
          metadata {
            title
            description
          }
          block {
            number
            timestamp
          }
          status
          start {
            __typename
            ... on Block {
              number
              timestamp
            }
            ... on BlocklessTimestamp {
              timestamp
            }
          }
          end {
            __typename
            ... on Block {
              number
              timestamp
            }
            ... on BlocklessTimestamp {
              timestamp
            }
          }
          voteStats {
            type
            votesCount
            votersCount
            percent
          }
        }
      }
      pageInfo {
        firstCursor
        lastCursor
        count
      }
    }
  }
`;

export const TALLY_DELEGATION_QUERY = `
  query Delegation($input: DelegationInput!) {
    delegation(input: $input) {
      delegator {
        address
      }
      delegatee {
        address
      }
      votes
      block {
        timestamp
      }
    }
  }
`;

/**
 * Base Tally GraphQL fetch function with queuing to prevent rate limits
 */

export async function fetchTallyGraphQL(
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables: Record<string, any> = {}
) {
  if (!TALLY_API_KEY) {
    throw new Error('Tally API key not configured');
  }

  // Check cache first
  const cacheKey = getCacheKey(query, variables);
  const cached = tallyGraphQLCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Queue the request to prevent concurrent API calls that cause rate limiting
  return new Promise((resolve, reject) => {
    requestQueue = requestQueue.then(async () => {
      try {
        const response = await fetch(TALLY_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': TALLY_API_KEY,
          },
          body: JSON.stringify({
            query,
            variables,
          }),
        });

        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status} - ${responseText}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Failed to parse Tally response JSON: ${(parseError as Error).message}`);
        }

        if (data.errors) {
          throw new Error(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            `GraphQL error: ${data.errors.map((e: any) => e.message).join(', ')}`
          );
        }

        // Cache the successful response
        tallyGraphQLCache.set(cacheKey, { data: data.data, timestamp: Date.now() });

        // Add delay before next request
        await delay(REQUEST_DELAY);

        resolve(data.data);
      } catch (error) {
        console.error('Error fetching Tally GraphQL data:', error);
        reject(error);
      }
    });
  });
}

/**
 * Fetch Governor (DAO) information
 */
export async function fetchTallyGovernor(governorId: string) {
  const result = await fetchTallyGraphQL(TALLY_GOVERNOR_QUERY, {
    input: {
      id: governorId,
    },
  });

  return result.governor;
}

/**
 * Fetch all proposals with pagination
 */
export async function fetchAllTallyProposals(governorId: string, limit: number = 1000) {
  const maxPerPage = 20; // PageInput hard limit per docs
  const cappedLimit = Math.min(limit, 1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposals: any[] = [];
  let cursor: string | undefined;

  while (proposals.length < cappedLimit) {
    const currentPageSize = Math.min(maxPerPage, cappedLimit - proposals.length);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page: Record<string, any> = { limit: currentPageSize };
    if (cursor) {
      page.afterCursor = cursor;
    }

    const result = await fetchTallyGraphQL(TALLY_PROPOSALS_QUERY, {
      input: {
        filters: { governorId },
        page,
        sort: {
          sortBy: 'id',
          isDescending: true,
        },
      },
    });

    const nodes = result?.proposals?.nodes ?? [];
    if (!nodes.length) {
      break;
    }

    proposals.push(...nodes);

    const pageInfo = result?.proposals?.pageInfo;
    cursor = pageInfo?.lastCursor;

    if (!cursor || nodes.length < currentPageSize) {
      break;
    }
  }

  return { proposals };
}

/**
 * Fetch delegation information
 */
export async function fetchTallyDelegation(delegator: string, governorId: string) {
  const result = await fetchTallyGraphQL(TALLY_DELEGATION_QUERY, {
    input: {
      delegator,
      governorId,
    },
  });

  return result.delegation;
}
