import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { clientPortalApi } from "../services/api";

// ============ TYPES ============

interface ClientDashboard {
  client_id: string;
  full_name: string;
  next_session: {
    id: string;
    title: string;
    date: string;
    type: string;
    location?: string;
  } | null;
  week_progress: {
    workouts_completed: number;
    workouts_total: number;
    calories_burned: number;
  };
  nutrition_today: {
    calories: { current: number; target: number };
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fats: { current: number; target: number };
  };
  goals: {
    primary: string;
    progress: number;
    start_weight: number;
    current_weight: number;
    target_weight: number;
  };
  recent_activity: Array<{
    type: string;
    title: string;
    time: string;
  }>;
  upcoming_sessions: Array<{
    id: string;
    date: string;
    type: string;
    duration: string;
    status: string;
  }>;
}

interface ClientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: string;
  height_cm?: string;
  weight_kg?: string;
  goals?: string;
  health_data: Record<string, unknown>;
}

interface WorkoutProgram {
  id: string;
  name: string;
  description?: string;
  duration_weeks?: number;
  difficulty?: string;
  template?: {
    // Nueva estructura con días de la semana
    days?: Array<{
      id: string;
      day: number;
      dayName: string;
      isRestDay: boolean;
      notes?: string;
      blocks: Array<{
        id: string;
        name: string;
        type?: string;
        rest_between_sets?: number;
        rounds?: number;
        exercises?: Array<{
          id: string;
          exercise_id?: string;
          exercise?: {
            id: string;
            name: string;
            muscle_groups?: string[];
          };
          name?: string;
          sets: number;
          reps: string;
          rest_seconds?: number;
          notes?: string;
        }>;
      }>;
    }>;
    // Retrocompatibilidad: bloques planos
    blocks?: Array<{
      id: string;
      name: string;
      type?: string;
      exercises?: Array<{
        exercise?: { name?: string };
        name?: string;
        sets?: number;
        reps?: string;
        rest_seconds?: number;
        notes?: string;
      }>;
    }>;
  };
  tags?: string[];
  created_at: string;
}

interface WorkoutLog {
  id: string;
  program_id: string;
  log: Record<string, unknown>;
  created_at: string;
}

interface MealPlan {
  id: string;
  name: string;
  description?: string;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  meal_times?: {
    meals: Array<{ name: string; time: string }>;
  };
  plan?: {
    days: Array<{
      id: string;
      day: number;
      dayName: string;
      notes?: string;
      meals: Array<{
        id: string;
        name: string;
        time: string;
        items: Array<{
          id: string;
          food_id?: string;
          food?: {
            id: string;
            name: string;
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
            serving_size: string;
          };
          quantity_grams: number;
          type: "food" | "supplement";
        }>;
      }>;
    }>;
  };
  adherence?: {
    logs: Array<NutritionLog>;
  };
  created_at: string;
}

interface NutritionLog {
  date: string;
  meal_name: string;
  foods: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
    food_id?: string;
  }>;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  notes?: string;
}

interface Measurement {
  id: string;
  measured_at: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
  photos: Array<{ url: string; type: string }>;
  notes?: string;
  created_at: string;
}

interface ProgressSummary {
  current_stats: {
    weight: number;
    body_fat?: number;
    muscle_mass?: number;
  };
  start_stats: {
    weight: number;
    body_fat?: number;
    muscle_mass?: number;
  };
  target_stats: {
    weight?: number;
    body_fat?: number;
    muscle_mass?: number;
  };
  measurements_count: number;
  goals?: string;
}

interface Booking {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: string;
  booking_type?: string;
  location?: string;
  online_link?: string;
}

// ============ DASHBOARD ============

export function useClientDashboard() {
  return useQuery<ClientDashboard>({
    queryKey: ["client-dashboard"],
    queryFn: async () => {
      const response = await clientPortalApi.dashboard();
      return response.data;
    },
  });
}

