import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  RingProgress,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowUpRight,
  IconBrandStripe,
  IconCash,
  IconClock,
  IconCreditCard,
  IconDownload,
  IconEdit,
  IconEye,
  IconPackage,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconSend,
  IconTrash,
  IconTrendingUp,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { StatsCard } from "../../components/common/StatsCard";

interface Payment {
  id: string;
  client_name: string;
  description: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "refunded";
  payment_type: "subscription" | "one_time" | "package";
  created_at: string;
  paid_at?: string;
}

interface Subscription {
  id: string;
  client_name: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: "active" | "cancelled" | "past_due" | "trialing";
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  type: "subscription" | "one_time" | "package";
  sessions_included?: number;
  is_active: boolean;
}

const mockPayments: Payment[] = [
  {
    id: "1",
    client_name: "María García",
    description: "Plan Premium - Julio",
    amount: 120,
    currency: "EUR",
    status: "completed",
    payment_type: "subscription",
    created_at: "2024-07-20",
    paid_at: "2024-07-20",
  },
  {
    id: "2",
    client_name: "Carlos López",
    description: "Bono 10 Sesiones",
    amount: 450,
    currency: "EUR",
    status: "completed",
    payment_type: "package",
    created_at: "2024-07-19",
    paid_at: "2024-07-19",
  },
  {
    id: "3",
    client_name: "Ana Martínez",
    description: "Plan Premium - Julio",
    amount: 120,
    currency: "EUR",
    status: "pending",
    payment_type: "subscription",
    created_at: "2024-07-18",
  },
  {
    id: "4",
    client_name: "Pedro Sánchez",
    description: "Sesión Individual",
    amount: 50,
    currency: "EUR",
    status: "completed",
    payment_type: "one_time",
    created_at: "2024-07-17",
    paid_at: "2024-07-17",
  },
  {
    id: "5",
    client_name: "Laura Fernández",
    description: "Plan Básico - Julio",
    amount: 80,
    currency: "EUR",
    status: "failed",
    payment_type: "subscription",
    created_at: "2024-07-16",
  },
];

const mockSubscriptions: Subscription[] = [
  {
    id: "1",
    client_name: "María García",
    plan_name: "Plan Premium",
    amount: 120,
    currency: "EUR",
    status: "active",
    current_period_end: "2024-08-20",
    cancel_at_period_end: false,
  },
  {
    id: "2",
    client_name: "Carlos López",
    plan_name: "Plan Básico",
    amount: 80,
    currency: "EUR",
    status: "active",
    current_period_end: "2024-08-15",
    cancel_at_period_end: false,
  },
  {
    id: "3",
    client_name: "Ana Martínez",
    plan_name: "Plan Premium",
    amount: 120,
    currency: "EUR",
    status: "past_due",
    current_period_end: "2024-07-18",
    cancel_at_period_end: false,
  },
  {
    id: "4",
    client_name: "Pedro Sánchez",
    plan_name: "Plan Básico",
    amount: 80,
    currency: "EUR",
    status: "trialing",
    current_period_end: "2024-07-25",
    cancel_at_period_end: false,
  },
  {
    id: "5",
    client_name: "Laura Fernández",
    plan_name: "Plan Premium",
    amount: 120,
    currency: "EUR",
    status: "cancelled",
    current_period_end: "2024-07-31",
    cancel_at_period_end: true,
  },
];

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Plan Básico",
    description: "4 sesiones al mes + seguimiento",
    price: 80,
    currency: "EUR",
    type: "subscription",
    is_active: true,
  },
  {
    id: "2",
    name: "Plan Premium",
    description: "8 sesiones al mes + nutrición + chat",
    price: 120,
    currency: "EUR",
    type: "subscription",
    is_active: true,
  },
  {
    id: "3",
    name: "Plan VIP",
    description: "Sesiones ilimitadas + todo incluido",
    price: 200,
    currency: "EUR",
    type: "subscription",
    is_active: true,
  },
  {
    id: "4",
    name: "Bono 5 Sesiones",
    description: "Válido por 2 meses",
    price: 225,
    currency: "EUR",
    type: "package",
    sessions_included: 5,
    is_active: true,
  },
  {
    id: "5",
    name: "Bono 10 Sesiones",
    description: "Válido por 4 meses",
    price: 450,
    currency: "EUR",
    type: "package",
    sessions_included: 10,
    is_active: true,
  },
  {
    id: "6",
    name: "Sesión Individual",
    description: "Sesión suelta de entrenamiento",
    price: 50,
    currency: "EUR",
    type: "one_time",
    is_active: true,
  },
];

