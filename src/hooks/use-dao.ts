import { GC_TIME, STALE_TIME } from "@/lib/constants";
import { fetchDaoInfo, fetchProposals } from "@/lib/dao-utils";
import { fetchAllProposals, fetchGraphQL } from "@/lib/snapshot-utils";
import { useQuery, useQueries } from "@tanstack/react-query";

/**
 * Hook to fetch all proposals and store them in cache
 */
export function useAllProposals(space: string, limit: number = 300, options = {}) {
  return useQuery({
    queryKey: ['allProposals', space, limit],
    queryFn: () => fetchAllProposals(space, limit),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options
  });
}

/**
 * Hook for using GraphQL with React Query
 */
export function useGraphQL(query: string, variables: Record<string, any> = {}, options = {}) {
  return useQuery({
    queryKey: ['graphql', query, variables],
    queryFn: () => fetchGraphQL(query, variables),
    staleTime: STALE_TIME,
    ...options
  });
}

/**
 * Enhanced hook for fetching DAO info with source routing
 */
export function useDaoInfo(
  source: string = 'snapshot',
  identifier: string = 'aave.eth',
  options = {}
) {
  return useQuery({
    queryKey: ['daoInfo', source, identifier],
    queryFn: () => fetchDaoInfo(source, identifier),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Enhanced hook for fetching proposals with source routing
 */
export function useProposals(
  source: string,
  identifier: string,
  limit: number = 300,
  subDaos?: Array<{ name: string; identifier: string; source: string }>,
  options = {}
) {
  return useQuery({
    queryKey: ['proposals', source, identifier, limit, subDaos],
    queryFn: () => fetchProposals(source, identifier, limit, subDaos),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Hook for fetching DAO info with React Query (legacy)
 */
export function useDaoInfoLegacy(source: string = 'snapshot', identifier: string = 'aave.eth', options = {}) {
  return useQuery({
    queryKey: ['daoInfo', source, identifier],
    queryFn: () => fetchDaoInfo(source, identifier),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options
  });
}

/**
 * Enhanced hook for fetching multiple DAOs with source support
 */
export function useMultipleDaos(daos: Array<{ source?: string; identifier: string }>, options = {}) {
  // Create an array of queries for React Query
  const daoQueries = daos.map(dao => ({
    queryKey: ['daoInfo', dao.source || 'snapshot', dao.identifier],
    queryFn: () => fetchDaoInfo(dao.source || 'snapshot', dao.identifier),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  }));
  
  // Use the useQueries hook to execute all in parallel
  const results = useQueries({
    queries: daoQueries,
  });
  
  // Process the results
  const isLoading = results.some((result: any) => result.isLoading);
  const isError = results.some((result: any) => result.isError);
  const error = results.find((result: any) => result.error)?.error;
  
  // Transform the results into the same format as the original function
  const data = daos.reduce((acc, dao, index) => {
    const result = results[index];
    acc[dao.identifier] = result.data || null;
    return acc;
  }, {} as Record<string, any>);
  
  return { data, isLoading, isError, error };
}

/**
 * Hook for fetching multiple DAOs with React Query (legacy)
 */
export function useMultipleDaosLegacy(daos: Array<{ source?: string, identifier: string }>, options = {}) {
  // Create an array of queries for React Query
  const daoQueries = daos.map(dao => ({
    queryKey: ['daoInfo', dao.source, dao.identifier],
    queryFn: () => fetchDaoInfo(dao.source, dao.identifier),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  }));
  
  // Use the useQueries hook to execute all in parallel
  const results = useQueries({
    queries: daoQueries,
  });
  
  // Process the results
  const isLoading = results.some(result => result.isLoading);
  const isError = results.some(result => result.isError);
  const error = results.find(result => result.error)?.error;
  
  // Transform the results into the same format as the original function
  const data = daos.reduce((acc, dao, index) => {
    const result = results[index];
    acc[dao.identifier] = result.data || null;
    return acc;
  }, {} as Record<string, any>);
  
  return { data, isLoading, isError, error };
}