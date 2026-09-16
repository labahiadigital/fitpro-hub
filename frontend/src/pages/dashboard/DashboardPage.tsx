import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  Loader,
  Paper,
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
import { useDisclosure, useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconChartLine,
  IconClock,
  IconClockPlay,
  IconClockStop,
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
import { formatDecimal } from "../../utils/format";
import { useClockStatus, useClockIn, useClockOut } from "../../hooks/useTimeClock";

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

const WIDGET_LABEL_KEYS: Record<string, string> = {
  alerts: "dashboard.widgets.alerts",
  "quick-actions": "dashboard.widgets.quickActions",
  "upcoming-sessions": "dashboard.widgets.upcomingSessions",
  "recent-clients": "dashboard.widgets.recentClients",
  "client-progress": "dashboard.widgets.clientProgress",
  "weekly-activity": "dashboard.widgets.weeklyActivity",
  "client-metrics": "dashboard.widgets.financialMetrics",
};

const WIDGET_ICONS: Record<string, React.ElementType> = {
  alerts: IconMessage,
  "quick-actions": IconPlus,
  "upcoming-sessions": IconCalendarEvent,
  "recent-clients": IconUsers,
  "client-progress": IconTarget,
  "weekly-activity": IconChartLine,
  "client-metrics": IconTrendingUp,
};

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
          {trend}%
        </Badge>
      )}
    </Box>
  );
}

