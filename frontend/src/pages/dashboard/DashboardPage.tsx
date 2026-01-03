import {
  Avatar,
  Box,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowRight,
  IconTrendingUp,
  IconUsers,
  IconClock,
  IconChartBar,
} from "@tabler/icons-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { AlertsWidget } from "../../components/dashboard/AlertsWidget";
import { ClientGrowthChart } from "../../components/dashboard/ClientGrowthChart";
import { QuickActionsWidget } from "../../components/dashboard/QuickActionsWidget";
import { RevenueChart } from "../../components/dashboard/RevenueChart";
import { UpcomingSessionsWidget } from "../../components/dashboard/UpcomingSessionsWidget";
import { useAuthStore } from "../../stores/auth";

// --- COMPONENTES ULTRA-PREMIUM LOCALES ---

// 1. KPI "Hero" Card - Fluid responsive version
function HeroKPI({ title, value, change, data, gradientId }: any) {
  return (
    <Box 
      className="premium-card animate-in" 
      p={{ base: "md", lg: "lg", xl: "xl" }} 
      style={{ 
        position: "relative", 
        overflow: "hidden", 
        minHeight: "clamp(140px, 12vw, 200px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      <Group justify="space-between" align="flex-start" mb="xs">
        <Text className="stat-label">
          {title}
        </Text>
        <Box className="pill-badge" style={{
          background: change > 0 ? "var(--nv-success-bg)" : "var(--nv-error-bg)",
          color: change > 0 ? "var(--nv-success)" : "var(--nv-error)",
          fontSize: "clamp(10px, 0.7vw, 12px)",
          padding: "4px 10px"
        }}>
          {change > 0 ? "+" : ""}{change}%
        </Box>
      </Group>
      
      <Text className="stat-value" style={{ color: "var(--nv-dark)", marginBottom: "8px" }}>
        {value}
      </Text>

      {/* Gráfico ambiental de fondo */}
      <Box style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "clamp(50px, 5vw, 80px)", opacity: 0.4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId || "colorGradient"} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--nv-accent)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--nv-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--nv-accent)"
              strokeWidth={2}
              fill={`url(#${gradientId || "colorGradient"})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

// 2. Tarjeta de Lista "Glass" - Fluid responsive
function TransactionList() {
  const items = [
    { name: "Juan Pérez", amount: "+€149", date: "Hoy, 10:23 AM", icon: "J" },
    { name: "María Gómez", amount: "+€79", date: "Ayer", icon: "M" },
    { name: "Carlos Ruiz", amount: "+€29", date: "Ayer", icon: "C" },
  ];

  return (
    <Box className="premium-card animate-in delay-1" p={{ base: "sm", lg: "md", xl: "lg" }}>
      <Group justify="space-between" mb="sm">
        <Text className="stat-label">Actividad Reciente</Text>
        <UnstyledButton style={{ color: "var(--nv-slate-light)" }}>
          <IconArrowRight size={16} />
        </UnstyledButton>
      </Group>
      <Stack gap="xs">
        {items.map((item, i) => (
          <Group 
            key={i} 
            justify="space-between" 
            py="sm"
            style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
          >
            <Group gap="sm">
              <Avatar 
                radius="md" 
                size="md" 
                color="dark" 
                style={{ fontSize: "clamp(11px, 0.8vw, 14px)" }}
              >
                {item.icon}
              </Avatar>
              <Box>
                <Text size="sm" fw={600} style={{ color: "var(--nv-dark)" }}>{item.name}</Text>
                <Text size="xs" c="dimmed">{item.date}</Text>
              </Box>
            </Group>
            <Text fw={600} size="sm" style={{ color: "var(--nv-success)" }}>{item.amount}</Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}

// 3. Mapa de Calor / Distribución (Visual Only) - Fluid responsive
function StatsGrid() {
  return (
    <Box className="fluid-grid fluid-grid-2" style={{ gap: "var(--space-sm)" }}>
      <Box className="nv-card-compact animate-in delay-2" p={{ base: "sm", lg: "md" }} style={{ background: "var(--nv-dark-surface)", color: "white" }}>
        <Group gap="xs" mb="xs">
          <IconUsers size={16} color="var(--nv-accent)" />
          <Text className="stat-label" style={{ color: "var(--nv-slate-light)" }}>Usuarios Activos</Text>
        </Group>
        <Text size="lg" fw={700}>3,420</Text>
      </Box>
      <Box className="nv-card-compact animate-in delay-2" p={{ base: "sm", lg: "md" }}>
        <Group gap="xs" mb="xs">
          <IconChartBar size={16} color="var(--nv-primary)" />
          <Text className="stat-label">Conversión</Text>
        </Group>
        <Text size="lg" fw={700} style={{ color: "var(--nv-dark)" }}>4.2%</Text>
      </Box>
      <Box className="nv-card-compact animate-in delay-3" p={{ base: "sm", lg: "md" }}>
        <Group gap="xs" mb="xs">
          <IconClock size={16} color="var(--nv-slate)" />
          <Text className="stat-label">Tiempo Promedio</Text>
        </Group>
        <Text size="lg" fw={700} style={{ color: "var(--nv-dark)" }}>12m</Text>
      </Box>
      <Box className="nv-card-compact animate-in delay-3" p={{ base: "sm", lg: "md" }} style={{ background: "var(--nv-accent)", color: "var(--nv-dark)" }}>
        <Group gap="xs" mb="xs">
          <IconTrendingUp size={16} />
          <Text className="stat-label" style={{ opacity: 0.7 }}>Crecimiento</Text>
        </Group>
        <Text size="lg" fw={700}>+24%</Text>
      </Box>
    </Box>
  );
}

// --- MAIN PAGE ---

export function DashboardPage() {
  const { user } = useAuthStore();
  const chartData = [
    { value: 10 }, { value: 25 }, { value: 15 }, { value: 35 }, { value: 30 }, { value: 50 }, { value: 80 }
  ];

  // Datos para componentes importados
  const revenueData = [
    { month: "Ene", revenue: 8200, subscriptions: 7200, oneTime: 1000 },
    { month: "Feb", revenue: 9500, subscriptions: 8200, oneTime: 1300 },
    { month: "Mar", revenue: 10200, subscriptions: 8800, oneTime: 1400 },
    { month: "Abr", revenue: 11100, subscriptions: 9500, oneTime: 1600 },
    { month: "May", revenue: 11800, subscriptions: 10200, oneTime: 1600 },
    { month: "Jun", revenue: 12400, subscriptions: 10800, oneTime: 1600 },
  ];

  const alerts = [
    { id: "1", type: "payment_due" as const, title: "Pago pendiente", description: "María García - Vencido 3d", severity: "error" as const },
    { id: "2", type: "inactive_client" as const, title: "Cliente inactivo", description: "Carlos López - 14d", severity: "warning" as const },
  ];

  const sessions = [
    { id: "1", title: "Entrenamiento Personal", clientName: "María García", startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), type: "individual" as const, modality: "in_person" as const, status: "confirmed" as const, location: "Sala 1" },
    { id: "2", title: "Consulta Nutricional", clientName: "Carlos López", startTime: new Date(Date.now() + 7200000).toISOString(), endTime: new Date(Date.now() + 9000000).toISOString(), type: "individual" as const, modality: "online" as const, status: "pending" as const },
  ];

  return (
    <Box>
      {/* Header Text */}
      <Box mb={{ base: "lg", lg: "xl", xl: "2rem" }} className="animate-in">
        <Text className="page-title" mb="xs">
          Resumen
        </Text>
        <Text className="page-subtitle">
          Buenas tardes, {user?.full_name?.split(" ")[0]}. Tu negocio está rindiendo bien esta semana.
        </Text>
      </Box>

      {/* BENTO GRID LAYOUT - Fluido y responsive */}
      <Box className="dashboard-main-grid">
        {/* Columna Principal */}
        <Stack gap={{ base: "md", lg: "lg", xl: "xl" }}>
          {/* Fila de KPIs Gigantes */}
          <Box className="kpi-grid">
            <HeroKPI title="Ingresos Totales" value="€128.4k" change={12.5} data={chartData} gradientId="gradient1" />
            <HeroKPI title="Beneficio Neto" value="€84.2k" change={8.1} data={[{value: 20}, {value:40}, {value:30}, {value:60}, {value:90}]} gradientId="gradient2" />
          </Box>
          
          {/* Gráfico Principal de Ingresos */}
          <RevenueChart data={revenueData} currentMRR={12400} previousMRR={11800} currency="€" />
          
          {/* Widgets Operativos */}
          <Box className="widget-grid">
            <ClientGrowthChart totalClients={16601} newThisMonth={124} churnedThisMonth={12} />
            <AlertsWidget alerts={alerts} />
            <UpcomingSessionsWidget sessions={sessions} />
          </Box>
        </Stack>

        {/* Columna Lateral */}
        <Stack gap={{ base: "sm", lg: "md" }}>
          <TransactionList />
          <StatsGrid />
          <QuickActionsWidget />
        </Stack>
      </Box>
    </Box>
  );
}
