import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Loader,
  Progress,
  RingProgress,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChartLine,
  IconClock,
  IconFlame,
  IconHeartbeat,
  IconMessage,
  IconPlus,
  IconRun,
  IconSettings,
  IconTarget,
  IconTrendingUp,
  IconUsers,
  IconWeight,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { AlertsWidget } from "../../components/dashboard/AlertsWidget";
import { QuickActionsWidget } from "../../components/dashboard/QuickActionsWidget";
import { UpcomingSessionsWidget } from "../../components/dashboard/UpcomingSessionsWidget";
import {
  useDashboardAlerts,
  useDashboardKPIs,
  useRecentClients,
  useTodaySessions,
} from "../../hooks/useDashboard";
import { useAuthStore } from "../../stores/auth";

// --- Dashboard configuration ---
interface DashboardConfig {
  visibleWidgets: string[];
  widgetOrder: string[];
}

const DEFAULT_CONFIG: DashboardConfig = {
  visibleWidgets: [
    "alerts",
    "quick-actions",
    "upcoming-sessions",
    "recent-clients",
    "client-progress",
    "weekly-activity",
    "client-metrics",
  ],
  widgetOrder: [
    "alerts",
    "quick-actions",
    "upcoming-sessions",
    "recent-clients",
    "client-progress",
    "weekly-activity",
    "client-metrics",
  ],
};

const WIDGET_DEFINITIONS = [
  { id: "alerts", label: "Avisos / Alertas", icon: IconMessage },
  { id: "quick-actions", label: "Acciones Rápidas", icon: IconPlus },
  { id: "upcoming-sessions", label: "Próximas sesiones", icon: IconCalendarEvent },
  { id: "recent-clients", label: "Clientes recientes", icon: IconUsers },
  { id: "client-progress", label: "Progreso de clientes", icon: IconTarget },
  { id: "weekly-activity", label: "Actividad semanal", icon: IconChartLine },
  { id: "client-metrics", label: "Métricas financieras", icon: IconTrendingUp },
];

// --- KPI Card orientado a clientes ---
function ClientKPI({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Box className="premium-card animate-in" p="lg">
        <Skeleton height={80} />
      </Box>
    );
  }

  return (
    <Box
      className="premium-card animate-in"
      p="lg"
      style={{ position: "relative", overflow: "hidden" }}
    >
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text className="stat-label" mb={4}>
            {title}
          </Text>
          <Text
            className="stat-value"
            style={{
              color: "var(--nv-dark)",
              fontSize: "clamp(1.5rem, 2vw, 2.5rem)",
            }}
          >
            {value}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed" mt={4}>
              {subtitle}
            </Text>
          )}
        </Box>
        <ThemeIcon
          size={48}
          radius="xl"
          variant="light"
          color={color}
          style={{ opacity: 0.9 }}
        >
          <Icon size={24} />
        </ThemeIcon>
      </Group>
      {trend !== undefined && (
        <Badge
          size="sm"
          variant="light"
          color={trend >= 0 ? "green" : "red"}
          leftSection={<IconTrendingUp size={12} />}
          mt="sm"
        >
          {trend >= 0 ? "+" : ""}
          {trend}% vs mes anterior
        </Badge>
      )}
    </Box>
  );
}

