import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

// Types
export type MessageSource = "platform" | "whatsapp";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";
export type MessageType = "text" | "image" | "voice" | "file" | "template";

export type ChatScope = "client" | "internal";

export interface Conversation {
  id: string;
  workspace_id: string;
  client_id?: string;
  name?: string;
  conversation_type: "direct" | "group" | "broadcast";
  participant_ids: string[];
  whatsapp_phone?: string;
  whatsapp_profile_name?: string;
  preferred_channel: MessageSource;
  last_message_at?: string;
  last_message_preview?: string;
  last_message_source?: MessageSource;
  unread_count: number;
  is_archived: boolean;
  created_at: string;
  client_name?: string;
  client_avatar_url?: string;
  scope?: ChatScope;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id?: string;
  source: MessageSource;
  direction: MessageDirection;
  message_type: MessageType;
  content?: string;
  media_url?: string;
  media_metadata?: Record<string, unknown>;
  external_id?: string;
  external_status: MessageStatus;
  external_error?: string | null;
  read_by: string[];
  is_sent: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface SendMessageData {
  conversation_id: string;
  message_type?: MessageType;
  content?: string;
  media_url?: string;
  send_via?: MessageSource;
}

// Hooks

export function useConversations(scope?: ChatScope) {
  const qs = scope ? `?scope=${scope}` : "";
  return useQuery({
    queryKey: ["conversations", scope],
    queryFn: async () => api.get(`/messages/conversations${qs}`),
    select: (response) => response.data as Conversation[],
    staleTime: 15 * 1000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      return api.get(`/messages/conversations/${conversationId}`);
    },
    select: (response) => response?.data as Conversation | null,
    enabled: !!conversationId,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return { data: [] };
      return api.get(`/messages/conversations/${conversationId}/messages`);
    },
    select: (response) => response.data as Message[],
    enabled: !!conversationId,
    staleTime: 5 * 1000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await api.post<Message>("/messages", data);
      return response.data;
    },
    onSuccess: (message, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // El backend devuelve 200 aunque el envío a WhatsApp haya fallado: el
      // mensaje se guarda local, pero `external_status === "failed"` indica
      // que WhatsApp/Meta lo rechazó. Avisamos explícitamente.
      if (message?.external_status === "failed") {
        notifications.show({
          title: "No se pudo enviar por WhatsApp",
          message:
            message.external_error ||
            "El mensaje se guardó en la plataforma pero WhatsApp no lo aceptó. Revisa si el cliente ha iniciado conversación contigo o si necesitas usar una plantilla aprobada.",
          color: "red",
          autoClose: 8000,
        });
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al enviar mensaje",
        color: "red",
      });
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      client_id?: string;
      name?: string;
      scope?: ChatScope;
      participant_ids?: string[];
      conversation_type?: "direct" | "group" | "broadcast";
    }) => api.post("/messages/conversations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al crear conversación",
        color: "red",
      });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) =>
      api.post(`/messages/conversations/${conversationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Helper to get source icon/label
export function getSourceInfo(source: MessageSource) {
  switch (source) {
    case "whatsapp":
      return { icon: "📱", label: "WhatsApp", color: "green" };
    case "platform":
    default:
      return { icon: "💬", label: "Plataforma", color: "blue" };
  }
}

// Helper to get status info
export function getStatusInfo(status: MessageStatus) {
  switch (status) {
    case "pending":
      return { icon: "⏳", label: "Enviando..." };
    case "sent":
      return { icon: "✓", label: "Enviado" };
    case "delivered":
      return { icon: "✓✓", label: "Entregado" };
    case "read":
      return { icon: "✓✓", label: "Leído", color: "blue" };
    case "failed":
      return { icon: "❌", label: "Fallido", color: "red" };
    default:
      return { icon: "", label: "" };
  }
}