// --- Lista de clientes recientes ---
function RecentClientsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: clients, isLoading } = useRecentClients(5);

  if (isLoading) {
    return (
      <Box className="premium-card animate-in delay-1" p="lg">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconUsers size={18} color="var(--nv-primary)" />
            <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
              {t("dashboard.activeClients")}
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
    progress?: number | null;
  }) => ({
    id: client.id,
    name: client.full_name || `${client.first_name} ${client.last_name}`,
    lastSession: client.updated_at
      ? new Date(client.updated_at).toLocaleDateString()
      : t("dashboard.noActivity"),
    progress: client.progress ?? null,
    goal: client.goals || t("dashboard.noGoalDefined"),
    avatar: (client.first_name || "?")[0].toUpperCase(),
  }));

  return (
    <Box className="premium-card animate-in delay-1" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconUsers size={18} color="var(--nv-primary)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
            {t("dashboard.activeClients")}
          </Text>
        </Group>
        <UnstyledButton
          onClick={() => navigate("/clients")}
          style={{ color: "var(--nv-primary)" }}
        >
          <Group gap={4}>
            <Text size="xs" fw={600}>
              {t("common.viewAll")}
            </Text>
            <IconArrowRight size={14} />
          </Group>
        </UnstyledButton>
      </Group>

      {recentClients.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("dashboard.noClientsYet")}
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
                  {client.progress != null && (
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
                  )}
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
  const { t } = useTranslation();
    const activeClients = kpis?.active_clients || 0;
  const totalClients = kpis?.total_clients || 1;
  const activePercentage = Math.round((activeClients / totalClients) * 100) || 0;

  return (
    <Box className="premium-card animate-in delay-2" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconTarget size={18} color="var(--nv-accent)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
            {"Progreso General"}
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
                {"Activos"}
              </Text>
            </Box>
          }
        />
      </Group>

      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={10} h={10} bg="green" style={{ borderRadius: "50%" }} />
            <Text size="xs">{"Clientes Activos"}</Text>
          </Group>
          <Text size="xs" fw={600}>
            {activeClients}
          </Text>
        </Group>
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={10} h={10} bg="gray" style={{ borderRadius: "50%" }} />
            <Text size="xs">{t("dashboard.clientesInactivos")}</Text>
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
    const { t } = useTranslation();
    const stats = [
    {
      label: t("dashboard.sesionesPendientes"),
      value: kpis?.upcoming_sessions?.toString() || "0",
      icon: IconCalendarEvent,
      color: "blue",
    },
    {
      label: t("dashboard.sesionesEsteMes"),
      value: kpis?.completed_sessions_month?.toString() || "0",
      icon: IconClock,
      color: "grape",
    },
    {
      label: "MRR",
      value: `€${formatDecimal(kpis?.mrr || 0, 0)}`,
      icon: IconFlame,
      color: "orange",
    },
    {
      label: t("dashboard.ingresosMes"),
      value: `€${formatDecimal(kpis?.revenue_this_month || 0, 0)}`,
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
  const { t } = useTranslation();
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
            {t("dashboard.weeklyActivity")}
          </Text>
        </Group>
        <Badge variant="light" color="blue" size="sm">
          {t("dashboard.thisWeek")}
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
            {t("dashboard.totalSessions")}
          </Text>
          <Text fw={700} style={{ color: "var(--nv-dark)" }}>
            {totalSessions}
          </Text>
        </Box>
        <Box ta="right">
          <Text size="xs" c="dimmed">
            {t("dashboard.dailyAverage")}
          </Text>
          <Text fw={700} style={{ color: "var(--nv-dark)" }}>
            {formatDecimal(avgPerDay, 1)}
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
  const { t } = useTranslation();
    const revenueChange = kpis?.revenue_last_month
    ? (
        ((kpis.revenue_this_month - kpis.revenue_last_month) /
          kpis.revenue_last_month) *
        100
      ).toFixed(1)
    : "0";

  const metrics = [
    {
      label: t("dashboard.ingresosRecurrentesMRR"),
      value: `€${formatDecimal(kpis?.mrr || 0, 2)}`,
      icon: IconWeight,
      trend: `${Number(revenueChange) >= 0 ? "+" : ""}${revenueChange}%`,
    },
    {
      label: t("dashboard.ingresoPorClienteARPA"),
      value: `€${formatDecimal(kpis?.arpa || 0, 2)}`,
      icon: IconRun,
      trend: "N/A",
    },
    {
      label: t("dashboard.tasaAbandono"),
      value: `${formatDecimal(kpis?.churn_rate || 0, 1)}%`,
      icon: IconHeartbeat,
      trend: `${(kpis?.churn_rate || 0) <= 5 ? "Excelente" : "Revisar"}`,
    },
  ];

  return (
    <Box className="premium-card animate-in delay-2" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconChartLine size={18} color="var(--nv-success)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
            {"Métricas Financieras"}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          {t("dashboard.esteMes")}
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

// --- Clock Widget for Dashboard ---
function ClockWidget() {
  const { t, i18n } = useTranslation();
  const { data: status } = useClockStatus();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isClockedIn = status?.is_clocked_in ?? false;

  return (
    <Paper shadow="xs" radius="xl" px="md" py="xs" withBorder>
      <Group gap="sm" wrap="nowrap" justify="space-between">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <ThemeIcon variant="light" color={isClockedIn ? "green" : "gray"} size={36} radius="xl">
            <IconClock size={18} />
          </ThemeIcon>
          <Box style={{ minWidth: 0 }}>
            <Text ff="monospace" fw={700} size="md" lh={1}>
              {now.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Text>
            <Text size="xs" c="dimmed" lh={1.2} mt={2} truncate>
              {isClockedIn
                ? `${t("dashboard.clockedIn")} ${new Date(status!.clock_in!).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}`
                : t("dashboard.notClockedIn")}
            </Text>
          </Box>
        </Group>
        <Group gap={6} wrap="nowrap">
          {!isClockedIn ? (
            isMobile ? (
              <ActionIcon
                size="lg"
                color="green"
                variant="filled"
                radius="xl"
                loading={clockIn.isPending}
                onClick={() => clockIn.mutate({})}
                aria-label={t("dashboard.clockInLabel")}
              >
                <IconClockPlay size={16} />
              </ActionIcon>
            ) : (
              <Button size="xs" color="green" leftSection={<IconClockPlay size={14} />} loading={clockIn.isPending} onClick={() => clockIn.mutate({})} radius="xl">
                {t("dashboard.clockIn")}
              </Button>
            )
          ) : (
            isMobile ? (
              <ActionIcon
                size="lg"
                color="red"
                variant="filled"
                radius="xl"
                loading={clockOut.isPending}
                onClick={() => clockOut.mutate({})}
                aria-label={t("dashboard.clockOutLabel")}
              >
                <IconClockStop size={16} />
              </ActionIcon>
            ) : (
              <Button size="xs" color="red" leftSection={<IconClockStop size={14} />} loading={clockOut.isPending} onClick={() => clockOut.mutate({})} radius="xl">
                {t("dashboard.clockOut")}
              </Button>
            )
          )}
          {!isMobile && (
            <UnstyledButton onClick={() => navigate("/time-clock")}>
              <Text size="xs" c="blue" fw={500} style={{ whiteSpace: "nowrap" }}>
                {t("dashboard.viewTimeClock")} →
              </Text>
            </UnstyledButton>
          )}
        </Group>
      </Group>
    </Paper>
  );
}

// --- MAIN PAGE ---
export function DashboardPage() {
  const { t } = useTranslation();
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

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("dashboard.goodMorning") : hour < 20 ? t("dashboard.goodAfternoon") : t("dashboard.goodEvening");

  const sessions = useMemo(() => (todaySessions || []).map((session: {
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
    clientName: session.client_name || t("common.client"),
    startTime: session.start_time,
    endTime: session.end_time,
    type: (session.session_type || "individual") as "individual" | "group",
    modality: (session.modality || "in_person") as "in_person" | "online",
    status: (session.status || "pending") as "confirmed" | "pending" | "cancelled" | "completed",
    location: session.location?.address,
  })), [todaySessions]);

  const transformedAlerts = useMemo(() => (alerts || []).map((alert: {
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
  })), [alerts]);

  return (
    <Box>
      <Drawer
        opened={configOpened}
        onClose={closeConfig}
        title={t("dashboard.configureDashboard")}
        position="right"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t("dashboard.selectWidgets")}
          </Text>
          {Object.keys(WIDGET_LABEL_KEYS).map((widgetId) => {
            const WidgetIcon = WIDGET_ICONS[widgetId];
            return (
            <Group key={widgetId} justify="space-between">
              <Group gap="sm">
                <WidgetIcon size={18} />
                <Text size="sm" fw={500}>
                  {t(WIDGET_LABEL_KEYS[widgetId])}
                </Text>
              </Group>
              <Switch
                checked={config.visibleWidgets.includes(widgetId)}
                onChange={() => toggleWidget(widgetId)}
              />
            </Group>
            );
          })}
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
            {greeting}, {user?.full_name?.split(" ")[0] || t("common.user")} 👋
          </Text>
          <Text className="page-subtitle">
            {kpisLoading ? (
              <Loader size="xs" />
            ) : (
              <>
                {t("dashboard.youHave")} <strong>{kpis?.upcoming_sessions || 0} {t("dashboard.sessionsPending")}</strong>.{" "}
                {t("dashboard.letsGo")}
              </>
            )}
          </Text>
        </Box>
        <ClockWidget />
        <Group gap="sm">
          <ActionIcon
            variant="light"
            size="lg"
            radius="xl"
            onClick={openConfig}
            title={t("dashboard.configureDashboard")}
            aria-label={t("dashboard.configureDashboard")}
          >
            <IconSettings size={20} />
          </ActionIcon>
          <Button
            variant="light"
            leftSection={<IconMessage size={16} />}
            onClick={() => navigate("/chat")}
            radius="xl"
          >
            {t("dashboard.messages")}
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate("/calendar")}
            radius="xl"
            style={{ background: "var(--nv-accent)", color: "var(--nv-dark)" }}
          >
            {t("dashboard.newSession")}
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
          title={t("dashboard.activeClients")}
          value={kpis?.active_clients || 0}
          subtitle={`${kpis?.total_clients || 0} total`}
          icon={IconUsers}
          color="blue"
          loading={kpisLoading}
        />
        <ClientKPI
          title={t("dashboard.pendingSessions")}
          value={kpis?.upcoming_sessions || 0}
          subtitle={t("dashboard.upcomingSessions")}
          icon={IconCalendarEvent}
          color="grape"
          loading={kpisLoading}
        />
        <ClientKPI
          title={t("dashboard.completedMonth")}
          value={kpis?.completed_sessions_month || 0}
          subtitle={t("dashboard.thisMonth")}
          icon={IconTarget}
          color="green"
          loading={kpisLoading}
        />
        <ClientKPI
          title={t("dashboard.churnRate")}
          value={`${formatDecimal(kpis?.churn_rate || 0, 1)}%`}
          subtitle={kpis?.churn_rate && kpis.churn_rate <= 5 ? t("dashboard.excellent") : t("dashboard.needsImprovement")}
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
