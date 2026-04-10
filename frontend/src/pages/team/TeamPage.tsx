import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  ColorSwatch,
  Container,
  Divider,
  Group,
  Loader,
  Menu,
  MultiSelect,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
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
  IconPlus,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { BottomSheet } from "../../components/common/BottomSheet";
import {
  useTeamMembers,
  useInviteTeamMember,
  useUpdateMemberPermissions,
  useRemoveTeamMember,
  useResendInvitation,
} from "../../hooks/useTeam";
import {
  useTeamGroupsList,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAddGroupMembers,
  useRemoveGroupMember,
  useUpdateGroupPermissions,
  type TeamGroup,
} from "../../hooks/useTeamGroups";
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
  { resource: "tasks", label: "Tareas", description: "Gestión de tareas", actions: ["create", "read", "update", "delete"] },
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
  tasks: ["create", "read", "update"],
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

const GROUP_COLORS = [
  { value: "blue", label: "Azul" },
  { value: "green", label: "Verde" },
  { value: "red", label: "Rojo" },
  { value: "orange", label: "Naranja" },
  { value: "violet", label: "Violeta" },
  { value: "cyan", label: "Cian" },
  { value: "pink", label: "Rosa" },
  { value: "yellow", label: "Amarillo" },
  { value: "teal", label: "Turquesa" },
  { value: "grape", label: "Uva" },
];

