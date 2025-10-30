export type DigestPeriod = "overview" | "monthly" | "proposals";

export interface DigestItem {
  id: string;
  title: string;
  description: string;
  date: string;
  source: string;
  sourceIcon?: string;
  url: string;
  category: string;
}

export interface DaoDigestSummary {
  daoId: string;
  name: string;
  logo: string;
  summary: string;
  activeProposals: number;
  closedProposals: number;
  totalVotes: number;
  proposals: {
    id: string;
    title: string;
    state: string;
    result?: string;
    votes: number;
  }[];
  isLoading: boolean;
}

export type FilterOption = string | null;

export interface DigestFilters {
  dao: FilterOption;
  category: FilterOption;
  searchTerm: string;
}

export interface WeeklyProposalSummary {
  id: string;
  title: string;
  daoId: string;
  daoName: string;
  daoLogo: string;
  state: string;
  date: string; // ISO string for the end date
  votes: number;
  result?: string;
  body?: string; // Original proposal body
  summary?: string; // AI-generated summary
  isLoadingSummary?: boolean;
}

export interface WeeklyFilters extends DigestFilters {
  date: string | null; // ISO date string for filtering by date
  status: string | null; // "active", "passed", "failed", etc.
}