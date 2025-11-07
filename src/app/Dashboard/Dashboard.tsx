import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, NavLink } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mountain, FileSymlink, Cpu, Star } from "lucide-react";
import { useSubscriptions } from '@/contexts/subscriptions';
import { daoConfig, DaoConfigItem, MONTHLY_REPORT_DIRECTIVE, SPACE_QUERY } from "@/lib/constants";
import { toast } from "sonner";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { DrawerDialog } from "../Suggest/Suggest";
import { formatNumber } from "@/lib/utils";
import { useAccount } from "wagmi";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { fetchProposals, processProposalsForDigest } from "@/lib/dao-utils";
import { Delegate } from "../Delegate/Delegate";
import Markdown from "react-markdown";
import { useAgents } from "@/contexts/AgentContext";
import { Countdown } from "@/components/ui/countdown";
import { useEthos } from "@/contexts/ethos";
import { useGraphQL } from "@/hooks/use-dao";
import { useAI } from "@/hooks/use-ai";

// Constants
const PROPOSALS_PER_PAGE = 10;
const MAX_PAGES_TO_SHOW = 5;
const RECENT_PROPOSALS_DAYS = 30;
const SUMMARY_STALE_TIME = 30 * 60 * 1000; // 30 minutes
const SUMMARY_MIN_LENGTH_FOR_TOGGLE = 100;

// Shared style classes
const ICON_WRAPPER_CLASS = "bg-primary/10 p-1 rounded-md mr-2 flex items-center justify-center";
const ICON_CLASS = "h-4 w-4 text-primary";

// Types
interface ProposalData {
  id: string;
  title: string;
  body: string;
  state: string;
  start: string;
  end: string;
  endTimestamp: number;
  votes: any;
  score: string;
  source: string;
  daoIdentifier: string;
  space?: { id: string };
  voteStatus?: 'yes' | 'no' | 'not-voted' | null;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Maps proposal state to badge variant
 */
function getStateVariant(state: string): BadgeVariant {
  const stateMap: Record<string, BadgeVariant> = {
    active: "default",
    closed: "secondary",
    pending: "outline",
    rejected: "destructive",
  };
  
  return stateMap[state.toLowerCase()] || "outline";
}

/**
 * Formats timestamp to locale date string
 */
function formatTimestamp(timestamp: number, locale: boolean = false): string {
  if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0) {
    return "Unknown";
  }
  
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) {
    return "Unknown";
  }
  
  return locale ? date.toLocaleString() : date.toLocaleDateString();
}

/**
 * Transforms raw proposal data to table format
 */
function transformProposals(proposals: any[], dao: DaoConfigItem): ProposalData[] {
  return proposals.map(proposal => ({
    id: proposal.id,
    title: proposal.title,
    body: proposal.description,
    state: proposal.state,
    start: formatTimestamp(proposal.startTime),
    end: formatTimestamp(proposal.endTime, true),
    endTimestamp: proposal.endTime,
    votes: proposal.votes,
    score: (proposal.totalVotes || 0).toFixed(2),
    source: dao.source,
    daoIdentifier: dao.identifier,
    space: dao.source === 'snapshot' ? { id: dao.identifier } : undefined,
  }));
}

/**
 * Generates page numbers for pagination display
 */
function generatePageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const pageNumbers: (number | 'ellipsis')[] = [];
  
  if (totalPages <= MAX_PAGES_TO_SHOW) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  }
  
  // Always include page 1
  pageNumbers.push(1);
  
  // Calculate range
  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);
  
  if (currentPage <= 2) {
    endPage = 3;
  } else if (currentPage >= totalPages - 1) {
    startPage = totalPages - 2;
  }
  
  if (startPage > 2) {
    pageNumbers.push('ellipsis');
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  if (endPage < totalPages - 1) {
    pageNumbers.push('ellipsis');
  }
  
  if (totalPages > 1) {
    pageNumbers.push(totalPages);
  }
  
  return pageNumbers;
}

/**
 * Main Dashboard wrapper - handles DAO lookup and routing
 */
