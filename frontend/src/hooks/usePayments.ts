import { useQuery } from "@tanstack/react-query";
import { api, paymentsApi } from "../services/api";

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
  amount: number;
  currency: string;
  status: "active" | "cancelled" | "past_due" | "trialing";
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
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => api.get("/products"),
    select: (response) => response.data as Product[],
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

export function useStripeStatus() {
  return useQuery({
    queryKey: ["stripe-status"],
    queryFn: async () => paymentsApi.accountStatus(),
    select: (response) => response.data,
  });
}
