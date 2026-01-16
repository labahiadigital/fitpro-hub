import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../stores/auth";

// Helper para obtener el workspace ID
function useWorkspaceId() {
  const { currentWorkspace } = useAuthStore();
  return currentWorkspace?.id;
}

// Hook para obtener clientes desde Supabase
export function useSupabaseClients() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-clients", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { items: [], total: 0 };

      const { data, error, count } = await supabase
        .from("clients")
        .select(
          "*, client_tags_association(tag_id, client_tags(id, name, color))",
          { count: "exact" }
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return {
        items:
          data?.map((client) => ({
            ...client,
            tags:
              client.client_tags_association?.map(
                (ta: any) => ta.client_tags
              ) || [],
          })) || [],
        total: count || 0,
      };
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener reservas desde Supabase
export function useSupabaseBookings() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-bookings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("*, clients(first_name, last_name, email)")
        .eq("workspace_id", workspaceId)
        .order("start_time", { ascending: true });

      if (error) throw error;

      return (
        data?.map((booking) => ({
          ...booking,
          client_name: booking.clients
            ? `${booking.clients.first_name} ${booking.clients.last_name}`
            : booking.title,
        })) || []
      );
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener ejercicios desde Supabase
export function useSupabaseExercises() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-exercises", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .or(`workspace_id.eq.${workspaceId},is_global.eq.true`)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });
}

// Hook para obtener alimentos desde Supabase (sin paginación - para compatibilidad)
export function useSupabaseFoods() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-foods", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .or(`workspace_id.eq.${workspaceId},is_global.eq.true`)
        .order("name", { ascending: true })
        .limit(1000); // Límite explícito

      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });
}

// Hook para obtener alimentos con paginación
export function useSupabaseFoodsPaginated(
  page = 1,
  pageSize = 50,
  search = ""
) {
  const workspaceId = useWorkspaceId();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    queryKey: ["supabase-foods-paginated", workspaceId, page, pageSize, search],
    queryFn: async () => {
      let query = supabase
        .from("foods")
        .select("*", { count: "exact" })
        .or(`workspace_id.eq.${workspaceId},is_global.eq.true`);

      // Aplicar búsqueda si existe
      if (search.trim()) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error, count } = await query
        .order("name", { ascending: true })
        .range(from, to);

      if (error) throw error;

      return {
        items: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: true,
    placeholderData: (previousData) => previousData, // Mantener datos anteriores mientras carga
  });
}

// Hook para obtener solo el conteo total de alimentos
export function useSupabaseFoodsCount() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-foods-count", workspaceId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("foods")
        .select("*", { count: "exact", head: true })
        .or(`workspace_id.eq.${workspaceId},is_global.eq.true`);

      if (error) throw error;
      return count || 0;
    },
    enabled: true,
  });
}

// Hook para obtener programas de entrenamiento desde Supabase
export function useSupabaseWorkoutPrograms() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-workout-programs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("workout_programs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener planes nutricionales desde Supabase
export function useSupabaseMealPlans() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-meal-plans", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*, clients(first_name, last_name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para crear un plan nutricional
export function useCreateMealPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const workspaceId = useWorkspaceId();

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
      const { data: plan, error } = await supabase
        .from("meal_plans")
        .insert({
          ...data,
          workspace_id: workspaceId,
          created_by: user?.id,
          is_template: data.is_template ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-meal-plans"] });
    },
  });
}

// Hook para actualizar un plan nutricional
export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
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
      const { data: plan, error } = await supabase
        .from("meal_plans")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-meal-plans"] });
    },
  });
}

// Hook para eliminar un plan nutricional
export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_plans").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-meal-plans"] });
    },
  });
}

// Hook para crear un alimento
export function useCreateFood() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

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
      const { data: food, error } = await supabase
        .from("foods")
        .insert({
          ...data,
          workspace_id: workspaceId,
          is_global: false,
        })
        .select()
        .single();

      if (error) throw error;
      return food;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-foods"] });
    },
  });
}

// Hook para eliminar un alimento
export function useDeleteFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("foods").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-foods"] });
    },
  });
}

