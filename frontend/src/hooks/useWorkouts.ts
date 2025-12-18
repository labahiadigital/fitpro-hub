import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workoutsApi } from "../services/api";
import { useAuthStore } from "../stores/auth";

interface Exercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  muscle_groups: string[];
  equipment: string[];
  difficulty: string;
  category?: string;
  video_url?: string;
  image_url?: string;
}

interface WorkoutProgram {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  duration_weeks: number;
  difficulty: string;
  template: {
    weeks: Array<{
      days: Array<{
        exercises: Array<{
          exercise_id: string;
          sets: number;
          reps: string;
          rest_seconds: number;
          notes?: string;
        }>;
      }>;
    }>;
  };
  tags: string[];
  is_template: boolean;
  created_at: string;
}

interface ExerciseFilters {
  search?: string;
  muscle_group?: string;
  category?: string;
}

// Demo exercises data
const demoExercises: Exercise[] = [
  {
    id: "ex-1",
    name: "Press de Banca",
    muscle_groups: ["pecho", "tríceps"],
    equipment: ["barra", "banco"],
    difficulty: "intermediate",
    description: "Ejercicio compuesto para pecho",
  },
  {
    id: "ex-2",
    name: "Sentadilla",
    muscle_groups: ["cuádriceps", "glúteos"],
    equipment: ["barra"],
    difficulty: "intermediate",
    description: "Ejercicio fundamental para piernas",
  },
  {
    id: "ex-3",
    name: "Peso Muerto",
    muscle_groups: ["espalda", "isquiotibiales"],
    equipment: ["barra"],
    difficulty: "advanced",
    description: "Ejercicio compuesto para espalda baja",
  },
  {
    id: "ex-4",
    name: "Dominadas",
    muscle_groups: ["espalda", "bíceps"],
    equipment: ["barra de dominadas"],
    difficulty: "intermediate",
    description: "Ejercicio de tracción vertical",
  },
  {
    id: "ex-5",
    name: "Press Militar",
    muscle_groups: ["hombros", "tríceps"],
    equipment: ["barra"],
    difficulty: "intermediate",
    description: "Ejercicio para hombros",
  },
  {
    id: "ex-6",
    name: "Curl de Bíceps",
    muscle_groups: ["bíceps"],
    equipment: ["mancuernas"],
    difficulty: "beginner",
    description: "Aislamiento para bíceps",
  },
  {
    id: "ex-7",
    name: "Extensión de Tríceps",
    muscle_groups: ["tríceps"],
    equipment: ["mancuernas"],
    difficulty: "beginner",
    description: "Aislamiento para tríceps",
  },
  {
    id: "ex-8",
    name: "Zancadas",
    muscle_groups: ["cuádriceps", "glúteos"],
    equipment: ["mancuernas"],
    difficulty: "beginner",
    description: "Ejercicio unilateral para piernas",
  },
  {
    id: "ex-9",
    name: "Plancha",
    muscle_groups: ["core"],
    equipment: ["ninguno"],
    difficulty: "beginner",
    description: "Ejercicio isométrico para core",
  },
  {
    id: "ex-10",
    name: "Remo con Barra",
    muscle_groups: ["espalda", "bíceps"],
    equipment: ["barra"],
    difficulty: "intermediate",
    description: "Ejercicio de tracción horizontal",
  },
];

// Demo workout programs data
const demoPrograms: WorkoutProgram[] = [
  {
    id: "prog-1",
    workspace_id: "11111111-1111-1111-1111-111111111111",
    name: "Programa de Hipertrofia",
    description: "Programa de 8 semanas enfocado en el crecimiento muscular",
    duration_weeks: 8,
    difficulty: "intermediate",
    template: { weeks: [] },
    tags: ["hipertrofia", "volumen"],
    is_template: true,
    created_at: "2024-01-10T10:00:00Z",
  },
  {
    id: "prog-2",
    workspace_id: "11111111-1111-1111-1111-111111111111",
    name: "Fuerza Básica",
    description:
      "Programa para principiantes enfocado en los movimientos básicos",
    duration_weeks: 4,
    difficulty: "beginner",
    template: { weeks: [] },
    tags: ["fuerza", "principiante"],
    is_template: true,
    created_at: "2024-02-15T14:30:00Z",
  },
  {
    id: "prog-3",
    workspace_id: "11111111-1111-1111-1111-111111111111",
    name: "HIIT Quema Grasa",
    description: "Programa de alta intensidad para pérdida de grasa",
    duration_weeks: 6,
    difficulty: "advanced",
    template: { weeks: [] },
    tags: ["cardio", "pérdida de peso"],
    is_template: true,
    created_at: "2024-03-20T09:15:00Z",
  },
];

