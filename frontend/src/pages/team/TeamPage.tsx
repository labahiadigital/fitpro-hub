import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Menu,
  MultiSelect,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
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

interface PermissionDef {
  resource: string;
  label: string;
  description: string;
  actions: string[];
}

const PERMISSION_DEFS: PermissionDef[] = [
  { resource: "clients", label: "Clientes", description: "Gestión de clientes", actions: ["create", "read", "update", "delete"] },
  { resource: "workouts", label: "Entrenamientos", description: "Programas de entrenamiento", actions: ["create", "read", "update", "delete"] },
  { resource: "nutrition", label: "Nutrición", description: "Planes nutricionales", actions: ["create", "read", "update", "delete"] },
  { resource: "calendar", label: "Calendario", description: "Calendario y reservas", actions: ["create", "read", "update", "delete"] },
  { resource: "payments", label: "Pagos", description: "Pagos y suscripciones", actions: ["create", "read", "update", "delete"] },
  { resource: "team", label: "Equipo", description: "Gestión de equipo", actions: ["create", "read", "update", "delete"] },
  { resource: "settings", label: "Configuración", description: "Ajustes del workspace", actions: ["read", "update"] },
  { resource: "reports", label: "Reportes", description: "Estadísticas y reportes", actions: ["read"] },
  { resource: "chat", label: "Chat", description: "Chat y mensajería", actions: ["read", "send"] },
  { resource: "automations", label: "Automatizaciones", description: "Reglas automáticas", actions: ["create", "read", "update", "delete"] },
  { resource: "forms", label: "Formularios", description: "Formularios personalizados", actions: ["create", "read", "update", "delete"] },
  { resource: "documents", label: "Documentos", description: "Gestión documental", actions: ["create", "read", "update", "delete"] },
  { resource: "catalog", label: "Catálogo", description: "Productos y servicios", actions: ["create", "read", "update", "delete"] },
  { resource: "billing", label: "Facturación", description: "Facturación y contabilidad", actions: ["create", "read", "update", "delete"] },
  { resource: "community", label: "Comunidad", description: "Comunidad y retos", actions: ["create", "read", "update", "delete"] },
  { resource: "lms", label: "Academia", description: "Cursos y formación", actions: ["create", "read", "update", "delete"] },
  { resource: "live_classes", label: "Clases en Vivo", description: "Clases en directo", actions: ["create", "read", "update", "delete"] },
];

const ACTION_LABELS: Record<string, string> = {
  create: "Crear",
  read: "Ver",
  update: "Editar",
  delete: "Eliminar",
  send: "Enviar",
};

const DEFAULT_COLLABORATOR_PERMISSIONS: Record<string, string[]> = {
  clients: ["create", "read", "update"],
  workouts: ["create", "read", "update"],
  nutrition: ["create", "read", "update"],
  calendar: ["create", "read", "update", "delete"],
  payments: ["read"],
  team: ["read"],
  settings: ["read"],
  reports: ["read"],
  chat: ["read", "send"],
  automations: ["read"],
  forms: ["read"],
  documents: ["read"],
  catalog: ["read"],
  billing: [],
  community: ["read"],
  lms: ["read"],
  live_classes: ["read"],
};

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: "owner" | "collaborator";
  status: "active" | "pending";
  permissions: Record<string, string[]>;
  custom_permissions: Record<string, string[]>;
  assigned_clients: string[];
  stats: { clients: number; sessionsThisMonth: number; revenue: number };
}

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  collaborator: "Colaborador",
};

const roleColors: Record<string, string> = {
  owner: "violet",
  collaborator: "green",
};

function hasAnyAction(perms: Record<string, string[]>, resource: string): boolean {
  return (perms[resource]?.length ?? 0) > 0;
}

