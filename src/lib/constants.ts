// ============================================================================
// IMPORTS
// ============================================================================

import arbitrumLogo from "/arbitrum-arb-logo.svg"
import aaveLogo from "/aave-aave-logo.svg"
import gnosisLogo from "/gnosis-gno-gno-logo.svg"
import balancerLogo from "/balancer-bal-logo.svg"
import lidoLogo from "/lido-dao-ldo-logo.svg"
import uniswapLogo from "/uniswap-uni-logo.svg"
import polygonValidatorsLogo from "/polygon-validators-logo.svg"
import quickswapLogo from "/quickswap-logo.svg"
import qidaoLogo from "/qidao-logo.svg"

// ============================================================================
// ENVIRONMENT & API CONFIGURATION
// ============================================================================

const isTestEnvironment = import.meta.env.VITE_TEST_ENV === 'true';

export const DAVOS_API_ENDPOINT = isTestEnvironment 
  ? 'http://127.0.0.1:5001' 
  : import.meta.env.VITE_DAVOS_API_ENDPOINT || 'http://127.0.0.1:3000';

export const DAVOS_API_PROPOSAL_ENDPOINT = 
  import.meta.env.VITE_DAVOS_API_PROPOSAL_ENDPOINT || 'http://127.0.0.1:6000';

export const PROPOSAL_API_ENDPOINT = DAVOS_API_PROPOSAL_ENDPOINT;

// ============================================================================
// CONTRACT ADDRESSES
// ============================================================================

export const DELEGATE_CONTRACT_ADDRESS = 
  import.meta.env.VITE_DELEGATE_CONTRACT_ADDRESS || '0x7B31731F2D2a988B888C815953a472DF4C644752';

export const SNAPSHOT_DELEGATION_REGISTRY = 
  import.meta.env.VITE_SNAPSHOT_DELEGATION_REGISTRY || '0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446';

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ============================================================================
// EXTERNAL API ENDPOINTS
// ============================================================================

export const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';
export const TALLY_API_URL = 'https://api.tally.xyz/query';
export const TALLY_API_KEY = import.meta.env.VITE_TALLY_API_KEY || '';
export const RPC_URL = import.meta.env.VITE_RPC_URL;

// ============================================================================
// CACHE & TIMING CONFIGURATION
// ============================================================================

export const STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const GC_TIME = 24 * 60 * 60 * 1000; // 24 hours
export const PROPOSAL_FETCH_LIMIT_ALL = 1000; // Max proposals per Snapshot API

// ============================================================================
// CHAIN IDS
// ============================================================================

export const CHAIN_IDS = {
  ARBITRUM: 42161,
  ARBITRUM_SEPOLIA: 421614,
  ETHEREUM: 1,
  OPTIMISM: 10,
  POLYGON: 137,
  BASE: 8453,
  SEPOLIA: 11155111,
  GNOSIS: 100,
  DAO_TEST: 42069
} as const;

// ============================================================================
// AI DIRECTIVES
// ============================================================================

export const MONTHLY_REPORT_DIRECTIVE = 
  'Based on the following information, provide a concise summary (max 15 sentences) of the current state for non technical people and focus of the following DAO. Provide, if possible, a list of the most important topics that are being discussed in the DAO.';

export const GLOBAL_REPORT_DIRECTIVE = 
  'Based on the following information, provide a concise summary (max 30 sentences) of the current DAO for non technical people. What is it about, why was it created, when was it created? Provide a reason why the user would want to join this DAO.';

export const PROPROSAL_DIRECTIVE = 
  'Provide a concise summary (max 5 sentences) of the provided proposal. Include the most important points and a summary of the proposal. Provide a reason why the user would want to vote for or against this proposal.';

export const FILTERED_PROPOSAL_DIRECTIVE = 
  'Based on the following information, provide a concise summary (max 5 sentences) of the provided proposals. Include the most important points and a summary of the proposal. Give a point for each proposal.';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DaoConfigItem {
  name: string;
  logo: string;
  source: string;
  identifier: string;
  tokenAddress: `0x${string}`;
  chainId: number;
  totalMembers?: number;
  proposals?: number;
  votes?: number;
  subDaos?: Array<{
    name: string;
    identifier: string;
    source: string;
  }>;
}

type EthosOption = {
  title: string;
  description: string;
};