export function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [
    productModalOpened,
    { open: openProductModal, close: closeProductModal },
  ] = useDisclosure(false);
  const [
    chargeModalOpened,
    { open: openChargeModal, close: closeChargeModal },
  ] = useDisclosure(false);

  const productForm = useForm({
    initialValues: {
      name: "",
      description: "",
      price: 0,
      type: "subscription",
      sessions_included: 0,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
      price: (value) => (value <= 0 ? "Precio debe ser mayor a 0" : null),
    },
  });

  const chargeForm = useForm({
    initialValues: {
      client_id: "",
      product_id: "",
      amount: 0,
      description: "",
    },
  });

  const kpis = {
    mrr: 6800,
    mrrChange: 9.7,
    activeSubscriptions: 45,
    pendingPayments: 3,
    pendingAmount: 360,
    thisMonthRevenue: 8500,
    revenueChange: 12,
  };

  const getStatusColor = (
    status: Payment["status"] | Subscription["status"]
  ) => {
    switch (status) {
      case "completed":
      case "active":
        return "green";
      case "pending":
      case "trialing":
        return "yellow";
      case "failed":
      case "past_due":
        return "red";
      case "refunded":
      case "cancelled":
        return "gray";
      default:
        return "gray";
    }
  };

  const getStatusLabel = (
    status: Payment["status"] | Subscription["status"]
  ) => {
    switch (status) {
      case "completed":
        return "Completado";
      case "pending":
        return "Pendiente";
      case "failed":
        return "Fallido";
      case "refunded":
        return "Reembolsado";
      case "active":
        return "Activa";
      case "trialing":
        return "Prueba";
      case "past_due":
        return "Vencida";
      case "cancelled":
        return "Cancelada";
      default:
        return status;
    }
  };

  const getPaymentTypeIcon = (type: Payment["payment_type"]) => {
    switch (type) {
      case "subscription":
        return IconRefresh;
      case "package":
        return IconPackage;
      case "one_time":
        return IconCash;
      default:
        return IconCreditCard;
    }
  };

  return (
    <Container py="xl" size="xl">
      <PageHeader
        action={{
          label: "Nuevo Cobro",
          onClick: openChargeModal,
        }}
        description="Gestiona ingresos, suscripciones y productos"
        secondaryAction={{
          label: "Nuevo Producto",
          icon: <IconPlus size={16} />,
          onClick: openProductModal,
          variant: "default",
        }}
        title="Pagos y Suscripciones"
      />

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl" spacing="md">
        <StatsCard
          change={kpis.mrrChange}
          changeLabel="vs mes anterior"
          color="green"
          icon={<IconTrendingUp size={24} />}
          title="MRR"
          value={`€${kpis.mrr.toLocaleString()}`}
        />
        <StatsCard
          change={kpis.revenueChange}
          changeLabel="vs mes anterior"
          color="blue"
          icon={<IconCash size={24} />}
          title="Ingresos del Mes"
          value={`€${kpis.thisMonthRevenue.toLocaleString()}`}
        />
        <StatsCard
          change={5}
          changeLabel="nuevas este mes"
          color="grape"
          icon={<IconUsers size={24} />}
          title="Suscripciones Activas"
          value={kpis.activeSubscriptions}
        />
        <Paper p="lg" radius="lg" withBorder>
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text c="dimmed" fw={600} mb={4} size="xs" tt="uppercase">
                Pagos Pendientes
              </Text>
              <Text
                fw={700}
                size="xl"
                style={{ fontSize: "1.75rem", lineHeight: 1.2 }}
              >
                {kpis.pendingPayments}
              </Text>
              <Text c="orange" fw={500} mt={8} size="sm">
                €{kpis.pendingAmount} por cobrar
              </Text>
            </Box>
            <ThemeIcon color="orange" radius="xl" size={48} variant="light">
              <IconClock size={24} />
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconCreditCard size={14} />} value="overview">
            Resumen
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconReceipt size={14} />} value="payments">
            Historial
          </Tabs.Tab>
          <Tabs.Tab
            leftSection={<IconRefresh size={14} />}
            value="subscriptions"
          >
            Suscripciones
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconPackage size={14} />} value="products">
            Productos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            {/* Revenue Distribution */}
            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Distribución de Ingresos
              </Text>
              <Group justify="center" mb="md">
                <RingProgress
                  label={
                    <Box ta="center">
                      <Text fw={700} size="lg">
                        €8,500
                      </Text>
                      <Text c="dimmed" size="xs">
                        Este mes
                      </Text>
                    </Box>
                  }
                  roundCaps
                  sections={[
                    { value: 65, color: "blue", tooltip: "Suscripciones: 65%" },
                    { value: 25, color: "green", tooltip: "Bonos: 25%" },
                    { value: 10, color: "orange", tooltip: "Sesiones: 10%" },
                  ]}
                  size={180}
                  thickness={20}
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
                  <Text size="xs">Suscripciones (65%)</Text>
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
                  <Text size="xs">Bonos (25%)</Text>
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
                  <Text size="xs">Sesiones (10%)</Text>
                </Group>
              </SimpleGrid>
            </Paper>

            {/* Recent Payments */}
            <Paper p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="lg">
                <Text fw={600}>Pagos Recientes</Text>
                <Button
                  rightSection={<IconArrowUpRight size={14} />}
                  size="xs"
                  variant="subtle"
                >
                  Ver todos
                </Button>
              </Group>
              <Stack gap="sm">
                {mockPayments.slice(0, 5).map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type);
                  return (
                    <Group justify="space-between" key={payment.id}>
                      <Group gap="sm">
                        <ThemeIcon
                          color={getStatusColor(payment.status)}
                          radius="md"
                          size="md"
                          variant="light"
                        >
                          <PaymentIcon size={14} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={500} size="sm">
                            {payment.client_name}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {payment.description}
                          </Text>
                        </Box>
                      </Group>
                      <Box ta="right">
                        <Text fw={600} size="sm">
                          €{payment.amount}
                        </Text>
                        <Badge
                          color={getStatusColor(payment.status)}
                          size="xs"
                          variant="light"
                        >
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </Box>
                    </Group>
                  );
                })}
              </Stack>
            </Paper>

            {/* Upcoming Renewals */}
            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="lg">
                Próximas Renovaciones
              </Text>
              <Stack gap="sm">
                {mockSubscriptions
                  .filter((s) => s.status === "active")
                  .slice(0, 4)
                  .map((sub) => (
                    <Group justify="space-between" key={sub.id}>
                      <Box>
                        <Text fw={500} size="sm">
                          {sub.client_name}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {sub.plan_name}
                        </Text>
                      </Box>
                      <Box ta="right">
                        <Text fw={600} size="sm">
                          €{sub.amount}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {sub.current_period_end}
                        </Text>
                      </Box>
                    </Group>
                  ))}
              </Stack>
            </Paper>

            {/* Stripe Integration */}
            <Paper p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="lg">
                <Group gap="sm">
                  <ThemeIcon
                    color="violet"
                    radius="md"
                    size="lg"
                    variant="light"
                  >
                    <IconBrandStripe size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600}>Stripe Connect</Text>
                    <Text c="dimmed" size="xs">
                      Gestiona tu cuenta de pagos
                    </Text>
                  </Box>
                </Group>
                <Badge color="green" variant="light">
                  Conectado
                </Badge>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Balance disponible
                  </Text>
                  <Text fw={600} size="sm">
                    €2,450.00
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Pendiente de liquidación
                  </Text>
                  <Text fw={600} size="sm">
                    €680.00
                  </Text>
                </Group>
                <Divider my="xs" />
                <Button fullWidth variant="light">
                  Ir al Dashboard de Stripe
                </Button>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="payments">
          <Paper radius="lg" withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Descripción</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th ta="right">Importe</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mockPayments.map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type);
                  return (
                    <Table.Tr key={payment.id}>
                      <Table.Td>
                        <Text fw={500} size="sm">
                          {payment.client_name}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{payment.description}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ThemeIcon color="gray" size="sm" variant="light">
                            <PaymentIcon size={12} />
                          </ThemeIcon>
                          <Text size="xs">
                            {payment.payment_type === "subscription"
                              ? "Suscripción"
                              : payment.payment_type === "package"
                                ? "Bono"
                                : "Puntual"}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={getStatusColor(payment.status)}
                          variant="light"
                        >
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text c="dimmed" size="sm">
                          {payment.created_at}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={600} size="sm">
                          €{payment.amount}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <ActionIcon color="blue" variant="subtle">
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon color="gray" variant="subtle">
                            <IconDownload size={16} />
                          </ActionIcon>
                          {payment.status === "pending" && (
                            <ActionIcon color="green" variant="subtle">
                              <IconSend size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="subscriptions">
          <Paper radius="lg" withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Plan</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Próxima renovación</Table.Th>
                  <Table.Th ta="right">Importe</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mockSubscriptions.map((sub) => (
                  <Table.Tr key={sub.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {sub.client_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{sub.plan_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(sub.status)} variant="light">
                        {getStatusLabel(sub.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">
                        {sub.current_period_end}
                      </Text>
                      {sub.cancel_at_period_end && (
                        <Text c="red" size="xs">
                          Cancela al finalizar
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} size="sm">
                        €{sub.amount}/mes
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon color="blue" variant="subtle">
                          <IconEye size={16} />
                        </ActionIcon>
                        {sub.status === "active" && (
                          <ActionIcon color="red" variant="subtle">
                            <IconX size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="products">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {mockProducts.map((product) => (
              <Card key={product.id} padding="lg" radius="lg" withBorder>
                <Group justify="space-between" mb="sm">
                  <Badge
                    color={
                      product.type === "subscription"
                        ? "blue"
                        : product.type === "package"
                          ? "green"
                          : "orange"
                    }
                    variant="light"
                  >
                    {product.type === "subscription"
                      ? "Suscripción"
                      : product.type === "package"
                        ? "Bono"
                        : "Puntual"}
                  </Badge>
                  <Switch checked={product.is_active} color="green" size="sm" />
                </Group>

                <Text fw={600} mb="xs" size="lg">
                  {product.name}
                </Text>
                <Text c="dimmed" mb="md" size="sm">
                  {product.description}
                </Text>

                {product.sessions_included && (
                  <Badge mb="md" variant="outline">
                    {product.sessions_included} sesiones incluidas
                  </Badge>
                )}

                <Divider mb="md" />

                <Group align="flex-end" justify="space-between">
                  <Box>
                    <Text fw={700} size="xl">
                      €{product.price}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {product.type === "subscription" ? "/mes" : ""}
                    </Text>
                  </Box>
                  <Group gap="xs">
                    <ActionIcon color="blue" variant="light">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon color="red" variant="light">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>

      {/* New Product Modal */}
      <Modal
        onClose={closeProductModal}
        opened={productModalOpened}
        size="md"
        title="Nuevo Producto"
      >
        <form onSubmit={productForm.onSubmit((values) => console.log(values))}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Plan Premium"
              required
              {...productForm.getInputProps("name")}
            />

            <Textarea
              label="Descripción"
              minRows={2}
              placeholder="Describe el producto..."
              {...productForm.getInputProps("description")}
            />

            <Group grow>
              <NumberInput
                label="Precio (€)"
                min={0}
                placeholder="0"
                required
                {...productForm.getInputProps("price")}
              />
              <Select
                data={[
                  { value: "subscription", label: "Suscripción" },
                  { value: "package", label: "Bono/Paquete" },
                  { value: "one_time", label: "Pago único" },
                ]}
                label="Tipo"
                {...productForm.getInputProps("type")}
              />
            </Group>

            {productForm.values.type === "package" && (
              <NumberInput
                label="Sesiones incluidas"
                min={1}
                placeholder="0"
                {...productForm.getInputProps("sessions_included")}
              />
            )}

            <Group justify="flex-end" mt="md">
              <Button onClick={closeProductModal} variant="default">
                Cancelar
              </Button>
              <Button type="submit">Crear Producto</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* New Charge Modal */}
      <Modal
        onClose={closeChargeModal}
        opened={chargeModalOpened}
        size="md"
        title="Nuevo Cobro"
      >
        <form onSubmit={chargeForm.onSubmit((values) => console.log(values))}>
          <Stack>
            <Select
              data={[
                { value: "1", label: "María García" },
                { value: "2", label: "Carlos López" },
                { value: "3", label: "Ana Martínez" },
              ]}
              label="Cliente"
              placeholder="Selecciona un cliente"
              searchable
              {...chargeForm.getInputProps("client_id")}
            />

            <Select
              data={mockProducts.map((p) => ({
                value: p.id,
                label: `${p.name} - €${p.price}`,
              }))}
              label="Producto"
              placeholder="Selecciona un producto"
              {...chargeForm.getInputProps("product_id")}
            />

            <NumberInput
              label="Importe (€)"
              min={0}
              placeholder="0"
              {...chargeForm.getInputProps("amount")}
            />

            <Textarea
              label="Descripción"
              placeholder="Descripción del cobro..."
              {...chargeForm.getInputProps("description")}
            />

            <Group justify="flex-end" mt="md">
              <Button onClick={closeChargeModal} variant="default">
                Cancelar
              </Button>
              <Button leftSection={<IconCreditCard size={16} />} type="submit">
                Crear Cobro
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}

export default PaymentsPage;
