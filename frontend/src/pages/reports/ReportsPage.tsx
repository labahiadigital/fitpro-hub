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

// Mock data for charts
const revenueData = [
  { month: "Ene", revenue: 4200, clients: 45 },
  { month: "Feb", revenue: 4800, clients: 48 },
  { month: "Mar", revenue: 5100, clients: 52 },
  { month: "Abr", revenue: 4900, clients: 50 },
  { month: "May", revenue: 5600, clients: 58 },
  { month: "Jun", revenue: 6200, clients: 65 },
  { month: "Jul", revenue: 6800, clients: 72 },
];

const clientActivityData = [
  { name: "Activos", value: 72, color: "green" },
  { name: "Inactivos", value: 18, color: "yellow" },
  { name: "Nuevos", value: 15, color: "blue" },
  { name: "Bajas", value: 5, color: "red" },
];

const topClients = [
  { name: "María García", sessions: 24, revenue: 480, compliance: 95 },
  { name: "Carlos López", sessions: 20, revenue: 400, compliance: 88 },
  { name: "Ana Martínez", sessions: 18, revenue: 360, compliance: 92 },
  { name: "Pedro Sánchez", sessions: 16, revenue: 320, compliance: 85 },
  { name: "Laura Fernández", sessions: 14, revenue: 280, compliance: 90 },
];

const recentPayments = [
  {
    client: "María García",
    amount: 120,
    date: "2024-07-20",
    status: "completed",
  },
  {
    client: "Carlos López",
    amount: 80,
    date: "2024-07-19",
    status: "completed",
  },
  {
    client: "Ana Martínez",
    amount: 120,
    date: "2024-07-18",
    status: "completed",
  },
  {
    client: "Pedro Sánchez",
    amount: 80,
    date: "2024-07-17",
    status: "pending",
  },
  {
    client: "Laura Fernández",
    amount: 120,
    date: "2024-07-16",
    status: "completed",
  },
];

export function ReportsPage() {
  const [period, setPeriod] = useState<string | null>("30");
  const [activeTab, setActiveTab] = useState<string | null>("overview");

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
  };

  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue));

  return (
    <Container py="xl" size="xl">
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
                  {revenueData.map((item, index) => (
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
                            index === revenueData.length - 1
                              ? "var(--mantine-color-green-6)"
                              : "var(--mantine-color-green-2)";
                        }}
                        style={{
                          flex: 1,
                          height: `${(item.revenue / maxRevenue) * 100}%`,
                          backgroundColor:
                            index === revenueData.length - 1
                              ? "var(--mantine-color-green-6)"
                              : "var(--mantine-color-green-2)",
                          borderRadius: "4px 4px 0 0",
                          transition: "all 0.2s",
                          cursor: "pointer",
                        }}
                      />
                    </Tooltip>
                  ))}
                </Group>
                <Group gap={4} mt="xs">
                  {revenueData.map((item) => (
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
                {revenueData.map((item) => (
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
                Nuevos Este Mes
              </Text>
              <Text fw={700} mt="xs" size="xl">
                15
              </Text>
              <Group gap={4} mt="xs">
                <ThemeIcon color="blue" radius="xl" size="xs" variant="light">
                  <IconArrowUpRight size={10} />
                </ThemeIcon>
                <Text c="blue" size="xs">
                  +25% vs mes anterior
                </Text>
              </Group>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Bajas Este Mes
              </Text>
              <Text fw={700} mt="xs" size="xl">
                5
              </Text>
              <Group gap={4} mt="xs">
                <ThemeIcon color="green" radius="xl" size="xs" variant="light">
                  <IconArrowDownRight size={10} />
                </ThemeIcon>
                <Text c="green" size="xs">
                  -2 vs mes anterior
                </Text>
              </Group>
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
              <Stack gap="sm">
                {[
                  "Lunes",
                  "Martes",
                  "Miércoles",
                  "Jueves",
                  "Viernes",
                  "Sábado",
                  "Domingo",
                ].map((day, index) => {
                  const value = [28, 32, 25, 30, 35, 20, 10][index];
                  const max = 35;
                  return (
                    <Group gap="sm" key={day}>
                      <Text size="sm" w={80}>
                        {day}
                      </Text>
                      <Progress
                        color="blue"
                        size="lg"
                        style={{ flex: 1 }}
                        value={(value / max) * 100}
                      />
                      <Text fw={500} size="sm" w={30}>
                        {value}
                      </Text>
                    </Group>
                  );
                })}
              </Stack>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Horarios Más Populares
              </Text>
              <Stack gap="sm">
                {[
                  "08:00",
                  "09:00",
                  "10:00",
                  "17:00",
                  "18:00",
                  "19:00",
                  "20:00",
                ].map((hour, index) => {
                  const value = [15, 22, 18, 25, 30, 28, 20][index];
                  const max = 30;
                  return (
                    <Group gap="sm" key={hour}>
                      <Text size="sm" w={60}>
                        {hour}
                      </Text>
                      <Progress
                        color="grape"
                        size="lg"
                        style={{ flex: 1 }}
                        value={(value / max) * 100}
                      />
                      <Text fw={500} size="sm" w={30}>
                        {value}
                      </Text>
                    </Group>
                  );
                })}
              </Stack>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Tasa de Cumplimiento por Programa
              </Text>
              <Stack gap="md">
                {[
                  { name: "Hipertrofia", compliance: 92 },
                  { name: "Pérdida de Peso", compliance: 85 },
                  { name: "Fuerza", compliance: 88 },
                  { name: "Tonificación", compliance: 90 },
                ].map((program) => (
                  <Box key={program.name}>
                    <Group justify="space-between" mb={4}>
                      <Text size="sm">{program.name}</Text>
                      <Text fw={500} size="sm">
                        {program.compliance}%
                      </Text>
                    </Group>
                    <Progress
                      color={
                        program.compliance >= 90
                          ? "green"
                          : program.compliance >= 80
                            ? "yellow"
                            : "red"
                      }
                      size="md"
                      value={program.compliance}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Tipos de Sesión
              </Text>
              <Group justify="center" mb="md">
                <RingProgress
                  label={
                    <Box ta="center">
                      <Text fw={700} size="lg">
                        156
                      </Text>
                      <Text c="dimmed" size="xs">
                        Total
                      </Text>
                    </Box>
                  }
                  roundCaps
                  sections={[
                    { value: 60, color: "blue", tooltip: "Individual: 60%" },
                    { value: 25, color: "green", tooltip: "Grupal: 25%" },
                    { value: 15, color: "orange", tooltip: "Online: 15%" },
                  ]}
                  size={160}
                  thickness={16}
                />
              </Group>
              <SimpleGrid cols={3} spacing="sm">
                <Group gap="xs" justify="center">
                  <Box
                    h={12}
                    style={{
                      borderRadius: "50%",
                      backgroundColor: "var(--mantine-color-blue-6)",
                    }}
                    w={12}
                  />
                  <Text size="xs">Individual (60%)</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box
                    h={12}
                    style={{
                      borderRadius: "50%",
                      backgroundColor: "var(--mantine-color-green-6)",
                    }}
                    w={12}
                  />
                  <Text size="xs">Grupal (25%)</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box
                    h={12}
                    style={{
                      borderRadius: "50%",
                      backgroundColor: "var(--mantine-color-orange-6)",
                    }}
                    w={12}
                  />
                  <Text size="xs">Online (15%)</Text>
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
