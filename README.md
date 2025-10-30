# Davos UI - Decentralized Voting Agent System

A modern web application for managing DAO voting agents with support for Snapshot and Tally governance protocols.
Requires https://github.com/substance-labs/davos to work.

## 🚀 Features

- **Multi-Protocol Support**: Seamlessly interact with both Snapshot and Tally DAOs
- **Automated Voting Agents**: Deploy and manage AI-powered voting agents
- **Wallet Integration**: Support for multiple wallets via RainbowKit (MetaMask, Coinbase Wallet, WalletConnect, etc.)
- **Multi-Chain**: Support for Ethereum, Arbitrum, Optimism, Polygon, Base, Gnosis, and Sepolia
- **Real-time DAO Monitoring**: Track proposals, voting activity, and delegation status
- **AI-Powered Suggestions**: Get intelligent voting recommendations based on your preferences
- **Comprehensive Dashboard**: View all your DAOs and voting activity in one place

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6.2.3
- **Blockchain**: wagmi v2 + viem
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Web3 Wallet**: RainbowKit

## 📦 Installation

```bash
# Install dependencies
npm install
# or
pnpm install
```

## 🏃 Development

```bash
# Start development server
npm run dev
# or
pnpm run dev
```

The application will be available at `http://localhost:5173`

## 🔨 Build

```bash
# Type check and build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── app/                    # Application pages
│   ├── Dashboard/          # Main dashboard view
│   ├── Delegate/           # Voting agent delegation
│   ├── Digest/             # Proposal digests and summaries
│   ├── Explorer/           # DAO and proposal explorer
│   ├── Profile/            # User profile and ethos
│   └── Suggest/            # AI voting suggestions
├── components/             # Reusable UI components
│   └── ui/                 # shadcn/ui components
├── contexts/               # React contexts (Agents, Subscriptions)
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions and helpers
│   ├── ai-utils.ts         # AI/OpenAI integration
│   ├── dao-utils.ts        # DAO-related utilities
│   ├── snapshot-utils.ts   # Snapshot protocol integration
│   ├── tally-utils.ts      # Tally protocol integration
│   ├── wagmi.ts            # Web3 configuration
│   └── logger.ts           # Centralized logging
└── artifacts/              # Smart contract ABIs
```

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
# API Keys
VITE_OPENAI_API_KEY=your_openai_key
VITE_TALLY_API_KEY=your_tally_key

# Backend API
VITE_API_BASE_URL=your_backend_url

# Optional
VITE_TEST_ENV=false
```


## 📝 Key Components

### Voting Agent System
- **Agent Setup**: Deploy secure voting agents with KMS (Key Management System)
- **Delegation**: Automatic or manual token delegation
- **Agent Management**: Start, stop, and monitor agent activity

### DAO Integration
- **Snapshot**: Off-chain voting and proposal tracking
- **Tally**: On-chain governance with token delegation

### AI Features
- **Vote Suggestions**: AI-powered voting recommendations
- **Proposal Analysis**: Automatic proposal summaries and insights
- **Directive-Based Voting**: Set custom voting policies for your agents 


## 🤝 Contributing

This project follows clean code practices and TypeScript best practices. When contributing:

1. Ensure TypeScript compilation passes (`npm run build`)
2. Remove unused imports and variables
3. Use the centralized logger (`src/lib/logger.ts`) instead of console.log
4. Add proper type annotations
5. Follow existing code structure and patterns

---

**Built with ❤️ by Substance Labs**
````