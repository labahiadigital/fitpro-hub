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
  members: TeamGroupMember[];
  created_at: string;
  updated_at: string;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  color?: string;
}

export function useTeamGroupsList() {
  return useQuery({
    queryKey: ["team-groups"],
    queryFn: async () => api.get("/team/groups"),
    select: (response) => response.data as TeamGroup[],
    staleTime: 30_000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateGroupData) => api.post("/team/groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-groups"] });
      notifications.show({ title: "Grupo creado", message: "El grupo se ha creado correctamente", color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo crear el grupo", color: "red" });
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
      notifications.show({ title: "Error", message: "No se pudo actualizar el grupo", color: "red" });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/team/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-groups"] });
      notifications.show({ title: "Grupo eliminado", message: "El grupo se ha eliminado", color: "orange" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo eliminar el grupo", color: "red" });
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
      notifications.show({ title: "Error", message: "No se pudo añadir miembros", color: "red" });
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
      notifications.show({ title: "Error", message: "No se pudo quitar el miembro", color: "red" });
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
      notifications.show({ title: "Permisos actualizados", message: "Los permisos del grupo se han actualizado", color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo actualizar los permisos", color: "red" });
    },
  });
}
