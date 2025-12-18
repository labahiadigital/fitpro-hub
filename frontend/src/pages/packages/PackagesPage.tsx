import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Progress,
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
import { useDisclosure } from "@mantine/hooks";
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
import { PageHeader } from "../../components/common/PageHeader";

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

const mockPackages: SessionPackage[] = [
  {
    id: "1",
    name: "Bono 10 Sesiones",
    description: "Paquete de 10 sesiones de entrenamiento personal",
    totalSessions: 10,
    price: 350,
    validityDays: 90,
    sessionTypes: ["Personal Training"],
    isActive: true,
    soldCount: 15,
  },
  {
    id: "2",
    name: "Bono 20 Sesiones",
    description: "Paquete de 20 sesiones con descuento",
    totalSessions: 20,
    price: 600,
    validityDays: 180,
    sessionTypes: ["Personal Training", "HIIT"],
    isActive: true,
    soldCount: 8,
  },
  {
    id: "3",
    name: "Pack Nutrición",
    description: "5 consultas nutricionales",
    totalSessions: 5,
    price: 150,
    validityDays: 60,
    sessionTypes: ["Nutrición"],
    isActive: true,
    soldCount: 12,
  },
  {
    id: "4",
    name: "Pack Completo",
    description: "Entrenamiento + Nutrición",
    totalSessions: 15,
    price: 500,
    validityDays: 120,
    sessionTypes: ["Personal Training", "Nutrición"],
    isActive: false,
    soldCount: 3,
  },
];

const mockClientPackages: ClientPackage[] = [
  {
    id: "1",
    clientName: "María García",
    clientEmail: "maria@email.com",
    packageName: "Bono 10 Sesiones",
    totalSessions: 10,
    usedSessions: 6,
    purchasedAt: "2024-10-15",
    expiresAt: "2025-01-15",
    status: "active",
  },
  {
    id: "2",
    clientName: "Carlos López",
    clientEmail: "carlos@email.com",
    packageName: "Bono 20 Sesiones",
    totalSessions: 20,
    usedSessions: 20,
    purchasedAt: "2024-08-01",
    expiresAt: "2025-02-01",
    status: "exhausted",
  },
  {
    id: "3",
    clientName: "Ana Martínez",
    clientEmail: "ana@email.com",
    packageName: "Pack Nutrición",
    totalSessions: 5,
    usedSessions: 2,
    purchasedAt: "2024-11-01",
    expiresAt: "2024-12-31",
    status: "active",
  },
  {
    id: "4",
    clientName: "Pedro Sánchez",
    clientEmail: "pedro@email.com",
    packageName: "Bono 10 Sesiones",
    totalSessions: 10,
    usedSessions: 3,
    purchasedAt: "2024-06-01",
    expiresAt: "2024-09-01",
    status: "expired",
  },
];

const sessionTypeOptions = [
  { value: "Personal Training", label: "Personal Training" },
  { value: "HIIT", label: "HIIT Grupal" },
  { value: "Nutrición", label: "Consulta Nutricional" },
  { value: "Yoga", label: "Yoga" },
  { value: "Pilates", label: "Pilates" },
  { value: "Evaluación", label: "Evaluación" },
];

export function PackagesPage() {
  const [activeTab, setActiveTab] = useState<string | null>("packages");
  const [packages, setPackages] = useState<SessionPackage[]>(mockPackages);
  const [clientPackages] = useState<ClientPackage[]>(mockClientPackages);
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

  const handleSavePackage = (values: typeof packageForm.values) => {
    if (editingPackage) {
      setPackages(
        packages.map((p) =>
          p.id === editingPackage.id ? { ...p, ...values } : p
        )
      );
    } else {
      setPackages([
        ...packages,
        {
          id: Date.now().toString(),
          ...values,
          soldCount: 0,
        },
      ]);
    }
    closePackageModal();
    packageForm.reset();
  };

  const handleDeletePackage = (id: string) => {
    setPackages(packages.filter((p) => p.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setPackages(
      packages.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
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
    <Container py="xl" size="xl">
      <PageHeader
        action={
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => handleOpenPackageModal()}
          >
            Nuevo Paquete
          </Button>
        }
        subtitle="Gestiona paquetes de sesiones para tus clientes"
        title="Bonos y Paquetes"
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="lg">
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Ingresos por Bonos
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
                Bonos Activos
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
                Sesiones Vendidas
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

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconPackage size={16} />} value="packages">
            Paquetes Disponibles
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconUsers size={16} />} value="clients">
            Bonos de Clientes
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="packages">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
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
                        Editar
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
                        Eliminar
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
                      Sesiones
                    </Text>
                    <Text fw={600} size="sm">
                      {pkg.totalSessions}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      Validez
                    </Text>
                    <Text fw={600} size="sm">
                      {pkg.validityDays} días
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      Vendidos
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
                    €{(pkg.price / pkg.totalSessions).toFixed(2)}/sesión
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
                              Ver sesiones
                            </Menu.Item>
                            <Menu.Item leftSection={<IconClock size={14} />}>
                              Extender validez
                            </Menu.Item>
                            <Menu.Item leftSection={<IconPlus size={14} />}>
                              Añadir sesiones
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
      <Modal
        onClose={closePackageModal}
        opened={packageModalOpened}
        size="md"
        title={editingPackage ? "Editar Paquete" : "Nuevo Paquete"}
      >
        <form onSubmit={packageForm.onSubmit(handleSavePackage)}>
          <Stack gap="md">
            <TextInput
              label="Nombre del paquete"
              placeholder="Ej: Bono 10 Sesiones"
              required
              {...packageForm.getInputProps("name")}
            />
            <TextInput
              label="Descripción"
              placeholder="Descripción del paquete"
              {...packageForm.getInputProps("description")}
            />
            <Group grow>
              <NumberInput
                label="Número de sesiones"
                min={1}
                required
                {...packageForm.getInputProps("totalSessions")}
              />
              <NumberInput
                decimalScale={2}
                label="Precio (€)"
                min={0}
                required
                {...packageForm.getInputProps("price")}
              />
            </Group>
            <NumberInput
              description="Días desde la compra hasta que expira"
              label="Validez (días)"
              min={1}
              {...packageForm.getInputProps("validityDays")}
            />
            <MultiSelect
              data={sessionTypeOptions}
              description="Deja vacío para aplicar a todos"
              label="Tipos de sesión aplicables"
              {...packageForm.getInputProps("sessionTypes")}
            />
            <Switch
              description="Los paquetes inactivos no se pueden comprar"
              label="Paquete activo"
              {...packageForm.getInputProps("isActive", { type: "checkbox" })}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closePackageModal} variant="subtle">
                Cancelar
              </Button>
              <Button type="submit">
                {editingPackage ? "Guardar Cambios" : "Crear Paquete"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
