import {
  Button,
  ColorInput,
  Container,
  Group,
  Modal,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconDownload, IconTag, IconUsers } from "@tabler/icons-react";
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
} from "../../hooks/useClients";

export function ClientsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [
    clientModalOpened,
    { open: openClientModal, close: closeClientModal },
  ] = useDisclosure(false);
  const [tagModalOpened, { close: closeTagModal }] = useDisclosure(false);

  const { data: clientsData, isLoading } = useClients({ page, search });
  useClientTags();
  const createClient = useCreateClient();
  const createTag = useCreateClientTag();

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
      color: "#2D6A4F",
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
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
        <Text size="sm">{client.phone || "-"}</Text>
      ),
    },
    {
      key: "tags",
      title: "Etiquetas",
      render: (client: { tags?: Array<{ name: string; color: string }> }) =>
        client.tags && client.tags.length > 0 ? (
          <TagsList tags={client.tags} />
        ) : (
          <Text c="dimmed" size="sm">
            Sin etiquetas
          </Text>
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
      title: "Fecha registro",
      render: (client: { created_at: string }) => (
        <Text size="sm">
          {new Date(client.created_at).toLocaleDateString("es-ES")}
        </Text>
      ),
    },
  ];

  return (
    <Container py="xl" size="xl">
      <PageHeader
        action={{
          label: "Nuevo Cliente",
          onClick: openClientModal,
        }}
        description="Gestiona tu cartera de clientes"
        secondaryAction={{
          label: "Exportar",
          icon: <IconDownload size={16} />,
          onClick: () => {},
          variant: "default",
        }}
        title="Clientes"
      >
        <Tabs defaultValue="all">
          <Tabs.List>
            <Tabs.Tab leftSection={<IconUsers size={14} />} value="all">
              Todos ({clientsData?.total || 0})
            </Tabs.Tab>
            <Tabs.Tab value="active">Activos</Tabs.Tab>
            <Tabs.Tab value="inactive">Inactivos</Tabs.Tab>
            <Tabs.Tab leftSection={<IconTag size={14} />} value="tags">
              Etiquetas
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </PageHeader>

      {clientsData?.items && clientsData.items.length > 0 ? (
        <DataTable
          columns={columns}
          data={clientsData.items}
          loading={isLoading}
          onDelete={(client) => console.log("Delete", client)}
          onEdit={(client) => console.log("Edit", client)}
          onSearch={setSearch}
          onView={(client: { id: string }) => navigate(`/clients/${client.id}`)}
          pagination={{
            page,
            pageSize: 10,
            total: clientsData.total,
            onChange: setPage,
          }}
          searchable
          searchPlaceholder="Buscar clientes..."
        />
      ) : isLoading ? null : (
        <EmptyState
          actionLabel="Añadir Cliente"
          description="Empieza añadiendo tu primer cliente para gestionar sus entrenamientos, nutrición y progreso."
          icon={<IconUsers size={40} />}
          onAction={openClientModal}
          title="No hay clientes"
        />
      )}

      {/* Modal para crear cliente */}
      <Modal
        onClose={closeClientModal}
        opened={clientModalOpened}
        size="md"
        title="Nuevo Cliente"
      >
        <form onSubmit={clientForm.onSubmit(handleCreateClient)}>
          <Stack>
            <Group grow>
              <TextInput
                label="Nombre"
                placeholder="Juan"
                required
                {...clientForm.getInputProps("first_name")}
              />
              <TextInput
                label="Apellido"
                placeholder="García"
                required
                {...clientForm.getInputProps("last_name")}
              />
            </Group>
            <TextInput
              label="Email"
              placeholder="juan@email.com"
              required
              {...clientForm.getInputProps("email")}
            />
            <TextInput
              label="Teléfono"
              placeholder="+34 600 000 000"
              {...clientForm.getInputProps("phone")}
            />
            <Textarea
              label="Objetivos"
              minRows={3}
              placeholder="Describe los objetivos del cliente..."
              {...clientForm.getInputProps("goals")}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeClientModal} variant="default">
                Cancelar
              </Button>
              <Button loading={createClient.isPending} type="submit">
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
      >
        <form onSubmit={tagForm.onSubmit(handleCreateTag)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="VIP"
              required
              {...tagForm.getInputProps("name")}
            />
            <ColorInput
              format="hex"
              label="Color"
              swatches={[
                "#2D6A4F",
                "#40916C",
                "#F08A5D",
                "#3B82F6",
                "#8B5CF6",
                "#EC4899",
                "#EF4444",
                "#F59E0B",
              ]}
              {...tagForm.getInputProps("color")}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeTagModal} variant="default">
                Cancelar
              </Button>
              <Button loading={createTag.isPending} type="submit">
                Crear Etiqueta
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