// ============ PROFILE ============

export function useClientProfile() {
  return useQuery<ClientProfile>({
    queryKey: ["client-profile"],
    queryFn: async () => {
      const response = await clientPortalApi.profile();
      return response.data;
    },
  });
}

export function useUpdateClientProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ClientProfile>) => {
      const response = await clientPortalApi.updateProfile(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      notifications.show({
        title: "Perfil actualizado",
        message: "Tus datos se han guardado correctamente",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo actualizar el perfil",
        color: "red",
      });
    },
  });
}

// ============ WORKOUTS ============

export function useMyWorkouts() {
  return useQuery<WorkoutProgram[]>({
    queryKey: ["my-workouts"],
    queryFn: async () => {
      const response = await clientPortalApi.workouts();
      return response.data;
    },
  });
}

export function useMyWorkout(id: string) {
  return useQuery<WorkoutProgram>({
    queryKey: ["my-workout", id],
    queryFn: async () => {
      const response = await clientPortalApi.getWorkout(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useLogWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { program_id: string; log: Record<string, unknown> }) => {
      const response = await clientPortalApi.logWorkout(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout-history"] });
      queryClient.invalidateQueries({ queryKey: ["today-workout-logs"] });
      queryClient.invalidateQueries({ queryKey: ["client-dashboard"] });
      notifications.show({
        title: "Entrenamiento registrado",
        message: "Tu progreso ha sido guardado",
        color: "green",
      });
    },
    onError: (error: Error & { response?: { status?: number; data?: { detail?: string } } }) => {
      // Check if it's a 409 Conflict (duplicate)
      if (error.response?.status === 409) {
        notifications.show({
          title: "Ya registrado",
          message: error.response?.data?.detail || "Ya has registrado este entrenamiento hoy",
          color: "yellow",
        });
      } else {
        notifications.show({
          title: "Error",
          message: "No se pudo registrar el entrenamiento",
          color: "red",
        });
      }
    },
  });
}

export function useWorkoutHistory(limit?: number) {
  return useQuery<WorkoutLog[]>({
    queryKey: ["workout-history", limit],
    queryFn: async () => {
      const response = await clientPortalApi.workoutHistory(limit);
      return response.data;
    },
  });
}

interface TodayWorkoutLogs {
  completed_program_ids: string[];
  logs: Array<{
    id: string;
    program_id: string;
    log: Record<string, unknown>;
    created_at: string;
  }>;
}

export function useTodayWorkoutLogs() {
  return useQuery<TodayWorkoutLogs>({
    queryKey: ["today-workout-logs"],
    queryFn: async () => {
      const response = await clientPortalApi.todayWorkoutLogs();
      return response.data;
    },
  });
}

// ============ NUTRITION ============

export function useMyMealPlan() {
  return useQuery<MealPlan | null>({
    queryKey: ["my-meal-plan"],
    queryFn: async () => {
      const response = await clientPortalApi.mealPlan();
      return response.data;
    },
  });
}

export function useAllMealPlans() {
  return useQuery<MealPlan[]>({
    queryKey: ["my-meal-plans"],
    queryFn: async () => {
      const response = await clientPortalApi.allMealPlans();
      return response.data;
    },
  });
}

export function useLogNutrition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      date: string;
      meal_name: string;
      foods: Array<{
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        quantity: number;
        food_id?: string;
      }>;
      notes?: string;
    }) => {
      const response = await clientPortalApi.logNutrition(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-meal-plan"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition-history"] });
      queryClient.invalidateQueries({ queryKey: ["client-dashboard"] });
      notifications.show({
        title: "Comida registrada",
        message: "Tu registro nutricional ha sido guardado",
        color: "green",
      });
    },
    onError: (error: Error & { response?: { status?: number; data?: { detail?: string } } }) => {
      // Check if it's a 409 Conflict (duplicate)
      if (error.response?.status === 409) {
        notifications.show({
          title: "Ya registrado",
          message: error.response?.data?.detail || "Ya has registrado esta comida para hoy",
          color: "yellow",
        });
      } else {
        notifications.show({
          title: "Error",
          message: "No se pudo registrar la comida",
          color: "red",
        });
      }
    },
  });
}

