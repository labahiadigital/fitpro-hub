import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../services/api";
import { useAuthStore } from "../stores/auth";

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

// Datos mock para modo demo
const mockKPIs: KPIs = {
  active_clients: 62,
  total_clients: 78,
  upcoming_sessions: 4,
  completed_sessions_month: 87,
  mrr: 4200,
  arpa: 68,
  churn_rate: 3,
  revenue_this_month: 4850,
  revenue_last_month: 4200,
};

export function useKPIs() {
  const { isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["kpis", isDemoMode],
    queryFn: async () => {
      // En modo demo, devolver datos mock
      if (isDemoMode) {
        return { data: mockKPIs };
      }
      return reportsApi.kpis();
    },
    select: (response) => response.data as KPIs,
    refetchInterval: isDemoMode ? false : 5 * 60 * 1000, // No refetch en demo
  });
}

// Mock data para gráficos en modo demo
const mockRevenueChart: ChartDataPoint[] = [
  { label: "Jul 2024", value: 3200 },
  { label: "Aug 2024", value: 3500 },
  { label: "Sep 2024", value: 3800 },
  { label: "Oct 2024", value: 4100 },
  { label: "Nov 2024", value: 4200 },
  { label: "Dec 2024", value: 4850 },
];

const mockClientsChart: ChartDataPoint[] = [
  { label: "Jul 2024", value: 45 },
  { label: "Aug 2024", value: 52 },
  { label: "Sep 2024", value: 58 },
  { label: "Oct 2024", value: 65 },
  { label: "Nov 2024", value: 72 },
  { label: "Dec 2024", value: 78 },
];

export function useRevenueChart(months = 6) {
  const { isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["revenue-chart", months, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return { data: mockRevenueChart.slice(-months) };
      }
      return reportsApi.revenueChart(months);
    },
    select: (response) => response.data as ChartDataPoint[],
  });
}

export function useClientsChart(months = 6) {
  const { isDemoMode } = useAuthStore();

  return useQuery({
    queryKey: ["clients-chart", months, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return { data: mockClientsChart.slice(-months) };
      }
      return reportsApi.clientsChart(months);
    },
    select: (response) => response.data as ChartDataPoint[],
  });
}
