import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOpenAIResponse } from '@/lib/ai-utils';

/**
 * Generate a stable cache key from directive and proposal
 */
function generateAICacheKey(directive: string, proposal: string): string {
  // Create a simple hash to use as cache key part
  const hash = `${directive} + ${proposal}`.slice(0, 10);
  return `ai-response-${hash}`;
}

/**
 * React Query hook for fetching OpenAI responses with caching
 */
export function useAI(
  directive: string,
  proposal: string,
  dao: string,
  options = {}
) {
  // Generate a stable cache key
  const queryKey = ['openai-response', `${directive} + ${dao}`];
  
  return useQuery({
    queryKey,
    queryFn: () => fetchOpenAIResponse(directive, proposal),
    // Default stale time of 1 hour - AI responses don't change often
    staleTime: 10 * 60 * 1000,
    // Keep in cache for 24 hours
    gcTime: 24 * 60 * 60 * 1000,
    // Don't refetch on window focus since AI responses are static
    refetchOnWindowFocus: false,
    // Enable by default, but can be overridden
    enabled: directive.length > 0 && proposal.length > 0,
    ...options
  });
}
  
/**
 * React Query mutation hook for fetching OpenAI responses with optimistic updates
 * Useful when you want to update the UI immediately with a temporary value
 * while waiting for the real response
 */
export function useAIMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      directive, 
      proposal,
    }: { 
      directive: string; 
      proposal: string; 
      optimisticResponse?: string;
    }) => {
      return fetchOpenAIResponse(directive, proposal);
    },
    
    onMutate: async ({ directive, proposal, optimisticResponse: _optimisticResponse }) => {
      const queryKey = ['openai-response', generateAICacheKey(directive, proposal)];
      
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousResponse = queryClient.getQueryData(queryKey);
      
      // Optimistically update to the new value
      if (_optimisticResponse) {
        queryClient.setQueryData(queryKey, _optimisticResponse);
      }
      
      // Return context object with the snapshot
      return { previousResponse, queryKey };
    },
    
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousResponse);
      }
    },
    
    onSettled: (_data, _error, { directive, proposal }) => {
      const queryKey = ['openai-response', generateAICacheKey(directive, proposal)];
      
      // Always refetch after error or success to make sure our cached data is correct
      queryClient.invalidateQueries({ queryKey });
    },
    
    onSuccess: (data, { directive, proposal }) => {
      const queryKey = ['openai-response', generateAICacheKey(directive, proposal)];
      
      // Update the cache with the final result
      queryClient.setQueryData(queryKey, data);
    }
  });
}

/**
 * Hook for bulk processing multiple proposals
 * Returns both individual responses and a combined response
 */
export function useMultipleOpenAIResponses(
  directive: string,
  proposals: string[],
  options = {}
) {
  const queryClient = useQueryClient();
  
  // Create a stable key for the combined result
  const combinedKey = proposals.map(p => generateAICacheKey(directive, p)).join('-');
  
  // Query for multiple individual responses
  const individualQueries = useQuery({
    queryKey: ['openai-responses-multiple', combinedKey],
    queryFn: async () => {
      const results = await Promise.all(
        proposals.map(proposal => {
          const queryKey = ['openai-response', generateAICacheKey(directive, proposal)];
          
          // Try to get from cache first
          const cached = queryClient.getQueryData<string>(queryKey);
          if (cached) return cached;
          
          // Fetch if not in cache
          return fetchOpenAIResponse(directive, proposal);
        })
      );
      
      // Store individual responses in cache
      proposals.forEach((proposal, index) => {
        const queryKey = ['openai-response', generateAICacheKey(directive, proposal)];
        queryClient.setQueryData(queryKey, results[index]);
      });
      
      return results;
    },
    // Same default options as individual queries
    staleTime: 10 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: directive.length > 0 && proposals.length > 0,
    ...options
  });
  
  return individualQueries;
}