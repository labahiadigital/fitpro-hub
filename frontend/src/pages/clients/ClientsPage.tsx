import {
  Box,
  Button,
  ColorInput,
  Container,
  Group,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Badge,
  Avatar,
  ActionIcon,
  Menu,
  Table,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { 
  IconTag, 
  IconUsers, 
  IconUserPlus,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconMail,
  IconPhone,
  IconCalendar,
  IconSend,
  IconCheck,
  IconUserCheck,
  IconTrashX,
  IconRestore,
} from "@tabler/icons-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClientCell,
  DataTable,
  StatusBadge,
  TagsList,
} from "../../components/common/DataTable";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import {
  useClients,
  useClientTags,
  useCreateClient,
  useCreateClientTag,
  useDeleteClient,
  usePermanentDeleteClient,
  useRestoreClient,
  useUpdateClient,
} from "../../hooks/useClients";
import { useCreateInvitation, useInvitations, useResendInvitation, useCancelInvitation } from "../../hooks/useInvitations";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "../../services/api";
import { useAuthStore } from "../../stores/auth";
import { BottomSheet } from "../../components/common/BottomSheet";
import { formatDecimal } from "../../utils/format";

function getClientStatus(client: { is_active: boolean; has_user_account?: boolean }): string {
  if (!client.is_active) return "inactive";
  if (!client.has_user_account) return "pending";
  return "active";
}

// Componente de tarjeta de cliente para vista de grid
function ClientCard({ client, onView }: { client: any; onView: () => void }) {
  return (
    <Box 
      className="nv-card" 
      p="lg"
      style={{ cursor: "pointer" }}
      onClick={onView}
    >
      <Group justify="space-between" mb="md">
        <Group gap="md">
          <Avatar 
            size={50} 
            radius="xl" 
            src={client.avatar_url}
            styles={{
              root: {
                border: "3px solid var(--nv-surface-subtle)",
                boxShadow: "var(--shadow-sm)"
              }
            }}
          >
            {client.first_name?.[0]}{client.last_name?.[0]}
          </Avatar>
          <Box>
            <Text fw={700} size="md" style={{ color: "var(--nv-dark)" }}>
              {client.first_name} {client.last_name}
            </Text>
            <Group gap="xs">
              <IconMail size={12} color="var(--nv-slate-light)" />
              <Text size="xs" c="dimmed">{client.email}</Text>
            </Group>
          </Box>
        </Group>
        <Menu position="bottom-end" withArrow shadow="lg">
          <Menu.Target>
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              radius="xl"
              onClick={(e) => e.stopPropagation()}
            >
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEye size={14} />} onClick={onView}>
              Ver perfil
            </Menu.Item>
            <Menu.Item leftSection={<IconEdit size={14} />}>
              Editar
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item leftSection={<IconTrash size={14} />} color="red">
              Eliminar
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Group gap="xs" mb="md">
        {client.tags?.slice(0, 2).map((tag: any, i: number) => (
          <Badge 
            key={i} 
            size="sm" 
            variant="light"
            radius="xl"
            styles={{
              root: {
                backgroundColor: `${tag.color}15`,
                color: tag.color,
                border: `1px solid ${tag.color}30`,
              }
            }}
          >
            {tag.name}
          </Badge>
        ))}
        {client.tags?.length > 2 && (
          <Badge size="sm" variant="light" radius="xl" color="gray">
            +{client.tags.length - 2}
          </Badge>
        )}
      </Group>

      <Group justify="space-between" pt="sm" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <Group gap="xs">
          <IconPhone size={14} color="var(--nv-slate-light)" />
          <Text size="xs" c="dimmed">{client.phone || "Sin teléfono"}</Text>
        </Group>
        <StatusBadge status={getClientStatus(client)} />
      </Group>
    </Box>
  );
}

// KPI Card - Compact
function KPICard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <Box className="nv-card-compact" p="sm" style={{ minHeight: "auto" }}>
      <Text className="stat-label" mb={2} style={{ fontSize: "10px" }}>{title}</Text>
      <Text 
        fw={800} 
        style={{ fontSize: "1.25rem", color, lineHeight: 1.1, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {value}
      </Text>
      {subtitle && (
        <Text size="xs" c="dimmed" mt={2} style={{ fontSize: "11px" }}>{subtitle}</Text>
      )}
    </Box>
  );
}