// Hook para actualizar un alimento
export function useUpdateFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      generic_name?: string | null;
      brand?: string | null;
      category?: string;
      barcode?: string | null;
      quantity?: string | null;
      serving_size?: number;
      serving_unit?: string;
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      fiber_g?: number;
      sugars_g?: number;
      saturated_fat_g?: number;
      salt_g?: number;
      sodium_mg?: number;
      ingredients_text?: string | null;
      allergens?: string | null;
    }) => {
      const { data: food, error } = await supabase
        .from("foods")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return food;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-foods"] });
      queryClient.invalidateQueries({ queryKey: ["supabase-foods-paginated"] });
    },
  });
}

// Hook para obtener tags de clientes
export function useSupabaseClientTags() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-client-tags", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("client_tags")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para crear un cliente
export function useCreateSupabaseClient() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: async (data: {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      goals?: string;
    }) => {
      const { data: client, error } = await supabase
        .from("clients")
        .insert({
          ...data,
          workspace_id: workspaceId,
          created_by: user?.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-clients"] });
    },
  });
}

// Hook para obtener KPIs del dashboard
export function useSupabaseKPIs() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-kpis", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      // Obtener conteo de clientes
      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);

      // Obtener conteo de reservas del mes actual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("start_time", startOfMonth.toISOString());

      // Obtener reservas confirmadas
      const { count: confirmedBookings } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "confirmed")
        .gte("start_time", startOfMonth.toISOString());

      // Obtener programas de entrenamiento
      const { count: programsCount } = await supabase
        .from("workout_programs")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      return {
        total_clients: clientsCount || 0,
        active_clients: clientsCount || 0,
        monthly_bookings: bookingsCount || 0,
        confirmed_bookings: confirmedBookings || 0,
        workout_programs: programsCount || 0,
        mrr: 0, // TODO: calcular desde subscriptions
        client_change: 12,
        booking_change: 8,
      };
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener el workspace actual
export function useSupabaseWorkspace() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-workspace", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener un plan nutricional individual
export function useSupabaseMealPlan(id: string) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-meal-plan", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*, clients(id, first_name, last_name, email, birth_date, gender, height_cm, weight_kg, health_data)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!workspaceId,
  });
}

// Hook para obtener un cliente individual
export function useClient(id: string) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-client", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("clients")
        .select("*, client_tags_association(tag_id, client_tags(id, name, color))")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        tags: data?.client_tags_association?.map((ta: any) => ta.client_tags) || [],
      };
    },
    enabled: !!id && !!workspaceId,
  });
}

// Hook para obtener suplementos
export function useSupplements() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-supplements", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplements")
        .select("*")
        .or(`workspace_id.eq.${workspaceId},is_global.eq.true`)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para crear suplemento
export function useCreateSupplement() {
  const workspaceId = useWorkspaceId();
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
      const { data, error } = await supabase
        .from("supplements")
        .insert({
          ...supplement,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-supplements"] });
    },
  });
}

// Hook para actualizar suplemento
export function useUpdateSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...supplement
    }: {
      id: string;
      name?: string;
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
      const { data, error } = await supabase
        .from("supplements")
        .update(supplement)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-supplements"] });
    },
  });
}

// Hook para eliminar suplemento
export function useDeleteSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-supplements"] });
    },
  });
}

// Hook para obtener certificados
export function useSupabaseCertificates() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-certificates", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("certificates")
        .select("*, courses(title), challenges(title)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener cursos
export function useSupabaseCourses() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-courses", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener challenges
export function useSupabaseChallenges() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-challenges", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener inscripciones a cursos
export function useSupabaseCourseEnrollments() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-course-enrollments", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*, courses(title)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener instructores
export function useSupabaseInstructors() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-instructors", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("instructors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("display_name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener documentos de un cliente
export function useClientDocuments(clientId: string) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-client-documents", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // TODO: Implement when documents table is ready
      return [];
    },
    enabled: !!clientId && !!workspaceId,
  });
}

