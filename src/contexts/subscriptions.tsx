import { DaoConfigItem } from '@/lib/constants';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';

// Define the structure of a subscription
export interface Subscription {
  dao: DaoConfigItem
}

// Interface for subscriptions storage by account
interface AccountSubscriptions {
  [address: string]: Subscription[]
}

// Define the context shape
interface SubscriptionsContextType {
  subscriptions: Subscription[];
  addSubscription: (dao: DaoConfigItem) => void;
  removeSubscription: (dao: DaoConfigItem) => void;
  isSubscribed: (dao: DaoConfigItem) => boolean;
}

// Create the context with a default value
const SubscriptionsContext = createContext<SubscriptionsContextType>({
  subscriptions: [],
  addSubscription: () => {},
  removeSubscription: () => {},
  isSubscribed: () => false,
});

// Custom hook to use the subscriptions context
export const useSubscriptions = () => useContext(SubscriptionsContext);

// Provider component
export function SubscriptionsProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [allSubscriptions, setAllSubscriptions] = useState<AccountSubscriptions>(() => {
    if (typeof window === 'undefined') return {};
    
    // Load all subscription data
    try {
      const saved = localStorage.getItem('allDaoSubscriptions');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Failed to parse subscriptions from localStorage:", error);
      return {};
    }
  });
  
  // Get current user's subscriptions
  const currentSubscriptions = address ? (allSubscriptions[address] || []) : [];
  
  // Save to localStorage whenever subscriptions change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('allDaoSubscriptions', JSON.stringify(allSubscriptions));
    }
  }, [allSubscriptions]);
  
  // Update subscriptions when address changes
  useEffect(() => {
    // This is just to ensure the UI updates when account changes
    // The actual subscriptions are pulled directly from allSubscriptions
  }, [address]);

  // Add a new subscription for the current account
  const addSubscription = (dao: DaoConfigItem) => {
    if (!address) return; // Don't save if no address is connected
    
    setAllSubscriptions(prev => {
      const userSubscriptions = prev[address] || [];
      
      // Check if already subscribed
      if (userSubscriptions.some(sub => sub.dao?.identifier === dao.identifier)) {
        return prev;
      }
      
      // Add new subscription
      return {
        ...prev,
        [address]: [
          ...userSubscriptions,
          { dao }
        ]
      };
    });
  };

  // Remove a subscription for the current account
  const removeSubscription = (dao: DaoConfigItem) => {
    if (!address) return;
    
    setAllSubscriptions(prev => {
      const userSubscriptions = prev[address] || [];
      
      return {
        ...prev,
        [address]: userSubscriptions.filter(sub => sub.dao?.identifier !== dao.identifier)
      };
    });
  };

  // Check if the current account is subscribed
  const isSubscribed = (dao: DaoConfigItem) => {
    if (!address) return false;
    
    const userSubscriptions = allSubscriptions[address] || [];
    return userSubscriptions.some(sub => sub.dao?.identifier === dao.identifier);
  };

  // Create the context value based on the current user's subscriptions
  const contextValue: SubscriptionsContextType = {
    subscriptions: currentSubscriptions,
    addSubscription,
    removeSubscription,
    isSubscribed
  };

  return (
    <SubscriptionsContext.Provider value={contextValue}>
      {children}
    </SubscriptionsContext.Provider>
  );
}