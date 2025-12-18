import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconArrowUpRight,
  IconBarbell,
  IconCalendarEvent,
  IconChartBar,
  IconChevronRight,
  IconClock,
  IconCurrencyEuro,
  IconFlame,
  IconMessage,
  IconSalad,
  IconTarget,
  IconTrendingUp,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "../../components/common/StatsCard";
import { AlertsWidget } from "../../components/dashboard/AlertsWidget";
import { ClientGrowthChart } from "../../components/dashboard/ClientGrowthChart";
import { QuickActionsWidget } from "../../components/dashboard/QuickActionsWidget";
import { RevenueChart } from "../../components/dashboard/RevenueChart";
import { UpcomingSessionsWidget } from "../../components/dashboard/UpcomingSessionsWidget";
import { useKPIs } from "../../hooks/useReports";
import { useAuthStore } from "../../stores/auth";

// Client Dashboard Component
function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Demo data for client view
  const clientStats = {
    workoutsThisWeek: 3,
    workoutsGoal: 4,
    currentStreak: 12,
    totalWorkouts: 47,
    caloriesBurned: 2450,
    nextSession: "Hoy 18:00",
  };

  const todayWorkout = {
    name: "Día de Pierna + Core",
    duration: "45 min",
    exercises: 8,
    difficulty: "Intermedio",
  };

  const weekProgress = [
    { day: "L", completed: true },
    { day: "M", completed: true },
    { day: "X", completed: true },
    { day: "J", completed: false },
    { day: "V", completed: false },
    { day: "S", completed: false },
    { day: "D", completed: false },
  ];

  const achievements = [
    {
      icon: <IconFlame size={16} />,
      label: "12 días seguidos",
      color: "orange",
    },
    {
      icon: <IconTrophy size={16} />,
      label: "Meta semanal x3",
      color: "yellow",
    },
    {
      icon: <IconBarbell size={16} />,
      label: "50 entrenamientos",
      color: "violet",
    },
  ];

  const upcomingSessions = [
    {
      time: "Hoy 18:00",
      title: "Entrenamiento Personal",
      trainer: "Carlos Fitness",
      type: "Presencial",
    },
    {
      time: "Viernes 10:00",
      title: "HIIT Grupal",
      trainer: "Carlos Fitness",
      type: "Presencial",
    },
  ];

  return (
    <Container py="xl" size="xl">
      {/* Header */}
      <Box mb="xl">
        <Title fw={700} order={2}>
          ¡Hola, {user?.full_name?.split(" ")[0] || "Usuario"}! 💪
        </Title>
        <Text c="dimmed" size="sm">
          Llevas una racha de {clientStats.currentStreak} días. ¡Sigue así!
        </Text>
      </Box>

      {/* Weekly Progress */}
      <Paper mb="xl" p="lg" radius="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Box>
            <Text fw={600}>Progreso Semanal</Text>
            <Text c="dimmed" size="sm">
              {clientStats.workoutsThisWeek} de {clientStats.workoutsGoal}{" "}
              entrenamientos
            </Text>
          </Box>
          <RingProgress
            label={
              <Text fw={700} size="xs" ta="center">
                {Math.round(
                  (clientStats.workoutsThisWeek / clientStats.workoutsGoal) *
                    100
                )}
                %
              </Text>
            }
            roundCaps
            sections={[
              {
                value:
                  (clientStats.workoutsThisWeek / clientStats.workoutsGoal) *
                  100,
                color: "teal",
              },
            ]}
            size={60}
            thickness={6}
          />
        </Group>
        <Group gap="xs" justify="center">
          {weekProgress.map((day, index) => (
            <Box
              h={36}
              key={index}
              style={{
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: day.completed
                  ? "var(--mantine-color-teal-6)"
                  : "var(--mantine-color-gray-1)",
                color: day.completed ? "white" : "var(--mantine-color-gray-6)",
                fontWeight: 600,
                fontSize: 12,
              }}
              w={36}
            >
              {day.day}
            </Box>
          ))}
        </Group>
      </Paper>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl" spacing="md">
        <Paper p="md" radius="lg" ta="center" withBorder>
          <ThemeIcon
            color="orange"
            mb="xs"
            radius="xl"
            size="lg"
            variant="light"
          >
            <IconFlame size={20} />
          </ThemeIcon>
          <Text fw={700} size="xl">
            {clientStats.currentStreak}
          </Text>
          <Text c="dimmed" size="xs">
            Días seguidos
          </Text>
        </Paper>
        <Paper p="md" radius="lg" ta="center" withBorder>
          <ThemeIcon color="teal" mb="xs" radius="xl" size="lg" variant="light">
            <IconBarbell size={20} />
          </ThemeIcon>
          <Text fw={700} size="xl">
            {clientStats.totalWorkouts}
          </Text>
          <Text c="dimmed" size="xs">
            Entrenamientos
          </Text>
        </Paper>
        <Paper p="md" radius="lg" ta="center" withBorder>
          <ThemeIcon color="red" mb="xs" radius="xl" size="lg" variant="light">
            <IconFlame size={20} />
          </ThemeIcon>
          <Text fw={700} size="xl">
            {clientStats.caloriesBurned}
          </Text>
          <Text c="dimmed" size="xs">
            Kcal esta semana
          </Text>
        </Paper>
        <Paper p="md" radius="lg" ta="center" withBorder>
          <ThemeIcon color="blue" mb="xs" radius="xl" size="lg" variant="light">
            <IconClock size={20} />
          </ThemeIcon>
          <Text fw={700} size="xl">
            {clientStats.nextSession}
          </Text>
          <Text c="dimmed" size="xs">
            Próxima sesión
          </Text>
        </Paper>
      </SimpleGrid>

      <Grid gutter="lg">
        {/* Today's Workout */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card p={0} radius="lg" style={{ overflow: "hidden" }} withBorder>
            <Box
              p="lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--mantine-color-teal-6) 0%, var(--mantine-color-teal-8) 100%)",
                color: "white",
              }}
            >
              <Group justify="space-between" mb="xs">
                <Badge c="teal" color="white" variant="light">
                  Entrenamiento de Hoy
                </Badge>
                <IconTarget size={20} />
              </Group>
              <Title fw={700} mb="xs" order={3}>
                {todayWorkout.name}
              </Title>
              <Group gap="lg">
                <Text opacity={0.9} size="sm">
                  <IconClock size={14} style={{ marginRight: 4 }} />
                  {todayWorkout.duration}
                </Text>
                <Text opacity={0.9} size="sm">
                  <IconBarbell size={14} style={{ marginRight: 4 }} />
                  {todayWorkout.exercises} ejercicios
                </Text>
              </Group>
            </Box>
            <Box p="lg">
              <Button
                color="teal"
                fullWidth
                onClick={() => navigate("/workouts")}
              >
                Comenzar Entrenamiento
              </Button>
            </Box>
          </Card>
        </Grid.Col>

        {/* Upcoming Sessions */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper h="100%" p="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Próximas Citas</Text>
              <Button
                onClick={() => navigate("/calendar")}
                rightSection={<IconChevronRight size={14} />}
                size="xs"
                variant="subtle"
              >
                Ver todas
              </Button>
            </Group>
            <Stack gap="md">
              {upcomingSessions.map((session, index) => (
                <Group
                  justify="space-between"
                  key={index}
                  p="sm"
                  style={{
                    backgroundColor: "var(--mantine-color-gray-0)",
                    borderRadius: 8,
                  }}
                >
                  <Box>
                    <Text fw={600} size="sm">
                      {session.title}
                    </Text>
                    <Text c="dimmed" size="xs">
                      con {session.trainer} • {session.type}
                    </Text>
                  </Box>
                  <Badge variant="light">{session.time}</Badge>
                </Group>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Achievements */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Logros Recientes</Text>
              <IconTrophy color="var(--mantine-color-yellow-6)" size={20} />
            </Group>
            <Stack gap="sm">
              {achievements.map((achievement, index) => (
                <Group
                  gap="sm"
                  key={index}
                  p="sm"
                  style={{
                    backgroundColor: "var(--mantine-color-gray-0)",
                    borderRadius: 8,
                  }}
                >
                  <ThemeIcon
                    color={achievement.color}
                    radius="xl"
                    size="md"
                    variant="light"
                  >
                    {achievement.icon}
                  </ThemeIcon>
                  <Text fw={500} size="sm">
                    {achievement.label}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Quick Actions */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="lg" radius="lg" withBorder>
            <Text fw={600} mb="md">
              Acciones Rápidas
            </Text>
            <SimpleGrid cols={2} spacing="sm">
              <Button
                color="teal"
                leftSection={<IconBarbell size={16} />}
                onClick={() => navigate("/workouts")}
                variant="light"
              >
                Ver Plan
              </Button>
              <Button
                color="orange"
                leftSection={<IconSalad size={16} />}
                onClick={() => navigate("/nutrition")}
                variant="light"
              >
                Mi Dieta
              </Button>
              <Button
                color="blue"
                leftSection={<IconMessage size={16} />}
                onClick={() => navigate("/chat")}
                variant="light"
              >
                Chat
              </Button>
              <Button
                color="violet"
                leftSection={<IconTrophy size={16} />}
                onClick={() => navigate("/progress")}
                variant="light"
              >
                Progreso
              </Button>
            </SimpleGrid>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

// Trainer Dashboard Component
function TrainerDashboard() {
  const navigate = useNavigate();
  const { user, currentWorkspace } = useAuthStore();
  const { data: kpis } = useKPIs();

  // Datos de ejemplo para gráficos
  const revenueData = [
    { month: "Jul", revenue: 3200, subscriptions: 2800, oneTime: 400 },
    { month: "Ago", revenue: 3500, subscriptions: 3000, oneTime: 500 },
    { month: "Sep", revenue: 3800, subscriptions: 3200, oneTime: 600 },
    { month: "Oct", revenue: 4100, subscriptions: 3500, oneTime: 600 },
    { month: "Nov", revenue: 4400, subscriptions: 3800, oneTime: 600 },
    { month: "Dic", revenue: 4850, subscriptions: 4200, oneTime: 650 },
  ];

  const clientGrowthData = [
    { month: "Jul", total: 42, new: 5, churned: 2 },
    { month: "Ago", total: 45, new: 6, churned: 3 },
    { month: "Sep", total: 48, new: 5, churned: 2 },
    { month: "Oct", total: 52, new: 7, churned: 3 },
    { month: "Nov", total: 56, new: 6, churned: 2 },
    { month: "Dic", total: 62, new: 8, churned: 2 },
  ];

  // Alertas de ejemplo
  const alerts = [
    {
      id: "1",
      type: "payment_due" as const,
      title: "Pago pendiente",
      description: "María García - Suscripción vencida hace 3 días",
      severity: "error" as const,
    },
    {
      id: "2",
      type: "inactive_client" as const,
      title: "Cliente inactivo",
      description: "Carlos López - Sin actividad hace 14 días",
      severity: "warning" as const,
    },
    {
      id: "3",
      type: "renewal_soon" as const,
      title: "Renovación próxima",
      description: "Ana Martínez - Renueva en 5 días",
      severity: "info" as const,
    },
    {
      id: "4",
      type: "form_pending" as const,
      title: "Formulario pendiente",
      description: "Pedro Sánchez - PAR-Q sin completar",
      severity: "warning" as const,
    },
  ];

  // Próximas sesiones
  const upcomingSessions = [
    {
      id: "1",
      title: "Entrenamiento Personal",
      clientName: "María García",
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3_600_000).toISOString(),
      type: "individual" as const,
      modality: "in_person" as const,
      status: "confirmed" as const,
      location: "Sala 1",
    },
    {
      id: "2",
      title: "Consulta Nutricional",
      clientName: "Carlos López",
      startTime: new Date(Date.now() + 5_400_000).toISOString(),
      endTime: new Date(Date.now() + 7_200_000).toISOString(),
      type: "individual" as const,
      modality: "online" as const,
      status: "pending" as const,
    },
    {
      id: "3",
      title: "HIIT Grupal",
      clientName: "Grupo A",
      startTime: new Date(Date.now() + 10_800_000).toISOString(),
      endTime: new Date(Date.now() + 14_400_000).toISOString(),
      type: "group" as const,
      modality: "in_person" as const,
      status: "confirmed" as const,
      location: "Sala Grande",
    },
    {
      id: "4",
      title: "Evaluación Inicial",
      clientName: "Pedro Sánchez",
      startTime: new Date(Date.now() + 86_400_000).toISOString(),
      endTime: new Date(Date.now() + 90_000_000).toISOString(),
      type: "individual" as const,
      modality: "in_person" as const,
      status: "confirmed" as const,
    },
  ];

  // Clientes recientes
  const recentClients = [
    { id: 1, name: "Laura Fernández", joinedDays: 2, progress: 15 },
    { id: 2, name: "Miguel Torres", joinedDays: 5, progress: 35 },
    { id: 3, name: "Sara Ruiz", joinedDays: 7, progress: 45 },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);

  return (
    <Container py="xl" size="xl">
      {/* Header */}
      <Box mb="xl">
        <Title fw={700} order={2}>
          ¡Hola, {user?.full_name?.split(" ")[0] || "Usuario"}! 👋
        </Title>
        <Text c="dimmed" size="sm">
          Aquí tienes un resumen de {currentWorkspace?.name || "tu negocio"} hoy
        </Text>
      </Box>

      {/* Quick Actions */}
      <Box mb="xl">
        <QuickActionsWidget />
      </Box>

      {/* KPIs */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl" spacing="lg">
        <StatsCard
          change={12}
          changeLabel="vs mes anterior"
          color="primary"
          icon={<IconUsers size={24} />}
          title="Clientes Activos"
          value={kpis?.active_clients || 62}
        />
        <StatsCard
          color="blue"
          icon={<IconCalendarEvent size={24} />}
          title="Sesiones Hoy"
          value={kpis?.upcoming_sessions || 4}
        />
        <StatsCard
          change={
            kpis?.revenue_last_month
              ? Math.round(
                  (((kpis?.revenue_this_month || 0) - kpis.revenue_last_month) /
                    kpis.revenue_last_month) *
                    100
                )
              : 10
          }
          changeLabel="vs mes anterior"
          color="green"
          icon={<IconCurrencyEuro size={24} />}
          title="Ingresos Mensuales"
          value={formatCurrency(kpis?.revenue_this_month || 4850)}
        />
        <StatsCard
          change={8}
          changeLabel="crecimiento"
          color="violet"
          icon={<IconTrendingUp size={24} />}
          title="MRR"
          value={formatCurrency(kpis?.mrr || 4200)}
        />
      </SimpleGrid>

      <Grid gutter="lg">
        {/* Gráfico de ingresos */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <RevenueChart
            currentMRR={4200}
            data={revenueData}
            previousMRR={3800}
          />
        </Grid.Col>

        {/* Alertas */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <AlertsWidget
            alerts={alerts}
            onAlertClick={(alert) => {
              if (alert.type === "payment_due") navigate("/payments");
              else if (alert.type === "inactive_client") navigate("/clients");
              else if (alert.type === "form_pending") navigate("/forms");
            }}
          />
        </Grid.Col>

        {/* Gráfico de clientes */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ClientGrowthChart
            churnedThisMonth={2}
            data={clientGrowthData}
            newThisMonth={8}
            totalClients={62}
          />
        </Grid.Col>

        {/* Próximas sesiones */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <UpcomingSessionsWidget
            onSessionClick={() => navigate("/calendar")}
            onViewAll={() => navigate("/calendar")}
            sessions={upcomingSessions}
          />
        </Grid.Col>

        {/* Clientes recientes */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper h="100%" p="lg" radius="lg" withBorder>
            <Title fw={600} mb="lg" order={5}>
              Nuevos Clientes
            </Title>

            <Stack gap="md">
              {recentClients.map((client) => (
                <Box key={client.id}>
                  <Group justify="space-between" mb={4}>
                    <Group gap="xs">
                      <Avatar color="primary" radius="xl" size="sm">
                        {client.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Text fw={500} size="sm">
                          {client.name}
                        </Text>
                        <Text c="dimmed" size="xs">
                          Hace {client.joinedDays} días
                        </Text>
                      </Box>
                    </Group>
                    <Text c="dimmed" size="xs">
                      {client.progress}%
                    </Text>
                  </Group>
                  <Progress color="primary" size="xs" value={client.progress} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Métricas rápidas */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="lg">
              <Box>
                <Title fw={600} order={5}>
                  Resumen del Mes
                </Title>
                <Text c="dimmed" size="sm">
                  Rendimiento de tu negocio
                </Text>
              </Box>
              <IconChartBar color="var(--mantine-color-gray-5)" size={24} />
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
              <Box>
                <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                  Sesiones Completadas
                </Text>
                <Group gap="xs" mt={4}>
                  <Text fw={700} size="xl">
                    {kpis?.completed_sessions_month || 87}
                  </Text>
                  <Badge color="green" size="xs" variant="light">
                    <Group gap={2}>
                      <IconArrowUpRight size={10} />
                      12%
                    </Group>
                  </Badge>
                </Group>
              </Box>
              <Box>
                <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                  Tasa de Asistencia
                </Text>
                <Group gap="xs" mt={4}>
                  <Text fw={700} size="xl">
                    94%
                  </Text>
                  <Badge color="green" size="xs" variant="light">
                    <Group gap={2}>
                      <IconArrowUpRight size={10} />
                      3%
                    </Group>
                  </Badge>
                </Group>
              </Box>
              <Box>
                <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                  ARPA
                </Text>
                <Group gap="xs" mt={4}>
                  <Text fw={700} size="xl">
                    {formatCurrency(kpis?.arpa || 68)}
                  </Text>
                </Group>
              </Box>
              <Box>
                <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                  Tasa de Retención
                </Text>
                <Group gap="xs" mt={4}>
                  <Text fw={700} size="xl">
                    {100 - (kpis?.churn_rate || 3)}%
                  </Text>
                  <Badge color="green" size="xs" variant="light">
                    Excelente
                  </Badge>
                </Group>
              </Box>
            </SimpleGrid>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

// Main Dashboard Page - Routes to appropriate dashboard based on role
export function DashboardPage() {
  const { isDemoMode, demoRole } = useAuthStore();

  // Show client dashboard if in demo mode as client
  if (isDemoMode && demoRole === "client") {
    return <ClientDashboard />;
  }

  // Default to trainer dashboard
  return <TrainerDashboard />;
}