// --- Lista de clientes recientes ---
function RecentClientsWidget() {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useRecentClients(5);

  if (isLoading) {
    return (
      <Box className="premium-card animate-in delay-1" p="lg">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconUsers size={18} color="var(--nv-primary)" />
            <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
              Clientes Activos
            </Text>
          </Group>
        </Group>
        <Stack gap="sm">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={60} />
          ))}
        </Stack>
      </Box>
    );
  }

  const recentClients = (clients || []).map((client: {
    id: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    goals?: string;
    updated_at?: string;
  }) => ({
    id: client.id,
    name: client.full_name || `${client.first_name} ${client.last_name}`,
    lastSession: client.updated_at
      ? new Date(client.updated_at).toLocaleDateString()
      : "Sin actividad",
    progress: Math.floor(Math.random() * 40) + 60, // TODO: Get real progress from backend
    goal: client.goals || "Sin objetivo definido",
    avatar: (client.first_name || "?")[0].toUpperCase(),
  }));

  return (
    <Box className="premium-card animate-in delay-1" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconUsers size={18} color="var(--nv-primary)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
            Clientes Activos
          </Text>
        </Group>
        <UnstyledButton
          onClick={() => navigate("/clients")}
          style={{ color: "var(--nv-primary)" }}
        >
          <Group gap={4}>
            <Text size="xs" fw={600}>
              Ver todos
            </Text>
            <IconArrowRight size={14} />
          </Group>
        </UnstyledButton>
      </Group>

      {recentClients.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No hay clientes registrados aún
        </Text>
      ) : (
        <Stack gap="sm">
          {recentClients.map((client: {
            id: string;
            name: string;
            lastSession: string;
            progress: number;
            goal: string;
            avatar: string;
          }) => (
            <UnstyledButton
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              style={{
                padding: "12px",
                borderRadius: "var(--radius-md)",
                transition: "background 0.15s ease",
              }}
              className="list-item-hover"
            >
              <Group justify="space-between">
                <Group gap="sm">
                  <Avatar radius="xl" size="md" color="dark">
                    {client.avatar}
                  </Avatar>
                  <Box>
                    <Text
                      size="sm"
                      fw={600}
                      style={{ color: "var(--nv-dark)" }}
                    >
                      {client.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {client.goal}
                    </Text>
                  </Box>
                </Group>
                <Box ta="right">
                  <Text size="xs" c="dimmed">
                    {client.lastSession}
                  </Text>
                  <Group gap={4} mt={4}>
                    <Progress
                      value={client.progress}
                      size="xs"
                      w={60}
                      color={
                        client.progress >= 80
                          ? "green"
                          : client.progress >= 50
                            ? "yellow"
                            : "orange"
                      }
                    />
                    <Text
                      size="xs"
                      fw={600}
                      c={
                        client.progress >= 80
                          ? "green"
                          : client.progress >= 50
                            ? "yellow.7"
                            : "orange"
                      }
                    >
                      {client.progress}%
                    </Text>
                  </Group>
                </Box>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// --- Resumen de progreso de clientes ---
function ClientProgressSummary({ kpis }: { kpis?: { active_clients: number; total_clients: number } }) {
  const activeClients = kpis?.active_clients || 0;
  const totalClients = kpis?.total_clients || 1;
  const activePercentage = Math.round((activeClients / totalClients) * 100) || 0;

  return (
    <Box className="premium-card animate-in delay-2" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconTarget size={18} color="var(--nv-accent)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
            Progreso General
          </Text>
        </Group>
      </Group>

      <Group justify="center" mb="md">
        <RingProgress
          size={140}
          thickness={12}
          roundCaps
          sections={[{ value: activePercentage, color: "green" }]}
          label={
            <Box ta="center">
              <Text size="xl" fw={800} style={{ color: "var(--nv-dark)" }}>
                {activePercentage}%
              </Text>
              <Text size="xs" c="dimmed">
                Activos
              </Text>
            </Box>
          }
        />
      </Group>

      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={10} h={10} bg="green" style={{ borderRadius: "50%" }} />
            <Text size="xs">Clientes activos</Text>
          </Group>
          <Text size="xs" fw={600}>
            {activeClients}
          </Text>
        </Group>
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={10} h={10} bg="gray" style={{ borderRadius: "50%" }} />
            <Text size="xs">Clientes inactivos</Text>
          </Group>
          <Text size="xs" fw={600}>
            {totalClients - activeClients}
          </Text>
        </Group>
      </Stack>
    </Box>
  );
}

// --- Estadísticas rápidas de entrenamiento ---
function TrainingStats({
  kpis,
  loading,
}: {
  kpis?: {
    upcoming_sessions: number;
    completed_sessions_month: number;
    mrr: number;
    revenue_this_month: number;
  };
  loading?: boolean;
}) {
  const stats = [
    {
      label: "Sesiones pendientes",
      value: kpis?.upcoming_sessions?.toString() || "0",
      icon: IconCalendarEvent,
      color: "blue",
    },
    {
      label: "Sesiones este mes",
      value: kpis?.completed_sessions_month?.toString() || "0",
      icon: IconClock,
      color: "grape",
    },
    {
      label: "MRR",
      value: `€${(kpis?.mrr || 0).toFixed(0)}`,
      icon: IconFlame,
      color: "orange",
    },
    {
      label: "Ingresos mes",
      value: `€${(kpis?.revenue_this_month || 0).toFixed(0)}`,
      icon: IconTarget,
      color: "green",
    },
  ];

  if (loading) {
    return (
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm" className="stagger">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={80} />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm" className="stagger">
      {stats.map((stat, i) => (
        <Box
          key={i}
          className="nv-card-compact animate-in"
          p="md"
          style={{
            animationDelay: `${i * 0.05}s`,
            background: i === 3 ? "var(--nv-accent)" : undefined,
          }}
        >
          <Group gap="xs" mb="xs">
            <ThemeIcon size="sm" variant="light" color={stat.color} radius="md">
              <stat.icon size={14} />
            </ThemeIcon>
            <Text size="xs" c={i === 3 ? "dark" : "dimmed"} fw={500}>
              {stat.label}
            </Text>
          </Group>
          <Text
            size="xl"
            fw={800}
            style={{ color: i === 3 ? "var(--nv-dark)" : "var(--nv-dark)" }}
          >
            {stat.value}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}

// --- Widget de actividad semanal ---
function WeeklyActivityWidget() {
  // TODO: Implementar endpoint para actividad semanal
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const activity = [0, 0, 0, 0, 0, 0, 0]; // Sin datos hardcodeados

  // Build weekly data with day index. Our array: 0=Mon..5=Sat, 6=Sun.
  const weeklyData = days.map((day, i) => ({
    day,
    sessions: activity[i],
    dayIndex: i,
    isWeekend: i === 5 || i === 6,
    isToday: (() => {
      const todayDoW = new Date().getDay(); // 0=Sun, 1=Mon, ... 6=Sat
      const ourIndexToDoW = i === 6 ? 0 : i + 1;
      return todayDoW === ourIndexToDoW;
    })(),
  }));

  // Smart filtering: show weekdays always, show weekend days only if they have activity or are today
  const filteredDays = weeklyData.filter(
    (d) => !d.isWeekend || d.sessions > 0 || d.isToday
  );

  const totalSessions = filteredDays.reduce((acc, d) => acc + d.sessions, 0);
  const avgPerDay =
    filteredDays.length > 0 ? totalSessions / filteredDays.length : 0;

  return (
    <Box className="premium-card animate-in delay-3" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconChartLine size={18} color="var(--nv-primary)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
            Actividad Semanal
          </Text>
        </Group>
        <Badge variant="light" color="blue" size="sm">
          Esta semana
        </Badge>
      </Group>

      <Group justify="space-between" align="flex-end" h={100} px="xs">
        {filteredDays.map(({ day, sessions }) => (
          <Box key={day} ta="center">
            <Box
              w={32}
              h={Math.max(sessions * 10, 4)}
              bg={
                sessions === 0
                  ? "gray.3"
                  : sessions >= 6
                    ? "var(--nv-accent)"
                    : "var(--nv-primary)"
              }
              style={{
                borderRadius: "var(--radius-sm)",
                transition: "height 0.3s ease",
              }}
              mb="xs"
            />
            <Text size="xs" fw={500} c={sessions === 0 ? "dimmed" : undefined}>
              {day}
            </Text>
            <Text size="xs" c="dimmed">
              {sessions}
            </Text>
          </Box>
        ))}
      </Group>

      <Group
        justify="space-between"
        mt="md"
        pt="md"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <Box>
          <Text size="xs" c="dimmed">
            Total sesiones
          </Text>
          <Text fw={700} style={{ color: "var(--nv-dark)" }}>
            {totalSessions}
          </Text>
        </Box>
        <Box ta="right">
          <Text size="xs" c="dimmed">
            Promedio diario
          </Text>
          <Text fw={700} style={{ color: "var(--nv-dark)" }}>
            {avgPerDay.toFixed(1)}
          </Text>
        </Box>
      </Group>
    </Box>
  );
}

// --- Widget de métricas de clientes ---
function ClientMetricsWidget({
  kpis,
}: {
  kpis?: {
    mrr: number;
    arpa: number;
    churn_rate: number;
    revenue_this_month: number;
    revenue_last_month: number;
  };
}) {
  const revenueChange = kpis?.revenue_last_month
    ? (
        ((kpis.revenue_this_month - kpis.revenue_last_month) /
          kpis.revenue_last_month) *
        100
      ).toFixed(1)
    : "0";

  const metrics = [
    {
      label: "Ingresos recurrentes (MRR)",
      value: `€${(kpis?.mrr || 0).toFixed(2)}`,
      icon: IconWeight,
      trend: `${Number(revenueChange) >= 0 ? "+" : ""}${revenueChange}%`,
    },
    {
      label: "Ingreso por cliente (ARPA)",
      value: `€${(kpis?.arpa || 0).toFixed(2)}`,
      icon: IconRun,
      trend: "N/A",
    },
    {
      label: "Tasa de abandono",
      value: `${(kpis?.churn_rate || 0).toFixed(1)}%`,
      icon: IconHeartbeat,
      trend: `${(kpis?.churn_rate || 0) <= 5 ? "Excelente" : "Mejorar"}`,
    },
  ];

  return (
    <Box className="premium-card animate-in delay-2" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconChartLine size={18} color="var(--nv-success)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
            Métricas Financieras
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          Este mes
        </Text>
      </Group>

      <Stack gap="md">
        {metrics.map((metric, i) => (
          <Group
            key={i}
            justify="space-between"
            py="xs"
            style={{
              borderBottom:
                i < metrics.length - 1
                  ? "1px solid var(--border-subtle)"
                  : "none",
            }}
          >
            <Group gap="sm">
              <ThemeIcon size="md" variant="light" color="gray" radius="md">
                <metric.icon size={16} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                {metric.label}
              </Text>
            </Group>
            <Group gap="xs">
              <Text fw={700} style={{ color: "var(--nv-dark)" }}>
                {metric.value}
              </Text>
              <Badge
                size="xs"
                variant="light"
                color={
                  metric.trend.startsWith("+") || metric.trend === "Excelente"
                    ? "green"
                    : "blue"
                }
              >
                {metric.trend}
              </Badge>
            </Group>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}

// --- MAIN PAGE ---
export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [configOpened, { open: openConfig, close: closeConfig }] = useDisclosure(false);
  const [config, setConfig] = useLocalStorage<DashboardConfig>({
    key: "trackfiz-dashboard-config",
    defaultValue: DEFAULT_CONFIG,
  });

  const toggleWidget = (widgetId: string) => {
    setConfig((prev) => {
      const isVisible = prev.visibleWidgets.includes(widgetId);
      const newVisible = isVisible
        ? prev.visibleWidgets.filter((id) => id !== widgetId)
        : [...prev.visibleWidgets, widgetId];
      return { ...prev, visibleWidgets: newVisible };
    });
  };

  // Fetch real data
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: todaySessions, isLoading: sessionsLoading } = useTodaySessions();
  const { data: alerts, isLoading: alertsLoading } = useDashboardAlerts();

  // Obtener hora del día para saludo
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  // Transform sessions for the widget
  const sessions = (todaySessions || []).map((session: {
    id: string;
    title: string;
    client_name?: string;
    start_time: string;
    end_time: string;
    session_type?: string;
    modality?: string;
    status?: string;
    location?: { address?: string };
  }) => ({
    id: session.id,
    title: session.title,
    clientName: session.client_name || "Cliente",
    startTime: session.start_time,
    endTime: session.end_time,
    type: (session.session_type || "individual") as "individual" | "group",
    modality: (session.modality || "in_person") as "in_person" | "online",
    status: (session.status || "pending") as "confirmed" | "pending" | "cancelled" | "completed",
    location: session.location?.address,
  }));

  // Transform alerts
  const transformedAlerts = (alerts || []).map((alert: {
    id: string;
    type?: string;
    title: string;
    message?: string;
    description?: string;
    severity?: string;
  }) => ({
    id: alert.id,
    type: (alert.type || "info") as "inactive_client" | "payment_due" | "renewal_soon" | "goal_achieved",
    title: alert.title,
    description: alert.message || alert.description || "",
    severity: (alert.severity || "info") as "info" | "warning" | "error" | "success",
  }));

  return (
    <Box>
      <Drawer
        opened={configOpened}
        onClose={closeConfig}
        title="Configurar Dashboard"
        position="right"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Selecciona los widgets que quieres mostrar en tu dashboard
          </Text>
          {WIDGET_DEFINITIONS.map((widget) => (
            <Group key={widget.id} justify="space-between">
              <Group gap="sm">
                <widget.icon size={18} />
                <Text size="sm" fw={500}>
                  {widget.label}
                </Text>
              </Group>
              <Switch
                checked={config.visibleWidgets.includes(widget.id)}
                onChange={() => toggleWidget(widget.id)}
              />
            </Group>
          ))}
        </Stack>
      </Drawer>

      {/* Header con saludo personalizado */}
      <Group
        justify="space-between"
        align="flex-start"
        mb={{ base: "lg", lg: "xl" }}
        className="animate-in"
      >
        <Box>
          <Text className="page-title" mb="xs">
            {greeting}, {user?.full_name?.split(" ")[0] || "Usuario"} 👋
          </Text>
          <Text className="page-subtitle">
            {kpisLoading ? (
              <Loader size="xs" />
            ) : (
              <>
                Tienes <strong>{kpis?.upcoming_sessions || 0} sesiones</strong>{" "}
                pendientes. ¡A por ello!
              </>
            )}
          </Text>
        </Box>
        <Group gap="sm">
          <ActionIcon
            variant="light"
            size="lg"
            radius="xl"
            onClick={openConfig}
            title="Configurar Dashboard"
            aria-label="Configurar Dashboard"
          >
            <IconSettings size={20} />
          </ActionIcon>
          <Button
            variant="light"
            leftSection={<IconMessage size={16} />}
            onClick={() => navigate("/chat")}
            radius="xl"
          >
            Mensajes
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate("/calendar")}
            radius="xl"
            style={{ background: "var(--nv-accent)", color: "var(--nv-dark)" }}
          >
            Nueva Sesión
          </Button>
        </Group>
      </Group>

      {/* KPIs principales - enfocados en clientes */}
      <SimpleGrid
        cols={{ base: 2, md: 4 }}
        spacing="md"
        mb="xl"
        className="stagger"
      >
        <ClientKPI
          title="Clientes Activos"
          value={kpis?.active_clients || 0}
          subtitle={`${kpis?.total_clients || 0} total`}
          icon={IconUsers}
          color="blue"
          loading={kpisLoading}
        />
        <ClientKPI
          title="Sesiones Pendientes"
          value={kpis?.upcoming_sessions || 0}
          subtitle="Próximas sesiones"
          icon={IconCalendarEvent}
          color="grape"
          loading={kpisLoading}
        />
        <ClientKPI
          title="Completadas (mes)"
          value={kpis?.completed_sessions_month || 0}
          subtitle="Este mes"
          icon={IconTarget}
          color="green"
          loading={kpisLoading}
        />
        <ClientKPI
          title="Tasa Abandono"
          value={`${(kpis?.churn_rate || 0).toFixed(1)}%`}
          subtitle={kpis?.churn_rate && kpis.churn_rate <= 5 ? "Excelente" : "Revisar"}
          icon={IconTrendingUp}
          color="orange"
          loading={kpisLoading}
        />
      </SimpleGrid>

      {/* Estadísticas de entrenamiento */}
      <Box mb="xl">
        <TrainingStats kpis={kpis} loading={kpisLoading} />
      </Box>

      {/* Grid principal */}
      <Box className="dashboard-main-grid">
        {/* Columna Principal - orden según widgetOrder */}
        <Stack gap="lg">
          {(() => {
            const mainIds = ["upcoming-sessions", "alerts", "weekly-activity", "client-metrics"];
            const visible = mainIds
              .filter((id) => config.visibleWidgets.includes(id))
              .sort((a, b) => config.widgetOrder.indexOf(a) - config.widgetOrder.indexOf(b));
            const showBoth = visible.includes("weekly-activity") && visible.includes("client-metrics");
            const firstOfPair = showBoth
              ? visible.indexOf("weekly-activity") < visible.indexOf("client-metrics")
                ? "weekly-activity"
                : "client-metrics"
              : null;

            return visible.map((id) => {
              if (showBoth && id !== firstOfPair && (id === "weekly-activity" || id === "client-metrics")) {
                return null;
              }
              if (showBoth && id === firstOfPair) {
                return (
                  <SimpleGrid key="weekly-metrics" cols={{ base: 1, lg: 2 }} spacing="lg">
                    <WeeklyActivityWidget />
                    <ClientMetricsWidget kpis={kpis} />
                  </SimpleGrid>
                );
              }
              if (id === "upcoming-sessions")
                return (
                  <UpcomingSessionsWidget
                    key={id}
                    sessions={sessions}
                    loading={sessionsLoading}
                  />
                );
              if (id === "alerts")
                return (
                  <AlertsWidget
                    key={id}
                    alerts={transformedAlerts}
                    loading={alertsLoading}
                  />
                );
              if (id === "weekly-activity") return <WeeklyActivityWidget key={id} />;
              if (id === "client-metrics") return <ClientMetricsWidget key={id} kpis={kpis} />;
              return null;
            });
          })()}
        </Stack>

        {/* Columna Lateral - orden según widgetOrder */}
        <Stack gap="lg">
          {["recent-clients", "client-progress", "quick-actions"]
            .filter((id) => config.visibleWidgets.includes(id))
            .sort(
              (a, b) =>
                config.widgetOrder.indexOf(a) - config.widgetOrder.indexOf(b)
            )
            .map((id) => {
              if (id === "recent-clients") return <RecentClientsWidget key={id} />;
              if (id === "client-progress")
                return <ClientProgressSummary key={id} kpis={kpis} />;
              if (id === "quick-actions")
                return <QuickActionsWidget key={id} />;
              return null;
            })}
        </Stack>
      </Box>
    </Box>
  );
}