export function ClientsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewMode] = useState<"table" | "grid">("table");
  const [activeTab, setActiveTab] = useState<string | null>("all");
  const [
    clientModalOpened,
    { open: openClientModal, close: closeClientModal },
  ] = useDisclosure(false);
  const [tagModalOpened, { open: openTagModal, close: closeTagModal }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const statusFilter = activeTab === "active" ? "active" : activeTab === "inactive" ? "inactive" : activeTab === "pending" ? "pending" : activeTab === "deleted" ? "deleted" : undefined;
  const { data: clientsData, isLoading, isError, refetch } = useClients({ page, search, status: statusFilter });
  useClientTags();
  const createClient = useCreateClient();
  const createTag = useCreateClientTag();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const permanentDeleteClient = usePermanentDeleteClient();
  const restoreClient = useRestoreClient();
  const createInvitation = useCreateInvitation();
  const { data: invitations } = useInvitations();
  const resendInvitation = useResendInvitation();
  const cancelInvitation = useCancelInvitation();

  // Estado para el modal de edición
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  // Estado para invitación
  const [inviteModalOpened, { open: openInviteModal, close: closeInviteModal }] = useDisclosure(false);
  const [lastInvitationUrl, setLastInvitationUrl] = useState<string | null>(null);

  // Estado para confirmación de borrado permanente
  const [deleteConfirmOpened, { open: openDeleteConfirm, close: closeDeleteConfirm }] = useDisclosure(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  
  // Products for invite selector (cached & deduped via React Query so it
  // doesn't re-fetch on every StrictMode remount / route re-entry).
  const { currentWorkspace } = useAuthStore();
  const { data: productOptions = [] } = useQuery({
    queryKey: ["products-invite-options", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const res = await productsApi.list(currentWorkspace.id);
      return (res.data?.items || res.data || [])
        .filter((p: any) => p.is_active)
        .map((p: any) => ({
          value: p.id,
          label: `${p.name} - ${formatDecimal(Number(p.price), 2)}€/${p.interval || "mes"}`,
        })) as { value: string; label: string }[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000,
  });

  const clientForm = useForm({
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      goals: "",
    },
    validate: {
      first_name: (value) => (value.length < 2 ? "Nombre requerido" : null),
      last_name: (value) => (value.length < 2 ? "Apellido requerido" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
    },
  });

  const inviteForm = useForm({
    initialValues: {
      email: "",
      first_name: "",
      last_name: "",
      message: "",
      product_id: "" as string,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
    },
  });

  const tagForm = useForm({
    initialValues: {
      name: "",
      color: "#5C80BC",
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const editForm = useForm({
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      goals: "",
    },
    validate: {
      first_name: (value) => (value.length < 2 ? "Nombre requerido" : null),
      last_name: (value) => (value.length < 2 ? "Apellido requerido" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
    },
  });

  const handleCreateClient = async (values: typeof clientForm.values) => {
    try {
      await createClient.mutateAsync(values);
      closeClientModal();
      clientForm.reset();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCreateTag = async (values: typeof tagForm.values) => {
    try {
      await createTag.mutateAsync(values);
      closeTagModal();
      tagForm.reset();
    } catch {
      // Error handled by mutation
    }
  };

  const handleInviteClient = async (values: typeof inviteForm.values) => {
    try {
      await createInvitation.mutateAsync({
        email: values.email,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        message: values.message || undefined,
        product_id: values.product_id || undefined,
      });
      setLastInvitationUrl("sent");
      inviteForm.reset();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCloseInviteModal = () => {
    closeInviteModal();
    setLastInvitationUrl(null);
    inviteForm.reset();
  };

  // @ts-expect-error — kept for future use when re-enabling invite actions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleResendInvitation = async (client: any) => {
    const existingInvitation = invitations?.find(
      (inv: any) => inv.email === client.email && (inv.status === "pending" || inv.status === "expired")
    );

    if (existingInvitation) {
      try {
        await resendInvitation.mutateAsync(existingInvitation.id);
        notifications.show({
          title: "Invitación reenviada",
          message: `Se ha reenviado la invitación a ${client.email}`,
          color: "green",
        });
      } catch {
        notifications.show({
          title: "Error",
          message: "No se pudo reenviar la invitación",
          color: "red",
        });
      }
    } else {
      inviteForm.setValues({
        email: client.email,
        first_name: client.first_name || "",
        last_name: client.last_name || "",
        message: "",
        product_id: "",
      });
      openInviteModal();
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    editForm.setValues({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      email: client.email || "",
      phone: client.phone || "",
      goals: client.goals || "",
    });
    openEditModal();
  };

  const handleUpdateClient = async (values: typeof editForm.values) => {
    if (!editingClient) return;
    
    // Para clientes demo, solo mostramos mensaje y cerramos
    if (editingClient.id.startsWith("demo-client-")) {
      notifications.show({
        title: "Modo Demo",
        message: "En modo demo, los cambios no se guardan permanentemente",
        color: "yellow",
      });
      closeEditModal();
      editForm.reset();
      setEditingClient(null);
      return;
    }
    
    try {
      await updateClient.mutateAsync({
        id: editingClient.id,
        data: values,
      });
      closeEditModal();
      editForm.reset();
      setEditingClient(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleReactivate = async (client: any) => {
    try {
      await updateClient.mutateAsync({ id: client.id, data: { is_active: true } });
      notifications.show({
        title: "Cliente reactivado",
        message: `${client.first_name} ${client.last_name} ha sido reactivado`,
        color: "green",
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleSoftDelete = async (client: any) => {
    if (client.id.startsWith("demo-client-")) return;
    try {
      await deleteClient.mutateAsync(client.id);
      notifications.show({
        title: "Cliente desasignado",
        message: `${client.first_name} ${client.last_name} ha sido desactivado`,
        color: "yellow",
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handlePermanentDelete = async (client: any) => {
    if (!client || client.id.startsWith("demo-client-")) return;
    try {
      await permanentDeleteClient.mutateAsync(client.id);
      notifications.show({
        title: "Cliente eliminado",
        message: `${client.first_name} ${client.last_name} ha sido eliminado permanentemente`,
        color: "red",
      });
      closeDeleteConfirm();
      setClientToDelete(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRestore = async (client: any) => {
    if (!client || client.id.startsWith("demo-client-")) return;
    try {
      await restoreClient.mutateAsync(client.id);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = (client: any) => {
    if (client.is_active) {
      handleSoftDelete(client);
    } else {
      setClientToDelete(client);
      openDeleteConfirm();
    }
  };

  const columns = [
    {
      key: "name",
      title: "Cliente",
      render: (client: {
        first_name: string;
        last_name: string;
        email: string;
        avatar_url?: string;
      }) => (
        <ClientCell
          avatarUrl={client.avatar_url}
          email={client.email}
          name={`${client.first_name} ${client.last_name}`}
        />
      ),
    },
    {
      key: "phone",
      title: "Teléfono",
      render: (client: { phone?: string }) => (
        <Text size="sm" fw={500} style={{ color: client.phone ? "var(--nv-dark)" : "var(--nv-slate-light)" }}>
          {client.phone || "—"}
        </Text>
      ),
    },
    {
      key: "tags",
      title: "Etiquetas",
      render: (client: { tags?: Array<{ name: string; color: string }> }) =>
        client.tags && client.tags.length > 0 ? (
          <TagsList tags={client.tags} />
        ) : (
          <Text c="dimmed" size="sm">—</Text>
        ),
    },
    {
      key: "is_active",
      title: "Estado",
      render: (client: { is_active: boolean; has_user_account?: boolean }) => (
        <StatusBadge status={getClientStatus(client)} />
      ),
    },
    {
      key: "actions_custom",
      title: "",
      render: (client: any) =>
        client.deleted_at ? (
          <Button
            size="xs"
            variant="light"
            color="green"
            radius="xl"
            leftSection={<IconRestore size={14} />}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleRestore(client);
            }}
            styles={{ root: { fontSize: "11px" } }}
          >
            Restaurar
          </Button>
        ) : !client.is_active ? (
          <Group gap={4} wrap="nowrap">
            <Button
              size="xs"
              variant="light"
              color="green"
              radius="xl"
              leftSection={<IconUserCheck size={14} />}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleReactivate(client);
              }}
              styles={{ root: { fontSize: "11px" } }}
            >
              Reactivar
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              radius="xl"
              leftSection={<IconTrash size={14} />}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setClientToDelete(client);
                openDeleteConfirm();
              }}
              styles={{ root: { fontSize: "11px" } }}
            >
              Borrar
            </Button>
          </Group>
        ) : (
          <Button
            size="xs"
            variant="light"
            color="orange"
            radius="xl"
            leftSection={<IconTrash size={14} />}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleSoftDelete(client);
            }}
            styles={{ root: { fontSize: "11px" } }}
          >
            Desasignar
          </Button>
        ),
    },
    {
      key: "created_at",
      title: "Registro",
      render: (client: { created_at: string }) => (
        <Group gap="xs">
          <IconCalendar size={14} color="var(--nv-slate-light)" />
          <Text size="sm" style={{ color: "var(--nv-slate)" }}>
            {new Date(client.created_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}
          </Text>
        </Group>
      ),
    },
  ];

  const stats = useMemo(() => {
    const backendStats = (clientsData as any)?.stats;
    if (backendStats) {
      return {
        total: backendStats.total,
        active: backendStats.active,
        pending: backendStats.pending,
        inactive: backendStats.inactive,
        deleted: backendStats.deleted || 0,
        newThisMonth: backendStats.new_this_month,
      };
    }
    return { total: 0, active: 0, pending: 0, inactive: 0, deleted: 0, newThisMonth: 0 };
  }, [clientsData]);

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Invitar Cliente",
          icon: <IconSend size={16} />,
          onClick: openInviteModal,
        }}
        description="Gestiona tu cartera de clientes y su información"
        secondaryAction={{
          label: "Crear Manual",
          icon: <IconUserPlus size={14} />,
          onClick: openClientModal,
          variant: "default",
        }}
        title="Clientes"
      />

      {/* KPIs */}
      <SimpleGrid cols={{ base: 2, sm: 5, xl: 6 }} mb="lg" spacing="sm" className="stagger">
        <KPICard 
          title="Total Clientes" 
          value={stats.total} 
          subtitle="En tu cartera"
          color="var(--nv-dark)"
        />
        <KPICard 
          title="Activos" 
          value={stats.active} 
          subtitle="Con plan activo"
          color="var(--nv-success)"
        />
        <KPICard 
          title="Pendientes" 
          value={stats.pending} 
          subtitle="Sin cuenta creada"
          color="var(--nv-primary)"
        />
        <KPICard 
          title="Inactivos" 
          value={stats.inactive} 
          subtitle="Sin actividad"
          color="var(--nv-slate)"
        />
        <KPICard 
          title="Nuevos" 
          value={stats.newThisMonth} 
          subtitle="Este mes"
          color="var(--nv-primary)"
        />
      </SimpleGrid>

      {/* Tabs y Filtros */}
      <Box mb="md">
        {isMobile ? (
          <Select
            value={activeTab}
            onChange={(value) => {
              if (value === "tags") { openTagModal(); return; }
              setActiveTab(value);
              setPage(1);
            }}
            data={[
              { value: "all", label: `Todos (${stats.total})` },
              { value: "active", label: `Activos (${stats.active})` },
              { value: "pending", label: `Pendientes (${stats.pending})` },
              { value: "inactive", label: `Inactivos (${stats.inactive})` },
              ...(stats.deleted > 0 ? [{ value: "deleted", label: `Eliminados (${stats.deleted})` }] : []),
              { value: "tags", label: "Etiquetas" },
            ]}
            size="sm"
            radius="md"
          />
        ) : (
          <Tabs value={activeTab} onChange={(value) => { setActiveTab(value); setPage(1); }}>
            <Tabs.List style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <Tabs.Tab
                leftSection={<IconUsers size={14} />}
                value="all"
                style={{ fontWeight: 600, fontSize: "13px" }}
              >
                Todos ({stats.total})
              </Tabs.Tab>
              <Tabs.Tab value="active" style={{ fontWeight: 600, fontSize: "13px" }}>
                Activos ({stats.active})
              </Tabs.Tab>
              <Tabs.Tab value="pending" style={{ fontWeight: 600, fontSize: "13px" }}>
                Pendientes ({stats.pending})
              </Tabs.Tab>
              <Tabs.Tab value="inactive" style={{ fontWeight: 600, fontSize: "13px" }}>
                Inactivos ({stats.inactive})
              </Tabs.Tab>
              {stats.deleted > 0 && (
                <Tabs.Tab
                  leftSection={<IconTrashX size={14} />}
                  value="deleted"
                  style={{ fontWeight: 600, fontSize: "13px" }}
                  color="red"
                >
                  Eliminados ({stats.deleted})
                </Tabs.Tab>
              )}
              <Tabs.Tab
                leftSection={<IconTag size={14} />}
                value="tags"
                onClick={openTagModal}
                style={{ fontWeight: 600, fontSize: "13px" }}
              >
                Etiquetas
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        )}
      </Box>

      {/* Contenido */}
      {clientsData?.items && clientsData.items.length > 0 ? (
        viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={clientsData.items}
            loading={isLoading}
            onDelete={handleDelete}
            onEdit={(client) => handleEditClient(client)}
            onSearch={setSearch}
            onView={(client: { id: string }) => navigate(`/clients/${client.id}`)}
            onRowClick={(client: { id: string }) => navigate(`/clients/${client.id}`)}
            pagination={{
              page,
              pageSize: 10,
              total: clientsData.total,
              onChange: setPage,
            }}
            searchable
            searchPlaceholder="Buscar por nombre, email o teléfono..."
          />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
            {clientsData.items.map((client: any) => (
              <ClientCard 
                key={client.id} 
                client={client} 
                onView={() => navigate(`/clients/${client.id}`)}
              />
            ))}
          </SimpleGrid>
        )
      ) : isError ? (
        <EmptyState
          icon={<IconUsers size={48} />}
          title="Error al cargar clientes"
          description="No se pudieron obtener los clientes. Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={() => refetch()}
        />
      ) : isLoading ? null : (
        <EmptyState
          actionLabel={activeTab === "all" ? "Añadir Cliente" : undefined}
          description={
            activeTab === "active" ? "No hay clientes activos con cuenta creada. Los clientes pendientes de registro aparecen en la pestaña \"Pendientes\"."
            : activeTab === "pending" ? "No hay clientes pendientes de registro."
            : activeTab === "inactive" ? "No hay clientes inactivos."
            : "Empieza añadiendo tu primer cliente para gestionar sus entrenamientos, nutrición y progreso."
          }
          icon={<IconUsers size={48} />}
          onAction={activeTab === "all" ? openClientModal : undefined}
          title={
            activeTab === "active" ? "No hay clientes activos"
            : activeTab === "pending" ? "No hay clientes pendientes"
            : activeTab === "inactive" ? "No hay clientes inactivos"
            : "No hay clientes"
          }
        />
      )}

      {/* Invitaciones pendientes - se muestran en Pendientes, Inactivos y Todos */}
      {(activeTab === "pending" || activeTab === "inactive" || activeTab === "all") && (() => {
        const pendingInvitations = (invitations || []).filter(
          (inv: any) => inv.status === "pending" || inv.status === "expired"
        );
        if (pendingInvitations.length === 0) return null;
        return (
          <Box mt="lg">
            <Group gap="xs" mb="sm">
              <IconMail size={16} color="var(--nv-slate)" />
              <Text fw={600} size="sm" style={{ color: "var(--nv-slate)" }}>
                Invitaciones pendientes ({pendingInvitations.length})
              </Text>
            </Group>
            <Box
              className="nv-card"
              style={{
                border: "1px solid var(--border-subtle)",
              }}
            >
              <ScrollArea type="auto">
              <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 520 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th><Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: "0.08em", color: "var(--nv-slate)" }}>Email</Text></Table.Th>
                    <Table.Th><Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: "0.08em", color: "var(--nv-slate)" }}>Nombre</Text></Table.Th>
                    <Table.Th><Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: "0.08em", color: "var(--nv-slate)" }}>Estado</Text></Table.Th>
                    <Table.Th><Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: "0.08em", color: "var(--nv-slate)" }}>Expira</Text></Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pendingInvitations.map((inv: any) => (
                    <Table.Tr key={inv.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{inv.email}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{inv.first_name || ""} {inv.last_name || ""}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          variant="light"
                          color={inv.status === "pending" ? "yellow" : "red"}
                          radius="md"
                        >
                          {inv.status === "pending" ? "Pendiente" : "Expirada"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {new Date(inv.expires_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            radius="xl"
                            leftSection={<IconSend size={14} />}
                            onClick={() => resendInvitation.mutateAsync(inv.id)}
                            loading={resendInvitation.isPending}
                            styles={{ root: { fontSize: "11px" } }}
                          >
                            Reenviar
                          </Button>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => cancelInvitation.mutateAsync(inv.id)}
                            loading={cancelInvitation.isPending}
                            title="Eliminar invitación"
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              </ScrollArea>
            </Box>
          </Box>
        );
      })()}

      {/* Modal para crear cliente */}
      <BottomSheet
        onClose={closeClientModal}
        opened={clientModalOpened}
        size="lg"
        title="Nuevo Cliente"
        radius="lg"
      >
        <form onSubmit={clientForm.onSubmit(handleCreateClient)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Nombre"
                placeholder="Juan"
                required
                radius="md"
                {...clientForm.getInputProps("first_name")}
              />
              <TextInput
                label="Apellido"
                placeholder="García"
                required
                radius="md"
                {...clientForm.getInputProps("last_name")}
              />
            </Group>
            <TextInput
              label="Email"
              placeholder="juan@email.com"
              required
              radius="md"
              {...clientForm.getInputProps("email")}
            />
            <TextInput
              label="Teléfono"
              placeholder="+34 600 000 000"
              radius="md"
              {...clientForm.getInputProps("phone")}
            />
            <Textarea
              label="Objetivos"
              minRows={3}
              placeholder="Describe los objetivos del cliente..."
              radius="md"
              {...clientForm.getInputProps("goals")}
            />
            <Group justify="flex-end" mt="md">
              <Button 
                onClick={closeClientModal} 
                variant="default"
                radius="xl"
              >
                Cancelar
              </Button>
              <Button 
                loading={createClient.isPending} 
                type="submit"
                radius="xl"
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": {
                      background: "var(--nv-accent-hover)"
                    }
                  }
                }}
              >
                Crear Cliente
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Modal para crear etiqueta */}
      <BottomSheet
        onClose={closeTagModal}
        opened={tagModalOpened}
        size="sm"
        title="Nueva Etiqueta"
        radius="lg"
      >
        <form onSubmit={tagForm.onSubmit(handleCreateTag)}>
          <Stack gap="md">
            <TextInput
              label="Nombre"
              placeholder="VIP, Premium, Nuevo..."
              required
              radius="md"
              {...tagForm.getInputProps("name")}
            />
            <ColorInput
              format="hex"
              label="Color"
              radius="md"
              swatches={[
                "#5C80BC",
                "#10B981",
                "#F59E0B",
                "#EF4444",
                "#8B5CF6",
                "#EC4899",
                "#06B6D4",
                "#84CC16",
              ]}
              {...tagForm.getInputProps("color")}
            />
            <Group justify="flex-end" mt="md">
              <Button 
                onClick={closeTagModal} 
                variant="default"
                radius="xl"
              >
                Cancelar
              </Button>
              <Button 
                loading={createTag.isPending} 
                type="submit"
                radius="xl"
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": {
                      background: "var(--nv-accent-hover)"
                    }
                  }
                }}
              >
                Crear Etiqueta
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Modal para editar cliente */}
      <BottomSheet
        onClose={closeEditModal}
        opened={editModalOpened}
        size="lg"
        title={`Editar Cliente: ${editingClient?.first_name || ''} ${editingClient?.last_name || ''}`}
        radius="lg"
      >
        <form onSubmit={editForm.onSubmit(handleUpdateClient)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Nombre"
                placeholder="Juan"
                required
                radius="md"
                {...editForm.getInputProps("first_name")}
              />
              <TextInput
                label="Apellido"
                placeholder="García"
                required
                radius="md"
                {...editForm.getInputProps("last_name")}
              />
            </Group>
            <TextInput
              label="Email"
              placeholder="juan@email.com"
              required
              radius="md"
              {...editForm.getInputProps("email")}
            />
            <TextInput
              label="Teléfono"
              placeholder="+34 600 000 000"
              radius="md"
              {...editForm.getInputProps("phone")}
            />
            <Textarea
              label="Objetivos"
              minRows={3}
              placeholder="Describe los objetivos del cliente..."
              radius="md"
              {...editForm.getInputProps("goals")}
            />
            <Group justify="flex-end" mt="md">
              <Button 
                onClick={closeEditModal} 
                variant="default"
                radius="xl"
              >
                Cancelar
              </Button>
              <Button 
                loading={updateClient.isPending} 
                type="submit"
                radius="xl"
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": {
                      background: "var(--nv-accent-hover)"
                    }
                  }
                }}
              >
                Guardar Cambios
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Modal para invitar cliente */}
      <BottomSheet
        onClose={handleCloseInviteModal}
        opened={inviteModalOpened}
        size="md"
        title="Invitar Cliente"
        radius="lg"
      >
        {lastInvitationUrl ? (
          <Stack gap="md">
            <Box 
              p="lg" 
              style={{ 
                background: "#10B98115", 
                borderRadius: "12px",
                border: "1px solid #10B981"
              }}
            >
              <Group gap="sm" mb="sm">
                <IconCheck size={20} color="#10B981" />
                <Text fw={600} style={{ color: "#10B981" }}>
                  ¡Invitación enviada!
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                Se ha enviado un email con el enlace de registro al cliente. 
                El enlace es válido por 7 días.
              </Text>
            </Box>
            
            <Text size="sm" c="dimmed">
              El cliente recibirá un correo con un enlace para completar su registro 
              e introducir toda su información personal, objetivos y datos de salud.
            </Text>

            <Button 
              onClick={handleCloseInviteModal}
              fullWidth
              radius="xl"
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                }
              }}
            >
              Cerrar
            </Button>
          </Stack>
        ) : (
          <form onSubmit={inviteForm.onSubmit(handleInviteClient)}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Envía una invitación por email para que el cliente complete su registro 
                con toda la información que necesitas (datos personales, objetivos, salud, etc.)
              </Text>
              
              <TextInput
                label="Email del cliente"
                placeholder="cliente@email.com"
                required
                radius="md"
                leftSection={<IconMail size={16} />}
                {...inviteForm.getInputProps("email")}
              />
              
              <Group grow>
                <TextInput
                  label="Nombre (opcional)"
                  placeholder="Juan"
                  radius="md"
                  {...inviteForm.getInputProps("first_name")}
                />
                <TextInput
                  label="Apellido (opcional)"
                  placeholder="García"
                  radius="md"
                  {...inviteForm.getInputProps("last_name")}
                />
              </Group>
              
              <Textarea
                label="Mensaje personalizado (opcional)"
                placeholder="Hola, te invito a unirte a mi programa de entrenamiento..."
                minRows={3}
                radius="md"
                {...inviteForm.getInputProps("message")}
              />

              <Select
                label="Plan de suscripción"
                placeholder="Selecciona un plan..."
                data={[
                  { value: "", label: "Gratuito — Sin plan de pago" },
                  ...productOptions,
                ]}
                clearable
                radius="md"
                description="Selecciona 'Gratuito' para clientes que pagan en efectivo o no requieren pago online"
                {...inviteForm.getInputProps("product_id")}
              />

              <Group justify="flex-end" mt="md">
                <Button 
                  onClick={handleCloseInviteModal} 
                  variant="default"
                  radius="xl"
                >
                  Cancelar
                </Button>
                <Button 
                  loading={createInvitation.isPending} 
                  type="submit"
                  radius="xl"
                  leftSection={<IconSend size={16} />}
                  styles={{
                    root: {
                      background: "var(--nv-accent)",
                      color: "var(--nv-dark)",
                      fontWeight: 700,
                      "&:hover": {
                        background: "var(--nv-accent-hover)"
                      }
                    }
                  }}
                >
                  Enviar Invitación
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </BottomSheet>

      {/* Modal de confirmación de eliminación permanente */}
      <BottomSheet
        opened={deleteConfirmOpened}
        onClose={() => { closeDeleteConfirm(); setClientToDelete(null); }}
        title="Confirmar eliminación permanente"
        radius="lg"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            ¿Estás seguro de que deseas eliminar permanentemente a{" "}
            <Text span fw={700}>{clientToDelete?.first_name} {clientToDelete?.last_name}</Text>?
          </Text>
          <Text size="xs" c="red">
            Esta acción no se puede deshacer. Se eliminarán todos los datos del cliente.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { closeDeleteConfirm(); setClientToDelete(null); }} radius="xl">
              Cancelar
            </Button>
            <Button
              color="red"
              loading={permanentDeleteClient.isPending}
              onClick={() => handlePermanentDelete(clientToDelete)}
              radius="xl"
            >
              Eliminar permanentemente
            </Button>
          </Group>
        </Stack>
      </BottomSheet>
    </Container>
  );
}
