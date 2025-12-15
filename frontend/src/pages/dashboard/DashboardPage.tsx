import { Container, Grid, Paper, Title, Text, Group, Stack, Box, Badge, Avatar, Progress, SimpleGrid } from '@mantine/core'
import {
  IconUsers,
  IconCalendarEvent,
  IconCurrencyEuro,
  IconTrendingUp,
  IconChartBar,
  IconArrowUpRight,
} from '@tabler/icons-react'
import { StatsCard } from '../../components/common/StatsCard'
import { useKPIs } from '../../hooks/useReports'
import { useAuthStore } from '../../stores/auth'

export function DashboardPage() {
  const { user, currentWorkspace } = useAuthStore()
  const { data: kpis } = useKPIs()
  
  // Datos de ejemplo para próximas sesiones
  const upcomingSessions = [
    { id: 1, client: 'María García', time: '09:00', type: 'Personal Training', status: 'confirmed' },
    { id: 2, client: 'Carlos López', time: '10:30', type: 'Nutrición', status: 'pending' },
    { id: 3, client: 'Ana Martínez', time: '12:00', type: 'Personal Training', status: 'confirmed' },
    { id: 4, client: 'Pedro Sánchez', time: '16:00', type: 'Evaluación', status: 'confirmed' },
  ]
  
  // Datos de ejemplo para clientes recientes
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
      
      {/* KPIs */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        <StatsCard
          title="Clientes Activos"
          value={kpis?.active_clients || 0}
          icon={<IconUsers size={24} />}
          change={12}
          changeLabel="vs mes anterior"
          color="primary"
        />
        <StatsCard
          title="Sesiones Hoy"
          value={kpis?.upcoming_sessions || 0}
          icon={<IconCalendarEvent size={24} />}
          color="blue"
        />
        <StatsCard
          title="Ingresos Mensuales"
          value={formatCurrency(kpis?.revenue_this_month || 0)}
          icon={<IconCurrencyEuro size={24} />}
          change={kpis?.revenue_last_month ? Math.round(((kpis?.revenue_this_month || 0) - kpis.revenue_last_month) / kpis.revenue_last_month * 100) : 0}
          changeLabel="vs mes anterior"
          color="green"
        />
        <StatsCard
          title="MRR"
          value={formatCurrency(kpis?.mrr || 0)}
          icon={<IconTrendingUp size={24} />}
          change={8}
          changeLabel="crecimiento"
          color="violet"
        />
      </SimpleGrid>
      
      <Grid gutter="lg">
        {/* Próximas sesiones */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder radius="lg" p="lg" h="100%">
            <Group justify="space-between" mb="lg">
              <Box>
                <Title order={4} fw={600}>
                  Sesiones de Hoy
                </Title>
                <Text size="sm" c="dimmed">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </Box>
              <Badge size="lg" variant="light" color="primary">
                {upcomingSessions.length} sesiones
              </Badge>
            </Group>
            
            <Stack gap="sm">
              {upcomingSessions.map((session) => (
                <Paper
                  key={session.id}
                  withBorder
                  p="md"
                  radius="md"
                  style={{
                    borderColor: session.status === 'pending' ? 'var(--mantine-color-yellow-4)' : 'var(--mantine-color-gray-2)',
                    background: session.status === 'pending' ? 'var(--mantine-color-yellow-0)' : undefined,
                  }}
                >
                  <Group justify="space-between">
                    <Group>
                      <Avatar radius="xl" color="primary">
                        {session.client.charAt(0)}
                      </Avatar>
                      <Box>
                        <Text fw={500} size="sm">
                          {session.client}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {session.type}
                        </Text>
                      </Box>
                    </Group>
                    <Group>
                      <Text fw={600} size="sm">
                        {session.time}
                      </Text>
                      <Badge
                        size="sm"
                        variant="light"
                        color={session.status === 'confirmed' ? 'green' : 'yellow'}
                      >
                        {session.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      </Badge>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
        
        {/* Clientes recientes */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder radius="lg" p="lg" h="100%">
            <Title order={4} fw={600} mb="lg">
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
        <Grid.Col span={12}>
          <Paper withBorder radius="lg" p="lg">
            <Group justify="space-between" mb="lg">
              <Box>
                <Title order={4} fw={600}>
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
                    {kpis?.completed_sessions_month || 0}
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
                    {formatCurrency(kpis?.arpa || 0)}
                  </Text>
                </Group>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Tasa de Retención
                </Text>
                <Group gap="xs" mt={4}>
                  <Text size="xl" fw={700}>
                    {100 - (kpis?.churn_rate || 0)}%
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
