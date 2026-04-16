import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boxesApi } from "../services/api";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export interface BoxData {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color_hex: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BoxStats {
  today: number;
  upcoming: number;
  total: number;
  cancel_rate: number;
}

export function useBoxes() {
  return useQuery({
    queryKey: ["boxes"],
    queryFn: async () => boxesApi.list(),
    select: (res) => res.data as BoxData[],
    staleTime: 10 * 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useBoxStats(boxId: string) {
  return useQuery({
    queryKey: ["box-stats", boxId],
    queryFn: async () => boxesApi.stats(boxId),
    select: (res) => res.data as BoxStats,
    enabled: !!boxId,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useCreateBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BoxData>) => boxesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boxes"] });
      notifications.show({ title: "Box creado", message: "El box ha sido creado", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Error", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useUpdateBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BoxData> }) => boxesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boxes"] });
      notifications.show({ title: "Box actualizado", message: "Cambios guardados", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Error", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useDeleteBox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boxesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boxes"] });
      notifications.show({ title: "Box eliminado", message: "El box ha sido eliminado", color: "green" });
    },
  });
}
