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

export function useFoodFavorites(options?: { enabled?: boolean }) {
  const userId = useUserId();
  const extraEnabled = options?.enabled ?? true;

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
    enabled: !!userId && extraEnabled,
    staleTime: 5 * 60 * 1000,
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
        await api.delete(`/nutrition/favorites/foods/${foodId}`);
      } else {
        await api.post(`/nutrition/favorites/foods/${foodId}`);
      }
    },
    onMutate: async ({ foodId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['food-favorites', userId] });
      const previous = queryClient.getQueryData<string[]>(['food-favorites', userId]);
      queryClient.setQueryData<string[]>(['food-favorites', userId], (old = []) =>
        isFavorite ? old.filter((id) => id !== foodId) : [...old, foodId],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['food-favorites', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['food-favorites', userId] });
    },
  });
}

// ============ SUPPLEMENT FAVORITES ============

export function useSupplementFavorites(options?: { enabled?: boolean }) {
  const userId = useUserId();
  const extraEnabled = options?.enabled ?? true;

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
    enabled: !!userId && extraEnabled,
    staleTime: 5 * 60 * 1000,
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
        await api.delete(`/supplements/favorites/${supplementId}`);
      } else {
        await api.post(`/supplements/favorites/${supplementId}`);
      }
    },
    onMutate: async ({ supplementId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['supplement-favorites', userId] });
      const previous = queryClient.getQueryData<string[]>(['supplement-favorites', userId]);
      queryClient.setQueryData<string[]>(['supplement-favorites', userId], (old = []) =>
        isFavorite ? old.filter((id) => id !== supplementId) : [...old, supplementId],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['supplement-favorites', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-favorites', userId] });
    },
  });
}

// ============ EXERCISE FAVORITES ============

export function useExerciseFavorites() {
  const userId = useUserId();

  return useQuery({
    queryKey: ['exercise-favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        const response = await api.get('/exercises/favorites/list');
        return response.data?.map((fav: { exercise_id: string }) => fav.exercise_id) || [];
      } catch {
        return [];
      }
    },
    enabled: !!userId,
  });
}

export function useToggleExerciseFavorite() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ exerciseId, isFavorite }: { exerciseId: string; isFavorite: boolean }) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      if (isFavorite) {
        await api.delete(`/exercises/favorites/${exerciseId}`);
      } else {
        await api.post(`/exercises/favorites/${exerciseId}`);
      }
    },
    onMutate: async ({ exerciseId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['exercise-favorites', userId] });
      const previous = queryClient.getQueryData<string[]>(['exercise-favorites', userId]);
      queryClient.setQueryData<string[]>(['exercise-favorites', userId], (old = []) =>
        isFavorite ? old.filter((id) => id !== exerciseId) : [...old, exerciseId],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['exercise-favorites', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-favorites', userId] });
    },
  });
}
