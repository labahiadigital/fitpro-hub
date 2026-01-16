import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

export interface Product {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  product_type: "subscription" | "one_time" | "package";
  price: number;
  currency: string;
  interval?: string;
  interval_count: number;
  trial_days: number;
  is_active: boolean;
  stripe_price_id?: string;
  stripe_product_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionPackage {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  total_sessions: number;
  price: number;
  currency: string;
  validity_days: number;
  session_types: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientPackage {
  id: string;
  workspace_id: string;
  client_id: string;
  package_id: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  status: "active" | "expired" | "exhausted" | "cancelled";
  purchased_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  workspace_id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses?: number;
  current_uses: number;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Products hooks
export function useProducts(params?: {
  product_type?: string;
  is_active?: boolean;
}) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["products", currentWorkspace?.id, params],
    queryFn: async () => {
      const response = await api.get("/products/", {
        params: { workspace_id: currentWorkspace?.id, ...params },
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const response = await api.post("/products/", {
        ...data,
        workspace_id: currentWorkspace?.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Product>;
    }) => {
      const response = await api.patch(`/products/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// Session Packages hooks
export function useSessionPackages(params?: { is_active?: boolean }) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["session-packages", currentWorkspace?.id, params],
    queryFn: async () => {
      const response = await api.get("/products/packages/", {
        params: { workspace_id: currentWorkspace?.id, ...params },
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useClientPackages(clientId?: string) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["client-packages", currentWorkspace?.id, clientId],
    queryFn: async () => {
      const response = await api.get("/products/client-packages/", {
        params: { workspace_id: currentWorkspace?.id, client_id: clientId },
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Coupons hooks
export function useCoupons(params?: { is_active?: boolean }) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["coupons", currentWorkspace?.id, params],
    queryFn: async () => {
      const response = await api.get("/products/coupons/", {
        params: { workspace_id: currentWorkspace?.id, ...params },
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useValidateCoupon() {
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { code: string; product_id?: string }) => {
      const response = await api.post("/products/coupons/validate", data, {
        params: { workspace_id: currentWorkspace?.id },
      });
      return response.data;
    },
  });
}
