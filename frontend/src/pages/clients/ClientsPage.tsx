import {
  Box,
  Button,
  ColorInput,
  Container,
  Group,
  Modal,
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
import { useDisclosure } from "@mantine/hooks";
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
} from "@tabler/icons-react";
import { useState, useMemo, useEffect } from "react";
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
  useUpdateClient,
} from "../../hooks/useClients";
import { useCreateInvitation, useInvitations, useResendInvitation } from "../../hooks/useInvitations";
import { productsApi } from "../../services/api";
import { useAuthStore } from "../../stores/auth";

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

  // Filtrar por estado según la pestaña activa
  const isActiveFilter = activeTab === "active" ? true : activeTab === "inactive" ? false : undefined;
  const { data: clientsData, isLoading } = useClients({ page, search, is_active: isActiveFilter });
  useClientTags();
  const createClient = useCreateClient();
  const createTag = useCreateClientTag();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const permanentDeleteClient = usePermanentDeleteClient();
  const createInvitation = useCreateInvitation();
  const { data: invitations } = useInvitations();
  const resendInvitation = useResendInvitation();
  
  // Estado para el modal de edición
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  // Estado para invitación
  const [inviteModalOpened, { open: openInviteModal, close: closeInviteModal }] = useDisclosure(false);
  const [lastInvitationUrl, setLastInvitationUrl] = useState<string | null>(null);

  // Estado para confirmación de borrado permanente
  const [deleteConfirmOpened, { open: openDeleteConfirm, close: closeDeleteConfirm }] = useDisclosure(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  
  // Products for invite selector
  const { currentWorkspace } = useAuthStore();
  const [productOptions, setProductOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    if (currentWorkspace?.id) {
      productsApi.list(currentWorkspace.id).then((res) => {
        const opts = (res.data?.items || res.data || [])
          .filter((p: any) => p.is_active)
          .map((p: any) => ({
            value: p.id,
            label: `${p.name} - ${Number(p.price).toFixed(2)}€/${p.interval || "mes"}`,
          }));
        setProductOptions(opts);
      }).catch(() => {});
    }
  }, [currentWorkspace]);

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
        !client.is_active ? (
          <Group gap={4} wrap="nowrap">
            <Button
              size="xs"
              variant="light"
              radius="xl"
              leftSection={<IconSend size={14} />}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleResendInvitation(client);
              }}
              styles={{
                root: {
                  fontSize: "11px",
                },
              }}
            >
              Reenviar invitación
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
              styles={{
                root: {
                  fontSize: "11px",
                },
              }}
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
            styles={{
              root: {
                fontSize: "11px",
              },
            }}
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

  // Estadísticas (calculadas desde los datos reales)
  const stats = useMemo(() => {
    const items = clientsData?.items || [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const newThisMonth = items.filter((c: any) => {
      const createdAt = new Date(c.created_at);
      return createdAt >= startOfMonth;
    }).length;

    return {
      total: clientsData?.total || 0,
      active: items.filter((c: any) => c.is_active).length,
      inactive: items.filter((c: any) => !c.is_active).length,
      newThisMonth,
    };
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
      <SimpleGrid cols={{ base: 2, sm: 4, xl: 6 }} mb="lg" spacing="sm" className="stagger">
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
            <Tabs.Tab value="inactive" style={{ fontWeight: 600, fontSize: "13px" }}>
              Inactivos ({stats.inactive})
            </Tabs.Tab>
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
      ) : isLoading ? null : (
        <EmptyState
          actionLabel="Añadir Cliente"
          description="Empieza añadiendo tu primer cliente para gestionar sus entrenamientos, nutrición y progreso."
          icon={<IconUsers size={48} />}
          onAction={openClientModal}
          title="No hay clientes"
        />
      )}

      {/* Invitaciones pendientes - se muestran en Inactivos y Todos */}
      {(activeTab === "inactive" || activeTab === "all") && (() => {
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
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Table verticalSpacing="sm" horizontalSpacing="md">
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
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </Box>
        );
      })()}

      {/* Modal para crear cliente */}
      <Modal
        onClose={closeClientModal}
        opened={clientModalOpened}
        size="lg"
        title="Nuevo Cliente"
        radius="lg"
        centered
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
      </Modal>

      {/* Modal para crear etiqueta */}
      <Modal
        onClose={closeTagModal}
        opened={tagModalOpened}
        size="sm"
        title="Nueva Etiqueta"
        radius="lg"
        centered
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
      </Modal>

      {/* Modal para editar cliente */}
      <Modal
        onClose={closeEditModal}
        opened={editModalOpened}
        size="lg"
        title={`Editar Cliente: ${editingClient?.first_name || ''} ${editingClient?.last_name || ''}`}
        radius="lg"
        centered
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
      </Modal>

      {/* Modal para invitar cliente */}
      <Modal
        onClose={handleCloseInviteModal}
        opened={inviteModalOpened}
        size="md"
        title="Invitar Cliente"
        radius="lg"
        centered
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
      </Modal>

      {/* Modal de confirmación de eliminación permanente */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={() => { closeDeleteConfirm(); setClientToDelete(null); }}
        title="Confirmar eliminación permanente"
        radius="lg"
        centered
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
      </Modal>
    </Container>
  );
}
