import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentsApi } from "../services/api";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export interface AppointmentData {
  id: string;
  workspace_id: string;
  service_id?: string;
  service_name?: string;
  service_color?: string;
  staff_id?: string;
  staff_name?: string;
  client_id?: string;
  client_name?: string;
  box_id?: string;
  box_name?: string;
  box_color?: string;
  machine_ids: string[];
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: Array<{ type: string; id: string; message: string }>;
  alternatives: Array<{ user_id: string; name: string; is_primary: boolean }>;
  suggested_end_time: string;
}

export function useAppointments(params?: { start_date?: string; end_date?: string; staff_id?: string; box_id?: string }) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: async () => appointmentsApi.list(params),
    select: (res) => res.data as AppointmentData[],
    staleTime: 15_000,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => appointmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      notifications.show({ title: "Cita creada", message: "La cita ha sido reservada", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Conflicto", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => appointmentsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      notifications.show({ title: "Cita actualizada", message: "Cambios guardados", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Error", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => appointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      notifications.show({ title: "Estado actualizado", message: "El estado de la cita ha sido actualizado", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Error", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      notifications.show({ title: "Cita eliminada", message: "La cita ha sido eliminada", color: "green" });
    },
  });
}

export function useCheckAvailability() {
  return useMutation({
    mutationFn: (data: object) => appointmentsApi.checkAvailability(data),
  });
}

export function useResourceStats(type: string, id: string) {
  return useQuery({
    queryKey: ["resource-stats", type, id],
    queryFn: async () => appointmentsApi.stats(type, id),
    select: (res) => res.data as { today: number; upcoming: number; total: number; cancel_rate: number; occupation_rate: number },
    enabled: !!id && !!type,
    staleTime: 30_000,
  });
}
