// ============================================================================
// IMPORTS
// ============================================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DAVOS_API_ENDPOINT, SNAPSHOT_DELEGATION_REGISTRY, ZERO_ADDRESS, CHAIN_IDS } from './constants';
import { HDKey, hdKeyToAccount } from 'viem/accounts';
import {
  toHex,
  hexToBytes,
  Address,
  keccak256,
  stringToBytes,
  Abi,
  createPublicClient,
  http,
} from 'viem';
import { polygon, mainnet, arbitrum } from 'viem/chains';
import { readContract, getChainId, switchChain } from 'wagmi/actions';
import { config } from './wagmi';
import SnapshotDelegationRegistryABIRaw from '@/artifacts/SnapshotDelegationRegistry.json';
import type { PublicClient } from 'viem';
import { logger } from './logger';

// Create a dedicated Polygon public client for Snapshot operations
export const polygonPublicClient = createPublicClient({
  chain: polygon,
  transport: http('https://polygon-rpc.com'),
});

// Create a dedicated Ethereum mainnet public client for token-native delegation
// Using publicnode which supports CORS for browser requests
export const ethereumPublicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com'),
});

// Create a dedicated Arbitrum public client for ARB token delegation
export const arbitrumPublicClient = createPublicClient({
  chain: arbitrum,
  transport: http('https://arb1.arbitrum.io/rpc'),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

const SnapshotDelegationRegistryABI = SnapshotDelegationRegistryABIRaw as Abi;

// ABI for tokens with native delegate() function (AAVE, UNI, COMP, etc.)
const TokenDelegationABI = [
  {
    name: 'delegate',
    type: 'function',
    inputs: [{ name: 'delegatee', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'delegates',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

// WriteContractAsync type - accepts any parameters that wagmi's writeContractAsync accepts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WriteContractAsync = (variables: any) => Promise<`0x${string}`>;

// ============================================================================
// ENVIRONMENT HELPERS
// ============================================================================

const isTestMode = () =>
  (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';

// ============================================================================
// UI UTILITIES
// ============================================================================

/**
 * Combines class names with Tailwind merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats large numbers with k/m suffixes
 * @example formatNumber(1500) // "2k"
 * @example formatNumber(2500000) // "2.5m"
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}m`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}k`;
  }
  return num.toString();
}

// ============================================================================
// MOCK HELPERS FOR TESTING
// ============================================================================

/**
 * Generates a random Ethereum address for testing
 */
function generateMockAddress(): string {
  return `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(
    ''
  )}`;
}

/**
 * Generates a random transaction hash for testing
 */
function generateMockTxHash(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(
    ''
  )}`;
}

// ============================================================================
// AGENT MANAGEMENT - API CALLS
// ============================================================================

/**
 * Predicts the agent address for a user and space
 */
export async function predictAgentAddress(
  userAddress: Address,
  spaceId: string,
  source: string = 'snapshot'
): Promise<string> {
  if (isTestMode()) {
    logger.testMode(
      `Mocking agent address prediction for user: ${userAddress}, space: ${spaceId}, source: ${source}`
    );
    return generateMockAddress();
  }

  try {
    const response = await fetch(`${DAVOS_API_ENDPOINT}/init-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        userAddress,
        spaceId,
        source,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to predict agent address: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to predict agent address');
    }

    return data.predictedAgentAddress || '';
  } catch (error) {
    logger.error('Error predicting agent address:', error);
    throw error;
  }
}

/**
 * Deploys the KMS adapter for a specific voter address
 */
export async function deployKMS(
  userAddress: Address,
  source: string = 'snapshot'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  logger.debug('deployKMS called with test mode:', isTestMode(), 'endpoint:', DAVOS_API_ENDPOINT);

  if (isTestMode()) {
    logger.testMode(`Mocking KMS deployment for user: ${userAddress}, source: ${source}`);
    return {
      kmsAddress: generateMockAddress(),
      success: true,
    };
  }

  logger.info(`Making API call to deploy KMS for user: ${userAddress}, source: ${source}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${DAVOS_API_ENDPOINT}/get-kms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress, source }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    logger.debug('KMS API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('KMS API error response:', errorText);
      throw new Error(`Failed to deploy KMS adapter: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('KMS deployment timed out after 30 seconds');
      throw new Error('KMS deployment timed out - please check if the API server is running');
    }

    console.error('Error deploying KMS adapter:', error);
    throw error;
  }
}

/**
 * Enable a new agent for a specific voter address
 */
export async function createAgent(
  userAddress: Address,
  spaceId: string,
  kmsAddress: Address,
  source: string = 'snapshot'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (isTestMode()) {
    console.info(
      `[TEST MODE] Mocking agent creation for user: ${userAddress}, space: ${spaceId}, source: ${source}`
    );
    return {
      id: `test-agent-${Date.now()}`,
      existingAgent: false,
      success: true,
    };
  }

  const response = await fetch(`${DAVOS_API_ENDPOINT}/finalize-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userAddress, spaceId, kmsAddress, source }),
  });

  if (!response.ok) {
    throw new Error(`Failed to enable Agent: ${response.status}`);
  }

  return await response.json();
}

/**
 * Enable an agent on a specific Snapshot space
 */
export async function enableAgent(
  spaceId: string,
  agentId: string,
  existing: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (isTestMode()) {
    console.info(`[TEST MODE] Mocking agent enable for space: ${spaceId}, agent: ${agentId}`);
    return {
      id: `test-agent-${Date.now()}`,
      spaceId,
      agentId,
      status: 'active',
      createdAt: new Date().toISOString(),
      existingAgent: existing,
    };
  }

  try {
    const response = await fetch(`${DAVOS_API_ENDPOINT}/spaces/${spaceId}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ agentId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to assign agent: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error assigning agent to ${spaceId}:`, error);
    return {};
  }
}

/**
 * Removes an agent from a specific Snapshot space
 */
export async function stopAgent(
  spaceId: string,
  userAddress: Address,
  source: string = 'snapshot'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (isTestMode()) {
    console.info(
      `[TEST MODE] Mocking agent stop for space: ${spaceId}, user: ${userAddress}, source: ${source}`
    );
    return { success: true, message: 'Agent stopped successfully' };
  }

  try {
    const response = await fetch(`${DAVOS_API_ENDPOINT}/spaces/${spaceId}/users/${userAddress}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ source }),
    });

    if (!response.ok) {
      console.error(`Failed to remove agent: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  } catch (error) {
    console.error(`Error removing agent from ${spaceId}:`, error);
    throw error;
  }
}

// ============================================================================
// CRYPTOGRAPHY & ACCOUNTS
// ============================================================================

/**
 * Derives a private key from an address using Viem HD Key derivation
 */
export const getHDAccountByAddress = (address: string) => {
  const masterSeed = toHex(new TextEncoder().encode(`master-seed-${address}`));
  const hdKey = HDKey.fromMasterSeed(hexToBytes(masterSeed));

  const index = Number(BigInt(address).toString(10).slice(0, 10));
  const account = hdKeyToAccount(hdKey, {
    accountIndex: 1,
    addressIndex: index,
  });

  return account;
};

// ============================================================================
// CONTRACT ABIs
// ============================================================================

// ERC20Votes ABI (for delegating voting power on token)
const ERC20VOTES_ABI = [
  {
    inputs: [{ name: 'delegatee', type: 'address' }],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
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
] as const;

// Tally Governor ABI (from OpenZeppelin Governor)
const TALLY_GOVERNOR_ABI = [
  {
    inputs: [{ name: 'delegatee', internalType: 'address', type: 'address' }],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'delegates',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'getVotes',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============================================================================
// DELEGATION STATUS CHECKS
// ============================================================================
export async function getDelegationStatusLegacy(
  user: `0x${string}`,
  spaceId: string
): Promise<{ exists: boolean; target: `0x${string}` | null }> {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment - simulate no delegation
    console.info(`[TEST MODE] Mocking delegation status check for user: ${user}, space: ${spaceId}`);
    return { exists: false, target: null };
  }

  const id = keccak256(stringToBytes(spaceId));
  const delegatee = (await readContract(config, {
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: 'delegation',
    args: [user, id],
  })) as `0x${string}`;
  const exists = delegatee.toLowerCase() !== ZERO_ADDRESS;
  return { exists, target: exists ? delegatee : null };
}

/**
 * Verify on‐chain that `delegator` really delegated to `expected`.
 * Uses dedicated Ethereum client for reliability.
 */
export const verifyBlockchainDelegation = async (
  spaceId: string,
  delegator: `0x${string}`,
  expected: `0x${string}` | null
): Promise<boolean> => {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment - simulate successful verification
    console.info(
      `[TEST MODE] Mocking blockchain delegation verification for delegator: ${delegator}, space: ${spaceId}`
    );
    return true;
  }

  const id = keccak256(stringToBytes(spaceId));
  
  try {
    // Use dedicated Ethereum client instead of wagmi config for better reliability
    const actual = await ethereumPublicClient.readContract({
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: 'delegation',
      args: [delegator, id],
    }) as `0x${string}`;
    const want = expected?.toLowerCase() ?? ZERO_ADDRESS;
    return actual.toLowerCase() === want;
  } catch (error) {
    console.error('[verifyBlockchainDelegation] Error:', error);
    // On error, return false rather than throwing
    return false;
  }
};

/**
 * Set on‐chain delegation to `delegatee.` (legacy)
 * Uses dedicated Polygon client for all read operations since the registry is on Polygon
 */
export async function delegateOnChainLegacy(
  _client: PublicClient, // Not used - we use polygonPublicClient instead
  spaceId: string,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: WriteContractAsync
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    console.info(
      `[TEST MODE] Mocking on-chain delegation for space: ${spaceId}, delegator: ${delegator}, delegatee: ${delegatee}`
    );
    return { hash: generateMockTxHash() };
  }

  const id = keccak256(stringToBytes(spaceId));

  // Use Polygon client to read current delegation
  try {
    const currentDelegate = (await polygonPublicClient.readContract({
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: 'delegation',
      args: [delegator, id],
    })) as `0x${string}`;

    if (currentDelegate?.toLowerCase() === delegatee.toLowerCase()) {
      return { hash: null, alreadyDelegated: true };
    }
  } catch (readError) {
    console.warn('[Delegation] Unable to read current Snapshot delegate:', readError);
  }

  let gas: bigint | undefined;
  let maxFeePerGas: bigint | undefined;
  let maxPriorityFeePerGas: bigint | undefined;

  // Use Polygon client for gas estimation
  try {
    gas = await polygonPublicClient.estimateContractGas({
      account: delegator,
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: 'setDelegate',
      args: [id, delegatee],
    });
  } catch (gasError) {
    console.warn('[Delegation] Unable to estimate gas for Snapshot delegation:', gasError);
  }

  // Use Polygon client for fee estimation
  try {
    const fees = await polygonPublicClient.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas;
    maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
  } catch (feesError) {
    console.warn('[Delegation] Unable to estimate fees for Snapshot delegation:', feesError);
  }

  const txHash = await writeContractAsync({
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: 'setDelegate',
    args: [id, delegatee],
    account: delegator,
    // Snapshot Delegation Registry is always on Polygon
    chainId: CHAIN_IDS.POLYGON,
    gas: gas ? (gas * 120n) / 100n : undefined,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  // Use Polygon client to wait for transaction receipt with timeout
  try {
    await Promise.race([
      polygonPublicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Receipt timeout')), 30000))
    ]);
  } catch (receiptError) {
    console.warn('[Delegation] Unable to confirm legacy delegation receipt (may still succeed):', receiptError);
  }

  return { hash: txHash };
}
// ============================================================================
// SNAPSHOT DELEGATION (LEGACY)
// ============================================================================

/**
 * Check whether user has already delegated in spaceId (legacy)
 */
export async function getTallyDelegation(
  user: `0x${string}`,
  governorAddress: `0x${string}`,
  tokenAddress?: `0x${string}`,
  chainId?: number
): Promise<{ exists: boolean; target: `0x${string}` | null }> {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment - simulate no delegation
    console.info(
      `[TEST MODE] Mocking Tally delegation status check for user: ${user}, governor: ${governorAddress}`
    );
    return { exists: false, target: null };
  }

  try {
    // For Tally governors, check token delegation if token address is provided
    const addressToCheck = tokenAddress || governorAddress;
    const abi = tokenAddress ? ERC20VOTES_ABI : TALLY_GOVERNOR_ABI;

    const delegatee = (await readContract(config, {
      address: addressToCheck,
      abi: abi,
      functionName: 'delegates',
      args: [user],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chainId: chainId as any,
    })) as `0x${string}`;

    const exists = delegatee.toLowerCase() !== ZERO_ADDRESS;
    return { exists, target: exists ? delegatee : null };
  } catch (error) {
    console.error('Error fetching Tally delegation:', error);
    throw error;
  }
}

/**
 * Get Snapshot delegation status
 */
export async function getSnapshotDelegation(
  user: `0x${string}`,
  spaceId: string
): Promise<{ exists: boolean; target: `0x${string}` | null }> {
  if (isTestMode()) {
    console.info(
      `[TEST MODE] Mocking Snapshot delegation status check for user: ${user}, space: ${spaceId}`
    );
    return { exists: false, target: null };
  }

  try {
    const id = keccak256(stringToBytes(spaceId));
    const delegatee = (await readContract(config, {
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: 'delegation',
      args: [user, id],
      chainId: CHAIN_IDS.POLYGON, // Snapshot Delegation Registry is on Polygon
    })) as `0x${string}`;

    const exists = delegatee.toLowerCase() !== ZERO_ADDRESS;
    return { exists, target: exists ? delegatee : null };
  } catch (error) {
    console.error('Error fetching Snapshot delegation:', error);
    throw error;
  }
}

// ============================================================================
// TALLY DELEGATION STATUS
// ============================================================================

/**
 * Get Tally delegation status
 * Note: Checks TOKEN delegation, not governor, as voting power comes from delegated tokens
 */
export async function getDelegationStatus(
  user: `0x${string}`,
  source: string,
  identifier: string,
  tokenAddress?: `0x${string}`,
  chainId?: number
): Promise<{ exists: boolean; target: `0x${string}` | null }> {
  if (source === 'snapshot') {
    return getSnapshotDelegation(user, identifier);
  } else if (source === 'tally') {
    // Extract the contract address from EIP-155 format (eip155:chainId:address)
    const tallyAddress = identifier.includes(':') ? identifier.split(':')[2] : identifier;
    // Extract chainId from identifier if not provided
    let resolvedChainId = chainId;
    if (!resolvedChainId && identifier.includes(':')) {
      const parts = identifier.split(':');
      resolvedChainId = parseInt(parts[1], 10);
    }
    return getTallyDelegation(user, tallyAddress as `0x${string}`, tokenAddress, resolvedChainId);
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Delegate voting power on an ERC20Votes token (e.g., ARB)
 */
export async function delegateTokenVotingPower(
  tokenAddress: `0x${string}`,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  _chainId?: number
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.info(
      `[TEST MODE] Mocking token voting power delegation for token: ${tokenAddress}, delegator: ${delegator}, delegatee: ${delegatee}`
    );
    return {
      hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };
  }

  try {
    // Check if already delegated to target
    try {
      const currentDelegate = (await readContract(config, {
        address: tokenAddress,
        abi: ERC20VOTES_ABI,
        functionName: 'delegates',
        args: [delegator],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chainId: _chainId as any,
      })) as `0x${string}`;

      if (currentDelegate?.toLowerCase() === delegatee.toLowerCase()) {
        return { hash: null, alreadyDelegated: true };
      }
    } catch (readError) {
      console.warn('[Delegation] Unable to check current token delegate:', readError);
    }

    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: ERC20VOTES_ABI,
      functionName: 'delegate',
      args: [delegatee],
      account: delegator,
      chain: null, // Will use connected wallet's chain
      // Let wagmi handle gas estimation for token delegation
      // Gas estimation is less critical here as token.delegate() is simpler than registry operations
    });
    return { hash };
  } catch (error) {
    console.error(`[Delegation] Error delegating token voting power:`, error);
    throw error;
  }
}

/**
 * Delegate on Tally Governor contract
 * Note: For ARB Governor, we may need to delegate the token voting power first
 */
export async function delegateTallyOnChain(
  client: PublicClient,
  governorAddress: `0x${string}`,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  tokenAddress?: `0x${string}`,
  chainId?: number
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.info(
      `[TEST MODE] Mocking Tally on-chain delegation for governor: ${governorAddress}, delegator: ${delegator}, delegatee: ${delegatee}`
    );
    return {
      hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };
  }

  try {
    // For Tally Governors, voting power comes from the token delegation
    // The Governor reads voting power from the underlying token (e.g., ARB)
    // So we ONLY need to delegate the token voting power, not call delegate on the Governor

    if (tokenAddress) {
      const tokenTx = await delegateTokenVotingPower(
        tokenAddress,
        delegator,
        delegatee,
        writeContractAsync,
        chainId
      );

      if (tokenTx.hash) {
        try {
          await client.waitForTransactionReceipt({
            hash: tokenTx.hash as `0x${string}`,
          });
        } catch (waitError) {
          console.warn(
            `[Delegation] Could not wait for token delegation confirmation, proceeding anyway:`,
            waitError
          );
        }
      }
      return tokenTx;
    }

    throw new Error('Token address is required for Tally Governor delegation');
  } catch (error) {
    console.error(`[Delegation] Error delegating on Tally Governor:`, error);
    throw error;
  }
}

// ============================================================================
// CUSTOM DELEGATION HANDLERS
// ============================================================================

/**
 * Type for custom delegation handler functions
 */
type CustomDelegationHandler = (
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  tokenAddress?: `0x${string}`,
  chainId?: number
) => Promise<{ hash: string | null; alreadyDelegated?: boolean }>;

/**
 * Delegate using token-native delegate() function
 * Used by tokens like AAVE, UNI, COMP that have built-in delegation
 */
async function delegateTokenNative(
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  tokenAddress: `0x${string}`,
  chainId: number,
  publicClient: ReturnType<typeof createPublicClient>
): Promise<{ hash: string | null; alreadyDelegated?: boolean }> {
  console.log('[Delegation] Using token-native delegation...', {
    tokenAddress,
    delegator,
    delegatee,
    chainId,
  });

  // Check current delegate
  try {
    const currentDelegate = await publicClient.readContract({
      address: tokenAddress,
      abi: TokenDelegationABI,
      functionName: 'delegates',
      args: [delegator],
    }) as `0x${string}`;

    if (currentDelegate?.toLowerCase() === delegatee.toLowerCase()) {
      console.log('[Delegation] Already delegated to this address');
      return { hash: null, alreadyDelegated: true };
    }
    console.log('[Delegation] Current delegate:', currentDelegate);
  } catch (readError) {
    console.warn('[Delegation] Unable to read current delegate:', readError);
  }

  // Ensure we're on the correct chain
  const currentChainId = getChainId(config);
  if (currentChainId !== chainId) {
    console.log(`[Delegation] Switching to chain ${chainId}...`);
    await switchChain(config, { chainId: chainId as 1 | 10 | 137 | 8453 | 11155111 | 100 | 42161 });
    const newChainId = getChainId(config);
    if (newChainId !== chainId) {
      throw new Error(`Failed to switch to chain ${chainId}. Please switch manually.`);
    }
  }

  // Call delegate() on the token
  console.log('[Delegation] Calling delegate() on token contract...');
  const txHash = await writeContractAsync({
    address: tokenAddress,
    abi: TokenDelegationABI,
    functionName: 'delegate',
    args: [delegatee],
  });

  console.log('[Delegation] Token delegation tx submitted:', txHash);

  // Wait for confirmation
  try {
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log('[Delegation] Token delegation confirmed!');
  } catch (receiptError) {
    console.warn('[Delegation] Could not confirm receipt:', receiptError);
  }

  return { hash: txHash };
}

// ABI for AAVE token which uses delegateByType instead of delegate
const AaveTokenDelegationABI = [
  {
    inputs: [
      { name: 'delegatee', type: 'address' },
      { name: 'delegationType', type: 'uint8' },
    ],
    name: 'delegateByType',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
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
] as const;

/**
 * Delegate using AAVE's delegateByType function
 * AAVE uses different delegation types: 0 = VOTING, 1 = PROPOSITION
 * For Snapshot voting, we need type 1 (proposition power)
 */
async function delegateAaveToken(
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  tokenAddress: `0x${string}`,
  chainId: number,
  publicClient: ReturnType<typeof createPublicClient>,
  delegationType: number = 1 // 1 = PROPOSITION (used by Snapshot)
): Promise<{ hash: string | null; alreadyDelegated?: boolean }> {
  console.log('[Delegation] Using AAVE delegateByType...', {
    tokenAddress,
    delegator,
    delegatee,
    chainId,
    delegationType,
  });

  // Check current delegate
  try {
    const currentDelegate = await publicClient.readContract({
      address: tokenAddress,
      abi: AaveTokenDelegationABI,
      functionName: 'getDelegateeByType',
      args: [delegator, delegationType],
    }) as `0x${string}`;

    if (currentDelegate?.toLowerCase() === delegatee.toLowerCase()) {
      console.log('[Delegation] Already delegated to this address');
      return { hash: null, alreadyDelegated: true };
    }
    console.log('[Delegation] Current delegate:', currentDelegate);
  } catch (readError) {
    console.warn('[Delegation] Unable to read current delegate:', readError);
  }

  // Ensure we're on the correct chain
  const currentChainId = getChainId(config);
  if (currentChainId !== chainId) {
    console.log(`[Delegation] Switching to chain ${chainId}...`);
    await switchChain(config, { chainId: chainId as 1 | 10 | 137 | 8453 | 11155111 | 100 | 42161 });
    const newChainId = getChainId(config);
    if (newChainId !== chainId) {
      throw new Error(`Failed to switch to chain ${chainId}. Please switch manually.`);
    }
  }

  // Call delegateByType() on the AAVE token
  console.log('[Delegation] Calling delegateByType() on AAVE token...');
  const txHash = await writeContractAsync({
    address: tokenAddress,
    abi: AaveTokenDelegationABI,
    functionName: 'delegateByType',
    args: [delegatee, delegationType],
  });

  console.log('[Delegation] AAVE delegation tx submitted:', txHash);

  // Wait for confirmation
  try {
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log('[Delegation] AAVE delegation confirmed!');
  } catch (receiptError) {
    console.warn('[Delegation] Could not confirm receipt:', receiptError);
  }

  return { hash: txHash };
}

/**
 * Custom delegation handler for Aave (aavedao.eth)
 * Aave uses delegateByType on the AAVE token on Ethereum mainnet
 * Type 1 (PROPOSITION) is used by Snapshot for voting power
 */
const delegateAave: CustomDelegationHandler = async (
  delegator,
  delegatee,
  writeContractAsync,
  tokenAddress,
  _chainId
) => {
  // Aave uses delegateByType on Ethereum mainnet
  const aaveTokenAddress = tokenAddress || '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' as `0x${string}`;
  const aaveChainId = CHAIN_IDS.ETHEREUM; // Always Ethereum for AAVE token

  return delegateAaveToken(
    delegator,
    delegatee,
    writeContractAsync,
    aaveTokenAddress,
    aaveChainId,
    ethereumPublicClient,
    1 // PROPOSITION type for Snapshot voting
  );
};

/**
 * Custom delegation handler for Arbitrum (arbitrumfoundation.eth)
 * Arbitrum uses token-native delegation on the ARB token on Arbitrum One
 */
const delegateArbitrum: CustomDelegationHandler = async (
  delegator,
  delegatee,
  writeContractAsync,
  tokenAddress,
  _chainId
) => {
  // Arbitrum uses token-native delegation on ARB token on Arbitrum One
  const arbTokenAddress = tokenAddress || '0x912CE59144191C1204E64559FE8253a0e49E6548' as `0x${string}`;
  const arbChainId = CHAIN_IDS.ARBITRUM; // Always Arbitrum for ARB token

  return delegateTokenNative(
    delegator,
    delegatee,
    writeContractAsync,
    arbTokenAddress,
    arbChainId,
    arbitrumPublicClient
  );
};

/**
 * Custom delegation handler for Uniswap (uniswapgovernance.eth)
 * Uniswap uses token-native delegation on the UNI token on Ethereum mainnet
 */
const delegateUniswap: CustomDelegationHandler = async (
  delegator,
  delegatee,
  writeContractAsync,
  tokenAddress,
  _chainId
) => {
  // Uniswap uses token-native delegation on Ethereum mainnet
  const uniTokenAddress = tokenAddress || '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' as `0x${string}`;
  const uniChainId = CHAIN_IDS.ETHEREUM; // Always Ethereum for UNI token

  return delegateTokenNative(
    delegator,
    delegatee,
    writeContractAsync,
    uniTokenAddress,
    uniChainId,
    ethereumPublicClient
  );
};

/**
 * Map of custom delegation handlers by DAO identifier
 * Add new DAOs here that need custom delegation logic
 * 
 * Strategy types:
 * - erc20-votes: Uses standard delegate(address) on token - handled by delegateTokenNative
 * - contract-call with delegateByType: Custom ABI (e.g., AAVE) - needs special handler
 * - delegation / erc20-balance-of-delegation: Uses Snapshot registry on Polygon - default behavior
 * - erc20-balance-of / ve-balance-of-at: Balance-based, no delegation supported
 */
const CUSTOM_DELEGATION_HANDLERS: Record<string, CustomDelegationHandler> = {
  // Token-native delegation (erc20-votes strategy)
  'arbitrumfoundation.eth': delegateArbitrum, // ARB token on Arbitrum
  'uniswapgovernance.eth': delegateUniswap,   // UNI token on Ethereum
  
  // Custom delegation ABI
  'aavedao.eth': delegateAave,                // AAVE token with delegateByType on Ethereum
  
  // The following DAOs use Snapshot delegation registry (default behavior):
  // - balancer.eth: veBAL + delegation-with-cap (Snapshot registry)
  // - gnosis.eth: delegation strategy (Snapshot registry)
  // - lido-snapshot.eth: erc20-balance-of-delegation (Snapshot registry)
  
  // The following DAOs don't support delegation (balance-based):
  // - polygonvalidators.eth: Validator staking contract
  // - quickvote.eth: QUICK balance only
  // - qidao.eth: veQI balance only
};

/**
 * Check if a DAO has a custom delegation handler
 */
export function hasCustomDelegationHandler(identifier: string): boolean {
  return identifier in CUSTOM_DELEGATION_HANDLERS;
}

/**
 * Get the custom delegation handler for a DAO (if it exists)
 */
function getCustomDelegationHandler(identifier: string): CustomDelegationHandler | null {
  return CUSTOM_DELEGATION_HANDLERS[identifier] || null;
}

/**
 * Delegate on Snapshot registry (extracted for consistency)
 * Uses dedicated Polygon client for all read operations since the registry is on Polygon
 */
export async function delegateSnapshotOnChain(
  _client: PublicClient, // Not used - we use polygonPublicClient instead
  spaceId: string,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _chainId?: number
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.info(
      `[TEST MODE] Mocking Snapshot on-chain delegation for space: ${spaceId}, delegator: ${delegator}, delegatee: ${delegatee}`
    );
    return {
      hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };
  }

  // Ensure we're on Polygon before proceeding - wagmi simulates on current chain
  const currentChainId = getChainId(config);
  if (currentChainId !== CHAIN_IDS.POLYGON) {
    console.log('[Delegation] Switching to Polygon for Snapshot delegation...');
    await switchChain(config, { chainId: CHAIN_IDS.POLYGON });
    // Verify the switch completed
    const newChainId = getChainId(config);
    if (newChainId !== CHAIN_IDS.POLYGON) {
      throw new Error('Failed to switch to Polygon. Please switch manually and try again.');
    }
    console.log('[Delegation] Successfully switched to Polygon');
  }

  const id = keccak256(stringToBytes(spaceId));

  // Use Polygon client to read current delegation (registry is on Polygon)
  try {
    const currentDelegate = (await polygonPublicClient.readContract({
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: 'delegation',
      args: [delegator, id],
    })) as `0x${string}`;

    if (currentDelegate?.toLowerCase() === delegatee.toLowerCase()) {
      return { hash: null, alreadyDelegated: true };
    }
  } catch (readError) {
    console.warn('[Delegation] Unable to read current Snapshot delegate:', readError);
  }

  // Note: Snapshot Delegation Registry is on Polygon (chainId 137)
  // The wallet should already be on Polygon (switched above)
  console.log('[Delegation] Submitting setDelegate transaction to Polygon...', {
    registry: SNAPSHOT_DELEGATION_REGISTRY,
    spaceId,
    delegator,
    delegatee,
    id: id,
  });

  // Let wagmi/MetaMask handle gas estimation - don't pass pre-calculated values
  // This avoids potential mismatches between our estimation and the wallet's
  const txHash = await writeContractAsync({
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: 'setDelegate',
    args: [id, delegatee],
  });

  console.log('[Delegation] Transaction submitted! Hash:', txHash);

  // Use Polygon client to wait for transaction receipt with timeout (60 seconds)
  // Don't block forever - if it times out, the tx may still succeed
  try {
    await Promise.race([
      polygonPublicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Receipt timeout')), 60000))
    ]);
    console.log('[Delegation] Transaction confirmed!');
  } catch (receiptError) {
    console.warn('[Delegation] Unable to confirm Snapshot delegation receipt (may still succeed):', receiptError);
    console.warn('[Delegation] Check Polygonscan for tx:', `https://polygonscan.com/tx/${txHash}`);
  }

  return { hash: txHash };
}

/**
 * Enhanced delegateOnChain with source routing
 * Checks for custom delegation handlers first, then falls back to standard methods
 */
export async function delegateOnChainWithSource(
  client: PublicClient,
  source: string,
  identifier: string,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  tokenAddress?: `0x${string}`,
  chainId?: number
) {
  // Check for custom delegation handler first (e.g., Aave uses token-native delegation)
  const customHandler = getCustomDelegationHandler(identifier);
  if (customHandler) {
    console.log(`[Delegation] Using custom handler for ${identifier}`);
    return customHandler(delegator, delegatee, writeContractAsync, tokenAddress, chainId);
  }

  // Standard delegation routing
  if (source === 'snapshot') {
    return delegateSnapshotOnChain(
      client,
      identifier,
      delegator,
      delegatee,
      writeContractAsync,
      chainId
    );
  } else if (source === 'tally') {
    // Extract the contract address from EIP-155 format (eip155:chainId:address)
    const tallyAddress = identifier.includes(':') ? identifier.split(':')[2] : identifier;
    // Extract chainId from identifier if not provided
    let resolvedChainId = chainId;
    if (!resolvedChainId && identifier.includes(':')) {
      const parts = identifier.split(':');
      resolvedChainId = parseInt(parts[1], 10);
    }
    return delegateTallyOnChain(
      client,
      tallyAddress as `0x${string}`,
      delegator,
      delegatee,
      writeContractAsync,
      tokenAddress,
      resolvedChainId
    );
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Clear on‐chain delegation.
 * Uses dedicated Polygon client for all read operations since the registry is on Polygon
 */
export async function revokeOnChain(
  _client: PublicClient, // Not used - we use polygonPublicClient instead
  spaceId: string,
  delegator: `0x${string}`,
  writeContractAsync: WriteContractAsync
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.info(
      `[TEST MODE] Mocking on-chain delegation revocation for space: ${spaceId}, delegator: ${delegator}`
    );
    return {
      hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };
  }

  const id = keccak256(stringToBytes(spaceId));

  let gas: bigint | undefined;
  let maxFeePerGas: bigint | undefined;
  let maxPriorityFeePerGas: bigint | undefined;

  // Use Polygon client for gas estimation
  try {
    gas = await polygonPublicClient.estimateContractGas({
      account: delegator,
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: 'clearDelegate',
      args: [id],
    });
  } catch (gasError) {
    console.warn('[Delegation] Unable to estimate gas for Snapshot revocation:', gasError);
  }

  // Use Polygon client for fee estimation
  try {
    const fees = await polygonPublicClient.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas;
    maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
  } catch (feesError) {
    console.warn('[Delegation] Unable to estimate fees for Snapshot revocation:', feesError);
  }

  const txHash = await writeContractAsync({
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: 'clearDelegate',
    args: [id],
    account: delegator,
    // Snapshot Delegation Registry is always on Polygon
    chainId: CHAIN_IDS.POLYGON,
    gas: gas ? (gas * 120n) / 100n : undefined,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  // Use Polygon client to wait for transaction receipt with timeout
  try {
    await Promise.race([
      polygonPublicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Receipt timeout')), 30000))
    ]);
  } catch (receiptError) {
    console.warn('[Delegation] Unable to confirm Snapshot revocation receipt (may still succeed):', receiptError);
  }

  return { hash: txHash };
}

/**
 * Revoke delegation on Tally Governor (delegate to self)
 */
export async function revokeTallyOnChain(
  client: PublicClient,
  governorAddress: `0x${string}`,
  delegator: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  tokenAddress?: `0x${string}`,
  chainId?: number
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.info(
      `[TEST MODE] Mocking Tally on-chain delegation revocation for governor: ${governorAddress}, delegator: ${delegator}`
    );
    return {
      hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };
  }

  try {
    // For Tally, revoke token delegation by delegating to self
    if (tokenAddress) {
      const tokenTx = await delegateTokenVotingPower(
        tokenAddress,
        delegator,
        delegator,
        writeContractAsync,
        chainId
      );

      if (tokenTx.hash) {
        try {
          await client.waitForTransactionReceipt({
            hash: tokenTx.hash as `0x${string}`,
          });
        } catch (waitError) {
          console.warn(
            `[Revocation] Could not wait for token revocation confirmation, proceeding anyway:`,
            waitError
          );
        }
      }
      return tokenTx;
    }

    throw new Error('Token address is required for Tally Governor revocation');
  } catch (error) {
    console.error(`[Revocation] Error revoking Tally Governor delegation:`, error);
    throw error;
  }
}

/**
 * Revoke on-chain delegation with source awareness
 */
export async function revokeOnChainWithSource(
  client: PublicClient,
  source: string,
  identifier: string,
  delegator: `0x${string}`,
  writeContractAsync: WriteContractAsync,
  tokenAddress?: `0x${string}`,
  chainId?: number
) {
  if (source === 'snapshot') {
    return revokeOnChain(client, identifier, delegator, writeContractAsync);
  } else if (source === 'tally') {
    // Extract the contract address from EIP-155 format (eip155:chainId:address)
    const tallyAddress = identifier.includes(':') ? identifier.split(':')[2] : identifier;
    // Extract chainId from identifier if not provided
    let resolvedChainId = chainId;
    if (!resolvedChainId && identifier.includes(':')) {
      const parts = identifier.split(':');
      resolvedChainId = parseInt(parts[1], 10);
    }
    return revokeTallyOnChain(
      client,
      tallyAddress as `0x${string}`,
      delegator,
      writeContractAsync,
      tokenAddress,
      resolvedChainId
    );
  }
  throw new Error(`Unknown source: ${source}`);
}
