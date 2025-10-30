// ============================================================================
// IMPORTS
// ============================================================================

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DAVOS_API_ENDPOINT, SNAPSHOT_DELEGATION_REGISTRY, ZERO_ADDRESS } from "./constants";
import { HDKey, hdKeyToAccount } from 'viem/accounts';
import { toHex, hexToBytes, Address, keccak256, stringToBytes } from "viem";
import { readContract } from "wagmi/actions";
import { config } from "./wagmi";
import SnapshotDelegationRegistryABI from "@/artifacts/SnapshotDelegationRegistry.json";
import type { PublicClient } from 'viem';
import { logger } from "./logger";

// ============================================================================
// ENVIRONMENT HELPERS
// ============================================================================

const isTestMode = () => (import.meta as any).env?.VITE_TEST_ENV === 'true';

// ============================================================================
// UI UTILITIES
// ============================================================================

/**
 * Combines class names with Tailwind merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  return `0x${Array.from({length: 40}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;
}

/**
 * Generates a random transaction hash for testing
 */
function generateMockTxHash(): string {
  return `0x${Array.from({length: 64}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;
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
    logger.testMode(`Mocking agent address prediction for user: ${userAddress}, space: ${spaceId}, source: ${source}`);
    return generateMockAddress();
  }

  try {
    const response = await fetch(`${DAVOS_API_ENDPOINT}/init-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
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
      throw new Error(data.error || "Failed to predict agent address");
    }

    return data.predictedAgentAddress || "";
  } catch (error) {
    logger.error("Error predicting agent address:", error);
    throw error;
  }
}

/**
 * Deploys the KMS adapter for a specific voter address
 */
