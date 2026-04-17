import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, usersApi } from "../services/api";
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
  permissions?: Record<string, string[]>;
  custom_permissions?: Record<string, string[]>;
  assigned_clients?: string[];
  created_at: string;
}

function mapUIRoleToBackend(uiRole: string): "owner" | "collaborator" | "client" {
  if (uiRole === "client") return "client";
  if (uiRole === "owner") return "owner";
  return "collaborator";
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { detail?: string | unknown[] } } };
  const detail = err?.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

export function useTeamMembers(options?: { enabled?: boolean }) {
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
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      role: string;
      send_email?: boolean;
      permissions?: Record<string, string[]>;
      assigned_clients?: string[];
    }) => {
      const response = await usersApi.invite({
        email: data.email,
        role: mapUIRoleToBackend(data.role),
        ...({ send_email: data.send_email ?? true } as Record<string, unknown>),
        ...(data.permissions ? { permissions: data.permissions } : {}),
        ...(data.assigned_clients?.length ? { assigned_clients: data.assigned_clients } : {}),
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
    onError: (error: unknown) => {
      notifications.show({
        title: "Error al enviar invitación",
        message: extractErrorMessage(error, "No se pudo enviar la invitación"),
        color: "red",
      });
    },
  });
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      role?: string;
      permissions?: Record<string, string[]>;
      assigned_clients?: string[];
    }) => {
      const payload: Record<string, unknown> = {};
      if (data.role) {
        payload.role = mapUIRoleToBackend(data.role);
      }
      if (data.permissions) {
        payload.permissions = data.permissions;
      }
      if (data.assigned_clients !== undefined) {
        payload.assigned_clients = data.assigned_clients;
      }
      const response = await api.put(`/users/${data.userId}/role`, payload);
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
    onError: (error: unknown) => {
      notifications.show({
        title: "Error al actualizar permisos",
        message: extractErrorMessage(error, "No se pudieron actualizar los permisos"),
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
    onError: (error: unknown) => {
      notifications.show({
        title: "Error al eliminar miembro",
        message: extractErrorMessage(error, "No se pudo eliminar al miembro"),
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
        role: mapUIRoleToBackend(data.role),
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
    onError: (error: unknown) => {
      notifications.show({
        title: "Error al reenviar",
        message: extractErrorMessage(error, "No se pudo reenviar la invitación"),
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
