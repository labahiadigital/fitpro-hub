import { Container, Grid, Paper, Title, Text, Group, Stack, Box, Badge, Avatar, Progress, SimpleGrid, RingProgress, ThemeIcon, Card, Button } from '@mantine/core'
import {
  IconUsers,
  IconCalendarEvent,
  IconCurrencyEuro,
  IconTrendingUp,
  IconChartBar,
  IconArrowUpRight,
  IconBarbell,
  IconFlame,
  IconTarget,
  IconTrophy,
  IconClock,
  IconSalad,
  IconMessage,
  IconChevronRight,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { StatsCard } from '../../components/common/StatsCard'
import { RevenueChart } from '../../components/dashboard/RevenueChart'
import { ClientGrowthChart } from '../../components/dashboard/ClientGrowthChart'
import { AlertsWidget } from '../../components/dashboard/AlertsWidget'
import { UpcomingSessionsWidget } from '../../components/dashboard/UpcomingSessionsWidget'
import { QuickActionsWidget } from '../../components/dashboard/QuickActionsWidget'
import { useKPIs } from '../../hooks/useReports'
import { useAuthStore } from '../../stores/auth'

// Client Dashboard Component
function ClientDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  // Demo data for client view
  const clientStats = {
    workoutsThisWeek: 3,
    workoutsGoal: 4,
    currentStreak: 12,
    totalWorkouts: 47,
    caloriesBurned: 2450,
    nextSession: 'Hoy 18:00',
  }
  
  const todayWorkout = {
    name: 'Día de Pierna + Core',
    duration: '45 min',
    exercises: 8,
    difficulty: 'Intermedio',
  }
  
  const weekProgress = [
    { day: 'L', completed: true },
    { day: 'M', completed: true },
    { day: 'X', completed: true },
    { day: 'J', completed: false },
    { day: 'V', completed: false },
    { day: 'S', completed: false },
    { day: 'D', completed: false },
  ]
  
  const achievements = [
    { icon: <IconFlame size={16} />, label: '12 días seguidos', color: 'orange' },
    { icon: <IconTrophy size={16} />, label: 'Meta semanal x3', color: 'yellow' },
    { icon: <IconBarbell size={16} />, label: '50 entrenamientos', color: 'violet' },
  ]
  
  const upcomingSessions = [
    { time: 'Hoy 18:00', title: 'Entrenamiento Personal', trainer: 'Carlos Fitness', type: 'Presencial' },
    { time: 'Viernes 10:00', title: 'HIIT Grupal', trainer: 'Carlos Fitness', type: 'Presencial' },
  ]
  
  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Box mb="xl">
        <Title order={2} fw={700}>
          ¡Hola, {user?.full_name?.split(' ')[0] || 'Usuario'}! 💪
        </Title>
        <Text c="dimmed" size="sm">
          Llevas una racha de {clientStats.currentStreak} días. ¡Sigue así!
        </Text>
      </Box>
      
      {/* Weekly Progress */}
      <Paper withBorder radius="lg" p="lg" mb="xl">
        <Group justify="space-between" mb="md">
          <Box>
            <Text fw={600}>Progreso Semanal</Text>
            <Text size="sm" c="dimmed">{clientStats.workoutsThisWeek} de {clientStats.workoutsGoal} entrenamientos</Text>
          </Box>
          <RingProgress
            size={60}
            thickness={6}
            roundCaps
            sections={[{ value: (clientStats.workoutsThisWeek / clientStats.workoutsGoal) * 100, color: 'teal' }]}
            label={
              <Text ta="center" size="xs" fw={700}>
                {Math.round((clientStats.workoutsThisWeek / clientStats.workoutsGoal) * 100)}%
              </Text>
            }
          />
        </Group>
        <Group gap="xs" justify="center">
          {weekProgress.map((day, index) => (
            <Box
              key={index}
              w={36}
              h={36}
              style={{
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: day.completed 
                  ? 'var(--mantine-color-teal-6)' 
                  : 'var(--mantine-color-gray-1)',
                color: day.completed ? 'white' : 'var(--mantine-color-gray-6)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {day.day}
            </Box>
          ))}
        </Group>
      </Paper>
      
      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="xl">
        <Paper withBorder radius="lg" p="md" ta="center">
          <ThemeIcon size="lg" radius="xl" color="orange" variant="light" mb="xs">
            <IconFlame size={20} />
          </ThemeIcon>
          <Text size="xl" fw={700}>{clientStats.currentStreak}</Text>
          <Text size="xs" c="dimmed">Días seguidos</Text>
        </Paper>
        <Paper withBorder radius="lg" p="md" ta="center">
          <ThemeIcon size="lg" radius="xl" color="teal" variant="light" mb="xs">
            <IconBarbell size={20} />
          </ThemeIcon>
          <Text size="xl" fw={700}>{clientStats.totalWorkouts}</Text>
          <Text size="xs" c="dimmed">Entrenamientos</Text>
        </Paper>
        <Paper withBorder radius="lg" p="md" ta="center">
          <ThemeIcon size="lg" radius="xl" color="red" variant="light" mb="xs">
            <IconFlame size={20} />
          </ThemeIcon>
          <Text size="xl" fw={700}>{clientStats.caloriesBurned}</Text>
          <Text size="xs" c="dimmed">Kcal esta semana</Text>
        </Paper>
        <Paper withBorder radius="lg" p="md" ta="center">
          <ThemeIcon size="lg" radius="xl" color="blue" variant="light" mb="xs">
            <IconClock size={20} />
          </ThemeIcon>
          <Text size="xl" fw={700}>{clientStats.nextSession}</Text>
          <Text size="xs" c="dimmed">Próxima sesión</Text>
        </Paper>
      </SimpleGrid>
      
      <Grid gutter="lg">
        {/* Today's Workout */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
            <Box
              p="lg"
              style={{
                background: 'linear-gradient(135deg, var(--mantine-color-teal-6) 0%, var(--mantine-color-teal-8) 100%)',
                color: 'white',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Badge color="white" variant="light" c="teal">
                  Entrenamiento de Hoy
                </Badge>
                <IconTarget size={20} />
              </Group>
              <Title order={3} fw={700} mb="xs">
                {todayWorkout.name}
              </Title>
              <Group gap="lg">
                <Text size="sm" opacity={0.9}>
                  <IconClock size={14} style={{ marginRight: 4 }} />
                  {todayWorkout.duration}
                </Text>
                <Text size="sm" opacity={0.9}>
                  <IconBarbell size={14} style={{ marginRight: 4 }} />
                  {todayWorkout.exercises} ejercicios
                </Text>
              </Group>
            </Box>
            <Box p="lg">
              <Button fullWidth color="teal" onClick={() => navigate('/workouts')}>
                Comenzar Entrenamiento
              </Button>
            </Box>
          </Card>
        </Grid.Col>
        
        {/* Upcoming Sessions */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="lg" p="lg" h="100%">
            <Group justify="space-between" mb="md">
              <Text fw={600}>Próximas Citas</Text>
              <Button variant="subtle" size="xs" rightSection={<IconChevronRight size={14} />} onClick={() => navigate('/calendar')}>
                Ver todas
              </Button>
            </Group>
            <Stack gap="md">
              {upcomingSessions.map((session, index) => (
                <Group key={index} justify="space-between" p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
                  <Box>
                    <Text size="sm" fw={600}>{session.title}</Text>
                    <Text size="xs" c="dimmed">con {session.trainer} • {session.type}</Text>
                  </Box>
                  <Badge variant="light">{session.time}</Badge>
                </Group>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
        
        {/* Achievements */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="lg" p="lg">
            <Group justify="space-between" mb="md">
              <Text fw={600}>Logros Recientes</Text>
              <IconTrophy size={20} color="var(--mantine-color-yellow-6)" />
            </Group>
            <Stack gap="sm">
              {achievements.map((achievement, index) => (
                <Group key={index} gap="sm" p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
                  <ThemeIcon size="md" radius="xl" color={achievement.color} variant="light">
                    {achievement.icon}
                  </ThemeIcon>
                  <Text size="sm" fw={500}>{achievement.label}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
        
        {/* Quick Actions */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="lg" p="lg">
            <Text fw={600} mb="md">Acciones Rápidas</Text>
            <SimpleGrid cols={2} spacing="sm">
              <Button variant="light" color="teal" leftSection={<IconBarbell size={16} />} onClick={() => navigate('/workouts')}>
                Ver Plan
              </Button>
              <Button variant="light" color="orange" leftSection={<IconSalad size={16} />} onClick={() => navigate('/nutrition')}>
                Mi Dieta
              </Button>
              <Button variant="light" color="blue" leftSection={<IconMessage size={16} />} onClick={() => navigate('/chat')}>
                Chat
              </Button>
              <Button variant="light" color="violet" leftSection={<IconTrophy size={16} />} onClick={() => navigate('/progress')}>
                Progreso
              </Button>
            </SimpleGrid>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  )
}

// Trainer Dashboard Component
function TrainerDashboard() {
  const navigate = useNavigate()
  const { user, currentWorkspace } = useAuthStore()
  const { data: kpis } = useKPIs()
  
  // Datos de ejemplo para gráficos
  const revenueData = [
    { month: 'Jul', revenue: 3200, subscriptions: 2800, oneTime: 400 },
    { month: 'Ago', revenue: 3500, subscriptions: 3000, oneTime: 500 },
    { month: 'Sep', revenue: 3800, subscriptions: 3200, oneTime: 600 },
    { month: 'Oct', revenue: 4100, subscriptions: 3500, oneTime: 600 },
    { month: 'Nov', revenue: 4400, subscriptions: 3800, oneTime: 600 },
    { month: 'Dic', revenue: 4850, subscriptions: 4200, oneTime: 650 },
  ]

  const clientGrowthData = [
    { month: 'Jul', total: 42, new: 5, churned: 2 },
    { month: 'Ago', total: 45, new: 6, churned: 3 },
    { month: 'Sep', total: 48, new: 5, churned: 2 },
    { month: 'Oct', total: 52, new: 7, churned: 3 },
    { month: 'Nov', total: 56, new: 6, churned: 2 },
    { month: 'Dic', total: 62, new: 8, churned: 2 },
  ]

  // Alertas de ejemplo
  const alerts = [
    { id: '1', type: 'payment_due' as const, title: 'Pago pendiente', description: 'María García - Suscripción vencida hace 3 días', severity: 'error' as const },
    { id: '2', type: 'inactive_client' as const, title: 'Cliente inactivo', description: 'Carlos López - Sin actividad hace 14 días', severity: 'warning' as const },
    { id: '3', type: 'renewal_soon' as const, title: 'Renovación próxima', description: 'Ana Martínez - Renueva en 5 días', severity: 'info' as const },
    { id: '4', type: 'form_pending' as const, title: 'Formulario pendiente', description: 'Pedro Sánchez - PAR-Q sin completar', severity: 'warning' as const },
  ]
  
  // Próximas sesiones
  const upcomingSessions = [
    { id: '1', title: 'Entrenamiento Personal', clientName: 'María García', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), type: 'individual' as const, modality: 'in_person' as const, status: 'confirmed' as const, location: 'Sala 1' },
    { id: '2', title: 'Consulta Nutricional', clientName: 'Carlos López', startTime: new Date(Date.now() + 5400000).toISOString(), endTime: new Date(Date.now() + 7200000).toISOString(), type: 'individual' as const, modality: 'online' as const, status: 'pending' as const },
    { id: '3', title: 'HIIT Grupal', clientName: 'Grupo A', startTime: new Date(Date.now() + 10800000).toISOString(), endTime: new Date(Date.now() + 14400000).toISOString(), type: 'group' as const, modality: 'in_person' as const, status: 'confirmed' as const, location: 'Sala Grande' },
    { id: '4', title: 'Evaluación Inicial', clientName: 'Pedro Sánchez', startTime: new Date(Date.now() + 86400000).toISOString(), endTime: new Date(Date.now() + 90000000).toISOString(), type: 'individual' as const, modality: 'in_person' as const, status: 'confirmed' as const },
  ]
  
  // Clientes recientes
  const recentClients = [
    { id: 1, name: 'Laura Fernández', joinedDays: 2, progress: 15 },
    { id: 2, name: 'Miguel Torres', joinedDays: 5, progress: 35 },
    { id: 3, name: 'Sara Ruiz', joinedDays: 7, progress: 45 },
  ]
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }
  
  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Box mb="xl">
        <Title order={2} fw={700}>
          ¡Hola, {user?.full_name?.split(' ')[0] || 'Usuario'}! 👋
        </Title>
        <Text c="dimmed" size="sm">
          Aquí tienes un resumen de {currentWorkspace?.name || 'tu negocio'} hoy
        </Text>
      </Box>

      {/* Quick Actions */}
      <Box mb="xl">
        <QuickActionsWidget />
      </Box>
      
      {/* KPIs */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        <StatsCard
          title="Clientes Activos"
          value={kpis?.active_clients || 62}
          icon={<IconUsers size={24} />}
          change={12}
          changeLabel="vs mes anterior"
          color="primary"
        />
        <StatsCard
          title="Sesiones Hoy"
          value={kpis?.upcoming_sessions || 4}
          icon={<IconCalendarEvent size={24} />}
          color="blue"
        />
        <StatsCard
          title="Ingresos Mensuales"
          value={formatCurrency(kpis?.revenue_this_month || 4850)}
          icon={<IconCurrencyEuro size={24} />}
          change={kpis?.revenue_last_month ? Math.round(((kpis?.revenue_this_month || 0) - kpis.revenue_last_month) / kpis.revenue_last_month * 100) : 10}
          changeLabel="vs mes anterior"
          color="green"
        />
        <StatsCard
          title="MRR"
          value={formatCurrency(kpis?.mrr || 4200)}
          icon={<IconTrendingUp size={24} />}
          change={8}
          changeLabel="crecimiento"
          color="violet"
        />
      </SimpleGrid>
      
      <Grid gutter="lg">
        {/* Gráfico de ingresos */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <RevenueChart 
            data={revenueData}
            currentMRR={4200}
            previousMRR={3800}
          />
        </Grid.Col>

        {/* Alertas */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <AlertsWidget 
            alerts={alerts}
            onAlertClick={(alert) => {
              if (alert.type === 'payment_due') navigate('/payments')
              else if (alert.type === 'inactive_client') navigate('/clients')
              else if (alert.type === 'form_pending') navigate('/forms')
            }}
          />
        </Grid.Col>

        {/* Gráfico de clientes */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <ClientGrowthChart
            data={clientGrowthData}
            totalClients={62}
            newThisMonth={8}
            churnedThisMonth={2}
          />
        </Grid.Col>

        {/* Próximas sesiones */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <UpcomingSessionsWidget
            sessions={upcomingSessions}
            onSessionClick={() => navigate('/calendar')}
            onViewAll={() => navigate('/calendar')}
          />
        </Grid.Col>
        
        {/* Clientes recientes */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder radius="lg" p="lg" h="100%">
            <Title order={5} fw={600} mb="lg">
              Nuevos Clientes
            </Title>
            
            <Stack gap="md">
              {recentClients.map((client) => (
                <Box key={client.id}>
                  <Group justify="space-between" mb={4}>
                    <Group gap="xs">
                      <Avatar size="sm" radius="xl" color="primary">
                        {client.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Text size="sm" fw={500}>
                          {client.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Hace {client.joinedDays} días
                        </Text>
                      </Box>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {client.progress}%
                    </Text>
                  </Group>
                  <Progress value={client.progress} size="xs" color="primary" />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
        
        {/* Métricas rápidas */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder radius="lg" p="lg">
            <Group justify="space-between" mb="lg">
              <Box>
                <Title order={5} fw={600}>
                  Resumen del Mes
                </Title>
                <Text size="sm" c="dimmed">
                  Rendimiento de tu negocio
                </Text>
              </Box>
              <IconChartBar size={24} color="var(--mantine-color-gray-5)" />
            </Group>
            
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Sesiones Completadas
                </Text>
                <Group gap="xs" mt={4}>
                  <Text size="xl" fw={700}>
                    {kpis?.completed_sessions_month || 87}
                  </Text>
                  <Badge size="xs" color="green" variant="light">
                    <Group gap={2}>
                      <IconArrowUpRight size={10} />
                      12%
                    </Group>
                  </Badge>
                </Group>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Tasa de Asistencia
                </Text>
                <Group gap="xs" mt={4}>
                  <Text size="xl" fw={700}>
                    94%
                  </Text>
                  <Badge size="xs" color="green" variant="light">
                    <Group gap={2}>
                      <IconArrowUpRight size={10} />
                      3%
                    </Group>
                  </Badge>
                </Group>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  ARPA
                </Text>
                <Group gap="xs" mt={4}>
                  <Text size="xl" fw={700}>
                    {formatCurrency(kpis?.arpa || 68)}
                  </Text>
                </Group>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Tasa de Retención
                </Text>
                <Group gap="xs" mt={4}>
                  <Text size="xl" fw={700}>
                    {100 - (kpis?.churn_rate || 3)}%
                  </Text>
                  <Badge size="xs" color="green" variant="light">
                    Excelente
                  </Badge>
                </Group>
              </Box>
            </SimpleGrid>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  )
}

// Main Dashboard Page - Routes to appropriate dashboard based on role
export function DashboardPage() {
  const { isDemoMode, demoRole } = useAuthStore()
  
  // Show client dashboard if in demo mode as client
  if (isDemoMode && demoRole === 'client') {
    return <ClientDashboard />
  }
  
  // Default to trainer dashboard
  return <TrainerDashboard />
}
