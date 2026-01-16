import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Modal,
  NumberInput,
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
import {
  usePayments,
  useSubscriptions,
  useProducts,
  usePaymentKPIs,
  useStripeStatus,
  type Payment,
  type Subscription,
} from "../../hooks/usePayments";
import { useClients } from "../../hooks/useClients";

// Types are imported from usePayments hook

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

  // Fetch real data
  const { data: payments = [] } = usePayments();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: products = [] } = useProducts();
  const { data: kpisData } = usePaymentKPIs();
  useStripeStatus(); // Check Stripe connection status
  const { data: clientsData } = useClients({ page: 1 });

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

  // Use real KPIs or default values
  const kpis = {
    mrr: kpisData?.mrr || 0,
    mrrChange: kpisData?.mrr_change || 0,
    activeSubscriptions: kpisData?.active_subscriptions || 0,
    pendingPayments: kpisData?.pending_payments || 0,
    pendingAmount: kpisData?.pending_amount || 0,
    thisMonthRevenue: kpisData?.this_month_revenue || 0,
    revenueChange: kpisData?.revenue_change || 0,
  };

  // Client options for select
  const clientOptions = (clientsData?.items || []).map((c: { id: string; full_name?: string; first_name: string; last_name: string }) => ({
    value: c.id,
    label: c.full_name || `${c.first_name} ${c.last_name}`,
  }));

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
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
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
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl" spacing="md" className="stagger">
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">MRR</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-success)" }}>
                €{kpis.mrr.toLocaleString()}
              </Text>
              <Group gap={4} mt="xs">
                <Badge size="sm" variant="light" color="green" radius="xl">
                  +{kpis.mrrChange}%
                </Badge>
                <Text size="xs" c="dimmed">vs mes anterior</Text>
              </Group>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "var(--nv-success-bg)", color: "var(--nv-success)" }}>
              <IconTrendingUp size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Ingresos del Mes</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-primary)" }}>
                €{kpis.thisMonthRevenue.toLocaleString()}
              </Text>
              <Group gap={4} mt="xs">
                <Badge size="sm" variant="light" color="blue" radius="xl">
                  +{kpis.revenueChange}%
                </Badge>
                <Text size="xs" c="dimmed">vs mes anterior</Text>
              </Group>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
              <IconCash size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Suscripciones Activas</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-brand)" }}>
                {kpis.activeSubscriptions}
              </Text>
              <Group gap={4} mt="xs">
                <Badge size="sm" variant="light" color="grape" radius="xl">
                  +5
                </Badge>
                <Text size="xs" c="dimmed">nuevas este mes</Text>
              </Group>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "rgba(190, 75, 219, 0.1)", color: "var(--nv-brand)" }}>
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Pagos Pendientes</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-warning)" }}>
                {kpis.pendingPayments}
              </Text>
              <Text c="orange" fw={500} mt="xs" size="sm">
                €{kpis.pendingAmount} por cobrar
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "var(--nv-warning-bg)", color: "var(--nv-warning)" }}>
              <IconClock size={24} />
            </ThemeIcon>
          </Group>
        </Box>
      </SimpleGrid>

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg" style={{ borderBottom: "1px solid var(--nv-border)" }}>
          <Tabs.Tab leftSection={<IconCreditCard size={14} />} value="overview" style={{ fontWeight: 500 }}>
            Resumen
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconReceipt size={14} />} value="payments" style={{ fontWeight: 500 }}>
            Historial
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconRefresh size={14} />} value="subscriptions" style={{ fontWeight: 500 }}>
            Suscripciones
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconPackage size={14} />} value="products" style={{ fontWeight: 500 }}>
            Productos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg" className="stagger">
            {/* Revenue Distribution */}
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" style={{ color: "var(--nv-text-primary)" }}>
                Distribución de Ingresos
              </Text>
              <Group justify="center" mb="md">
                <RingProgress
                  label={
                    <Box ta="center">
                      <Text fw={700} size="lg" style={{ color: "var(--nv-text-primary)" }}>
                        €8,500
                      </Text>
                      <Text c="dimmed" size="xs">
                        Este mes
                      </Text>
                    </Box>
                  }
                  roundCaps
                  sections={[
                    { value: 65, color: "var(--nv-primary)", tooltip: "Suscripciones: 65%" },
                    { value: 25, color: "var(--nv-success)", tooltip: "Bonos: 25%" },
                    { value: 10, color: "var(--nv-warning)", tooltip: "Sesiones: 10%" },
                  ]}
                  size={180}
                  thickness={20}
                />
              </Group>
              <SimpleGrid cols={3} spacing="sm">
                <Group gap="xs" justify="center">
                  <Box h={12} w={12} style={{ borderRadius: "50%", backgroundColor: "var(--nv-primary)" }} />
                  <Text size="xs">Suscripciones (65%)</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box h={12} w={12} style={{ borderRadius: "50%", backgroundColor: "var(--nv-success)" }} />
                  <Text size="xs">Bonos (25%)</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box h={12} w={12} style={{ borderRadius: "50%", backgroundColor: "var(--nv-warning)" }} />
                  <Text size="xs">Sesiones (10%)</Text>
                </Group>
              </SimpleGrid>
            </Box>

            {/* Recent Payments */}
            <Box className="nv-card" p="lg">
              <Group justify="space-between" mb="lg">
                <Text fw={600} style={{ color: "var(--nv-text-primary)" }}>Pagos Recientes</Text>
                <Button
                  rightSection={<IconArrowUpRight size={14} />}
                  size="xs"
                  variant="subtle"
                  style={{ color: "var(--nv-primary)" }}
                >
                  Ver todos
                </Button>
              </Group>
              <Stack gap="sm">
                {payments.slice(0, 5).map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type);
                  return (
                    <Group 
                      justify="space-between" 
                      key={payment.id}
                      p="sm"
                      style={{ 
                        borderRadius: "var(--radius-item)", 
                        transition: "background 0.2s",
                        cursor: "pointer"
                      }}
                      className="hover-lift"
                    >
                      <Group gap="sm">
                        <ThemeIcon
                          color={getStatusColor(payment.status)}
                          radius="xl"
                          size="lg"
                          variant="light"
                        >
                          <PaymentIcon size={16} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                            {payment.client_name}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {payment.description}
                          </Text>
                        </Box>
                      </Group>
                      <Box ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{payment.amount}
                        </Text>
                        <Badge
                          color={getStatusColor(payment.status)}
                          size="xs"
                          variant="light"
                          radius="xl"
                        >
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </Box>
                    </Group>
                  );
                })}
              </Stack>
            </Box>

            {/* Upcoming Renewals */}
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" style={{ color: "var(--nv-text-primary)" }}>
                Próximas Renovaciones
              </Text>
              <Stack gap="sm">
                {subscriptions
                  .filter((s) => s.status === "active")
                  .slice(0, 4)
                  .map((sub) => (
                    <Group 
                      justify="space-between" 
                      key={sub.id}
                      p="sm"
                      style={{ borderRadius: "var(--radius-item)" }}
                    >
                      <Box>
                        <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          {sub.client_name}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {sub.plan_name}
                        </Text>
                      </Box>
                      <Box ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{sub.amount}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {sub.current_period_end}
                        </Text>
                      </Box>
                    </Group>
                  ))}
              </Stack>
            </Box>

            {/* Stripe Integration */}
            <Box className="nv-card" p="lg">
              <Group justify="space-between" mb="lg">
                <Group gap="sm">
                  <ThemeIcon
                    color="violet"
                    radius="xl"
                    size="lg"
                    variant="light"
                  >
                    <IconBrandStripe size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} style={{ color: "var(--nv-text-primary)" }}>Stripe Connect</Text>
                    <Text c="dimmed" size="xs">
                      Gestiona tu cuenta de pagos
                    </Text>
                  </Box>
                </Group>
                <Badge color="green" variant="light" radius="xl">
                  Conectado
                </Badge>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">Balance disponible</Text>
                  <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>€2,450.00</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">Pendiente de liquidación</Text>
                  <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>€680.00</Text>
                </Group>
                <Divider my="xs" style={{ borderColor: "var(--nv-border)" }} />
                <Button fullWidth variant="light" radius="xl" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
                  Ir al Dashboard de Stripe
                </Button>
              </Stack>
            </Box>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="payments">
          <Box className="nv-card" p={0} style={{ overflow: "hidden" }}>
            <Table>
              <Table.Thead style={{ backgroundColor: "var(--nv-surface)" }}>
                <Table.Tr>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Cliente</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Descripción</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Tipo</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Estado</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Fecha</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>Importe</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {payments.map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type);
                  return (
                    <Table.Tr key={payment.id} style={{ transition: "background 0.2s" }}>
                      <Table.Td>
                        <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          {payment.client_name}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{payment.description}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ThemeIcon color="gray" size="sm" variant="light" radius="xl">
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
                        <Badge color={getStatusColor(payment.status)} variant="light" radius="xl">
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text c="dimmed" size="sm">{payment.created_at}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{payment.amount}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <ActionIcon color="blue" variant="subtle" radius="xl">
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon color="gray" variant="subtle" radius="xl">
                            <IconDownload size={16} />
                          </ActionIcon>
                          {payment.status === "pending" && (
                            <ActionIcon color="green" variant="subtle" radius="xl">
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
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="subscriptions">
          <Box className="nv-card" p={0} style={{ overflow: "hidden" }}>
            <Table>
              <Table.Thead style={{ backgroundColor: "var(--nv-surface)" }}>
                <Table.Tr>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Cliente</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Plan</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Estado</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>Próxima renovación</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>Importe</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subscriptions.map((sub) => (
                  <Table.Tr key={sub.id} style={{ transition: "background 0.2s" }}>
                    <Table.Td>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        {sub.client_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{sub.plan_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(sub.status)} variant="light" radius="xl">
                        {getStatusLabel(sub.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">{sub.current_period_end}</Text>
                      {sub.cancel_at_period_end && (
                        <Text c="red" size="xs">Cancela al finalizar</Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        €{sub.amount}/mes
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon color="blue" variant="subtle" radius="xl">
                          <IconEye size={16} />
                        </ActionIcon>
                        {sub.status === "active" && (
                          <ActionIcon color="red" variant="subtle" radius="xl">
                            <IconX size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="products">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg" className="stagger">
            {products.map((product) => (
              <Box key={product.id} className="nv-card" p="lg">
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
                    radius="xl"
                  >
                    {product.type === "subscription"
                      ? "Suscripción"
                      : product.type === "package"
                        ? "Bono"
                        : "Puntual"}
                  </Badge>
                  <Switch checked={product.is_active} color="green" size="sm" />
                </Group>

                <Text fw={600} mb="xs" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                  {product.name}
                </Text>
                <Text c="dimmed" mb="md" size="sm">
                  {product.description}
                </Text>

                {product.sessions_included && (
                  <Badge mb="md" variant="outline" radius="xl">
                    {product.sessions_included} sesiones incluidas
                  </Badge>
                )}

                <Divider mb="md" style={{ borderColor: "var(--nv-border)" }} />

                <Group align="flex-end" justify="space-between">
                  <Box>
                    <Text fw={700} size="xl" style={{ color: "var(--nv-primary)" }}>
                      €{product.price}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {product.type === "subscription" ? "/mes" : ""}
                    </Text>
                  </Box>
                  <Group gap="xs">
                    <ActionIcon color="blue" variant="light" radius="xl">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon color="red" variant="light" radius="xl">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Box>
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
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
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
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={chargeForm.onSubmit((values) => console.log(values))}>
          <Stack>
            <Select
              data={clientOptions}
              label="Cliente"
              placeholder="Selecciona un cliente"
              searchable
              {...chargeForm.getInputProps("client_id")}
            />

            <Select
              data={products.map((p) => ({
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
