import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

export interface SupplierBankAccount {
  iban: string;
  bic?: string | null;
  notes?: string | null;
  is_default?: boolean;
}

export interface Supplier {
  id: string;
  workspace_id: string;
  tax_id?: string | null;
  legal_name: string;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  province?: string | null;
  country: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  default_discount_pct?: number | string | null;
  bank_accounts: SupplierBankAccount[];
  phone?: string | null;
  mobile?: string | null;
  fax?: string | null;
  email?: string | null;
  url?: string | null;
  custom_field_1?: string | null;
  custom_field_2?: string | null;
  notes?: string | null;
  tags: string[];
  is_active: boolean;
}

export type SupplierPayload = Partial<Omit<Supplier, "id" | "workspace_id">>;

export function useSuppliers(params?: { is_active?: boolean; search?: string }) {
  const { currentWorkspace } = useAuthStore();
  return useQuery({
    queryKey: ["suppliers", currentWorkspace?.id, params],
    queryFn: async () => {
      const response = await api.get<Supplier[]>("/suppliers", { params });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useSupplier(supplierId?: string) {
  return useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: async () => {
      const response = await api.get<Supplier>(`/suppliers/${supplierId}`);
      return response.data;
    },
    enabled: !!supplierId,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SupplierPayload) => {
      const response = await api.post<Supplier>("/suppliers", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierPayload }) => {
      const response = await api.patch<Supplier>(`/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier", variables.id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
