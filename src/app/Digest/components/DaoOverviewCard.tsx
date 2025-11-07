import { useMemo, useState } from "react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon, Mountain } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GLOBAL_REPORT_DIRECTIVE, PROPOSALS_QUERY, SPACE_QUERY } from "@/lib/constants";
import { useGraphQL } from "@/hooks/use-dao";
import { useAI } from "@/hooks/use-ai";
import { processProposalsForDigest } from "@/lib/dao-utils";
import Markdown from "react-markdown";
import { NavLink } from "react-router";

export function DaoOverviewCard({ dao  }: { dao: any }) {
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
  const proposals = proposalsResult?.proposals || [];

  const isLoading = isSpaceLoading || isProposalsLoading;
  const error = spaceError || proposalsError;

  // Process the most recent proposals for the AI summary
  const { prompt } = useMemo(() => 
    processProposalsForDigest(proposals, isLoading, error),
    [proposals, isLoading, error]
  );
  
  // Use the AI hook to generate the summary
  const { 
    data: daoSummary, 
    isLoading: loadingSummary
  } = useAI(GLOBAL_REPORT_DIRECTIVE, prompt, dao.name, {
    // Only enable when we have a prompt and context
    enabled: prompt !== ''    
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
              <CardDescription>Overview</CardDescription>
            </div>
          </div>
        </CardHeader>
      </NavLink>
      <CardContent className="pb-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : (
          <div className="bg-muted/20 p-4 rounded-md mb-4 text-sm">
            <Card onClick={() => !expandSummary ? setExpandSummary(true) : null}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <span className="bg-primary/10 p-1 rounded-md mr-2 flex items-center justify-center">
                    <Mountain className="h-4 w-4 text-primary" />
                  </span>
                  Digest
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
        )}
      </CardContent>
      <CardFooter className="pt-0">
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