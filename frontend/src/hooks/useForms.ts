import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

export interface Form {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  form_type: "health" | "consent" | "assessment" | "survey" | "custom";
  fields: FormField[];
  is_active: boolean;
  is_required: boolean;
  send_on_onboarding: boolean;
  submissions_count: number;
  created_at: string;
  updated_at: string;
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
      const response = await api.get("/forms/", {
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
      const response = await api.post("/forms/", {
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

export function useSendForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { form_id: string; client_ids: string[] }) => {
      const response = await api.post("/forms/send", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
    },
  });
}