// Helper para verificar si un string es un UUID válido
function isValidUUID(str: string): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper para verificar si es un ID de cliente demo
function isDemoClientId(clientId: string): boolean {
  return !clientId || clientId.startsWith("demo-client-") || !isValidUUID(clientId);
}

// Hook para obtener planes nutricionales de un cliente
export function useClientMealPlans(clientId: string) {
  const workspaceId = useWorkspaceId();
  const isDemo = isDemoClientId(clientId);

  return useQuery({
    queryKey: ["supabase-client-meal-plans", clientId],
    queryFn: async () => {
      // Para clientes demo, retornamos datos mock
      if (isDemo) {
        return [];
      }

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    // Deshabilitar la query completamente para clientes demo
    enabled: !!clientId && !!workspaceId && !isDemo,
  });
}

// ============ ASIGNACIONES ============

// Hook para obtener asignaciones de programas de entrenamiento de un cliente
export function useClientWorkoutAssignments(clientId: string) {
  const workspaceId = useWorkspaceId();
  const isDemo = isDemoClientId(clientId);

  return useQuery({
    queryKey: ["client-workout-assignments", clientId],
    queryFn: async () => {
      if (isDemo) return [];

      const { data, error } = await supabase
        .from("client_workout_assignments")
        .select("*, workout_programs(id, name, description, duration_weeks, difficulty)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!workspaceId && !isDemo,
  });
}

// Hook para obtener asignaciones de planes nutricionales de un cliente
export function useClientMealPlanAssignments(clientId: string) {
  const workspaceId = useWorkspaceId();
  const isDemo = isDemoClientId(clientId);

  return useQuery({
    queryKey: ["client-mealplan-assignments", clientId],
    queryFn: async () => {
      if (isDemo) return [];

      const { data, error } = await supabase
        .from("client_mealplan_assignments")
        .select("*, meal_plans(id, name, description, duration_days, target_calories)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!workspaceId && !isDemo,
  });
}

// Hook para asignar un programa de entrenamiento a un cliente
export function useAssignWorkoutProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      programId: string;
      startDate: string;
      endDate?: string;
      notes?: string;
    }) => {
      const { data: assignment, error } = await supabase
        .from("client_workout_assignments")
        .insert({
          workspace_id: workspaceId,
          client_id: data.clientId,
          program_id: data.programId,
          assigned_by: user?.id,
          start_date: data.startDate,
          end_date: data.endDate,
          notes: data.notes,
          status: "active",
          current_week: 1,
          current_day: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return assignment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-workout-assignments", variables.clientId] });
    },
  });
}

// Hook para asignar un plan nutricional a un cliente
export function useAssignMealPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      mealPlanId: string;
      startDate: string;
      endDate?: string;
      notes?: string;
    }) => {
      const { data: assignment, error } = await supabase
        .from("client_mealplan_assignments")
        .insert({
          workspace_id: workspaceId,
          client_id: data.clientId,
          mealplan_id: data.mealPlanId,
          assigned_by: user?.id,
          start_date: data.startDate,
          end_date: data.endDate,
          notes: data.notes,
          status: "active",
          adherence_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return assignment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-mealplan-assignments", variables.clientId] });
    },
  });
}

// Hook para obtener planes nutricionales como plantillas (is_template = true)
export function useMealPlanTemplates() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["meal-plan-templates", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("id, name, description, duration_days, target_calories, target_protein, target_carbs, target_fat")
        .eq("workspace_id", workspaceId)
        .eq("is_template", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener programas de entrenamiento como plantillas (is_template = true)
export function useWorkoutProgramTemplates() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["workout-program-templates", workspaceId],
    queryFn: async () => {
      // Obtener todos los programas de entrenamiento marcados como plantilla
      // No filtramos por workspace_id para que funcione en modo demo
      const { data, error } = await supabase
        .from("workout_programs")
        .select("id, name, description, duration_weeks, difficulty, tags")
        .eq("is_template", true)
        .order("name");

      if (error) {
        console.error("[useWorkoutProgramTemplates] Error:", error);
        throw error;
      }
      return data || [];
    },
    enabled: true,
  });
}
