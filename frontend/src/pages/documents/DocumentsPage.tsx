import { useState } from 'react'
import {
  Container,
  Tabs,
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Card,
  SimpleGrid,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Select,
  ThemeIcon,
  Menu,
  Progress,
  FileInput,
  Checkbox,
  Divider,
  Tooltip,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import {
  IconPlus,
  IconFileText,
  IconSignature,
  IconFolder,
  IconUpload,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconDownload,
  IconSend,
  IconCheck,
  IconClock,
  IconUsers,
  IconEye,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'

interface Document {
  id: string
  name: string
  type: 'contract' | 'consent' | 'waiver' | 'custom'
  status: 'draft' | 'sent' | 'signed' | 'expired'
  createdAt: string
  sentTo?: string[]
  signedCount?: number
  totalSent?: number
  requiresSignature: boolean
  fileUrl?: string
}

interface DocumentFolder {
  id: string
  name: string
  documentCount: number
  color: string
}

export function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('documents')
  const [documentModalOpened, { open: openDocumentModal, close: closeDocumentModal }] = useDisclosure(false)
  const [folderModalOpened, { open: openFolderModal, close: closeFolderModal }] = useDisclosure(false)

  // Mock data
  const [documents] = useState<Document[]>([
    {
      id: '1',
      name: 'Contrato de Servicios',
      type: 'contract',
      status: 'signed',
      createdAt: '2024-01-15',
      sentTo: ['maria@email.com', 'carlos@email.com'],
      signedCount: 15,
      totalSent: 18,
      requiresSignature: true,
    },
    {
      id: '2',
      name: 'Consentimiento RGPD',
      type: 'consent',
      status: 'sent',
      createdAt: '2024-01-10',
      sentTo: ['ana@email.com'],
      signedCount: 8,
      totalSent: 12,
      requiresSignature: true,
    },
    {
      id: '3',
      name: 'Exención de Responsabilidad',
      type: 'waiver',
      status: 'draft',
      createdAt: '2024-01-20',
      requiresSignature: true,
    },
    {
      id: '4',
      name: 'Guía de Nutrición',
      type: 'custom',
      status: 'signed',
      createdAt: '2024-01-05',
      requiresSignature: false,
      fileUrl: '/documents/nutrition-guide.pdf',
    },
  ])

  const [folders] = useState<DocumentFolder[]>([
    { id: '1', name: 'Contratos', documentCount: 5, color: 'blue' },
    { id: '2', name: 'Consentimientos', documentCount: 3, color: 'green' },
    { id: '3', name: 'Guías y Recursos', documentCount: 8, color: 'violet' },
    { id: '4', name: 'Facturas', documentCount: 12, color: 'orange' },
  ])

  const documentForm = useForm({
    initialValues: {
      name: '',
      type: 'contract',
      content: '',
      requiresSignature: true,
      file: null as File | null,
    },
  })

  const folderForm = useForm({
    initialValues: {
      name: '',
      color: 'blue',
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'gray'
      case 'sent': return 'blue'
      case 'signed': return 'green'
      case 'expired': return 'red'
      default: return 'gray'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador'
      case 'sent': return 'Enviado'
      case 'signed': return 'Firmado'
      case 'expired': return 'Expirado'
      default: return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'contract': return <IconFileText size={20} />
      case 'consent': return <IconCheck size={20} />
      case 'waiver': return <IconSignature size={20} />
      default: return <IconFileText size={20} />
    }
  }

  const totalDocuments = documents.length
  const signedDocuments = documents.filter(d => d.status === 'signed').length
  const pendingSignatures = documents.filter(d => d.status === 'sent').length

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Documentos"
        description="Gestiona contratos, consentimientos y documentos con firma digital"
        action={{
          label: 'Nuevo Documento',
          icon: <IconPlus size={16} />,
          onClick: openDocumentModal,
        }}
        secondaryAction={{
          label: 'Nueva Carpeta',
          icon: <IconFolder size={16} />,
          onClick: openFolderModal,
          variant: 'default',
        }}
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Documentos</Text>
              <Text size="xl" fw={700}>{totalDocuments}</Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconFileText size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Documentos Firmados</Text>
              <Text size="xl" fw={700}>{signedDocuments}</Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="green" variant="light">
              <IconSignature size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Pendientes de Firma</Text>
              <Text size="xl" fw={700}>{pendingSignatures}</Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="yellow" variant="light">
              <IconClock size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="documents" leftSection={<IconFileText size={16} />}>
            Documentos
          </Tabs.Tab>
          <Tabs.Tab value="folders" leftSection={<IconFolder size={16} />}>
            Carpetas
          </Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconSignature size={16} />}>
            Plantillas
          </Tabs.Tab>
        </Tabs.List>

        {/* Documents Tab */}
        <Tabs.Panel value="documents">
          <Stack gap="md">
            {documents.map((doc) => (
              <Paper key={doc.id} withBorder radius="md" p="md">
                <Group justify="space-between">
                  <Group gap="md">
                    <ThemeIcon size="lg" radius="md" color="gray" variant="light">
                      {getTypeIcon(doc.type)}
                    </ThemeIcon>
                    <div>
                      <Group gap="xs">
                        <Text fw={600}>{doc.name}</Text>
                        <Badge size="xs" color={getStatusColor(doc.status)} variant="light">
                          {getStatusLabel(doc.status)}
                        </Badge>
                        {doc.requiresSignature && (
                          <Badge size="xs" color="violet" variant="outline">
                            Requiere firma
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        Creado el {new Date(doc.createdAt).toLocaleDateString('es-ES')}
                      </Text>
                    </div>
                  </Group>
                  <Group gap="md">
                    {doc.totalSent && doc.totalSent > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end">
                          <IconUsers size={14} />
                          <Text size="sm" fw={500}>
                            {doc.signedCount}/{doc.totalSent}
                          </Text>
                        </Group>
                        <Progress
                          value={(doc.signedCount! / doc.totalSent) * 100}
                          size="sm"
                          w={100}
                          color="green"
                        />
                      </div>
                    )}
                    <Group gap="xs">
                      <Tooltip label="Ver documento">
                        <ActionIcon variant="subtle" color="gray">
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Enviar">
                        <ActionIcon variant="subtle" color="blue">
                          <IconSend size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Menu shadow="md" width={150}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEdit size={14} />}>Editar</Menu.Item>
                          <Menu.Item leftSection={<IconDownload size={14} />}>Descargar</Menu.Item>
                          <Menu.Divider />
                          <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                            Eliminar
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>

        {/* Folders Tab */}
        <Tabs.Panel value="folders">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                withBorder
                radius="md"
                p="lg"
                style={{ cursor: 'pointer' }}
              >
                <Group justify="space-between" mb="md">
                  <ThemeIcon size="xl" radius="md" color={folder.color} variant="light">
                    <IconFolder size={24} />
                  </ThemeIcon>
                  <Menu shadow="md" width={150}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={14} />}>Renombrar</Menu.Item>
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                        Eliminar
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
                <Text fw={600} mb={4}>{folder.name}</Text>
                <Text size="sm" c="dimmed">{folder.documentCount} documentos</Text>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        {/* Templates Tab */}
        <Tabs.Panel value="templates">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {[
              { name: 'Contrato de Entrenamiento', type: 'contract', uses: 45 },
              { name: 'Consentimiento RGPD', type: 'consent', uses: 120 },
              { name: 'Exención de Responsabilidad', type: 'waiver', uses: 89 },
              { name: 'Política de Cancelación', type: 'custom', uses: 67 },
            ].map((template, index) => (
              <Card key={index} withBorder radius="md" p="lg">
                <Group justify="space-between" mb="md">
                  <ThemeIcon size="lg" radius="md" color="violet" variant="light">
                    {getTypeIcon(template.type)}
                  </ThemeIcon>
                  <Badge variant="light" color="gray">{template.uses} usos</Badge>
                </Group>
                <Text fw={600} mb="xs">{template.name}</Text>
                <Group gap="xs">
                  <Button size="xs" variant="light" fullWidth>
                    Usar Plantilla
                  </Button>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>

      {/* Document Modal */}
      <Modal opened={documentModalOpened} onClose={closeDocumentModal} title="Nuevo Documento" size="lg" centered>
        <form onSubmit={documentForm.onSubmit((values) => {
          console.log(values)
          closeDocumentModal()
        })}>
          <Stack>
            <TextInput
              label="Nombre del Documento"
              placeholder="Ej: Contrato de Servicios"
              {...documentForm.getInputProps('name')}
            />
            <Select
              label="Tipo de Documento"
              data={[
                { value: 'contract', label: 'Contrato' },
                { value: 'consent', label: 'Consentimiento' },
                { value: 'waiver', label: 'Exención de Responsabilidad' },
                { value: 'custom', label: 'Personalizado' },
              ]}
              {...documentForm.getInputProps('type')}
            />
            <Textarea
              label="Contenido"
              placeholder="Escribe el contenido del documento..."
              minRows={6}
              {...documentForm.getInputProps('content')}
            />
            <FileInput
              label="O sube un archivo"
              placeholder="Selecciona un archivo PDF"
              accept=".pdf,.doc,.docx"
              leftSection={<IconUpload size={14} />}
              {...documentForm.getInputProps('file')}
            />
            <Divider />
            <Checkbox
              label="Requiere firma digital"
              description="Los clientes deberán firmar este documento"
              {...documentForm.getInputProps('requiresSignature', { type: 'checkbox' })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDocumentModal}>Cancelar</Button>
              <Button type="submit">Crear Documento</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Folder Modal */}
      <Modal opened={folderModalOpened} onClose={closeFolderModal} title="Nueva Carpeta" centered>
        <form onSubmit={folderForm.onSubmit((values) => {
          console.log(values)
          closeFolderModal()
        })}>
          <Stack>
            <TextInput
              label="Nombre de la Carpeta"
              placeholder="Ej: Contratos 2024"
              {...folderForm.getInputProps('name')}
            />
            <Select
              label="Color"
              data={[
                { value: 'blue', label: 'Azul' },
                { value: 'green', label: 'Verde' },
                { value: 'violet', label: 'Violeta' },
                { value: 'orange', label: 'Naranja' },
                { value: 'red', label: 'Rojo' },
              ]}
              {...folderForm.getInputProps('color')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeFolderModal}>Cancelar</Button>
              <Button type="submit">Crear Carpeta</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}

