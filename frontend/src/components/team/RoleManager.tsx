import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  ColorInput,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconEdit,
  IconPlus,
  IconShield,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";

// Types
interface Permission {
  resource: string;
  description: string;
  actions: string[];
}

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  color: string;
  baseRole: string;
  permissions: Record<string, string[]>;
  isActive: boolean;
  usersCount: number;
}

// Available permissions
const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    resource: "clients",
    description: "Gestión de clientes",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "workouts",
    description: "Programas de entrenamiento",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "nutrition",
    description: "Planes nutricionales",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "calendar",
    description: "Calendario y reservas",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "payments",
    description: "Pagos y facturación",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "team",
    description: "Gestión de equipo",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "settings",
    description: "Configuración",
    actions: ["read", "update"],
  },
  {
    resource: "reports",
    description: "Informes y analíticas",
    actions: ["read"],
  },
  {
    resource: "chat",
    description: "Chat y mensajería",
    actions: ["read", "send"],
  },
  {
    resource: "automations",
    description: "Automatizaciones",
    actions: ["create", "read", "update", "delete"],
  },
];

const BASE_ROLES = [
  { value: "owner", label: "Propietario" },
  { value: "admin", label: "Administrador" },
  { value: "trainer", label: "Entrenador" },
  { value: "nutritionist", label: "Nutricionista" },
  { value: "collaborator", label: "Colaborador" },
];

const ACTION_LABELS: Record<string, string> = {
  create: "Crear",
  read: "Ver",
  update: "Editar",
  delete: "Eliminar",
  send: "Enviar",
};

// Mock data
const mockRoles: CustomRole[] = [
  {
    id: "1",
    name: "Entrenador Senior",
    description: "Entrenador con acceso completo a clientes y entrenamientos",
    color: "#2D6A4F",
    baseRole: "trainer",
    permissions: {
      clients: ["create", "read", "update", "delete"],
      workouts: ["create", "read", "update", "delete"],
      nutrition: ["read"],
      calendar: ["create", "read", "update", "delete"],
      payments: ["read"],
      chat: ["read", "send"],
    },
    isActive: true,
    usersCount: 3,
  },
  {
    id: "2",
    name: "Nutricionista",
    description: "Acceso a planes nutricionales y datos de clientes",
    color: "#40916C",
    baseRole: "nutritionist",
    permissions: {
      clients: ["read", "update"],
      nutrition: ["create", "read", "update", "delete"],
      calendar: ["read"],
      chat: ["read", "send"],
    },
    isActive: true,
    usersCount: 2,
  },
  {
    id: "3",
    name: "Asistente",
    description: "Acceso limitado para tareas administrativas",
    color: "#F08A5D",
    baseRole: "collaborator",
    permissions: {
      clients: ["read"],
      calendar: ["read", "update"],
      chat: ["read", "send"],
    },
    isActive: true,
    usersCount: 1,
  },
];

