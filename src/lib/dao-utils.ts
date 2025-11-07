import { useQuery } from '@tanstack/react-query'
import { fetchTallyGovernor, fetchAllTallyProposals } from './tally-utils'
import { fetchSpace, fetchAllProposals } from './snapshot-utils'
import { normalizeTallyDAO, normalizeSnapshotDAO, normalizeTallyProposal, normalizeSnapshotProposal } from './data-normalizer'

const getTimestampFromBlockLike = (value: any): number | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000)
    }
    const numeric = Number(value)
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return Math.floor(numeric)
    }
    return undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value)
  }

  if (typeof value === 'object') {
    if ('timestamp' in value) {
      return getTimestampFromBlockLike((value as any).timestamp)
    }
    if ('ts' in value) {
      return getTimestampFromBlockLike((value as any).ts)
    }
  }

  return undefined
}

/**
 * Enhanced fetchDaoInfo with source routing
 */
export async function fetchDaoInfo(
  source: string = 'snapshot',
  identifier: string = 'aave.eth'
): Promise<any> {
  if (source === 'snapshot') {
    return fetchSnapshotDaoInfo(identifier);
  } else if (source === 'tally') {
    return fetchTallyDaoInfo(identifier);
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Fetch Snapshot DAO info
 */
async function fetchSnapshotDaoInfo(space: string): Promise<any> {
  try {
    const spaceData = await fetchSpace(space);
    return normalizeSnapshotDAO(spaceData);
  } catch (error) {
    console.error('Error fetching Snapshot DAO info:', error);
    throw error;
  }
}

/**
 * Fetch Tally DAO info
 */
async function fetchTallyDaoInfo(governorId: string): Promise<any> {
  try {
    // Use the full EIP-155 identifier for Tally API
    const governor = await fetchTallyGovernor(governorId);
    return normalizeTallyDAO(governor);
  } catch (error) {
    console.error('Error fetching Tally DAO info:', error);
    throw error;
  }
}

/**
 * Enhanced fetchProposals with source routing and sub-DAO support
 */
export async function fetchProposals(
  source: string,
  identifier: string,
  limit: number = 300,
  subDaos?: Array<{ name: string; identifier: string; source: string }>
): Promise<any> {
  if (source === 'snapshot') {
    return fetchSnapshotProposalsData(identifier, limit);
  } else if (source === 'tally') {
    // If subDaos are provided, fetch from all of them
    if (subDaos && subDaos.length > 0) {
      return fetchTallyProposalsDataMultiple(subDaos, limit);
    }
    return fetchTallyProposalsData(identifier, limit);
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Fetch Snapshot proposals
 */
async function fetchSnapshotProposalsData(space: string, limit: number = 300): Promise<any> {
  try {
    const result = await fetchAllProposals(space, limit);
    // Normalize the proposals and add source/space information
    const normalizedProposals = result.proposals.map((proposal: any) => ({
      ...normalizeSnapshotProposal(proposal),
      source: 'snapshot',
      space: proposal.space || { id: space }
    }));
    return { proposals: normalizedProposals };
  } catch (error) {
    console.error('Error fetching Snapshot proposals:', error);
    throw error;
  }
}

/**
 * Fetch Tally proposals from multiple sub-DAOs (governors)
 */
async function fetchTallyProposalsDataMultiple(
  subDaos: Array<{ name: string; identifier: string; source: string }>,
  limit: number = 300
): Promise<any> {
  try {
    const allProposals: any[] = [];
    const limitPerDao = Math.floor(limit / Math.max(1, subDaos.length));

    // Fetch proposals from each sub-DAO
    for (const subDao of subDaos) {
      try {
        const result = await fetchTallyProposalsData(subDao.identifier, limitPerDao);
        allProposals.push(...(result.proposals || []));
      } catch (error) {
        // Continue with other sub-DAOs even if one fails
      }
    }

    // Sort by endTime descending (newest first)
    allProposals.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

    // Return the combined and sorted results
    return { proposals: allProposals.slice(0, limit) };
  } catch (error) {
    console.error('Error fetching multiple Tally proposals:', error);
    throw error;
  }
}

/**
 * Fetch Tally proposals
 */
async function fetchTallyProposalsData(
  governorId: string,
  limit: number = 300
): Promise<any> {
  try {
    // First fetch the governor to get the organization ID
    const governor = await fetchTallyGovernor(governorId);
    const result = await fetchAllTallyProposals(governor.id ?? governorId, limit);
    
    const normalizedProposals = (result.proposals || []).map((proposal: any) => {
      const startTimestamp = getTimestampFromBlockLike(proposal.start) ?? getTimestampFromBlockLike(proposal.block?.timestamp);
      const endTimestamp = getTimestampFromBlockLike(proposal.end);

      return normalizeTallyProposal(proposal, {
        startTimestamp,
        endTimestamp,
      });
    });
    
    return { proposals: normalizedProposals };
  } catch (error) {
    console.error('Error fetching Tally proposals:', error);
    throw error;
  }
}

/**
 * Base function to fetch DAO info - Non-hook version (legacy)
 */
export async function fetchDaoInfoLegacy(source: string = 'snapshot', identifier: string = 'aave.eth'): Promise<any> {
  try {
    return await fetchProposals(source, identifier);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    throw error;
  }
}

/**
 * Filter proposals by age (in days)
 */
export const filterProposalsByAge = (proposals: any[], maxAgeDays: number) => {
  if (!proposals || proposals.length === 0) return [];
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return proposals.filter((proposal: any) => {
    const proposalAge = now - proposal.start;
    const maxAgeSeconds = maxAgeDays * 24 * 60 * 60; // Convert days to seconds
    return proposalAge <= maxAgeSeconds;
  });
};

/**
 * Process proposals to extract the most recent ones and generate an AI prompt
 * @param proposals - Array of proposals
 * @param isLoading - Loading state
 * @param error - Error state
 * @param maxProposals - Maximum number of proposals to return (default: 20)
 * @returns Object containing latest proposals and the generated prompt
 */
export function processProposalsForDigest(
  proposals: any[],
  isLoading: boolean,
  error: any,
  maxProposals: number = 20
) {
  const latestProposals = 
    !isLoading && !error && proposals.length > 0
      ? proposals.slice(-maxProposals)
      : [];

  const prompt = 
    proposals.length === 0 || isLoading
      ? ''
      : `Recent proposals: ${latestProposals
          .map((p: any) => `BEGIN "${p.title}" - ${p.body} END`)
          .join('\n')}`;

  return { latestProposals, prompt };
}

/**
 * Convert time string in format "HH:MM" or "MM" to minutes
 */
export const parseTimeToMinutes = (timeStr: string | number): number => {
  if (typeof timeStr === 'number') return timeStr;
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    return parts.length === 2
      ? parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
      : parseInt(parts[1], 10);
  }
  return 0;
};

/**
 * Convert minutes to "HH:MM" format
 */
export const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * React Query hook for Tally DAO info
 */
export function useTallyDaoInfo(
  governorId: string,
  options = {}
) {
  return useQuery({
    queryKey: ['tallyDaoInfo', governorId],
    queryFn: () => fetchTallyDaoInfo(governorId),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    ...options,
  });
}

/**
 * React Query hook for Tally proposals
 */
export function useTallyProposals(
  governorId: string,
  limit: number = 300,
  options = {}
) {
  return useQuery({
    queryKey: ['tallyProposals', governorId, limit],
    queryFn: () => fetchTallyProposalsData(governorId, limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    ...options,
  });
}
