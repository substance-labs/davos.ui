import { http, createConfig } from 'wagmi'
import { 
  mainnet, 
  arbitrum, 
  optimism, 
  polygon,
  base,
  sepolia,
  gnosis
} from 'wagmi/chains'

// Create transports for each chain
const transports = {
  [mainnet.id]: http(),
  [arbitrum.id]: http(),
  [optimism.id]: http(),
  [polygon.id]: http(),
  [base.id]: http(),
  [sepolia.id]: http(),
  [gnosis.id]: http()
}

export const config = createConfig({
  chains: [mainnet, arbitrum, optimism, polygon, base, sepolia, gnosis],
  transports
})