export function TeamPage() {
  const [activeTab, setActiveTab] = useState<string>("members");
  const [inviteModalOpened, { open: openInviteModal, close: closeInviteModal }] = useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Group modals
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const [editGroupOpened, { open: openEditGroup, close: closeEditGroup }] = useDisclosure(false);
  const [groupPermsOpened, { open: openGroupPerms, close: closeGroupPerms }] = useDisclosure(false);
  const [groupMembersOpened, { open: openGroupMembers, close: closeGroupMembers }] = useDisclosure(false);
  const [selectedGroup, setSelectedGroup] = useState<TeamGroup | null>(null);

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

  // Groups
  const { data: groups = [], isLoading: loadingGroups } = useTeamGroupsList();
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const addMembersMutation = useAddGroupMembers();
  const removeGroupMemberMutation = useRemoveGroupMember();
  const updateGroupPermsMutation = useUpdateGroupPermissions();

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

  const memberById = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const m of teamMembers) map.set(m.user_id, m);
    return map;
  }, [teamMembers]);

  const memberGroupMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const g of groups) {
      for (const gm of g.members) {
        const existing = map.get(gm.user_id) || [];
        existing.push(g.name);
        map.set(gm.user_id, existing);
      }
    }
    return map;
  }, [groups]);

  const memberOptions = useMemo(
    () => teamMembers.map((m) => ({ value: m.user_id, label: m.name })),
    [teamMembers]
  );

  const inviteForm = useForm({
    initialValues: {
      email: "",
      role: "collaborator" as string,
      permissions: { ...DEFAULT_COLLABORATOR_PERMISSIONS },
      assigned_clients: [] as string[],
    },
  });

  const groupForm = useForm({
    initialValues: { name: "", description: "", color: "blue" },
    validate: { name: (v) => (v.trim() ? null : "El nombre es obligatorio") },
  });

  const editGroupForm = useForm({
    initialValues: { name: "", description: "", color: "blue" },
    validate: { name: (v) => (v.trim() ? null : "El nombre es obligatorio") },
  });

  const [groupPermissions, setGroupPermissions] = useState<Record<string, string[]>>({});
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

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
        action={activeTab === "members" ? {
          label: "Invitar Miembro",
          icon: <IconUserPlus size={16} />,
          onClick: openInviteModal,
        } : {
          label: "Nuevo Grupo",
          icon: <IconPlus size={16} />,
          onClick: openGroupModal,
        }}
        description="Gestiona los miembros de tu equipo, grupos y permisos"
        title="Equipo"
      />

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || "members")} mb="xl">
        <Tabs.List mb="lg">
          <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>
            Miembros
          </Tabs.Tab>
          <Tabs.Tab value="groups" leftSection={<IconUsersGroup size={16} />}>
            Grupos
          </Tabs.Tab>
        </Tabs.List>

        {/* ===== MEMBERS TAB ===== */}
        <Tabs.Panel value="members">
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
              const memberGroups = memberGroupMap.get(member.user_id) || [];
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
                          {memberGroups.map((gn) => (
                            <Badge key={gn} size="sm" variant="outline" color="cyan">{gn}</Badge>
                          ))}
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
        </Tabs.Panel>

        {/* ===== GROUPS TAB ===== */}
        <Tabs.Panel value="groups">
          {loadingGroups ? (
            <Box ta="center" py="xl"><Loader /></Box>
          ) : groups.length === 0 ? (
            <Box ta="center" py="xl">
              <IconUsersGroup size={48} style={{ opacity: 0.3 }} />
              <Text c="dimmed" mt="md">No hay grupos creados todavía</Text>
              <Button mt="md" className="nv-button" leftSection={<IconPlus size={14} />} onClick={openGroupModal}>
                Crear Primer Grupo
              </Button>
            </Box>
          ) : (
            <Stack gap="md">
              {groups.map((group) => {
                const groupMembers = group.members
                  .map((gm) => memberById.get(gm.user_id))
                  .filter(Boolean) as TeamMember[];

                return (
                  <Box key={group.id} className="nv-card" p="lg">
                    <Group justify="space-between" mb="sm">
                      <Group gap="sm">
                        <ColorSwatch color={`var(--mantine-color-${group.color || "blue"}-6)`} size={20} />
                        <Text fw={600} size="lg" style={{ fontFamily: "var(--font-heading)" }}>{group.name}</Text>
                        <Badge variant="light" color="gray" size="sm">{group.members.length} miembros</Badge>
                      </Group>
                      <Group gap="xs">
                        <Tooltip label="Gestionar miembros">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => {
                              setSelectedGroup(group);
                              setSelectedMemberIds(group.members.map((m) => m.user_id));
                              openGroupMembers();
                            }}
                          >
                            <IconUsers size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Permisos del grupo">
                          <ActionIcon
                            variant="subtle"
                            color="violet"
                            onClick={() => {
                              setSelectedGroup(group);
                              setGroupPermissions({ ...group.permissions });
                              openGroupPerms();
                            }}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Menu shadow="md" width={160}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <IconDotsVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconEdit size={14} />}
                              onClick={() => {
                                setSelectedGroup(group);
                                editGroupForm.setValues({
                                  name: group.name,
                                  description: group.description || "",
                                  color: group.color || "blue",
                                });
                                openEditGroup();
                              }}
                            >
                              Editar
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={() => deleteGroupMutation.mutate(group.id)}
                            >
                              Eliminar
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Group>

                    {group.description && (
                      <Text size="sm" c="dimmed" mb="sm">{group.description}</Text>
                    )}

                    {groupMembers.length > 0 ? (
                      <Group gap="xs">
                        {groupMembers.map((m) => (
                          <Tooltip key={m.user_id} label={m.name}>
                            <Avatar size="sm" radius="xl" color={roleColors[m.role]}>
                              {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Group>
                    ) : (
                      <Text size="xs" c="dimmed">Sin miembros asignados</Text>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

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

      {/* Edit Member Permissions Modal */}
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

      {/* Create Group Modal */}
      <BottomSheet
        centered
        onClose={closeGroupModal}
        opened={groupModalOpened}
        title="Nuevo Grupo"
        size="md"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        <form
          onSubmit={groupForm.onSubmit((values) => {
            createGroupMutation.mutate(values, {
              onSuccess: () => {
                closeGroupModal();
                groupForm.reset();
              },
            });
          })}
        >
          <Stack>
            <TextInput label="Nombre" placeholder="Ej: Equipo de Nutrición" required {...groupForm.getInputProps("name")} />
            <Textarea label="Descripción" placeholder="Descripción del grupo (opcional)" autosize minRows={2} {...groupForm.getInputProps("description")} />
            <Select label="Color" data={GROUP_COLORS} {...groupForm.getInputProps("color")} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeGroupModal}>Cancelar</Button>
              <Button type="submit" className="nv-button" loading={createGroupMutation.isPending}>Crear Grupo</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Edit Group Modal */}
      <BottomSheet
        centered
        onClose={closeEditGroup}
        opened={editGroupOpened}
        title={`Editar Grupo — ${selectedGroup?.name}`}
        size="md"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        <form
          onSubmit={editGroupForm.onSubmit((values) => {
            if (!selectedGroup) return;
            updateGroupMutation.mutate({ id: selectedGroup.id, ...values }, {
              onSuccess: () => {
                closeEditGroup();
                setSelectedGroup(null);
              },
            });
          })}
        >
          <Stack>
            <TextInput label="Nombre" required {...editGroupForm.getInputProps("name")} />
            <Textarea label="Descripción" autosize minRows={2} {...editGroupForm.getInputProps("description")} />
            <Select label="Color" data={GROUP_COLORS} {...editGroupForm.getInputProps("color")} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeEditGroup}>Cancelar</Button>
              <Button type="submit" className="nv-button" loading={updateGroupMutation.isPending}>Guardar</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Group Members Modal */}
      <BottomSheet
        centered
        onClose={closeGroupMembers}
        opened={groupMembersOpened}
        title={`Miembros — ${selectedGroup?.name}`}
        size="md"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        <Stack>
          <MultiSelect
            label="Miembros del grupo"
            description="Selecciona los miembros que formarán parte de este grupo"
            data={memberOptions}
            value={selectedMemberIds}
            onChange={setSelectedMemberIds}
            searchable
            clearable
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeGroupMembers}>Cancelar</Button>
            <Button
              className="nv-button"
              loading={addMembersMutation.isPending}
              onClick={() => {
                if (!selectedGroup) return;
                const currentIds = new Set(selectedGroup.members.map((m) => m.user_id));
                const newIds = selectedMemberIds.filter((id) => !currentIds.has(id));
                const removedIds = [...currentIds].filter((id) => !selectedMemberIds.includes(id));

                const promises: Promise<unknown>[] = [];
                if (newIds.length > 0) {
                  promises.push(addMembersMutation.mutateAsync({ groupId: selectedGroup.id, userIds: newIds }));
                }
                for (const uid of removedIds) {
                  promises.push(removeGroupMemberMutation.mutateAsync({ groupId: selectedGroup.id, userId: uid }));
                }
                Promise.all(promises).then(() => {
                  closeGroupMembers();
                  setSelectedGroup(null);
                });
              }}
            >
              Guardar Miembros
            </Button>
          </Group>
        </Stack>
      </BottomSheet>

      {/* Group Permissions Modal */}
      <BottomSheet
        centered
        onClose={closeGroupPerms}
        opened={groupPermsOpened}
        title={`Permisos — ${selectedGroup?.name}`}
        size="xl"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Los permisos del grupo se aplican a todos sus miembros de forma adicional a sus permisos individuales.
          </Text>
          <PermissionsMatrix
            permissions={groupPermissions}
            onChange={setGroupPermissions}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeGroupPerms}>Cancelar</Button>
            <Button
              className="nv-button"
              loading={updateGroupPermsMutation.isPending}
              onClick={() => {
                if (!selectedGroup) return;
                updateGroupPermsMutation.mutate(
                  { groupId: selectedGroup.id, permissions: groupPermissions },
                  {
                    onSuccess: () => {
                      closeGroupPerms();
                      setSelectedGroup(null);
                    },
                  }
                );
              }}
            >
              Guardar Permisos
            </Button>
          </Group>
        </Stack>
      </BottomSheet>
    </Container>
  );
}
