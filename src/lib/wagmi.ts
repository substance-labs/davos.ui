import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, arbitrum, optimism, polygon, base, sepolia, gnosis } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Davos',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, arbitrum, optimism, polygon, base, sepolia, gnosis],
  ssr: false,
});
