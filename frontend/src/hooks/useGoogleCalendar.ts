import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

// Types
export interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
}

export interface GoogleCalendarAuthUrlResponse {
  auth_url: string;
}

export interface GoogleCalendarSyncResponse {
  success: boolean;
  events_synced: number;
  message: string;
}

// ============ HOOKS ============

/**
 * Hook para obtener el estado de conexión de Google Calendar
 */
export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: ["google-calendar", "status"],
    queryFn: async () => {
      const response = await api.get("/google-calendar/status");
      return response.data as GoogleCalendarStatus;
    },
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener la URL de autorización de Google
 */
export function useGoogleCalendarAuthUrl() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get("/google-calendar/auth-url");
      return response.data as GoogleCalendarAuthUrlResponse;
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Error al obtener URL de autorización";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    },
  });
}

/**
 * Hook para completar el callback de OAuth
 */
export function useGoogleCalendarCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post("/google-calendar/callback", { code });
      return response.data as GoogleCalendarStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar", "status"] });
      notifications.show({
        title: "Google Calendar conectado",
        message: "Tu calendario de Google ha sido conectado correctamente",
        color: "green",
      });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Error al conectar Google Calendar";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    },
  });
}

/**
 * Hook para desconectar Google Calendar
 */
export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/google-calendar/disconnect");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar", "status"] });
      notifications.show({
        title: "Google Calendar desconectado",
        message: "Tu calendario de Google ha sido desconectado",
        color: "blue",
      });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Error al desconectar Google Calendar";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    },
  });
}

/**
 * Hook para sincronizar manualmente con Google Calendar
 */
export function useSyncGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/google-calendar/sync");
      return response.data as GoogleCalendarSyncResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar", "status"] });
      notifications.show({
        title: "Sincronización completada",
        message: data.message || `Se sincronizaron ${data.events_synced} eventos`,
        color: "green",
      });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Error al sincronizar con Google Calendar";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    },
  });
}

/**
 * Hook para actualizar configuración de sincronización
 */
export function useUpdateGoogleCalendarSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (syncEnabled: boolean) => {
      const response = await api.patch("/google-calendar/settings", null, {
        params: { sync_enabled: syncEnabled },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar", "status"] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Error al actualizar configuración";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    },
  });
}

/**
 * Tipo para evento de Google Calendar
 */
export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  calendar_name: string;
  calendar_id: string;
  is_trackfiz: boolean;
  location?: string;
  description?: string;
}

/**
 * Hook para obtener eventos de Google Calendar
 * Útil para mostrar la disponibilidad del usuario en el calendario
 */
export function useGoogleCalendarEvents(params: {
  start_date?: string;
  end_date?: string;
  include_trackfiz?: boolean;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["google-calendar", "events", params],
    queryFn: async () => {
      const response = await api.get("/google-calendar/events", { params });
      return response.data as GoogleCalendarEvent[];
    },
    enabled: params.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Helper para iniciar el flujo de conexión de Google Calendar
 */
export function startGoogleCalendarAuth(authUrl: string) {
  // Abrir en la misma ventana para el flujo OAuth
  window.location.href = authUrl;
}

/**
 * Helper para formatear la última sincronización
 */
export function formatLastSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Nunca sincronizado";

  const date = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Hace un momento";
  if (diffMins < 60) return `Hace ${diffMins} minutos`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
