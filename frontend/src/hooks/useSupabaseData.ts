/**
 * MIGRATED: All hooks now use the backend API instead of Supabase directly.
 * This file provides data hooks that communicate with the backend.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, clientsApi, nutritionApi, workoutsApi } from "../services/api";
import { useAuthStore } from "../stores/auth";

// Helper para obtener el workspace ID
function useWorkspaceId() {
  const { currentWorkspace } = useAuthStore();
  return currentWorkspace?.id;
}

// ============ CLIENTS ============

// Hook para obtener clientes
export function useSupabaseClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await clientsApi.list();
      return {
        items: response.data || [],
        total: response.data?.length || 0,
      };
    },
  });
}

// Hook para obtener un cliente individual
export function useClient(id: string) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await clientsApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// Hook para crear un cliente
export function useCreateSupabaseClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      goals?: string;
    }) => {
      const response = await clientsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

// Hook para obtener tags de clientes
export function useSupabaseClientTags() {
  return useQuery({
    queryKey: ["client-tags"],
    queryFn: async () => {
      const response = await clientsApi.tags();
      return response.data || [];
    },
  });
}

// ============ BOOKINGS ============

// Hook para obtener reservas
export function useSupabaseBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const response = await api.get("/bookings");
      return response.data || [];
    },
  });
}

// ============ EXERCISES ============

// Hook para obtener ejercicios
export function useSupabaseExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const response = await workoutsApi.exercises();
      return response.data || [];
    },
  });
}

// ============ FOODS ============

// Hook para obtener alimentos (sin paginación - para compatibilidad)
export function useSupabaseFoods() {
  return useQuery({
    queryKey: ["foods"],
    queryFn: async () => {
      const response = await nutritionApi.foods({ limit: 1000 });
      // La API devuelve { items: [], total: X, ... }
      return response.data?.items || [];
    },
  });
}

// Hook para obtener alimentos con paginación
export function useSupabaseFoodsPaginated(
  page = 1,
  pageSize = 50,
  search = ""
) {
  return useQuery({
    queryKey: ["foods-paginated", page, pageSize, search],
    queryFn: async () => {
      const response = await nutritionApi.foods({
        page,
        limit: pageSize,
        search: search || undefined,
      });
      const data = response.data;
      return {
        items: Array.isArray(data) ? data : data?.items || [],
        total: data?.total || (Array.isArray(data) ? data.length : 0),
        page,
        pageSize,
        totalPages: Math.ceil((data?.total || 0) / pageSize),
      };
    },
    placeholderData: (previousData) => previousData,
  });
}

// Hook para obtener solo el conteo total de alimentos
export function useSupabaseFoodsCount() {
  return useQuery({
    queryKey: ["foods-count"],
    queryFn: async () => {
      const response = await nutritionApi.foods({ limit: 1 });
      return response.data?.total || 0;
    },
  });
}

// Hook para crear un alimento
export function useCreateFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      category?: string;
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      quantity?: string;
      brand?: string;
    }) => {
      const response = await nutritionApi.createFood(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["foods-paginated"] });
    },
  });
}

// Hook para eliminar un alimento
export function useDeleteFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/nutrition/foods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["foods-paginated"] });
    },
  });
}

// Hook para actualizar un alimento
export function useUpdateFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      const response = await api.put(`/nutrition/foods/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["foods-paginated"] });
    },
  });
}

// ============ WORKOUT PROGRAMS ============

// Hook para obtener programas de entrenamiento
export function useSupabaseWorkoutPrograms() {
  return useQuery({
    queryKey: ["workout-programs"],
    queryFn: async () => {
      const response = await workoutsApi.programs();
      return response.data || [];
    },
  });
}

// Hook para obtener programas de entrenamiento como plantillas
export function useWorkoutProgramTemplates() {
  return useQuery({
    queryKey: ["workout-program-templates"],
    queryFn: async () => {
      const response = await workoutsApi.programs({ is_template: true });
      return response.data || [];
    },
  });
}

// ============ MEAL PLANS ============

// Hook para obtener planes nutricionales
export function useSupabaseMealPlans(options?: { is_template?: boolean }) {
  return useQuery({
    queryKey: ["meal-plans", options],
    queryFn: async () => {
      const response = await nutritionApi.plans(options);
      return response.data || [];
    },
  });
}

// Hook para obtener un plan nutricional individual
export function useSupabaseMealPlan(id: string) {
  return useQuery({
    queryKey: ["meal-plan", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await nutritionApi.getPlan(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// Hook para crear un plan nutricional
export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      duration_days?: number;
      target_calories?: number;
      target_protein?: number;
      target_carbs?: number;
      target_fat?: number;
      dietary_tags?: string[];
      plan?: object;
      is_template?: boolean;
    }) => {
      const response = await nutritionApi.createPlan(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
    },
  });
}

// Hook para actualizar un plan nutricional
export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      const response = await nutritionApi.updatePlan(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
    },
  });
}

// Hook para eliminar un plan nutricional
export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await nutritionApi.deletePlan(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
    },
  });
}

// Hook para obtener plantillas de planes nutricionales
export function useMealPlanTemplates() {
  return useQuery({
    queryKey: ["meal-plan-templates"],
    queryFn: async () => {
      const response = await nutritionApi.plans({ is_template: true });
      return response.data || [];
    },
  });
}

// ============ CLIENT MEAL PLANS ============

// Hook para obtener planes nutricionales de un cliente
export function useClientMealPlans(clientId: string) {
  return useQuery({
    queryKey: ["client-meal-plans", clientId],
    queryFn: async () => {
      if (!clientId || clientId.startsWith("demo-")) return [];
      const response = await api.get(`/nutrition/meal-plans`, {
        params: { client_id: clientId },
      });
      return response.data || [];
    },
    enabled: !!clientId && !clientId.startsWith("demo-"),
  });
}

// ============ SUPPLEMENTS ============

// Hook para obtener suplementos
export function useSupplements() {
  return useQuery({
    queryKey: ["supplements"],
    queryFn: async () => {
      const response = await api.get("/supplements");
      return response.data || [];
    },
  });
}

// Hook para crear suplemento
export function useCreateSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplement: {
      name: string;
      brand?: string;
      category?: string;
      description?: string;
      serving_size?: number;
      serving_unit?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      usage_instructions?: string;
      warnings?: string;
    }) => {
      const response = await api.post("/supplements", supplement);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}

// Hook para actualizar suplemento
export function useUpdateSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...supplement }: { id: string; [key: string]: unknown }) => {
      const response = await api.put(`/supplements/${id}`, supplement);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}

// Hook para eliminar suplemento
export function useDeleteSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/supplements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}

// ============ KPIs ============

// Hook para obtener KPIs del dashboard
export function useSupabaseKPIs() {
  return useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const response = await api.get("/reports/kpis");
      return response.data;
    },
  });
}

// ============ WORKSPACE ============

// Hook para obtener el workspace actual
export function useSupabaseWorkspace() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const response = await api.get(`/workspaces/${workspaceId}`);
      return response.data;
    },
    enabled: !!workspaceId,
  });
}

// ============ LMS (Courses, Challenges, Certificates) ============

// Hook para obtener cursos
export function useSupabaseCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      try {
        const response = await api.get("/lms/courses");
        return response.data || [];
      } catch {
        return [];
      }
    },
  });
}

// Hook para obtener challenges
export function useSupabaseChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      try {
        const response = await api.get("/lms/challenges");
        return response.data || [];
      } catch {
        return [];
      }
    },
  });
}

// Hook para obtener inscripciones a cursos
export function useSupabaseCourseEnrollments() {
  return useQuery({
    queryKey: ["course-enrollments"],
    queryFn: async () => {
      try {
        const response = await api.get("/lms/enrollments");
        return response.data || [];
      } catch {
        return [];
      }
    },
  });
}

// Hook para obtener certificados
export function useSupabaseCertificates() {
  return useQuery({
    queryKey: ["certificates"],
    queryFn: async () => {
      try {
        const response = await api.get("/lms/certificates");
        return response.data || [];
      } catch {
        return [];
      }
    },
  });
}

// Hook para obtener instructores
export function useSupabaseInstructors() {
  return useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      try {
        const response = await api.get("/lms/instructors");
        return response.data || [];
      } catch {
        return [];
      }
    },
  });
}

// ============ ASSIGNMENTS ============

// Hook para obtener documentos de un cliente
export function useClientDocuments(clientId: string) {
  return useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      try {
        const response = await api.get(`/documents`, {
          params: { client_id: clientId },
        });
        return response.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!clientId,
  });
}

// Hook para obtener programas de entrenamiento asignados a un cliente
export function useClientWorkoutAssignments(clientId: string) {
  return useQuery({
    queryKey: ["client-workout-assignments", clientId],
    queryFn: async () => {
      if (!clientId || clientId.startsWith("demo-")) return [];
      try {
        // Obtiene programas del cliente (is_template=false, client_id=XXX)
        const response = await workoutsApi.programs({ client_id: clientId });
        return response.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!clientId && !clientId.startsWith("demo-"),
  });
}

// Hook para obtener planes nutricionales asignados a un cliente
export function useClientMealPlanAssignments(clientId: string) {
  return useQuery({
    queryKey: ["client-mealplan-assignments", clientId],
    queryFn: async () => {
      if (!clientId || clientId.startsWith("demo-")) return [];
      try {
        // Obtiene planes del cliente (client_id=XXX)
        const response = await nutritionApi.plans({ client_id: clientId });
        return response.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!clientId && !clientId.startsWith("demo-"),
  });
}

// Hook para asignar un programa de entrenamiento
export function useAssignWorkoutProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      programId: string;
      startDate: string;
      endDate?: string;
      notes?: string;
    }) => {
      const response = await workoutsApi.assignProgram(
        data.programId, 
        data.clientId,
        data.startDate,
        data.endDate,
        data.notes
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["client-workout-assignments", variables.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workout-programs"],
      });
    },
  });
}

// Hook para asignar un plan nutricional
export function useAssignMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      mealPlanId: string;
      startDate: string;
      endDate?: string;
      notes?: string;
    }) => {
      const response = await nutritionApi.assignPlan(
        data.mealPlanId, 
        data.clientId,
        data.startDate,
        data.endDate,
        data.notes
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["client-mealplan-assignments", variables.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["meal-plans"],
      });
      queryClient.invalidateQueries({
        queryKey: ["client-meal-plans", variables.clientId],
      });
    },
  });
}

// Hook para eliminar un programa de entrenamiento asignado
export function useDeleteAssignedProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { programId: string; clientId: string }) => {
      const response = await workoutsApi.deleteProgram(data.programId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["client-workout-assignments", variables.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workout-programs"],
      });
    },
  });
}

// Hook para eliminar un plan nutricional asignado
export function useDeleteAssignedMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { planId: string; clientId: string }) => {
      const response = await nutritionApi.deletePlan(data.planId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["client-mealplan-assignments", variables.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["client-meal-plans", variables.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["meal-plans"],
      });
    },
  });
}
