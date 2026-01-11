import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { DaoConfigItem, CHAIN_IDS } from '@/lib/constants';
import { 
  predictAgentAddress, 
  hasCustomDelegationHandler, 
  verifyBlockchainDelegation,
  ethereumPublicClient,
  polygonPublicClient,
  arbitrumPublicClient 
} from '@/lib/utils';
import { createPublicClient, http, formatUnits, zeroAddress } from 'viem';
import { mainnet, gnosis } from 'viem/chains';

const ZERO_ADDRESS = zeroAddress;

// ABI for reading delegation and votes from ERC20Votes tokens
const ERC20_VOTES_READ_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'delegates',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'getVotes',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ABI for AAVE token which uses getDelegateeByType and getPowerCurrent
const AAVE_TOKEN_READ_ABI = [
  {
    inputs: [
      { name: 'delegator', type: 'address' },
      { name: 'delegationType', type: 'uint8' },
    ],
    name: 'getDelegateeByType',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'delegationType', type: 'uint8' },
    ],
    name: 'getPowerCurrent',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// DAOs that use AAVE-style delegation (delegateByType)
const AAVE_STYLE_DAOS = ['aavedao.eth'];

// Chain to public client mapping
function getPublicClientForChain(chainId: number) {
  switch (chainId) {
    case CHAIN_IDS.ETHEREUM:
      return ethereumPublicClient;
    case CHAIN_IDS.POLYGON:
      return polygonPublicClient;
    case CHAIN_IDS.ARBITRUM:
      return arbitrumPublicClient;
    case CHAIN_IDS.GNOSIS:
      return createPublicClient({
        chain: gnosis,
        transport: http(),
      });
    default:
      return createPublicClient({
        chain: mainnet,
        transport: http(),
      });
  }
}

export interface AgentDelegationStatus {
  agentAddress: string | null;
  isDelegated: boolean;
  votingPower: string;
  tokenSymbol: string;
  delegationTimestamp: number | null; // Unix timestamp of when delegation was made
  isLoading: boolean;
  error: string | null;
}

// Global cache for delegation status to prevent duplicate requests
const delegationStatusCache = new Map<string, {
  data: AgentDelegationStatus;
  timestamp: number;
  promise?: Promise<void>;
}>();

// Cache duration: 60 seconds
const CACHE_DURATION = 60 * 1000;

// Subscribers for cache updates
const cacheSubscribers = new Map<string, Set<(status: AgentDelegationStatus) => void>>();

function getCacheKey(userAddress: string, daoIdentifier: string): string {
  return `${userAddress.toLowerCase()}-${daoIdentifier}`;
}

function notifySubscribers(cacheKey: string, status: AgentDelegationStatus) {
  const subscribers = cacheSubscribers.get(cacheKey);
  if (subscribers) {
    subscribers.forEach(callback => callback(status));
  }
}

