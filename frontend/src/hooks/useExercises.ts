import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
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
  const { isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["exercise-categories"],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            { id: "1", name: "Fuerza", icon: "barbell", is_system: true },
            { id: "2", name: "Cardio", icon: "heart", is_system: true },
            { id: "3", name: "Flexibilidad", icon: "stretch", is_system: true },
            { id: "4", name: "HIIT", icon: "fire", is_system: true },
            { id: "5", name: "Core", icon: "abs", is_system: true },
          ] as ExerciseCategory[],
          total: 5,
        };
      }

      const response = await api.get("/exercises/categories/");
      return response.data;
    },
  });
}

export function useExercises(filters?: ExerciseFilters) {
  const { currentWorkspace, isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["exercises", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (isDemoMode) {
        const exercises: Exercise[] = [
          {
            id: "1",
            name: "Sentadilla con barra",
            description: "Ejercicio compuesto para piernas",
            instructions:
              "1. Coloca la barra en la espalda alta\n2. Baja controladamente\n3. Sube explosivamente",
            muscle_groups: ["quadriceps", "glutes", "hamstrings"],
            equipment: ["barbell"],
            difficulty: "intermediate",
            is_public: true,
            is_system: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Press de banca",
            description: "Ejercicio para pecho",
            instructions:
              "1. Túmbate en el banco\n2. Baja la barra al pecho\n3. Empuja hacia arriba",
            muscle_groups: ["chest", "shoulders", "triceps"],
            equipment: ["barbell", "bench"],
            difficulty: "intermediate",
            is_public: true,
            is_system: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "3",
            name: "Peso muerto",
            description: "Ejercicio compuesto para espalda y piernas",
            muscle_groups: ["back", "hamstrings", "glutes"],
            equipment: ["barbell"],
            difficulty: "advanced",
            is_public: true,
            is_system: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "4",
            name: "Dominadas",
            description: "Ejercicio para espalda con peso corporal",
            muscle_groups: ["back", "biceps"],
            equipment: ["pull_up_bar"],
            difficulty: "intermediate",
            is_public: true,
            is_system: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "5",
            name: "Plancha",
            description: "Ejercicio isométrico para core",
            muscle_groups: ["abs", "lower_back"],
            equipment: ["bodyweight"],
            difficulty: "beginner",
            is_public: true,
            is_system: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        let filtered = exercises;
        if (filters?.search) {
          filtered = filtered.filter((e) =>
            e.name.toLowerCase().includes(filters.search!.toLowerCase())
          );
        }
        if (filters?.muscle_group) {
          filtered = filtered.filter((e) =>
            e.muscle_groups.includes(filters.muscle_group!)
          );
        }
        if (filters?.difficulty) {
          filtered = filtered.filter(
            (e) => e.difficulty === filters.difficulty
          );
        }

        return { items: filtered, total: filtered.length, page: 1, size: 20 };
      }

      const response = await api.get("/exercises/", {
        params: { workspace_id: currentWorkspace?.id, ...filters },
      });
      return response.data;
    },
  });
}

export function useExercise(id: string) {
  const { isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["exercise", id],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          id,
          name: "Sentadilla con barra",
          description: "Ejercicio compuesto para piernas",
          instructions:
            "1. Coloca la barra en la espalda alta\n2. Baja controladamente\n3. Sube explosivamente",
          muscle_groups: ["quadriceps", "glutes", "hamstrings"],
          equipment: ["barbell"],
          difficulty: "intermediate",
          is_public: true,
          is_system: true,
        } as Exercise;
      }

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