export function useExercises(filters: ExerciseFilters = {}) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useQuery({
    queryKey: ["exercises", filters, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        let filteredExercises = [...demoExercises];

        if (filters.search) {
          const search = filters.search.toLowerCase();
          filteredExercises = filteredExercises.filter(
            (e) =>
              e.name.toLowerCase().includes(search) ||
              e.muscle_groups.some((m) => m.toLowerCase().includes(search))
          );
        }

        if (filters.muscle_group) {
          filteredExercises = filteredExercises.filter((e) =>
            e.muscle_groups.includes(filters.muscle_group!)
          );
        }

        return { data: filteredExercises };
      }
      return workoutsApi.exercises(filters);
    },
    select: (response) => response.data as Exercise[],
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useMutation({
    mutationFn: async (data: Partial<Exercise>) => {
      if (isDemoMode) {
        return { data: { ...data, id: `demo-ex-${Date.now()}` } };
      }
      return workoutsApi.createExercise(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      notifications.show({
        title: "Ejercicio creado",
        message: isDemoMode
          ? "Ejercicio creado (modo demo)"
          : "El ejercicio ha sido creado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al crear ejercicio",
        color: "red",
      });
    },
  });
}

export function useWorkoutPrograms(isTemplate?: boolean) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useQuery({
    queryKey: ["workout-programs", isTemplate, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        let filteredPrograms = [...demoPrograms];
        if (isTemplate !== undefined) {
          filteredPrograms = filteredPrograms.filter(
            (p) => p.is_template === isTemplate
          );
        }
        return { data: filteredPrograms };
      }
      return workoutsApi.programs({
        is_template: isTemplate ? "Y" : undefined,
      });
    },
    select: (response) => response.data as WorkoutProgram[],
  });
}

export function useWorkoutProgram(programId: string) {
  return useQuery({
    queryKey: ["workout-program", programId],
    queryFn: () => workoutsApi.getProgram(programId),
    select: (response) => response.data,
    enabled: !!programId,
  });
}

export function useCreateWorkoutProgram() {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useMutation({
    mutationFn: async (data: Partial<WorkoutProgram>) => {
      if (isDemoMode) {
        return {
          data: {
            ...data,
            id: `demo-prog-${Date.now()}`,
            created_at: new Date().toISOString(),
          },
        };
      }
      return workoutsApi.createProgram(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-programs"] });
      notifications.show({
        title: "Programa creado",
        message: isDemoMode
          ? "Programa creado (modo demo)"
          : "El programa de entrenamiento ha sido creado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al crear programa",
        color: "red",
      });
    },
  });
}

export function useUpdateWorkoutProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkoutProgram> }) =>
      workoutsApi.updateProgram(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workout-programs"] });
      queryClient.invalidateQueries({
        queryKey: ["workout-program", variables.id],
      });
      notifications.show({
        title: "Programa actualizado",
        message: "El programa ha sido actualizado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al actualizar programa",
        color: "red",
      });
    },
  });
}

export function useDeleteWorkoutProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workoutsApi.deleteProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-programs"] });
      notifications.show({
        title: "Programa eliminado",
        message: "El programa ha sido eliminado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al eliminar programa",
        color: "red",
      });
    },
  });
}

export function useWorkoutLogs(clientId: string) {
  return useQuery({
    queryKey: ["workout-logs", clientId],
    queryFn: () => workoutsApi.logs(clientId),
    select: (response) => response.data,
    enabled: !!clientId,
  });
}

export function useCreateWorkoutLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      program_id: string;
      client_id: string;
      log: object;
    }) => workoutsApi.createLog(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workout-logs", variables.client_id],
      });
      notifications.show({
        title: "Entrenamiento registrado",
        message: "El entrenamiento ha sido registrado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al registrar entrenamiento",
        color: "red",
      });
    },
  });
}
