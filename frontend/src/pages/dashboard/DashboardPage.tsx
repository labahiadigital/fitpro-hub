import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
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
  IconTarget,
  IconTrendingUp,
  IconUsers,
  IconWeight,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { AlertsWidget } from "../../components/dashboard/AlertsWidget";
import { QuickActionsWidget } from "../../components/dashboard/QuickActionsWidget";
import { UpcomingSessionsWidget } from "../../components/dashboard/UpcomingSessionsWidget";
import { useAuthStore } from "../../stores/auth";

// --- KPI Card orientado a clientes ---
function ClientKPI({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  trend?: number;
}) {
  return (
    <Box className="premium-card animate-in" p="lg" style={{ position: "relative", overflow: "hidden" }}>
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text className="stat-label" mb={4}>{title}</Text>
          <Text className="stat-value" style={{ color: "var(--nv-dark)", fontSize: "clamp(1.5rem, 2vw, 2.5rem)" }}>
            {value}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed" mt={4}>{subtitle}</Text>
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
          {trend >= 0 ? "+" : ""}{trend}% vs mes anterior
        </Badge>
      )}
    </Box>
  );
}

// --- Lista de clientes recientes ---
function RecentClientsWidget() {
  const navigate = useNavigate();
  const recentClients = [
    { id: "1", name: "María García", lastSession: "Hoy, 10:00", progress: 85, goal: "Pérdida de peso", avatar: "M" },
    { id: "2", name: "Carlos López", lastSession: "Ayer", progress: 72, goal: "Ganancia muscular", avatar: "C" },
    { id: "3", name: "Ana Martínez", lastSession: "Hace 2 días", progress: 90, goal: "Tonificación", avatar: "A" },
    { id: "4", name: "Pedro Sánchez", lastSession: "Hace 3 días", progress: 45, goal: "Resistencia", avatar: "P" },
  ];

  return (
    <Box className="premium-card animate-in delay-1" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconUsers size={18} color="var(--nv-primary)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>Clientes Activos</Text>
        </Group>
        <UnstyledButton onClick={() => navigate("/clients")} style={{ color: "var(--nv-primary)" }}>
          <Group gap={4}>
            <Text size="xs" fw={600}>Ver todos</Text>
            <IconArrowRight size={14} />
          </Group>
        </UnstyledButton>
      </Group>
      
      <Stack gap="sm">
        {recentClients.map((client) => (
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
                  <Text size="sm" fw={600} style={{ color: "var(--nv-dark)" }}>{client.name}</Text>
                  <Text size="xs" c="dimmed">{client.goal}</Text>
                </Box>
              </Group>
              <Box ta="right">
                <Text size="xs" c="dimmed">{client.lastSession}</Text>
                <Group gap={4} mt={4}>
                  <Progress 
                    value={client.progress} 
                    size="xs" 
                    w={60} 
                    color={client.progress >= 80 ? "green" : client.progress >= 50 ? "yellow" : "orange"}
                  />
                  <Text size="xs" fw={600} c={client.progress >= 80 ? "green" : client.progress >= 50 ? "yellow.7" : "orange"}>
                    {client.progress}%
                  </Text>
                </Group>
              </Box>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Box>
  );
}

// --- Resumen de progreso de clientes ---
function ClientProgressSummary() {
  return (
    <Box className="premium-card animate-in delay-2" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconTarget size={18} color="var(--nv-accent)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>Progreso General</Text>
        </Group>
      </Group>
      
      <Group justify="center" mb="md">
        <RingProgress
          size={140}
          thickness={12}
          roundCaps
          sections={[
            { value: 35, color: "green" },
            { value: 40, color: "yellow" },
            { value: 15, color: "orange" },
            { value: 10, color: "red" },
          ]}
          label={
            <Box ta="center">
              <Text size="xl" fw={800} style={{ color: "var(--nv-dark)" }}>78%</Text>
              <Text size="xs" c="dimmed">En objetivo</Text>
            </Box>
          }
        />
      </Group>
      
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={10} h={10} bg="green" style={{ borderRadius: "50%" }} />
            <Text size="xs">Excelente progreso</Text>
          </Group>
          <Text size="xs" fw={600}>35%</Text>
        </Group>
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={10} h={10} bg="yellow" style={{ borderRadius: "50%" }} />
            <Text size="xs">Buen progreso</Text>
          </Group>
          <Text size="xs" fw={600}>40%</Text>
        </Group>
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={10} h={10} bg="orange" style={{ borderRadius: "50%" }} />
            <Text size="xs">Necesita atención</Text>
          </Group>
          <Text size="xs" fw={600}>15%</Text>
        </Group>
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={10} h={10} bg="red" style={{ borderRadius: "50%" }} />
            <Text size="xs">En riesgo</Text>
          </Group>
          <Text size="xs" fw={600}>10%</Text>
        </Group>
      </Stack>
    </Box>
  );
}

// --- Estadísticas rápidas de entrenamiento ---
function TrainingStats() {
  const stats = [
    { label: "Sesiones hoy", value: "8", icon: IconCalendarEvent, color: "blue" },
    { label: "Horas entrenadas", value: "24h", icon: IconClock, color: "grape" },
    { label: "Calorías quemadas", value: "12.4k", icon: IconFlame, color: "orange" },
    { label: "Objetivos cumplidos", value: "15", icon: IconTarget, color: "green" },
  ];

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
            <Text size="xs" c={i === 3 ? "dark" : "dimmed"} fw={500}>{stat.label}</Text>
          </Group>
          <Text size="xl" fw={800} style={{ color: i === 3 ? "var(--nv-dark)" : "var(--nv-dark)" }}>
            {stat.value}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}

// --- Widget de actividad semanal ---
function WeeklyActivityWidget() {
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const activity = [4, 6, 3, 8, 5, 2, 0]; // Sesiones por día

  return (
    <Box className="premium-card animate-in delay-3" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconChartLine size={18} color="var(--nv-primary)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>Actividad Semanal</Text>
        </Group>
        <Badge variant="light" color="blue" size="sm">Esta semana</Badge>
      </Group>
      
      <Group justify="space-between" align="flex-end" h={100} px="xs">
        {days.map((day, i) => (
          <Box key={day} ta="center">
            <Box 
              w={32} 
              h={Math.max(activity[i] * 10, 4)}
              bg={i === 6 ? "gray.3" : activity[i] >= 6 ? "var(--nv-accent)" : "var(--nv-primary)"}
              style={{ 
                borderRadius: "var(--radius-sm)",
                transition: "height 0.3s ease",
              }}
              mb="xs"
            />
            <Text size="xs" fw={500} c={i === 6 ? "dimmed" : undefined}>{day}</Text>
            <Text size="xs" c="dimmed">{activity[i]}</Text>
          </Box>
        ))}
      </Group>
      
      <Group justify="space-between" mt="md" pt="md" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <Box>
          <Text size="xs" c="dimmed">Total sesiones</Text>
          <Text fw={700} style={{ color: "var(--nv-dark)" }}>28</Text>
        </Box>
        <Box ta="right">
          <Text size="xs" c="dimmed">Promedio diario</Text>
          <Text fw={700} style={{ color: "var(--nv-dark)" }}>4.7</Text>
        </Box>
      </Group>
    </Box>
  );
}

// --- Widget de métricas de clientes ---
function ClientMetricsWidget() {
  const metrics = [
    { label: "Peso perdido (total)", value: "-127 kg", icon: IconWeight, trend: "+12%" },
    { label: "Masa muscular ganada", value: "+89 kg", icon: IconRun, trend: "+8%" },
    { label: "Frecuencia cardíaca prom.", value: "68 bpm", icon: IconHeartbeat, trend: "-3%" },
  ];

  return (
    <Box className="premium-card animate-in delay-2" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconChartLine size={18} color="var(--nv-success)" />
          <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>Métricas de Clientes</Text>
        </Group>
        <Text size="xs" c="dimmed">Último mes</Text>
      </Group>
      
      <Stack gap="md">
        {metrics.map((metric, i) => (
          <Group key={i} justify="space-between" py="xs" style={{ borderBottom: i < metrics.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
            <Group gap="sm">
              <ThemeIcon size="md" variant="light" color="gray" radius="md">
                <metric.icon size={16} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{metric.label}</Text>
            </Group>
            <Group gap="xs">
              <Text fw={700} style={{ color: "var(--nv-dark)" }}>{metric.value}</Text>
              <Badge size="xs" variant="light" color={metric.trend.startsWith("+") ? "green" : "blue"}>
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
  
  // Obtener hora del día para saludo
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  const alerts = [
    { id: "1", type: "inactive_client" as const, title: "Cliente sin actividad", description: "Pedro Sánchez - 7 días sin entrenar", severity: "warning" as const },
    { id: "2", type: "payment_due" as const, title: "Pago pendiente", description: "Ana Martínez - Vence en 3 días", severity: "error" as const },
    { id: "3", type: "renewal_soon" as const, title: "Renovación próxima", description: "Carlos López - Plan expira en 5 días", severity: "info" as const },
  ];

  const sessions = [
    { id: "1", title: "Entrenamiento de Fuerza", clientName: "María García", startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), type: "individual" as const, modality: "in_person" as const, status: "confirmed" as const, location: "Sala Principal" },
    { id: "2", title: "Cardio HIIT", clientName: "Carlos López", startTime: new Date(Date.now() + 7200000).toISOString(), endTime: new Date(Date.now() + 9000000).toISOString(), type: "individual" as const, modality: "in_person" as const, status: "confirmed" as const, location: "Sala 2" },
    { id: "3", title: "Consulta Nutricional", clientName: "Ana Martínez", startTime: new Date(Date.now() + 14400000).toISOString(), endTime: new Date(Date.now() + 16200000).toISOString(), type: "individual" as const, modality: "online" as const, status: "pending" as const },
  ];

  return (
    <Box>
      {/* Header con saludo personalizado */}
      <Group justify="space-between" align="flex-start" mb={{ base: "lg", lg: "xl" }} className="animate-in">
        <Box>
          <Text className="page-title" mb="xs">
            {greeting}, {user?.full_name?.split(" ")[0]} 👋
          </Text>
          <Text className="page-subtitle">
            Tienes <strong>8 sesiones</strong> programadas para hoy. ¡A por ello!
          </Text>
        </Box>
        <Group gap="sm">
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
            onClick={() => navigate("/clients")}
            radius="xl"
            style={{ background: "var(--nv-accent)", color: "var(--nv-dark)" }}
          >
            Nueva Sesión
          </Button>
        </Group>
      </Group>

      {/* KPIs principales - enfocados en clientes */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="xl" className="stagger">
        <ClientKPI 
          title="Clientes Activos" 
          value={42} 
          subtitle="3 nuevos esta semana"
          icon={IconUsers} 
          color="blue"
          trend={8}
        />
        <ClientKPI 
          title="Sesiones Esta Semana" 
          value={28} 
          subtitle="4 más que la semana pasada"
          icon={IconCalendarEvent} 
          color="grape"
          trend={16}
        />
        <ClientKPI 
          title="Tasa de Asistencia" 
          value="94%" 
          subtitle="Excelente rendimiento"
          icon={IconTarget} 
          color="green"
          trend={3}
        />
        <ClientKPI 
          title="Clientes en Objetivo" 
          value={35} 
          subtitle="83% de tus clientes"
          icon={IconTrendingUp} 
          color="orange"
          trend={12}
        />
      </SimpleGrid>

      {/* Estadísticas de entrenamiento */}
      <Box mb="xl">
        <TrainingStats />
      </Box>

      {/* Grid principal */}
      <Box className="dashboard-main-grid">
        {/* Columna Principal */}
        <Stack gap="lg">
          {/* Sesiones de hoy */}
          <UpcomingSessionsWidget sessions={sessions} />
          
          {/* Actividad semanal + Métricas */}
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <WeeklyActivityWidget />
            <ClientMetricsWidget />
          </SimpleGrid>
          
          {/* Alertas */}
          <AlertsWidget alerts={alerts} />
        </Stack>

        {/* Columna Lateral */}
        <Stack gap="lg">
          <RecentClientsWidget />
          <ClientProgressSummary />
          <QuickActionsWidget />
        </Stack>
      </Box>
    </Box>
  );
}
