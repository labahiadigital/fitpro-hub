import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  Select,
  Stack,
  Tabs,
  Box,
  Text,
  SimpleGrid,
  Table,
  Progress,
  Badge,
  ThemeIcon,
  RingProgress,
  Center,
} from '@mantine/core'
import {
  IconChartBar,
  IconUsers,
  IconCreditCard,
  IconCalendarEvent,
  IconDownload,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowUpRight,
  IconArrowDownRight,
  IconActivity,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { StatsCard } from '../../components/common/StatsCard'

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('overview')
  const [period, setPeriod] = useState('month')
  
  // Mock KPIs
  const kpis = {
    mrr: 4850,
    mrr_change: 12.5,
    active_clients: 42,
    clients_change: 8,
    sessions_completed: 156,
    sessions_change: 15,
    churn_rate: 2.3,
    arpa: 115.48,
    retention_rate: 97.7,
    nps: 72,
  }
  
  // Mock revenue data
  const revenueData = [
    { month: 'Ago', revenue: 3200, subscriptions: 28, one_time: 450 },
    { month: 'Sep', revenue: 3650, subscriptions: 32, one_time: 380 },
    { month: 'Oct', revenue: 4100, subscriptions: 36, one_time: 520 },
    { month: 'Nov', revenue: 4320, subscriptions: 38, one_time: 400 },
    { month: 'Dic', revenue: 4580, subscriptions: 40, one_time: 480 },
    { month: 'Ene', revenue: 4850, subscriptions: 42, one_time: 550 },
  ]
  
  // Mock client metrics
  const clientMetrics = [
    { name: 'María García', sessions: 12, adherence: 95, revenue: 149 },
    { name: 'Carlos López', sessions: 8, adherence: 85, revenue: 99 },
    { name: 'Ana Martínez', sessions: 10, adherence: 92, revenue: 149 },
    { name: 'Pedro Sánchez', sessions: 6, adherence: 78, revenue: 79 },
    { name: 'Laura Fernández', sessions: 11, adherence: 88, revenue: 149 },
  ]
  
  // Mock team performance
  const teamPerformance = [
    { name: 'Tu', sessions: 85, clients: 28, revenue: 3200, rating: 4.9 },
    { name: 'Ana García', sessions: 42, clients: 14, revenue: 1650, rating: 4.7 },
  ]
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Reportes y Analytics"
        description="Analiza el rendimiento de tu negocio"
        secondaryAction={{
          label: 'Exportar',
          icon: <IconDownload size={16} />,
          onClick: () => {},
          variant: 'default',
        }}
      >
        <Group>
          <Select
            value={period}
            onChange={(v) => setPeriod(v || 'month')}
            data={[
              { value: 'week', label: 'Esta semana' },
              { value: 'month', label: 'Este mes' },
              { value: 'quarter', label: 'Este trimestre' },
              { value: 'year', label: 'Este año' },
            ]}
            size="sm"
            w={150}
          />
        </Group>
      </PageHeader>
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={14} />}>
            Resumen
          </Tabs.Tab>
          <Tabs.Tab value="revenue" leftSection={<IconCreditCard size={14} />}>
            Ingresos
          </Tabs.Tab>
          <Tabs.Tab value="clients" leftSection={<IconUsers size={14} />}>
            Clientes
          </Tabs.Tab>
          <Tabs.Tab value="team" leftSection={<IconActivity size={14} />}>
            Equipo
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="overview">
          {/* KPIs principales */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
            <StatsCard
              title="MRR"
              value={formatCurrency(kpis.mrr)}
              icon={<IconTrendingUp size={24} />}
              change={kpis.mrr_change}
              changeLabel="vs mes anterior"
              color="green"
            />
            <StatsCard
              title="Clientes Activos"
              value={kpis.active_clients}
              icon={<IconUsers size={24} />}
              change={kpis.clients_change}
              changeLabel="vs mes anterior"
              color="blue"
            />
            <StatsCard
              title="Sesiones Completadas"
              value={kpis.sessions_completed}
              icon={<IconCalendarEvent size={24} />}
              change={kpis.sessions_change}
              changeLabel="vs mes anterior"
              color="primary"
            />
            <StatsCard
              title="Tasa de Retención"
              value={`${kpis.retention_rate}%`}
              icon={<IconActivity size={24} />}
              color="violet"
            />
          </SimpleGrid>
          
          {/* Métricas adicionales */}
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb="xl">
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="md">
                <Text size="sm" c="dimmed" fw={500}>ARPA (Ingreso por cliente)</Text>
                <Badge color="green" variant="light">
                  <Group gap={4}>
                    <IconArrowUpRight size={12} />
                    5%
                  </Group>
                </Badge>
              </Group>
              <Text size="xl" fw={700}>{formatCurrency(kpis.arpa)}</Text>
              <Text size="xs" c="dimmed" mt={4}>Promedio mensual por cliente activo</Text>
            </Paper>
            
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="md">
                <Text size="sm" c="dimmed" fw={500}>Tasa de Churn</Text>
                <Badge color="green" variant="light">
                  <Group gap={4}>
                    <IconArrowDownRight size={12} />
                    0.5%
                  </Group>
                </Badge>
              </Group>
              <Text size="xl" fw={700}>{kpis.churn_rate}%</Text>
              <Text size="xs" c="dimmed" mt={4}>Clientes perdidos este mes</Text>
            </Paper>
            
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="md">
                <Text size="sm" c="dimmed" fw={500}>NPS Score</Text>
                <Badge color="green" variant="light">Excelente</Badge>
              </Group>
              <Group align="flex-end" gap="xs">
                <Text size="xl" fw={700}>{kpis.nps}</Text>
                <Text size="sm" c="dimmed" mb={4}>/ 100</Text>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>Net Promoter Score</Text>
            </Paper>
          </SimpleGrid>
          
          {/* Gráfico de evolución */}
          <Paper withBorder radius="lg" p="lg">
            <Group justify="space-between" mb="lg">
              <Box>
                <Text fw={600}>Evolución de Ingresos</Text>
                <Text size="sm" c="dimmed">Últimos 6 meses</Text>
              </Box>
            </Group>
            
            <Box h={200}>
              {/* Placeholder para gráfico - en producción usarías recharts o similar */}
              <Group h="100%" align="flex-end" gap="md" justify="space-around">
                {revenueData.map((data, index) => (
                  <Stack key={index} gap={4} align="center">
                    <Box
                      w={40}
                      h={`${(data.revenue / 5000) * 150}px`}
                      style={{
                        background: 'linear-gradient(180deg, var(--mantine-color-primary-5) 0%, var(--mantine-color-primary-7) 100%)',
                        borderRadius: 'var(--mantine-radius-sm)',
                      }}
                    />
                    <Text size="xs" c="dimmed">{data.month}</Text>
                    <Text size="xs" fw={500}>{formatCurrency(data.revenue)}</Text>
                  </Stack>
                ))}
              </Group>
            </Box>
          </Paper>
        </Tabs.Panel>
        
        <Tabs.Panel value="revenue">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="xl">
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} mb="lg">Desglose de Ingresos</Text>
              
              <Stack gap="md">
                <Box>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Suscripciones</Text>
                    <Text size="sm" fw={500}>{formatCurrency(4200)}</Text>
                  </Group>
                  <Progress value={86} color="primary" size="sm" />
                </Box>
                <Box>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Bonos/Paquetes</Text>
                    <Text size="sm" fw={500}>{formatCurrency(450)}</Text>
                  </Group>
                  <Progress value={9} color="blue" size="sm" />
                </Box>
                <Box>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Pagos únicos</Text>
                    <Text size="sm" fw={500}>{formatCurrency(200)}</Text>
                  </Group>
                  <Progress value={5} color="green" size="sm" />
                </Box>
              </Stack>
            </Paper>
            
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} mb="lg">Estado de Cobros</Text>
              
              <Center>
                <RingProgress
                  size={180}
                  thickness={16}
                  sections={[
                    { value: 92, color: 'green' },
                    { value: 5, color: 'yellow' },
                    { value: 3, color: 'red' },
                  ]}
                  label={
                    <Center>
                      <Stack gap={0} align="center">
                        <Text size="xl" fw={700}>92%</Text>
                        <Text size="xs" c="dimmed">Cobrados</Text>
                      </Stack>
                    </Center>
                  }
                />
              </Center>
              
              <Group justify="center" mt="md" gap="xl">
                <Group gap="xs">
                  <Box w={12} h={12} style={{ background: 'var(--mantine-color-green-6)', borderRadius: 4 }} />
                  <Text size="xs">Cobrados (92%)</Text>
                </Group>
                <Group gap="xs">
                  <Box w={12} h={12} style={{ background: 'var(--mantine-color-yellow-6)', borderRadius: 4 }} />
                  <Text size="xs">Pendientes (5%)</Text>
                </Group>
                <Group gap="xs">
                  <Box w={12} h={12} style={{ background: 'var(--mantine-color-red-6)', borderRadius: 4 }} />
                  <Text size="xs">Fallidos (3%)</Text>
                </Group>
              </Group>
            </Paper>
          </SimpleGrid>
          
          <Paper withBorder radius="lg" p="lg">
            <Text fw={600} mb="lg">Historial Mensual</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Mes</Table.Th>
                  <Table.Th>Ingresos Totales</Table.Th>
                  <Table.Th>Suscripciones</Table.Th>
                  <Table.Th>Otros</Table.Th>
                  <Table.Th>Variación</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {revenueData.slice().reverse().map((data, index) => {
                  const prevRevenue = revenueData[revenueData.length - 2 - index]?.revenue || data.revenue
                  const change = ((data.revenue - prevRevenue) / prevRevenue) * 100
                  return (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{data.month} 2024</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>{formatCurrency(data.revenue)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{data.subscriptions} activas</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatCurrency(data.one_time)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={change >= 0 ? 'green' : 'red'}
                          variant="light"
                          size="sm"
                        >
                          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
        
        <Tabs.Panel value="clients">
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb="xl">
            <Paper withBorder radius="lg" p="lg">
              <Text size="sm" c="dimmed" fw={500}>Nuevos Clientes</Text>
              <Group align="flex-end" gap="xs" mt="sm">
                <Text size="xl" fw={700}>8</Text>
                <Badge color="green" variant="light" size="sm">
                  <Group gap={2}>
                    <IconArrowUpRight size={10} />
                    +33%
                  </Group>
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>Este mes</Text>
            </Paper>
            
            <Paper withBorder radius="lg" p="lg">
              <Text size="sm" c="dimmed" fw={500}>Clientes Perdidos</Text>
              <Group align="flex-end" gap="xs" mt="sm">
                <Text size="xl" fw={700}>1</Text>
                <Badge color="green" variant="light" size="sm">
                  <Group gap={2}>
                    <IconArrowDownRight size={10} />
                    -50%
                  </Group>
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>Este mes</Text>
            </Paper>
            
            <Paper withBorder radius="lg" p="lg">
              <Text size="sm" c="dimmed" fw={500}>Adherencia Media</Text>
              <Group align="flex-end" gap="xs" mt="sm">
                <Text size="xl" fw={700}>87%</Text>
                <Badge color="green" variant="light" size="sm">
                  <Group gap={2}>
                    <IconArrowUpRight size={10} />
                    +5%
                  </Group>
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>Cumplimiento de planes</Text>
            </Paper>
          </SimpleGrid>
          
          <Paper withBorder radius="lg" p="lg">
            <Text fw={600} mb="lg">Rendimiento por Cliente</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Sesiones</Table.Th>
                  <Table.Th>Adherencia</Table.Th>
                  <Table.Th>Ingresos</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {clientMetrics.map((client, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{client.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{client.sessions} este mes</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Progress
                          value={client.adherence}
                          size="sm"
                          w={80}
                          color={client.adherence >= 90 ? 'green' : client.adherence >= 75 ? 'yellow' : 'red'}
                        />
                        <Text size="xs">{client.adherence}%</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{formatCurrency(client.revenue)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
        
        <Tabs.Panel value="team">
          <Paper withBorder radius="lg" p="lg">
            <Text fw={600} mb="lg">Rendimiento del Equipo</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Miembro</Table.Th>
                  <Table.Th>Sesiones</Table.Th>
                  <Table.Th>Clientes</Table.Th>
                  <Table.Th>Ingresos Generados</Table.Th>
                  <Table.Th>Valoración</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {teamPerformance.map((member, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{member.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{member.sessions}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{member.clients}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{formatCurrency(member.revenue)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="green" variant="light">
                        ⭐ {member.rating}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}

