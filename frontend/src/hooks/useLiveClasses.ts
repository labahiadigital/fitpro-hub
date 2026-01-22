/**
 * MIGRATED: All hooks now use the backend API instead of Supabase directly.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "../services/api";
import { useAuthStore } from "../stores/auth";

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
  const { currentWorkspace } = useAuthStore();
  return currentWorkspace?.id;
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
      try {
        const params: Record<string, string> = {};
        if (filters?.status) params.status = filters.status;
        if (filters?.category) params.category = filters.category;
        if (filters?.from_date) params.from_date = filters.from_date.toISOString();
        if (filters?.to_date) params.to_date = filters.to_date.toISOString();
        if (filters?.upcoming_only) params.upcoming_only = "true";

        const response = await api.get("/live-classes/classes", { params });
        return (response.data || []) as LiveClass[];
      } catch {
        return [];
      }
    },
    enabled: !!workspaceId,
  });
}

// Hook para obtener una clase específica
export function useLiveClass(classId: string) {
  return useQuery({
    queryKey: ["live-class", classId],
    queryFn: async () => {
      const response = await api.get(`/live-classes/classes/${classId}`);
      return response.data as LiveClass & { live_class_registrations: LiveClassRegistration[] };
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
      try {
        const response = await api.get("/live-classes/stats");
        return response.data as ClassStats;
      } catch {
        return {
          total_classes: 0,
          upcoming_classes: 0,
          completed_classes: 0,
          total_participants: 0,
          average_attendance: 0,
          total_revenue: 0,
        };
      }
    },
    enabled: !!workspaceId,
  });
}

// Hook para crear una clase
export function useCreateLiveClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classData: Partial<LiveClass>) => {
      const response = await api.post("/live-classes/classes", classData);
      return response.data;
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
      const response = await api.put(`/live-classes/classes/${id}`, classData);
      return response.data;
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
      await api.delete(`/live-classes/classes/${classId}`);
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
      const response = await api.post(`/live-classes/registrations`, {
        class_id: classId,
        client_id: clientId,
      });
      return response.data;
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
    }: {
      registrationId: string;
      classId: string;
    }) => {
      await api.post(`/live-classes/registrations/${registrationId}/cancel`);
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
      try {
        const response = await api.get("/live-classes/templates");
        return (response.data || []) as LiveClassTemplate[];
      } catch {
        return [];
      }
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
      try {
        const response = await api.get("/live-classes/packages");
        return (response.data || []) as LiveClassPackage[];
      } catch {
        return [];
      }
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
      try {
        const response = await api.get("/live-classes/classes", {
          params: {
            from_date: startDate.toISOString(),
            to_date: endDate.toISOString(),
          },
        });

        // Agrupar por fecha
        const calendar: Record<string, LiveClass[]> = {};
        for (const liveClass of response.data || []) {
          const dateKey = dayjs(liveClass.scheduled_start).format("YYYY-MM-DD");
          if (!calendar[dateKey]) {
            calendar[dateKey] = [];
          }
          calendar[dateKey].push(liveClass as LiveClass);
        }

        return calendar;
      } catch {
        return {};
      }
    },
    enabled: !!workspaceId,
  });
}
