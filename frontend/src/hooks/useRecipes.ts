import i18next from "i18next";
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
      notifications.show({ title: i18next.t("hooks.recipeCreated"), message: i18next.t("hooks.recipeCreatedMsg"), color: "green" });
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
      notifications.show({ title: i18next.t("hooks.recipeUpdated"), message: i18next.t("hooks.recipeUpdatedMsg"), color: "green" });
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nutritionApi.deleteRecipe(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      notifications.show({ title: i18next.t("hooks.recipeDeleted"), message: i18next.t("hooks.recipeDeletedMsg"), color: "green" });
    },
  });
}

export function useDuplicateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nutritionApi.duplicateRecipe(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      notifications.show({ title: i18next.t("hooks.recipeDuplicated"), message: i18next.t("hooks.recipeDuplicatedMsg"), color: "green" });
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
