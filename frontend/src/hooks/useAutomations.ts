import i18next from "i18next";
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
      const response = await api.get("/automations", {
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
      const response = await api.post("/automations", {
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
      group: i18next.t("automations.clientes"),
      items: [
        { value: "client_created", label: i18next.t("automations.seCreaUnCliente") },
        { value: "client_inactive", label: i18next.t("automations.clienteInactivo") },
        { value: "client_birthday", label: i18next.t("automations.cumpleanos") },
      ],
    },
    {
      group: i18next.t("automations.reservas"),
      items: [
        { value: "booking_created", label: i18next.t("automations.seCreaReserva") },
        { value: "booking_reminder", label: i18next.t("automations.recordatorioReserva") },
        { value: "booking_cancelled", label: i18next.t("automations.seCancelaReserva") },
        { value: "booking_completed", label: i18next.t("automations.seCompletaSesion") },
        { value: "booking_no_show", label: i18next.t("automations.clienteNoAsiste") },
      ],
    },
    {
      group: i18next.t("automations.pagos"),
      items: [
        { value: "payment_received", label: i18next.t("automations.pagoRecibido") },
        { value: "payment_failed", label: i18next.t("automations.pagoFallido") },
        { value: "subscription_renewal", label: i18next.t("automations.renovacionProxima") },
        { value: "subscription_cancelled", label: i18next.t("hooks.subscriptionCanceled") },
      ],
    },
    {
      group: i18next.t("automations.contenido"),
      items: [
        { value: "form_submitted", label: i18next.t("automations.formularioEnviado") },
        { value: "workout_completed", label: i18next.t("automations.entrenamientoCompletado") },
        { value: "goal_achieved", label: i18next.t("automations.objetivoAlcanzado") },
      ],
    },
  ];
}

export function useActionTypes() {
  return [
    { value: "send_email", label: i18next.t("automations.enviarEmail"), icon: "mail" },
    { value: "send_in_app", label: i18next.t("automations.enviarNotificacion"), icon: "bell" },
    { value: "create_task", label: i18next.t("automations.crearTarea"), icon: "clipboard" },
    { value: "send_form", label: i18next.t("automations.enviarFormulario"), icon: "forms" },
    {
      value: "update_tag",
      label: i18next.t("automations.actualizarEtiqueta"),
      icon: "tag",
    },
    { value: "webhook", label: i18next.t("automations.llamarWebhook"), icon: "webhook" },
  ];
}
