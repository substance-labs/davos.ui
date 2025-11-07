/**
 * Proposal calculation utilities
 * Centralized logic for calculating proposal statistics and metrics
 */

import { formatMinutesToTime, parseTimeToMinutes } from './dao-utils';

interface Proposal {
  state?: string;
  start?: number;
  end?: number;
  votes?: number;
  sourceData?: {
    voteStats?: Array<{
      votersCount?: number;
    }>;
  };
}

interface SpaceData {
  members?: number;
  followersCount?: number;
}

export interface DaoData {
  summary?: {
    average_reading_time_per_day?: string;
    total_proposals?: number;
    median_reading_time_per_proposal?: string;
  };
}

export interface ProposalCalcOptions {
  source: 'snapshot' | 'tally';
  proposals: Proposal[];
  spaceData?: SpaceData;
  daoData?: DaoData;
}

/**
 * Calculate number of active proposals
 */
export function calculateActiveProposals(proposals: Proposal[]): number {
  return proposals.filter(proposal => proposal?.state === 'active').length;
}

/**
 * Calculate number of recent proposals (last 90 days)
 */
export function calculateRecentProposals(
  proposals: Proposal[],
  source: 'snapshot' | 'tally'
): number {
  if (proposals.length === 0) return 0;

  const now = Math.floor(Date.now() / 1000);
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

  if (source === 'tally') {
    return proposals.filter(p => (p.start ?? 0) >= ninetyDaysAgo).length;
  }

  return proposals.filter(p => (p.start ?? 0) >= ninetyDaysAgo).length;
}

/**
 * Calculate total members/followers for a DAO
 */
export function calculateTotalMembers(options: ProposalCalcOptions): number {
  const { source, proposals, spaceData } = options;

  if (source === 'snapshot' && spaceData?.followersCount) {
    return spaceData.followersCount;
  }

  if (source === 'tally' && proposals.length > 0) {
    const totalVoters = proposals.reduce((sum: number, p) => {
      if (p.sourceData?.voteStats) {
        const proposalVoters = p.sourceData.voteStats.reduce((vSum: number, stat) => {
          return vSum + (stat.votersCount || 0);
        }, 0);
        return sum + proposalVoters;
      }
      return sum;
    }, 0);

    return totalVoters;
  }

  return 0;
}

/**
 * Calculate active voters (last 30 days)
 */
export function calculateActiveVoters(options: ProposalCalcOptions): number {
  const { source, proposals, spaceData } = options;

  if (source === 'snapshot' && spaceData?.followersCount) {
    return spaceData.followersCount;
  }

  if (source === 'tally' && proposals.length > 0) {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

    const recentProposals = proposals.filter(p => (p.start ?? 0) >= thirtyDaysAgo);

    const totalVoters = recentProposals.reduce((sum: number, p) => {
      if (p.sourceData?.voteStats) {
        const proposalVoters = p.sourceData.voteStats.reduce((vSum: number, stat) => {
          return vSum + (stat.votersCount || 0);
        }, 0);
        return sum + proposalVoters;
      }
      return sum;
    }, 0);

    return recentProposals.length > 0 ? Math.round(totalVoters / recentProposals.length) : 0;
  }

  return 0;
}

/**
 * Calculate participation effort (reading time per month)
 */
export function calculateParticipationEffort(options: ProposalCalcOptions): string {
  const { source, proposals, daoData } = options;

  const hasSummary = daoData?.summary;

  if (hasSummary && daoData?.summary?.average_reading_time_per_day) {
    const monthlyMins = parseTimeToMinutes(daoData.summary.average_reading_time_per_day) * 30;
    return formatMinutesToTime(monthlyMins);
  }

  if (proposals.length > 0) {
    const activeCount = proposals.filter(p => p.state === 'active').length;
    const minutesPerProposal = source === 'tally' ? 10 : 5;
    const estimatedMinutes = activeCount * minutesPerProposal * 30;
    return formatMinutesToTime(estimatedMinutes);
  }

  return '0h';
}

/**
 * Calculate chart data scores (0-100)
 */
export function calculateChartData(
  options: ProposalCalcOptions & {
    totalMembers: number;
    activeVoters: number;
    recentProposals: number;
  }
): {
  activeVotingWeight: number;
  activeVoters: number;
  activityScore: number;
  participationEffortScore: number;
} {
  const { totalMembers, activeVoters, recentProposals, daoData } = options;

  const hasSummary = daoData?.summary;
  const monthlyMins =
    hasSummary && daoData?.summary?.average_reading_time_per_day
      ? parseTimeToMinutes(daoData.summary.average_reading_time_per_day) * 30
      : 0;

  return {
    activeVotingWeight: 100,
    activeVoters:
      totalMembers > 0 ? Math.min(Math.round((activeVoters / totalMembers) * 100), 100) : 0,
    activityScore:
      hasSummary && daoData?.summary?.total_proposals
        ? Math.min(Math.round((daoData.summary.total_proposals / 59) * 100), 100)
        : Math.min(Math.round((recentProposals / 30) * 100), 100),
    participationEffortScore:
      hasSummary && daoData?.summary?.median_reading_time_per_proposal
        ? Math.min(Math.round((monthlyMins / 600) * 100), 100)
        : 0,
  };
}

/**
 * All-in-one calculation function for DAO metrics
 */
export function calculateDaoMetrics(options: ProposalCalcOptions) {
  const activeProposals = calculateActiveProposals(options.proposals);
  const recentProposals = calculateRecentProposals(options.proposals, options.source);
  const totalMembers = calculateTotalMembers(options);
  const activeVoters = calculateActiveVoters(options);
  const participationEffort = calculateParticipationEffort(options);
  const chartData = calculateChartData({
    ...options,
    totalMembers,
    activeVoters,
    recentProposals,
  });

  return {
    activeProposals,
    recentProposals,
    totalMembers,
    activeVoters,
    participationEffort,
    chartData,
  };
}
