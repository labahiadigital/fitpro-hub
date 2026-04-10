import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customRolesApi } from "../services/api";

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  color?: string;
  is_system: boolean;
  permissions: Record<string, string[]>;
}

export function useCustomRoles() {
  return useQuery<CustomRole[]>({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const response = await customRolesApi.list();
      return response.data || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateCustomRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string; permissions: Record<string, string[]> }) => {
      const response = await customRolesApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles"] });
      notifications.show({ title: "Rol creado", message: "El rol se ha creado correctamente", color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo crear el rol", color: "red" });
    },
  });
}

export function useUpdateCustomRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; color?: string; permissions?: Record<string, string[]> }) => {
      const response = await customRolesApi.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles"] });
      notifications.show({ title: "Rol actualizado", message: "Los cambios se han guardado", color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo actualizar el rol", color: "red" });
    },
  });
}

export function useDeleteCustomRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await customRolesApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles"] });
      notifications.show({ title: "Rol eliminado", message: "El rol se ha eliminado correctamente", color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo eliminar el rol", color: "red" });
    },
  });
}
