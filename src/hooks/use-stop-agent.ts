import { useState } from 'react';
import { toast } from 'sonner';

interface UseStopAgentProps {
  userAddress?: string;
  chainId: number;
  daoName: string;
  daoChainId: number;
  setDelegating: (delegating: boolean) => void;
  setDelegated: (delegated: boolean) => void;
  setShowStopConfirmation: (show: boolean) => void;
  setError: (error: string | null) => void;
  stopAgentAndRevoke: () => Promise<boolean>;
  stopAgentOnly: () => Promise<boolean>;
  switchToCorrectNetwork: () => Promise<boolean>;
}

export function useStopAgent({
  userAddress: _userAddress,
  chainId,
  daoName,
  daoChainId,
  setDelegating,
  setDelegated,
  setShowStopConfirmation,
  setError,
  stopAgentAndRevoke,
  stopAgentOnly,
  switchToCorrectNetwork
}: UseStopAgentProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const stopAgent = async (revokeDelegation: boolean = true) => {
    setIsProcessing(true);
    setDelegating(true);
    setError(null);

    try {
      if (chainId !== daoChainId) {
        toast.info(`Switching to ${daoName} network...`);
        const switched = await switchToCorrectNetwork();
        if (!switched) {
          throw new Error(`Failed to switch to ${daoName} network`);
        }
      }

      const success = revokeDelegation ? await stopAgentAndRevoke() : await stopAgentOnly();
      
      if (success) {
        setDelegated(false);
        setShowStopConfirmation(false);
        toast.success(revokeDelegation ? "Agent stopped and delegation revoked!" : "Agent stopped!");
      }
      return success;
    } catch (err: any) {
      setError("Stop failed: " + (err?.message || "Unknown error"));
      toast.error("Stop failed: " + (err?.message || "Unknown error"));
      return false;
    } finally {
      setIsProcessing(false);
      setDelegating(false);
    }
  };

  return {
    isProcessing,
    stopAgent
  };
}