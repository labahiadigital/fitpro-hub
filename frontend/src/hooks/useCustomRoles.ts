import i18next from "i18next";
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
      notifications.show({ title: i18next.t("hooks.roleCreated"), message: i18next.t("hooks.roleCreatedMsg"), color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.roleCreateFailed"), color: "red" });
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
      notifications.show({ title: i18next.t("hooks.roleUpdated"), message: i18next.t("hooks.itemChangesSaved"), color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.roleUpdateFailed"), color: "red" });
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
      notifications.show({ title: i18next.t("hooks.roleDeleted"), message: i18next.t("hooks.roleDeletedMsg"), color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.roleDeleteFailed"), color: "red" });
    },
  });
}
