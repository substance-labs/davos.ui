import { useMemo, useState } from "react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon, BarChart3, Mountain } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MONTHLY_REPORT_DIRECTIVE, PROPOSALS_QUERY, SPACE_QUERY } from "@/lib/constants";
import { useGraphQL } from "@/hooks/use-dao";
import { filterProposalsByAge } from "@/lib/dao-utils";
import { useAI } from "@/hooks/use-ai";
import { formatNumber } from "@/lib/utils";
import Markdown from "react-markdown";
import { NavLink } from "react-router";

export function DaoMonthlyCard({ dao }: { dao: any }) {
  const [expanded, setExpanded] = useState(false);
  const [expandSummary, setExpandSummary] = useState(false);
  const { 
      data: spaceResult,
      isLoading: isSpaceLoading,
      error: spaceError 
    } = useGraphQL(SPACE_QUERY, { id: dao.identifier });
  const { 
    data: proposalsResult,
    isLoading: isProposalsLoading,
    error: proposalsError 
  } = useGraphQL(PROPOSALS_QUERY, { 
    space: dao.identifier,
    limit: spaceResult?.space?.proposalsCount,
  });
  const spaceData = spaceResult?.space;
  const proposals = proposalsResult?.proposals || [];

  const isLoading = isSpaceLoading || isProposalsLoading;
  const error = spaceError || proposalsError;

  // Process the most recent proposals for the AI summary
  const latestProposals = useMemo(() => {
    return !isLoading && !error && proposals.length > 0
      ? filterProposalsByAge(proposals, 30)
      : [];
  }, [proposals, isLoading, error]);

  const promptData = {
    proposalsCount: proposals.length,
    activeProposals: proposals.filter((p: any) => p.state === "active").length,
    closedProposals: proposals.filter((p: any) => p.state === "closed").length,
    totalVotes: proposals.reduce((sum: number, p: any) => sum + p.votes, 0),
    topProposalTitles: proposals.slice(0, 3).map((p: any) => p.title)

  };

  const prompt = useMemo(() => {
    if (proposals.length === 0) return '';
    
    // Create a concatenated string of all latest proposal titles and short body excerpts
    const proposalSummaries = latestProposals
      .map(p => `BEGIN "${p.title}" - ${p.body} END`)
      .join('\n');
    
    return `Recent proposals: ${proposalSummaries}`;
  }, [latestProposals, dao, spaceData]);
  
    // Use the AI hook to generate the summary
    const { 
      data: daoSummary, 
      isLoading: loadingSummary
    } = useAI(MONTHLY_REPORT_DIRECTIVE, prompt, dao.name, {
    // Only enable when we have a prompt and context
    enabled: prompt !== '',
    // Use a longer stale time for summaries (30 min)
    staleTime: 30 * 60 * 1000
  });
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <NavLink 
            key={dao.identifier} 
            to={`/dao/${dao.identifier}`}
            className="block"
      >
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
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : (
          <>
            <div className="bg-muted/20 p-4 rounded-md mb-4 text-sm">
              <Card onClick={() => !expandSummary ? setExpandSummary(true) : null}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <span className="bg-primary/10 p-1 rounded-md mr-2 flex items-center justify-center">
                      <Mountain className="h-4 w-4 text-primary" />
                    </span>
                    Monthly Digest
                  </CardTitle>
                  <CardAction >
                    {daoSummary && daoSummary.length > 100 && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => setExpandSummary(!expandSummary)} 
                        className="text-xs h-6 px-2 flex items-center gap-1 text-muted-foreground"
                      >
                        {expandSummary ? "Show less" : "Show more"}
                      </Button>
                    )}
                  </CardAction>
                </CardHeader>
                {!loadingSummary && daoSummary ? (
                  <CardContent>
                    <div className="relative px-4">
                      <div className={expandSummary ? "" : "max-h-[125px] overflow-hidden"}>
                        <Markdown>{daoSummary}</Markdown>
                      </div>
                      {!expandSummary && daoSummary.length > 100 && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                      )}
                    </div>
                  </CardContent>
                ) : loadingSummary ? (
                  <div className="flex items-center justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  </div>
                ) : null
              }
              </Card>
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
                <span className="text-2xl font-semibold">{formatNumber(promptData.totalVotes)}</span>
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
                    {expanded ? "Show Less" : "Show More"}
                  </Button>
                </div>
                
                <div className={`space-y-2 ${expanded ? "" : "max-h-32 overflow-hidden relative"}`}>
                  {latestProposals.map(proposal => (
                    <div key={proposal.id} className="flex items-center justify-between py-1 border-b text-sm">
                      <div className="truncate mr-2">
                        {proposal.title}
                      </div>
                      <div className="flex items-center shrink-0">
                        {proposal.state === "active" ? (
                          <Badge variant="default" className="mr-2">Active</Badge>
                        ) : (
                          <Badge 
                            variant={proposal.state === "closed" ? "secondary" : "destructive"} 
                            className="mr-2"
                          >
                            {proposal.state}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {proposal.votes} votes
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Gradient fade at the bottom when not expanded */}
                  {!expanded && latestProposals.length > 2 && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
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