import { notifications } from "@mantine/notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { nutritionApi, clientPortalApi } from "../services/api";
import type { Recipe, RecipeFilters } from "../types/recipe";

const RECIPES_KEY = "recipes";

export function useRecipes(
  filters?: RecipeFilters,
  options?: { enabled?: boolean },
) {
  return useQuery<Recipe[]>({
    queryKey: [RECIPES_KEY, filters],
    queryFn: async () => {
      const res = await nutritionApi.recipes(filters);
      return res.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}

export function useRecipe(id: string | null) {
  return useQuery<Recipe>({
    queryKey: [RECIPES_KEY, id],
    queryFn: async () => {
      const res = await nutritionApi.getRecipe(id!);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => nutritionApi.createRecipe(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      notifications.show({ title: "Receta creada", message: "La receta ha sido creada correctamente", color: "green" });
    },
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string;[key: string]: unknown }) =>
      nutritionApi.updateRecipe(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      notifications.show({ title: "Receta actualizada", message: "La receta ha sido actualizada correctamente", color: "green" });
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nutritionApi.deleteRecipe(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      notifications.show({ title: "Receta eliminada", message: "La receta ha sido eliminada", color: "green" });
    },
  });
}

export function useDuplicateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nutritionApi.duplicateRecipe(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      notifications.show({ title: "Receta duplicada", message: "Se ha creado una copia de la receta", color: "green" });
    },
  });
}

export function useClientRecipes(filters?: { search?: string; category?: string }) {
  return useQuery<Recipe[]>({
    queryKey: ["client-recipes", filters],
    queryFn: async () => {
      const res = await clientPortalApi.recipes(filters);
      return res.data;
    },
  });
}
