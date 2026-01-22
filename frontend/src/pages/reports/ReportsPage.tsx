import {
  ActionIcon,
  Badge,
  Box,
  Container,
  Group,
  Paper,
  Progress,
  RingProgress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendarEvent,
  IconChartBar,
  IconChartLine,
  IconChartPie,
  IconCreditCard,
  IconDownload,
  IconFileSpreadsheet,
  IconRefresh,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { StatsCard } from "../../components/common/StatsCard";
import { useKPIs, useRevenueChart, useClientsChart } from "../../hooks/useReports";

export function ReportsPage() {
  const [period, setPeriod] = useState<string | null>("30");
  const [activeTab, setActiveTab] = useState<string | null>("overview");

  // Use real data from API
  const { data: kpisData } = useKPIs();
  const { data: revenueData = [] } = useRevenueChart(7);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _clientsChartData = [] } = useClientsChart(6);
  
  // Map API data to UI format
  const kpis = {
    mrr: kpisData?.mrr || 0,
    mrrChange: (kpisData?.revenue_last_month || 0) > 0 
      ? Math.round(((kpisData?.revenue_this_month || 0) - (kpisData?.revenue_last_month || 0)) / (kpisData?.revenue_last_month || 1) * 100) 
      : 0,
    totalClients: kpisData?.total_clients || 0,
    clientsChange: 0,
    activeClients: kpisData?.active_clients || 0,
    churnRate: kpisData?.churn_rate || 0,
    avgRevenue: kpisData?.arpa || 0,
    bookingsThisMonth: kpisData?.completed_sessions_month || 0,
    bookingsChange: 0,
    completionRate: kpisData?.completed_sessions_month && kpisData?.upcoming_sessions 
      ? Math.round((kpisData.completed_sessions_month / (kpisData.completed_sessions_month + kpisData.upcoming_sessions)) * 100) 
      : 0,
  };
  
  // Convert chart data
  const revenueChartData = revenueData.map((d: { label: string; value: number }) => ({
    month: d.label,
    revenue: d.value,
    clients: 0,
  }));
  
  // Client activity data (calculated from kpis)
  const clientActivityData = kpis.totalClients > 0 ? [
    { name: "Activos", value: kpis.activeClients, color: "green" },
    { name: "Inactivos", value: kpis.totalClients - kpis.activeClients, color: "gray" },
  ] : [];
  
  // Empty arrays for tables that need specific API endpoints
  const topClients: { name: string; sessions: number; revenue: number; compliance: number }[] = [];
  const recentPayments: { client: string; amount: number; date: string; status: string }[] = [];

  const maxRevenue = Math.max(...revenueChartData.map((d) => d.revenue), 1);

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Exportar Datos",
          icon: <IconDownload size={16} />,
          onClick: () => console.log("Export"),
        }}
        description="Analiza el rendimiento de tu negocio"
        secondaryAction={{
          label: "Actualizar",
          icon: <IconRefresh size={16} />,
          onClick: () => console.log("Refresh"),
          variant: "default",
        }}
        title="Reportes y Analytics"
      >
        <Group>
          <Select
            data={[
              { value: "7", label: "Últimos 7 días" },
              { value: "30", label: "Últimos 30 días" },
              { value: "90", label: "Últimos 90 días" },
              { value: "365", label: "Este año" },
            ]}
            onChange={setPeriod}
            placeholder="Período"
            value={period}
            w={180}
          />
        </Group>
      </PageHeader>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl" spacing="md">
        <StatsCard
          change={kpis.mrrChange}
          changeLabel="vs mes anterior"
          color="green"
          icon={<IconCreditCard size={24} />}
          title="MRR"
          value={`€${kpis.mrr.toLocaleString()}`}
        />
        <StatsCard
          change={kpis.clientsChange}
          changeLabel="nuevos este mes"
          color="blue"
          icon={<IconUsers size={24} />}
          title="Clientes Totales"
          value={kpis.totalClients}
        />
        <StatsCard
          change={kpis.bookingsChange}
          changeLabel="vs mes anterior"
          color="grape"
          icon={<IconCalendarEvent size={24} />}
          title="Reservas del Mes"
          value={kpis.bookingsThisMonth}
        />
        <StatsCard
          change={3}
          changeLabel="vs mes anterior"
          color="teal"
          icon={<IconTrendingUp size={24} />}
          title="Tasa de Cumplimiento"
          value={`${kpis.completionRate}%`}
        />
      </SimpleGrid>

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconChartBar size={14} />} value="overview">
            Resumen
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconChartLine size={14} />} value="revenue">
            Ingresos
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconUsers size={14} />} value="clients">
            Clientes
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconChartPie size={14} />} value="activity">
            Actividad
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            {/* Revenue Chart */}
            <Paper p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600}>Ingresos Mensuales</Text>
                  <Text c="dimmed" size="xs">
                    Evolución de los últimos 7 meses
                  </Text>
                </Box>
                <Badge color="green" variant="light">
                  <Group gap={4}>
                    <IconArrowUpRight size={12} />+{kpis.mrrChange}%
                  </Group>
                </Badge>
              </Group>

              <Box h={200}>
                <Group align="flex-end" gap={4} h="100%">
                  {revenueChartData.map((item, index) => (
                    <Tooltip
                      key={item.month}
                      label={`${item.month}: €${item.revenue}`}
                      withArrow
                    >
                      <Box
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "var(--mantine-color-green-4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            index === revenueChartData.length - 1
                              ? "var(--mantine-color-green-6)"
                              : "var(--mantine-color-green-2)";
                        }}
                        style={{
                          flex: 1,
                          height: `${(item.revenue / maxRevenue) * 100}%`,
                          backgroundColor:
                            index === revenueChartData.length - 1
                              ? "var(--mantine-color-green-6)"
                              : "var(--mantine-color-green-2)",
                          borderRadius: "4px 4px 0 0",
                          transition: "all 0.2s",
                          cursor: "pointer",
                          minHeight: 4,
                        }}
                      />
                    </Tooltip>
                  ))}
                </Group>
                <Group gap={4} mt="xs">
                  {revenueChartData.map((item) => (
                    <Text
                      c="dimmed"
                      key={item.month}
                      size="xs"
                      style={{ flex: 1 }}
                      ta="center"
                    >
                      {item.month}
                    </Text>
                  ))}
                </Group>
              </Box>
            </Paper>

            {/* Client Distribution */}
            <Paper p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600}>Distribución de Clientes</Text>
                  <Text c="dimmed" size="xs">
                    Estado actual de tu base de clientes
                  </Text>
                </Box>
              </Group>

              <Group justify="center" mb="md">
                <RingProgress
                  label={
                    <Box ta="center">
                      <Text fw={700} size="xl">
                        {kpis.totalClients}
                      </Text>
                      <Text c="dimmed" size="xs">
                        Total
                      </Text>
                    </Box>
                  }
                  roundCaps
                  sections={clientActivityData.map((item) => ({
                    value: item.value,
                    color: item.color,
                    tooltip: `${item.name}: ${item.value}`,
                  }))}
                  size={180}
                  thickness={20}
                />
              </Group>

              <SimpleGrid cols={2} spacing="sm">
                {clientActivityData.map((item) => (
                  <Group gap="xs" key={item.name}>
                    <Box
                      h={12}
                      style={{
                        borderRadius: "50%",
                        backgroundColor: `var(--mantine-color-${item.color}-6)`,
                      }}
                      w={12}
                    />
                    <Text size="sm">{item.name}</Text>
                    <Text fw={600} ml="auto" size="sm">
                      {item.value}
                    </Text>
                  </Group>
                ))}
              </SimpleGrid>
            </Paper>

            {/* Top Clients */}
            <Paper p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600}>Top Clientes</Text>
                  <Text c="dimmed" size="xs">
                    Por número de sesiones este mes
                  </Text>
                </Box>
                <ActionIcon color="gray" variant="subtle">
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
                        <Text fw={500} size="sm">
                          {client.name}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge variant="light">{client.sessions}</Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Group gap="xs" justify="center">
                          <Progress
                            color={
                              client.compliance >= 90
                                ? "green"
                                : client.compliance >= 80
                                  ? "yellow"
                                  : "red"
                            }
                            size="sm"
                            value={client.compliance}
                            w={60}
                          />
                          <Text size="xs">{client.compliance}%</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={500} size="sm">
                          €{client.revenue}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            {/* Recent Payments */}
            <Paper p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600}>Pagos Recientes</Text>
                  <Text c="dimmed" size="xs">
                    Últimas transacciones
                  </Text>
                </Box>
                <ActionIcon color="gray" variant="subtle">
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
                        <Text fw={500} size="sm">
                          {payment.client}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="dimmed" size="sm">
                          {payment.date}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge
                          color={
                            payment.status === "completed" ? "green" : "yellow"
                          }
                          variant="light"
                        >
                          {payment.status === "completed"
                            ? "Completado"
                            : "Pendiente"}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={500} size="sm">
                          €{payment.amount}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="revenue">
          <SimpleGrid cols={{ base: 1, lg: 3 }} mb="lg" spacing="lg">
            <Paper p="lg" radius="lg" withBorder>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                MRR Actual
              </Text>
              <Text fw={700} mt="xs" size="xl">
                €{kpis.mrr.toLocaleString()}
              </Text>
              <Group gap={4} mt="xs">
                <ThemeIcon color="green" radius="xl" size="xs" variant="light">
                  <IconArrowUpRight size={10} />
                </ThemeIcon>
                <Text c="green" size="xs">
                  +{kpis.mrrChange}% vs mes anterior
                </Text>
              </Group>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                ARPU
              </Text>
              <Text fw={700} mt="xs" size="xl">
                €{kpis.avgRevenue.toFixed(2)}
              </Text>
              <Text c="dimmed" mt="xs" size="xs">
                Ingreso promedio por usuario
              </Text>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Churn Rate
              </Text>
              <Text fw={700} mt="xs" size="xl">
                {kpis.churnRate}%
              </Text>
              <Group gap={4} mt="xs">
                <ThemeIcon color="red" radius="xl" size="xs" variant="light">
                  <IconArrowDownRight size={10} />
                </ThemeIcon>
                <Text c="red" size="xs">
                  -0.5% vs mes anterior
                </Text>
              </Group>
            </Paper>
          </SimpleGrid>

          <Paper p="lg" radius="lg" withBorder>
            <Text fw={600} mb="lg">
              Evolución de Ingresos
            </Text>
            <Box h={300}>
              <Group align="flex-end" gap={8} h="100%">
                {revenueChartData.map((item) => (
                  <Box key={item.month} style={{ flex: 1 }}>
                    <Tooltip label={`€${item.revenue}`} withArrow>
                      <Box
                        style={{
                          height: `${(item.revenue / maxRevenue) * 100}%`,
                          backgroundColor: "var(--mantine-color-green-5)",
                          borderRadius: "4px 4px 0 0",
                          minHeight: 20,
                        }}
                      />
                    </Tooltip>
                    <Text c="dimmed" mt="xs" size="xs" ta="center">
                      {item.month}
                    </Text>
                    <Text fw={500} size="xs" ta="center">
                      €{item.revenue}
                    </Text>
                  </Box>
                ))}
              </Group>
            </Box>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="clients">
          <SimpleGrid cols={{ base: 1, lg: 3 }} mb="lg" spacing="lg">
            <Paper p="lg" radius="lg" withBorder>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Clientes Activos
              </Text>
              <Text fw={700} mt="xs" size="xl">
                {kpis.activeClients}
              </Text>
              <Progress
                color="green"
                mt="md"
                size="sm"
                value={(kpis.activeClients / kpis.totalClients) * 100}
              />
              <Text c="dimmed" mt="xs" size="xs">
                {((kpis.activeClients / kpis.totalClients) * 100).toFixed(1)}%
                del total
              </Text>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Sesiones Completadas
              </Text>
              <Text fw={700} mt="xs" size="xl">
                {kpis.bookingsThisMonth}
              </Text>
              <Text c="dimmed" mt="xs" size="xs">
                Este mes
              </Text>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Tasa de Abandono
              </Text>
              <Text fw={700} mt="xs" size="xl">
                {kpis.churnRate}%
              </Text>
              <Text c="dimmed" mt="xs" size="xs">
                Churn rate mensual
              </Text>
            </Paper>
          </SimpleGrid>

          <Paper p="lg" radius="lg" withBorder>
            <Text fw={600} mb="lg">
              Todos los Clientes
            </Text>
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
                      <Text fw={500} size="sm">
                        {client.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>{client.sessions}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Progress
                          color="green"
                          size="sm"
                          value={client.compliance}
                          w={60}
                        />
                        <Text size="xs">{client.compliance}%</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>€{client.revenue}</Table.Td>
                    <Table.Td>
                      <Badge color="green" variant="light">
                        Activo
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="activity">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Reservas por Día de la Semana
              </Text>
              {kpis.bookingsThisMonth > 0 ? (
              <Stack gap="sm">
                {[
                  "Lunes",
                  "Martes",
                  "Miércoles",
                  "Jueves",
                  "Viernes",
                  "Sábado",
                  "Domingo",
                ].map((day) => (
                    <Group gap="sm" key={day}>
                      <Text size="sm" w={80}>
                        {day}
                      </Text>
                      <Progress
                        color="blue"
                        size="lg"
                        style={{ flex: 1 }}
                        value={0}
                      />
                      <Text fw={500} size="sm" w={30}>
                        -
                      </Text>
                    </Group>
                ))}
              </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  Sin datos de reservas aún
                </Text>
              )}
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Horarios Más Populares
              </Text>
              {kpis.bookingsThisMonth > 0 ? (
              <Stack gap="sm">
                {[
                  "08:00",
                  "09:00",
                  "10:00",
                  "17:00",
                  "18:00",
                  "19:00",
                  "20:00",
                ].map((hour) => (
                    <Group gap="sm" key={hour}>
                      <Text size="sm" w={60}>
                        {hour}
                      </Text>
                      <Progress
                        color="grape"
                        size="lg"
                        style={{ flex: 1 }}
                        value={0}
                      />
                      <Text fw={500} size="sm" w={30}>
                        -
                      </Text>
                    </Group>
                ))}
              </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  Sin datos de horarios aún
                </Text>
              )}
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Resumen de Actividad
              </Text>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm">Sesiones Completadas</Text>
                  <Text fw={500} size="sm">{kpis.bookingsThisMonth}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Tasa de Cumplimiento</Text>
                  <Text fw={500} size="sm">{kpis.completionRate}%</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Clientes Activos</Text>
                  <Text fw={500} size="sm">{kpis.activeClients}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Ingreso Promedio por Cliente</Text>
                  <Text fw={500} size="sm">€{kpis.avgRevenue.toFixed(2)}</Text>
                </Group>
              </Stack>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Distribución de Clientes
              </Text>
              <Group justify="center" mb="md">
                <RingProgress
                  label={
                    <Box ta="center">
                      <Text fw={700} size="lg">
                        {kpis.totalClients}
                      </Text>
                      <Text c="dimmed" size="xs">
                        Total
                      </Text>
                    </Box>
                  }
                  roundCaps
                  sections={kpis.totalClients > 0 ? [
                    { value: (kpis.activeClients / kpis.totalClients) * 100, color: "green", tooltip: `Activos: ${kpis.activeClients}` },
                    { value: ((kpis.totalClients - kpis.activeClients) / kpis.totalClients) * 100, color: "gray", tooltip: `Inactivos: ${kpis.totalClients - kpis.activeClients}` },
                  ] : [{ value: 100, color: "gray", tooltip: "Sin clientes" }]}
                  size={160}
                  thickness={16}
                />
              </Group>
              <SimpleGrid cols={2} spacing="sm">
                <Group gap="xs" justify="center">
                  <Box
                    h={12}
                    style={{
                      borderRadius: "50%",
                      backgroundColor: "var(--mantine-color-green-6)",
                    }}
                    w={12}
                  />
                  <Text size="xs">Activos ({kpis.activeClients})</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box
                    h={12}
                    style={{
                      borderRadius: "50%",
                      backgroundColor: "var(--mantine-color-gray-6)",
                    }}
                    w={12}
                  />
                  <Text size="xs">Inactivos ({kpis.totalClients - kpis.activeClients})</Text>
                </Group>
              </SimpleGrid>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

export default ReportsPage;