export async function deployKMS(
  userAddress: Address, 
  source: string = 'snapshot'
): Promise<any> {
  logger.debug("deployKMS called with test mode:", isTestMode(), "endpoint:", DAVOS_API_ENDPOINT);
  
  if (isTestMode()) {
    logger.testMode(`Mocking KMS deployment for user: ${userAddress}, source: ${source}`);
    return {
      kmsAddress: generateMockAddress(),
      success: true
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
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    logger.debug("KMS API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("KMS API error response:", errorText);
      throw new Error(`Failed to deploy KMS adapter: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("KMS API success response:", data);
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
): Promise<any> {
  if (isTestMode()) {
    console.log(`[TEST MODE] Mocking agent creation for user: ${userAddress}, space: ${spaceId}, source: ${source}`);
    return {
      id: `test-agent-${Date.now()}`,
      existingAgent: false,
      success: true
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
): Promise<any> {
  if (isTestMode()) {
    console.log(`[TEST MODE] Mocking agent enable for space: ${spaceId}, agent: ${agentId}`);
    return {
      id: `test-agent-${Date.now()}`,
      spaceId,
      agentId,
      status: 'active',
      createdAt: new Date().toISOString(),
      existingAgent: existing
    };
  }

  try {
    const response = await fetch(`${DAVOS_API_ENDPOINT}/spaces/${spaceId}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ agentId })
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
): Promise<any> {
  if (isTestMode()) {
    console.log(`[TEST MODE] Mocking agent stop for space: ${spaceId}, user: ${userAddress}, source: ${source}`);
    return { success: true, message: 'Agent stopped successfully' };
  }

  try {
    const response = await fetch(`${DAVOS_API_ENDPOINT}/spaces/${spaceId}/users/${userAddress}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ source })
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
    addressIndex: index
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
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment - simulate no delegation
    console.log(`[TEST MODE] Mocking delegation status check for user: ${user}, space: ${spaceId}`);
    return { exists: false, target: null };
  }

  const id = keccak256(stringToBytes(spaceId));
  const delegatee = (await readContract(config, {
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: "delegation",
    args: [user, id],
  })) as `0x${string}`;
  const exists = delegatee.toLowerCase() !== ZERO_ADDRESS;
  return { exists, target: exists ? delegatee : null };
}

/**
 * Verify on‐chain that `delegator` really delegated to `expected`.
 */
export const verifyBlockchainDelegation = async (
  spaceId: string,
  delegator: `0x${string}`,
  expected: `0x${string}` | null
): Promise<boolean> => {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment - simulate successful verification
    console.log(`[TEST MODE] Mocking blockchain delegation verification for delegator: ${delegator}, space: ${spaceId}`);
    return true;
  }

  const id = keccak256(stringToBytes(spaceId));
  const actual = (await readContract(config, {
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: "delegation",
    args: [delegator, id],
  })) as `0x${string}`;
  const want = expected?.toLowerCase() ?? ZERO_ADDRESS;
  return actual.toLowerCase() === want;
};

/**
 * Set on‐chain delegation to `delegatee.` (legacy)
 */
export async function delegateOnChainLegacy(
  client: PublicClient,
  spaceId: string,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: any // Pass the writeContractAsync function
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    console.log(`[TEST MODE] Mocking on-chain delegation for space: ${spaceId}, delegator: ${delegator}, delegatee: ${delegatee}`);
    return { hash: generateMockTxHash() };
  }

  const id = keccak256(stringToBytes(spaceId));

  try {
    const currentDelegate = (await client.readContract({
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: "delegation",
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

  try {
    gas = await client.estimateContractGas({
      account: delegator,
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: "setDelegate",
      args: [id, delegatee],
    });
  } catch (gasError) {
    console.warn('[Delegation] Unable to estimate gas for Snapshot delegation:', gasError);
  }

  try {
    const fees = await client.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas;
    maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
  } catch (feesError) {
    console.warn('[Delegation] Unable to estimate fees for Snapshot delegation:', feesError);
  }

  const txHash = await writeContractAsync({
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: "setDelegate",
    args: [id, delegatee],
    account: delegator,
    gas: gas ? (gas * 120n) / 100n : undefined,
    maxFeePerGas,
    maxPriorityFeePerGas,
    chainId: client.chain?.id,
  });

  try {
    await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch (receiptError) {
    console.warn('[Delegation] Unable to confirm legacy delegation receipt:', receiptError);
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
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment - simulate no delegation
    console.log(`[TEST MODE] Mocking Tally delegation status check for user: ${user}, governor: ${governorAddress}`);
    return { exists: false, target: null };
  }

  try {
    // For Tally governors, check token delegation if token address is provided
    const addressToCheck = tokenAddress || governorAddress;
    const abi = tokenAddress ? ERC20VOTES_ABI : TALLY_GOVERNOR_ABI;
    
    console.log(`[Delegation] Checking Tally delegation on ${tokenAddress ? 'token' : 'governor'}: ${addressToCheck}`);
    
    const delegatee = (await readContract(config, {
      address: addressToCheck,
      abi: abi,
      functionName: 'delegates',
      args: [user],
      chainId: chainId as any,
    })) as `0x${string}`;

    const exists = delegatee.toLowerCase() !== ZERO_ADDRESS;
    console.log(`[Delegation] Current delegatee: ${delegatee}, exists: ${exists}`);
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
    console.log(`[TEST MODE] Mocking Snapshot delegation status check for user: ${user}, space: ${spaceId}`);
    return { exists: false, target: null };
  }

  try {
    const id = keccak256(stringToBytes(spaceId));
    const delegatee = (await readContract(config, {
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: "delegation",
      args: [user, id],
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
    const tallyAddress = identifier.includes(':') 
      ? identifier.split(':')[2] 
      : identifier;
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
  writeContractAsync: any,
  chainId?: number
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.log(`[TEST MODE] Mocking token voting power delegation for token: ${tokenAddress}, delegator: ${delegator}, delegatee: ${delegatee}`);
    return { hash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}` };
  }

  try {
    console.log(`[Delegation] Delegating token voting power on ${tokenAddress} from ${delegator} to ${delegatee}`);
    console.log(`[Delegation] Using account: ${delegator}`);
    console.log(`[Delegation] Target chain ID: ${chainId}`);
    
    // Check if already delegated to target
    try {
      const currentDelegate = (await readContract(config, {
        address: tokenAddress,
        abi: ERC20VOTES_ABI,
        functionName: 'delegates',
        args: [delegator],
        chainId: chainId as any,
      })) as `0x${string}`;

      if (currentDelegate?.toLowerCase() === delegatee.toLowerCase()) {
        return { hash: null, alreadyDelegated: true };
      }
      console.log(`[Delegation] Current delegate: ${currentDelegate}, changing to: ${delegatee}`);
    } catch (readError) {
      console.warn('[Delegation] Unable to check current token delegate:', readError);
    }
    
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: ERC20VOTES_ABI,
      functionName: 'delegate',
      args: [delegatee],
      account: delegator,
      chainId: chainId,
      // Let wagmi handle gas estimation for token delegation
      // Gas estimation is less critical here as token.delegate() is simpler than registry operations
    });
    console.log(`[Delegation] Token delegation hash: ${hash}`);
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
  writeContractAsync: any,
  tokenAddress?: `0x${string}`,
  chainId?: number
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.log(`[TEST MODE] Mocking Tally on-chain delegation for governor: ${governorAddress}, delegator: ${delegator}, delegatee: ${delegatee}`);
    return { hash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}` };
  }

  try {
    // For Tally Governors, voting power comes from the token delegation
    // The Governor reads voting power from the underlying token (e.g., ARB)
    // So we ONLY need to delegate the token voting power, not call delegate on the Governor
    
    if (tokenAddress) {
      console.log(`[Delegation] Delegating voting power on token ${tokenAddress} (Governor uses token voting power)`);
      const tokenTx = await delegateTokenVotingPower(tokenAddress, delegator, delegatee, writeContractAsync, chainId);
      console.log(`[Delegation] Token delegation submitted with hash: ${tokenTx.hash}`);
      console.log(`[Delegation] Waiting for token delegation to be confirmed...`);
      
      if (tokenTx.hash) {
        try {
          const receipt = await client.waitForTransactionReceipt({ 
            hash: tokenTx.hash as `0x${string}`,
          });
          console.log(`[Delegation] Token delegation confirmed! Receipt:`, receipt);
        } catch (waitError) {
          console.warn(`[Delegation] Could not wait for token delegation confirmation, proceeding anyway:`, waitError);
        }
      }
      return tokenTx;
    }
    
    throw new Error("Token address is required for Tally Governor delegation");
  } catch (error) {
    console.error(`[Delegation] Error delegating on Tally Governor:`, error);
    throw error;
  }
}

/**
 * Delegate on Snapshot registry (extracted for consistency)
 */
export async function delegateSnapshotOnChain(
  client: PublicClient,
  spaceId: string,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: any,
  chainId?: number
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.log(`[TEST MODE] Mocking Snapshot on-chain delegation for space: ${spaceId}, delegator: ${delegator}, delegatee: ${delegatee}`);
    return { hash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}` };
  }

  const id = keccak256(stringToBytes(spaceId));

  try {
    const currentDelegate = (await client.readContract({
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: "delegation",
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

  try {
    gas = await client.estimateContractGas({
      account: delegator,
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: "setDelegate",
      args: [id, delegatee],
    });
  } catch (gasError) {
    console.warn('[Delegation] Unable to estimate gas for Snapshot delegation:', gasError);
  }

  try {
    const fees = await client.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas;
    maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
  } catch (feesError) {
    console.warn('[Delegation] Unable to estimate fees for Snapshot delegation:', feesError);
  }

  const txHash = await writeContractAsync({
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: "setDelegate",
    args: [id, delegatee],
    account: delegator,
    gas: gas ? (gas * 120n) / 100n : undefined,
    maxFeePerGas,
    maxPriorityFeePerGas,
    chainId: chainId ?? client.chain?.id,
  });

  try {
    await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch (receiptError) {
    console.warn('[Delegation] Unable to confirm Snapshot delegation receipt:', receiptError);
  }

  return { hash: txHash };
}

/**
 * Enhanced delegateOnChain with source routing
 */
export async function delegateOnChainWithSource(
  client: PublicClient,
  source: string,
  identifier: string,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: any,
  tokenAddress?: `0x${string}`,
  chainId?: number
) {
  if (source === 'snapshot') {
  return delegateSnapshotOnChain(client, identifier, delegator, delegatee, writeContractAsync, chainId);
  } else if (source === 'tally') {
    // Extract the contract address from EIP-155 format (eip155:chainId:address)
    const tallyAddress = identifier.includes(':') 
      ? identifier.split(':')[2] 
      : identifier;
    // Extract chainId from identifier if not provided
    let resolvedChainId = chainId;
    if (!resolvedChainId && identifier.includes(':')) {
      const parts = identifier.split(':');
      resolvedChainId = parseInt(parts[1], 10);
    }
    return delegateTallyOnChain(client, tallyAddress as `0x${string}`, delegator, delegatee, writeContractAsync, tokenAddress, resolvedChainId);
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Clear on‐chain delegation.
 */
export async function revokeOnChain(
  client: PublicClient,
  spaceId: string,
  delegator: `0x${string}`,
  writeContractAsync: any // Pass the writeContractAsync function
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.log(`[TEST MODE] Mocking on-chain delegation revocation for space: ${spaceId}, delegator: ${delegator}`);
    return { hash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}` };
  }

  const id = keccak256(stringToBytes(spaceId));

  let gas: bigint | undefined;
  let maxFeePerGas: bigint | undefined;
  let maxPriorityFeePerGas: bigint | undefined;

  try {
    gas = await client.estimateContractGas({
      account: delegator,
      address: SNAPSHOT_DELEGATION_REGISTRY,
      abi: SnapshotDelegationRegistryABI,
      functionName: "clearDelegate",
      args: [id],
    });
  } catch (gasError) {
    console.warn('[Delegation] Unable to estimate gas for Snapshot revocation:', gasError);
  }

  try {
    const fees = await client.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas;
    maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
  } catch (feesError) {
    console.warn('[Delegation] Unable to estimate fees for Snapshot revocation:', feesError);
  }

  const txHash = await writeContractAsync({
    address: SNAPSHOT_DELEGATION_REGISTRY,
    abi: SnapshotDelegationRegistryABI,
    functionName: "clearDelegate",
    args: [id],
    account: delegator,
    gas: gas ? (gas * 120n) / 100n : undefined,
    maxFeePerGas,
    maxPriorityFeePerGas,
    chainId: client.chain?.id,
  });

  try {
    await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch (receiptError) {
    console.warn('[Delegation] Unable to confirm Snapshot revocation receipt:', receiptError);
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
  writeContractAsync: any,
  tokenAddress?: `0x${string}`,
  chainId?: number
) {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode = (import.meta as any).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.log(`[TEST MODE] Mocking Tally on-chain delegation revocation for governor: ${governorAddress}, delegator: ${delegator}`);
    return { hash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}` };
  }

  try {
    // For Tally, revoke token delegation by delegating to self
    if (tokenAddress) {
      console.log(`[Revocation] Revoking voting power on token ${tokenAddress} (delegate to self)`);
      const tokenTx = await delegateTokenVotingPower(tokenAddress, delegator, delegator, writeContractAsync, chainId);
      console.log(`[Revocation] Token delegation revoked with hash: ${tokenTx.hash}`);
      
      if (tokenTx.hash) {
        try {
          const receipt = await client.waitForTransactionReceipt({ 
            hash: tokenTx.hash as `0x${string}`,
          });
          console.log(`[Revocation] Token revocation confirmed! Receipt:`, receipt);
        } catch (waitError) {
          console.warn(`[Revocation] Could not wait for token revocation confirmation, proceeding anyway:`, waitError);
        }
      }
      return tokenTx;
    }
    
    throw new Error("Token address is required for Tally Governor revocation");
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
  writeContractAsync: any,
  tokenAddress?: `0x${string}`,
  chainId?: number
) {
  if (source === 'snapshot') {
    return revokeOnChain(client, identifier, delegator, writeContractAsync);
  } else if (source === 'tally') {
    // Extract the contract address from EIP-155 format (eip155:chainId:address)
    const tallyAddress = identifier.includes(':') 
      ? identifier.split(':')[2] 
      : identifier;
    // Extract chainId from identifier if not provided
    let resolvedChainId = chainId;
    if (!resolvedChainId && identifier.includes(':')) {
      const parts = identifier.split(':');
      resolvedChainId = parseInt(parts[1], 10);
    }
    return revokeTallyOnChain(client, tallyAddress as `0x${string}`, delegator, writeContractAsync, tokenAddress, resolvedChainId);
  }
  throw new Error(`Unknown source: ${source}`);
}