function DaoDashboard() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  
  // Find the dao by identifier
  const daoEntry = Object.entries(daoConfig).find(([_, dao]) => dao.identifier === identifier);
  const dao = daoEntry ? daoEntry[1] : undefined;
  
  // Redirect to home if DAO not found
  useEffect(() => {
    if (!dao && identifier) {
      toast.error("DAO not found");
      navigate("/");
    }
  }, [dao, identifier, navigate]);
  
  // Don't render if DAO not found
  if (!dao) {
    return null;
  }
  
  return <DashboardContent dao={dao} />;
}

function DashboardContent({ dao }: { dao: DaoConfigItem }) {
  const { ethos } = useEthos();
  const { hasAgent } = useAgents();
  const { 
    isSubscribed,
    addSubscription,
    removeSubscription
  } = useSubscriptions();
  const subscribed = isSubscribed(dao);
  const enabledAgent = hasAgent(dao);
  const account = useAccount();
  const [expandSummary, setExpandSummary] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    data: spaceResult,
    isLoading: isSpaceLoading,
    error: spaceError 
  } = useGraphQL(SPACE_QUERY, { id: dao.identifier });

  // Fetch proposals based on DAO source
  useEffect(() => {
    if (!dao) return;
    
    const fetchProposalsData = async () => {
      setIsLoadingProposals(true);
      setProposalsError(null);
      try {
        const result = await fetchProposals(dao.source, dao.identifier, 300, dao.subDaos);
        setProposals(result.proposals || []);
      } catch (err) {
        setProposalsError(err instanceof Error ? err.message : 'Failed to fetch proposals');
      } finally {
        setIsLoadingProposals(false);
      }
    };

    fetchProposalsData();
  }, [dao]);

  // Extract data from query results
  const spaceData = spaceResult?.space;
  
  // Combine loading and error states
  const isLoading = isSpaceLoading || isLoadingProposals;
  const error = spaceError || proposalsError;

  // Process the most recent proposals for the AI summary and generate prompt
  const { prompt } = useMemo(() => 
    processProposalsForDigest(proposals, isLoading, error, RECENT_PROPOSALS_DAYS),
    [proposals, isLoading, error]
  );

  // Use the AI hook to generate the summary
  const { 
    data: daoSummary, 
    isLoading: loadingSummary
  } = useAI(MONTHLY_REPORT_DIRECTIVE, prompt, dao.name, {
    enabled: prompt !== '',
    staleTime: SUMMARY_STALE_TIME
  });

  const handleSubscription = () => {
    if (subscribed && !enabledAgent) {
      removeSubscription(dao);
      toast("Removed from Watchlist", {
        description: `You've removed ${dao.name} to the watchlist`,
      });
    } else if (subscribed && enabledAgent) {
      toast("Cannot remove from Watchlist", {
        description: `You have an active Agent on ${dao.name}`,
      });
    } else {
      addSubscription(dao);
      toast("Added to Watchlist", {
        description: `You've added ${dao.name} to the watchlist`,
      });
    }
  };

  // Transform proposals to table format and calculate pagination
  const proposalTableData = useMemo(() => 
    transformProposals(proposals, dao),
    [proposals, dao]
  );
  
  const totalPages = Math.max(1, Math.ceil(proposalTableData.length / PROPOSALS_PER_PAGE));
  const indexOfLastProposal = currentPage * PROPOSALS_PER_PAGE;
  const indexOfFirstProposal = indexOfLastProposal - PROPOSALS_PER_PAGE;

  // Ensure current page is within bounds if data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [proposalTableData.length, totalPages, currentPage]);
  
  // Get current page proposals with vote status added
  const currentProposals = useMemo(() => {
    // First, filter out all non-active proposals
    const inactiveProposals = proposalTableData
      .filter(proposal => proposal.state.toLowerCase() !== 'active');

    return proposalTableData.slice(indexOfFirstProposal, indexOfLastProposal).map((proposal) => {
      let voteStatus: 'yes' | 'no' | 'not-voted' | null = null;
      
      if (proposal.state.toLowerCase() === 'active') {
        // Active proposals have undefined vote status
        voteStatus = null;
      } else {
        // Find the index of this proposal in the list of inactive proposals
        const inactiveIndex = inactiveProposals.findIndex(p => p.id === proposal.id);

        console.log(`Proposal ID: ${proposal.id}, Inactive Index: ${inactiveIndex}`);
        console.log(`Proposal:`, { ...proposal, body: undefined });
        
        // Only first 3 non-active proposals get "voted yes"
        // if (inactiveIndex <= 2) {
        //   voteStatus = 'yes';
        // } else if (inactiveIndex == 3) {
        //   voteStatus = 'no';
        // } else {
        //   voteStatus = 'not-voted';
        // }
      }
      
      return {
        ...proposal,
        voteStatus
      };
    });
  }, [proposalTableData, indexOfFirstProposal, indexOfLastProposal]);
  
  // Handle page changes
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    document.querySelector('.overflow-x-auto')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Header Card */}
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>
                {dao.source === 'snapshot' ? 'Snapshot' : dao.source}
              </CardDescription>
              <CardAction>
                {account.isConnected ? (
                  <div className="flex items-center gap-2">
                    <Button
                    variant="outline" 
                    onClick={handleSubscription}
                    title={subscribed ? "Unwatch" : "Watch"}
                    className="flex items-center gap-2"
                    >
                    {subscribed ? (
                        <>
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {/* Unsubscribe */}
                        </>
                    ) : (
                      <>
                      <Star className="h-4 w-4" />
                      {/* Subscribe */}
                      </>
                    )}
                    </Button>
                    <Delegate dao={dao} />
                  </div>
                ) : (
                  <ConnectButton.Custom>
                    {({
                      openConnectModal
                    }) => {
                      return (
                        <Button 
                          variant="outline"
                          onClick={openConnectModal}
                          className="flex items-center gap-2"
                        >
                          <Star className="h-4 w-4" />
                          {/* Subscribe */}
                        </Button>
                      );
                    }}
                  </ConnectButton.Custom>
                )}
              </CardAction>
              <CardTitle className="flex text-xl font-semibold tabular-nums @[250px]/card:text-2xl ">
                <div className="flex size-16 items-center justify-center mr-4">
                  <img src={dao.logo} className="shrink-0" alt={`${dao.name} logo`} />
                </div>
                <div className="grid flex-1 text-left text-xl lg:text-2xl xl:text-3xl leading-tight">
                  <span className="truncate font-bold">{dao.name}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      <ExternalLink className="h-4 w-4" />
                        <a 
                          href={dao.source === 'snapshot' 
                            ? `https://snapshot.org/#/${dao.identifier}`
                            : `https://www.tally.xyz/gov/${dao.name.toLowerCase().split(' ')[0]}`
                          } 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1"
                        >
                          {dao.source === 'snapshot' ? dao.identifier : dao.identifier.split(':')[2]}
                        </a>
                    </Badge>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-3 text-sm">
            {isLoading ? (
                <div>Loading data...</div>
              ) : error ? (
                <div className="text-red-500">{typeof error === 'string' ? error : error?.message}</div>
              ) : (
                <div className="w-full flex flex-col md:flex-row gap-6">
                  {/* Left column - Stats */}
                  <div className="md:w-1/4 space-y-1.5">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Followers
                      <Badge variant="outline">
                        {spaceData?.followersCount ? formatNumber(spaceData.followersCount) : formatNumber(dao.totalMembers || 0)}
                      </Badge>
                    </div>
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Proposals
                      <Badge variant="outline">
                        {spaceData?.proposalsCount || dao.proposals || "0"}
                      </Badge>
                    </div>
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Votes
                      <Badge variant="outline">
                        {spaceData?.votesCount ? formatNumber(spaceData.votesCount) : `${dao.votes || 0}m`}
                      </Badge>
                    </div>
                    {/* {spaceData?.network && (
                      <div className="line-clamp-1 flex gap-2 font-medium">
                        Network
                        <Badge variant="outline">
                          {spaceData.network}
                        </Badge>
                      </div>
                    )} */}
                  </div>
                  
                  {/* Right column - DAO About section */}
                  {spaceData?.about && (
                    <div className="md:w-3/4">
                      <Card className="border shadow-sm gap-0 pt-4 pb-3 bg-muted/5">
                      <CardHeader className="pb-0">
                        <CardTitle className="text-sm flex items-center">
                        About
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {spaceData.about}
                      </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Monthly Digest Card */}
        {hasAgent(dao) && (
          <div className="px-4 lg:px-6">
            <Card className="border shadow-sm gap-0 pt-4 pb-3 bg-muted/5">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm flex items-center">
                  <span className={ICON_WRAPPER_CLASS}>
                    <Cpu className={ICON_CLASS} />
                  </span>
                  Your Voting Agent Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm mb-4">
                  {ethos}
                </p>
                <NavLink to="/profile">
                  <Button 
                    variant="outline" 
                    className="w-full"
                  >
                    Configure Ethos
                  </Button>
                </NavLink>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Monthly Digest Card */}
        <div className="px-4 lg:px-6 text-sm">
            <Card onClick={() => !expandSummary ? setExpandSummary(true) : null}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <span className={ICON_WRAPPER_CLASS}>
                    <Mountain className={ICON_CLASS} />
                  </span>
                  Monthly Digest
                </CardTitle>
                <CardAction >
                  {daoSummary && daoSummary.length > SUMMARY_MIN_LENGTH_FOR_TOGGLE && (
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
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="text-xs h-6 mt-4 px-2 flex items-center gap-1"
                        asChild
                      >
                        <a href={`/#/digest/monthly?dao=${dao.name.toLowerCase()}`}>
                          <FileSymlink className="h-3 w-3" />
                          Full Digest
                        </a>
                      </Button>
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
        
        {/* Proposals Table with Pagination */}
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Recent Proposals</span>
                {!isLoading && !error && proposalTableData.length > 0 && (
                  <Badge variant="outline">
                    {proposalTableData.length} proposals total
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                <div>Loading proposals...</div>
                ) : error ? (
                <div className="text-red-500">{typeof error === 'string' ? error : error?.message}</div>
                ) : proposalTableData.length === 0 ? (
                <div>No proposals found</div>
                ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-left">State</th>
                    {/* <th className="p-2 text-left">Start</th> */}
                    <th className="p-2 text-left">Voting Period End</th>
                    {/* <th className="p-2 text-left">Votes</th> */}
                    {/* Always show Actions column but only render content if not 'not-voted' */}
                    {account.address ? (
                      <th className="p-2 text-left">Actions</th>
                    ) : null}
                    {enabledAgent ? (
                      <th className="p-2 text-left">Agent</th>
                    ) : null}
                    </tr>
                  </thead>
                  <tbody>
  {currentProposals.map((proposal) => (
    <tr key={proposal.id} className="border-b hover:bg-muted/50">
      <td className="p-2">
        {proposal.state.toLowerCase() === 'active' ? (
          <span className="font-bold">{proposal.title}</span>
        ) : (
          proposal.title
        )}
      </td>
      <td className="p-2">
        <Badge variant={getStateVariant(proposal.state)} className="text-sm">
          {proposal.state}
        </Badge>
      </td>
      <td className="p-2">
        <Badge variant="outline">
          {proposal.end}
        </Badge>
      </td>
      {/* Always show Actions column but only render content if not 'not-voted' */}
      {account.address ? (
        <td className="p-2">
          {proposal.voteStatus !== 'not-voted' && (
            <DrawerDialog proposal={proposal} isAgentEnabled={enabledAgent} voteStatus={proposal.voteStatus}/>
          )}
        </td>
      ) : null}
      {enabledAgent ? (
        <td className="p-2">
          <Countdown
            endDate={new Date(proposal.endTimestamp * 1000)}
            compact={true}
            hoursOffset={3}
            proposalId={proposal.id}
            voteStatus={proposal.voteStatus}
          />
        </td>
      ) : null}
    </tr>
  ))}
</tbody>
                  </table>
                  
                  {/* Shadcn Pagination Component */}
                  {proposalTableData.length > PROPOSALS_PER_PAGE && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => handlePageChange(currentPage - 1)}
                              className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                            />
                          </PaginationItem>
                          
                          {generatePageNumbers(currentPage, totalPages).map((page, index) => (
                            page === 'ellipsis' ? (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            ) : (
                              <PaginationItem key={`page-${page}`}>
                                <PaginationLink 
                                  isActive={page === currentPage}
                                  onClick={() => handlePageChange(page as number)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          ))}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => handlePageChange(currentPage + 1)}
                              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                      
                      {/* <div className="text-center text-xs text-muted-foreground mt-2">
                        Showing {indexOfFirstProposal + 1} to {Math.min(indexOfLastProposal, proposalTableData.length)} of {proposalTableData.length} proposals
                      </div> */}
                    </div>
                  )}
                </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DaoDashboard;