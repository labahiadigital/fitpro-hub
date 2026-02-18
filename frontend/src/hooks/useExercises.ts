import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { workoutsApi } from "../services/api";
import { useAuthStore } from "../stores/auth";

export interface ExerciseCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  workspace_id?: string;
  category_id?: string;
  name: string;
  description?: string;
  instructions?: string;
  video_url?: string;
  thumbnail_url?: string;
  muscle_groups: string[];
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  is_public: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseFilters {
  category_id?: string;
  muscle_group?: string;
  equipment?: string;
  difficulty?: string;
  search?: string;
}

export function useExerciseCategories() {
  return useQuery({
    queryKey: ["exercise-categories"],
    queryFn: async () => {
      const response = await api.get("/exercises/categories/");
      return response.data;
    },
  });
}

export function useExercises(filters?: ExerciseFilters) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["exercises", currentWorkspace?.id, filters],
    queryFn: async () => {
      const response = await api.get("/exercises/", {
        params: { workspace_id: currentWorkspace?.id, ...filters },
      });
      return response.data;
    },
  });
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ["exercise", id],
    queryFn: async () => {
      const response = await api.get(`/exercises/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Exercise>) => {
      const response = await api.post("/exercises/", {
        ...data,
        workspace_id: currentWorkspace?.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Exercise> }) => {
      const response = await api.put(`/exercises/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.invalidateQueries({ queryKey: ["exercise", variables.id] });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/exercises/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export function useMuscleGroups() {
  return useQuery({
    queryKey: ["muscle-groups"],
    queryFn: async () => [
      { value: "chest", label: "Pecho" },
      { value: "back", label: "Espalda" },
      { value: "shoulders", label: "Hombros" },
      { value: "biceps", label: "Bíceps" },
      { value: "triceps", label: "Tríceps" },
      { value: "forearms", label: "Antebrazos" },
      { value: "abs", label: "Abdominales" },
      { value: "obliques", label: "Oblicuos" },
      { value: "lower_back", label: "Lumbar" },
      { value: "glutes", label: "Glúteos" },
      { value: "quadriceps", label: "Cuádriceps" },
      { value: "hamstrings", label: "Isquiotibiales" },
      { value: "calves", label: "Gemelos" },
      { value: "hip_flexors", label: "Flexores de cadera" },
      { value: "full_body", label: "Cuerpo completo" },
    ],
  });
}

export function useEquipment() {
  return useQuery({
    queryKey: ["equipment"],
    queryFn: async () => [
      { value: "bodyweight", label: "Peso corporal" },
      { value: "barbell", label: "Barra" },
      { value: "dumbbell", label: "Mancuernas" },
      { value: "kettlebell", label: "Kettlebell" },
      { value: "cable", label: "Poleas" },
      { value: "machine", label: "Máquina" },
      { value: "resistance_band", label: "Banda elástica" },
      { value: "medicine_ball", label: "Balón medicinal" },
      { value: "pull_up_bar", label: "Barra de dominadas" },
      { value: "bench", label: "Banco" },
      { value: "box", label: "Cajón" },
      { value: "trx", label: "TRX" },
      { value: "foam_roller", label: "Foam roller" },
      { value: "yoga_mat", label: "Esterilla" },
      { value: "none", label: "Sin equipamiento" },
    ],
  });
}


// ============ EXERCISE ALTERNATIVES ============

export interface ExerciseAlternative {
  id: string;
  exercise_id: string;
  alternative_exercise_id: string;
  alternative_name: string;
  alternative_muscle_groups: string[];
  alternative_equipment: string[];
  alternative_category?: string;
  notes?: string;
  priority: number;
}

export function useAlternativesCounts() {
  return useQuery<Record<string, number>>({
    queryKey: ["exercise-alternatives-counts"],
    queryFn: async () => {
      const res = await workoutsApi.getExerciseAlternativesCounts();
      return res.data as Record<string, number>;
    },
  });
}

export function useExerciseAlternatives(exerciseId?: string) {
  return useQuery({
    queryKey: ["exercise-alternatives", exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      const res = await workoutsApi.getExerciseAlternatives(exerciseId);
      return res.data as ExerciseAlternative[];
    },
    enabled: !!exerciseId,
  });
}

export function useAddExerciseAlternative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ exerciseId, alternativeExerciseId, notes }: { exerciseId: string; alternativeExerciseId: string; notes?: string }) => {
      return workoutsApi.addExerciseAlternative(exerciseId, { alternative_exercise_id: alternativeExerciseId, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-alternatives"] });
    },
  });
}

export function useRemoveExerciseAlternative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ exerciseId, alternativeId }: { exerciseId: string; alternativeId: string }) => {
      return workoutsApi.removeExerciseAlternative(exerciseId, alternativeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-alternatives"] });
    },
  });
}
