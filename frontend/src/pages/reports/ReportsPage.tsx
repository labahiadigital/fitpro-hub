import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Select,
  Box,
  Text,
  Badge,
  SimpleGrid,
  ThemeIcon,
  Progress,
  RingProgress,
  Tabs,
  Table,
  ActionIcon,
  Tooltip,
  Stack,
} from '@mantine/core'
import {
  IconDownload,
  IconUsers,
  IconCreditCard,
  IconCalendarEvent,
  IconTrendingUp,
  IconArrowUpRight,
  IconArrowDownRight,
  IconChartBar,
  IconChartLine,
  IconChartPie,
  IconRefresh,
  IconFileSpreadsheet,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { StatsCard } from '../../components/common/StatsCard'

// Mock data for charts
const revenueData = [
  { month: 'Ene', revenue: 4200, clients: 45 },
  { month: 'Feb', revenue: 4800, clients: 48 },
  { month: 'Mar', revenue: 5100, clients: 52 },
  { month: 'Abr', revenue: 4900, clients: 50 },
  { month: 'May', revenue: 5600, clients: 58 },
  { month: 'Jun', revenue: 6200, clients: 65 },
  { month: 'Jul', revenue: 6800, clients: 72 },
]

const clientActivityData = [
  { name: 'Activos', value: 72, color: 'green' },
  { name: 'Inactivos', value: 18, color: 'yellow' },
  { name: 'Nuevos', value: 15, color: 'blue' },
  { name: 'Bajas', value: 5, color: 'red' },
]

const topClients = [
  { name: 'María García', sessions: 24, revenue: 480, compliance: 95 },
  { name: 'Carlos López', sessions: 20, revenue: 400, compliance: 88 },
  { name: 'Ana Martínez', sessions: 18, revenue: 360, compliance: 92 },
  { name: 'Pedro Sánchez', sessions: 16, revenue: 320, compliance: 85 },
  { name: 'Laura Fernández', sessions: 14, revenue: 280, compliance: 90 },
]

const recentPayments = [
  { client: 'María García', amount: 120, date: '2024-07-20', status: 'completed' },
  { client: 'Carlos López', amount: 80, date: '2024-07-19', status: 'completed' },
  { client: 'Ana Martínez', amount: 120, date: '2024-07-18', status: 'completed' },
  { client: 'Pedro Sánchez', amount: 80, date: '2024-07-17', status: 'pending' },
  { client: 'Laura Fernández', amount: 120, date: '2024-07-16', status: 'completed' },
]

export function ReportsPage() {
  const [period, setPeriod] = useState<string | null>('30')
  const [activeTab, setActiveTab] = useState<string | null>('overview')

  const kpis = {
    mrr: 6800,
    mrrChange: 9.7,
    totalClients: 110,
    clientsChange: 12,
    activeClients: 72,
    churnRate: 4.5,
    avgRevenue: 94.44,
    bookingsThisMonth: 156,
    bookingsChange: 8,
    completionRate: 89,
  }

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue))

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Reportes y Analytics"
        description="Analiza el rendimiento de tu negocio"
        action={{
          label: 'Exportar Datos',
          icon: <IconDownload size={16} />,
          onClick: () => console.log('Export'),
        }}
        secondaryAction={{
          label: 'Actualizar',
          icon: <IconRefresh size={16} />,
          onClick: () => console.log('Refresh'),
          variant: 'default',
        }}
      >
        <Group>
          <Select
            placeholder="Período"
            value={period}
            onChange={setPeriod}
            data={[
              { value: '7', label: 'Últimos 7 días' },
              { value: '30', label: 'Últimos 30 días' },
              { value: '90', label: 'Últimos 90 días' },
              { value: '365', label: 'Este año' },
            ]}
            w={180}
          />
        </Group>
      </PageHeader>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <StatsCard
          title="MRR"
          value={`€${kpis.mrr.toLocaleString()}`}
          icon={<IconCreditCard size={24} />}
          change={kpis.mrrChange}
          changeLabel="vs mes anterior"
          color="green"
        />
        <StatsCard
          title="Clientes Totales"
          value={kpis.totalClients}
          icon={<IconUsers size={24} />}
          change={kpis.clientsChange}
          changeLabel="nuevos este mes"
          color="blue"
        />
        <StatsCard
          title="Reservas del Mes"
          value={kpis.bookingsThisMonth}
          icon={<IconCalendarEvent size={24} />}
          change={kpis.bookingsChange}
          changeLabel="vs mes anterior"
          color="grape"
        />
        <StatsCard
          title="Tasa de Cumplimiento"
          value={`${kpis.completionRate}%`}
          icon={<IconTrendingUp size={24} />}
          change={3}
          changeLabel="vs mes anterior"
          color="teal"
        />
      </SimpleGrid>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={14} />}>
            Resumen
          </Tabs.Tab>
          <Tabs.Tab value="revenue" leftSection={<IconChartLine size={14} />}>
            Ingresos
          </Tabs.Tab>
          <Tabs.Tab value="clients" leftSection={<IconUsers size={14} />}>
            Clientes
          </Tabs.Tab>
          <Tabs.Tab value="activity" leftSection={<IconChartPie size={14} />}>
            Actividad
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            {/* Revenue Chart */}
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600}>Ingresos Mensuales</Text>
                  <Text size="xs" c="dimmed">Evolución de los últimos 7 meses</Text>
                </Box>
                <Badge variant="light" color="green">
                  <Group gap={4}>
                    <IconArrowUpRight size={12} />
                    +{kpis.mrrChange}%
                  </Group>
                </Badge>
              </Group>

              <Box h={200}>
                <Group gap={4} align="flex-end" h="100%">
                  {revenueData.map((item, index) => (
                    <Tooltip
                      key={item.month}
                      label={`${item.month}: €${item.revenue}`}
                      withArrow
                    >
                      <Box
                        style={{
                          flex: 1,
                          height: `${(item.revenue / maxRevenue) * 100}%`,
                          backgroundColor: index === revenueData.length - 1
                            ? 'var(--mantine-color-green-6)'
                            : 'var(--mantine-color-green-2)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--mantine-color-green-4)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index === revenueData.length - 1
                            ? 'var(--mantine-color-green-6)'
                            : 'var(--mantine-color-green-2)'
                        }}
                      />
                    </Tooltip>
                  ))}
                </Group>
                <Group gap={4} mt="xs">
                  {revenueData.map((item) => (
                    <Text key={item.month} size="xs" c="dimmed" ta="center" style={{ flex: 1 }}>
                      {item.month}
                    </Text>
                  ))}
                </Group>
              </Box>
            </Paper>

            {/* Client Distribution */}
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600}>Distribución de Clientes</Text>
                  <Text size="xs" c="dimmed">Estado actual de tu base de clientes</Text>
                </Box>
              </Group>

              <Group justify="center" mb="md">
                <RingProgress
                  size={180}
                  thickness={20}
                  roundCaps
                  sections={clientActivityData.map(item => ({
                    value: item.value,
                    color: item.color,
                    tooltip: `${item.name}: ${item.value}`,
                  }))}
                  label={
                    <Box ta="center">
                      <Text size="xl" fw={700}>{kpis.totalClients}</Text>
                      <Text size="xs" c="dimmed">Total</Text>
                    </Box>
                  }
                />
              </Group>

              <SimpleGrid cols={2} spacing="sm">
                {clientActivityData.map((item) => (
                  <Group key={item.name} gap="xs">
                    <Box
                      w={12}
                      h={12}
                      style={{
                        borderRadius: '50%',
                        backgroundColor: `var(--mantine-color-${item.color}-6)`,
                      }}
                    />
                    <Text size="sm">{item.name}</Text>
                    <Text size="sm" fw={600} ml="auto">{item.value}</Text>
                  </Group>
                ))}
              </SimpleGrid>
            </Paper>

            {/* Top Clients */}
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600}>Top Clientes</Text>
                  <Text size="xs" c="dimmed">Por número de sesiones este mes</Text>
                </Box>
                <ActionIcon variant="subtle" color="gray">
                  <IconFileSpreadsheet size={18} />
                </ActionIcon>
              </Group>

              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th ta="center">Sesiones</Table.Th>
                    <Table.Th ta="center">Cumplimiento</Table.Th>
                    <Table.Th ta="right">Ingresos</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topClients.map((client) => (
                    <Table.Tr key={client.name}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{client.name}</Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge variant="light">{client.sessions}</Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Group gap="xs" justify="center">
                          <Progress
                            value={client.compliance}
                            size="sm"
                            w={60}
                            color={client.compliance >= 90 ? 'green' : client.compliance >= 80 ? 'yellow' : 'red'}
                          />
                          <Text size="xs">{client.compliance}%</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={500}>€{client.revenue}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            {/* Recent Payments */}
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600}>Pagos Recientes</Text>
                  <Text size="xs" c="dimmed">Últimas transacciones</Text>
                </Box>
                <ActionIcon variant="subtle" color="gray">
                  <IconFileSpreadsheet size={18} />
                </ActionIcon>
              </Group>

              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th ta="center">Estado</Table.Th>
                    <Table.Th ta="right">Importe</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentPayments.map((payment, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{payment.client}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">{payment.date}</Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge
                          variant="light"
                          color={payment.status === 'completed' ? 'green' : 'yellow'}
                        >
                          {payment.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={500}>€{payment.amount}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="revenue">
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg" mb="lg">
            <Paper withBorder radius="lg" p="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>MRR Actual</Text>
              <Text size="xl" fw={700} mt="xs">€{kpis.mrr.toLocaleString()}</Text>
              <Group gap={4} mt="xs">
                <ThemeIcon size="xs" color="green" variant="light" radius="xl">
                  <IconArrowUpRight size={10} />
                </ThemeIcon>
                <Text size="xs" c="green">+{kpis.mrrChange}% vs mes anterior</Text>
              </Group>
            </Paper>

            <Paper withBorder radius="lg" p="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>ARPU</Text>
              <Text size="xl" fw={700} mt="xs">€{kpis.avgRevenue.toFixed(2)}</Text>
              <Text size="xs" c="dimmed" mt="xs">Ingreso promedio por usuario</Text>
            </Paper>

            <Paper withBorder radius="lg" p="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Churn Rate</Text>
              <Text size="xl" fw={700} mt="xs">{kpis.churnRate}%</Text>
              <Group gap={4} mt="xs">
                <ThemeIcon size="xs" color="red" variant="light" radius="xl">
                  <IconArrowDownRight size={10} />
                </ThemeIcon>
                <Text size="xs" c="red">-0.5% vs mes anterior</Text>
              </Group>
            </Paper>
          </SimpleGrid>

          <Paper withBorder radius="lg" p="lg">
            <Text fw={600} mb="lg">Evolución de Ingresos</Text>
            <Box h={300}>
              <Group gap={8} align="flex-end" h="100%">
                {revenueData.map((item) => (
                  <Box key={item.month} style={{ flex: 1 }}>
                    <Tooltip label={`€${item.revenue}`} withArrow>
                      <Box
                        style={{
                          height: `${(item.revenue / maxRevenue) * 100}%`,
                          backgroundColor: 'var(--mantine-color-green-5)',
                          borderRadius: '4px 4px 0 0',
                          minHeight: 20,
                        }}
                      />
                    </Tooltip>
                    <Text size="xs" c="dimmed" ta="center" mt="xs">
                      {item.month}
                    </Text>
                    <Text size="xs" fw={500} ta="center">
                      €{item.revenue}
                    </Text>
                  </Box>
                ))}
              </Group>
            </Box>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="clients">
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg" mb="lg">
            <Paper withBorder radius="lg" p="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Clientes Activos</Text>
              <Text size="xl" fw={700} mt="xs">{kpis.activeClients}</Text>
              <Progress
                value={(kpis.activeClients / kpis.totalClients) * 100}
                mt="md"
                size="sm"
                color="green"
              />
              <Text size="xs" c="dimmed" mt="xs">
                {((kpis.activeClients / kpis.totalClients) * 100).toFixed(1)}% del total
              </Text>
            </Paper>

            <Paper withBorder radius="lg" p="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Nuevos Este Mes</Text>
              <Text size="xl" fw={700} mt="xs">15</Text>
              <Group gap={4} mt="xs">
                <ThemeIcon size="xs" color="blue" variant="light" radius="xl">
                  <IconArrowUpRight size={10} />
                </ThemeIcon>
                <Text size="xs" c="blue">+25% vs mes anterior</Text>
              </Group>
            </Paper>

            <Paper withBorder radius="lg" p="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Bajas Este Mes</Text>
              <Text size="xl" fw={700} mt="xs">5</Text>
              <Group gap={4} mt="xs">
                <ThemeIcon size="xs" color="green" variant="light" radius="xl">
                  <IconArrowDownRight size={10} />
                </ThemeIcon>
                <Text size="xs" c="green">-2 vs mes anterior</Text>
              </Group>
            </Paper>
          </SimpleGrid>

          <Paper withBorder radius="lg" p="lg">
            <Text fw={600} mb="lg">Todos los Clientes</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Sesiones</Table.Th>
                  <Table.Th>Cumplimiento</Table.Th>
                  <Table.Th>Ingresos</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {topClients.map((client) => (
                  <Table.Tr key={client.name}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{client.name}</Text>
                    </Table.Td>
                    <Table.Td>{client.sessions}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Progress value={client.compliance} size="sm" w={60} color="green" />
                        <Text size="xs">{client.compliance}%</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>€{client.revenue}</Table.Td>
                    <Table.Td>
                      <Badge color="green" variant="light">Activo</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="activity">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} mb="lg">Reservas por Día de la Semana</Text>
              <Stack gap="sm">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, index) => {
                  const value = [28, 32, 25, 30, 35, 20, 10][index]
                  const max = 35
                  return (
                    <Group key={day} gap="sm">
                      <Text size="sm" w={80}>{day}</Text>
                      <Progress
                        value={(value / max) * 100}
                        size="lg"
                        style={{ flex: 1 }}
                        color="blue"
                      />
                      <Text size="sm" fw={500} w={30}>{value}</Text>
                    </Group>
                  )
                })}
              </Stack>
            </Paper>

            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} mb="lg">Horarios Más Populares</Text>
              <Stack gap="sm">
                {['08:00', '09:00', '10:00', '17:00', '18:00', '19:00', '20:00'].map((hour, index) => {
                  const value = [15, 22, 18, 25, 30, 28, 20][index]
                  const max = 30
                  return (
                    <Group key={hour} gap="sm">
                      <Text size="sm" w={60}>{hour}</Text>
                      <Progress
                        value={(value / max) * 100}
                        size="lg"
                        style={{ flex: 1 }}
                        color="grape"
                      />
                      <Text size="sm" fw={500} w={30}>{value}</Text>
                    </Group>
                  )
                })}
              </Stack>
            </Paper>

            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} mb="lg">Tasa de Cumplimiento por Programa</Text>
              <Stack gap="md">
                {[
                  { name: 'Hipertrofia', compliance: 92 },
                  { name: 'Pérdida de Peso', compliance: 85 },
                  { name: 'Fuerza', compliance: 88 },
                  { name: 'Tonificación', compliance: 90 },
                ].map((program) => (
                  <Box key={program.name}>
                    <Group justify="space-between" mb={4}>
                      <Text size="sm">{program.name}</Text>
                      <Text size="sm" fw={500}>{program.compliance}%</Text>
                    </Group>
                    <Progress
                      value={program.compliance}
                      size="md"
                      color={program.compliance >= 90 ? 'green' : program.compliance >= 80 ? 'yellow' : 'red'}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} mb="lg">Tipos de Sesión</Text>
              <Group justify="center" mb="md">
                <RingProgress
                  size={160}
                  thickness={16}
                  roundCaps
                  sections={[
                    { value: 60, color: 'blue', tooltip: 'Individual: 60%' },
                    { value: 25, color: 'green', tooltip: 'Grupal: 25%' },
                    { value: 15, color: 'orange', tooltip: 'Online: 15%' },
                  ]}
                  label={
                    <Box ta="center">
                      <Text size="lg" fw={700}>156</Text>
                      <Text size="xs" c="dimmed">Total</Text>
                    </Box>
                  }
                />
              </Group>
              <SimpleGrid cols={3} spacing="sm">
                <Group gap="xs" justify="center">
                  <Box w={12} h={12} style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-blue-6)' }} />
                  <Text size="xs">Individual (60%)</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box w={12} h={12} style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-green-6)' }} />
                  <Text size="xs">Grupal (25%)</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box w={12} h={12} style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-6)' }} />
                  <Text size="xs">Online (15%)</Text>
                </Group>
              </SimpleGrid>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}

export default ReportsPage
