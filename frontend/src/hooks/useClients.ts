import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientsApi, workoutsApi, nutritionApi } from "../services/api";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export interface NutritionCalculationEntry {
  calculated_at: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: "male" | "female" | string;
  body_fat_pct?: number | null;
  activity_level: string;
  goal_type: string;
  formula_used: string;
  bmr: number;
  tdee: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  notes?: string;
}

export interface ClientHealthData {
  allergens?: string[];
  allergies?: string[];
  intolerances?: string[];
  injuries?: Array<{ name: string; date?: string; notes?: string; status?: string }>;
  formula_used?: string;
  activity_level?: string;
  goal_type?: string;
  body_tendency?: string;
  goal_weight_kg?: number;
  parq_responses?: Record<string, boolean | string>;
  parq_risk?: boolean;
  medications?: string | string[];
  medical_conditions?: string | string[];
  diseases?: string[];
  bmr?: number;
  tdee?: number;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  calculated_at?: string;
  nutrition_calculations_history?: NutritionCalculationEntry[];
  [key: string]: unknown;
}

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
  deleted_at?: string | null;
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
  status?: string;
  tag_id?: string;
}

export function useClients(
  filters: ClientFilters = {},
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async () => clientsApi.list(filters),
    select: (response) => response.data as ClientsResponse,
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30 * 1000,
  });
}

// Extended client data for detail view
export interface ClientDetail extends Client {
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
  injuries?: Array<{ name: string; date?: string; notes?: string; status?: string }>;
  body_fat_pct?: number;
  activity_level?: string;
  health_data?: ClientHealthData;
  tax_id?: string;
  billing_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => clientsApi.get(clientId),
    select: (response) => response.data,
    enabled: !!clientId,
    // El detalle del cliente cambia muy poco (sólo al editar desde la UI, y
    // en esos casos `useUpdateClient` invalida explícitamente la query).
    // Subimos el staleTime a 2 min y desactivamos `refetchOnMount` para
    // evitar dobles fetch cuando el árbol se re-monta por hidratación de
    // Zustand u Outlet.
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
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
    onError: (error: unknown) => {
      notifications.show({
        title: "Error",
        message: getApiErrorMessage(error),
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
    onError: (error: unknown) => {
      notifications.show({
        title: "Error",
        message: getApiErrorMessage(error),
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
      notifications.show({
        title: "Cliente eliminado",
        message: "El cliente ha sido eliminado correctamente",
        color: "green",
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
      notifications.show({
        title: "Cliente eliminado",
        message: "El cliente ha sido movido a Eliminados",
        color: "green",
      });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      notifications.show({
        title: "Cliente restaurado",
        message: "El cliente ha sido restaurado correctamente",
        color: "green",
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: "Error",
        message: getApiErrorMessage(error),
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
    staleTime: 5 * 60 * 1000,
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
    onError: (error: unknown) => {
      notifications.show({
        title: "Error",
        message: getApiErrorMessage(error),
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
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
  });
}

export function useClientPhotos(
  clientId: string,
  limit = 50,
  options?: { enabled?: boolean },
) {
  const extraEnabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["client-photos", clientId, limit],
    queryFn: async () => clientsApi.getPhotos(clientId, limit),
    select: (response) => response.data as ClientPhoto[],
    enabled: !!clientId && !clientId.startsWith("demo-") && extraEnabled,
    // Las URLs presignadas de R2 expiran en ~15 min: refrescamos antes para
    // evitar 400/403 al cargar imágenes después de un rato sin volver al
    // tab. ``gcTime`` también se acota para que no se sirvan URLs viejas.
    staleTime: 8 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useClientProgressSummary(clientId: string) {
  return useQuery({
    queryKey: ["client-progress-summary", clientId],
    queryFn: async () => clientsApi.getProgressSummary(clientId),
    select: (response) => response.data as ClientProgressSummary,
    enabled: !!clientId && !clientId.startsWith("demo-"),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
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

export function useClientWorkoutLogs(
  clientId: string,
  programId?: string,
  options?: { enabled?: boolean },
) {
  const extraEnabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["client-workout-logs", clientId, programId],
    queryFn: async () => workoutsApi.logs(clientId),
    select: (response) => response.data as WorkoutLogEntry[],
    enabled: !!clientId && !clientId.startsWith("demo-") && extraEnabled,
    staleTime: 60 * 1000,
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

export function useClientNutritionLogs(
  clientId: string,
  days = 30,
  options?: { enabled?: boolean },
) {
  const extraEnabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["client-nutrition-logs", clientId, days],
    queryFn: async () => nutritionApi.clientLogs(clientId, days),
    select: (response) => response.data as ClientNutritionLogs,
    enabled: !!clientId && !clientId.startsWith("demo-") && extraEnabled,
    staleTime: 60 * 1000,
  });
}
