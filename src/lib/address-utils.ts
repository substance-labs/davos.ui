import { 
  uniqueNamesGenerator, 
  Config, 
  adjectives, 
  colors, 
  animals 
} from 'unique-names-generator';
import { useEnsName } from 'wagmi';

// Configure the name generator
const nameConfig: Config = {
  dictionaries: [adjectives, colors, animals],
  separator: ' ',
  length: 2,
  style: 'capital'
};

/**
 * Generate a consistent readable name from an Ethereum address
 * @param address The Ethereum address
 * @returns A consistent human-readable name
 */
export function getAddressName(address: string): string {
  if (!address) return 'Unknown';
  
  // Use the address as a seed for the name generator
  // This ensures the same address always gets the same name
  const customConfig: Config = {
    ...nameConfig,
    seed: address.toLowerCase()
  };
  
  return uniqueNamesGenerator(customConfig);
}

/**
 * Shorten an Ethereum address for display
 * @param address The Ethereum address
 * @returns A shortened address (e.g., 0x1234...5678)
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Hook that provides a display name for an address
 * Attempts ENS resolution first, then falls back to a readable generated name
 */
export function useAddressDisplay(address: string | undefined) {
  const { data: ensName, isLoading } = useEnsName({ 
    address: address as `0x${string}`
  });
  
  // Generate a consistent name from the address if no ENS is available
  const generatedName = address ? getAddressName(address) : '';
  const shortAddress = address ? shortenAddress(address) : '';
  
  return {
    displayName: ensName || generatedName,
    shortAddress,
    isLoading,
    isEns: !!ensName
  };
}