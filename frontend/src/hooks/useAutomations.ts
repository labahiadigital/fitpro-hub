import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

export interface AutomationAction {
  type:
    | "send_email"
    | "send_in_app"
    | "create_task"
    | "update_tag"
    | "webhook"
    | "send_form";
  config: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: any;
}

export interface Automation {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: Record<string, any>;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  stats: {
    total_runs: number;
    successful_runs: number;
    failed_runs: number;
    last_run_at?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  trigger_data: Record<string, any>;
  actions_executed: string[];
  status: "success" | "partial" | "failed";
  error_message?: string;
  executed_at: string;
}

export function useAutomations(params?: {
  is_active?: boolean;
  trigger_type?: string;
}) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["automations", currentWorkspace?.id, params],
    queryFn: async () => {
      const response = await api.get("/automations/", {
        params: { workspace_id: currentWorkspace?.id, ...params },
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useAutomation(id: string) {
  return useQuery({
    queryKey: ["automation", id],
    queryFn: async () => {
      const response = await api.get(`/automations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Automation>) => {
      const response = await api.post("/automations/", {
        ...data,
        workspace_id: currentWorkspace?.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Automation>;
    }) => {
      const response = await api.patch(`/automations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const response = await api.patch(`/automations/${id}`, { is_active });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });
}

export function useAutomationLogs(automationId: string) {
  return useQuery({
    queryKey: ["automation-logs", automationId],
    queryFn: async () => {
      const response = await api.get(`/automations/${automationId}/logs`);
      return response.data;
    },
    enabled: !!automationId,
  });
}

export function useTriggerTypes() {
  return [
    {
      group: "Clientes",
      items: [
        { value: "client_created", label: "Se crea un cliente" },
        { value: "client_inactive", label: "Cliente inactivo (X días)" },
        { value: "client_birthday", label: "Cumpleaños del cliente" },
      ],
    },
    {
      group: "Reservas",
      items: [
        { value: "booking_created", label: "Se crea una reserva" },
        { value: "booking_reminder", label: "Recordatorio de reserva" },
        { value: "booking_cancelled", label: "Se cancela una reserva" },
        { value: "booking_completed", label: "Se completa una sesión" },
        { value: "booking_no_show", label: "Cliente no asiste" },
      ],
    },
    {
      group: "Pagos",
      items: [
        { value: "payment_received", label: "Pago recibido" },
        { value: "payment_failed", label: "Pago fallido" },
        { value: "subscription_renewal", label: "Renovación próxima" },
        { value: "subscription_cancelled", label: "Suscripción cancelada" },
      ],
    },
    {
      group: "Contenido",
      items: [
        { value: "form_submitted", label: "Formulario enviado" },
        { value: "workout_completed", label: "Entrenamiento completado" },
        { value: "goal_achieved", label: "Objetivo alcanzado" },
      ],
    },
  ];
}

export function useActionTypes() {
  return [
    { value: "send_email", label: "Enviar email", icon: "mail" },
    { value: "send_in_app", label: "Enviar notificación in-app", icon: "bell" },
    { value: "create_task", label: "Crear tarea", icon: "clipboard" },
    { value: "send_form", label: "Enviar formulario", icon: "forms" },
    {
      value: "update_tag",
      label: "Actualizar etiqueta del cliente",
      icon: "tag",
    },
    { value: "webhook", label: "Llamar webhook externo", icon: "webhook" },
  ];
}