// ============================================================================
// DAO CONFIGURATION - TEST ENVIRONMENT
// ============================================================================

const testDaoConfig: Record<string, DaoConfigItem> = {
  dao_test: { 
    name: 'DAO_test',
    logo: uniswapLogo,
    source: 'snapshot',
    identifier: 'daotest.eth',
    tokenAddress: '0xdeadb33fc0ff3300000000001111111111222222',
    chainId: CHAIN_IDS.DAO_TEST,
    totalMembers: 184598,
    proposals: 364,
    votes: 5.6,
  }
};

// ============================================================================
// DAO CONFIGURATION - PRODUCTION
// ============================================================================

const productionDaoConfig: Record<string, DaoConfigItem> = {
  aave: { 
    name: 'Aave',
    logo: aaveLogo,
    source: 'snapshot',
    identifier: 'aavedao.eth',
    tokenAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    chainId: CHAIN_IDS.ETHEREUM,
  },
  arbitrum: { 
    name: 'Arbitrum',
    logo: arbitrumLogo,
    source: 'snapshot', 
    identifier: 'arbitrumfoundation.eth',
    tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    chainId: CHAIN_IDS.ARBITRUM,
  },
  balancer: { 
    name: 'Balancer',
    logo: balancerLogo,
    source: 'snapshot', 
    identifier: 'balancer.eth',
    tokenAddress: '0xba100000625a3754423978a60c9317c58a424e3D',
    chainId: CHAIN_IDS.ETHEREUM,
  },
  gnosis: { 
    name: 'Gnosis',
    logo: gnosisLogo,
    source: 'snapshot', 
    identifier: 'gnosis.eth',
    tokenAddress: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    chainId: CHAIN_IDS.GNOSIS,
  },
  lido: { 
    name: 'Lido',
    logo: lidoLogo,
    source: 'snapshot', 
    identifier: 'lido-snapshot.eth',
    tokenAddress: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    chainId: CHAIN_IDS.ETHEREUM,
  },
  uniswap: { 
    name: 'Uniswap',
    logo: uniswapLogo,
    source: 'snapshot', 
    identifier: 'uniswapgovernance.eth',
    tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    chainId: CHAIN_IDS.ETHEREUM,
  },
  uniswap_governor: {
    name: 'Uniswap Governor',
    logo: uniswapLogo,
    source: 'tally',
    identifier: 'eip155:1:0x408ED6354d4973f66138C91495F2f2FCbd8724C3',
    tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    chainId: CHAIN_IDS.ETHEREUM,
  },
  arbitrum_governor: {
    name: 'Arbitrum',
    logo: arbitrumLogo,
    source: 'tally',
    identifier: 'eip155:42161:0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9',
    tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    chainId: CHAIN_IDS.ARBITRUM,
    subDaos: [
      {
        name: 'Arbitrum Core',
        identifier: 'eip155:42161:0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9',
        source: 'tally',
      },
      {
        name: 'Arbitrum Treasury',
        identifier: 'eip155:42161:0x789fC99093B09aD01C34DC7251D0C89ce743e5a4',
        source: 'tally',
      },
    ],
  },
  polygon_validators: {
    name: 'Polygon Validators',
    logo: polygonValidatorsLogo,
    source: 'snapshot',
    identifier: 'polygonvalidators.eth',
    tokenAddress: '0x817528c9D287589a1C93E46728Dd1bC218308afb',
    chainId: CHAIN_IDS.POLYGON,
  },
  quickswap: {
    name: 'QuickSwap',
    logo: quickswapLogo,
    source: 'snapshot',
    identifier: 'quickvote.eth',
    tokenAddress: '0x7c87a471abd9bf56d41c752ab7c1b5de91d8dda6',
    chainId: CHAIN_IDS.POLYGON,
  },
  qidao: {
    name: 'Qi Dao',
    logo: qidaoLogo,
    source: 'snapshot',
    identifier: 'qidao.eth',
    tokenAddress: '0x1BFFaBc6dFcAfB4177046db6686e3F135E8Bc732',
    chainId: CHAIN_IDS.ETHEREUM,
  },
};

// Export the appropriate configuration based on environment
export const daoConfig = isTestEnvironment ? testDaoConfig : productionDaoConfig;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get DAO configuration by identifier
 * @param identifier The space identifier (e.g., 'aave.eth')
 * @returns The matching DaoConfigItem or undefined if not found
 */
