import { SNAPSHOT_API_URL, SPACE_QUERY } from './constants';

/**
 * Base GraphQL fetch function - Non-hook version
 */
export async function fetchGraphQL(query: string, variables: Record<string, unknown> = {}) {
  // Cap any 'limit' or 'first' variables at 1000 for Snapshot API compliance
  if (variables.limit && typeof variables.limit === 'number') {
    variables.limit = Math.min(variables.limit, 1000);
  }

  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // For test mode, use simple mock data to avoid complex transformations
    if (query.includes('query Space')) {
      const spaceId = (variables.id || variables.space) as string;
      try {
        // Call Snapshot GraphQL API directly for space data
        const response = await fetch(SNAPSHOT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables,
          }),
        });

        if (!response.ok) {
          console.error('Backend API error for space:', response.status);
          // Fallback to basic data
          return {
            space: {
              id: spaceId,
              name: spaceId.replace('.eth', '').replace('foundation', '').replace('governance', ''),
              about: 'Test DAO for development',
              network: '1',
              symbol: 'TEST',
              members: 184598,
              admins: [],
              strategies: [{ name: 'erc20-balance-of' }],
              proposalsCount: 1,
              votesCount: 5600000,
              followersCount: 1000,
            },
          };
        }

        const data = await response.json();

        // Use real data from backend - handle both formats
        const proposals = data.data?.proposals || data.proposals;
        if (proposals) {
          return {
            space: {
              id: spaceId,
              name: spaceId.replace('.eth', '').replace('foundation', '').replace('governance', ''),
              about: 'Test DAO for development',
              network: '1',
              symbol: 'TEST',
              members: 184598,
              admins: [],
              strategies: [{ name: 'erc20-balance-of' }],
              proposalsCount: proposals.length,
              votesCount: proposals.reduce(
                (sum: number, p: { scores_total?: number }) => sum + (p.scores_total || 0),
                0
              ),
              followersCount: 1000,
            },
          };
        }

        // Fallback if no proposals found
        return {
          space: {
            id: spaceId,
            name: spaceId.replace('.eth', '').replace('foundation', '').replace('governance', ''),
            about: 'Test DAO for development',
            network: '1',
            symbol: 'TEST',
            members: 184598,
            admins: [],
            strategies: [{ name: 'erc20-balance-of' }],
            proposalsCount: 1,
            votesCount: 5600000,
            followersCount: 1000,
          },
        };
      } catch (error) {
        console.error('Error fetching space data from backend:', error);
        // Fallback to basic data
        return {
          space: {
            id: spaceId,
            name: spaceId.replace('.eth', '').replace('foundation', '').replace('governance', ''),
            about: 'Test DAO for development',
            network: '1',
            symbol: 'TEST',
            members: 184598,
            admins: [],
            strategies: [{ name: 'erc20-balance-of' }],
            proposalsCount: 1,
            votesCount: 5600000,
            followersCount: 1000,
          },
        };
      }
    }

    if (query.includes('query Proposals')) {
      try {
        // Call the Snapshot GraphQL API directly instead of going through backend
        const response = await fetch(SNAPSHOT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables,
          }),
        });

        if (!response.ok) {
          console.error('Snapshot GraphQL error:', response.status);
          return { proposals: [] };
        }

        const data = await response.json();

        if (data.errors) {
          console.error('GraphQL errors:', data.errors);
          return { proposals: [] };
        }

        // Return the proposals data directly from Snapshot
        return data.data || { proposals: [] };
      } catch (error) {
        console.error('Error fetching proposals from Snapshot:', error);
        return { proposals: [] };
      }
    }

    throw new Error('Unsupported GraphQL query in test mode');
  }

  try {
    const response = await fetch(SNAPSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors.map((e: { message: string }) => e.message).join('\n'));
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching GraphQL data:', error);
    throw error;
  }
}

/**
 * Fetch Snapshot space information
 */
export async function fetchSpace(spaceId: string) {
  const result = await fetchGraphQL(SPACE_QUERY, { id: spaceId });
  return result.space;
}

/**
 * Fetch and cache all proposals for a space
 */
export async function fetchAllProposals(space: string, limit: number = 1000) {
  // Cap limit at 1000 as per Snapshot API constraints
  limit = Math.min(limit, 1000);

  const query = `
    query Proposals($space: String!, $limit: Int!) {
      proposals(
        first: $limit, 
        where: {
          space: $space
        },
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        title
        body
        choices
        start
        end
        snapshot
        state
        author
        space {
          id
          name
        }
        scores_total
        scores
        votes
      }
    }
  `;

  const result = await fetchGraphQL(query, { space, limit });
  return result;
}
