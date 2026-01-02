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

// 1. KPI "Hero" Card
function HeroKPI({ title, value, change, data }: any) {
  return (
    <Box className="nv-card animate-in" p="xl" style={{ position: "relative", overflow: "hidden", minHeight: 240 }}>
      <Group justify="space-between" align="flex-start" mb="lg">
        <Stack gap={0}>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700} style={{ letterSpacing: "0.1em" }}>
            {title}
          </Text>
          <Text style={{ fontSize: "3.5rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {value}
          </Text>
        </Stack>
        <Box
          style={{
            background: change > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: change > 0 ? "#10B981" : "#EF4444",
            padding: "4px 12px",
            borderRadius: "50px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {change > 0 ? "+" : ""}{change}%
        </Box>
      </Group>

      {/* Gráfico ambiental de fondo */}
      <Box style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "120px", opacity: 0.5 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E7E247" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#E7E247" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#E7E247"
              strokeWidth={3}
              fill="url(#colorGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

// 2. Tarjeta de Lista "Glass"
function TransactionList() {
  const items = [
    { name: "Juan Pérez", amount: "+€149", date: "Hoy, 10:23 AM", icon: "J" },
    { name: "María Gómez", amount: "+€79", date: "Ayer", icon: "M" },
    { name: "Carlos Ruiz", amount: "+€29", date: "Ayer", icon: "C" },
  ];

  return (
    <Box className="nv-card animate-in delay-1" p="xl" h="100%">
      <Group justify="space-between" mb="xl">
        <Text size="lg" fw={700} style={{ fontFamily: "Space Grotesk" }}>Actividad Reciente</Text>
        <UnstyledButton>
          <IconArrowRight size={20} color="gray" />
        </UnstyledButton>
      </Group>
      <Stack gap="md">
        {items.map((item, i) => (
          <Group key={i} justify="space-between" style={{ paddingBottom: 16, borderBottom: "1px solid var(--nv-border)" }}>
            <Group>
              <Avatar radius="md" size="md" color="dark">{item.icon}</Avatar>
              <Box>
                <Text size="sm" fw={600}>{item.name}</Text>
                <Text size="xs" c="dimmed">{item.date}</Text>
              </Box>
            </Group>
            <Text fw={600} size="sm">{item.amount}</Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}

// 3. Mapa de Calor / Distribución (Visual Only)
function StatsGrid() {
  return (
    <SimpleGrid cols={2} spacing="md">
      <Box className="nv-card animate-in delay-2" p="lg" style={{ background: "var(--nv-dark-surface)", color: "white" }}>
        <IconUsers size={24} color="#E7E247" />
        <Text mt="lg" size="xs" c="dimmed" tt="uppercase" fw={700}>Usuarios Activos</Text>
        <Text size="xl" fw={700}>3,420</Text>
      </Box>
      <Box className="nv-card animate-in delay-2" p="lg">
        <IconChartBar size={24} />
        <Text mt="lg" size="xs" c="dimmed" tt="uppercase" fw={700}>Conversión</Text>
        <Text size="xl" fw={700}>4.2%</Text>
      </Box>
      <Box className="nv-card animate-in delay-3" p="lg">
        <IconClock size={24} />
        <Text mt="lg" size="xs" c="dimmed" tt="uppercase" fw={700}>Tiempo Promedio</Text>
        <Text size="xl" fw={700}>12m</Text>
      </Box>
      <Box className="nv-card animate-in delay-3" p="lg" style={{ background: "#E7E247", color: "var(--nv-dark-base)" }}>
        <IconTrendingUp size={24} />
        <Text mt="lg" size="xs" style={{ opacity: 0.7 }} tt="uppercase" fw={700}>Crecimiento</Text>
        <Text size="xl" fw={700}>+24%</Text>
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
      <Box mb={60} className="animate-in">
        <Text style={{ fontSize: "4rem", fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.04em", fontFamily: "Space Grotesk" }}>
          Resumen
        </Text>
        <Text size="xl" c="dimmed" mt="sm" style={{ maxWidth: 600 }}>
          Buenas tardes, {user?.full_name?.split(" ")[0]}. Tu negocio está rindiendo excepcionalmente bien esta semana. Los ingresos han subido un 12% comparado con el periodo anterior.
        </Text>
      </Box>

      {/* BENTO GRID LAYOUT */}
      <Grid gutter="xl">
        {/* Columna Principal (2/3) */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="xl">
            {/* Fila de KPIs Gigantes */}
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <HeroKPI title="Ingresos Totales" value="€128.4k" change={12.5} data={chartData} />
              <HeroKPI title="Beneficio Neto" value="€84.2k" change={8.1} data={[{value: 20}, {value:40}, {value:30}, {value:60}, {value:90}]} />
            </SimpleGrid>
            
            {/* Gráfico Principal de Ingresos */}
            <RevenueChart data={revenueData} currentMRR={12400} previousMRR={11800} currency="€" />
          </Stack>
        </Grid.Col>

        {/* Columna Lateral (1/3) */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="xl" h="100%">
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
      <Grid gutter="lg" mt="xl" className="animate-in delay-2">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <ClientGrowthChart totalClients={16601} newThisMonth={124} churnedThisMonth={12} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <AlertsWidget alerts={alerts} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <UpcomingSessionsWidget sessions={sessions} />
        </Grid.Col>
      </Grid>

      {/* Fila Final: Quick Actions */}
      <Box mt="xl" className="animate-in delay-3">
        <QuickActionsWidget />
      </Box>
    </Box>
  );
}
