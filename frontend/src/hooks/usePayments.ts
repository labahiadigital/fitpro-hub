import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paymentsApi, productsApi } from "../services/api";
import { useAuthStore } from "../stores/auth";
import { notifications } from "@mantine/notifications";

export interface Payment {
  id: string;
  client_id?: string;
  client_name?: string;
  description: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "refunded";
  payment_type: "subscription" | "one_time" | "package";
  created_at: string;
  paid_at?: string;
}

export interface Subscription {
  id: string;
  client_id?: string;
  client_name?: string;
  plan_name: string;
  name?: string;
  amount: number;
  currency: string;
  interval?: string;
  status: "active" | "cancelled" | "past_due" | "trialing";
  current_period_start?: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  type: "subscription" | "one_time" | "package";
  interval?: string;
  sessions_included?: number;
  is_active: boolean;
}

export interface PaymentKPIs {
  mrr: number;
  mrr_change: number;
  active_subscriptions: number;
  pending_payments: number;
  pending_amount: number;
  this_month_revenue: number;
  revenue_change: number;
}

export function usePayments(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ["payments", params],
    queryFn: async () => paymentsApi.payments(params),
    select: (response) => response.data as Payment[],
  });
}

export function useSubscriptions(params?: { status?: string }) {
  return useQuery({
    queryKey: ["subscriptions", params],
    queryFn: async () => paymentsApi.subscriptions(params),
    select: (response) => response.data as Subscription[],
  });
}

export function useProducts() {
  const { currentWorkspace } = useAuthStore();
  const workspaceId = currentWorkspace?.id || "";
  return useQuery({
    queryKey: ["products", workspaceId],
    queryFn: async () => productsApi.list(workspaceId),
    enabled: !!workspaceId,
    select: (response) => {
      const raw = response.data;
      const items = raw?.items || raw || [];
      return items.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency || "EUR",
        type: p.product_type || "subscription",
        interval: p.interval,
        sessions_included: p.sessions_included,
        is_active: p.is_active ?? true,
      })) as Product[];
    },
  });
}

export function usePaymentKPIs() {
  return useQuery({
    queryKey: ["payment-kpis"],
    queryFn: async () => api.get("/payments/kpis"),
    select: (response) =>
      response.data as PaymentKPIs,
  });
}

export interface StripeStatus {
  is_connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  balance?: {
    available: number;
    pending: number;
  };
  dashboard_url?: string;
}

export function useStripeStatus() {
  return useQuery({
    queryKey: ["stripe-status"],
    queryFn: async () => paymentsApi.accountStatus(),
    select: (response): StripeStatus => {
      const data = response.data;
      return {
        is_connected: data?.connected || false,
        onboarding_complete: data?.onboarding_complete || false,
        charges_enabled: data?.charges_enabled,
        payouts_enabled: data?.payouts_enabled,
        balance: data?.balance,
        dashboard_url: data?.dashboard_url,
      };
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; price: number; product_type: string; interval?: string; sessions_included?: number }) => {
      return productsApi.create({ ...data, workspace_id: currentWorkspace?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notifications.show({ title: "Producto creado", message: "El producto ha sido creado correctamente", color: "green" });
    },
    onError: (error: any) => {
      notifications.show({ title: "Error", message: error?.response?.data?.detail || "Error al crear producto", color: "red" });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      return productsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notifications.show({ title: "Producto actualizado", message: "El producto ha sido actualizado correctamente", color: "green" });
    },
    onError: (error: any) => {
      notifications.show({ title: "Error", message: error?.response?.data?.detail || "Error al actualizar producto", color: "red" });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return productsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notifications.show({ title: "Producto eliminado", message: "El producto ha sido eliminado correctamente", color: "green" });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail || "Error al eliminar producto";
      notifications.show({ title: "No se puede eliminar", message: detail, color: "red" });
    },
  });
}

export function useToggleProductActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return productsApi.update(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
