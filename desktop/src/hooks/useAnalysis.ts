import { useQuery } from '@tanstack/react-query';
import { getAnalysis, getHistory } from '../services/api';

export function useAnalysisResult(id: string | null) {
  return useQuery({
    queryKey: ['analysis', id],
    queryFn: () => getAnalysis(id!),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'completed' || query.state.data?.status === 'failed'
        ? false
        : 3000,
  });
}

export function useHistory(page = 1) {
  return useQuery({
    queryKey: ['history', page],
    queryFn: () => getHistory(page),
  });
}
