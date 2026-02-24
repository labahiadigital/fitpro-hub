import {
  ActionIcon,
  Badge,
  Box,
  Button,
  CopyButton,
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
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowUpRight,
  IconCash,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconDownload,
  IconEdit,
  IconEye,
  IconLink,
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
import { useCallback, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  usePayments,
  useSubscriptions,
  useProducts,
  usePaymentKPIs,
  useStripeStatus,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useToggleProductActive,
  useCreatePayment,
  useMarkPaymentPaid,
  useDeletePayment,
  useCancelSubscription,
  type Payment,
  type Subscription,
  type Product,
} from "../../hooks/usePayments";
import { useClients } from "../../hooks/useClients";
import { useAuthStore } from "../../stores/auth";

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [
    paymentDetailOpened,
    { open: openPaymentDetail, close: closePaymentDetail },
  ] = useDisclosure(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const { currentWorkspace } = useAuthStore();

  // Fetch real data
  const { data: payments = [] } = usePayments();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: products = [] } = useProducts();
  const { data: kpisData } = usePaymentKPIs();
  useStripeStatus();
  const { data: clientsData } = useClients({ page: 1 });

  // Mutations
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const toggleProductActive = useToggleProductActive();
  const createPayment = useCreatePayment();
  const markPaymentPaid = useMarkPaymentPaid();
  const deletePayment = useDeletePayment();
  const cancelSubscription = useCancelSubscription();

  const productForm = useForm({
    initialValues: {
      name: "",
      description: "",
      price: 0,
      type: "subscription",
      interval: "month",
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

  const handleOpenNewProduct = useCallback(() => {
    setEditingProduct(null);
    productForm.reset();
    openProductModal();
  }, [productForm, openProductModal]);

  const handleOpenEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    productForm.setValues({
      name: product.name,
      description: product.description || "",
      price: product.price,
      type: product.type,
      interval: product.interval || "month",
      sessions_included: product.sessions_included || 0,
    });
    openProductModal();
  }, [productForm, openProductModal]);

  const handleSaveProduct = useCallback(async (values: typeof productForm.values) => {
    const data = {
      name: values.name,
      description: values.description || undefined,
      price: values.price,
      product_type: values.type,
      interval: values.type === "subscription" ? values.interval : undefined,
    };
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data });
      } else {
        await createProduct.mutateAsync(data);
      }
      closeProductModal();
      productForm.reset();
      setEditingProduct(null);
    } catch {
      // Error handled by mutation
    }
  }, [editingProduct, updateProduct, createProduct, closeProductModal, productForm]);

  const handleDeleteProduct = useCallback(async (product: Product) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) return;
    try {
      await deleteProduct.mutateAsync(product.id);
    } catch {
      // Error handled by mutation
    }
  }, [deleteProduct]);

  const handleToggleActive = useCallback((product: Product) => {
    toggleProductActive.mutate({ id: product.id, is_active: !product.is_active });
  }, [toggleProductActive]);

  const handleViewPayment = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    openPaymentDetail();
  }, [openPaymentDetail]);

  const handleMarkPaid = useCallback(async (payment: Payment) => {
    if (!window.confirm(`¿Marcar el cobro de €${Number(payment.amount).toFixed(2)} como pagado?`)) return;
    try {
      await markPaymentPaid.mutateAsync(payment.id);
    } catch {
      // Error handled by mutation
    }
  }, [markPaymentPaid]);

  const handleDeletePaymentAction = useCallback(async (payment: Payment) => {
    if (!window.confirm(`¿Eliminar este cobro de €${Number(payment.amount).toFixed(2)}?`)) return;
    try {
      await deletePayment.mutateAsync(payment.id);
    } catch {
      // Error handled by mutation
    }
  }, [deletePayment]);

  const handleCancelSubscription = useCallback(async (sub: Subscription) => {
    if (!window.confirm(`¿Cancelar la suscripción "${sub.plan_name || sub.name}" de ${sub.client_name || "este cliente"}?`)) return;
    try {
      await cancelSubscription.mutateAsync(sub.id);
    } catch {
      // Error handled by mutation
    }
  }, [cancelSubscription]);

  const handleCreateCharge = useCallback(async (values: typeof chargeForm.values) => {
    const selectedProduct = values.product_id ? products.find(p => p.id === values.product_id) : null;
    const amount = values.amount || selectedProduct?.price || 0;
    if (amount <= 0) return;
    try {
      await createPayment.mutateAsync({
        client_id: values.client_id || undefined,
        product_id: values.product_id || undefined,
        amount,
        description: values.description || selectedProduct?.name || "Cobro manual",
        payment_type: selectedProduct?.type || "one_time",
      });
      closeChargeModal();
      chargeForm.reset();
    } catch {
      // Error handled by mutation
    }
  }, [createPayment, closeChargeModal, chargeForm, products]);

  const getPublicLink = useCallback((product: Product) => {
    const slug = currentWorkspace?.slug || currentWorkspace?.id || "";
    return `${window.location.origin}/onboarding/${slug}?product=${product.id}`;
  }, [currentWorkspace]);

  // Use real KPIs or default values
  const kpis = {
    mrr: kpisData?.mrr || 0,
    mrrChange: kpisData?.mrr_change || 0,
    activeSubscriptions: kpisData?.active_subscriptions || 0,
    newSubsThisMonth: kpisData?.new_subs_this_month || 0,
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
          onClick: handleOpenNewProduct,
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
                €{kpis.mrr.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
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
                €{kpis.thisMonthRevenue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
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
                <Text size="xs" c="dimmed">{kpis.newSubsThisMonth} nueva{kpis.newSubsThisMonth !== 1 ? "s" : ""} este mes</Text>
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
                €{kpis.pendingAmount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} por cobrar
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
              {(() => {
                const subRevenue = payments.filter(p => p.payment_type === "subscription" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
                const otherRevenue = payments.filter(p => p.payment_type !== "subscription" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
                const total = subRevenue + otherRevenue;
                const subPct = total > 0 ? Math.round((subRevenue / total) * 100) : 100;
                const otherPct = total > 0 ? 100 - subPct : 0;
                return (
                  <>
                    <Group justify="center" mb="md">
                      <RingProgress
                        label={
                          <Box ta="center">
                            <Text fw={700} size="lg" style={{ color: "var(--nv-text-primary)" }}>
                              €{kpis.thisMonthRevenue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                            </Text>
                            <Text c="dimmed" size="xs">Este mes</Text>
                          </Box>
                        }
                        roundCaps
                        sections={total > 0 ? [
                          { value: subPct, color: "var(--nv-primary)", tooltip: `Suscripciones: ${subPct}%` },
                          { value: otherPct, color: "var(--nv-success)", tooltip: `Otros: ${otherPct}%` },
                        ] : [{ value: 100, color: "var(--nv-border)", tooltip: "Sin datos" }]}
                        size={180}
                        thickness={20}
                      />
                    </Group>
                    <SimpleGrid cols={2} spacing="sm">
                      <Group gap="xs" justify="center">
                        <Box h={12} w={12} style={{ borderRadius: "50%", backgroundColor: "var(--nv-primary)" }} />
                        <Text size="xs">Suscripciones ({subPct}%)</Text>
                      </Group>
                      <Group gap="xs" justify="center">
                        <Box h={12} w={12} style={{ borderRadius: "50%", backgroundColor: "var(--nv-success)" }} />
                        <Text size="xs">Otros ({otherPct}%)</Text>
                      </Group>
                    </SimpleGrid>
                  </>
                );
              })()}
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
                  onClick={() => setActiveTab("payments")}
                >
                  Ver todos
                </Button>
              </Group>
              <Stack gap="sm">
                {payments.length === 0 && (
                  <Text c="dimmed" ta="center" py="lg" size="sm">No hay pagos registrados</Text>
                )}
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
                            {payment.client_name || "Cliente"}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {payment.description}
                          </Text>
                        </Box>
                      </Group>
                      <Box ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{Number(payment.amount).toFixed(2)}
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
                {subscriptions.filter((s) => s.status === "active").length === 0 && (
                  <Text c="dimmed" ta="center" py="lg" size="sm">No hay renovaciones pendientes</Text>
                )}
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
                          {sub.client_name || "Cliente"}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {sub.plan_name}
                        </Text>
                      </Box>
                      <Box ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{Number(sub.amount).toFixed(2)}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("es-ES") : "—"}
                        </Text>
                      </Box>
                    </Group>
                  ))}
              </Stack>
            </Box>

            {/* Redsys Integration */}
            <Box className="nv-card" p="lg">
              <Group justify="space-between" mb="lg">
                <Group gap="sm">
                  <ThemeIcon
                    color="blue"
                    radius="xl"
                    size="lg"
                    variant="light"
                  >
                    <IconCreditCard size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} style={{ color: "var(--nv-text-primary)" }}>Redsys TPV</Text>
                    <Text c="dimmed" size="xs">
                      Pasarela de pago configurada
                    </Text>
                  </Box>
                </Group>
                <Badge color="green" variant="light" radius="xl">
                  Activo
                </Badge>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">Ingresos este mes</Text>
                  <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>€{kpis.thisMonthRevenue.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">Suscripciones activas</Text>
                  <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>{kpis.activeSubscriptions}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">Cobros pendientes</Text>
                  <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>€{kpis.pendingAmount.toFixed(2)}</Text>
                </Group>
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
                {payments.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center" py="xl" size="sm">No hay pagos registrados</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {payments.map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type);
                  return (
                    <Table.Tr key={payment.id} style={{ transition: "background 0.2s" }}>
                      <Table.Td>
                        <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          {payment.client_name || "—"}
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
                        <Text c="dimmed" size="sm">{payment.paid_at ? new Date(payment.paid_at).toLocaleDateString("es-ES") : payment.created_at ? new Date(payment.created_at).toLocaleDateString("es-ES") : "—"}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{Number(payment.amount).toFixed(2)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <Tooltip label="Ver detalle">
                            <ActionIcon color="blue" variant="subtle" radius="xl" onClick={() => handleViewPayment(payment)}>
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          {payment.status === "pending" && (
                            <Tooltip label="Marcar como pagado">
                              <ActionIcon
                                color="green"
                                variant="subtle"
                                radius="xl"
                                onClick={() => handleMarkPaid(payment)}
                                loading={markPaymentPaid.isPending}
                              >
                                <IconCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {payment.status === "pending" && (
                            <Tooltip label="Eliminar cobro">
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                radius="xl"
                                onClick={() => handleDeletePaymentAction(payment)}
                                loading={deletePayment.isPending}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
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
                {subscriptions.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center" py="xl" size="sm">No hay suscripciones</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {subscriptions.map((sub) => (
                  <Table.Tr key={sub.id} style={{ transition: "background 0.2s" }}>
                    <Table.Td>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        {sub.client_name || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{sub.plan_name || sub.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(sub.status)} variant="light" radius="xl">
                        {getStatusLabel(sub.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("es-ES") : "—"}</Text>
                      {sub.cancel_at_period_end && (
                        <Text c="red" size="xs">Cancela al finalizar</Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        €{Number(sub.amount).toFixed(2)}/{sub.interval === "month" ? "mes" : sub.interval === "year" ? "año" : sub.interval || "mes"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        {sub.status === "active" && (
                          <Tooltip label="Cancelar suscripción">
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              radius="xl"
                              onClick={() => handleCancelSubscription(sub)}
                              loading={cancelSubscription.isPending}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Tooltip>
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
          {products.length === 0 && (
            <Box className="nv-card" p="xl">
              <Text c="dimmed" ta="center">No hay productos creados. Usa "Nuevo Producto" para crear uno.</Text>
            </Box>
          )}
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
                  <Group gap="xs">
                    <Switch
                      checked={product.is_active}
                      color="green"
                      size="sm"
                      onChange={() => handleToggleActive(product)}
                    />
                    <CopyButton value={getPublicLink(product)}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "¡Copiado!" : "Copiar enlace público"}>
                          <ActionIcon
                            color={copied ? "green" : "gray"}
                            variant="light"
                            radius="xl"
                            size="sm"
                            onClick={copy}
                          >
                            {copied ? <IconCheck size={14} /> : <IconLink size={14} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
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
                      {product.type === "subscription" ? `/${product.interval === "year" ? "año" : "mes"}` : ""}
                    </Text>
                  </Box>
                  <Group gap="xs">
                    <Tooltip label="Editar producto">
                      <ActionIcon color="blue" variant="light" radius="xl" onClick={() => handleOpenEditProduct(product)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Eliminar producto">
                      <ActionIcon
                        color="red"
                        variant="light"
                        radius="xl"
                        onClick={() => handleDeleteProduct(product)}
                        loading={deleteProduct.isPending}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Box>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>

      {/* Product Modal (Create/Edit) */}
      <Modal
        onClose={() => { closeProductModal(); setEditingProduct(null); productForm.reset(); }}
        opened={productModalOpened}
        size="md"
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={productForm.onSubmit(handleSaveProduct)}>
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
                decimalScale={2}
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

            {productForm.values.type === "subscription" && (
              <Select
                data={[
                  { value: "month", label: "Mensual" },
                  { value: "year", label: "Anual" },
                  { value: "week", label: "Semanal" },
                ]}
                label="Intervalo de cobro"
                {...productForm.getInputProps("interval")}
              />
            )}

            {productForm.values.type === "package" && (
              <NumberInput
                label="Sesiones incluidas"
                min={1}
                placeholder="0"
                {...productForm.getInputProps("sessions_included")}
              />
            )}

            <Group justify="flex-end" mt="md">
              <Button onClick={() => { closeProductModal(); setEditingProduct(null); productForm.reset(); }} variant="default">
                Cancelar
              </Button>
              <Button type="submit" loading={createProduct.isPending || updateProduct.isPending}>
                {editingProduct ? "Guardar Cambios" : "Crear Producto"}
              </Button>
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
        <form onSubmit={chargeForm.onSubmit(handleCreateCharge)}>
          <Stack>
            <Select
              data={clientOptions}
              label="Cliente"
              placeholder="Selecciona un cliente"
              searchable
              clearable
              {...chargeForm.getInputProps("client_id")}
            />

            <Select
              data={products.map((p) => ({
                value: p.id,
                label: `${p.name} - €${p.price}`,
              }))}
              label="Producto"
              placeholder="Selecciona un producto (opcional)"
              clearable
              onChange={(val) => {
                chargeForm.setFieldValue("product_id", val || "");
                if (val) {
                  const prod = products.find(p => p.id === val);
                  if (prod) {
                    chargeForm.setFieldValue("amount", prod.price);
                    chargeForm.setFieldValue("description", prod.name);
                  }
                }
              }}
              value={chargeForm.values.product_id || null}
            />

            <NumberInput
              label="Importe (€)"
              min={0.01}
              placeholder="0"
              decimalScale={2}
              required
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
              <Button leftSection={<IconCreditCard size={16} />} type="submit" loading={createPayment.isPending}>
                Crear Cobro
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Payment Detail Modal */}
      <Modal
        onClose={closePaymentDetail}
        opened={paymentDetailOpened}
        size="md"
        title="Detalle del Pago"
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        {selectedPayment && (
          <Stack>
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Cliente</Text>
              <Text fw={500} size="sm">{selectedPayment.client_name || "—"}</Text>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Descripción</Text>
              <Text fw={500} size="sm">{selectedPayment.description || "—"}</Text>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Importe</Text>
              <Text fw={700} size="lg" style={{ color: "var(--nv-primary)" }}>€{Number(selectedPayment.amount).toFixed(2)}</Text>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Estado</Text>
              <Badge color={getStatusColor(selectedPayment.status)} variant="light" radius="xl">
                {getStatusLabel(selectedPayment.status)}
              </Badge>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Tipo</Text>
              <Text size="sm">{selectedPayment.payment_type === "subscription" ? "Suscripción" : selectedPayment.payment_type === "package" ? "Bono" : "Puntual"}</Text>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">Fecha de creación</Text>
              <Text size="sm">{selectedPayment.created_at ? new Date(selectedPayment.created_at).toLocaleString("es-ES") : "—"}</Text>
            </Group>
            {selectedPayment.paid_at && (
              <>
                <Divider style={{ borderColor: "var(--nv-border)" }} />
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">Fecha de pago</Text>
                  <Text size="sm">{new Date(selectedPayment.paid_at).toLocaleString("es-ES")}</Text>
                </Group>
              </>
            )}
            <Group justify="flex-end" mt="md" gap="sm">
              {selectedPayment.status === "pending" && (
                <>
                  <Button
                    color="green"
                    variant="light"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => { handleMarkPaid(selectedPayment); closePaymentDetail(); }}
                  >
                    Marcar como pagado
                  </Button>
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={16} />}
                    onClick={() => { handleDeletePaymentAction(selectedPayment); closePaymentDetail(); }}
                  >
                    Eliminar
                  </Button>
                </>
              )}
              <Button onClick={closePaymentDetail} variant="default">
                Cerrar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}

export default PaymentsPage;
