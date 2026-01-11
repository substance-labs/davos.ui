import { useState } from 'react';
import { toast } from 'sonner';
import { CHAIN_IDS } from '@/lib/constants';

interface UseStopAgentProps {
  userAddress?: string;
  chainId: number;
  daoName: string;
  daoChainId: number;
  daoSource: 'snapshot' | 'tally';
  setDelegating: (delegating: boolean) => void;
  setDelegated: (delegated: boolean) => void;
  setShowStopConfirmation: (show: boolean) => void;
  setError: (error: string | null) => void;
  stopAgentAndRevoke: () => Promise<boolean>;
  stopAgentOnly: () => Promise<boolean>;
  switchToCorrectNetwork: () => Promise<boolean>;
  switchToPolygon: () => Promise<boolean>;
}

export function useStopAgent({
  userAddress: _userAddress, // eslint-disable-line @typescript-eslint/no-unused-vars
  chainId,
  daoName,
  daoChainId,
  daoSource,
  setDelegating,
  setDelegated,
  setShowStopConfirmation,
  setError,
  stopAgentAndRevoke,
  stopAgentOnly,
  switchToCorrectNetwork,
  switchToPolygon,
}: UseStopAgentProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const stopAgent = async (revokeDelegation: boolean = true) => {
    setIsProcessing(true);
    setDelegating(true);
    setError(null);

    try {
      // For Snapshot DAOs, we need to be on Polygon for delegation operations
      // For Tally DAOs, we need to be on the DAO's chain for token delegation
      const requiredChainId = daoSource === 'snapshot' ? CHAIN_IDS.POLYGON : daoChainId;
      const networkName = daoSource === 'snapshot' ? 'Polygon' : daoName;

      if (chainId !== requiredChainId) {
        toast.info(`Switching to ${networkName} network...`);
        const switched = daoSource === 'snapshot' 
          ? await switchToPolygon() 
          : await switchToCorrectNetwork();
        if (!switched) {
          throw new Error(`Failed to switch to ${networkName} network`);
        }
      }

      const success = revokeDelegation ? await stopAgentAndRevoke() : await stopAgentOnly();

      if (success) {
        setDelegated(false);
        setShowStopConfirmation(false);
        toast.success(
          revokeDelegation ? 'Agent stopped and delegation revoked!' : 'Agent stopped!'
        );
      }
      return success;
    } catch (err) {
      const error = err as Error;
      setError('Stop failed: ' + (error?.message || 'Unknown error'));
      toast.error('Stop failed: ' + (error?.message || 'Unknown error'));
      return false;
    } finally {
      setIsProcessing(false);
      setDelegating(false);
    }
  };

  return {
    isProcessing,
    stopAgent,
  };
}
