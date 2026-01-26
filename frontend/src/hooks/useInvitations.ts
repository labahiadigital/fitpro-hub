import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "../services/api";
import { notifications } from "@mantine/notifications";

export interface Invitation {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  created_at: string;
}

export interface InvitationCreate {
  email: string;
  first_name?: string;
  last_name?: string;
  message?: string;
}

export function useInvitations(statusFilter?: string) {
  return useQuery({
    queryKey: ["client-invitations", statusFilter],
    queryFn: async () => {
      const response = await clientsApi.listInvitations(statusFilter);
      return response.data as Invitation[];
    },
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InvitationCreate) => {
      const response = await clientsApi.sendInvitation(data);
      return response.data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-invitations"] });
      notifications.show({
        title: "Invitación enviada",
        message: "El cliente recibirá un email con el enlace de registro",
        color: "green",
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al enviar la invitación",
        color: "red",
      });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await clientsApi.resendInvitation(invitationId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-invitations"] });
      notifications.show({
        title: "Invitación reenviada",
        message: "Se ha enviado un nuevo email al cliente",
        color: "green",
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al reenviar la invitación",
        color: "red",
      });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      await clientsApi.cancelInvitation(invitationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-invitations"] });
      notifications.show({
        title: "Invitación cancelada",
        message: "La invitación ha sido cancelada",
        color: "blue",
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al cancelar la invitación",
        color: "red",
      });
    },
  });
}
