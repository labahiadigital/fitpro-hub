import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { usersApi } from "../services/api";
import { notifications } from "@mantine/notifications";

export interface TeamMember {
  id: string;
  user_id: string;
  workspace_id: string;
  name?: string;
  full_name?: string;
  email: string;
  role: "owner" | "collaborator" | "client";
  avatar_url?: string;
  is_active: boolean;
  permissions?: {
    clients?: boolean;
    calendar?: boolean;
    payments?: boolean;
    reports?: boolean;
    settings?: boolean;
  };
  created_at: string;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      try {
        return await api.get("/workspaces/members");
      } catch {
        return { data: [] };
      }
    },
    select: (response) => response.data as TeamMember[],
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; role: string; send_email?: boolean }) => {
      const response = await usersApi.invite({
        email: data.email,
        role: data.role === "admin" ? "collaborator" : data.role,
        ...({ send_email: data.send_email ?? true } as Record<string, unknown>),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      notifications.show({
        title: "Invitación enviada",
        message: "Se ha enviado la invitación por email correctamente",
        color: "green",
      });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: "Error al enviar invitación",
        message: error.response?.data?.detail || "No se pudo enviar la invitación",
        color: "red",
      });
    },
  });
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { userId: string; role?: string; permissions?: Record<string, boolean>; assigned_clients?: string[] }) => {
      const response = await api.put(`/users/${data.userId}/role`, {
        role: data.role,
        permissions: data.permissions,
        assigned_clients: data.assigned_clients,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      notifications.show({
        title: "Permisos actualizados",
        message: "Los permisos del miembro se han actualizado correctamente",
        color: "green",
      });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: "Error al actualizar permisos",
        message: error.response?.data?.detail || "No se pudieron actualizar los permisos",
        color: "red",
      });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await usersApi.remove(userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      notifications.show({
        title: "Miembro eliminado",
        message: "El miembro ha sido eliminado del equipo",
        color: "green",
      });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: "Error al eliminar miembro",
        message: error.response?.data?.detail || "No se pudo eliminar al miembro",
        color: "red",
      });
    },
  });
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await usersApi.invite({
        email: data.email,
        role: data.role === "admin" ? "collaborator" : data.role,
        ...({ send_email: true } as Record<string, unknown>),
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Invitación reenviada",
        message: "Se ha reenviado la invitación por email",
        color: "green",
      });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: "Error al reenviar",
        message: error.response?.data?.detail || "No se pudo reenviar la invitación",
        color: "red",
      });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      try {
        return await api.get("/roles");
      } catch {
        return { data: [
          { id: "owner", name: "Propietario" },
          { id: "collaborator", name: "Colaborador" },
          { id: "client", name: "Cliente" }
        ]};
      }
    },
    select: (response) => response.data,
  });
}
