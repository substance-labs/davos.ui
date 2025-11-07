import { DaoConfigItem, DELEGATE_CONTRACT_ADDRESS, daoConfig } from '@/lib/constants';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import DeleGateABI from '@/artifacts/DeleGate.json';

type UserAgentData = Array<{ space: string; module: string }>;

// Define the structure of a Agent
export interface Agent {
  dao: DaoConfigItem;
}

// Interface for Agents storage by account
interface AccountAgents {
  [address: string]: Agent[];
}

// Define the context shape
interface AgentsContextType {
  agents: Agent[];
  addAgent: (dao: DaoConfigItem) => void;
  removeAgent: (dao: DaoConfigItem) => void;
  hasAgent: (dao: DaoConfigItem) => boolean;
  isLoading: boolean;
}

// Create the context with a default value
const AgentsContext = createContext<AgentsContextType>({
  agents: [],
  addAgent: () => {},
  removeAgent: () => {},
  hasAgent: () => false,
  isLoading: false,
});

// Custom hook to use the Agents context
export const useAgents = () => useContext(AgentsContext);

// Provider component
export function AgentsProvider({ children }: { children: ReactNode }) {
  const { address, isConnected: _isConnected } = useAccount(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const {
    data: userAgentsData,
    isLoading,
    refetch: _refetch, // eslint-disable-line @typescript-eslint/no-unused-vars
  } = useReadContract({
    address: DELEGATE_CONTRACT_ADDRESS,
    abi: DeleGateABI.abi,
    functionName: 'getUserSubscriptions',
    args: [address],
    query: {
      enabled: !!address, // Only fetch when address is available
    },
  }) as { data: UserAgentData | undefined; isLoading: boolean; refetch: () => void };

  const [allAgents, setAllAgents] = useState<AccountAgents>(() => {
    if (typeof window === 'undefined') return {};

    // Load all Agent data
    try {
      const saved = localStorage.getItem('allDaoAgents');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to parse Agents from localStorage:', error);
      return {};
    }
  });

  // Get current user's Agents
  const currentAgents = address ? allAgents[address] || [] : [];

  // Save to localStorage whenever Agents change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('allDaoAgents', JSON.stringify(allAgents));
    }
  }, [allAgents]);

  // Update agents based on contract data when address changes or data is loaded
  useEffect(() => {
    if (address && userAgentsData && Array.isArray(userAgentsData)) {
      // Create new agents array from contract data
      const contractAgents: Agent[] = userAgentsData
        .map(item => {
          // Find the corresponding DAO config by space
          const daoEntry = Object.entries(daoConfig).find(
            ([_, config]) => config.identifier === item.space // eslint-disable-line @typescript-eslint/no-unused-vars
          );

          if (daoEntry) {
            return { dao: daoEntry[1] };
          }
          return null;
        })
        .filter(Boolean) as Agent[];

      // Replace the agents for this address with contract data
      setAllAgents(prev => ({
        ...prev,
        [address]: contractAgents,
      }));
    }
  }, [address, userAgentsData]);

  // Add a new Agent for the current account
  const addAgent = (dao: DaoConfigItem) => {
    if (!address) return; // Don't save if no address is connected

    setAllAgents(prev => {
      const userAgents = prev[address] || [];

      // Check if already subscribed
      if (userAgents.some(sub => sub.dao?.identifier === dao.identifier)) {
        return prev;
      }

      // Add new Agent
      return {
        ...prev,
        [address]: [...userAgents, { dao }],
      };
    });
  };

  // Remove a Agent for the current account
  const removeAgent = (dao: DaoConfigItem) => {
    if (!address) return;

    setAllAgents(prev => {
      const userAgents = prev[address] || [];

      return {
        ...prev,
        [address]: userAgents.filter(sub => sub.dao?.identifier !== dao.identifier),
      };
    });
  };

  // Check if the current account is subscribed
  const hasAgent = (dao: DaoConfigItem) => {
    if (!address) return false;

    const userAgents = allAgents[address] || [];
    return userAgents.some(sub => sub.dao?.identifier === dao.identifier);
  };

  // Create the context value based on the current user's Agents
  const contextValue: AgentsContextType = {
    agents: currentAgents,
    addAgent,
    removeAgent,
    hasAgent,
    isLoading,
  };

  return <AgentsContext.Provider value={contextValue}>{children}</AgentsContext.Provider>;
}
