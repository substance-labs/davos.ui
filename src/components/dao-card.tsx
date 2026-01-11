import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Github, Twitter, Zap } from 'lucide-react';
import { ChartProps } from './char-properties';
import { NavLink } from 'react-router';
import { formatNumber } from '@/lib/utils';
import { PROPOSALS_QUERY, SPACE_QUERY, DaoConfigItem } from '@/lib/constants';
import { useDaoInfo, useGraphQL, useProposals } from '@/hooks/use-dao';
import { useMemo } from 'react';
import { calculateDaoMetrics, DaoData } from '@/lib/proposal-calc-utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DaoCardProps {
  dao: DaoConfigItem;
  logo: string;
}

export function DaoCard({ dao, logo }: DaoCardProps) {
  const { data: daoData, isLoading: isDaoDataLoading } = useDaoInfo(dao.source, dao.identifier);

  // For Snapshot DAOs
  const {
    data: spaceResult,
    isLoading: isSpaceLoading,
    error: spaceError,
  } = useGraphQL(SPACE_QUERY, { id: dao.identifier }, { enabled: dao.source === 'snapshot' });

  const {
    data: proposalsResult,
    isLoading: isProposalsLoading,
    error: proposalsError,
  } = useGraphQL(
    PROPOSALS_QUERY,
    {
      space: dao.identifier,
      limit: spaceResult?.space?.proposalsCount,
    },
    { enabled: dao.source === 'snapshot' && !!spaceResult?.space?.proposalsCount }
  );

  // For Tally DAOs
  const { data: tallyProposalsResult } = useProposals(
    dao.source,
    dao.identifier,
    300,
    dao.subDaos,
    { enabled: dao.source === 'tally' }
  );

  // Extract data from query results
  const spaceData = spaceResult?.space;
  const snapshotProposals = proposalsResult?.proposals || [];
  const tallyProposals = tallyProposalsResult?.proposals || [];
  const proposals = dao.source === 'tally' ? tallyProposals : snapshotProposals;

  // Combine loading and error states - ignore Tally errors since CORS will fail
  const isLoading =
    dao.source === 'tally'
      ? isDaoDataLoading
      : isSpaceLoading || isProposalsLoading || isDaoDataLoading;

  // For error state, only show errors for Snapshot DAOs
  // Tally DAOs will have CORS errors but we ignore them
  const error = dao.source === 'tally' ? null : spaceError || proposalsError;

  // Calculate all DAO metrics using centralized utility
  const metrics = useMemo(() => {
    return calculateDaoMetrics({
      source: dao.source,
      proposals,
      spaceData,
      daoData: daoData as DaoData | undefined,
    });
  }, [dao.source, proposals, spaceData, daoData]);

  const {
    activeProposals,
    recentProposals,
    totalMembers,
    activeVoters,
    participationEffort,
    chartData,
  } = metrics;

  return (
    <NavLink key={dao.identifier} to={`/dao/${dao.identifier}`} className="block">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{dao.source === 'snapshot' ? 'Snapshot' : 'Tally'}</CardDescription>
          <CardAction>
            <Badge variant={activeProposals > 0 ? 'secondary' : 'outline'}>
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
                <Zap />
                <Twitter />
                <Github />
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
            <div className="w-full space-y-2">
              <div className="flex gap-2 items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <div className="flex gap-2 items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <div className="flex gap-2 items-center">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <div className="flex gap-2 items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ) : error ? (
            <div className="text-red-500">Failed to load DAO data</div>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="line-clamp-1 flex gap-2 font-medium">
                    Total Members
                    <Badge variant="outline">
                      {totalMembers ? formatNumber(totalMembers) : '-'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-56">
                      The number of unique wallet addresses that are part of the DAO community.
                    </p>
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
                      {recentProposals > 0 ? formatNumber(recentProposals) : '0'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-56">
                      The number of governance proposals submitted in the past 90 days.
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="line-clamp-1 flex gap-2 font-medium">
                    Participation Effort
                    <Badge variant="outline">{participationEffort}</Badge>
                    {participationEffort !== 'N/A' && (
                      <div className="font-light txt-xs text-muted-foreground">hh/month</div>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-56">
                      Estimated time (in hours) required to review and understand all new proposals
                      this month.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </CardFooter>
      </Card>
    </NavLink>
  );
}
