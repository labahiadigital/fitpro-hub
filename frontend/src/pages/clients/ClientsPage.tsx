import {
  Box,
  Button,
  ColorInput,
  Container,
  Group,
  Modal,
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { 
  IconDownload, 
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
} from "@tabler/icons-react";
import { useState } from "react";
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
  useUpdateClient,
} from "../../hooks/useClients";

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
        <StatusBadge status={client.is_active ? "active" : "inactive"} />
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
  const [
    clientModalOpened,
    { open: openClientModal, close: closeClientModal },
  ] = useDisclosure(false);
  const [tagModalOpened, { open: openTagModal, close: closeTagModal }] = useDisclosure(false);

  const { data: clientsData, isLoading } = useClients({ page, search });
  useClientTags();
  const createClient = useCreateClient();
  const createTag = useCreateClientTag();
  const updateClient = useUpdateClient();
  
  // Estado para el modal de edición
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<any>(null);

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
      render: (client: { is_active: boolean }) => (
        <StatusBadge status={client.is_active ? "active" : "inactive"} />
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

  // Estadísticas
  const stats = {
    total: clientsData?.total || 0,
    active: clientsData?.items?.filter((c: any) => c.is_active).length || 0,
    inactive: clientsData?.items?.filter((c: any) => !c.is_active).length || 0,
    newThisMonth: 12, // Mock
  };

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Nuevo Cliente",
          icon: <IconUserPlus size={16} />,
          onClick: openClientModal,
        }}
        description="Gestiona tu cartera de clientes y su información"
        secondaryAction={{
          label: "Exportar",
          icon: <IconDownload size={14} />,
          onClick: () => {},
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
        <Tabs defaultValue="all">
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
            onDelete={(client) => console.log("Delete", client)}
            onEdit={(client) => handleEditClient(client)}
            onSearch={setSearch}
            onView={(client: { id: string }) => navigate(`/clients/${client.id}`)}
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
    </Container>
  );
}