export function useNutritionLogs(date?: string, limit?: number) {
  return useQuery<NutritionLog[]>({
    queryKey: ["nutrition-logs", date, limit],
    queryFn: async () => {
      const response = await clientPortalApi.nutritionLogs(date, limit);
      return response.data;
    },
  });
}

export function useDeleteNutritionLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logIndex: number) => {
      await clientPortalApi.deleteNutritionLog(logIndex);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-meal-plan"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition-history"] });
      queryClient.invalidateQueries({ queryKey: ["client-dashboard"] });
      notifications.show({
        title: "Registro eliminado",
        message: "El registro nutricional ha sido eliminado",
        color: "blue",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo eliminar el registro",
        color: "red",
      });
    },
  });
}

interface NutritionHistoryDay {
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

interface NutritionHistory {
  days: NutritionHistoryDay[];
  summary: {
    total_days: number;
    avg_calories: number;
    target_calories?: number;
  };
}

export function useNutritionHistory(days?: number) {
  return useQuery<NutritionHistory>({
    queryKey: ["nutrition-history", days],
    queryFn: async () => {
      const response = await clientPortalApi.nutritionHistory(days);
      return response.data;
    },
  });
}

// ============ PROGRESS ============

export function useMeasurements(limit?: number) {
  return useQuery<Measurement[]>({
    queryKey: ["my-measurements", limit],
    queryFn: async () => {
      const response = await clientPortalApi.measurements(limit);
      return response.data;
    },
  });
}

export function useCreateMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      measured_at: string;
      weight_kg?: number;
      body_fat_percentage?: number;
      muscle_mass_kg?: number;
      measurements?: {
        chest?: number;
        waist?: number;
        hips?: number;
        arms?: number;
        thighs?: number;
      };
      notes?: string;
    }) => {
      const response = await clientPortalApi.createMeasurement(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-measurements"] });
      queryClient.invalidateQueries({ queryKey: ["progress-summary"] });
      queryClient.invalidateQueries({ queryKey: ["client-dashboard"] });
      notifications.show({
        title: "Medidas registradas",
        message: "Tu progreso ha sido guardado",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudieron registrar las medidas",
        color: "red",
      });
    },
  });
}

export function useProgressSummary() {
  return useQuery<ProgressSummary>({
    queryKey: ["progress-summary"],
    queryFn: async () => {
      const response = await clientPortalApi.progressSummary();
      return response.data;
    },
  });
}

// Photos hooks
interface ProgressPhoto {
  url: string;
  type: string;
  notes?: string;
  uploaded_at: string;
  measurement_date?: string;
}

export function useProgressPhotos(limit = 50) {
  return useQuery<ProgressPhoto[]>({
    queryKey: ["progress-photos", limit],
    queryFn: async () => {
      const response = await clientPortalApi.getPhotos(limit);
      return response.data;
    },
  });
}

export function useUploadProgressPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, type, notes }: { file: File; type: string; notes?: string }) => {
      const response = await clientPortalApi.uploadPhoto(file, type, notes);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-photos"] });
      queryClient.invalidateQueries({ queryKey: ["my-measurements"] });
      queryClient.invalidateQueries({ queryKey: ["progress-summary"] });
      notifications.show({
        title: "Foto subida",
        message: "Tu foto de progreso ha sido guardada",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "No se pudo subir la foto",
        color: "red",
      });
    },
  });
}

// ============ CALENDAR ============

export function useMyBookings(params?: {
  status?: string;
  upcoming_only?: boolean;
  limit?: number;
}) {
  return useQuery<Booking[]>({
    queryKey: ["my-bookings", params],
    queryFn: async () => {
      const response = await clientPortalApi.bookings(params);
      return response.data;
    },
  });
}

