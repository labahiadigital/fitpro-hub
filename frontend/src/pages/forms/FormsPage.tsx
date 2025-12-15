import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  Modal,
  TextInput,
  Select,
  Stack,
  Textarea,
  Tabs,
  Box,
  Text,
  Badge,
  Card,
  SimpleGrid,
  ActionIcon,
  Menu,
  ThemeIcon,
  Progress,
  Table,
  Switch,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconForms,
  IconFileText,
  IconEdit,
  IconTrash,
  IconDotsVertical,
  IconSend,
  IconEye,
  IconCopy,
  IconDownload,
  IconFolder,
  IconUpload,
  IconCheck,
  IconClock,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'

export function FormsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('forms')
  const [formModalOpened, { open: openFormModal, close: closeFormModal }] = useDisclosure(false)
  const [docModalOpened, { open: openDocModal, close: closeDocModal }] = useDisclosure(false)
  
  // Mock data
  const forms = [
    {
      id: '1',
      name: 'Cuestionario PAR-Q',
      description: 'Cuestionario de aptitud física previo al ejercicio',
      form_type: 'health',
      submissions_count: 45,
      pending_count: 3,
      is_active: true,
    },
    {
      id: '2',
      name: 'Consentimiento GDPR',
      description: 'Consentimiento para tratamiento de datos personales',
      form_type: 'consent',
      submissions_count: 52,
      pending_count: 0,
      is_active: true,
    },
    {
      id: '3',
      name: 'Evaluación Inicial',
      description: 'Evaluación de objetivos y estado físico inicial',
      form_type: 'assessment',
      submissions_count: 38,
      pending_count: 5,
      is_active: true,
    },
    {
      id: '4',
      name: 'Encuesta de Satisfacción',
      description: 'Feedback mensual sobre el servicio',
      form_type: 'survey',
      submissions_count: 120,
      pending_count: 12,
      is_active: false,
    },
  ]
  
  const submissions = [
    { id: '1', form: 'Cuestionario PAR-Q', client: 'María García', status: 'pending', sent_at: '2024-01-14', submitted_at: null },
    { id: '2', form: 'Consentimiento GDPR', client: 'Carlos López', status: 'completed', sent_at: '2024-01-13', submitted_at: '2024-01-13' },
    { id: '3', form: 'Evaluación Inicial', client: 'Ana Martínez', status: 'completed', sent_at: '2024-01-12', submitted_at: '2024-01-14' },
    { id: '4', form: 'Cuestionario PAR-Q', client: 'Pedro Sánchez', status: 'pending', sent_at: '2024-01-10', submitted_at: null },
    { id: '5', form: 'Encuesta de Satisfacción', client: 'Laura Fernández', status: 'completed', sent_at: '2024-01-08', submitted_at: '2024-01-09' },
  ]
  
  const documents = [
    { id: '1', name: 'Política de Privacidad.pdf', type: 'pdf', size: '245 KB', uploaded_at: '2024-01-10' },
    { id: '2', name: 'Términos y Condiciones.pdf', type: 'pdf', size: '180 KB', uploaded_at: '2024-01-10' },
    { id: '3', name: 'Guía de Ejercicios.pdf', type: 'pdf', size: '2.4 MB', uploaded_at: '2024-01-05' },
    { id: '4', name: 'Plan Nutricional Ejemplo.pdf', type: 'pdf', size: '1.1 MB', uploaded_at: '2024-01-03' },
  ]
  
  const formForm = useForm({
    initialValues: {
      name: '',
      description: '',
      form_type: 'custom',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })
  
  const handleCreateForm = (values: typeof formForm.values) => {
    console.log('Create form:', values)
    closeFormModal()
    formForm.reset()
  }
  
  const getFormTypeColor = (type: string) => {
    switch (type) {
      case 'health': return 'red'
      case 'consent': return 'blue'
      case 'assessment': return 'green'
      case 'survey': return 'violet'
      default: return 'gray'
    }
  }
  
  const getFormTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      health: 'Salud',
      consent: 'Consentimiento',
      assessment: 'Evaluación',
      survey: 'Encuesta',
      custom: 'Personalizado',
    }
    return labels[type] || type
  }
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Formularios y Documentos"
        description="Gestiona formularios, consentimientos y documentos compartidos"
        action={{
          label: activeTab === 'documents' ? 'Subir Documento' : 'Nuevo Formulario',
          onClick: activeTab === 'documents' ? openDocModal : openFormModal,
        }}
      />
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="forms" leftSection={<IconForms size={14} />}>
            Formularios
          </Tabs.Tab>
          <Tabs.Tab value="submissions" leftSection={<IconFileText size={14} />}>
            Respuestas
          </Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconFolder size={14} />}>
            Documentos
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="forms">
          {forms.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {forms.map((form) => (
                <Card key={form.id} withBorder radius="lg" padding="lg">
                  <Group justify="space-between" mb="md">
                    <ThemeIcon
                      size="lg"
                      radius="md"
                      color={getFormTypeColor(form.form_type)}
                      variant="light"
                    >
                      <IconForms size={20} />
                    </ThemeIcon>
                    <Group gap="xs">
                      <Switch checked={form.is_active} size="sm" />
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEye size={14} />}>
                            Vista previa
                          </Menu.Item>
                          <Menu.Item leftSection={<IconEdit size={14} />}>
                            Editar
                          </Menu.Item>
                          <Menu.Item leftSection={<IconCopy size={14} />}>
                            Duplicar
                          </Menu.Item>
                          <Menu.Item leftSection={<IconSend size={14} />}>
                            Enviar a clientes
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                            Eliminar
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                  
                  <Box mb="md">
                    <Group gap="xs" mb={4}>
                      <Text fw={600}>{form.name}</Text>
                      <Badge size="xs" color={getFormTypeColor(form.form_type)} variant="light">
                        {getFormTypeLabel(form.form_type)}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {form.description}
                    </Text>
                  </Box>
                  
                  <Group justify="space-between" mb="xs">
                    <Text size="xs" c="dimmed">
                      {form.submissions_count} respuestas
                    </Text>
                    {form.pending_count > 0 && (
                      <Badge size="xs" color="yellow" variant="light">
                        {form.pending_count} pendientes
                      </Badge>
                    )}
                  </Group>
                  
                  <Progress
                    value={((form.submissions_count - form.pending_count) / form.submissions_count) * 100}
                    size="xs"
                    color="green"
                  />
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              icon={<IconForms size={40} />}
              title="No hay formularios"
              description="Crea tu primer formulario para recopilar información de tus clientes."
              actionLabel="Crear Formulario"
              onAction={openFormModal}
            />
          )}
        </Tabs.Panel>
        
        <Tabs.Panel value="submissions">
          <Paper withBorder radius="lg">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Formulario</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Enviado</Table.Th>
                  <Table.Th>Completado</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th style={{ width: 60 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {submissions.map((sub) => (
                  <Table.Tr key={sub.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{sub.form}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{sub.client}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(sub.sent_at).toLocaleDateString('es-ES')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {sub.submitted_at
                          ? new Date(sub.submitted_at).toLocaleDateString('es-ES')
                          : '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={sub.status === 'completed' ? 'green' : 'yellow'}
                        variant="light"
                        size="sm"
                        leftSection={sub.status === 'completed' ? <IconCheck size={12} /> : <IconClock size={12} />}
                      >
                        {sub.status === 'completed' ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEye size={14} />}>
                            Ver respuestas
                          </Menu.Item>
                          {sub.status === 'pending' && (
                            <Menu.Item leftSection={<IconSend size={14} />}>
                              Reenviar
                            </Menu.Item>
                          )}
                          <Menu.Item leftSection={<IconDownload size={14} />}>
                            Descargar PDF
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
        
        <Tabs.Panel value="documents">
          <Paper withBorder radius="lg">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Documento</Table.Th>
                  <Table.Th>Tamaño</Table.Th>
                  <Table.Th>Subido</Table.Th>
                  <Table.Th style={{ width: 60 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {documents.map((doc) => (
                  <Table.Tr key={doc.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <ThemeIcon size="sm" variant="light" color="red">
                          <IconFileText size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>{doc.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{doc.size}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(doc.uploaded_at).toLocaleDateString('es-ES')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconDownload size={14} />}>
                            Descargar
                          </Menu.Item>
                          <Menu.Item leftSection={<IconSend size={14} />}>
                            Compartir con cliente
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                            Eliminar
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
      
      {/* Modal para crear formulario */}
      <Modal
        opened={formModalOpened}
        onClose={closeFormModal}
        title="Nuevo Formulario"
        size="md"
      >
        <form onSubmit={formForm.onSubmit(handleCreateForm)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Cuestionario de Salud"
              required
              {...formForm.getInputProps('name')}
            />
            
            <Textarea
              label="Descripción"
              placeholder="Describe el propósito del formulario..."
              minRows={2}
              {...formForm.getInputProps('description')}
            />
            
            <Select
              label="Tipo de formulario"
              data={[
                { value: 'health', label: 'Salud (PAR-Q, historial médico)' },
                { value: 'consent', label: 'Consentimiento (GDPR, términos)' },
                { value: 'assessment', label: 'Evaluación (objetivos, estado físico)' },
                { value: 'survey', label: 'Encuesta (satisfacción, feedback)' },
                { value: 'custom', label: 'Personalizado' },
              ]}
              {...formForm.getInputProps('form_type')}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeFormModal}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Formulario
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      
      {/* Modal para subir documento */}
      <Modal
        opened={docModalOpened}
        onClose={closeDocModal}
        title="Subir Documento"
        size="md"
      >
        <Stack>
          <Box
            p="xl"
            style={{
              border: '2px dashed var(--mantine-color-gray-3)',
              borderRadius: 'var(--mantine-radius-md)',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <ThemeIcon size={48} radius="xl" variant="light" color="gray" mb="md">
              <IconUpload size={24} />
            </ThemeIcon>
            <Text size="sm" fw={500}>
              Arrastra archivos aquí o haz clic para seleccionar
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (máx. 10MB)
            </Text>
          </Box>
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDocModal}>
              Cancelar
            </Button>
            <Button>
              Subir
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

