import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth';

// Helper para obtener el user_id y workspace_id
function useUserContext() {
  const { user, currentWorkspace } = useAuthStore();
  return { 
    userId: user?.id, 
    workspaceId: currentWorkspace?.id 
  };
}

// ============ FOOD FAVORITES ============

export function useFoodFavorites() {
  const { userId } = useUserContext();

  return useQuery({
    queryKey: ['food-favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('food_favorites')
        .select('food_id')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching food favorites:', error);
        return [];
      }
      
      return data?.map(fav => fav.food_id) || [];
    },
    enabled: !!userId,
  });
}

export function useToggleFoodFavorite() {
  const { userId, workspaceId } = useUserContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ foodId, isFavorite }: { foodId: string; isFavorite: boolean }) => {
      if (!userId || !workspaceId) {
        throw new Error('User not authenticated');
      }

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('food_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('food_id', foodId);
        
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('food_favorites')
          .insert({ 
            user_id: userId, 
            food_id: foodId,
            workspace_id: workspaceId
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-favorites', userId] });
    },
  });
}

// ============ SUPPLEMENT FAVORITES ============

export function useSupplementFavorites() {
  const { userId } = useUserContext();

  return useQuery({
    queryKey: ['supplement-favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('supplement_favorites')
        .select('supplement_id')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching supplement favorites:', error);
        return [];
      }
      
      return data?.map(fav => fav.supplement_id) || [];
    },
    enabled: !!userId,
  });
}

export function useToggleSupplementFavorite() {
  const { userId, workspaceId } = useUserContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ supplementId, isFavorite }: { supplementId: string; isFavorite: boolean }) => {
      if (!userId || !workspaceId) {
        throw new Error('User not authenticated');
      }

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('supplement_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('supplement_id', supplementId);
        
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('supplement_favorites')
          .insert({ 
            user_id: userId, 
            supplement_id: supplementId,
            workspace_id: workspaceId
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-favorites', userId] });
    },
  });
}
