import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Github, Twitter, Zap } from "lucide-react"
import { ChartProps } from "./char-properties";
import { NavLink } from "react-router";
import { formatNumber } from "@/lib/utils";
import { PROPOSALS_QUERY, SPACE_QUERY } from "@/lib/constants";
import { useDaoInfo, useGraphQL, useProposals } from "@/hooks/use-dao";
import { useMemo } from "react";
import { formatMinutesToTime, parseTimeToMinutes } from "@/lib/dao-utils";

interface DaoCardProps {
    dao: any;
    logo: any;
}
  
export function DaoCard({ dao, logo }: DaoCardProps) {
    const { 
      data: daoData,
      isLoading: isDaoDataLoading,
    } = useDaoInfo(dao.source, dao.identifier);
    
    // For Snapshot DAOs
    const { 
      data: spaceResult,
      isLoading: isSpaceLoading,
      error: spaceError 
    } = useGraphQL(SPACE_QUERY, { id: dao.identifier }, { enabled: dao.source === 'snapshot' });
    
    const { 
      data: proposalsResult,
      isLoading: isProposalsLoading,
      error: proposalsError 
    } = useGraphQL(PROPOSALS_QUERY, 
      { 
        space: dao.identifier,
        limit: spaceResult?.space?.proposalsCount,
      },
      { enabled: dao.source === 'snapshot' && !!spaceResult?.space?.proposalsCount }
    );
    
    // For Tally DAOs
    const { 
      data: tallyProposalsResult,
    } = useProposals(dao.source, dao.identifier, 300, dao.subDaos, { enabled: dao.source === 'tally' });
    
    // Extract data from query results
    const spaceData = spaceResult?.space;
    const snapshotProposals = proposalsResult?.proposals || [];
    const tallyProposals = tallyProposalsResult?.proposals || [];
    const proposals = dao.source === 'tally' ? tallyProposals : snapshotProposals;
    
    // Combine loading and error states - ignore Tally errors since CORS will fail
    const isLoading = dao.source === 'tally' 
      ? isDaoDataLoading
      : isSpaceLoading || isProposalsLoading || isDaoDataLoading;
    
    // For error state, only show errors for Snapshot DAOs
    // Tally DAOs will have CORS errors but we ignore them
    const error = dao.source === 'tally'
      ? null
      : spaceError || proposalsError;
    
    // Calculate active proposals
    const activeProposals = useMemo(() => {
      const active = proposals.filter((proposal: any) => proposal?.state === 'active');
      return active.length;
    }, [proposals, dao.name]);

    const hasSummary = daoData && daoData.summary;

    // Calculate recent proposals (last 90 days)
    const recentProposals = useMemo(() => {
      if (proposals.length === 0) return 0;
      const now = Math.floor(Date.now() / 1000);
      const ninetyDaysAgo = now - (90 * 24 * 60 * 60);
      
      if (dao.source === 'tally') {
        // Tally proposals use startTime from normalized data
        return proposals.filter((p: any) => p.startTime >= ninetyDaysAgo).length;
      }
      // Snapshot proposals use 'start' field
      return proposals.filter((p: any) => p.start >= ninetyDaysAgo).length;
    }, [proposals, dao.source]);

    // Calculate total members - use dynamic data if available
    const totalMembers = useMemo(() => {
      if (dao.source === 'snapshot' && spaceData?.followersCount) {
        return spaceData.followersCount;
      }
      if (dao.source === 'tally' && proposals.length > 0) {
        // For Tally, estimate from total unique voters across all recent proposals
        // Sum up all votersCount from all proposals as an estimate
        const totalVoters = proposals.reduce((sum: number, p: any) => {
          if (p.sourceData?.voteStats) {
            const proposalVoters = p.sourceData.voteStats.reduce((vSum: number, stat: any) => {
              return vSum + (stat.votersCount || 0);
            }, 0);
            return sum + proposalVoters;
          }
          return sum;
        }, 0);
        
        // Return a reasonable estimate (average voters * proposals gives us a ballpark)
        return totalVoters > 0 ? totalVoters : 0;
      }
      return 0;
    }, [dao.source, spaceData, daoData, proposals]);

    // Calculate active voters
    const activeVoters = useMemo(() => {
      if (dao.source === 'snapshot' && spaceData?.followersCount) {
        return spaceData.followersCount;
      }
      if (dao.source === 'tally' && proposals.length > 0) {
        // For Tally, calculate unique voters from recent proposals
        const recentProposals = proposals.filter((p: any) => {
          const now = Math.floor(Date.now() / 1000);
          const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
          return p.startTime >= thirtyDaysAgo;
        });
        
        // Sum up votersCount from voteStats if available
        const totalVoters = recentProposals.reduce((sum: number, p: any) => {
          if (p.sourceData?.voteStats) {
            const votersCount = p.sourceData.voteStats.reduce((vSum: number, stat: any) => {
              return vSum + (stat.votersCount || 0);
            }, 0);
            return sum + votersCount;
          }
          return sum;
        }, 0);
        
        // Return average voters per proposal
        return recentProposals.length > 0 ? Math.round(totalVoters / recentProposals.length) : 0;
      }
      return 0;
    }, [dao.source, spaceData, proposals]);

    // Calculate participation effort based on proposal activity
    const participationEffort = useMemo(() => {
      if (hasSummary && daoData.summary.average_reading_time_per_day) {
        const monthlyMins = parseTimeToMinutes(daoData.summary.average_reading_time_per_day) * 30;
        return formatMinutesToTime(monthlyMins);
      }
      // Fallback calculation: estimate based on active proposals
      if (proposals.length > 0) {
        const activeCount = proposals.filter((p: any) => {
          if (dao.source === 'tally') {
            return p.state === 'active';
          }
          return p.state === 'active';
        }).length;
        
        // Estimate reading time based on DAO type
        const minutesPerProposal = dao.source === 'tally' ? 10 : 5; // Tally proposals tend to be longer
        const estimatedMinutes = activeCount * minutesPerProposal * 30; // per month
        return formatMinutesToTime(estimatedMinutes);
      }
      return "0h";
    }, [hasSummary, daoData, dao.source, proposals]);

    const monthlyMins = hasSummary && daoData.summary.average_reading_time_per_day 
      ? parseTimeToMinutes(daoData.summary.average_reading_time_per_day) * 30 
      : 0;

    // Calculate normalized scores from 0-100 based on data
    const chartData = {
      activeVotingWeight: 100,
      activeVoters: totalMembers > 0 
        ? Math.min(Math.round((activeVoters / totalMembers) * 100), 100) 
        : 0,
      activityScore: (hasSummary && daoData?.summary.total_proposals 
          ? Math.min(Math.round(daoData.summary.total_proposals / 59 * 100), 100) 
          : Math.min(Math.round(recentProposals / 30 * 100), 100)),
      participationEffortScore: (hasSummary && daoData.summary.median_reading_time_per_proposal 
          ? Math.min(Math.round(monthlyMins / 600 * 100), 100) 
          : 0),
    }
    
    return (
        <NavLink 
            key={dao.identifier} 
            to={`/dao/${dao.identifier}`}
            className="block"
        >
        <Card className="@container/card">
        <CardHeader>
          <CardDescription>
            {dao.source === 'snapshot' ? 'Snapshot' : 'Tally'}
          </CardDescription>
          <CardAction>
            <Badge variant={activeProposals > 0 ? "secondary" : "outline"}>
              {activeProposals} Active Proposal{activeProposals !== 1 ? 's' : ''}
            </Badge>
          </CardAction>
            <CardTitle className="flex text-lg font-semibold tabular-nums @[250px]/card:text-2xl">
            <div className="flex size-16 items-center justify-center mr-4">
            <img src={logo} className="shrink-0" alt="Arbitrum logo" />
            </div>
            <div className="grid flex-1 text-left text-sm lg:text-lg xl:text-xl leading-tight">
            <span className="truncate font-bold">{dao.name}</span>
            <Badge variant="outline">
              <Zap/>
              <Twitter/>
              <Github/>
            </Badge>
            </div>
            </CardTitle>
        </CardHeader>
        <div className="flex flex-row justify-between items-center">
          <ChartProps 
            users={chartData.activeVotingWeight} 
            proposals={chartData.activeVoters} 
            timePerDay={chartData.activityScore} 
            votes={chartData.participationEffortScore} 
            totalTime={0} 
          />
        </div>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {isLoading ? (
            <div>Loading data...</div>
          ) : error ? (
            <div className="text-red-500">Failed to load DAO data</div>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="line-clamp-1 flex gap-2 font-medium">
                    Total Members
                    <Badge variant="outline">
                      {totalMembers ? formatNumber(totalMembers) : "-"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-56">The number of unique wallet addresses that are part of the DAO community.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="line-clamp-1 flex gap-2 font-medium">
                    Active Voters
                    <Badge variant="outline">
                      {activeVoters ? formatNumber(activeVoters) : '0'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-56">
                      {dao.source === 'snapshot' 
                        ? 'Members who have voted on at least one proposal in the past 30 days.' 
                        : 'Average number of unique voters per proposal in the last 30 days.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="line-clamp-1 flex gap-2 font-medium">
                    Recent Proposals
                    <Badge variant="outline">
                      {recentProposals > 0 ? formatNumber(recentProposals) : "0"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-56">The number of governance proposals submitted in the past 90 days.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="line-clamp-1 flex gap-2 font-medium">
                    Participation Effort
                    <Badge variant="outline">
                      {participationEffort} 
                    </Badge>
                    <div className="font-light txt-xs text-muted-foreground">
                        hh/month
                      </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-56">Estimated time (in hours) required to review and understand all new proposals this month.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {dao?.network && (
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Network
                  <Badge variant="outline">
                    {dao.network}
                  </Badge>
                </div>
              )}
            </>
          )}
        </CardFooter>
      </Card>
      </NavLink>
    )
}