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
  const { currentWorkspace, isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["products", currentWorkspace?.id, params],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: "1",
              workspace_id: currentWorkspace?.id,
              name: "Plan Premium",
              description: "Acceso completo a todos los servicios",
              product_type: "subscription",
              price: 149,
              currency: "EUR",
              interval: "month",
              interval_count: 1,
              trial_days: 7,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: "2",
              workspace_id: currentWorkspace?.id,
              name: "Plan Básico",
              description: "Acceso a entrenamientos básicos",
              product_type: "subscription",
              price: 79,
              currency: "EUR",
              interval: "month",
              interval_count: 1,
              trial_days: 0,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as Product[],
          total: 2,
          page: 1,
          size: 20,
        };
      }

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
  const { currentWorkspace, isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["session-packages", currentWorkspace?.id, params],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: "1",
              workspace_id: currentWorkspace?.id,
              name: "Bono 10 Sesiones",
              description: "Paquete de 10 sesiones de entrenamiento personal",
              total_sessions: 10,
              price: 450,
              currency: "EUR",
              validity_days: 90,
              session_types: ["personal_training"],
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: "2",
              workspace_id: currentWorkspace?.id,
              name: "Bono 5 Sesiones",
              description: "Paquete de 5 sesiones",
              total_sessions: 5,
              price: 250,
              currency: "EUR",
              validity_days: 60,
              session_types: ["personal_training", "group_class"],
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as SessionPackage[],
          total: 2,
          page: 1,
          size: 20,
        };
      }

      const response = await api.get("/products/packages/", {
        params: { workspace_id: currentWorkspace?.id, ...params },
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useClientPackages(clientId?: string) {
  const { currentWorkspace, isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["client-packages", currentWorkspace?.id, clientId],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: "1",
              workspace_id: currentWorkspace?.id,
              client_id: clientId,
              package_id: "1",
              total_sessions: 10,
              used_sessions: 3,
              remaining_sessions: 7,
              status: "active",
              purchased_at: new Date().toISOString(),
              expires_at: new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000
              ).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as ClientPackage[],
          total: 1,
          page: 1,
          size: 20,
        };
      }

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
  const { currentWorkspace, isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["coupons", currentWorkspace?.id, params],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: "1",
              workspace_id: currentWorkspace?.id,
              code: "WELCOME20",
              description: "20% de descuento para nuevos clientes",
              discount_type: "percentage",
              discount_value: 20,
              max_uses: 100,
              current_uses: 15,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as Coupon[],
          total: 1,
          page: 1,
          size: 20,
        };
      }

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
