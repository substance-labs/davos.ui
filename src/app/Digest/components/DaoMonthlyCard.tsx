import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRightIcon, BarChart3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MONTHLY_REPORT_DIRECTIVE } from '@/lib/constants';
import { useDaoData } from '@/hooks/use-dao';
import { processProposalsForDigest, Proposal } from '@/lib/dao-utils';
import { useAI } from '@/hooks/use-ai';
import { formatNumber } from '@/lib/utils';
import { NavLink } from 'react-router';
import { DigestCard } from '@/components/digest-card';
import { TextSkeleton } from '@/components/text-skeleton';

interface DaoMonthlyCardProps {
  dao: {
    identifier: string;
    name: string;
    logo: string;
    isLoading?: boolean;
  };
}

export function DaoMonthlyCard({ dao }: DaoMonthlyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { proposals, isLoading, error } = useDaoData(dao.identifier);

  const proposalList = proposals as Proposal[];

  const promptData = {
    proposalsCount: proposalList.length,
    activeProposals: proposalList.filter(p => (p.state as string) === 'active').length,
    closedProposals: proposalList.filter(p => (p.state as string) === 'closed').length,
    totalVotes: proposalList.reduce(
      (sum: number, p) => sum + (typeof p.votes === 'number' ? p.votes : 0),
      0
    ),
    topProposalTitles: proposalList.slice(0, 3).map(p => p.title),
  };

  // Process the most recent proposals for the AI summary and generate prompt
  const { latestProposals, prompt } = useMemo(
    () => processProposalsForDigest(proposals, isLoading, error, 30),
    [proposals, isLoading, error]
  );

  // Use the AI hook to generate the summary
  const { data: daoSummary, isLoading: loadingSummary } = useAI(
    MONTHLY_REPORT_DIRECTIVE,
    prompt,
    dao.name,
    {
      // Only enable when we have a prompt and context
      enabled: prompt !== '',
      // Use a longer stale time for summaries (30 min)
      staleTime: 30 * 60 * 1000,
    }
  );

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <NavLink key={dao.identifier} to={`/dao/${dao.identifier}`} className="block">
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <Avatar className="h-12 w-12 mr-3">
              <AvatarImage src={dao.logo} alt={dao.name} />
              <AvatarFallback>{dao.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{dao.name}</CardTitle>
              <CardDescription>Monthly Activity Summary</CardDescription>
            </div>
          </div>
        </CardHeader>
      </NavLink>
      <CardContent className="pb-3">
        {dao.isLoading ? (
          <div className="space-y-2">
            <TextSkeleton lines={3} />
          </div>
        ) : (
          <>
            <div className="bg-muted/20 p-4 rounded-md mb-4 text-sm">
              <DigestCard
                title="Monthly Digest"
                summary={daoSummary || null}
                isLoading={loadingSummary}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/10 border">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="text-2xl font-semibold">{promptData.activeProposals}</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/10 border">
                <span className="text-sm text-muted-foreground">Closed</span>
                <span className="text-2xl font-semibold">{promptData.closedProposals}</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/10 border">
                <span className="text-sm text-muted-foreground">Votes</span>
                <span className="text-2xl font-semibold">
                  {formatNumber(promptData.totalVotes)}
                </span>
              </div>
            </div>

            {/* Only show proposals if there are any */}
            {latestProposals.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium flex items-center">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Recent Proposals
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs"
                  >
                    {expanded ? 'Show Less' : 'Show More'}
                  </Button>
                </div>

                <div className={`space-y-2 ${expanded ? '' : 'max-h-32 overflow-hidden relative'}`}>
                  {latestProposals.map(proposal => (
                    <div
                      key={proposal.id as string}
                      className="flex items-center justify-between py-1 border-b text-sm"
                    >
                      <div className="truncate mr-2">{proposal.title}</div>
                      <div className="flex items-center shrink-0">
                        {(proposal.state as string) === 'active' ? (
                          <Badge variant="default" className="mr-2">
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant={
                              (proposal.state as string) === 'closed' ? 'secondary' : 'destructive'
                            }
                            className="mr-2"
                          >
                            {proposal.state as string}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {proposal.votes as number} votes
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Gradient fade at the bottom when not expanded */}
                  {!expanded && latestProposals.length > 2 && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a
            href={`https://snapshot.org/#/${dao.identifier}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            View DAO on Snapshot <ChevronRightIcon className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
