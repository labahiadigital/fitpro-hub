import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Menu,
  MultiSelect,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconCurrencyEuro,
  IconDotsVertical,
  IconEdit,
  IconPackage,
  IconPlus,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "../../components/common/PageHeader";
import { BottomSheet } from "../../components/common/BottomSheet";
import {
  useSessionPackages,
  useClientPackages,
  useCreateSessionPackage,
  useUpdateSessionPackage,
  type SessionPackage as SessionPackageType,
  type ClientPackage as ClientPackageType,
} from "../../hooks/usePackages";
import { formatDecimal } from "../../utils/format";
import { useTranslation } from "react-i18next";

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

export function PackagesPage() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<string | null>("packages");
  
  // API hooks
  const { data: packagesData = [] } = useSessionPackages();
  const { data: clientPackagesData = [] } = useClientPackages();
  const createPackage = useCreateSessionPackage();
  const updatePackage = useUpdateSessionPackage();
  
  // Map API data to UI format
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
  
  const [
    packageModalOpened,
    { open: openPackageModal, close: closePackageModal },
  ] = useDisclosure(false);
  const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(
    null
  );

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
        await updatePackage.mutateAsync({
          id: editingPackage.id,
          data: packageData,
        });
        notifications.show({
          title: t("packages.paqueteActualizado"),
          message: t("packages.elPaqueteSeHaActualizado"),
          color: "green",
        });
      } else {
        await createPackage.mutateAsync(packageData);
        notifications.show({
          title: t("packages.paqueteCreado"),
          message: t("packages.elPaqueteSeHaCreado"),
          color: "green",
        });
      }
      closePackageModal();
      packageForm.reset();
    } catch (error) {
      notifications.show({
        title: t("packages.error"),
        message: t("packages.noSePudoGuardarEl"),
        color: "red",
      });
    }
  };

  const handleDeletePackage = async (_id: string) => {
    // TODO: Add delete mutation when endpoint supports it
  };

  const handleToggleActive = async (id: string) => {
    const pkg = packages.find((p) => p.id === id);
    if (pkg) {
      try {
        await updatePackage.mutateAsync({
          id,
          data: { is_active: !pkg.isActive },
        });
      } catch (error) {
        notifications.show({
          title: t("packages.error"),
          message: t("packages.noSePudoActualizarEl"),
          color: "red",
        });
      }
    }
  };

  const getStatusColor = (status: ClientPackage["status"]) => {
    switch (status) {
      case "active":
        return "green";
      case "expired":
        return "red";
      case "exhausted":
        return "gray";
      default:
        return "gray";
    }
  };

  const getStatusLabel = (status: ClientPackage["status"]) => {
    switch (status) {
      case "active":
        return "Activo";
      case "expired":
        return "Expirado";
      case "exhausted":
        return "Agotado";
      default:
        return status;
    }
  };

  // Estadísticas
  const totalRevenue = packages.reduce(
    (sum, p) => sum + p.price * p.soldCount,
    0
  );
  const activePackagesCount = clientPackages.filter(
    (p) => p.status === "active"
  ).length;
  const totalSessionsSold = packages.reduce(
    (sum, p) => sum + p.totalSessions * p.soldCount,
    0
  );

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => handleOpenPackageModal()}
          >
            {t("packages.nuevoPaquete")}
          </Button>
        }
        subtitle={t("packages.gestionaPaquetesDeSesionesPara")}
        title={t("packages.bonosYPaquetes")}
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="lg">
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                {t("packages.ingresosPorBonos")}
              </Text>
              <Text fw={700} size="xl">
                €{totalRevenue.toLocaleString()}
              </Text>
            </div>
            <ThemeIcon color="green" radius="md" size="lg" variant="light">
              <IconCurrencyEuro size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                {t("packages.bonosActivos")}
              </Text>
              <Text fw={700} size="xl">
                {activePackagesCount}
              </Text>
            </div>
            <ThemeIcon color="blue" radius="md" size="lg" variant="light">
              <IconPackage size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                {t("packages.sesionesVendidas")}
              </Text>
              <Text fw={700} size="xl">
                {totalSessionsSold}
              </Text>
            </div>
            <ThemeIcon color="violet" radius="md" size="lg" variant="light">
              <IconCalendarEvent size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "packages", label: t("packages.paquetesDisponibles") },
            { value: "clients", label: t("packages.bonosDeClientes") },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs onChange={setActiveTab} value={activeTab}>
        {!isMobile && (
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconPackage size={16} />} value="packages">
            {t("packages.paquetesDisponibles")}
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconUsers size={16} />} value="clients">
            {t("packages.bonosDeClientes")}
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
                      <Badge
                        color={pkg.isActive ? "green" : "gray"}
                        size="xs"
                        variant="light"
                      >
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
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => handleOpenPackageModal(pkg)}
                      >
                        {t("packages.editar")}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          pkg.isActive ? (
                            <IconX size={14} />
                          ) : (
                            <IconCheck size={14} />
                          )
                        }
                        onClick={() => handleToggleActive(pkg.id)}
                      >
                        {pkg.isActive ? "Desactivar" : "Activar"}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleDeletePackage(pkg.id)}
                      >
                        {t("packages.eliminar")}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <Text c="dimmed" lineClamp={2} mb="md" size="sm">
                  {pkg.description}
                </Text>

                <Stack gap="xs" mb="md">
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      {t("packages.sesiones")}
                    </Text>
                    <Text fw={600} size="sm">
                      {pkg.totalSessions}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      {t("packages.validez")}
                    </Text>
                    <Text fw={600} size="sm">
                      {pkg.validityDays} días
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      {t("packages.vendidos")}
                    </Text>
                    <Text fw={600} size="sm">
                      {pkg.soldCount}
                    </Text>
                  </Group>
                </Stack>

                <Group gap={4} mb="md">
                  {pkg.sessionTypes.map((type) => (
                    <Badge key={type} size="xs" variant="outline">
                      {type}
                    </Badge>
                  ))}
                </Group>

                <Divider mb="md" />

                <Group justify="space-between">
                  <Text c="teal" fw={700} size="lg">
                    €{pkg.price}
                  </Text>
                  <Text c="dimmed" size="xs">
                    €{formatDecimal(pkg.price / pkg.totalSessions, 2)}/sesión
                  </Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="clients">
          <Paper radius="md" withBorder>
            <Table highlightOnHover striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("packages.cliente")}</Table.Th>
                  <Table.Th>{t("packages.paquete")}</Table.Th>
                  <Table.Th>{t("packages.sesiones")}</Table.Th>
                  <Table.Th>{t("packages.progreso")}</Table.Th>
                  <Table.Th>{t("packages.expira")}</Table.Th>
                  <Table.Th>{t("packages.estado")}</Table.Th>
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
                          <Text fw={500} size="sm">
                            {cp.clientName}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {cp.clientEmail}
                          </Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{cp.packageName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500} size="sm">
                          {cp.usedSessions} / {cp.totalSessions}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {remaining} restantes
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ width: 150 }}>
                        <Progress
                          color={
                            progress >= 100
                              ? "gray"
                              : progress >= 80
                                ? "yellow"
                                : "teal"
                          }
                          size="sm"
                          value={progress}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {new Date(cp.expiresAt).toLocaleDateString("es-ES")}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={getStatusColor(cp.status)}
                          variant="light"
                        >
                          {getStatusLabel(cp.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Menu shadow="md" width={160}>
                          <Menu.Target>
                            <ActionIcon variant="subtle">
                              <IconDotsVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconCalendarEvent size={14} />}
                            >
                              {t("packages.verSesiones")}
                            </Menu.Item>
                            <Menu.Item leftSection={<IconClock size={14} />}>
                              {t("packages.extenderValidez")}
                            </Menu.Item>
                            <Menu.Item leftSection={<IconPlus size={14} />}>
                              {t("packages.anadirSesiones")}
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Modal de Paquete */}
      <BottomSheet
        onClose={closePackageModal}
        opened={packageModalOpened}
        size="md"
        title={editingPackage ? "Editar Paquete" : "Nuevo Paquete"}
      >
        <form onSubmit={packageForm.onSubmit(handleSavePackage)}>
          <Stack gap="md">
            <TextInput
              label={t("packages.nombreDelPaquete")}
              placeholder={t("packages.ejBono10Sesiones")}
              required
              {...packageForm.getInputProps("name")}
            />
            <TextInput
              label={t("packages.descripcion")}
              placeholder={t("packages.descripcionDelPaquete")}
              {...packageForm.getInputProps("description")}
            />
            <Group grow>
              <NumberInput
                label={t("packages.numeroDeSesiones")}
                min={1}
                required
                {...packageForm.getInputProps("totalSessions")}
              />
              <NumberInput
                decimalScale={2}
                label={t("packages.precio")}
                min={0}
                required
                {...packageForm.getInputProps("price")}
              />
            </Group>
            <NumberInput
              description={t("packages.diasDesdeLaCompraHasta")}
              label={t("packages.validezDias")}
              min={1}
              {...packageForm.getInputProps("validityDays")}
            />
            <MultiSelect
              data={sessionTypeOptions}
              description={t("packages.dejaVacioParaAplicarA")}
              label={t("packages.tiposDeSesionAplicables")}
              {...packageForm.getInputProps("sessionTypes")}
            />
            <Switch
              description={t("packages.losPaquetesInactivosNoSe")}
              label={t("packages.paqueteActivo")}
              {...packageForm.getInputProps("isActive", { type: "checkbox" })}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closePackageModal} variant="subtle">
                {t("packages.cancelar")}
              </Button>
              <Button type="submit">
                {editingPackage ? "Guardar Cambios" : "Crear Paquete"}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}
