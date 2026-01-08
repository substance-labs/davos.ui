import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useEffect, useState } from 'react';
import { SquarePen, Check, X } from 'lucide-react'; // Import the required icons
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import snapshot from '@snapshot-labs/snapshot.js';
import { DAVOS_API_ENDPOINT } from '@/lib/constants';
import { getDelegationStatus } from '@/lib/utils';
import { toast } from 'sonner';
import { useEthos } from '@/contexts/ethos';

// Cache for AI suggestion requests - keyed by hash of directive+ethos+proposal
const suggestionCache = new Map<string, { vote: string; reason: string }>();

// Simple hash function for cache key
const hashCacheKey = (ethos: string, proposalId: string, proposalBody: string): string => {
  return `${ethos}::${proposalId}::${proposalBody.substring(0, 500)}`;
};

interface SuggestionContentProps {
  isLoading: boolean;
  voteSuggestion: string | null | undefined;
  voteReason: string | null | undefined;
  isAgentEnabled: boolean;
  hasAgentVoted?: boolean;
  proposalState?: string;
  onVoteNow?: () => void;
  canVote?: boolean;
  votingStartDate?: string;
}

// Shared content component to avoid duplication
const SuggestionContent = ({
  isLoading,
  voteSuggestion,
  voteReason,
  isAgentEnabled,
  hasAgentVoted,
  proposalState,
  onVoteNow,
  canVote,
  votingStartDate,
}: SuggestionContentProps) => {
  // Determine the label based on proposal state and vote status
  const stateLC = proposalState?.toLowerCase();
  const isClosed = stateLC === 'closed' || stateLC === 'defeated';
  const getVoteLabel = () => {
    if (isClosed && hasAgentVoted) {
      return 'Agent Voted';
    } else if (isAgentEnabled) {
      return 'Agent will vote';
    } else {
      return 'Suggested Vote';
    }
  };

  return (
  <>
    {isLoading ? (
      <div className="flex items-center justify-center py-8">
        <svg
          className="animate-spin h-8 w-8 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    ) : (
      <div className="space-y-4 py-4">
        {voteSuggestion ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              className={`flex items-center justify-center h-24 w-24 rounded-full ${
                voteSuggestion === 'yes' ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              {voteSuggestion === 'yes' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-medium">
              {getVoteLabel()}:
              <span
                className={`font-bold ${voteSuggestion === 'yes' ? 'text-green-600' : 'text-red-600'}`}
              >
                {' '}
                {voteSuggestion?.toUpperCase()}
              </span>
            </h3>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center justify-center h-24 w-24 rounded-full bg-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium">Unable to generate suggestion</h3>
          </div>
        )}

        <div className="rounded-md bg-muted p-4">
          <h4 className="mb-2 font-medium">Reasoning:</h4>
          <p className="text-sm text-muted-foreground">{voteReason}</p>
        </div>

        {onVoteNow && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={onVoteNow}
            disabled={!canVote}
          >
            {canVote 
              ? 'Vote now' 
              : proposalState?.toLowerCase() === 'pending'
                ? `Manual vote will be enabled when the voting period starts${votingStartDate ? ` on ${votingStartDate}` : ''}`
                : 'Voting closed'
            }
          </Button>
        )}
      </div>
    )}
  </>
  );
};

// Content for manual voting dialog
const ManualVoteContent = ({
  onVoteYes,
  onVoteNo,
  hasVoted,
  userVote,
}: {
  onVoteYes: () => void;
  onVoteNo: () => void;
  hasVoted: boolean;
  userVote: string | null;
}) => {
  if (hasVoted) {
    return (
      <div className="space-y-6 py-4">
        <p className="text-center text-muted-foreground">You have already voted on this proposal</p>
        <div className="flex justify-center">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              userVote === 'yes'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {userVote === 'yes' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            <span className="font-medium">Voted {userVote === 'yes' ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <p className="text-center text-muted-foreground">
        Please select your vote for this proposal:
      </p>
      <div className="flex justify-center gap-4">
        <Button
          onClick={onVoteYes}
          variant="outline"
          className="flex-1 max-w-xs border-green-300 hover:bg-green-50 hover:text-green-700 cursor-pointer"
        >
          <Check className="mr-2 h-5 w-5 text-green-500" />
          Vote Yes
        </Button>
        <Button
          onClick={onVoteNo}
          variant="outline"
          className="flex-1 max-w-xs border-red-300 hover:bg-red-50 hover:text-red-700 cursor-pointer"
        >
          <X className="mr-2 h-5 w-5 text-red-500" />
          Vote No
        </Button>
      </div>
    </div>
  );
};

interface DrawerDialogProps {
  proposal: {
    id: string;
    title?: string;
    body?: string;
    state?: string;
    start?: string;
    startTimestamp?: number;
    source?: 'snapshot' | 'tally';
    space?: { id?: string };
    daoIdentifier?: string;
    governorAddress?: string;
    proposalId?: string;
    tokenAddress?: string;
    choices?: unknown[];
  };
  isAgentEnabled: boolean;
  voteStatus?: string;
}

export function DrawerDialog({ proposal, isAgentEnabled, voteStatus }: DrawerDialogProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { ethos } = useEthos();
  const [open, setOpen] = useState(false);
  const [manualVoteOpen, setManualVoteOpen] = useState(false);
  const [voteSuggestion, setVoteSuggestion] = useState<string | undefined>(undefined);
  const [voteReason, setVoteReason] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasAgentVoted, setHasAgentVoted] = useState<boolean>(false);
  const [voteStatusMap, setVoteStatusMap] = useState<{
    [proposalId: string]: { hasVoted: boolean; userVote: string | null };
  }>({});

  // Get current proposal's vote status
  const currentVoteStatus = voteStatusMap[proposal?.id] || { hasVoted: false, userVote: null };
  const hasVoted = currentVoteStatus.hasVoted;
  const userVote = currentVoteStatus.userVote;
  const isDesktop = useIsMobile() === false;

  // Run parseQuery whenever proposal changes
  useEffect(() => {
    // This effect now runs when 'open' state changes to true (when dialog opens)
    if (open) {
      setIsLoading(true);
      getVoteSuggestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proposal]);

  // Generate a suggestion on-the-fly using AI when no agent data exists
  const generateSuggestionOnTheFly = async () => {
    if (!ethos || !proposal.body) {
      setHasAgentVoted(false);
      setVoteSuggestion(undefined);
      setVoteReason(ethos ? 'No proposal content available.' : 'Please configure your ethos in Profile settings to get vote suggestions.');
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = hashCacheKey(ethos, proposal.id, proposal.body);
    const cached = suggestionCache.get(cacheKey);
    if (cached) {
      setHasAgentVoted(false);
      setVoteSuggestion(cached.vote as 'yes' | 'no');
      setVoteReason(cached.reason);
      setIsLoading(false);
      return;
    }

    try {
      // Use the standard AI directive that expects JSON response
      const aiDirective = `Suggest a vote for the passed proposal based on the ethos of the user. The result must be only a JSON with two elements: 'vote', which can be yes or no, and 'reason', which is the explanation of the reasons considered for the voting decision. The JSON must be formatted as follows: {"vote": "yes", "reason": "..."}.`;
      
      // Format: ethos first, then proposal
      const proposalContent = `User Ethos: ${ethos}\n\nProposal Title: ${proposal.title}\n\nProposal Content: ${proposal.body}`;

      const response = await fetch(`${DAVOS_API_ENDPOINT}/api/ai-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          directive: aiDirective,
          proposal: proposalContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.response) {
          // Parse the JSON response from AI
          try {
            const jsonResponse = JSON.parse(data.response);
            const voteChoice = jsonResponse.vote?.toLowerCase() === 'yes' ? 'yes' : 'no';
            const reason = jsonResponse.reason || data.response;
            
            // Cache the result
            suggestionCache.set(cacheKey, { vote: voteChoice, reason });
            
            setHasAgentVoted(false);
            setVoteSuggestion(voteChoice);
            setVoteReason(reason);
            setIsLoading(false);
            return;
          } catch {
            // Fallback: try to extract from non-JSON response
            const aiResponse = data.response.toLowerCase();
            let voteChoice: 'yes' | 'no' | undefined;
            
            if (aiResponse.includes('"vote": "yes"') || aiResponse.includes("'vote': 'yes'")) {
              voteChoice = 'yes';
            } else if (aiResponse.includes('"vote": "no"') || aiResponse.includes("'vote': 'no'")) {
              voteChoice = 'no';
            }

            // Cache if we got a vote choice
            if (voteChoice) {
              suggestionCache.set(cacheKey, { vote: voteChoice, reason: data.response });
            }

            setHasAgentVoted(false);
            setVoteSuggestion(voteChoice);
            setVoteReason(data.response);
            setIsLoading(false);
            return;
          }
        }
      }
      
      setHasAgentVoted(false);
      setVoteSuggestion(undefined);
      setVoteReason('Unable to generate suggestion.');
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating suggestion:', error);
      setHasAgentVoted(false);
      setVoteSuggestion(undefined);
      setVoteReason('Error generating suggestion.');
      setIsLoading(false);
    }
  };

  const getVoteSuggestion = async () => {
    try {
      // Validate proposal object
      if (!proposal || !proposal.id) {
        console.error('Invalid proposal object:', proposal);
        setVoteSuggestion(undefined);
        setVoteReason('Invalid proposal data');
        setIsLoading(false);
        return;
      }

      // Create a unique key for caching based on the directive and proposal body
      // const cacheKey = `${ethos}-${proposal.id}`;
      try {
        const apiResponse = await fetch(
          `${DAVOS_API_ENDPOINT}/api/vote-details/${address}/${proposal.id}`,
          {
            headers: {
              'ngrok-skip-browser-warning': 'true',
            },
          }
        );

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          if (data.success && data.data) {
            // Check if the agent has actually voted (status is 'voted')
            const isVoted = data.data.status === 'voted';
            setHasAgentVoted(isVoted);
            
            // For closed proposals with actual votes, use the actual vote choice
            // Otherwise use the AI suggestion
            const actualVote = data.data.userVoteChoice || data.data.aiVoteChoice;
            setVoteSuggestion(actualVote);
            setVoteReason(data.data.aiResponse);
            setIsLoading(false);
          } else {
            // No agent data - generate suggestion on-the-fly if ethos available
            await generateSuggestionOnTheFly();
          }
        } else {
          // API error - try generating suggestion on-the-fly
          await generateSuggestionOnTheFly();
        }
      } catch (error) {
        console.error('Error fetching vote details:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('Current proposal object:', proposal);
        setHasAgentVoted(false);
        setVoteSuggestion(undefined);
        setVoteReason('Error fetching vote details');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error parsing query:', error);
    }
  };

  const handleManualVote = async (vote: string) => {
    if (!address) {
      console.error('No wallet address available');
      toast.error('Please connect your wallet');
      return;
    }

    if (!walletClient) {
      console.error('No wallet client available');
      toast.error('Wallet client not available');
      return;
    }

    try {
      // Determine vote source from proposal data
      const isSnapshot = proposal?.source === 'snapshot' || (proposal?.space && proposal?.choices);
      const isTally =
        proposal?.source === 'tally' || (proposal?.governorAddress && proposal?.proposalId);

      // Check delegation status before voting
      if (isSnapshot) {
        const spaceId =
          (typeof proposal.space === 'object' ? proposal.space?.id : proposal.space) || '';
        const delegationStatus = await getDelegationStatus(
          address as `0x${string}`,
          'snapshot',
          spaceId,
          undefined,
          undefined
        );

        if (!delegationStatus.exists) {
          toast.error(
            'You need to delegate your voting power before voting. Please set up your voting agent first.'
          );
          return;
        }
      } else if (isTally) {
        // Extract info for Tally
        const daoIdentifier = proposal.daoIdentifier || proposal.space?.id || '';
        const governorAddressMatch = daoIdentifier.match(/eip155:(\d+):(.+)/);
        const chainIdFromIdentifier = governorAddressMatch
          ? parseInt(governorAddressMatch[1], 10)
          : 42161;

        // Get token address from proposal if available
        const tokenAddress = proposal.tokenAddress;

        if (tokenAddress) {
          const delegationStatus = await getDelegationStatus(
            address as `0x${string}`,
            'tally',
            daoIdentifier,
            tokenAddress as `0x${string}`,
            chainIdFromIdentifier
          );

          if (!delegationStatus.exists) {
            toast.error(
              'You need to delegate your voting power before voting. Please set up your voting agent first.'
            );
            return;
          }
        }
      }

      if (isSnapshot) {
        // Snapshot voting (off-chain)
        const hub = import.meta.env.VITE_SNAPSHOT_HUB_URL || 'https://hub.snapshot.org';
        const client = new snapshot.Client712(hub);
        const choice = vote === 'yes' ? 1 : 2; // 1=For, 2=Against

        const spaceId =
          (typeof proposal.space === 'object' ? proposal.space?.id : proposal.space) || '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const receipt = await client.vote(walletClient as any, address, {
          space: spaceId,
          proposal: proposal.id,
          type: 'single-choice',
          choice: choice,
        });

        console.log('Snapshot vote submitted successfully:', receipt);
      } else if (isTally) {
        // Tally on-chain voting - call Governor.castVote() directly
        const support = vote === 'yes' ? 1 : 0; // 1=For, 0=Against

        // Extract governor address from daoIdentifier (format: eip155:chainId:governorAddress)
        const daoIdentifier = proposal.daoIdentifier || proposal.space?.id || '';
        const governorAddressMatch = daoIdentifier.match(/eip155:\d+:(.+)/);
        const governorAddress = governorAddressMatch
          ? governorAddressMatch[1]
          : proposal.governorAddress;
        const proposalId = proposal.proposalId || proposal.id;

        if (!governorAddress || !proposalId) {
          throw new Error(
            `Missing Tally vote data - governorAddress: ${governorAddress}, proposalId: ${proposalId}`
          );
        }

        // Validate we're on the correct network (Arbitrum = chainId 42161)
        const chainId = await walletClient.getChainId();
        if (chainId !== 42161) {
          throw new Error(
            `Please switch to Arbitrum network in your wallet. Current network: ${chainId}`
          );
        }

        // Governor ABI for castVote function
        const governorABI = [
          {
            name: 'castVote',
            type: 'function',
            inputs: [
              { name: 'proposalId', type: 'uint256' },
              { name: 'support', type: 'uint8' },
            ],
            outputs: [{ name: 'balance', type: 'uint256' }],
            stateMutability: 'nonpayable',
          },
        ];

        try {
          const hash = await walletClient.writeContract({
            address: governorAddress as `0x${string}`,
            abi: governorABI,
            functionName: 'castVote',
            args: [BigInt(proposalId), support],
          });
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash });
          }
        } catch (contractError) {
          console.error('Contract call failed:', contractError);
          console.error('Error details:', {
            message: contractError instanceof Error ? contractError.message : String(contractError),
            governorAddress,
            proposalId,
            support,
            voterAddress: address,
          });
          throw new Error(
            `Vote failed: ${contractError instanceof Error ? contractError.message : 'Unknown error'}. Check console for details.`
          );
        }
      } else {
        console.error('Unknown proposal type - neither Snapshot nor Tally detected');
      }

      // Update vote status in persistent map
      setVoteStatusMap(prev => ({
        ...prev,
        [proposal.id]: { hasVoted: true, userVote: vote },
      }));

      setManualVoteOpen(false);
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  // Preview Vote + Manual Vote button for desktop
  const stateLC = proposal.state?.toLowerCase();
  const isClosed = stateLC === 'closed' || stateLC === 'defeated';
  const hasVoteResult = voteStatus === 'yes' || voteStatus === 'no';
  const isButtonDisabled = isClosed && !hasVoteResult;

  const SuggestButtons = () => {
    const isProposalActive = proposal.state?.toLowerCase() === 'active';
    return (
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="cursor-pointer" 
          onClick={() => setOpen(true)}
          disabled={isButtonDisabled}
        >
          {hasVoteResult ? 'Show Agent Reason' : isClosed ? 'No Agent Vote' : 'Preview Agent Vote'}
        </Button>
        {isAgentEnabled && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setManualVoteOpen(true)}
                  disabled={!isProposalActive}
                >
                  <SquarePen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isProposalActive ? 'Vote Manually' : 'Voting closed'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  if (isDesktop) {
    return (
      <>
        {/* Preview Vote Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            {isAgentEnabled ? (
              <SuggestButtons />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="cursor-pointer"
                disabled={isClosed && !hasVoteResult}
              >
                {hasVoteResult ? 'Show Agent Reason' : isClosed ? 'No Agent Vote' : 'Suggest'}
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="md:max-w-[768px]">
            <DialogHeader>
              <DialogTitle>{proposal.title}</DialogTitle>
            </DialogHeader>

            <SuggestionContent
              isLoading={isLoading}
              voteSuggestion={voteSuggestion}
              voteReason={voteReason}
              isAgentEnabled={isAgentEnabled}
              hasAgentVoted={hasAgentVoted}
              proposalState={proposal.state}
              onVoteNow={() => {
                setOpen(false);
                setManualVoteOpen(true);
              }}
              canVote={proposal.state?.toLowerCase() === 'active'}
              votingStartDate={proposal.start}
            />
          </DialogContent>
        </Dialog>

        {/* Manual Vote Dialog */}
        <Dialog open={manualVoteOpen} onOpenChange={setManualVoteOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Vote Manually</DialogTitle>
              <DialogDescription>{proposal.title}</DialogDescription>
            </DialogHeader>

            <ManualVoteContent
              onVoteYes={() => handleManualVote('yes')}
              onVoteNo={() => handleManualVote('no')}
              hasVoted={hasVoted}
              userVote={userVote}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {/* Preview Vote Drawer */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {isAgentEnabled ? (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="cursor-pointer"
                disabled={isButtonDisabled}
              >
                {hasVoteResult ? 'Show Agent Reason' : isClosed ? 'No Agent Vote' : 'Preview Agent Vote'}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="cursor-pointer p-2"
                      onClick={e => {
                        e.stopPropagation(); // Prevent triggering the Preview drawer
                        setManualVoteOpen(true);
                      }}
                      disabled={proposal.state?.toLowerCase() !== 'active'}
                    >
                      <SquarePen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{proposal.state?.toLowerCase() === 'active' ? 'Vote Manually' : 'Voting closed'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <Button variant="outline" className="cursor-pointer">
              Suggest
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{proposal.title}</DrawerTitle>
          </DrawerHeader>

          <div className="px-4">
            <SuggestionContent
              isLoading={isLoading}
              voteSuggestion={voteSuggestion}
              voteReason={voteReason}
              isAgentEnabled={isAgentEnabled}
              hasAgentVoted={hasAgentVoted}
              proposalState={proposal.state}
              onVoteNow={() => {
                setOpen(false);
                setManualVoteOpen(true);
              }}
              canVote={proposal.state?.toLowerCase() === 'active'}
              votingStartDate={proposal.start}
            />
          </div>

          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline" className="cursor-pointer">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Manual Vote Drawer */}
      <Drawer open={manualVoteOpen} onOpenChange={setManualVoteOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Vote Manually</DrawerTitle>
            <DrawerDescription>{proposal.title}</DrawerDescription>
          </DrawerHeader>

          <div className="px-4">
            <ManualVoteContent
              onVoteYes={() => handleManualVote('yes')}
              onVoteNo={() => handleManualVote('no')}
              hasVoted={hasVoted}
              userVote={userVote}
            />
          </div>

          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline" className="cursor-pointer">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
