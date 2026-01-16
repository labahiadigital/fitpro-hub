import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../services/api";

interface KPIs {
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

interface ChartDataPoint {
  label: string;
  value: number;
}

export function useKPIs() {
  return useQuery({
    queryKey: ["kpis"],
    queryFn: async () => {
      return reportsApi.kpis();
    },
    select: (response) => response.data as KPIs,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useRevenueChart(months = 6) {
  return useQuery({
    queryKey: ["revenue-chart", months],
    queryFn: async () => {
      return reportsApi.revenueChart(months);
    },
    select: (response) => response.data as ChartDataPoint[],
  });
}

export function useClientsChart(months = 6) {
  return useQuery({
    queryKey: ["clients-chart", months],
    queryFn: async () => {
      return reportsApi.clientsChart(months);
    },
    select: (response) => response.data as ChartDataPoint[],
  });
}
