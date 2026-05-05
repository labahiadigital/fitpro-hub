import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

/**
 * Hooks para los segmentos de la nueva pestaña *Clientes* (carrito
 * abandonado, inactivos, pendiente formulario, seguimiento).
 *
 * Cada segmento tiene su propio endpoint en el backend con datos
 * específicos del flujo (last_email_sent_at, marketing_consent...),
 * por lo que separamos los hooks aquí para evitar contaminar
 * `useClients` que se usa en muchos sitios.
 */

export interface SegmentClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  full_name: string;
  last_payment_at: string | null;
  subscription_cancelled_at: string | null;
  marketing_consent: boolean | null;
  pending_submission_id: string | null;
}

export interface AbandonedCartItem {
  invitation_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  product_name: string | null;
  product_amount: number | null;
  invited_at: string;
  expires_at: string;
  last_email_sent_at: string | null;
  last_email_subject: string | null;
  last_email_status: string | null;
  marketing_consent: boolean | null;
}

export interface InvitationTrackingItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  last_email_sent_at: string | null;
  last_email_subject: string | null;
  last_email_status: string | null;
  last_email_event_at: string | null;
}

export function usePendingSystemFormClients() {
  return useQuery({
    queryKey: ["clients", "segment", "pending-system-form"],
    queryFn: async () => {
      const res = await api.get<SegmentClient[]>("/clients/segments/pending-system-form");
      return res.data;
    },
  });
}

export function useInactiveSubscriptionClients(marketingOnly?: boolean | null) {
  return useQuery({
    queryKey: ["clients", "segment", "inactive-subscription", marketingOnly],
    queryFn: async () => {
      const params = marketingOnly === null || marketingOnly === undefined
        ? {}
        : { marketing_only: marketingOnly };
      const res = await api.get<SegmentClient[]>("/clients/segments/inactive-subscription", { params });
      return res.data;
    },
  });
}

export function useAbandonedCart(marketingOnly?: boolean | null) {
  return useQuery({
    queryKey: ["clients", "segment", "abandoned-cart", marketingOnly],
    queryFn: async () => {
      const params = marketingOnly === null || marketingOnly === undefined
        ? {}
        : { marketing_only: marketingOnly };
      const res = await api.get<AbandonedCartItem[]>("/clients/segments/abandoned-cart", { params });
      return res.data;
    },
  });
}

export function useInvitationsTracking() {
  return useQuery({
    queryKey: ["clients", "segment", "tracking"],
    queryFn: async () => {
      const res = await api.get<InvitationTrackingItem[]>("/clients/segments/tracking");
      return res.data;
    },
  });
}

export function useResendSystemForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const res = await api.post(`/clients/${clientId}/resend-system-form`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", "segment", "pending-system-form"] });
      notifications.show({
        title: "Email reenviado",
        message: "Se ha reenviado el correo de bienvenida con el cuestionario inicial.",
        color: "green",
      });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: "Error",
        message: err?.response?.data?.detail || "No se pudo reenviar el email.",
        color: "red",
      });
    },
  });
}

// Plantillas de campaña + envío
export interface CampaignTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  target_segment: string;
  discount_type: string | null;
  discount_value: number | null;
  discount_code: string | null;
  is_active: boolean;
  created_at: string;
}

export function useCampaignTemplates(targetSegment?: string) {
  return useQuery({
    queryKey: ["email-templates", targetSegment ?? "all"],
    queryFn: async () => {
      const params = targetSegment ? { target_segment: targetSegment } : {};
      const res = await api.get<CampaignTemplate[]>("/email-templates", { params });
      return res.data;
    },
  });
}

export function useCreateCampaignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CampaignTemplate, "id" | "created_at">) => {
      const res = await api.post<CampaignTemplate>("/email-templates", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useUpdateCampaignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CampaignTemplate> }) => {
      const res = await api.put<CampaignTemplate>(`/email-templates/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useDeleteCampaignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/email-templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      template_id: string;
      recipient_client_ids?: string[];
      recipient_invitation_ids?: string[];
    }) => {
      const res = await api.post<{ sent: number; failed: number; total: number }>(
        "/email-campaigns/send",
        data,
      );
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients", "segment"] });
      notifications.show({
        title: "Campaña enviada",
        message: `${data.sent} de ${data.total} envíos correctos${data.failed > 0 ? ` (${data.failed} fallaron)` : ""}.`,
        color: data.failed === 0 ? "green" : "orange",
      });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: "Error",
        message: err?.response?.data?.detail || "No se pudo enviar la campaña.",
        color: "red",
      });
    },
  });
}
