import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "../services/api";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";

export interface ServiceStaffItem {
  user_id: string;
  user_name?: string;
  is_primary: boolean;
}

export interface ServiceStockItem {
  stock_item_id: string;
  stock_item_name?: string;
  quantity: number;
}

export interface ServiceData {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration_minutes: number;
  tax_percentage: number;
  retention_percentage: number;
  default_box_id?: string;
  is_active: boolean;
  show_online: boolean;
  color_hex: string;
  machine_ids: string[];
  staff: ServiceStaffItem[];
  stock_consumption: ServiceStockItem[];
  created_at: string;
  updated_at: string;
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => servicesApi.list(),
    select: (res) => res.data as ServiceData[],
    staleTime: 60_000,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => servicesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      notifications.show({ title: "Servicio creado", message: "El servicio ha sido creado", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Error", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => servicesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      notifications.show({ title: "Servicio actualizado", message: "Cambios guardados", color: "green" });
    },
    onError: (e: unknown) => notifications.show({ title: "Error", message: getApiErrorMessage(e), color: "red" }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      notifications.show({ title: "Servicio eliminado", message: "El servicio ha sido eliminado", color: "green" });
    },
  });
}
