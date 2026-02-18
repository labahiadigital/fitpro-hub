import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientsApi, workoutsApi, nutritionApi } from "../services/api";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  has_user_account?: boolean;
  tags: Array<{ id: string; name: string; color: string }>;
  created_at: string;
}

interface ClientsResponse {
  items: Client[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ClientFilters {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  tag_id?: string;
}

export function useClients(filters: ClientFilters = {}) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async () => clientsApi.list(filters),
    select: (response) => response.data as ClientsResponse,
    staleTime: 30 * 1000, // 30 segundos - reduce refetches
  });
}

// Extended client data for detail view
interface ClientDetail extends Client {
  birth_date?: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  goals?: string;
  internal_notes?: string;
  chat_enabled?: boolean;
  consents?: {
    data_processing: boolean;
    marketing: boolean;
    health_data: boolean;
    consent_date: string;
  };
  health_data?: {
    allergies?: string[];
    intolerances?: string[];
    injuries?: Array<{ name: string; date?: string; notes?: string; status?: string }>;
    [key: string]: unknown;
  };
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => clientsApi.get(clientId),
    select: (response) => response.data,
    enabled: !!clientId,
    staleTime: 30 * 1000, // 30 segundos - reduce refetches
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Client>) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      notifications.show({
        title: "Cliente creado",
        message: "El cliente ha sido creado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al crear cliente",
        color: "red",
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientDetail> }) =>
      clientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.id] });
      notifications.show({
        title: "Cliente actualizado",
        message: "El cliente ha sido actualizado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al actualizar cliente",
        color: "red",
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al eliminar cliente",
        color: "red",
      });
    },
  });
}

export function usePermanentDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.deletePermanent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al eliminar cliente",
        color: "red",
      });
    },
  });
}

export function useClientTags() {
  return useQuery({
    queryKey: ["client-tags"],
    queryFn: async () => clientsApi.tags(),
    select: (response) => response.data,
  });
}

export function useCreateClientTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color: string }) => clientsApi.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tags"] });
      notifications.show({
        title: "Etiqueta creada",
        message: "La etiqueta ha sido creada correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al crear etiqueta",
        color: "red",
      });
    },
  });
}

// ============ STAFF: Client Progress & Measurements ============

interface ClientMeasurement {
  id: string;
  client_id: string;
  measured_at: string | null;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
  photos: Array<{
    url: string;
    type: string;
    notes?: string;
    uploaded_at: string;
  }>;
  notes: string | null;
  created_at: string;
}

interface ClientPhoto {
  url: string;
  type: string;
  notes?: string;
  uploaded_at: string;
  measurement_date?: string;
}

interface ClientProgressSummary {
  current_stats: {
    weight: number;
    body_fat: number | null;
    muscle_mass: number | null;
  };
  start_stats: {
    weight: number;
    body_fat: number | null;
    muscle_mass: number | null;
  };
  target_stats: {
    weight: number | null;
    body_fat: number | null;
    muscle_mass: number | null;
  };
  measurements_count: number;
  goals: string | null;
  weight_history: Array<{
    date: string | null;
    weight: number | null;
    body_fat: number | null;
    muscle_mass: number | null;
  }>;
}

export function useClientMeasurements(clientId: string, limit = 50) {
  return useQuery({
    queryKey: ["client-measurements", clientId, limit],
    queryFn: async () => clientsApi.getMeasurements(clientId, limit),
    select: (response) => response.data as ClientMeasurement[],
    enabled: !!clientId && !clientId.startsWith("demo-"),
  });
}

export function useClientPhotos(clientId: string, limit = 50) {
  return useQuery({
    queryKey: ["client-photos", clientId, limit],
    queryFn: async () => clientsApi.getPhotos(clientId, limit),
    select: (response) => response.data as ClientPhoto[],
    enabled: !!clientId && !clientId.startsWith("demo-"),
  });
}

export function useClientProgressSummary(clientId: string) {
  return useQuery({
    queryKey: ["client-progress-summary", clientId],
    queryFn: async () => clientsApi.getProgressSummary(clientId),
    select: (response) => response.data as ClientProgressSummary,
    enabled: !!clientId && !clientId.startsWith("demo-"),
  });
}

// Workout logs for a client (trainer view)
interface WorkoutLogEntry {
  id: string;
  program_id: string;
  log: {
    workout_name?: string;
    duration_minutes?: number;
    calories_burned?: number;
    exercises?: Array<{
      name: string;
      completed: boolean;
      sets_completed: number;
      notes?: string;
    }>;
    notes?: string;
    completed_at?: string;
  };
  created_at: string;
}

export function useClientWorkoutLogs(clientId: string, programId?: string) {
  return useQuery({
    queryKey: ["client-workout-logs", clientId, programId],
    queryFn: async () => workoutsApi.logs(clientId),
    select: (response) => response.data as WorkoutLogEntry[],
    enabled: !!clientId && !clientId.startsWith("demo-"),
  });
}

// Nutrition logs for a client (trainer view)
interface NutritionLogDay {
  date: string;
  meals: Array<{
    meal_name: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    foods: Array<{ name: string; calories: number; quantity: number }>;
    logged_at: string;
  }>;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface ClientNutritionLogs {
  client_id: string;
  client_name: string;
  logs: NutritionLogDay[];
  summary: {
    total_days: number;
    avg_calories: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export function useClientNutritionLogs(clientId: string, days = 30) {
  return useQuery({
    queryKey: ["client-nutrition-logs", clientId, days],
    queryFn: async () => nutritionApi.clientLogs(clientId, days),
    select: (response) => response.data as ClientNutritionLogs,
    enabled: !!clientId && !clientId.startsWith("demo-"),
  });
}
