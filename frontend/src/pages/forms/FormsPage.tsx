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
  ActionIcon,
  SimpleGrid,
  Switch,
  ThemeIcon,
  Divider,
  Drawer,
  ScrollArea,
  FileButton,
  Progress,
  Table,
  Checkbox,
  NumberInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconForms,
  IconEdit,
  IconTrash,
  IconCopy,
  IconEye,
  IconUpload,
  IconFile,
  IconFileText,
  IconFilePdf,
  IconFileSpreadsheet,
  IconFolder,
  IconDownload,
  IconSend,
  IconCheck,
  IconGripVertical,
  IconTextSize,
  IconNumber,
  IconCalendar,
  IconCheckbox,
  IconList,
  IconMail,
  IconPhone,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'

interface FormField {
  id: string
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'checkbox' | 'radio'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  order: number
}

interface FormTemplate {
  id: string
  name: string
  description?: string
  type: 'custom' | 'par_q' | 'consent' | 'health' | 'feedback'
  fields: FormField[]
  is_active: boolean
  send_on_onboarding: boolean
  submissions_count: number
  created_at: string
}

interface Document {
  id: string
  name: string
  type: string
  size: number
  uploaded_at: string
  folder?: string
}

const fieldTypes = [
  { value: 'text', label: 'Texto corto', icon: IconTextSize },
  { value: 'textarea', label: 'Texto largo', icon: IconFileText },
  { value: 'number', label: 'Número', icon: IconNumber },
  { value: 'email', label: 'Email', icon: IconMail },
  { value: 'phone', label: 'Teléfono', icon: IconPhone },
  { value: 'date', label: 'Fecha', icon: IconCalendar },
  { value: 'select', label: 'Desplegable', icon: IconList },
  { value: 'checkbox', label: 'Casillas', icon: IconCheckbox },
  { value: 'radio', label: 'Opción única', icon: IconList },
]

const mockForms: FormTemplate[] = [
  {
    id: '1',
    name: 'PAR-Q (Cuestionario de Aptitud Física)',
    description: 'Cuestionario estándar de preparación para actividad física',
    type: 'par_q',
    fields: [],
    is_active: true,
    send_on_onboarding: true,
    submissions_count: 45,
    created_at: '2024-01-15',
  },
  {
    id: '2',
    name: 'Consentimiento Informado',
    description: 'Documento de consentimiento para servicios de entrenamiento',
    type: 'consent',
    fields: [],
    is_active: true,
    send_on_onboarding: true,
    submissions_count: 42,
    created_at: '2024-01-15',
  },
  {
    id: '3',
    name: 'Historial de Salud',
    description: 'Información médica y de salud del cliente',
    type: 'health',
    fields: [],
    is_active: true,
    send_on_onboarding: false,
    submissions_count: 38,
    created_at: '2024-02-01',
  },
  {
    id: '4',
    name: 'Encuesta de Satisfacción',
    description: 'Feedback sobre los servicios recibidos',
    type: 'feedback',
    fields: [],
    is_active: false,
    send_on_onboarding: false,
    submissions_count: 12,
    created_at: '2024-03-10',
  },
]

const mockDocuments: Document[] = [
  { id: '1', name: 'Guía de Nutrición.pdf', type: 'pdf', size: 2500000, uploaded_at: '2024-07-15', folder: 'Recursos' },
  { id: '2', name: 'Plan de Entrenamiento Template.xlsx', type: 'xlsx', size: 150000, uploaded_at: '2024-07-10', folder: 'Plantillas' },
  { id: '3', name: 'Contrato de Servicios.pdf', type: 'pdf', size: 500000, uploaded_at: '2024-06-20', folder: 'Legal' },
  { id: '4', name: 'Política de Privacidad.pdf', type: 'pdf', size: 320000, uploaded_at: '2024-06-15', folder: 'Legal' },
]

