import { useState } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { toast } from 'sonner';
import { getDelegationStatus } from '@/lib/utils';

interface UseDelegationVerificationProps {
  userAddress: `0x${string}` | undefined;
  daoIdentifier: string;
  daoName: string;
  daoChainId: number;
  daoSource: string; // Add source parameter for Snapshot vs Tally
  tokenAddress?: `0x${string}`; // Token address for Tally DAOs
}

export function useDelegationVerification({
  userAddress,
  daoIdentifier,
  daoName,
  daoChainId,
  daoSource,
  tokenAddress,
}: UseDelegationVerificationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [delegationExists, setDelegationExists] = useState(false);
  const [delegationTarget, setDelegationTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  const isWrongNetwork = isTestMode ? false : chainId !== daoChainId;

  const switchToCorrectNetwork = async () => {
    if (!switchChain) {
      toast.error('Wallet connection error');
      return false;
    }

    try {
      await switchChain({ chainId: daoChainId });
      toast.success(`Switched to ${daoName} network`);
      return true;
    } catch (error) {
      console.error('Network switch failed:', error);
      toast.error(`Failed to switch to ${daoName} network`);
      return false;
    }
  };

  const verifyDelegation = async (
    delegator: `0x${string}`,
    expectedDelegate: `0x${string}` | null
  ): Promise<boolean> => {
    // Use test mode adapter if VITE_TEST_ENV is true
    const isTestMode =
      (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
    if (isTestMode) {
      // Mock successful verification in test mode
      console.info(
        `[TEST MODE] Mocking delegation verification for delegator: ${delegator}, expected: ${expectedDelegate}`
      );
      return true;
    }

    try {
      const { target } = await getDelegationStatus(
        delegator,
        daoSource,
        daoIdentifier,
        tokenAddress,
        daoChainId
      );
      return target?.toLowerCase() === expectedDelegate?.toLowerCase();
    } catch (error) {
      console.error('Error verifying delegation:', error);
      return false;
    }
  };

  const checkExistingDelegation = async () => {
    // Use test mode adapter if VITE_TEST_ENV is true
    const isTestMode =
      (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
    if (isTestMode) {
      // Mock successful delegation in test mode
      console.info(
        `[TEST MODE] Mocking delegation check for user: ${userAddress}, dao: ${daoIdentifier}`
      );
      const mockAgentAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      return { exists: true, target: mockAgentAddress };
    }

    try {
      if (!userAddress) {
        return { exists: false, target: undefined };
      }
      const { exists, target } = await getDelegationStatus(
        userAddress,
        daoSource,
        daoIdentifier,
        tokenAddress,
        daoChainId
      );
      return { exists, target: target || undefined };
    } catch (error) {
      console.error('Error checking delegation:', error);
      return { exists: false, target: undefined };
    }
  };

  return {
    isLoading,
    delegationExists,
    delegationTarget,
    error,
    isWrongNetwork,
    switchToCorrectNetwork,
    verifyDelegation,
    checkExistingDelegation,
    setDelegationExists,
    setDelegationTarget,
    setError,
    setIsLoading,
  };
}
