import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { notifications } from "@mantine/notifications";

export interface TimeRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  user_name?: string;
  clock_in: string;
  clock_out?: string | null;
  pauses?: Array<{ start: string; end?: string | null }>;
  net_minutes?: number | null;
  notes?: string | null;
  status: "active" | "completed" | "edited";
  created_at: string;
  updated_at: string;
}

export interface ClockStatus {
  is_clocked_in: boolean;
  record_id?: string | null;
  clock_in?: string | null;
  is_paused: boolean;
  pause_start?: string | null;
  net_minutes_today: number;
}

export interface LeaveRequestItem {
  id: string;
  workspace_id: string;
  user_id: string;
  user_name?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  notes?: string | null;
  status: "pendiente" | "aprobada" | "rechazada";
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicHoliday {
  id: string;
  workspace_id: string;
  date: string;
  name: string;
  created_at: string;
}

const TC_KEYS = {
  status: (uid?: string) => ["time-clock-status", uid ?? "me"],
  records: (filters?: Record<string, string | undefined>) => ["time-clock-records", filters],
  leaves: (filters?: Record<string, string | undefined>) => ["time-clock-leaves", filters],
  holidays: ["time-clock-holidays"],
} as const;

function extractError(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { detail?: string } } };
  return typeof err?.response?.data?.detail === "string" ? err.response!.data!.detail : fallback;
}

// ── Clock status ────────────────────────────────────────────────────────────

export function useClockStatus(userId?: string) {
  return useQuery({
    queryKey: TC_KEYS.status(userId),
    queryFn: async () => {
      const params = userId ? { user_id: userId } : {};
      const res = await api.get("/time-clock/status", { params });
      return res.data as ClockStatus;
    },
    refetchInterval: 30_000,
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { user_id?: string; notes?: string }) => {
      const res = await api.post("/time-clock/clock-in", data ?? {});
      return res.data as TimeRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-status"] });
      qc.invalidateQueries({ queryKey: ["time-clock-records"] });
      notifications.show({ title: "Fichaje", message: "Entrada registrada", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo fichar entrada"), color: "red" }),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { user_id?: string; notes?: string }) => {
      const res = await api.post("/time-clock/clock-out", data ?? {});
      return res.data as TimeRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-status"] });
      qc.invalidateQueries({ queryKey: ["time-clock-records"] });
      notifications.show({ title: "Fichaje", message: "Salida registrada", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo fichar salida"), color: "red" }),
  });
}

export function useTogglePause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { user_id?: string }) => {
      const res = await api.post("/time-clock/pause", data ?? {});
      return res.data as ClockStatus;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-status"] });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo cambiar pausa"), color: "red" }),
  });
}

// ── Records ─────────────────────────────────────────────────────────────────

export function useTimeRecords(filters?: { start_date?: string; end_date?: string; user_id?: string }) {
  return useQuery({
    queryKey: TC_KEYS.records(filters as Record<string, string | undefined>),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.start_date) params.start_date = filters.start_date;
      if (filters?.end_date) params.end_date = filters.end_date;
      if (filters?.user_id) params.user_id = filters.user_id;
      const res = await api.get("/time-clock/records", { params });
      return res.data as TimeRecord[];
    },
  });
}

export function useUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; clock_in?: string; clock_out?: string; notes?: string }) => {
      const res = await api.put(`/time-clock/records/${id}`, data);
      return res.data as TimeRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-records"] });
      notifications.show({ title: "Actualizado", message: "Registro actualizado", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo actualizar"), color: "red" }),
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/time-clock/records/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-records"] });
      notifications.show({ title: "Eliminado", message: "Registro eliminado", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo eliminar"), color: "red" }),
  });
}

// ── Leave Requests ──────────────────────────────────────────────────────────

export function useLeaveRequests(filters?: { status?: string; type?: string; user_id?: string }) {
  return useQuery({
    queryKey: TC_KEYS.leaves(filters as Record<string, string | undefined>),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.type) params.type = filters.type;
      if (filters?.user_id) params.user_id = filters.user_id;
      const res = await api.get("/time-clock/leave-requests", { params });
      return res.data as LeaveRequestItem[];
    },
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { leave_type: string; start_date: string; end_date: string; notes?: string }) => {
      const res = await api.post("/time-clock/leave-requests", data);
      return res.data as LeaveRequestItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-leaves"] });
      notifications.show({ title: "Solicitud creada", message: "Solicitud de ausencia creada", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo crear solicitud"), color: "red" }),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/time-clock/leave-requests/${id}/approve`);
      return res.data as LeaveRequestItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-leaves"] });
      notifications.show({ title: "Aprobada", message: "Solicitud aprobada", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo aprobar"), color: "red" }),
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/time-clock/leave-requests/${id}/reject`);
      return res.data as LeaveRequestItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-leaves"] });
      notifications.show({ title: "Rechazada", message: "Solicitud rechazada", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo rechazar"), color: "red" }),
  });
}

// ── Holidays ────────────────────────────────────────────────────────────────

export function useHolidays() {
  return useQuery({
    queryKey: TC_KEYS.holidays,
    queryFn: async () => {
      const res = await api.get("/time-clock/holidays");
      return res.data as PublicHoliday[];
    },
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { date: string; name: string }) => {
      const res = await api.post("/time-clock/holidays", data);
      return res.data as PublicHoliday;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-holidays"] });
      notifications.show({ title: "Festivo creado", message: "Festivo añadido al calendario", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo crear festivo"), color: "red" }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/time-clock/holidays/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-clock-holidays"] });
      notifications.show({ title: "Festivo eliminado", message: "Festivo eliminado", color: "green" });
    },
    onError: (e) => notifications.show({ title: "Error", message: extractError(e, "No se pudo eliminar festivo"), color: "red" }),
  });
}
