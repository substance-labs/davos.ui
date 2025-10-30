import { useState } from 'react';
import { toast } from 'sonner';
import { PublicClient } from 'viem';

import { 
  predictAgentAddress, 
  deployKMS, 
  createAgent, 
  enableAgent, 
  delegateOnChainWithSource,
  stopAgent,
  revokeOnChainWithSource,
  verifyBlockchainDelegation
} from '@/lib/utils';
import { DaoConfigItem } from '@/lib/constants';
import { useAgents } from '@/contexts/AgentContext';
import { useSubscriptions } from '@/contexts/subscriptions';

interface UseAgentSetupProps {
  dao: DaoConfigItem;
  userAddress?: string;
  publicClient: PublicClient;
  writeContractAsync: any;
  onStepChange?: (step: string | null) => void;
}

export function useAgentSetup({
  dao,
  userAddress,
  publicClient,
  writeContractAsync,
  onStepChange
}: UseAgentSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentAddress, setAgentAddress] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const { addAgent, removeAgent } = useAgents();
  const { addSubscription } = useSubscriptions();

  const setStep = (step: string | null) => {
    if (onStepChange) {
      onStepChange(step);
    }
  };

  const verifyDelegationOnChain = async () => {
    try {
      setStep("verify-delegation");
      const isValid = await verifyBlockchainDelegation(
        dao.identifier,
        userAddress as `0x${string}`,
        agentAddress as `0x${string}`
      );

      if (!isValid) {
        throw new Error("Delegation verification failed");
      }

      return true;
    } catch (err: any) {
      console.error("Delegation verification error:", err);
      setError(err.message || "Delegation verification failed");
      return false;
    }
  };

  const setupAgent = async (skipVerification = false) => {
    if (!userAddress) {
      toast.error("User address is required");
      return false;
    }

    // Use test mode adapter if VITE_TEST_ENV is true
    const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
    
    try {
      setIsLoading(true);
      setError(null);

      // Predict agent address if needed
      if (!agentAddress || agentAddress.length !== 42) {
        setStep("predict-address");
        try {
          const predictedAddress = await predictAgentAddress(userAddress as `0x${string}`, dao.identifier, dao.source);
          if (!predictedAddress) {
            throw new Error("Failed to predict agent address");
          }
          setAgentAddress(predictedAddress);
        } catch (err) {
          console.error("Failed to predict address:", err);
          setError("Failed to predict agent address");
          return false;
        }
      }

      // Skip verification for automatic flow - we'll verify after delegation
      // In test mode, always skip verification since there's no real blockchain
      const shouldSkipVerification = skipVerification || isTestMode;
      if (!shouldSkipVerification) {
        console.log("Running delegation verification in setupAgent");
        const isDelegationValid = await verifyDelegationOnChain();
        if (!isDelegationValid) {
          throw new Error("Delegation verification failed in setupAgent");
        }
      } else {
        console.log("Skipping delegation verification in setupAgent");
      }

      // Step 2: Deploy KMS Adapter
      setStep("create-kms-adapter");
      console.log("Starting KMS deployment for user:", userAddress, "source:", dao.source);
      const kmsResponse = await deployKMS(userAddress as `0x${string}`, dao.source);
      console.log("KMS deployment response:", kmsResponse);
      if (!kmsResponse?.kmsAddress) {
        console.error("KMS deployment failed - no kmsAddress in response:", kmsResponse);
        throw new Error("Failed to deploy KMS Adapter");
      }
      console.log("KMS deployment successful, address:", kmsResponse.kmsAddress);

      // Step 3: Create Agent
      setStep("create-agent");
      const agentResponse = await createAgent(
        userAddress as `0x${string}`,
        dao.identifier,
        kmsResponse.kmsAddress,
        dao.source
      );
      if (!agentResponse?.id) {
        throw new Error("Failed to create agent");
      }

      // Step 4: Enable Agent
      setStep("enable-agent");
      await enableAgent(
        dao.identifier,
        agentResponse.id,
        agentResponse.existingAgent
      );

      // Save agent locally
      addAgent(dao);
      addSubscription(dao);

      setStep("complete");
      setIsComplete(true);
      return true;
    } catch (err: any) {
      console.error("Agent setup error:", err);
      setError(err.message || "Agent setup failed");
      toast.error(err.message || "Agent setup failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const stopAgentAndRevoke = async () => {
    try {
      setIsLoading(true);
      if (!userAddress) {
        toast.error("User address not available");
        return false;
      }

      // First stop the agent in the backend
      console.log("Stopping agent with space ID:", dao.identifier, "user address:", userAddress);
      
      try {
        await stopAgent(dao.identifier, userAddress as `0x${string}`, dao.source);
      } catch (stopError) {
        console.error("Error stopping agent in backend:", stopError);
        // Continue with on-chain revocation even if backend call fails
      }
      
      // Then revoke the on-chain delegation
      await revokeOnChainWithSource(
        publicClient,
        dao.source,
        dao.identifier,
        userAddress as `0x${string}`,
        writeContractAsync,
        dao.tokenAddress,
        dao.chainId
      );
      
      // After successful revocation, remove the agent from local state
      removeAgent(dao);
      
      toast.success("Agent stopped and delegation revoked successfully!");
      return true;
    } catch (err: any) {
      console.error("Error stopping agent and revoking delegation:", err);
      setError(err.message || "Failed to stop agent and revoke delegation");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const stopAgentOnly = async () => {
    try {
      setIsLoading(true);
      if (!userAddress) {
        toast.error("User address not available");
        return false;
      }

      // Stop the agent in the backend only
      console.log("Stopping agent with space ID:", dao.identifier, "user address:", userAddress);
      
      await stopAgent(dao.identifier, userAddress as `0x${string}`, dao.source);
      
      // Remove the agent from local state
      removeAgent(dao);
      
      toast.success("Agent stopped successfully!");
      return true;
    } catch (err: any) {
      console.error("Error stopping agent:", err);
      setError((err as Error).message || "Failed to stop agent");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const delegateToAgent = async () => {
    try {
      setIsLoading(true);
      if (!userAddress) {
        toast.error("User address not available");
        return false;
      }
      
      // Use a local variable to store the address we'll use for delegation
      let targetAddress = agentAddress;
      
      // Check if agent address is valid before proceeding
      if (!targetAddress || targetAddress.length !== 42) {
        console.log("Agent address not available, predicting first...");
        try {
          const predictedAddress = await predictAddress();
          if (!predictedAddress) {
            throw new Error("Failed to predict agent address");
          }
          // Use the predicted address directly rather than waiting for state update
          targetAddress = predictedAddress;
        } catch (err) {
          console.error("Failed to predict address:", err);
          setError("Failed to predict agent address");
          return false;
        }
      }
      
      // Verify we have a valid address to use (using our local variable)
      if (!targetAddress || targetAddress.length !== 42) {
        toast.error("Invalid agent address");
        setError("Invalid agent address");
        return false;
      }
      
      console.log("Delegating to agent:", targetAddress);
      // Use source-aware delegation function to support both Snapshot and Tally
      await delegateOnChainWithSource(
        publicClient,
        dao.source,
        dao.identifier,
        userAddress as `0x${string}`,
        targetAddress as `0x${string}`,
        writeContractAsync,
        dao.tokenAddress as `0x${string}`,
        dao.chainId
      );
      
      toast.success("Delegation successful!");
      return true;
    } catch (err) {
      console.error("Delegation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Delegation failed";
      setError(errorMessage);
      toast.error("Delegation failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const predictAddress = async () => {
    try {
      if (!userAddress) {
        toast.error("User address not available");
        return undefined;
      }
      
      // Call the utility function
      const address = await predictAgentAddress(userAddress as `0x${string}`, dao.identifier, dao.source);
      setAgentAddress(address);
      return address;
    } catch (err) {
      console.error("Failed to predict address:", err);
      setError("Failed to predict agent address");
      return undefined;
    }
  };

  return {
    isLoading,
    error,
    setError,
    agentAddress,
    setupAgent,
    verifyDelegationOnChain,
    isComplete,
    delegateToAgent,
    predictAddress,
    stopAgentAndRevoke,
    stopAgentOnly
  };
}

interface UseAutomaticDelegationProps {
  userAddress: string;
  chainId: number;
  dao: DaoConfigItem;
  agentAddress: string;
  setDelegating: (value: boolean) => void;
  setIsDelegationComplete: (value: boolean) => void;
  setOpen: (value: boolean) => void;
  setShowSetupPhase: (value: boolean) => void;
  setError: (error: string | null) => void;
  setupAgent: () => Promise<boolean>;
  delegateToAgent: () => Promise<void>;
  predictAddress: () => Promise<string>;
  switchToCorrectNetwork: () => Promise<void>;
}

export function useAutomaticDelegation({
  userAddress: _userAddress,
  chainId: _chainId,
  dao: _dao,
  agentAddress: _agentAddress,
  setDelegating: _setDelegating,
  setIsDelegationComplete: _setIsDelegationComplete,
  setOpen: _setOpen,
  setShowSetupPhase: _setShowSetupPhase,
  setError: _setError,
  setupAgent: _setupAgent,
  delegateToAgent: _delegateToAgent,
  predictAddress: _predictAddress,
  switchToCorrectNetwork: _switchToCorrectNetwork,
}: UseAutomaticDelegationProps) {
  // Placeholder function - this export structure is maintained for future use
  // The predictAddress function passed in could be used to predict agent address before delegation
}