import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

// Types based on backend KPIResponse
export interface DashboardKPIs {
  active_clients: number;
  total_clients: number;
  upcoming_sessions: number;
  completed_sessions_month: number;
  mrr: number;
  arpa: number;
  churn_rate: number;
  revenue_this_month: number;
  revenue_last_month: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface Alert {
  id: string;
  type: "inactive_client" | "payment_due" | "renewal_soon" | "goal_achieved";
  title: string;
  description: string;
  severity: "info" | "warning" | "error" | "success";
  client_id?: string;
  created_at?: string;
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => api.get("/reports/kpis"),
    select: (response) => response.data as DashboardKPIs,
    staleTime: 30000, // 30 seconds
  });
}

export function useRevenueChart(months = 6) {
  return useQuery({
    queryKey: ["revenue-chart", months],
    queryFn: async () => api.get(`/reports/revenue-chart?months=${months}`),
    select: (response) => response.data as ChartDataPoint[],
    staleTime: 60000, // 1 minute
  });
}

export function useClientsChart(months = 6) {
  return useQuery({
    queryKey: ["clients-chart", months],
    queryFn: async () => api.get(`/reports/clients-chart?months=${months}`),
    select: (response) => response.data as ChartDataPoint[],
    staleTime: 60000, // 1 minute
  });
}

// Get today's sessions
export function useTodaySessions() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  return useQuery({
    queryKey: ["today-sessions"],
    queryFn: async () =>
      api.get(`/bookings?start_date=${startOfDay}&end_date=${endOfDay}`),
    select: (response) => response.data || [],
    staleTime: 30000,
  });
}

// Get alerts (clients without activity, payments due, etc.)
export function useDashboardAlerts() {
  return useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => api.get("/notifications/alerts"),
    select: (response) => response.data as Alert[],
    staleTime: 60000,
  });
}

// Get recent clients
export function useRecentClients(limit = 5) {
  return useQuery({
    queryKey: ["recent-clients", limit],
    queryFn: async () => api.get(`/clients?page=1&page_size=${limit}`),
    select: (response) => response.data?.items || [],
    staleTime: 30000,
  });
}
