import i18next from "i18next";
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
  product_id?: string;
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
        title: i18next.t("hooks.invitationSent"),
        message: i18next.t("hooks.invitationSentMsg"),
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
        title: i18next.t("hooks.invitationResent"),
        message: i18next.t("hooks.invitationResentMsg"),
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
        title: i18next.t("hooks.invitationCanceled"),
        message: i18next.t("hooks.invitationCanceledMsg"),
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