export function FormsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('forms')
  const [forms, setForms] = useState<FormTemplate[]>(mockForms)
  const [documents, setDocuments] = useState<Document[]>(mockDocuments)
  const [builderOpened, { open: openBuilder, close: closeBuilder }] = useDisclosure(false)
  const [uploadModalOpened, { open: openUploadModal, close: closeUploadModal }] = useDisclosure(false)
  const [editingForm, setEditingForm] = useState<FormTemplate | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      type: 'custom',
      send_on_onboarding: false,
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })

  const openFormBuilder = (formTemplate?: FormTemplate) => {
    if (formTemplate) {
      setEditingForm(formTemplate)
      form.setValues({
        name: formTemplate.name,
        description: formTemplate.description || '',
        type: formTemplate.type,
        send_on_onboarding: formTemplate.send_on_onboarding,
      })
      setFormFields(formTemplate.fields)
    } else {
      setEditingForm(null)
      form.reset()
      setFormFields([])
    }
    openBuilder()
  }

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: '',
      required: false,
      order: formFields.length,
    }
    setFormFields([...formFields, newField])
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields(fields =>
      fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    )
  }

  const removeField = (fieldId: string) => {
    setFormFields(fields => fields.filter(f => f.id !== fieldId))
  }

  const handleSaveForm = () => {
    const values = form.values
    if (!values.name) return

    const newForm: FormTemplate = {
      id: editingForm?.id || `form-${Date.now()}`,
      name: values.name,
      description: values.description,
      type: values.type as FormTemplate['type'],
      fields: formFields,
      is_active: editingForm?.is_active ?? true,
      send_on_onboarding: values.send_on_onboarding,
      submissions_count: editingForm?.submissions_count ?? 0,
      created_at: editingForm?.created_at || new Date().toISOString().split('T')[0],
    }

    if (editingForm) {
      setForms(f => f.map(item => item.id === editingForm.id ? newForm : item))
    } else {
      setForms(f => [...f, newForm])
    }

    closeBuilder()
    form.reset()
    setFormFields([])
    setEditingForm(null)
  }

  const toggleFormActive = (formId: string) => {
    setForms(f =>
      f.map(item => item.id === formId ? { ...item, is_active: !item.is_active } : item)
    )
  }

  const deleteForm = (formId: string) => {
    setForms(f => f.filter(item => item.id !== formId))
  }

  const getFormTypeColor = (type: FormTemplate['type']) => {
    switch (type) {
      case 'par_q': return 'blue'
      case 'consent': return 'green'
      case 'health': return 'red'
      case 'feedback': return 'orange'
      default: return 'gray'
    }
  }

  const getFormTypeLabel = (type: FormTemplate['type']) => {
    switch (type) {
      case 'par_q': return 'PAR-Q'
      case 'consent': return 'Consentimiento'
      case 'health': return 'Salud'
      case 'feedback': return 'Feedback'
      default: return 'Personalizado'
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return IconFilePdf
      case 'xlsx':
      case 'xls': return IconFileSpreadsheet
      default: return IconFile
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFieldIcon = (type: FormField['type']) => {
    const fieldType = fieldTypes.find(f => f.value === type)
    return fieldType?.icon || IconTextSize
  }

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Formularios y Documentos"
        description="Gestiona formularios, cuestionarios y documentos compartidos"
        action={{
          label: activeTab === 'forms' ? 'Nuevo Formulario' : 'Subir Documento',
          onClick: activeTab === 'forms' ? () => openFormBuilder() : openUploadModal,
        }}
      />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="forms" leftSection={<IconForms size={14} />}>
            Formularios
          </Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconFolder size={14} />}>
            Documentos
          </Tabs.Tab>
          <Tabs.Tab value="submissions" leftSection={<IconCheck size={14} />}>
            Respuestas
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="forms">
          {forms.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {forms.map((formTemplate) => (
                <Card key={formTemplate.id} withBorder radius="lg" padding="lg">
                  <Group justify="space-between" mb="sm">
                    <Badge
                      variant="light"
                      color={getFormTypeColor(formTemplate.type)}
                    >
                      {getFormTypeLabel(formTemplate.type)}
                    </Badge>
                    <Switch
                      size="sm"
                      checked={formTemplate.is_active}
                      onChange={() => toggleFormActive(formTemplate.id)}
                      color="green"
                    />
                  </Group>

                  <Text fw={600} mb="xs">{formTemplate.name}</Text>
                  <Text size="sm" c="dimmed" lineClamp={2} mb="md">
                    {formTemplate.description || 'Sin descripción'}
                  </Text>

                  <Group gap="xs" mb="md">
                    {formTemplate.send_on_onboarding && (
                      <Badge size="xs" variant="outline" color="blue">
                        Onboarding
                      </Badge>
                    )}
                    <Badge size="xs" variant="light">
                      {formTemplate.submissions_count} respuestas
                    </Badge>
                  </Group>

                  <Divider mb="md" />

                  <Group gap="xs">
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconEdit size={14} />}
                      flex={1}
                      onClick={() => openFormBuilder(formTemplate)}
                    >
                      Editar
                    </Button>
                    <ActionIcon variant="light" color="blue">
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="green">
                      <IconSend size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="gray">
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => deleteForm(formTemplate.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              icon={<IconForms size={40} />}
              title="No hay formularios"
              description="Crea tu primer formulario para recoger información de tus clientes."
              actionLabel="Crear Formulario"
              onAction={() => openFormBuilder()}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="documents">
          {documents.length > 0 ? (
            <Paper withBorder radius="lg">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>Carpeta</Table.Th>
                    <Table.Th>Tamaño</Table.Th>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th ta="right">Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {documents.map((doc) => {
                    const FileIcon = getFileIcon(doc.type)
                    return (
                      <Table.Tr key={doc.id}>
                        <Table.Td>
                          <Group gap="sm">
                            <ThemeIcon
                              size="md"
                              radius="md"
                              variant="light"
                              color={doc.type === 'pdf' ? 'red' : 'green'}
                            >
                              <FileIcon size={16} />
                            </ThemeIcon>
                            <Text size="sm" fw={500}>{doc.name}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{doc.folder}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{formatFileSize(doc.size)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{doc.uploaded_at}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon variant="subtle" color="blue">
                              <IconDownload size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="gray">
                              <IconEye size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red">
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          ) : (
            <EmptyState
              icon={<IconFolder size={40} />}
              title="No hay documentos"
              description="Sube documentos para compartir con tus clientes."
              actionLabel="Subir Documento"
              onAction={openUploadModal}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="submissions">
          <Paper withBorder radius="lg" p="lg">
            <Text fw={600} mb="md">Respuestas Recientes</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Formulario</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[
                  { client: 'María García', form: 'PAR-Q', status: 'completed', date: '2024-07-20' },
                  { client: 'Carlos López', form: 'Consentimiento', status: 'completed', date: '2024-07-19' },
                  { client: 'Ana Martínez', form: 'Historial de Salud', status: 'pending', date: '2024-07-18' },
                  { client: 'Pedro Sánchez', form: 'PAR-Q', status: 'completed', date: '2024-07-17' },
                ].map((submission, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{submission.client}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{submission.form}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={submission.status === 'completed' ? 'green' : 'yellow'}
                      >
                        {submission.status === 'completed' ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{submission.date}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon variant="subtle" color="blue">
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="green">
                          <IconDownload size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Form Builder Drawer */}
      <Drawer
        opened={builderOpened}
        onClose={closeBuilder}
        title={editingForm ? 'Editar Formulario' : 'Nuevo Formulario'}
        size="xl"
        position="right"
      >
        <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
          <Stack>
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <TextInput
                  label="Nombre del formulario"
                  placeholder="Ej: Cuestionario de Salud"
                  required
                  {...form.getInputProps('name')}
                />

                <Textarea
                  label="Descripción"
                  placeholder="Describe el propósito del formulario..."
                  minRows={2}
                  {...form.getInputProps('description')}
                />

                <Group grow>
                  <Select
                    label="Tipo de formulario"
                    data={[
                      { value: 'custom', label: 'Personalizado' },
                      { value: 'par_q', label: 'PAR-Q' },
                      { value: 'consent', label: 'Consentimiento' },
                      { value: 'health', label: 'Historial de Salud' },
                      { value: 'feedback', label: 'Feedback' },
                    ]}
                    {...form.getInputProps('type')}
                  />
                </Group>

                <Switch
                  label="Enviar automáticamente en el onboarding"
                  {...form.getInputProps('send_on_onboarding', { type: 'checkbox' })}
                />
              </Stack>
            </Paper>

            <Divider label="Campos del formulario" labelPosition="center" />

            {formFields.length > 0 && (
              <Stack gap="sm">
                {formFields.map((field, index) => {
                  const FieldIcon = getFieldIcon(field.type)
                  return (
                    <Paper key={field.id} withBorder p="md" radius="md">
                      <Group justify="space-between" mb="sm">
                        <Group gap="sm">
                          <Box style={{ cursor: 'grab' }}>
                            <IconGripVertical size={16} color="var(--mantine-color-gray-5)" />
                          </Box>
                          <ThemeIcon size="sm" variant="light" color="blue">
                            <FieldIcon size={12} />
                          </ThemeIcon>
                          <Text size="sm" fw={500}>
                            {fieldTypes.find(f => f.value === field.type)?.label}
                          </Text>
                        </Group>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => removeField(field.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>

                      <Stack gap="xs">
                        <TextInput
                          size="sm"
                          placeholder="Etiqueta del campo"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                        />
                        <TextInput
                          size="sm"
                          placeholder="Texto de ayuda (opcional)"
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        />
                        {(field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') && (
                          <Textarea
                            size="sm"
                            placeholder="Opciones (una por línea)"
                            minRows={2}
                            value={field.options?.join('\n') || ''}
                            onChange={(e) => updateField(field.id, { options: e.target.value.split('\n') })}
                          />
                        )}
                        <Checkbox
                          size="sm"
                          label="Campo obligatorio"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.currentTarget.checked })}
                        />
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            )}

            <Divider label="Añadir campo" labelPosition="center" />

            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
              {fieldTypes.map((fieldType) => {
                const FieldIcon = fieldType.icon
                return (
                  <Button
                    key={fieldType.value}
                    variant="light"
                    leftSection={<FieldIcon size={16} />}
                    onClick={() => addField(fieldType.value as FormField['type'])}
                    size="sm"
                  >
                    {fieldType.label}
                  </Button>
                )
              })}
            </SimpleGrid>
          </Stack>
        </ScrollArea>

        <Group justify="flex-end" mt="md" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Button variant="default" onClick={closeBuilder}>
            Cancelar
          </Button>
          <Button onClick={handleSaveForm}>
            {editingForm ? 'Guardar Cambios' : 'Crear Formulario'}
          </Button>
        </Group>
      </Drawer>

      {/* Upload Document Modal */}
      <Modal
        opened={uploadModalOpened}
        onClose={closeUploadModal}
        title="Subir Documento"
        size="md"
      >
        <Stack>
          <Paper
            withBorder
            p="xl"
            radius="md"
            style={{
              borderStyle: 'dashed',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <ThemeIcon size={60} radius="xl" variant="light" color="blue" mx="auto" mb="md">
              <IconUpload size={30} />
            </ThemeIcon>
            <Text fw={500} mb="xs">Arrastra archivos aquí</Text>
            <Text size="sm" c="dimmed" mb="md">o haz clic para seleccionar</Text>
            <FileButton onChange={() => {}} accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx">
              {(props) => (
                <Button variant="light" {...props}>
                  Seleccionar Archivo
                </Button>
              )}
            </FileButton>
          </Paper>

          <Select
            label="Carpeta"
            placeholder="Selecciona una carpeta"
            data={[
              { value: 'Recursos', label: 'Recursos' },
              { value: 'Plantillas', label: 'Plantillas' },
              { value: 'Legal', label: 'Legal' },
              { value: 'Otros', label: 'Otros' },
            ]}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeUploadModal}>
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

export default FormsPage
