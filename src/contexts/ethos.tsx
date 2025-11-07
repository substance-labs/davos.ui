import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useSwitchChain } from 'wagmi';
import { config } from '@/config';
import { toast } from 'sonner';
import DeleGateABI from '@/artifacts/DeleGate.json';
import { waitForTransactionReceipt } from '@wagmi/core';
import { DELEGATE_CONTRACT_ADDRESS } from '@/lib/constants';

const POLYGON_CHAIN_ID = 137;

interface EthosContextType {
  ethos: string;
  setEthos: (value: string) => Promise<string | undefined>;
  isLoading: boolean;
}

const EthosContext = createContext<EthosContextType | undefined>(undefined);

/**
 * Extracts ethos string from various return formats
 */
function parseEthosData(data: unknown): string {
  if (!data) return '';

  // Handle struct with 'ethos' field
  if (typeof data === 'object' && data !== null && 'ethos' in data) {
    return String(data.ethos);
  }

  // Handle direct string
  if (typeof data === 'string') {
    return data;
  }

  // Handle array/tuple format
  if (Array.isArray(data) && data.length > 0) {
    return typeof data[0] === 'string' ? data[0] : '';
  }

  return '';
}

/**
 * Checks if error is a user rejection
 */
function isUserRejection(error: unknown): boolean {
  const err = error as { message?: string; cause?: { message?: string } };
  return !!(
    err.message?.includes('User rejected') ||
    err.message?.includes('User denied') ||
    err.cause?.message?.includes('User rejected')
  );
}

export function EthosProvider({ children }: { children: ReactNode }) {
  const { writeContractAsync } = useWriteContract();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [ethos, setEthosState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user ethos from Polygon
  const {
    data: userEthosData,
    isLoading: isEthosLoading,
    refetch,
  } = useReadContract({
    address: DELEGATE_CONTRACT_ADDRESS,
    abi: DeleGateABI.abi,
    functionName: 'getUserEthos',
    args: [address],
    chainId: POLYGON_CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  // Refetch ethos when address changes
  useEffect(() => {
    if (address) {
      refetch();
    } else {
      setEthosState('');
    }
  }, [address, refetch]);

  // Parse and set ethos data
  useEffect(() => {
    if (userEthosData) {
      setEthosState(parseEthosData(userEthosData));
    }
  }, [userEthosData]);

  /**
   * Switch to Polygon network if needed
   */
  async function ensurePolygonNetwork(): Promise<void> {
    if (chainId === POLYGON_CHAIN_ID) return;

    const toastId = toast.loading('Switching to Polygon network...');

    try {
      await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
      toast.dismiss(toastId);
      toast.success('Switched to Polygon network');
    } catch (error) {
      toast.dismiss(toastId);

      if (isUserRejection(error)) {
        toast.info('Network switch cancelled');
      } else {
        toast.error('Failed to switch to Polygon network');
      }

      throw error;
    }
  }

  /**
   * Write ethos to blockchain
   */
  async function writeEthosToChain(value: string): Promise<string> {
    const hash = await writeContractAsync({
      address: DELEGATE_CONTRACT_ADDRESS,
      abi: DeleGateABI.abi,
      functionName: 'defineEthos',
      args: [{ ethos: value }],
      chainId: POLYGON_CHAIN_ID,
      ...config,
    });

    return hash;
  }

  /**
   * Wait for transaction and update state
   */
  async function confirmTransaction(hash: string, value: string): Promise<void> {
    const toastId = toast.loading('Waiting for transaction confirmation...');

    try {
      const result = await waitForTransactionReceipt(config, { hash: hash as `0x${string}` });

      if (result.status === 'success') {
        toast.dismiss(toastId);
        setEthosState(value);
        toast.success('Your ethos has been successfully saved on-chain');
      } else {
        toast.dismiss(toastId);
        toast.error('Transaction failed');
        throw new Error(`Transaction failed with status: ${result.status}`);
      }
    } catch (error) {
      toast.dismiss(toastId);
      throw error;
    }
  }

  /**
   * Update ethos on the blockchain
   */
  async function updateEthos(value: string): Promise<string | undefined> {
    if (!address) {
      toast.error('Please connect your wallet first');
      return undefined;
    }

    if (isLoading) {
      return undefined;
    }

    setIsLoading(true);

    try {
      await ensurePolygonNetwork();
      const hash = await writeEthosToChain(value);
      await confirmTransaction(hash, value);
      return hash;
    } catch (error) {
      console.error('Failed to update ethos:', error);

      if (isUserRejection(error)) {
        toast.info('Transaction was cancelled');
      } else {
        toast.error('Failed to update your ethos. Please try again.');
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  const value = {
    ethos,
    setEthos: updateEthos,
    isLoading: isLoading || isEthosLoading,
  };

  return <EthosContext.Provider value={value}>{children}</EthosContext.Provider>;
}

export function useEthos() {
  const context = useContext(EthosContext);
  if (context === undefined) {
    throw new Error('useEthos must be used within an EthosProvider');
  }
  return context;
}
