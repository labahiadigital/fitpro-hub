import i18next from "i18next";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export interface TeamGroupMember {
  id: string;
  group_id: string;
  user_id: string;
}

export interface TeamGroup {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color?: string;
  permissions: Record<string, string[]>;
  custom_role_id?: string;
  assigned_clients?: string[];
  members: TeamGroupMember[];
  created_at: string;
  updated_at: string;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  color?: string;
  custom_role_id?: string;
  assigned_clients?: string[];
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  color?: string;
}

export function useTeamGroupsList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["team-groups"],
    queryFn: async () => api.get("/team/groups"),
    select: (response) => response.data as TeamGroup[],
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateGroupData) => api.post("/team/groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-groups"] });
      notifications.show({ title: i18next.t("hooks.groupCreated"), message: i18next.t("hooks.groupCreatedMsg"), color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.groupCreateFailed"), color: "red" });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateGroupData & { id: string }) =>
      api.patch(`/team/groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-groups"] });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.groupUpdateFailed"), color: "red" });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/team/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-groups"] });
      notifications.show({ title: i18next.t("hooks.groupDeleted"), message: i18next.t("hooks.groupDeletedMsg"), color: "orange" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.groupDeleteFailed"), color: "red" });
    },
  });
}

export function useAddGroupMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: string; userIds: string[] }) =>
      api.post(`/team/groups/${groupId}/members`, { user_ids: userIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-groups"] });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.addMembersFailed"), color: "red" });
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.delete(`/team/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-groups"] });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.removeMemberFailed"), color: "red" });
    },
  });
}

export function useUpdateGroupPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, permissions }: { groupId: string; permissions: Record<string, string[]> }) =>
      api.patch(`/team/groups/${groupId}/permissions`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-groups"] });
      notifications.show({ title: i18next.t("hooks.permissionsUpdated"), message: i18next.t("hooks.groupPermissionsUpdated"), color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: i18next.t("hooks.groupPermissionsUpdateFailed"), color: "red" });
    },
  });
}
