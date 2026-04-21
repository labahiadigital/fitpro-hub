import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

export interface Form {
  id: string;
  workspace_id: string | null;
  name: string;
  description?: string;
  form_type: "health" | "consent" | "assessment" | "survey" | "custom";
  fields: FormField[];
  is_active: boolean | string; // Backend may return "Y"/"N"
  is_required?: boolean;
  send_on_onboarding?: boolean;
  is_global?: boolean;
  submissions_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface FormField {
  id: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "phone"
    | "date"
    | "select"
    | "multiselect"
    | "checkbox"
    | "radio"
    | "file"
    | "signature";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order?: number;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface FormSubmission {
  id: string;
  workspace_id: string;
  form_id: string;
  client_id: string;
  responses: Record<string, any>;
  status: "pending" | "completed" | "expired";
  sent_at: string;
  submitted_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export function useForms(params?: { form_type?: string; is_active?: boolean }) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["forms", currentWorkspace?.id, params],
    queryFn: async () => {
      const response = await api.get("/forms", {
        params: { workspace_id: currentWorkspace?.id, ...params },
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useForm(id: string) {
  return useQuery({
    queryKey: ["form", id],
    queryFn: async () => {
      const response = await api.get(`/forms/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Form>) => {
      const response = await api.post("/forms", {
        ...data,
        workspace_id: currentWorkspace?.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Form> }) => {
      const response = await api.put(`/forms/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      queryClient.invalidateQueries({ queryKey: ["form", variables.id] });
    },
  });
}

export function useDeleteForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/forms/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useCopyForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/forms/${id}/copy`);
      return response.data as Form;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
  });
}

export function useFormSubmissions(formId?: string, clientId?: string) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["form-submissions", currentWorkspace?.id, formId, clientId],
    queryFn: async () => {
      const response = await api.get("/forms/submissions/", {
        params: {
          workspace_id: currentWorkspace?.id,
          form_id: formId,
          client_id: clientId,
        },
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpdateFormSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      status,
    }: {
      submissionId: string;
      status: string;
    }) => {
      const response = await api.patch(`/forms/submissions/${submissionId}`, {
        status,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
    },
  });
}

export function useSendForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { form_id: string; client_ids: string[] }) => {
      const response = await api.post(`/forms/${data.form_id}/send`, {
        client_ids: data.client_ids,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["client-forms"] });
      queryClient.invalidateQueries({ queryKey: ["my-forms"] });
    },
  });
}

// ============ CLIENT-FACING HOOKS ============

export interface ClientFormItem {
  submission_id: string;
  form_id: string;
  form_name: string;
  form_description?: string | null;
  form_type: string;
  fields: FormField[];
  status: "pending" | "submitted" | "expired";
  is_required: boolean;
  created_at: string;
  submitted_at?: string | null;
}

export function useMyForms(
  statusFilter?: "pending" | "submitted",
  options?: { enabled?: boolean }
) {
  return useQuery<ClientFormItem[]>({
    queryKey: ["my-forms", statusFilter],
    queryFn: async () => {
      const response = await api.get("/forms/my/pending", {
        params: statusFilter ? { status: statusFilter } : undefined,
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useMyPendingRequiredCount(options?: { enabled?: boolean }) {
  return useQuery<{ pending_required: number }>({
    queryKey: ["my-forms", "pending-required-count"],
    queryFn: async () => {
      const response = await api.get("/forms/my/pending/count");
      return response.data;
    },
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useRespondMyForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      answers,
      signature_data,
    }: {
      submissionId: string;
      answers: Record<string, unknown>;
      signature_data?: Record<string, unknown>;
    }) => {
      const response = await api.post(
        `/forms/my/submissions/${submissionId}/respond`,
        { answers, signature_data }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-forms"] });
    },
  });
}

// ============ TRAINER: client-scoped form submissions ============

export function useClientForms(clientId?: string) {
  const { currentWorkspace } = useAuthStore();
  return useQuery({
    queryKey: ["client-forms", currentWorkspace?.id, clientId],
    queryFn: async () => {
      const response = await api.get("/forms/submissions/", {
        params: {
          workspace_id: currentWorkspace?.id,
          client_id: clientId,
        },
      });
      return response.data as Array<{
        id: string;
        form_id: string;
        client_id: string;
        status: "pending" | "submitted" | "expired";
        answers: Record<string, unknown>;
        created_at: string;
        submitted_at?: string | null;
        signature_data?: Record<string, unknown> | null;
      }>;
    },
    enabled: !!currentWorkspace?.id && !!clientId,
  });
}