function PermissionsMatrix({
  permissions,
  onChange,
  disabled,
}: {
  permissions: Record<string, string[]>;
  onChange: (perms: Record<string, string[]>) => void;
  disabled?: boolean;
}) {
  const toggle = (resource: string, action: string) => {
    const current = permissions[resource] || [];
    const updated = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    onChange({ ...permissions, [resource]: updated });
  };

  const has = (resource: string, action: string) =>
    (permissions[resource] || []).includes(action);

  return (
    <Paper withBorder radius="md" style={{ overflow: "auto" }}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ minWidth: 160 }}>Recurso</Table.Th>
            {["create", "read", "update", "delete", "send"].map((a) => (
              <Table.Th key={a} ta="center" style={{ minWidth: 70 }}>
                {ACTION_LABELS[a]}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {PERMISSION_DEFS.map((pd) => (
            <Table.Tr key={pd.resource}>
              <Table.Td>
                <Text size="sm" fw={500}>{pd.label}</Text>
                <Text size="xs" c="dimmed">{pd.description}</Text>
              </Table.Td>
              {["create", "read", "update", "delete", "send"].map((action) => (
                <Table.Td key={action} ta="center">
                  {pd.actions.includes(action) ? (
                    <Checkbox
                      checked={has(pd.resource, action)}
                      onChange={() => toggle(pd.resource, action)}
                      disabled={disabled}
                      size="sm"
                    />
                  ) : (
                    <Text c="dimmed" size="xs">—</Text>
                  )}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

export function TeamPage() {
  const [inviteModalOpened, { open: openInviteModal, close: closeInviteModal }] = useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
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

  const teamMembers: TeamMember[] = teamMembersData.length > 0
    ? teamMembersData.map((m) => ({
        id: m.user_id || m.id,
        user_id: m.user_id || m.id,
        name: m.full_name || m.name || m.email,
        email: m.email,
        role: m.role === "owner" ? "owner" as const : "collaborator" as const,
        status: (m.is_active ? "active" : "pending") as "active" | "pending",
        permissions: m.permissions || DEFAULT_COLLABORATOR_PERMISSIONS,
        custom_permissions: m.custom_permissions || {},
        assigned_clients: m.assigned_clients || [],
        stats: { clients: 0, sessionsThisMonth: 0, revenue: 0 },
      }))
    : [{
        id: "current-user",
        user_id: user?.id || "current-user",
        name: user?.full_name || "Usuario",
        email: user?.email || "",
        role: "owner" as const,
        status: "active" as const,
        permissions: {} as Record<string, string[]>,
        custom_permissions: {},
        assigned_clients: [],
        stats: { clients: 0, sessionsThisMonth: 0, revenue: 0 },
      }];

  const inviteForm = useForm({
    initialValues: {
      email: "",
      role: "collaborator" as string,
      permissions: { ...DEFAULT_COLLABORATOR_PERMISSIONS },
      assigned_clients: [] as string[],
    },
  });

  const totalMembers = teamMembers.length;
  const activeMembers = teamMembers.filter((m) => m.status === "active").length;
  const totalRevenue = teamMembers.reduce((sum, m) => sum + m.stats.revenue, 0);

  const [editPermissions, setEditPermissions] = useState<Record<string, string[]>>({});
  const [editAssignedClients, setEditAssignedClients] = useState<string[]>([]);

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setEditPermissions({ ...member.permissions });
    setEditAssignedClients(member.assigned_clients || []);
    openEditModal();
  };

  const quickPermissionsSummary = (perms: Record<string, string[]>) => {
    const key_resources = ["clients", "calendar", "payments", "reports", "settings", "billing"];
    return key_resources.map((r) => ({
      resource: r,
      label: PERMISSION_DEFS.find((p) => p.resource === r)?.label || r,
      hasAccess: hasAnyAction(perms, r),
    }));
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

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="lg">
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Miembros del Equipo</Text>
              <Text className="text-display" style={{ fontSize: "2rem" }}>{totalMembers}</Text>
              <Text c="dimmed" mt="xs" size="xs">{activeMembers} activos, {totalMembers - activeMembers} pendientes</Text>
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
                {teamMembers.reduce((sum, m) => sum + m.stats.sessionsThisMonth, 0)}
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
              <Text className="text-display" style={{ fontSize: "2rem" }}>€{totalRevenue.toLocaleString()}</Text>
            </Box>
            <ThemeIcon size={48} radius="xl" variant="light" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
              <IconCurrencyEuro size={24} />
            </ThemeIcon>
          </Group>
        </Box>
      </SimpleGrid>

      <Stack gap="md">
        {teamMembers.map((member) => {
          const summary = quickPermissionsSummary(member.permissions);
          return (
            <Box key={member.id} className="nv-card" p="lg">
              <Group justify="space-between">
                <Group gap="md">
                  <Avatar color={roleColors[member.role]} radius="xl" size="lg">
                    {member.name.split(" ").map((n) => n[0]).join("")}
                  </Avatar>
                  <div>
                    <Group gap="xs">
                      <Text fw={600} style={{ fontFamily: "var(--font-heading)" }}>{member.name}</Text>
                      <Badge color={roleColors[member.role]} size="sm" variant="light">
                        {roleLabels[member.role]}
                      </Badge>
                      {member.status === "pending" && (
                        <Badge color="yellow" size="sm" variant="light">Pendiente</Badge>
                      )}
                      {member.assigned_clients.length > 0 && (
                        <Badge color="orange" size="sm" variant="light">
                          {member.assigned_clients.length} clientes asignados
                        </Badge>
                      )}
                    </Group>
                    <Text c="dimmed" size="sm">{member.email}</Text>
                  </div>
                </Group>

                <Group gap="xl">
                  <Group gap={4} visibleFrom="md">
                    {summary.map((s) => (
                      <Tooltip key={s.resource} label={s.hasAccess ? `Acceso a ${s.label}` : `Sin acceso a ${s.label}`}>
                        <ThemeIcon color={s.hasAccess ? "green" : "gray"} radius="xl" size="sm" variant="light">
                          {s.hasAccess ? <IconCheck size={12} /> : <IconX size={12} />}
                        </ThemeIcon>
                      </Tooltip>
                    ))}
                  </Group>

                  <Group gap="lg" visibleFrom="md">
                    <div style={{ textAlign: "center" }}>
                      <Text fw={700} size="lg">{member.stats.clients}</Text>
                      <Text c="dimmed" size="xs">Clientes</Text>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <Text fw={700} size="lg">{member.stats.sessionsThisMonth}</Text>
                      <Text c="dimmed" size="xs">Sesiones</Text>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <Text fw={700} size="lg">€{member.stats.revenue}</Text>
                      <Text c="dimmed" size="xs">Ingresos</Text>
                    </div>
                  </Group>

                  <Menu shadow="md" width={180}>
                    <Menu.Target>
                      <ActionIcon color="gray" variant="subtle">
                        <IconDotsVertical size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => handleEditMember(member)}>
                        Editar Permisos
                      </Menu.Item>
                      {member.status === "pending" && (
                        <Menu.Item leftSection={<IconMail size={14} />} onClick={() => resendMutation.mutate({ email: member.email, role: member.role })}>
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
                                removeMemberMutation.mutate(member.user_id);
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
          );
        })}
      </Stack>

      {/* Invite Modal */}
      <BottomSheet
        centered
        onClose={closeInviteModal}
        opened={inviteModalOpened}
        title="Invitar Miembro"
        size="xl"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        <form
          onSubmit={inviteForm.onSubmit((values) => {
            inviteMutation.mutate(
              {
                email: values.email,
                role: values.role,
                send_email: true,
                permissions: values.permissions,
                assigned_clients: values.assigned_clients,
              },
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
              required
              {...inviteForm.getInputProps("email")}
            />
            <Select
              data={[
                { value: "collaborator", label: "Colaborador (acceso estándar)" },
              ]}
              label="Rol base"
              description="Los permisos específicos se configuran abajo"
              {...inviteForm.getInputProps("role")}
            />
            <Divider label="Permisos detallados" labelPosition="center" />
            <PermissionsMatrix
              permissions={inviteForm.values.permissions}
              onChange={(p) => inviteForm.setFieldValue("permissions", p)}
            />
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
              <Button onClick={closeInviteModal} variant="default">Cancelar</Button>
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
        title={`Editar Permisos — ${selectedMember?.name}`}
        size="xl"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        {selectedMember && (
          <Stack>
            <Badge color={roleColors[selectedMember.role]} size="lg" variant="light">
              {roleLabels[selectedMember.role]}
            </Badge>
            {selectedMember.role === "owner" ? (
              <Paper p="md" radius="md" bg="var(--mantine-color-violet-light)">
                <Text size="sm" c="violet">
                  El propietario tiene acceso completo a todos los recursos. No se pueden modificar sus permisos.
                </Text>
              </Paper>
            ) : (
              <>
                <Divider label="Permisos detallados" labelPosition="center" />
                <PermissionsMatrix
                  permissions={editPermissions}
                  onChange={setEditPermissions}
                />
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
                />
              </>
            )}
            <Group justify="flex-end" mt="md">
              <Button onClick={closeEditModal} variant="default">Cancelar</Button>
              {selectedMember.role !== "owner" && (
                <Button
                  className="nv-button"
                  loading={updatePermissionsMutation.isPending}
                  onClick={() => {
                    updatePermissionsMutation.mutate(
                      {
                        userId: selectedMember.user_id,
                        permissions: editPermissions,
                        assigned_clients: editAssignedClients,
                      },
                      { onSuccess: () => closeEditModal() }
                    );
                  }}
                >
                  Guardar Cambios
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </BottomSheet>
    </Container>
  );
}