export function useAgentDelegationStatus(dao: DaoConfigItem): AgentDelegationStatus {
  const { address: userAddress } = useAccount();
  const [status, setStatus] = useState<AgentDelegationStatus>({
    agentAddress: null,
    isDelegated: false,
    votingPower: '0',
    tokenSymbol: '',
    delegationTimestamp: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!userAddress) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const cacheKey = getCacheKey(userAddress, dao.identifier);

    // Subscribe to cache updates
    if (!cacheSubscribers.has(cacheKey)) {
      cacheSubscribers.set(cacheKey, new Set());
    }
    cacheSubscribers.get(cacheKey)!.add(setStatus);

    // Check cache first
    const cached = delegationStatusCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Use cached data
      setStatus(cached.data);
      return () => {
        cacheSubscribers.get(cacheKey)?.delete(setStatus);
      };
    }

    // If there's already a fetch in progress, wait for it
    if (cached?.promise) {
      return () => {
        cacheSubscribers.get(cacheKey)?.delete(setStatus);
      };
    }

    const fetchDelegationStatus = async () => {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // 1. Get the agent address
        const agentAddress = await predictAgentAddress(
          userAddress,
          dao.identifier,
          dao.source
        );

        if (!agentAddress) {
          const errorStatus: AgentDelegationStatus = {
            agentAddress: null,
            isDelegated: false,
            votingPower: '0',
            tokenSymbol: '',
            delegationTimestamp: null,
            isLoading: false,
            error: 'Could not get agent address',
          };
          delegationStatusCache.set(cacheKey, { data: errorStatus, timestamp: Date.now() });
          notifySubscribers(cacheKey, errorStatus);
          return;
        }

        // 2. Check delegation status based on DAO type
        let isDelegated = false;
        let votingPower = '0';
        let tokenSymbol = '';
        // Note: delegationTimestamp is no longer fetched via block logs due to RPC limitations
        // Voting power eligibility per proposal should be checked via Snapshot VP query
        const delegationTimestamp: number | null = null;

        if (hasCustomDelegationHandler(dao.identifier)) {
          // For DAOs with custom delegation, check token-native delegation
          const tokenAddress = dao.tokenAddress as `0x${string}`;
          const client = getPublicClientForChain(dao.chainId);

          try {
            // Check if this is an AAVE-style DAO (uses delegateByType)
            if (AAVE_STYLE_DAOS.includes(dao.identifier)) {
              // AAVE uses getDelegateeByType and getPowerCurrent
              // Note: getDelegateeByType reverts with "Internal error" if no delegation exists
              const currentDelegate = await client.readContract({
                address: tokenAddress,
                abi: AAVE_TOKEN_READ_ABI,
                functionName: 'getDelegateeByType',
                args: [userAddress as `0x${string}`, 1], // Type 1 = PROPOSITION
              }).catch(() => ZERO_ADDRESS as `0x${string}`); // Return zero address if no delegation

              isDelegated = currentDelegate.toLowerCase() === agentAddress.toLowerCase();

              // Get voting power of the agent (also may revert if no delegation)
              const votes = await client.readContract({
                address: tokenAddress,
                abi: AAVE_TOKEN_READ_ABI,
                functionName: 'getPowerCurrent',
                args: [agentAddress as `0x${string}`, 1], // Type 1 = PROPOSITION
              }).catch(() => BigInt(0));

              // Get decimals and symbol
              const [decimals, symbol] = await Promise.all([
                client.readContract({
                  address: tokenAddress,
                  abi: AAVE_TOKEN_READ_ABI,
                  functionName: 'decimals',
                }).catch(() => 18),
                client.readContract({
                  address: tokenAddress,
                  abi: AAVE_TOKEN_READ_ABI,
                  functionName: 'symbol',
                }).catch(() => 'AAVE'),
              ]);

              votingPower = formatUnits(votes, decimals);
              tokenSymbol = symbol;
            } else {
              // Standard ERC20Votes delegation (ARB, UNI, etc.)
              const currentDelegate = await client.readContract({
                address: tokenAddress,
                abi: ERC20_VOTES_READ_ABI,
                functionName: 'delegates',
                args: [userAddress as `0x${string}`],
              });

              isDelegated = currentDelegate.toLowerCase() === agentAddress.toLowerCase();

              // Get voting power of the agent
              const votes = await client.readContract({
                address: tokenAddress,
                abi: ERC20_VOTES_READ_ABI,
                functionName: 'getVotes',
                args: [agentAddress as `0x${string}`],
              });

              // Get decimals and symbol
              const [decimals, symbol] = await Promise.all([
                client.readContract({
                  address: tokenAddress,
                  abi: ERC20_VOTES_READ_ABI,
                  functionName: 'decimals',
                }),
                client.readContract({
                  address: tokenAddress,
                  abi: ERC20_VOTES_READ_ABI,
                  functionName: 'symbol',
                }),
              ]);

              votingPower = formatUnits(votes, decimals);
              tokenSymbol = symbol;
            }
          } catch (err) {
            console.error('[AgentDelegationStatus] Error reading token delegation:', err);
          }
        } else if (dao.source === 'snapshot') {
          // For standard Snapshot DAOs, check the delegation registry
          try {
            isDelegated = await verifyBlockchainDelegation(
              dao.identifier,
              userAddress as `0x${string}`,
              agentAddress as `0x${string}`
            );
          } catch (err) {
            console.error('[AgentDelegationStatus] Error verifying delegation:', err);
            isDelegated = false;
          }

          // For Snapshot, we can try to get token voting power if tokenAddress is available
          if (dao.tokenAddress) {
            const tokenAddress = dao.tokenAddress as `0x${string}`;
            const client = getPublicClientForChain(dao.chainId);

            try {
              const [votes, decimals, symbol] = await Promise.all([
                client.readContract({
                  address: tokenAddress,
                  abi: ERC20_VOTES_READ_ABI,
                  functionName: 'getVotes',
                  args: [agentAddress as `0x${string}`],
                }).catch(() => BigInt(0)),
                client.readContract({
                  address: tokenAddress,
                  abi: ERC20_VOTES_READ_ABI,
                  functionName: 'decimals',
                }).catch(() => 18),
                client.readContract({
                  address: tokenAddress,
                  abi: ERC20_VOTES_READ_ABI,
                  functionName: 'symbol',
                }).catch(() => ''),
              ]);

              votingPower = formatUnits(votes, decimals);
              tokenSymbol = symbol;
            } catch (err) {
              console.error('[AgentDelegationStatus] Error reading token info:', err);
            }
          }
        } else if (dao.source === 'tally') {
          // For Tally DAOs, check the token delegation
          if (dao.tokenAddress) {
            const tokenAddress = dao.tokenAddress as `0x${string}`;
            const client = getPublicClientForChain(dao.chainId);

            try {
              const currentDelegate = await client.readContract({
                address: tokenAddress,
                abi: ERC20_VOTES_READ_ABI,
                functionName: 'delegates',
                args: [userAddress as `0x${string}`],
              });

              isDelegated = currentDelegate.toLowerCase() === agentAddress.toLowerCase();

              const [votes, decimals, symbol] = await Promise.all([
                client.readContract({
                  address: tokenAddress,
                  abi: ERC20_VOTES_READ_ABI,
                  functionName: 'getVotes',
                  args: [agentAddress as `0x${string}`],
                }),
                client.readContract({
                  address: tokenAddress,
                  abi: ERC20_VOTES_READ_ABI,
                  functionName: 'decimals',
                }),
                client.readContract({
                  address: tokenAddress,
                  abi: ERC20_VOTES_READ_ABI,
                  functionName: 'symbol',
                }),
              ]);

              votingPower = formatUnits(votes, decimals);
              tokenSymbol = symbol;
            } catch (err) {
              console.error('[AgentDelegationStatus] Error reading Tally token delegation:', err);
            }
          }
        }

        const successStatus: AgentDelegationStatus = {
          agentAddress,
          isDelegated,
          votingPower,
          tokenSymbol,
          delegationTimestamp,
          isLoading: false,
          error: null,
        };
        delegationStatusCache.set(cacheKey, { data: successStatus, timestamp: Date.now() });
        notifySubscribers(cacheKey, successStatus);
      } catch (err) {
        console.error('[AgentDelegationStatus] Error:', err);
        const errorStatus: AgentDelegationStatus = {
          agentAddress: null,
          isDelegated: false,
          votingPower: '0',
          tokenSymbol: '',
          delegationTimestamp: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
        delegationStatusCache.set(cacheKey, { data: errorStatus, timestamp: Date.now() });
        notifySubscribers(cacheKey, errorStatus);
      }
    };

    // Store the promise in cache to prevent duplicate requests
    const promise = fetchDelegationStatus();
    const existingCache = delegationStatusCache.get(cacheKey);
    delegationStatusCache.set(cacheKey, { 
      data: existingCache?.data || status, 
      timestamp: existingCache?.timestamp || 0,
      promise 
    });

    return () => {
      cacheSubscribers.get(cacheKey)?.delete(setStatus);
    };
  }, [userAddress, dao.identifier, dao.source, dao.tokenAddress, dao.chainId]);

  return status;
}
