import { useState } from 'react';
import { toast } from 'sonner';
import { DaoConfigItem } from '@/lib/constants';

interface UseAutomaticDelegationProps {
  userAddress?: string;
  chainId: number;
  dao: DaoConfigItem;
  agentAddress?: string;
  setDelegating: (delegating: boolean) => void;
  setIsDelegationComplete: (complete: boolean) => void;
  setOpen: (open: boolean) => void;
  setShowSetupPhase: (show: boolean) => void;
  setError: (error: string | null) => void;
  setupAgent: (skipVerification?: boolean) => Promise<boolean>;
  delegateToAgent: () => Promise<boolean>;
  predictAddress: () => Promise<string | undefined>;
  switchToCorrectNetwork: () => Promise<boolean>;
  onStepChange?: (step: string | null) => void;
  checkExistingDelegation: () => Promise<{ exists: boolean; target?: string }>;
}

export function useAutomaticDelegation({
  userAddress,
  chainId,
  dao,
  agentAddress: _agentAddress,
  setDelegating,
  setIsDelegationComplete,
  setOpen,
  setShowSetupPhase,
  setError,
  setupAgent,
  delegateToAgent,
  predictAddress,
  switchToCorrectNetwork,
  onStepChange,
  checkExistingDelegation: _checkExistingDelegation
}: UseAutomaticDelegationProps) {
  const [isAutoDelegationProcessActive, setIsAutoDelegationProcessActive] = useState(false);
  
  const setStep = (step: string | null) => {
    if (onStepChange) {
      onStepChange(step);
    }
  };
  
  const startAutomaticDelegation = async () => {
    if (!userAddress) {
      toast.error("Please connect your wallet to delegate");
      return;
    }

    setIsAutoDelegationProcessActive(true);
    try {
      setDelegating(true);
      setIsDelegationComplete(false);
      setOpen(true);
      setShowSetupPhase(true);

      // Switch networks if needed
      if (chainId !== dao.chainId) {
        const switched = await switchToCorrectNetwork();
        if (!switched) return;
      }

      // 1. Predict the agent address
      setStep("predict-address");
      const address = await predictAddress();
      if (!address || address.length !== 42) {
        throw new Error("Failed to predict a valid agent address");
      }

      // 2. Delegate tokens
      setStep("delegate-tokens");
      const delegationSuccess = await delegateToAgent();
      if (!delegationSuccess) {
        throw new Error("Delegation transaction failed");
      }

      toast.success("Delegation transaction successful!");

      // 3. Deploy the agent (skip verification since it's already done)
      setStep("create-agent");
      const agentSetupSuccess = await setupAgent(true); // Pass `true` to skip verification
      if (!agentSetupSuccess) {
        throw new Error("Agent setup failed after successful delegation");
      }

      setDelegating(false);
      setIsDelegationComplete(true);
      setShowSetupPhase(false);

      setStep("complete");
      toast.success("Automatic delegation completed successfully!");
    } catch (err: any) {
      console.error("Automatic delegation error:", err);
      setError(err.message || "Automatic delegation failed");
      toast.error(err.message || "Automatic delegation failed");
      setStep(null);
    } finally {
      setIsAutoDelegationProcessActive(false);
    }
  };

  return {
    isAutoDelegationProcessActive,
    startAutomaticDelegation
  };
}