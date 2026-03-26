import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  CopyButton,
  Divider,
  Group,
  Menu,
  MultiSelect,
  NumberInput,
  Paper,
  Progress,
  ScrollArea,
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
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconCurrencyEuro,
  IconDotsVertical,
  IconEdit,
  IconLink,
  IconPackage,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  useSubscriptions,
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useToggleProductActive,
  useCancelSubscription,
  type Product,
  type Subscription,
} from "../../hooks/usePayments";
import {
  useSessionPackages,
  useClientPackages,
  useCreateSessionPackage,
  useUpdateSessionPackage,
  type SessionPackage as SessionPackageType,
  type ClientPackage as ClientPackageType,
} from "../../hooks/usePackages";
import { useAuthStore } from "../../stores/auth";
import { BottomSheet } from "../../components/common/BottomSheet";
import { formatDecimal } from "../../utils/format";

interface SessionPackage {
  id: string;
  name: string;
  description: string;
  totalSessions: number;
  price: number;
  validityDays: number;
  sessionTypes: string[];
  isActive: boolean;
  soldCount: number;
}

interface ClientPackage {
  id: string;
  clientName: string;
  clientEmail: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  purchasedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "exhausted";
}

const sessionTypeOptions = [
  { value: "Personal Training", label: "Entrenamiento Personal" },
  { value: "HIIT", label: "HIIT Grupal" },
  { value: "Nutrición", label: "Consulta Nutricional" },
  { value: "Yoga", label: "Yoga" },
  { value: "Pilates", label: "Pilates" },
  { value: "Evaluación", label: "Evaluación" },
];

