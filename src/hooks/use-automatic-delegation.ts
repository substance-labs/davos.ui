import { useState } from 'react';
import { toast } from 'sonner';
import { getChainId } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { DaoConfigItem, CHAIN_IDS } from '@/lib/constants';
import { hasCustomDelegationHandler } from '@/lib/utils';

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
  switchToPolygon: () => Promise<boolean>;
  onStepChange?: (step: string | null) => void;
  checkExistingDelegation: () => Promise<{ exists: boolean; target?: string }>;
}

export function useAutomaticDelegation({
  userAddress,
  chainId,
  dao,
  agentAddress: _agentAddress, // eslint-disable-line @typescript-eslint/no-unused-vars
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
  onStepChange,
  checkExistingDelegation: _checkExistingDelegation, // eslint-disable-line @typescript-eslint/no-unused-vars
}: UseAutomaticDelegationProps) {
  const [isAutoDelegationProcessActive, setIsAutoDelegationProcessActive] = useState(false);

  const setStep = (step: string | null) => {
    if (onStepChange) {
      onStepChange(step);
    }
  };

  const startAutomaticDelegation = async () => {
    if (!userAddress) {
      toast.error('Please connect your wallet to delegate');
      return;
    }

    setIsAutoDelegationProcessActive(true);
    try {
      setDelegating(true);
      setIsDelegationComplete(false);
      setOpen(true);
      setShowSetupPhase(true);

      // DAOs with custom delegation handlers manage their own chain switching
      // (e.g., Aave uses token-native delegation on Ethereum, not Polygon)
      const hasCustomHandler = hasCustomDelegationHandler(dao.identifier);
      
      if (!hasCustomHandler) {
        // For standard Snapshot DAOs, we need to switch to Polygon for delegation
        // For Tally DAOs, we need to switch to the DAO's chain
        const requiredChainId = dao.source === 'snapshot' ? CHAIN_IDS.POLYGON : dao.chainId;
        const networkName = dao.source === 'snapshot' ? 'Polygon' : dao.name;

        if (chainId !== requiredChainId) {
          toast.info(`Switching to ${networkName} network...`);
          const switched = dao.source === 'snapshot' 
            ? await switchToPolygon() 
            : await switchToCorrectNetwork();
          if (!switched) return;
          
          // Verify chain actually switched by polling wagmi config
          const maxAttempts = 20; // 10 seconds max
          let attempts = 0;
          while (attempts < maxAttempts) {
            const currentChainId = getChainId(config);
            if (currentChainId === requiredChainId) {
              console.log('[AutoDelegation] Chain switch verified:', currentChainId);
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }
          
          if (attempts >= maxAttempts) {
            toast.error(`Failed to switch to ${networkName}. Please switch manually.`);
            return;
          }
        }
      } else {
        console.log('[AutoDelegation] DAO has custom delegation handler, skipping pre-switch');
      }

      // 1. Predict the agent address
      setStep('predict-address');
      const address = await predictAddress();
      if (!address || address.length !== 42) {
        throw new Error('Failed to predict a valid agent address');
      }

      // 2. Delegate tokens to the agent
      setStep('delegate-tokens');
      const delegationSuccess = await delegateToAgent();
      if (!delegationSuccess) {
        throw new Error('Delegation transaction failed');
      }

      toast.success('Delegation transaction successful!');

      // 3. Deploy the agent (skip verification since it's already done)
      setStep('create-agent');
      const agentSetupSuccess = await setupAgent(true); // Pass `true` to skip verification
      if (!agentSetupSuccess) {
        throw new Error('Agent setup failed after successful delegation');
      }

      setDelegating(false);
      setIsDelegationComplete(true);
      setShowSetupPhase(false);

      setStep('complete');
      toast.success('Automatic delegation completed successfully!');
    } catch (err) {
      const error = err as Error;
      console.error('Automatic delegation error:', err);
      setError(error.message || 'Automatic delegation failed');
      toast.error(error.message || 'Automatic delegation failed');
      setStep(null);
    } finally {
      setIsAutoDelegationProcessActive(false);
    }
  };

  return {
    isAutoDelegationProcessActive,
    startAutomaticDelegation,
  };
}
