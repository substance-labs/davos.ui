// ============================================================================
// IMPORTS
// ============================================================================

import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import { DaoConfigItem } from '@/lib/constants';
import { toast } from 'sonner';
import { useAccount, useBalance, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { PublicClient } from 'viem';
import { useDelegationVerification } from '@/hooks/use-delegation-verification';
import { useAgentSetup } from '@/hooks/use-agent-setup';
import { StopAgentConfirmation } from '@/lib/StopAgentConfirmation';
import { DelegationVerificationDialog } from '@/lib/DelegationVerificationDialog';
import { Button } from '@/components/ui/button';
import { useAgents } from '@/contexts/AgentContext';
import { DelegateDialog } from '@/lib/DelegateDialog';
import { DelegateButtonContent } from '@/lib/DelegateButtonContent';
import { useAutomaticDelegation } from '@/hooks/use-automatic-delegation';
import { useStopAgent } from '@/hooks/use-stop-agent';

// ============================================================================
// TYPES
// ============================================================================

interface TokenBalanceData {
  value: bigint;
  decimals: number;
  symbol: string;
  formatted: string;
}

interface DelegateProps {
  dao: DaoConfigItem;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Delegate({ dao }: DelegateProps) {
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  const isDesktop = useIsMobile() === false;

  // ========================================
  // Wallet & Network State
  // ========================================

  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: dao.chainId }) as PublicClient;
  const { writeContractAsync } = useWriteContract();

  // ========================================
  // UI State
  // ========================================

  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [showSetupPhase, setShowSetupPhase] = useState(false);
  const [showManualDelegation, setShowManualDelegation] = useState(false);
  const [isDelegationComplete, setIsDelegationComplete] = useState(false);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const [showDelegationVerification, setShowDelegationVerification] = useState(false);

  // ========================================
  // Delegation State
  // ========================================

  const [delegating, setDelegating] = useState(false);
  const [, setDelegated] = useState(false); // Used by useStopAgent hook
  const [, setAutoDelegationConfirmed] = useState(false); // Used in resetDialogState

  // ========================================
  // Context & Hooks
  // ========================================

  const { hasAgent } = useAgents();

  // Agent setup hook - manages agent lifecycle
  const {
    isLoading: isAgentLoading,
    error: agentError,
    agentAddress,
    setupAgent,
    delegateToAgent,
    stopAgentAndRevoke,
    stopAgentOnly,
    predictAddress,
  } = useAgentSetup({
    dao,
    userAddress,
    publicClient,
    writeContractAsync,
    onStepChange: setCurrentStep,
  });

  // Delegation verification hook - checks existing delegations
  const {
    isLoading: isDelegationLoading,
    setIsLoading,
    setError,
    delegationExists,
    delegationTarget,
    isWrongNetwork,
    switchToCorrectNetwork,
    switchToPolygon,
    checkExistingDelegation,
  } = useDelegationVerification({
    userAddress: userAddress as `0x${string}` | undefined,
    daoIdentifier: dao.identifier,
    daoName: dao.name,
    daoChainId: dao.chainId,
    daoSource: dao.source,
    tokenAddress: dao.tokenAddress as `0x${string}` | undefined,
  });

  // Automatic delegation hook - handles on-chain delegation + agent setup
  const { isAutoDelegationProcessActive, startAutomaticDelegation } = useAutomaticDelegation({
    userAddress,
    chainId,
    dao,
    agentAddress,
    setDelegating,
    setIsDelegationComplete,
    setOpen,
    setShowSetupPhase,
    setError,
    setupAgent,
    delegateToAgent,
    predictAddress,
    switchToCorrectNetwork,
    switchToPolygon,
    onStepChange: setCurrentStep,
    checkExistingDelegation,
  });

  // Stop agent hook - handles agent removal and delegation revocation
  const { stopAgent: handleStopAgent } = useStopAgent({
    userAddress,
    chainId,
    daoName: dao.name,
    daoChainId: dao.chainId,
    daoSource: dao.source as 'snapshot' | 'tally',
    setDelegating,
    setDelegated,
    setShowStopConfirmation,
    setError,
    stopAgentAndRevoke,
    stopAgentOnly,
    switchToCorrectNetwork,
    switchToPolygon,
  });

  // Token balance query
  const {
    data: tokenBalance,
    isError,
    isLoading: isBalanceLoading,
  } = useBalance({
    address: userAddress,
    token: dao.tokenAddress as `0x${string}`,
    chainId: dao.chainId,
  }) as { data?: TokenBalanceData; isError: boolean; isLoading: boolean };

  // ========================================
  // Computed Values
  // ========================================

  const isAutomaticFlow = (dao as { flow?: string }).flow === 'automatic';
  const isLoading = isTestMode ? false : isAgentLoading || isDelegationLoading;
  const hasTokenBalance = isTestMode
    ? true
    : Boolean(!isError && tokenBalance && tokenBalance.value > 0n);

  // ========================================
  // Side Effects
  // ========================================

  // Sync agent error to delegation error state
  useEffect(() => {
    if (agentError) {
      setError(agentError);
    }
  }, [agentError, setError]);

  // ========================================
  // Helper Functions
  // ========================================

  /**
   * Resets all dialog and flow state to initial values
   */
  const resetDialogState = () => {
    setShowManualDelegation(false);
    setShowSetupPhase(false);
    setCurrentStep(null);
    setError(null);
    setAutoDelegationConfirmed(false);
    setIsDelegationComplete(false);
  };

  /**
   * Predicts agent address if not already available
   * @returns true if address exists or was successfully predicted
   */
  const ensureAgentAddressPredicted = async (): Promise<boolean> => {
    if (agentAddress) return true;

    const predictedAddress = await predictAddress();

    if (!predictedAddress) {
      toast.error('Failed to predict agent address');
      return false;
    }

    return true;
  };

  /**
   * Handles network switching if needed, then starts delegation flow
   */
  const handleNetworkSwitchAndStartFlow = async () => {
    // Already on correct network - start flow immediately
    if (chainId === dao.chainId) {
      if (isAutomaticFlow) {
        startAutomaticDelegation();
      } else {
        setOpen(true);
      }
      return;
    }

    // Switch to correct network first
    setIsLoading(true);
    try {
      const switched = await switchToCorrectNetwork();
      if (switched) {
        if (isAutomaticFlow) {
          startAutomaticDelegation();
        } else {
          setOpen(true);
        }
      }
    } catch {
      toast.error(`Failed to switch to ${dao.name} network`);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // Event Handlers
  // ========================================

  /**
   * Main button click handler - determines flow based on agent existence
   */
  const handleButtonClick = async () => {
    // If agent exists, show stop confirmation
    if (hasAgent(dao)) {
      setShowStopConfirmation(true);
      return;
    }

    // Validate wallet connection
    if (!userAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Reset state
    setCurrentStep(null);
    setError(null);

    // Ensure agent address is predicted
    const addressReady = await ensureAgentAddressPredicted();
    if (!addressReady) return;

    // Handle network switching and start flow
    await handleNetworkSwitchAndStartFlow();
  };

  /**
   * Handles dialog/drawer close - resets all state
   */
  const handleDialogClose = (open: boolean) => {
    setOpen(open);
    if (!open) {
      resetDialogState();
    }
  };

  /**
   * Handles cancel button - closes dialog and resets state
   */
  const handleCancel = () => {
    setOpen(false);
    resetDialogState();
  };

  /**
   * Handles verification dialog close - user declined to continue
   */
  const handleVerificationClose = () => {
    setShowDelegationVerification(false);
    setOpen(false);
    setIsLoading(false);
    setShowManualDelegation(false);
  };

  /**
   * Handles verification continue - user confirmed to proceed
   */
  const handleVerificationContinue = () => {
    setShowDelegationVerification(false);
    setShowSetupPhase(true);
  };

  /**
   * Handles delegation completion - closes dialog
   */
  const handleDelegationComplete = () => {
    setOpen(false);
    setIsDelegationComplete(false);
  };

  /**
   * Handles delegation verification and starts agent setup
   */
  const handleDelegationVerified = () => {
    setShowSetupPhase(true);
    setupAgent(true);
  };

  // ========================================
  // Render
  // ========================================

  return (
    <>
      <Button
        variant="outline"
        onClick={handleButtonClick}
        disabled={isLoading || isBalanceLoading}
        className={isDesktop ? 'min-w-[140px]' : 'w-full'}
      >
        <DelegateButtonContent hasAgent={hasAgent(dao)} />
      </Button>

      <StopAgentConfirmation
        open={showStopConfirmation}
        onOpenChange={setShowStopConfirmation}
        daoName={dao.name}
        delegating={delegating}
        onConfirm={async (revokeDelegation: boolean) => {
          await handleStopAgent(revokeDelegation);
        }}
      />

      <DelegationVerificationDialog
        open={showDelegationVerification}
        onOpenChange={setShowDelegationVerification}
        delegationExists={delegationExists}
        delegationTarget={delegationTarget}
        daoName={dao.name}
        onClose={handleVerificationClose}
        onContinue={handleVerificationContinue}
      />

      <DelegateDialog
        isDesktop={isDesktop}
        open={open}
        onOpenChange={handleDialogClose}
        isDelegationComplete={isDelegationComplete}
        showSetupPhase={showSetupPhase}
        showManualDelegation={showManualDelegation}
        currentStep={currentStep}
        isAutoDelegationProcessActive={isAutoDelegationProcessActive}
        isAutomaticFlow={isAutomaticFlow}
        daoName={dao.name}
        agentAddress={agentAddress}
        isWrongNetwork={isWrongNetwork}
        isLoading={isLoading}
        tokenBalance={tokenBalance}
        hasAgent={hasAgent(dao)}
        hasTokenBalance={hasTokenBalance}
        onDelegationComplete={handleDelegationComplete}
        onCancel={handleCancel}
        onManualDelegation={() => setShowManualDelegation(true)}
        onAutomaticDelegation={startAutomaticDelegation}
        onCheckDelegation={checkExistingDelegation}
        onDelegationVerified={handleDelegationVerified}
      />
    </>
  );
}