export function CatalogPage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<string | null>("products");
  const [bonosSubTab, setBonosSubTab] = useState<string | null>("packages");
  const { currentWorkspace } = useAuthStore();

  // Product state
  const [productModalOpened, { open: openProductModal, close: closeProductModal }] = useDisclosure(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Package state
  const [packageModalOpened, { open: openPackageModal, close: closePackageModal }] = useDisclosure(false);
  const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(null);

  // Data hooks
  const { data: products = [] } = useProducts();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: packagesData = [] } = useSessionPackages();
  const { data: clientPackagesData = [] } = useClientPackages();

  // Product mutations
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const toggleProductActive = useToggleProductActive();
  const cancelSubscription = useCancelSubscription();

  // Package mutations
  const createPackage = useCreateSessionPackage();
  const updatePackage = useUpdateSessionPackage();

  // Map package API data to UI format
  const packages: SessionPackage[] = packagesData.map((p: SessionPackageType) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    totalSessions: p.total_sessions,
    price: p.price,
    validityDays: p.validity_days,
    sessionTypes: p.session_types || [],
    isActive: p.is_active,
    soldCount: p.sold_count || 0,
  }));

  const clientPackages: ClientPackage[] = clientPackagesData.map((cp: ClientPackageType) => ({
    id: cp.id,
    clientName: cp.client_name || "Cliente",
    clientEmail: cp.client_email || "",
    packageName: cp.package_name || "Paquete",
    totalSessions: cp.total_sessions,
    usedSessions: cp.used_sessions,
    purchasedAt: cp.purchased_at,
    expiresAt: cp.expires_at,
    status: cp.status,
  }));

  // --- Product Form ---
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

  // --- Package Form ---
  const packageForm = useForm({
    initialValues: {
      name: "",
      description: "",
      totalSessions: 10,
      price: 0,
      validityDays: 90,
      sessionTypes: [] as string[],
      isActive: true,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
      totalSessions: (value) => (value < 1 ? "Mínimo 1 sesión" : null),
      price: (value) => (value < 0 ? "Precio inválido" : null),
    },
  });

  // --- Product Handlers ---
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
    } catch { /* handled by mutation */ }
  }, [editingProduct, updateProduct, createProduct, closeProductModal, productForm]);

  const handleDeleteProduct = useCallback(async (product: Product) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) return;
    try {
      await deleteProduct.mutateAsync(product.id);
    } catch { /* handled by mutation */ }
  }, [deleteProduct]);

  const handleToggleActive = useCallback((product: Product) => {
    toggleProductActive.mutate({ id: product.id, is_active: !product.is_active });
  }, [toggleProductActive]);

  const handleCancelSubscription = useCallback(async (sub: Subscription) => {
    if (!window.confirm(`¿Cancelar la suscripción "${sub.plan_name || sub.name}" de ${sub.client_name || "este cliente"}?`)) return;
    try {
      await cancelSubscription.mutateAsync(sub.id);
    } catch { /* handled by mutation */ }
  }, [cancelSubscription]);

  const getPublicLink = useCallback((product: Product) => {
    const slug = currentWorkspace?.slug || currentWorkspace?.id || "";
    return `${window.location.origin}/onboarding/${slug}?product=${product.id}`;
  }, [currentWorkspace]);

  const getSubStatusColor = (status: Subscription["status"]) => {
    switch (status) {
      case "active": return "green";
      case "trialing": return "yellow";
      case "past_due": return "red";
      case "cancelled": return "gray";
      default: return "gray";
    }
  };

  const getSubStatusLabel = (status: Subscription["status"]) => {
    switch (status) {
      case "active": return "Activa";
      case "trialing": return "Prueba";
      case "past_due": return "Vencida";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };

  // --- Package Handlers ---
  const handleOpenPackageModal = (pkg?: SessionPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      packageForm.setValues({
        name: pkg.name,
        description: pkg.description,
        totalSessions: pkg.totalSessions,
        price: pkg.price,
        validityDays: pkg.validityDays,
        sessionTypes: pkg.sessionTypes,
        isActive: pkg.isActive,
      });
    } else {
      setEditingPackage(null);
      packageForm.reset();
    }
    openPackageModal();
  };

  const handleSavePackage = async (values: typeof packageForm.values) => {
    try {
      const packageData = {
        name: values.name,
        description: values.description,
        total_sessions: values.totalSessions,
        price: values.price,
        validity_days: values.validityDays,
        session_types: values.sessionTypes,
        is_active: values.isActive,
      };
      if (editingPackage) {
        await updatePackage.mutateAsync({ id: editingPackage.id, data: packageData });
        notifications.show({ title: "Paquete actualizado", message: "El paquete se ha actualizado correctamente", color: "green" });
      } else {
        await createPackage.mutateAsync(packageData);
        notifications.show({ title: "Paquete creado", message: "El paquete se ha creado correctamente", color: "green" });
      }
      closePackageModal();
      packageForm.reset();
    } catch {
      notifications.show({ title: "Error", message: "No se pudo guardar el paquete", color: "red" });
    }
  };

  const handleDeletePackage = async (_id: string) => {
    // TODO: Add delete mutation when endpoint supports it
  };

  const handleTogglePackageActive = async (id: string) => {
    const pkg = packages.find((p) => p.id === id);
    if (pkg) {
      try {
        await updatePackage.mutateAsync({ id, data: { is_active: !pkg.isActive } });
      } catch {
        notifications.show({ title: "Error", message: "No se pudo actualizar el estado", color: "red" });
      }
    }
  };

  const getPkgStatusColor = (status: ClientPackage["status"]) => {
    switch (status) {
      case "active": return "green";
      case "expired": return "red";
      case "exhausted": return "gray";
      default: return "gray";
    }
  };

  const getPkgStatusLabel = (status: ClientPackage["status"]) => {
    switch (status) {
      case "active": return "Activo";
      case "expired": return "Expirado";
      case "exhausted": return "Agotado";
      default: return status;
    }
  };

  // Package stats
  const totalRevenue = packages.reduce((sum, p) => sum + p.price * p.soldCount, 0);
  const activePackagesCount = clientPackages.filter((p) => p.status === "active").length;
  const totalSessionsSold = packages.reduce((sum, p) => sum + p.totalSessions * p.soldCount, 0);

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Nuevo Producto",
          icon: <IconPlus size={16} />,
          onClick: handleOpenNewProduct,
        }}
        description="Gestiona productos, suscripciones y paquetes de sesiones"
        title="Catálogo"
      />

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "products", label: "Productos" },
            { value: "subscriptions", label: "Suscripciones" },
            { value: "bonos", label: "Bonos" },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs onChange={setActiveTab} value={activeTab}>
        {!isMobile && (
          <Tabs.List mb="lg" style={{ borderBottom: "1px solid var(--nv-border)" }}>
            <Tabs.Tab leftSection={<IconPackage size={14} />} value="products" style={{ fontWeight: 500 }}>
              Productos
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconRefresh size={14} />} value="subscriptions" style={{ fontWeight: 500 }}>
              Suscripciones
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconCurrencyEuro size={14} />} value="bonos" style={{ fontWeight: 500 }}>
              Bonos
            </Tabs.Tab>
          </Tabs.List>
        )}

        {/* ═══════════════ PRODUCTS TAB ═══════════════ */}
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
                      {product.type === "subscription" ? `/${
                        product.interval === "week" ? "semana" :
                        product.interval === "biweekly" ? "quincenal" :
                        product.interval === "quarter" ? "trimestre" :
                        product.interval === "semester" ? "semestre" :
                        product.interval === "year" ? "año" : "mes"
                      }` : ""}
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

        {/* ═══════════════ SUBSCRIPTIONS TAB ═══════════════ */}
        <Tabs.Panel value="subscriptions">
          <Box className="nv-card" p={0}>
            <ScrollArea type="auto">
              <Table style={{ minWidth: 700 }}>
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
                      <Badge color={getSubStatusColor(sub.status)} variant="light" radius="xl">
                        {getSubStatusLabel(sub.status)}
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
                        €{formatDecimal(Number(sub.amount), 2)}/{
                          sub.interval === "week" ? "semana" :
                          sub.interval === "biweekly" ? "quincenal" :
                          sub.interval === "month" ? "mes" :
                          sub.interval === "quarter" ? "trimestre" :
                          sub.interval === "semester" ? "semestre" :
                          sub.interval === "year" ? "año" : sub.interval || "mes"
                        }
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
            </ScrollArea>
          </Box>
        </Tabs.Panel>

        {/* ═══════════════ BONOS TAB ═══════════════ */}
        <Tabs.Panel value="bonos">
          {/* Stats */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="lg">
            <Card p="md" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" fw={600} size="xs" tt="uppercase">Ingresos por Bonos</Text>
                  <Text fw={700} size="xl">€{totalRevenue.toLocaleString()}</Text>
                </div>
                <ThemeIcon color="green" radius="md" size="lg" variant="light">
                  <IconCurrencyEuro size={20} />
                </ThemeIcon>
              </Group>
            </Card>
            <Card p="md" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" fw={600} size="xs" tt="uppercase">Bonos Activos</Text>
                  <Text fw={700} size="xl">{activePackagesCount}</Text>
                </div>
                <ThemeIcon color="blue" radius="md" size="lg" variant="light">
                  <IconPackage size={20} />
                </ThemeIcon>
              </Group>
            </Card>
            <Card p="md" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" fw={600} size="xs" tt="uppercase">Sesiones Vendidas</Text>
                  <Text fw={700} size="xl">{totalSessionsSold}</Text>
                </div>
                <ThemeIcon color="violet" radius="md" size="lg" variant="light">
                  <IconCalendarEvent size={20} />
                </ThemeIcon>
              </Group>
            </Card>
          </SimpleGrid>

          <Group justify="flex-end" mb="md">
            <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenPackageModal()}>
              Nuevo Paquete
            </Button>
          </Group>

          {isMobile && (
            <Select
              value={bonosSubTab}
              onChange={setBonosSubTab}
              data={[
                { value: "packages", label: "Paquetes Disponibles" },
                { value: "clients", label: "Bonos de Clientes" },
              ]}
              size="sm"
              radius="md"
              mb="md"
            />
          )}
          <Tabs onChange={setBonosSubTab} value={bonosSubTab}>
            {!isMobile && (
              <Tabs.List mb="lg">
                <Tabs.Tab leftSection={<IconPackage size={16} />} value="packages">
                  Paquetes Disponibles
                </Tabs.Tab>
                <Tabs.Tab leftSection={<IconUsers size={16} />} value="clients">
                  Bonos de Clientes
                </Tabs.Tab>
              </Tabs.List>
            )}

            <Tabs.Panel value="packages">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
                {packages.map((pkg) => (
                  <Card key={pkg.id} p="lg" radius="md" withBorder>
                    <Group justify="space-between" mb="md">
                      <Group gap="xs">
                        <ThemeIcon
                          color={pkg.isActive ? "teal" : "gray"}
                          radius="md"
                          size="lg"
                          variant="light"
                        >
                          <IconPackage size={20} />
                        </ThemeIcon>
                        <div>
                          <Text fw={600}>{pkg.name}</Text>
                          <Badge color={pkg.isActive ? "green" : "gray"} size="xs" variant="light">
                            {pkg.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </Group>
                      <Menu shadow="md" width={160}>
                        <Menu.Target>
                          <ActionIcon variant="subtle">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => handleOpenPackageModal(pkg)}>
                            Editar
                          </Menu.Item>
                          <Menu.Item
                            leftSection={pkg.isActive ? <IconX size={14} /> : <IconCheck size={14} />}
                            onClick={() => handleTogglePackageActive(pkg.id)}
                          >
                            {pkg.isActive ? "Desactivar" : "Activar"}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDeletePackage(pkg.id)}>
                            Eliminar
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>

                    <Text c="dimmed" lineClamp={2} mb="md" size="sm">{pkg.description}</Text>

                    <Stack gap="xs" mb="md">
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">Sesiones</Text>
                        <Text fw={600} size="sm">{pkg.totalSessions}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">Validez</Text>
                        <Text fw={600} size="sm">{pkg.validityDays} días</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">Vendidos</Text>
                        <Text fw={600} size="sm">{pkg.soldCount}</Text>
                      </Group>
                    </Stack>

                    <Group gap={4} mb="md">
                      {pkg.sessionTypes.map((type) => (
                        <Badge key={type} size="xs" variant="outline">{type}</Badge>
                      ))}
                    </Group>

                    <Divider mb="md" />

                    <Group justify="space-between">
                      <Text c="teal" fw={700} size="lg">€{pkg.price}</Text>
                      <Text c="dimmed" size="xs">€{formatDecimal(pkg.price / pkg.totalSessions, 2)}/sesión</Text>
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="clients">
              <Paper radius="md" withBorder>
                <ScrollArea type="auto">
                  <Table highlightOnHover striped style={{ minWidth: 700 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Cliente</Table.Th>
                      <Table.Th>Paquete</Table.Th>
                      <Table.Th>Sesiones</Table.Th>
                      <Table.Th>Progreso</Table.Th>
                      <Table.Th>Expira</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {clientPackages.map((cp) => {
                      const progress = (cp.usedSessions / cp.totalSessions) * 100;
                      const remaining = cp.totalSessions - cp.usedSessions;
                      return (
                        <Table.Tr key={cp.id}>
                          <Table.Td>
                            <div>
                              <Text fw={500} size="sm">{cp.clientName}</Text>
                              <Text c="dimmed" size="xs">{cp.clientEmail}</Text>
                            </div>
                          </Table.Td>
                          <Table.Td><Text size="sm">{cp.packageName}</Text></Table.Td>
                          <Table.Td>
                            <Text fw={500} size="sm">{cp.usedSessions} / {cp.totalSessions}</Text>
                            <Text c="dimmed" size="xs">{remaining} restantes</Text>
                          </Table.Td>
                          <Table.Td style={{ width: 150 }}>
                            <Progress
                              color={progress >= 100 ? "gray" : progress >= 80 ? "yellow" : "teal"}
                              size="sm"
                              value={progress}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{new Date(cp.expiresAt).toLocaleDateString("es-ES")}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={getPkgStatusColor(cp.status)} variant="light">{getPkgStatusLabel(cp.status)}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Menu shadow="md" width={160}>
                              <Menu.Target>
                                <ActionIcon variant="subtle"><IconDotsVertical size={16} /></ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<IconCalendarEvent size={14} />}>Ver sesiones</Menu.Item>
                                <Menu.Item leftSection={<IconClock size={14} />}>Extender validez</Menu.Item>
                                <Menu.Item leftSection={<IconPlus size={14} />}>Añadir sesiones</Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
                </ScrollArea>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Tabs.Panel>
      </Tabs>

      {/* Product Modal */}
      <BottomSheet
        onClose={() => { closeProductModal(); setEditingProduct(null); productForm.reset(); }}
        opened={productModalOpened}
        size="md"
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={productForm.onSubmit(handleSaveProduct)}>
          <Stack>
            <TextInput label="Nombre" placeholder="Plan Premium" required {...productForm.getInputProps("name")} />
            <Textarea label="Descripción" minRows={2} placeholder="Describe el producto..." {...productForm.getInputProps("description")} />
            <Group grow>
              <NumberInput label="Precio (€)" min={0} placeholder="0" required decimalScale={2} {...productForm.getInputProps("price")} />
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
                  { value: "week", label: "Semanal" },
                  { value: "biweekly", label: "Quincenal" },
                  { value: "month", label: "Mensual" },
                  { value: "quarter", label: "Trimestral" },
                  { value: "semester", label: "Semestral" },
                  { value: "year", label: "Anual" },
                ]}
                label="Intervalo de cobro"
                {...productForm.getInputProps("interval")}
              />
            )}
            {productForm.values.type === "package" && (
              <NumberInput label="Sesiones incluidas" min={1} placeholder="0" {...productForm.getInputProps("sessions_included")} />
            )}
            <Group justify="flex-end" mt="md">
              <Button onClick={() => { closeProductModal(); setEditingProduct(null); productForm.reset(); }} variant="default">Cancelar</Button>
              <Button type="submit" loading={createProduct.isPending || updateProduct.isPending}>
                {editingProduct ? "Guardar Cambios" : "Crear Producto"}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Package Modal */}
      <BottomSheet
        onClose={closePackageModal}
        opened={packageModalOpened}
        size="md"
        title={editingPackage ? "Editar Paquete" : "Nuevo Paquete"}
      >
        <form onSubmit={packageForm.onSubmit(handleSavePackage)}>
          <Stack gap="md">
            <TextInput label="Nombre del paquete" placeholder="Ej: Bono 10 Sesiones" required {...packageForm.getInputProps("name")} />
            <TextInput label="Descripción" placeholder="Descripción del paquete" {...packageForm.getInputProps("description")} />
            <Group grow>
              <NumberInput label="Número de sesiones" min={1} required {...packageForm.getInputProps("totalSessions")} />
              <NumberInput decimalScale={2} label="Precio (€)" min={0} required {...packageForm.getInputProps("price")} />
            </Group>
            <NumberInput description="Días desde la compra hasta que expira" label="Validez (días)" min={1} {...packageForm.getInputProps("validityDays")} />
            <MultiSelect data={sessionTypeOptions} description="Deja vacío para aplicar a todos" label="Tipos de sesión aplicables" {...packageForm.getInputProps("sessionTypes")} />
            <Switch description="Los paquetes inactivos no se pueden comprar" label="Paquete activo" {...packageForm.getInputProps("isActive", { type: "checkbox" })} />
            <Group justify="flex-end" mt="md">
              <Button onClick={closePackageModal} variant="subtle">Cancelar</Button>
              <Button type="submit">{editingPackage ? "Guardar Cambios" : "Crear Paquete"}</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}

export default CatalogPage;
