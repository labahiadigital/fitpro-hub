import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Menu,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCalendarEvent,
  IconCheck,
  IconCurrencyEuro,
  IconDotsVertical,
  IconEdit,
  IconMail,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "trainer" | "receptionist";
  avatar?: string;
  status: "active" | "pending" | "inactive";
  permissions: {
    clients: boolean;
    calendar: boolean;
    payments: boolean;
    reports: boolean;
    settings: boolean;
  };
  stats: {
    clients: number;
    sessionsThisMonth: number;
    revenue: number;
  };
}

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  trainer: "Entrenador",
  receptionist: "Recepcionista",
};

const roleColors: Record<string, string> = {
  owner: "violet",
  admin: "blue",
  trainer: "green",
  receptionist: "gray",
};

export function TeamPage() {
  const [
    inviteModalOpened,
    { open: openInviteModal, close: closeInviteModal },
  ] = useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Mock data
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: "1",
      name: "Juan García",
      email: "juan@fitprohub.com",
      role: "owner",
      status: "active",
      permissions: {
        clients: true,
        calendar: true,
        payments: true,
        reports: true,
        settings: true,
      },
      stats: { clients: 45, sessionsThisMonth: 120, revenue: 8500 },
    },
    {
      id: "2",
      name: "María López",
      email: "maria@fitprohub.com",
      role: "trainer",
      status: "active",
      permissions: {
        clients: true,
        calendar: true,
        payments: false,
        reports: false,
        settings: false,
      },
      stats: { clients: 25, sessionsThisMonth: 80, revenue: 4200 },
    },
    {
      id: "3",
      name: "Carlos Rodríguez",
      email: "carlos@fitprohub.com",
      role: "trainer",
      status: "active",
      permissions: {
        clients: true,
        calendar: true,
        payments: false,
        reports: false,
        settings: false,
      },
      stats: { clients: 18, sessionsThisMonth: 65, revenue: 3100 },
    },
    {
      id: "4",
      name: "Ana Martínez",
      email: "ana@fitprohub.com",
      role: "receptionist",
      status: "pending",
      permissions: {
        clients: true,
        calendar: true,
        payments: false,
        reports: false,
        settings: false,
      },
      stats: { clients: 0, sessionsThisMonth: 0, revenue: 0 },
    },
  ]);

  const inviteForm = useForm({
    initialValues: {
      email: "",
      role: "trainer",
      permissions: {
        clients: true,
        calendar: true,
        payments: false,
        reports: false,
        settings: false,
      },
    },
  });

  const totalMembers = teamMembers.length;
  const activeMembers = teamMembers.filter((m) => m.status === "active").length;
  const totalRevenue = teamMembers.reduce((sum, m) => sum + m.stats.revenue, 0);

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    openEditModal();
  };

  return (
    <Container py="xl" size="xl">
      <PageHeader
        action={{
          label: "Invitar Miembro",
          icon: <IconUserPlus size={16} />,
          onClick: openInviteModal,
        }}
        description="Gestiona los miembros de tu equipo y sus permisos"
        title="Equipo"
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="lg">
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Miembros del Equipo
              </Text>
              <Text fw={700} size="xl">
                {totalMembers}
              </Text>
            </div>
            <ThemeIcon color="blue" radius="md" size="lg" variant="light">
              <IconUsers size={20} />
            </ThemeIcon>
          </Group>
          <Text c="dimmed" mt="xs" size="xs">
            {activeMembers} activos, {totalMembers - activeMembers} pendientes
          </Text>
        </Card>
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Sesiones Este Mes
              </Text>
              <Text fw={700} size="xl">
                {teamMembers.reduce(
                  (sum, m) => sum + m.stats.sessionsThisMonth,
                  0
                )}
              </Text>
            </div>
            <ThemeIcon color="green" radius="md" size="lg" variant="light">
              <IconCalendarEvent size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Ingresos del Equipo
              </Text>
              <Text fw={700} size="xl">
                €{totalRevenue.toLocaleString()}
              </Text>
            </div>
            <ThemeIcon color="violet" radius="md" size="lg" variant="light">
              <IconCurrencyEuro size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Team Members */}
      <Stack gap="md">
        {teamMembers.map((member) => (
          <Paper key={member.id} p="lg" radius="md" withBorder>
            <Group justify="space-between">
              <Group gap="md">
                <Avatar color={roleColors[member.role]} radius="xl" size="lg">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </Avatar>
                <div>
                  <Group gap="xs">
                    <Text fw={600}>{member.name}</Text>
                    <Badge
                      color={roleColors[member.role]}
                      size="sm"
                      variant="light"
                    >
                      {roleLabels[member.role]}
                    </Badge>
                    {member.status === "pending" && (
                      <Badge color="yellow" size="sm" variant="light">
                        Pendiente
                      </Badge>
                    )}
                  </Group>
                  <Text c="dimmed" size="sm">
                    {member.email}
                  </Text>
                </div>
              </Group>

              <Group gap="xl">
                {/* Stats */}
                <Group gap="lg" visibleFrom="md">
                  <div style={{ textAlign: "center" }}>
                    <Text fw={700} size="lg">
                      {member.stats.clients}
                    </Text>
                    <Text c="dimmed" size="xs">
                      Clientes
                    </Text>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <Text fw={700} size="lg">
                      {member.stats.sessionsThisMonth}
                    </Text>
                    <Text c="dimmed" size="xs">
                      Sesiones
                    </Text>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <Text fw={700} size="lg">
                      €{member.stats.revenue}
                    </Text>
                    <Text c="dimmed" size="xs">
                      Ingresos
                    </Text>
                  </div>
                </Group>

                {/* Permissions Icons */}
                <Group gap={4}>
                  <Tooltip
                    label={
                      member.permissions.clients
                        ? "Puede ver clientes"
                        : "Sin acceso a clientes"
                    }
                  >
                    <ThemeIcon
                      color={member.permissions.clients ? "green" : "gray"}
                      radius="xl"
                      size="sm"
                      variant="light"
                    >
                      {member.permissions.clients ? (
                        <IconCheck size={12} />
                      ) : (
                        <IconX size={12} />
                      )}
                    </ThemeIcon>
                  </Tooltip>
                  <Tooltip
                    label={
                      member.permissions.payments
                        ? "Puede ver pagos"
                        : "Sin acceso a pagos"
                    }
                  >
                    <ThemeIcon
                      color={member.permissions.payments ? "green" : "gray"}
                      radius="xl"
                      size="sm"
                      variant="light"
                    >
                      {member.permissions.payments ? (
                        <IconCheck size={12} />
                      ) : (
                        <IconX size={12} />
                      )}
                    </ThemeIcon>
                  </Tooltip>
                  <Tooltip
                    label={
                      member.permissions.settings
                        ? "Puede ver configuración"
                        : "Sin acceso a configuración"
                    }
                  >
                    <ThemeIcon
                      color={member.permissions.settings ? "green" : "gray"}
                      radius="xl"
                      size="sm"
                      variant="light"
                    >
                      {member.permissions.settings ? (
                        <IconCheck size={12} />
                      ) : (
                        <IconX size={12} />
                      )}
                    </ThemeIcon>
                  </Tooltip>
                </Group>

                {/* Actions */}
                <Menu shadow="md" width={180}>
                  <Menu.Target>
                    <ActionIcon color="gray" variant="subtle">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconEdit size={14} />}
                      onClick={() => handleEditMember(member)}
                    >
                      Editar Permisos
                    </Menu.Item>
                    {member.status === "pending" && (
                      <Menu.Item leftSection={<IconMail size={14} />}>
                        Reenviar Invitación
                      </Menu.Item>
                    )}
                    {member.role !== "owner" && (
                      <>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                        >
                          Eliminar del Equipo
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>

      {/* Invite Modal */}
      <Modal
        centered
        onClose={closeInviteModal}
        opened={inviteModalOpened}
        title="Invitar Miembro"
      >
        <form
          onSubmit={inviteForm.onSubmit((values) => {
            console.log(values);
            closeInviteModal();
          })}
        >
          <Stack>
            <TextInput
              label="Email"
              leftSection={<IconMail size={14} />}
              placeholder="email@ejemplo.com"
              {...inviteForm.getInputProps("email")}
            />
            <Select
              data={[
                { value: "admin", label: "Administrador" },
                { value: "trainer", label: "Entrenador" },
                { value: "receptionist", label: "Recepcionista" },
              ]}
              label="Rol"
              {...inviteForm.getInputProps("role")}
            />
            <Divider label="Permisos" labelPosition="center" />
            <Stack gap="xs">
              <Switch
                description="Ver y editar clientes"
                label="Gestión de Clientes"
                {...inviteForm.getInputProps("permissions.clients", {
                  type: "checkbox",
                })}
              />
              <Switch
                description="Ver y gestionar reservas"
                label="Calendario"
                {...inviteForm.getInputProps("permissions.calendar", {
                  type: "checkbox",
                })}
              />
              <Switch
                description="Ver pagos y suscripciones"
                label="Pagos"
                {...inviteForm.getInputProps("permissions.payments", {
                  type: "checkbox",
                })}
              />
              <Switch
                description="Ver estadísticas y reportes"
                label="Reportes"
                {...inviteForm.getInputProps("permissions.reports", {
                  type: "checkbox",
                })}
              />
              <Switch
                description="Modificar ajustes del workspace"
                label="Configuración"
                {...inviteForm.getInputProps("permissions.settings", {
                  type: "checkbox",
                })}
              />
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button onClick={closeInviteModal} variant="default">
                Cancelar
              </Button>
              <Button leftSection={<IconMail size={14} />} type="submit">
                Enviar Invitación
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        centered
        onClose={closeEditModal}
        opened={editModalOpened}
        title={`Editar Permisos - ${selectedMember?.name}`}
      >
        {selectedMember && (
          <Stack>
            <Select
              data={[
                { value: "admin", label: "Administrador" },
                { value: "trainer", label: "Entrenador" },
                { value: "receptionist", label: "Recepcionista" },
              ]}
              disabled={selectedMember.role === "owner"}
              label="Rol"
              value={selectedMember.role}
            />
            <Divider label="Permisos" labelPosition="center" />
            <Stack gap="xs">
              <Switch
                checked={selectedMember.permissions.clients}
                disabled={selectedMember.role === "owner"}
                label="Gestión de Clientes"
              />
              <Switch
                checked={selectedMember.permissions.calendar}
                disabled={selectedMember.role === "owner"}
                label="Calendario"
              />
              <Switch
                checked={selectedMember.permissions.payments}
                disabled={selectedMember.role === "owner"}
                label="Pagos"
              />
              <Switch
                checked={selectedMember.permissions.reports}
                disabled={selectedMember.role === "owner"}
                label="Reportes"
              />
              <Switch
                checked={selectedMember.permissions.settings}
                disabled={selectedMember.role === "owner"}
                label="Configuración"
              />
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button onClick={closeEditModal} variant="default">
                Cancelar
              </Button>
              <Button onClick={closeEditModal}>Guardar Cambios</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
