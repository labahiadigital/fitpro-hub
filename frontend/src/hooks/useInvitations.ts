import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { notifications } from "@mantine/notifications";

export interface Invitation {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  token: string;
  expires_at: string;
  created_at: string;
  invitation_url: string;
}

export interface InvitationCreate {
  email: string;
  first_name?: string;
  last_name?: string;
  message?: string;
  expires_days?: number;
}

export function useInvitations(statusFilter?: string) {
  return useQuery({
    queryKey: ["invitations", statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status_filter=${statusFilter}` : "";
      const response = await api.get(`/invitations${params}`);
      return response.data as { items: Invitation[]; total: number };
    },
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InvitationCreate) => {
      const response = await api.post("/invitations", data);
      return response.data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
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
      const response = await api.post(`/invitations/${invitationId}/resend`);
      return response.data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
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
      await api.delete(`/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
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
