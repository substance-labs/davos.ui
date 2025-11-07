import { sepolia, arbitrum } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { RPC_URL } from './lib/constants';

export const config = getDefaultConfig({
  appName: 'Davos',
  projectId: 'baac4104fc8693f7b3fd30570968a04c',
  chains: [sepolia, arbitrum],
  transports: {
    [sepolia.id]: http(RPC_URL ?? undefined),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
  },
});
