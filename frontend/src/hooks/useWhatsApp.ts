import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

// Types
export interface WhatsAppStatus {
  connected: boolean;
  phone_number_id: string | null;
  display_phone_number: string | null;
  business_account_id: string | null;
  connected_at: string | null;
  kapso_customer_id: string | null;
}

export interface WhatsAppSetupResponse {
  setup_url: string;
  expires_at: string | null;
}

// ============ HOOKS ============

/**
 * Hook para obtener el estado de conexión de WhatsApp
 */
export function useWhatsAppStatus() {
  return useQuery({
    queryKey: ["whatsapp", "status"],
    queryFn: async () => {
      const response = await api.get("/whatsapp/status");
      return response.data as WhatsAppStatus;
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: (query) => {
      // Si no está conectado, hacer polling cada 5 segundos para detectar conexión
      const data = query.state.data as WhatsAppStatus | undefined;
      if (data && !data.connected && data.kapso_customer_id) {
        return 5000;
      }
      return false;
    },
  });
}

/**
 * Hook para iniciar el proceso de conexión de WhatsApp
 * Devuelve la URL del setup link
 */
export function useConnectWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/whatsapp/setup");
      return response.data as WhatsAppSetupResponse;
    },
    onSuccess: () => {
      // Invalidar el status para que empiece el polling
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "status"] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Error al iniciar conexión de WhatsApp";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    },
  });
}

/**
 * Hook para desconectar WhatsApp
 */
export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/whatsapp/disconnect");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "status"] });
      notifications.show({
        title: "WhatsApp desconectado",
        message: "Tu cuenta de WhatsApp Business ha sido desconectada",
        color: "blue",
      });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.message ||
        "Error al desconectar WhatsApp";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    },
  });
}

/**
 * Helper para abrir el popup de configuración de WhatsApp
 */
export function openWhatsAppSetupPopup(setupUrl: string): Window | null {
  const width = 600;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  return window.open(
    setupUrl,
    "whatsapp-setup",
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

/**
 * Helper para formatear número de teléfono
 */
export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return "";

  // Si ya tiene formato, devolverlo
  if (phone.startsWith("+")) return phone;

  // Añadir + si no lo tiene
  return `+${phone}`;
}

/**
 * Helper para obtener el tiempo desde la conexión
 */
export function getConnectionTime(connectedAt: string | null): string {
  if (!connectedAt) return "";

  const date = new Date(connectedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Conectado hoy";
  if (diffDays === 1) return "Conectado ayer";
  if (diffDays < 7) return `Conectado hace ${diffDays} días`;
  if (diffDays < 30) return `Conectado hace ${Math.floor(diffDays / 7)} semanas`;

  return `Conectado el ${date.toLocaleDateString("es-ES")}`;
}
