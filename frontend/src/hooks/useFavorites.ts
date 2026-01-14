import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ============ FOOD FAVORITES ============

export function useFoodFavorites() {
  return useQuery({
    queryKey: ['food-favorites'],
    queryFn: async () => {
      const response = await api.get('/nutrition/favorites');
      return response.data;
    },
  });
}

export function useToggleFoodFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ foodId, isFavorite }: { foodId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await api.delete(`/nutrition/favorites/${foodId}`);
      } else {
        await api.post(`/nutrition/favorites/${foodId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-favorites'] });
      queryClient.invalidateQueries({ queryKey: ['supabase-foods'] });
    },
  });
}

// ============ SUPPLEMENT FAVORITES ============

export function useSupplementFavorites() {
  return useQuery({
    queryKey: ['supplement-favorites'],
    queryFn: async () => {
      const response = await api.get('/supplements/favorites');
      return response.data;
    },
  });
}

export function useToggleSupplementFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ supplementId, isFavorite }: { supplementId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await api.delete(`/supplements/favorites/${supplementId}`);
      } else {
        await api.post(`/supplements/favorites/${supplementId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-favorites'] });
    },
  });
}