export function getDaoByIdentifier(identifier: string): DaoConfigItem | undefined {
  return Object.values(daoConfig).find(dao => dao.identifier === identifier);
}

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

export const SPACE_QUERY = `
  query Space($id: String!) {
    space(id: $id) {
      id
      name
      about
      network
      symbol
      members
      admins
      strategies {
        name
      }
      proposalsCount
      votesCount
      followersCount
    }
  }
`;

export const PROPOSALS_QUERY = `
  query Proposals($space: String!, $limit: Int) {
    proposals(
      first: $limit,
      skip: 0,
      where: {
        space: $space,
        flagged: false
      },
      orderBy: "created",
      orderDirection: desc
    ) {
      id
      title
      body
      choices
      start
      end
      snapshot
      state
      author
      scores
      scores_total
      votes
    }
  }
`;

// ============================================================================
// ETHOS OPTIONS
// ============================================================================

export const ethosOptions: EthosOption[] = [
  {
    title: "The Pragmatic Reformer",
    description: "I value practical, incremental improvements that make the DAO more effective, transparent, and sustainable. I support proposals that are well-scoped, actionable, and grounded in reality, even if they aren't the most exciting. I'm skeptical of hype and prefer ideas that deliver real utility and long-term value. I care about getting things done and making steady progress over time.",
  },
  {
    title: "The Decentralization Maximalist",
    description: "I strongly believe in decentralization, transparency, and distributed power. I support proposals that empower token holders, minimize reliance on centralized actors, and protect open participation. I'm opposed to anything that concentrates control, limits access, or compromises the values that make DAOs meaningful. I prioritize integrity over convenience.",
  },
  {
    title: "The Impact-Driven Idealist",
    description: "I care about using governance to advance ethical, social, or environmental goals. I support initiatives that create positive externalities, increase inclusivity, or align with broader missions beyond profit. I'm comfortable making long-term investments in change, even if they don't have immediate returns. Purpose and impact matter more to me than short-term gains.",
  },
  {
    title: "The Ecosystem Optimizer",
    description: "I look at proposals through the lens of broader network health. I support ideas that strengthen infrastructure, tooling, security, or composability. I care about building things that other DAOs, protocols, or contributors can benefit from. I want to see our ecosystem become more connected, reliable, and resilient over time.",
  },
  {
    title: "The Risk-Tolerant Innovator",
    description: "I'm drawn to bold, unconventional ideas — even if they might fail. I support proposals that test boundaries, explore new models, or introduce ambitious upgrades. I see experimentation as essential to progress and I'm willing to accept uncertainty if the upside is transformative. I believe governance should enable rapid iteration and breakthrough innovation.",
  },
  {
    title: "The Minimalist Voter",
    description: "I prefer to keep things simple and focused. I'm only interested in voting when a proposal clearly aligns with or challenges my core principles. I avoid unnecessary complexity and tend to skip proposals that feel marginal or low impact. I value clarity, relevance, and low noise in governance.",
  },
  {
    title: "The Community First Advocate",
    description: "I prioritize the needs and voices of the active community. I support proposals that broaden participation, reward contributors fairly, and reduce gatekeeping. I believe that DAOs should be driven by those who are most involved and care most deeply. I trust grassroots energy over top-down direction.",
  },
  {
    title: "The Treasury Hawk",
    description: "I pay close attention to spending and financial sustainability. I support proposals with clear deliverables, reasonable budgets, and transparent accountability. I oppose anything that feels vague, overfunded, or misaligned with long-term ROI. I believe treasury decisions should be disciplined and based on results.",
  },
  {
    title: "The Rational Evaluator",
    description: "I approach governance with a focus on reason, consistency, and fairness. I evaluate each proposal on its own merits, with clear criteria and attention to detail. I avoid emotional or ideological voting and look for sound logic, evidence, and alignment with good process. I believe clear thinking leads to better outcomes.",
  },
  {
    title: "The Passive Protector",
    description: "I don't want to be involved in every vote, but I care about guarding against harmful decisions. I support proposals that maintain basic safeguards, protect against centralization, and defend core values. I generally prefer to abstain unless something directly challenges my principles. I want governance that stays aligned without constant oversight.",
  },
];