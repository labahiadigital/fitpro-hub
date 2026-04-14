import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

export interface ScheduleSlot {
  id?: string;
  day_of_week: number;
  day_label?: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function defaultWeekSlots(): ScheduleSlot[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    day_label: DAY_LABELS[i],
    start_time: i < 5 ? "09:00" : "10:00",
    end_time: i < 5 ? "18:00" : "14:00",
    is_available: i < 5,
  }));
}

export function useStaffSchedule(userId: string | undefined) {
  return useQuery<ScheduleSlot[]>({
    queryKey: ["staff-schedule", userId],
    queryFn: async () => {
      if (!userId) return defaultWeekSlots();
      const { data } = await api.get(`/schedules/staff/${userId}`);
      if (!data || data.length === 0) return defaultWeekSlots();
      return data;
    },
    enabled: !!userId,
  });
}

export function useUpdateStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, slots }: { userId: string; slots: ScheduleSlot[] }) => {
      const { data } = await api.put(`/schedules/staff/${userId}`, { slots });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["staff-schedule", vars.userId] });
    },
  });
}

export function useMachineSchedule(machineId: string | undefined) {
  return useQuery<ScheduleSlot[]>({
    queryKey: ["machine-schedule", machineId],
    queryFn: async () => {
      if (!machineId) return defaultWeekSlots();
      const { data } = await api.get(`/schedules/machines/${machineId}`);
      if (!data || data.length === 0) return defaultWeekSlots();
      return data;
    },
    enabled: !!machineId,
  });
}

export function useUpdateMachineSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ machineId, slots }: { machineId: string; slots: ScheduleSlot[] }) => {
      const { data } = await api.put(`/schedules/machines/${machineId}`, { slots });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["machine-schedule", vars.machineId] });
    },
  });
}

export function useBoxSchedule(boxId: string | undefined) {
  return useQuery<ScheduleSlot[]>({
    queryKey: ["box-schedule", boxId],
    queryFn: async () => {
      if (!boxId) return defaultWeekSlots();
      const { data } = await api.get(`/schedules/boxes/${boxId}`);
      if (!data || data.length === 0) return defaultWeekSlots();
      return data;
    },
    enabled: !!boxId,
  });
}

export function useUpdateBoxSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boxId, slots }: { boxId: string; slots: ScheduleSlot[] }) => {
      const { data } = await api.put(`/schedules/boxes/${boxId}`, { slots });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["box-schedule", vars.boxId] });
    },
  });
}

export { defaultWeekSlots, DAY_LABELS };
