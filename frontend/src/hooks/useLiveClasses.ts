import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import supabase from "../services/supabase";

// Tipos
export interface LiveClass {
  id: string;
  workspace_id: string;
  instructor_id?: string;
  title: string;
  description?: string;
  class_type: string;
  category: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  timezone: string;
  max_participants: number;
  current_participants: number;
  is_free: boolean;
  price: number;
  currency: string;
  required_equipment: string[];
  difficulty_level: string;
  meeting_provider: string;
  meeting_id?: string;
  meeting_password?: string;
  meeting_url?: string;
  host_url?: string;
  is_recorded: boolean;
  recording_url?: string;
  recording_available_until?: string;
  status: string;
  is_recurring: boolean;
  recurrence_rule?: Record<string, unknown>;
  parent_class_id?: string;
  thumbnail_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LiveClassRegistration {
  id: string;
  class_id: string;
  user_id?: string;
  client_id?: string;
  status: string;
  joined_at?: string;
  left_at?: string;
  attendance_duration_minutes: number;
  payment_id?: string;
  amount_paid: number;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  rating?: number;
  feedback?: string;
  created_at: string;
}

export interface LiveClassTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  class_type: string;
  category: string;
  duration_minutes: number;
  max_participants: number;
  is_free: boolean;
  default_price: number;
  required_equipment: string[];
  difficulty_level: string;
  thumbnail_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface LiveClassPackage {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  total_classes: number;
  price: number;
  currency: string;
  validity_days: number;
  applicable_categories: string[];
  applicable_class_types: string[];
  is_active: boolean;
  created_at: string;
}

export interface ClassStats {
  total_classes: number;
  upcoming_classes: number;
  completed_classes: number;
  total_participants: number;
  average_attendance: number;
  total_revenue: number;
}

// Hook para obtener workspace_id del usuario actual
function useWorkspaceId() {
  const { data } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData } = await supabase
        .from("users")
        .select("workspace_id")
        .eq("id", user.id)
        .single();

      return userData?.workspace_id;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });

  return data;
}

// Hook para listar clases en vivo
export function useLiveClasses(filters?: {
  status?: string;
  category?: string;
  from_date?: Date;
  to_date?: Date;
  upcoming_only?: boolean;
}) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["live-classes", workspaceId, filters],
    queryFn: async () => {
      let query = supabase
        .from("live_classes")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("scheduled_start", { ascending: true });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.from_date) {
        query = query.gte("scheduled_start", filters.from_date.toISOString());
      }
      if (filters?.to_date) {
        query = query.lte("scheduled_start", filters.to_date.toISOString());
      }
      if (filters?.upcoming_only) {
        query = query
          .gte("scheduled_start", new Date().toISOString())
          .in("status", ["scheduled", "live"]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LiveClass[];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener una clase específica
export function useLiveClass(classId: string) {
  return useQuery({
    queryKey: ["live-class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_classes")
        .select("*, live_class_registrations(*)")
        .eq("id", classId)
        .single();

      if (error) throw error;
      return data as LiveClass & { live_class_registrations: LiveClassRegistration[] };
    },
    enabled: !!classId,
  });
}

// Hook para estadísticas de clases
export function useLiveClassStats() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["live-class-stats", workspaceId],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Total de clases
      const { count: totalClasses } = await supabase
        .from("live_classes")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      // Clases próximas
      const { count: upcomingClasses } = await supabase
        .from("live_classes")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("scheduled_start", now)
        .in("status", ["scheduled", "live"]);

      // Clases completadas
      const { count: completedClasses } = await supabase
        .from("live_classes")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "completed");

      // Total de participantes
      const { data: participantsData } = await supabase
        .from("live_classes")
        .select("current_participants")
        .eq("workspace_id", workspaceId);

      const totalParticipants = participantsData?.reduce(
        (sum, c) => sum + (c.current_participants || 0),
        0
      ) || 0;

      // Ingresos totales (del mes actual)
      const startOfMonth = dayjs().startOf("month").toISOString();
      const { data: revenueData } = await supabase
        .from("live_class_registrations")
        .select("amount_paid, live_classes!inner(workspace_id, scheduled_start)")
        .eq("live_classes.workspace_id", workspaceId)
        .gte("live_classes.scheduled_start", startOfMonth);

      const totalRevenue = revenueData?.reduce(
        (sum, r) => sum + (r.amount_paid || 0),
        0
      ) || 0;

      return {
        total_classes: totalClasses || 0,
        upcoming_classes: upcomingClasses || 0,
        completed_classes: completedClasses || 0,
        total_participants: totalParticipants,
        average_attendance: totalClasses ? totalParticipants / totalClasses : 0,
        total_revenue: totalRevenue,
      } as ClassStats;
    },
    enabled: !!workspaceId,
  });
}

// Hook para crear una clase
export function useCreateLiveClass() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: async (classData: Partial<LiveClass>) => {
      const { data, error } = await supabase
        .from("live_classes")
        .insert({
          ...classData,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      queryClient.invalidateQueries({ queryKey: ["live-class-stats"] });
    },
  });
}

// Hook para actualizar una clase
export function useUpdateLiveClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...classData }: Partial<LiveClass> & { id: string }) => {
      const { data, error } = await supabase
        .from("live_classes")
        .update(classData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      queryClient.invalidateQueries({ queryKey: ["live-class", data.id] });
    },
  });
}

// Hook para eliminar una clase
export function useDeleteLiveClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from("live_classes")
        .delete()
        .eq("id", classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      queryClient.invalidateQueries({ queryKey: ["live-class-stats"] });
    },
  });
}

// Hook para inscribirse a una clase
export function useRegisterForClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      classId,
      clientId,
    }: {
      classId: string;
      clientId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("live_class_registrations")
        .insert({
          class_id: classId,
          user_id: clientId ? null : user?.id,
          client_id: clientId,
        })
        .select()
        .single();

      if (error) throw error;

      // Incrementar contador de participantes
      await supabase.rpc("increment_class_participants", { class_id: classId });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["live-class", variables.classId] });
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
    },
  });
}

// Hook para cancelar inscripción
export function useCancelRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registrationId,
      classId,
    }: {
      registrationId: string;
      classId: string;
    }) => {
      const { error } = await supabase
        .from("live_class_registrations")
        .update({ status: "cancelled" })
        .eq("id", registrationId);

      if (error) throw error;

      // Decrementar contador de participantes
      await supabase.rpc("decrement_class_participants", { class_id: classId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["live-class", variables.classId] });
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
    },
  });
}

// Hook para obtener plantillas
export function useLiveClassTemplates() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["live-class-templates", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_class_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as LiveClassTemplate[];
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener paquetes de clases
export function useLiveClassPackages() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["live-class-packages", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_class_packages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as LiveClassPackage[];
    },
    enabled: !!workspaceId,
  });
}

// Hook para calendario de clases
export function useLiveClassCalendar(startDate: Date, endDate: Date) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ["live-class-calendar", workspaceId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_classes")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("scheduled_start", startDate.toISOString())
        .lte("scheduled_start", endDate.toISOString())
        .neq("status", "cancelled")
        .order("scheduled_start");

      if (error) throw error;

      // Agrupar por fecha
      const calendar: Record<string, LiveClass[]> = {};
      for (const liveClass of data || []) {
        const dateKey = dayjs(liveClass.scheduled_start).format("YYYY-MM-DD");
        if (!calendar[dateKey]) {
          calendar[dateKey] = [];
        }
        calendar[dateKey].push(liveClass as LiveClass);
      }

      return calendar;
    },
    enabled: !!workspaceId,
  });
}
