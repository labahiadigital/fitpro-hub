import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Menu,
  MultiSelect,
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
import { BottomSheet } from "../../components/common/BottomSheet";
import {
  useTeamMembers,
  useInviteTeamMember,
  useUpdateMemberPermissions,
  useRemoveTeamMember,
  useResendInvitation,
} from "../../hooks/useTeam";
import { useAuthStore } from "../../stores/auth";
import { useClients } from "../../hooks/useClients";

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
  assigned_clients?: string[];
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

  const { data: teamMembersData = [] } = useTeamMembers();
  const { user } = useAuthStore();
  const { data: clientsData } = useClients({ page_size: 100 });
  const clientOptions = (clientsData?.items || []).map((c) => ({
    value: c.id,
    label: c.full_name || `${c.first_name} ${c.last_name}`,
  }));
  const inviteMutation = useInviteTeamMember();
  const updatePermissionsMutation = useUpdateMemberPermissions();
  const removeMemberMutation = useRemoveTeamMember();
  const resendMutation = useResendInvitation();
  
  // Transform API data to TeamMember format
  const teamMembers: TeamMember[] = teamMembersData.length > 0 
    ? teamMembersData.map((m: { id: string; full_name?: string; name?: string; email: string; role: string; is_active: boolean; permissions?: { clients?: boolean; calendar?: boolean; payments?: boolean; reports?: boolean; settings?: boolean }; assigned_clients?: string[] }) => ({
        id: m.id,
        name: m.full_name || m.name || m.email,
        email: m.email,
        role: m.role === "owner" ? "owner" : m.role === "collaborator" ? "admin" : "trainer",
        status: m.is_active ? "active" : "pending",
        permissions: {
          clients: m.permissions?.clients ?? true,
          calendar: m.permissions?.calendar ?? true,
          payments: m.permissions?.payments ?? (m.role === "owner"),
          reports: m.permissions?.reports ?? (m.role === "owner"),
          settings: m.permissions?.settings ?? (m.role === "owner"),
        },
        assigned_clients: m.assigned_clients || [],
        stats: { clients: 0, sessionsThisMonth: 0, revenue: 0 },
      }))
    : [{
        id: "current-user",
        name: user?.full_name || "Usuario",
        email: user?.email || "",
        role: "owner" as const,
        status: "active" as const,
        permissions: {
          clients: true,
          calendar: true,
          payments: true,
          reports: true,
          settings: true,
        },
        stats: { clients: 0, sessionsThisMonth: 0, revenue: 0 },
      }];

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
      assigned_clients: [] as string[],
    },
  });

  const totalMembers = teamMembers.length;
  const activeMembers = teamMembers.filter((m) => m.status === "active").length;
  const totalRevenue = teamMembers.reduce((sum, m) => sum + m.stats.revenue, 0);

  const [editRole, setEditRole] = useState<string>("");
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [editAssignedClients, setEditAssignedClients] = useState<string[]>([]);

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setEditRole(member.role);
    setEditPermissions({ ...member.permissions });
    setEditAssignedClients(member.assigned_clients || []);
    openEditModal();
  };

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
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
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Miembros del Equipo</Text>
              <Text className="text-display" style={{ fontSize: "2rem" }}>
                {totalMembers}
              </Text>
              <Text c="dimmed" mt="xs" size="xs">
                {activeMembers} activos, {totalMembers - activeMembers} pendientes
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" variant="light" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Sesiones Este Mes</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-success)" }}>
                {teamMembers.reduce(
                  (sum, m) => sum + m.stats.sessionsThisMonth,
                  0
                )}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" variant="light" style={{ backgroundColor: "var(--nv-success-bg)", color: "var(--nv-success)" }}>
              <IconCalendarEvent size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Ingresos del Equipo</Text>
              <Text className="text-display" style={{ fontSize: "2rem" }}>
                €{totalRevenue.toLocaleString()}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" variant="light" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
              <IconCurrencyEuro size={24} />
            </ThemeIcon>
          </Group>
        </Box>
      </SimpleGrid>

      {/* Team Members */}
      <Stack gap="md">
        {teamMembers.map((member) => (
          <Box key={member.id} className="nv-card" p="lg">
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
                    <Text fw={600} style={{ fontFamily: "var(--font-heading)" }}>{member.name}</Text>
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
                      <Menu.Item
                        leftSection={<IconMail size={14} />}
                        onClick={() => resendMutation.mutate({ email: member.email, role: member.role })}
                      >
                        Reenviar Invitación
                      </Menu.Item>
                    )}
                    {member.role !== "owner" && (
                      <>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => {
                            if (confirm(`¿Eliminar a ${member.name} del equipo?`)) {
                              removeMemberMutation.mutate(member.id);
                            }
                          }}
                        >
                          Eliminar del Equipo
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
          </Box>
        ))}
      </Stack>

      {/* Invite Modal */}
      <BottomSheet
        centered
        onClose={closeInviteModal}
        opened={inviteModalOpened}
        title="Invitar Miembro"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        <form
          onSubmit={inviteForm.onSubmit((values) => {
            inviteMutation.mutate(
              { email: values.email, role: values.role, send_email: true },
              {
                onSuccess: () => {
                  closeInviteModal();
                  inviteForm.reset();
                },
              }
            );
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
            <Divider label="Visibilidad de Clientes" labelPosition="center" />
            <MultiSelect
              data={clientOptions}
              label="Clientes asignados"
              description="Selecciona qué clientes podrá ver este miembro. Vacío = todos."
              placeholder="Todos los clientes"
              searchable
              clearable
              {...inviteForm.getInputProps("assigned_clients")}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeInviteModal} variant="default">
                Cancelar
              </Button>
              <Button leftSection={<IconMail size={14} />} type="submit" className="nv-button" loading={inviteMutation.isPending}>
                Enviar Invitación
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Edit Modal */}
      <BottomSheet
        centered
        onClose={closeEditModal}
        opened={editModalOpened}
        title={`Editar Permisos - ${selectedMember?.name}`}
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
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
              value={editRole}
              onChange={(v) => v && setEditRole(v)}
            />
            <Divider label="Permisos" labelPosition="center" />
            <Stack gap="xs">
              <Switch
                checked={editPermissions.clients ?? true}
                disabled={selectedMember.role === "owner"}
                label="Gestión de Clientes"
                onChange={(e) => setEditPermissions(p => ({ ...p, clients: e.currentTarget.checked }))}
              />
              <Switch
                checked={editPermissions.calendar ?? true}
                disabled={selectedMember.role === "owner"}
                label="Calendario"
                onChange={(e) => setEditPermissions(p => ({ ...p, calendar: e.currentTarget.checked }))}
              />
              <Switch
                checked={editPermissions.payments ?? false}
                disabled={selectedMember.role === "owner"}
                label="Pagos"
                onChange={(e) => setEditPermissions(p => ({ ...p, payments: e.currentTarget.checked }))}
              />
              <Switch
                checked={editPermissions.reports ?? false}
                disabled={selectedMember.role === "owner"}
                label="Reportes"
                onChange={(e) => setEditPermissions(p => ({ ...p, reports: e.currentTarget.checked }))}
              />
              <Switch
                checked={editPermissions.settings ?? false}
                disabled={selectedMember.role === "owner"}
                label="Configuración"
                onChange={(e) => setEditPermissions(p => ({ ...p, settings: e.currentTarget.checked }))}
              />
            </Stack>
            <Divider label="Visibilidad de Clientes" labelPosition="center" />
            <MultiSelect
              data={clientOptions}
              label="Clientes asignados"
              description="Selecciona qué clientes podrá ver este miembro. Vacío = todos."
              placeholder="Todos los clientes"
              searchable
              clearable
              value={editAssignedClients}
              onChange={setEditAssignedClients}
              disabled={selectedMember.role === "owner"}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeEditModal} variant="default">
                Cancelar
              </Button>
              <Button
                className="nv-button"
                loading={updatePermissionsMutation.isPending}
                onClick={() => {
                  updatePermissionsMutation.mutate(
                    { userId: selectedMember.id, role: editRole, permissions: editPermissions, assigned_clients: editAssignedClients },
                    { onSuccess: () => closeEditModal() }
                  );
                }}
              >
                Guardar Cambios
              </Button>
            </Group>
          </Stack>
        )}
      </BottomSheet>
    </Container>
  );
}