export function useMyBooking(id: string) {
  return useQuery<Booking>({
    queryKey: ["my-booking", id],
    queryFn: async () => {
      const response = await clientPortalApi.getBooking(id);
      return response.data;
    },
    enabled: !!id,
  });
}


// ============ FEEDBACK ============

interface ClientFeedback {
  id: string;
  feedback_type: string;
  reference_id?: string;
  reference_name?: string;
  rating?: number;
  comment?: string;
  context: Record<string, unknown>;
  created_at: string;
}

export function useClientFeedback(feedbackType?: string) {
  return useQuery<ClientFeedback[]>({
    queryKey: ["client-feedback", feedbackType],
    queryFn: async () => {
      const response = await clientPortalApi.getFeedback(feedbackType);
      return response.data;
    },
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      feedback_type: string;
      reference_id?: string;
      reference_name?: string;
      rating?: number;
      comment?: string;
      context?: Record<string, unknown>;
    }) => {
      const response = await clientPortalApi.createFeedback(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-feedback"] });
      notifications.show({
        title: "Feedback enviado",
        message: "Gracias por tu valoración",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo enviar el feedback",
        color: "red",
      });
    },
  });
}

export function useCreateWorkoutFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      program_id: string;
      overall_rating: number;
      difficulty_rating?: number;
      enjoyment_rating?: number;
      effectiveness_rating?: number;
      what_liked?: string;
      what_improve?: string;
      general_comment?: string;
    }) => {
      const response = await clientPortalApi.createWorkoutFeedback(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-feedback"] });
      notifications.show({
        title: "Valoración enviada",
        message: "Gracias por valorar tu programa de entrenamiento",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo enviar la valoración",
        color: "red",
      });
    },
  });
}

export function useCreateDietFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      meal_plan_id: string;
      overall_rating: number;
      taste_rating?: number;
      satiety_rating?: number;
      variety_rating?: number;
      practicality_rating?: number;
      favorite_meals?: string;
      disliked_meals?: string;
      general_comment?: string;
      adherence_percentage?: number;
    }) => {
      const response = await clientPortalApi.createDietFeedback(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-feedback"] });
      notifications.show({
        title: "Valoración enviada",
        message: "Gracias por valorar tu plan nutricional",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo enviar la valoración",
        color: "red",
      });
    },
  });
}


// ============ EMOTIONS ============

interface ClientEmotion {
  id: string;
  emotion_date: string;
  mood_level: number;
  emotions: string[];
  energy_level?: number;
  sleep_quality?: number;
  stress_level?: number;
  notes?: string;
  context: Record<string, unknown>;
  created_at: string;
}

export function useClientEmotions(startDate?: string, endDate?: string) {
  return useQuery<ClientEmotion[]>({
    queryKey: ["client-emotions", startDate, endDate],
    queryFn: async () => {
      const response = await clientPortalApi.getEmotions(startDate, endDate);
      return response.data;
    },
  });
}

export function useTodayEmotion() {
  return useQuery<ClientEmotion | null>({
    queryKey: ["today-emotion"],
    queryFn: async () => {
      const response = await clientPortalApi.getTodayEmotion();
      return response.data;
    },
  });
}

export function useCreateEmotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      emotion_date: string;
      mood_level: number;
      emotions?: string[];
      energy_level?: number;
      sleep_quality?: number;
      stress_level?: number;
      notes?: string;
      context?: Record<string, unknown>;
    }) => {
      const response = await clientPortalApi.createEmotion(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-emotions"] });
      queryClient.invalidateQueries({ queryKey: ["today-emotion"] });
      notifications.show({
        title: "Estado de ánimo registrado",
        message: "Tu registro del día ha sido guardado",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo registrar tu estado de ánimo",
        color: "red",
      });
    },
  });
}
