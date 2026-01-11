import { useState, useEffect, useCallback } from 'react';
import { DAVOS_API_ENDPOINT } from '@/lib/constants';

export interface VotingPowerData {
  proposalId: string;
  spaceId: string;
  vp: number;
  vpByStrategy: number[];
  vpState: string;
  proposalStart: number;
  proposalEnd: number;
  canVote: boolean;
  scheduledVoteTime: string | null;
  lastChecked: string;
}

interface UseVotingPowerResult {
  votingPowers: VotingPowerData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getVotingPowerForProposal: (proposalId: string) => VotingPowerData | undefined;
}

/**
 * Hook to fetch voting power data for an agent
 * Returns all active proposals with voting power info
 */
export function useVotingPower(agentAddress: string | undefined): UseVotingPowerResult {
  const [votingPowers, setVotingPowers] = useState<VotingPowerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVotingPower = useCallback(async () => {
    if (!agentAddress) {
      setVotingPowers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${DAVOS_API_ENDPOINT}/api/voting-power/${agentAddress}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch voting power: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setVotingPowers(result.data);
      } else {
        setVotingPowers([]);
      }
    } catch (err) {
      console.error('Error fetching voting power:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch voting power');
      setVotingPowers([]);
    } finally {
      setIsLoading(false);
    }
  }, [agentAddress]);

  useEffect(() => {
    fetchVotingPower();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchVotingPower, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchVotingPower]);

  const getVotingPowerForProposal = useCallback((proposalId: string): VotingPowerData | undefined => {
    return votingPowers.find(vp => vp.proposalId === proposalId);
  }, [votingPowers]);

  return {
    votingPowers,
    isLoading,
    error,
    refetch: fetchVotingPower,
    getVotingPowerForProposal
  };
}

interface LiveVotingPowerResult {
  vp: number;
  vpByStrategy: number[];
  vpState: string;
  canVote: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch live voting power directly from Snapshot API (bypassing cache)
 */
export function useLiveVotingPower(
  voter: string | undefined,
  space: string | undefined,
  proposal: string | undefined
): LiveVotingPowerResult {
  const [result, setResult] = useState<LiveVotingPowerResult>({
    vp: 0,
    vpByStrategy: [],
    vpState: 'loading',
    canVote: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!voter || !space || !proposal) {
      setResult(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchLiveVotingPower = async () => {
      try {
        const response = await fetch(
          `${DAVOS_API_ENDPOINT}/api/voting-power/live/${voter}/${space}/${proposal}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch live voting power: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          setResult({
            vp: data.data.vp,
            vpByStrategy: data.data.vpByStrategy || [],
            vpState: data.data.vpState,
            canVote: data.data.canVote,
            isLoading: false,
            error: null
          });
        }
      } catch (err) {
        console.error('Error fetching live voting power:', err);
        setResult(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch live voting power'
        }));
      }
    };

    fetchLiveVotingPower();
  }, [voter, space, proposal]);

  return result;
}
