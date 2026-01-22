/**
 * MIGRATED: All hooks now use the backend API instead of Supabase directly.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

// Helper para obtener el user_id
function useUserId() {
  const { user } = useAuthStore();
  return user?.id;
}

// ============ FOOD FAVORITES ============

export function useFoodFavorites() {
  const userId = useUserId();

  return useQuery({
    queryKey: ['food-favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        const response = await api.get('/nutrition/favorites/foods');
        return response.data?.map((fav: { food_id: string }) => fav.food_id) || [];
      } catch {
        return [];
      }
    },
    enabled: !!userId,
  });
}

export function useToggleFoodFavorite() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ foodId, isFavorite }: { foodId: string; isFavorite: boolean }) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      if (isFavorite) {
        // Remove from favorites
        await api.delete(`/nutrition/favorites/foods/${foodId}`);
      } else {
        // Add to favorites
        await api.post(`/nutrition/favorites/foods/${foodId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-favorites', userId] });
    },
  });
}

// ============ SUPPLEMENT FAVORITES ============

export function useSupplementFavorites() {
  const userId = useUserId();

  return useQuery({
    queryKey: ['supplement-favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        const response = await api.get('/supplements/favorites/list');
        return response.data?.map((fav: { supplement_id: string }) => fav.supplement_id) || [];
      } catch {
        return [];
      }
    },
    enabled: !!userId,
  });
}

export function useToggleSupplementFavorite() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ supplementId, isFavorite }: { supplementId: string; isFavorite: boolean }) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      if (isFavorite) {
        // Remove from favorites
        await api.delete(`/supplements/favorites/${supplementId}`);
      } else {
        // Add to favorites
        await api.post(`/supplements/favorites/${supplementId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-favorites', userId] });
    },
  });
}
