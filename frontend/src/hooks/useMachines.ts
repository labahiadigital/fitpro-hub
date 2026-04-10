import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "../services/api";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export interface MachineData {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color_hex: string;
  is_active: boolean;
  fixed_box_id?: string;
  fixed_box_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MachineStats {
  today: number;
  upcoming: number;
  total: number;
  cancel_rate: number;
}

export function useMachines() {
  return useQuery({
    queryKey: ["machines"],
    queryFn: async () => machinesApi.list(),
    select: (res) => res.data as MachineData[],
    staleTime: 60_000,
  });
}

export function useMachineStats(machineId: string) {
  return useQuery({
    queryKey: ["machine-stats", machineId],
    queryFn: async () => machinesApi.stats(machineId),
    select: (res) => res.data as MachineStats,
    enabled: !!machineId,
    staleTime: 30_000,
  });
}

export function useCreateMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MachineData>) => machinesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["machines"] });
      notifications.show({ title: "Máquina creada", message: "La máquina ha sido creada", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Error", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useUpdateMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MachineData> }) => machinesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["machines"] });
      notifications.show({ title: "Máquina actualizada", message: "Cambios guardados", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Error", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useDeleteMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => machinesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["machines"] });
      notifications.show({ title: "Máquina eliminada", message: "La máquina ha sido eliminada", color: "green" });
    },
  });
}
