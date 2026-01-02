import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../stores/auth";

// Demo workspace ID para pruebas - usado como fallback cuando no hay workspace
const DEMO_WORKSPACE_ID = "11111111-1111-1111-1111-111111111111";

// Helper para obtener el workspace ID, siempre fallback a demo
function useWorkspaceId() {
  const { isDemoMode, currentWorkspace } = useAuthStore();
  // Siempre usar demo workspace si no hay workspace definido
  return isDemoMode || !currentWorkspace?.id
    ? DEMO_WORKSPACE_ID
    : currentWorkspace.id;
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
        .select(
          "*, clients(id, first_name, last_name, email, birth_date, gender, height_cm, weight_kg, health_data)"
        )
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
        .select(
          "*, client_tags_association(tag_id, client_tags(id, name, color))"
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      return {
        ...data,
        tags:
          data?.client_tags_association?.map((ta: any) => ta.client_tags) || [],
      };
    },
    enabled: !!id && !!workspaceId,
  });
}

// Hook para obtener planes nutricionales de un cliente
export function useClientMealPlans(clientId: string) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-client-meal-plans", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!workspaceId,
  });
}

// Hook para obtener pagos
export function useSupabasePayments() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-payments", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("payments")
        .select("*, clients(first_name, last_name, email), subscriptions(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data?.map((payment: any) => ({
        ...payment,
        client_name: payment.clients ? `${payment.clients.first_name} ${payment.clients.last_name}` : "Sin cliente",
        subscription_name: payment.subscriptions?.name || null,
      })) || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener suscripciones
export function useSupabaseSubscriptions() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-subscriptions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, clients(first_name, last_name, email)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data?.map((sub: any) => ({
        ...sub,
        client_name: sub.clients ? `${sub.clients.first_name} ${sub.clients.last_name}` : "Sin cliente",
      })) || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener productos
export function useSupabaseProducts() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-products", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener formularios
export function useSupabaseForms() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-forms", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener automatizaciones
export function useSupabaseAutomations() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-automations", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener paquetes de sesiones
export function useSupabaseSessionPackages() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-session-packages", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("session_packages")
        .select("*, products(name, price)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener paquetes de clientes
export function useSupabaseClientPackages() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-client-packages", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("client_packages")
        .select("*, clients(first_name, last_name), session_packages(name, total_sessions)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data?.map((pkg: any) => ({
        ...pkg,
        client_name: pkg.clients ? `${pkg.clients.first_name} ${pkg.clients.last_name}` : "Sin cliente",
        package_name: pkg.session_packages?.name || "Sin paquete",
      })) || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener miembros del equipo
export function useSupabaseTeamMembers() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-team-members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("*, users(id, full_name, email, avatar_url, is_active)")
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      return data?.map((member: any) => ({
        id: member.users?.id,
        full_name: member.users?.full_name || "Sin nombre",
        email: member.users?.email,
        avatar_url: member.users?.avatar_url,
        is_active: member.users?.is_active,
        role: member.role,
        is_default: member.is_default,
      })) || [];
    },
    enabled: !!workspaceId,
  });
}

// =====================================================
// HOOKS LMS - Learning Management System
// =====================================================

// Hook para obtener cursos
export function useSupabaseCourses(publishedOnly = false) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-courses", workspaceId, publishedOnly],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("courses")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (publishedOnly) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener un curso individual
export function useSupabaseCourse(courseId: string) {
  return useQuery({
    queryKey: ["supabase-course", courseId],
    queryFn: async () => {
      if (!courseId) return null;

      const { data, error } = await supabase
        .from("courses")
        .select("*, course_modules(*), lessons(*)")
        .eq("id", courseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

// Hook para obtener retos/challenges
export function useSupabaseChallenges(publishedOnly = false) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-challenges", workspaceId, publishedOnly],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("challenges")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (publishedOnly) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener inscripciones en cursos
export function useSupabaseCourseEnrollments(courseId?: string) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["supabase-course-enrollments", workspaceId, courseId],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("course_enrollments")
        .select("*, courses(title, thumbnail_url), clients(first_name, last_name)")
        .order("enrolled_at", { ascending: false });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
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
        .order("issue_date", { ascending: false });

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
        .eq("is_active", true)
        .order("display_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}
