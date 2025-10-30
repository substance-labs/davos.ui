/**
 * Unified data format for proposals from different sources
 */
export interface NormalizedProposal {
  id: string;
  title: string;
  description: string;
  state: 'pending' | 'active' | 'closed' | 'canceled' | 'defeated' | 'succeeded';
  startTime: number; // Unix timestamp in seconds
  endTime: number; // Unix timestamp in seconds
  choices: string[];
  scores: number[];
  totalVotes: number;
  author: string;
  source: 'snapshot' | 'tally';
  sourceData: any; // Original data from source
}

export interface NormalizedDAO {
  id: string;
  name: string;
  description: string;
  members: number;
  proposalsCount: number;
  votesCount: number;
  source: 'snapshot' | 'tally';
  sourceData: any;
}

/**
 * Normalize Snapshot proposal to unified format
 */
export function normalizeSnapshotProposal(proposal: any): NormalizedProposal {
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.body,
    state: normalizeSnapshotState(proposal.state),
    startTime: proposal.start,
    endTime: proposal.end,
    choices: proposal.choices || [],
    scores: proposal.scores || [],
    totalVotes: proposal.scores_total || 0,
    author: proposal.author,
    source: 'snapshot',
    sourceData: proposal,
  };
}

/**
 * Normalize Tally proposal to unified format
 */
type NormalizeTallyProposalOptions = {
  startTimestamp?: number;
  endTimestamp?: number;
};

const parseTimestamp = (value: any): number => {
  if (!value) {
    return 0;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return Math.floor(numeric);
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) {
      return Math.floor(value / 1000);
    }
    return Math.floor(value);
  }

  if (typeof value === 'object' && value !== null) {
    return parseTimestamp(value.timestamp ?? value.ts);
  }

  return 0;
};

export function normalizeTallyProposal(
  proposal: any,
  options: NormalizeTallyProposalOptions = {}
): NormalizedProposal {
  // Parse ISO timestamp to Unix timestamp
  // Example: "2022-10-08T05:51:53Z" -> unix timestamp in seconds
  let startTime = 0;
  let endTime = 0;

  if (typeof options.startTimestamp === 'number' && options.startTimestamp > 0) {
    startTime = options.startTimestamp;
  }

  if (startTime === 0) {
    startTime = parseTimestamp(proposal.start) || parseTimestamp(proposal.block?.timestamp);
  }

  if (typeof options.endTimestamp === 'number' && options.endTimestamp > 0) {
    endTime = options.endTimestamp;
  }

  if (endTime === 0) {
    endTime = parseTimestamp(proposal.end);
  }

  if (endTime === 0 && startTime > 0) {
    endTime = startTime;
  }

  // Map Tally support values to choice labels
  const choices = ['Against', 'For', 'Abstain'];

  // Calculate scores from vote stats
  const voteStatsList = Array.isArray(proposal.voteStats) ? proposal.voteStats : [];
  const voteSummary = {
    against: 0,
    for: 0,
    abstain: 0,
  };

  for (const stat of voteStatsList) {
    const type = typeof stat?.type === 'string' ? stat.type.toLowerCase() : '';
    const votesCount = typeof stat?.votesCount === 'string'
      ? parseInt(stat.votesCount, 10)
      : typeof stat?.votesCount === 'number'
        ? stat.votesCount
        : 0;

    if (Number.isNaN(votesCount) || votesCount <= 0) {
      continue;
    }

    if (type === 'against') {
      voteSummary.against = votesCount;
    } else if (type === 'for') {
      voteSummary.for = votesCount;
    } else if (type === 'abstain') {
      voteSummary.abstain = votesCount;
    }
  }

  const scores = [voteSummary.against, voteSummary.for, voteSummary.abstain];

  const totalVotes = scores.reduce((sum, score) => sum + score, 0);

  // Log if status is missing
  if (!proposal.status) {
    console.warn('[Data Normalizer] Proposal missing status field:', {
      id: proposal.id,
      title: proposal.metadata?.title,
    });
  }

  return {
    id: proposal.id,
    title: proposal.metadata?.title || 'Untitled',
    description: proposal.metadata?.description || '',
    state: normalizeTallyState(proposal.status),
    startTime,
    endTime,
    choices,
    scores,
    totalVotes,
    author: proposal.proposer?.address || 'Unknown',
    source: 'tally',
    sourceData: proposal,
  };
}

/**
 * Normalize Snapshot proposal state to unified format
 */
function normalizeSnapshotState(
  state: string
): NormalizedProposal['state'] {
  switch (state?.toLowerCase()) {
    case 'pending':
      return 'pending';
    case 'active':
      return 'active';
    case 'closed':
      return 'closed';
    default:
      return 'closed';
  }
}

/**
 * Normalize Tally proposal state to unified format
 */
function normalizeTallyState(
  state: string
): NormalizedProposal['state'] {
  const normalizedState = state?.toUpperCase();
  switch (normalizedState) {
    case 'PENDING':
      return 'pending';
    case 'ACTIVE':
      return 'active';
    case 'LIVE':
      return 'active';
    case 'SUBMITTED':
      return 'pending';
    case 'CANCELED':
      return 'canceled';
    case 'DEFEATED':
      return 'defeated';
    case 'SUCCEEDED':
      return 'succeeded';
    case 'QUEUED':
      return 'active';
    case 'PENDINGEXECUTION':
      return 'active';
    case 'CROSSCHAINQUEUED':
      return 'active';
    case 'CROSSCHAINPENDINGEXECUTION':
      return 'active';
    case 'EXPIRED':
      return 'closed';
    case 'EXECUTED':
      return 'closed';
    case 'CROSSCHAINEXECUTED':
      return 'closed';
    case 'ARCHIVED':
      return 'closed';
    default:
      // Log unknown statuses to help debug
      if (normalizedState) {
        console.warn('[Data Normalizer] Unknown Tally proposal status:', state);
      }
      return 'closed';
  }
}

/**
 * Normalize Snapshot DAO to unified format
 */
export function normalizeSnapshotDAO(space: any): NormalizedDAO {
  return {
    id: space.id,
    name: space.name,
    description: space.about || '',
    members: space.members || 0,
    proposalsCount: space.proposalsCount || 0,
    votesCount: space.votesCount || 0,
    source: 'snapshot',
    sourceData: space,
  };
}

/**
 * Normalize Tally DAO to unified format
 */
export function normalizeTallyDAO(governor: any): NormalizedDAO {
  return {
    id: governor.id,
    name: governor.name,
    description: governor.description || '',
    members: 0, // Tally doesn't provide delegates count in governor query
    proposalsCount: governor.proposalStats?.total || 0,
    votesCount: 0,
    source: 'tally',
    sourceData: governor,
  };
}