export function RoleManager() {
  const [roles, setRoles] = useState<CustomRole[]>(mockRoles);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      color: "#2D6A4F",
      baseRole: "collaborator",
      permissions: {} as Record<string, string[]>,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const handleOpenModal = (role?: CustomRole) => {
    if (role) {
      setEditingRole(role);
      form.setValues({
        name: role.name,
        description: role.description || "",
        color: role.color,
        baseRole: role.baseRole,
        permissions: role.permissions,
      });
    } else {
      setEditingRole(null);
      form.reset();
    }
    openModal();
  };

  const handleSubmit = (values: typeof form.values) => {
    if (editingRole) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingRole.id
            ? {
                ...r,
                name: values.name,
                description: values.description,
                color: values.color,
                baseRole: values.baseRole,
                permissions: values.permissions,
              }
            : r
        )
      );
      notifications.show({
        title: "Rol actualizado",
        message: `${values.name} se ha actualizado correctamente`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } else {
      const newRole: CustomRole = {
        id: String(Date.now()),
        name: values.name,
        description: values.description,
        color: values.color,
        baseRole: values.baseRole,
        permissions: values.permissions,
        isActive: true,
        usersCount: 0,
      };
      setRoles((prev) => [...prev, newRole]);
      notifications.show({
        title: "Rol creado",
        message: `${values.name} se ha creado correctamente`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    }
    closeModal();
    form.reset();
  };

  const togglePermission = (resource: string, action: string) => {
    const current = form.values.permissions[resource] || [];
    let updated: string[];

    if (current.includes(action)) {
      updated = current.filter((a) => a !== action);
    } else {
      updated = [...current, action];
    }

    form.setFieldValue("permissions", {
      ...form.values.permissions,
      [resource]: updated,
    });
  };

  const hasPermission = (resource: string, action: string) => {
    return (form.values.permissions[resource] || []).includes(action);
  };

  const deleteRole = (roleId: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    notifications.show({
      title: "Rol eliminado",
      message: "El rol se ha eliminado correctamente",
      color: "green",
    });
  };

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Box>
          <Text fw={600} size="lg">
            Roles Personalizados
          </Text>
          <Text c="dimmed" size="sm">
            Configura roles con permisos específicos para tu equipo
          </Text>
        </Box>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Nuevo Rol
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {roles.map((role) => (
          <Card key={role.id} padding="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <ThemeIcon
                  color={role.color}
                  variant="light"
                  size="lg"
                  radius="md"
                >
                  <IconShield size={18} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>{role.name}</Text>
                  <Badge color="gray" size="xs" variant="light">
                    Base: {BASE_ROLES.find((r) => r.value === role.baseRole)?.label}
                  </Badge>
                </Box>
              </Group>
              <Group gap="xs">
                <ActionIcon
                  color="gray"
                  variant="subtle"
                  onClick={() => handleOpenModal(role)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => deleteRole(role.id)}
                  disabled={role.usersCount > 0}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>

            <Text c="dimmed" size="sm" mb="md">
              {role.description || "Sin descripción"}
            </Text>

            <Group gap="xs" mb="md">
              <IconUsers size={14} color="var(--mantine-color-gray-6)" />
              <Text size="sm" c="dimmed">
                {role.usersCount} usuario(s)
              </Text>
            </Group>

            <Text size="xs" fw={600} c="dimmed" mb="xs">
              Permisos:
            </Text>
            <Group gap={4}>
              {Object.entries(role.permissions)
                .filter(([_, actions]) => actions.length > 0)
                .slice(0, 4)
                .map(([resource]) => (
                  <Badge key={resource} size="xs" variant="light" color={role.color}>
                    {AVAILABLE_PERMISSIONS.find((p) => p.resource === resource)?.description ||
                      resource}
                  </Badge>
                ))}
              {Object.keys(role.permissions).length > 4 && (
                <Badge size="xs" variant="light" color="gray">
                  +{Object.keys(role.permissions).length - 4} más
                </Badge>
              )}
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Modal for creating/editing roles */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingRole ? "Editar Rol" : "Nuevo Rol"}
        size="xl"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Group grow>
              <TextInput
                label="Nombre del rol"
                placeholder="Entrenador Senior"
                required
                {...form.getInputProps("name")}
              />
              <ColorInput
                label="Color"
                format="hex"
                swatches={[
                  "#2D6A4F",
                  "#40916C",
                  "#F08A5D",
                  "#2196F3",
                  "#9C27B0",
                  "#FF5722",
                ]}
                {...form.getInputProps("color")}
              />
            </Group>

            <Textarea
              label="Descripción"
              placeholder="Describe las responsabilidades de este rol..."
              {...form.getInputProps("description")}
            />

            <Select
              label="Rol base"
              description="Los permisos del rol base se usarán como punto de partida"
              data={BASE_ROLES}
              {...form.getInputProps("baseRole")}
            />

            <Box>
              <Text fw={600} size="sm" mb="md">
                Permisos
              </Text>
              <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Recurso</Table.Th>
                      {["create", "read", "update", "delete", "send"].map((action) => (
                        <Table.Th key={action} ta="center">
                          {ACTION_LABELS[action]}
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {AVAILABLE_PERMISSIONS.map((permission) => (
                      <Table.Tr key={permission.resource}>
                        <Table.Td>
                          <Text size="sm">{permission.description}</Text>
                        </Table.Td>
                        {["create", "read", "update", "delete", "send"].map((action) => (
                          <Table.Td key={action} ta="center">
                            {permission.actions.includes(action) ? (
                              <Checkbox
                                checked={hasPermission(permission.resource, action)}
                                onChange={() =>
                                  togglePermission(permission.resource, action)
                                }
                              />
                            ) : (
                              <Text c="dimmed">-</Text>
                            )}
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Box>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingRole ? "Guardar Cambios" : "Crear Rol"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}

export default RoleManager;
