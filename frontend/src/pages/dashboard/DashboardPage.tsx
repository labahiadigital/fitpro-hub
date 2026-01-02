import {
  Avatar,
  Box,
  Grid,
  Group,
  SimpleGrid,
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
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { KPICard } from "../../components/common/StatsCard";
import { AlertsWidget } from "../../components/dashboard/AlertsWidget";
import { ClientGrowthChart } from "../../components/dashboard/ClientGrowthChart";
import { QuickActionsWidget } from "../../components/dashboard/QuickActionsWidget";
import { RevenueChart } from "../../components/dashboard/RevenueChart";
import { UpcomingSessionsWidget } from "../../components/dashboard/UpcomingSessionsWidget";
import { useAuthStore } from "../../stores/auth";

// --- COMPONENTES ULTRA-PREMIUM LOCALES ---

// 1. KPI "Hero" Card - Compact version
function HeroKPI({ title, value, change, data }: any) {
  return (
    <Box className="premium-card animate-in" p="md" style={{ position: "relative", overflow: "hidden", minHeight: 140 }}>
      <Group justify="space-between" align="flex-start" mb="xs">
        <Text className="stat-label" style={{ fontSize: "10px" }}>
          {title}
        </Text>
        <Box className="pill-badge" style={{
          background: change > 0 ? "var(--nv-success-bg)" : "var(--nv-error-bg)",
          color: change > 0 ? "var(--nv-success)" : "var(--nv-error)",
          fontSize: "10px",
          padding: "2px 8px"
        }}>
          {change > 0 ? "+" : ""}{change}%
        </Box>
      </Group>
      
      <Text className="stat-value" style={{ color: "var(--nv-dark)", fontSize: "1.75rem", marginBottom: "8px" }}>
        {value}
      </Text>

      {/* Gráfico ambiental de fondo */}
      <Box style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50px", opacity: 0.4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--nv-accent)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--nv-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--nv-accent)"
              strokeWidth={2}
              fill="url(#colorGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

// 2. Tarjeta de Lista "Glass" - Compact
function TransactionList() {
  const items = [
    { name: "Juan Pérez", amount: "+€149", date: "Hoy, 10:23 AM", icon: "J" },
    { name: "María Gómez", amount: "+€79", date: "Ayer", icon: "M" },
    { name: "Carlos Ruiz", amount: "+€29", date: "Ayer", icon: "C" },
  ];

  return (
    <Box className="premium-card animate-in delay-1" p="sm">
      <Group justify="space-between" mb="xs">
        <Text className="stat-label" style={{ fontSize: "10px" }}>Actividad Reciente</Text>
        <UnstyledButton style={{ color: "var(--nv-slate-light)" }}>
          <IconArrowRight size={14} />
        </UnstyledButton>
      </Group>
      <Stack gap={4}>
        {items.map((item, i) => (
          <Group 
            key={i} 
            justify="space-between" 
            py={6}
            style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
          >
            <Group gap="xs">
              <Avatar radius="md" size={28} color="dark" style={{ fontSize: "11px" }}>{item.icon}</Avatar>
              <Box>
                <Text size="xs" fw={600} style={{ color: "var(--nv-dark)" }}>{item.name}</Text>
                <Text size="10px" c="dimmed">{item.date}</Text>
              </Box>
            </Group>
            <Text fw={600} size="xs" style={{ color: "var(--nv-success)" }}>{item.amount}</Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}

// 3. Mapa de Calor / Distribución (Visual Only) - Compact version
function StatsGrid() {
  return (
    <SimpleGrid cols={2} spacing="xs">
      <Box className="nv-card-compact animate-in delay-2" p="sm" style={{ background: "var(--nv-dark-surface)", color: "white" }}>
        <Group gap="xs" mb={4}>
          <IconUsers size={14} color="var(--nv-accent)" />
          <Text size="10px" className="stat-label" style={{ color: "var(--nv-slate-light)" }}>Usuarios Activos</Text>
        </Group>
        <Text size="md" fw={700}>3,420</Text>
      </Box>
      <Box className="nv-card-compact animate-in delay-2" p="sm">
        <Group gap="xs" mb={4}>
          <IconChartBar size={14} color="var(--nv-primary)" />
          <Text size="10px" className="stat-label">Conversión</Text>
        </Group>
        <Text size="md" fw={700} style={{ color: "var(--nv-dark)" }}>4.2%</Text>
      </Box>
      <Box className="nv-card-compact animate-in delay-3" p="sm">
        <Group gap="xs" mb={4}>
          <IconClock size={14} color="var(--nv-slate)" />
          <Text size="10px" className="stat-label">Tiempo Promedio</Text>
        </Group>
        <Text size="md" fw={700} style={{ color: "var(--nv-dark)" }}>12m</Text>
      </Box>
      <Box className="nv-card-compact animate-in delay-3" p="sm" style={{ background: "var(--nv-accent)", color: "var(--nv-dark)" }}>
        <Group gap="xs" mb={4}>
          <IconTrendingUp size={14} />
          <Text size="10px" style={{ opacity: 0.7 }} tt="uppercase" fw={700} lts="0.08em">Crecimiento</Text>
        </Group>
        <Text size="md" fw={700}>+24%</Text>
      </Box>
    </SimpleGrid>
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
      <Box mb="xl" className="animate-in">
        <Text className="page-title" mb="xs">
          Resumen
        </Text>
        <Text className="page-subtitle">
          Buenas tardes, {user?.full_name?.split(" ")[0]}. Tu negocio está rindiendo bien esta semana.
        </Text>
      </Box>

      {/* BENTO GRID LAYOUT */}
      <Grid gutter="lg">
        {/* Columna Principal (2/3) */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="lg">
            {/* Fila de KPIs Gigantes */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <HeroKPI title="Ingresos Totales" value="€128.4k" change={12.5} data={chartData} />
              <HeroKPI title="Beneficio Neto" value="€84.2k" change={8.1} data={[{value: 20}, {value:40}, {value:30}, {value:60}, {value:90}]} />
            </SimpleGrid>
            
            {/* Gráfico Principal de Ingresos */}
            <RevenueChart data={revenueData} currentMRR={12400} previousMRR={11800} currency="€" />
          </Stack>
        </Grid.Col>

        {/* Columna Lateral (1/3) */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            {/* Fila de KPIs Pequeños Verticales */}
            <KPICard
              title="Clientes Activos"
              value="16,601"
              change={12.5}
              changeType="positive"
              chartData={[100, 110, 115, 120, 118, 125, 130, 135]}
            />
            <KPICard
              title="Tasa de Cancelación"
              value="2.1"
              suffix="%"
              changeType="stable"
              changeLabel="Estable vs mes anterior"
              chartData={[2.5, 2.4, 2.3, 2.2, 2.2, 2.1, 2.1]}
            />
            
            <TransactionList />
            <StatsGrid />
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Fila Inferior de Widgets Operativos */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mt="lg" className="animate-in delay-2">
        <ClientGrowthChart totalClients={16601} newThisMonth={124} churnedThisMonth={12} />
        <AlertsWidget alerts={alerts} />
        <UpcomingSessionsWidget sessions={sessions} />
      </SimpleGrid>

      {/* Fila Final: Quick Actions */}
      <Box mt="lg" className="animate-in delay-3">
        <QuickActionsWidget />
      </Box>
    </Box>
  );
}
