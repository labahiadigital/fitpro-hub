import { useState } from 'react'
import {
  Container,
  Group,
  Button,
  Modal,
  TextInput,
  Stack,
  Textarea,
  ColorInput,
  Tabs,
  Text,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconUsers,
  IconTag,
  IconDownload,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { DataTable, ClientCell, StatusBadge, TagsList } from '../../components/common/DataTable'
import { EmptyState } from '../../components/common/EmptyState'
import { useClients, useCreateClient, useClientTags, useCreateClientTag } from '../../hooks/useClients'

export function ClientsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [clientModalOpened, { open: openClientModal, close: closeClientModal }] = useDisclosure(false)
  const [tagModalOpened, { close: closeTagModal }] = useDisclosure(false)
  
  const { data: clientsData, isLoading } = useClients({ page, search })
  useClientTags()
  const createClient = useCreateClient()
  const createTag = useCreateClientTag()
  
  const clientForm = useForm({
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      goals: '',
    },
    validate: {
      first_name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
      last_name: (value) => (value.length < 2 ? 'Apellido requerido' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
    },
  })
  
  const tagForm = useForm({
    initialValues: {
      name: '',
      color: '#2D6A4F',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })
  
  const handleCreateClient = async (values: typeof clientForm.values) => {
    try {
      await createClient.mutateAsync(values)
      closeClientModal()
      clientForm.reset()
    } catch {
      // Error handled by mutation
    }
  }
  
  const handleCreateTag = async (values: typeof tagForm.values) => {
    try {
      await createTag.mutateAsync(values)
      closeTagModal()
      tagForm.reset()
    } catch {
      // Error handled by mutation
    }
  }
  
  const columns = [
    {
      key: 'name',
      title: 'Cliente',
      render: (client: { first_name: string; last_name: string; email: string; avatar_url?: string }) => (
        <ClientCell
          name={`${client.first_name} ${client.last_name}`}
          email={client.email}
          avatarUrl={client.avatar_url}
        />
      ),
    },
    {
      key: 'phone',
      title: 'Teléfono',
      render: (client: { phone?: string }) => (
        <Text size="sm">{client.phone || '-'}</Text>
      ),
    },
    {
      key: 'tags',
      title: 'Etiquetas',
      render: (client: { tags?: Array<{ name: string; color: string }> }) => (
        client.tags && client.tags.length > 0 ? (
          <TagsList tags={client.tags} />
        ) : (
          <Text size="sm" c="dimmed">Sin etiquetas</Text>
        )
      ),
    },
    {
      key: 'is_active',
      title: 'Estado',
      render: (client: { is_active: boolean }) => (
        <StatusBadge status={client.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'created_at',
      title: 'Fecha registro',
      render: (client: { created_at: string }) => (
        <Text size="sm">
          {new Date(client.created_at).toLocaleDateString('es-ES')}
        </Text>
      ),
    },
  ]
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Clientes"
        description="Gestiona tu cartera de clientes"
        action={{
          label: 'Nuevo Cliente',
          onClick: openClientModal,
        }}
        secondaryAction={{
          label: 'Exportar',
          icon: <IconDownload size={16} />,
          onClick: () => {},
          variant: 'default',
        }}
      >
        <Tabs defaultValue="all">
          <Tabs.List>
            <Tabs.Tab value="all" leftSection={<IconUsers size={14} />}>
              Todos ({clientsData?.total || 0})
            </Tabs.Tab>
            <Tabs.Tab value="active">
              Activos
            </Tabs.Tab>
            <Tabs.Tab value="inactive">
              Inactivos
            </Tabs.Tab>
            <Tabs.Tab value="tags" leftSection={<IconTag size={14} />}>
              Etiquetas
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </PageHeader>
      
      {clientsData?.items && clientsData.items.length > 0 ? (
        <DataTable
          data={clientsData.items}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Buscar clientes..."
          onSearch={setSearch}
          onEdit={(client) => console.log('Edit', client)}
          onDelete={(client) => console.log('Delete', client)}
          onView={(client) => console.log('View', client)}
          pagination={{
            page,
            pageSize: 10,
            total: clientsData.total,
            onChange: setPage,
          }}
        />
      ) : !isLoading ? (
        <EmptyState
          icon={<IconUsers size={40} />}
          title="No hay clientes"
          description="Empieza añadiendo tu primer cliente para gestionar sus entrenamientos, nutrición y progreso."
          actionLabel="Añadir Cliente"
          onAction={openClientModal}
        />
      ) : null}
      
      {/* Modal para crear cliente */}
      <Modal
        opened={clientModalOpened}
        onClose={closeClientModal}
        title="Nuevo Cliente"
        size="md"
      >
        <form onSubmit={clientForm.onSubmit(handleCreateClient)}>
          <Stack>
            <Group grow>
              <TextInput
                label="Nombre"
                placeholder="Juan"
                required
                {...clientForm.getInputProps('first_name')}
              />
              <TextInput
                label="Apellido"
                placeholder="García"
                required
                {...clientForm.getInputProps('last_name')}
              />
            </Group>
            <TextInput
              label="Email"
              placeholder="juan@email.com"
              required
              {...clientForm.getInputProps('email')}
            />
            <TextInput
              label="Teléfono"
              placeholder="+34 600 000 000"
              {...clientForm.getInputProps('phone')}
            />
            <Textarea
              label="Objetivos"
              placeholder="Describe los objetivos del cliente..."
              minRows={3}
              {...clientForm.getInputProps('goals')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeClientModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={createClient.isPending}>
                Crear Cliente
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      
      {/* Modal para crear etiqueta */}
      <Modal
        opened={tagModalOpened}
        onClose={closeTagModal}
        title="Nueva Etiqueta"
        size="sm"
      >
        <form onSubmit={tagForm.onSubmit(handleCreateTag)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="VIP"
              required
              {...tagForm.getInputProps('name')}
            />
            <ColorInput
              label="Color"
              format="hex"
              swatches={['#2D6A4F', '#40916C', '#F08A5D', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B']}
              {...tagForm.getInputProps('color')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeTagModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={createTag.isPending}>
                Crear Etiqueta
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}
