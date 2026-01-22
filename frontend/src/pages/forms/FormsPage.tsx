import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Drawer,
  FileButton,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCalendar,
  IconCheck,
  IconCheckbox,
  IconCopy,
  IconDownload,
  IconEdit,
  IconEye,
  IconFile,
  IconFileSpreadsheet,
  IconFileText,
  IconFolder,
  IconForms,
  IconGripVertical,
  IconList,
  IconMail,
  IconNumber,
  IconPhone,
  IconSend,
  IconTextSize,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useState } from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";

interface FormField {
  id: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "phone"
    | "date"
    | "select"
    | "checkbox"
    | "radio";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
}

interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  type: "custom" | "par_q" | "consent" | "health" | "feedback";
  fields: FormField[];
  is_active: boolean;
  send_on_onboarding: boolean;
  submissions_count: number;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
  folder?: string;
}

const fieldTypes = [
  { value: "text", label: "Texto corto", icon: IconTextSize },
  { value: "textarea", label: "Texto largo", icon: IconFileText },
  { value: "number", label: "Número", icon: IconNumber },
  { value: "email", label: "Email", icon: IconMail },
  { value: "phone", label: "Teléfono", icon: IconPhone },
  { value: "date", label: "Fecha", icon: IconCalendar },
  { value: "select", label: "Desplegable", icon: IconList },
  { value: "checkbox", label: "Casillas", icon: IconCheckbox },
  { value: "radio", label: "Opción única", icon: IconList },
];

// TODO: Replace with API call when backend endpoint is ready
// const { data: forms = [] } = useForms();
// const { data: documents = [] } = useDocuments();

export function FormsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("forms");
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [documents] = useState<Document[]>([]);
  const [builderOpened, { open: openBuilder, close: closeBuilder }] =
    useDisclosure(false);
  const [
    uploadModalOpened,
    { open: openUploadModal, close: closeUploadModal },
  ] = useDisclosure(false);
  const [editingForm, setEditingForm] = useState<FormTemplate | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      type: "custom",
      send_on_onboarding: false,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const openFormBuilder = (formTemplate?: FormTemplate) => {
    if (formTemplate) {
      setEditingForm(formTemplate);
      form.setValues({
        name: formTemplate.name,
        description: formTemplate.description || "",
        type: formTemplate.type,
        send_on_onboarding: formTemplate.send_on_onboarding,
      });
      setFormFields(formTemplate.fields);
    } else {
      setEditingForm(null);
      form.reset();
      setFormFields([]);
    }
    openBuilder();
  };

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: "",
      required: false,
      order: formFields.length,
    };
    setFormFields([...formFields, newField]);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields((fields) =>
      fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const removeField = (fieldId: string) => {
    setFormFields((fields) => fields.filter((f) => f.id !== fieldId));
  };

  const handleSaveForm = () => {
    const values = form.values;
    if (!values.name) return;

    const newForm: FormTemplate = {
      id: editingForm?.id || `form-${Date.now()}`,
      name: values.name,
      description: values.description,
      type: values.type as FormTemplate["type"],
      fields: formFields,
      is_active: editingForm?.is_active ?? true,
      send_on_onboarding: values.send_on_onboarding,
      submissions_count: editingForm?.submissions_count ?? 0,
      created_at:
        editingForm?.created_at || new Date().toISOString().split("T")[0],
    };

    if (editingForm) {
      setForms((f) =>
        f.map((item) => (item.id === editingForm.id ? newForm : item))
      );
    } else {
      setForms((f) => [...f, newForm]);
    }

    closeBuilder();
    form.reset();
    setFormFields([]);
    setEditingForm(null);
  };

  const toggleFormActive = (formId: string) => {
    setForms((f) =>
      f.map((item) =>
        item.id === formId ? { ...item, is_active: !item.is_active } : item
      )
    );
  };

  const deleteForm = (formId: string) => {
    setForms((f) => f.filter((item) => item.id !== formId));
  };

  const getFormTypeColor = (type: FormTemplate["type"]) => {
    switch (type) {
      case "par_q":
        return "blue";
      case "consent":
        return "green";
      case "health":
        return "red";
      case "feedback":
        return "orange";
      default:
        return "gray";
    }
  };

  const getFormTypeLabel = (type: FormTemplate["type"]) => {
    switch (type) {
      case "par_q":
        return "PAR-Q";
      case "consent":
        return "Consentimiento";
      case "health":
        return "Salud";
      case "feedback":
        return "Feedback";
      default:
        return "Personalizado";
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return IconFileText;
      case "xlsx":
      case "xls":
        return IconFileSpreadsheet;
      default:
        return IconFile;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFieldIcon = (type: FormField["type"]) => {
    const fieldType = fieldTypes.find((f) => f.value === type);
    return fieldType?.icon || IconTextSize;
  };

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: activeTab === "forms" ? "Nuevo Formulario" : "Subir Documento",
          onClick:
            activeTab === "forms" ? () => openFormBuilder() : openUploadModal,
        }}
        description="Gestiona formularios, cuestionarios y documentos compartidos"
        title="Formularios y Documentos"
      />

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconForms size={14} />} value="forms">
            Formularios
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconFolder size={14} />} value="documents">
            Documentos
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconCheck size={14} />} value="submissions">
            Respuestas
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="forms">
          {forms.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
              {forms.map((formTemplate) => (
                <Card key={formTemplate.id} padding="lg" radius="lg" withBorder>
                  <Group justify="space-between" mb="sm">
                    <Badge
                      color={getFormTypeColor(formTemplate.type)}
                      variant="light"
                    >
                      {getFormTypeLabel(formTemplate.type)}
                    </Badge>
                    <Switch
                      checked={formTemplate.is_active}
                      color="green"
                      onChange={() => toggleFormActive(formTemplate.id)}
                      size="sm"
                    />
                  </Group>

                  <Text fw={600} mb="xs">
                    {formTemplate.name}
                  </Text>
                  <Text c="dimmed" lineClamp={2} mb="md" size="sm">
                    {formTemplate.description || "Sin descripción"}
                  </Text>

                  <Group gap="xs" mb="md">
                    {formTemplate.send_on_onboarding && (
                      <Badge color="blue" size="xs" variant="outline">
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
                      flex={1}
                      leftSection={<IconEdit size={14} />}
                      onClick={() => openFormBuilder(formTemplate)}
                      size="xs"
                      variant="light"
                    >
                      Editar
                    </Button>
                    <ActionIcon color="blue" variant="light">
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon color="green" variant="light">
                      <IconSend size={16} />
                    </ActionIcon>
                    <ActionIcon color="gray" variant="light">
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      onClick={() => deleteForm(formTemplate.id)}
                      variant="light"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              actionLabel="Crear Formulario"
              description="Crea tu primer formulario para recoger información de tus clientes."
              icon={<IconForms size={40} />}
              onAction={() => openFormBuilder()}
              title="No hay formularios"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="documents">
          {documents.length > 0 ? (
            <Paper radius="lg" withBorder>
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
                    const FileIcon = getFileIcon(doc.type);
                    return (
                      <Table.Tr key={doc.id}>
                        <Table.Td>
                          <Group gap="sm">
                            <ThemeIcon
                              color={doc.type === "pdf" ? "red" : "green"}
                              radius="md"
                              size="md"
                              variant="light"
                            >
                              <FileIcon size={16} />
                            </ThemeIcon>
                            <Text fw={500} size="sm">
                              {doc.name}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{doc.folder}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text c="dimmed" size="sm">
                            {formatFileSize(doc.size)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="dimmed" size="sm">
                            {doc.uploaded_at}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon color="blue" variant="subtle">
                              <IconDownload size={16} />
                            </ActionIcon>
                            <ActionIcon color="gray" variant="subtle">
                              <IconEye size={16} />
                            </ActionIcon>
                            <ActionIcon color="red" variant="subtle">
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
          ) : (
            <EmptyState
              actionLabel="Subir Documento"
              description="Sube documentos para compartir con tus clientes."
              icon={<IconFolder size={40} />}
              onAction={openUploadModal}
              title="No hay documentos"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="submissions">
          <Paper p="lg" radius="lg" withBorder>
            <Text fw={600} mb="md">
              Respuestas Recientes
            </Text>
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
                  {
                    client: "María García",
                    form: "PAR-Q",
                    status: "completed",
                    date: "2024-07-20",
                  },
                  {
                    client: "Carlos López",
                    form: "Consentimiento",
                    status: "completed",
                    date: "2024-07-19",
                  },
                  {
                    client: "Ana Martínez",
                    form: "Historial de Salud",
                    status: "pending",
                    date: "2024-07-18",
                  },
                  {
                    client: "Pedro Sánchez",
                    form: "PAR-Q",
                    status: "completed",
                    date: "2024-07-17",
                  },
                ].map((submission, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {submission.client}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{submission.form}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          submission.status === "completed" ? "green" : "yellow"
                        }
                        variant="light"
                      >
                        {submission.status === "completed"
                          ? "Completado"
                          : "Pendiente"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">
                        {submission.date}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon color="blue" variant="subtle">
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon color="green" variant="subtle">
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
        onClose={closeBuilder}
        opened={builderOpened}
        position="right"
        size="xl"
        title={editingForm ? "Editar Formulario" : "Nuevo Formulario"}
      >
        <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
          <Stack>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="sm">
                <TextInput
                  label="Nombre del formulario"
                  placeholder="Ej: Cuestionario de Salud"
                  required
                  {...form.getInputProps("name")}
                />

                <Textarea
                  label="Descripción"
                  minRows={2}
                  placeholder="Describe el propósito del formulario..."
                  {...form.getInputProps("description")}
                />

                <Group grow>
                  <Select
                    data={[
                      { value: "custom", label: "Personalizado" },
                      { value: "par_q", label: "PAR-Q" },
                      { value: "consent", label: "Consentimiento" },
                      { value: "health", label: "Historial de Salud" },
                      { value: "feedback", label: "Feedback" },
                    ]}
                    label="Tipo de formulario"
                    {...form.getInputProps("type")}
                  />
                </Group>

                <Switch
                  label="Enviar automáticamente en el onboarding"
                  {...form.getInputProps("send_on_onboarding", {
                    type: "checkbox",
                  })}
                />
              </Stack>
            </Paper>

            <Divider label="Campos del formulario" labelPosition="center" />

            {formFields.length > 0 && (
              <Stack gap="sm">
                {formFields.map((field) => {
                  const FieldIcon = getFieldIcon(field.type);
                  return (
                    <Paper key={field.id} p="md" radius="md" withBorder>
                      <Group justify="space-between" mb="sm">
                        <Group gap="sm">
                          <Box style={{ cursor: "grab" }}>
                            <IconGripVertical
                              color="var(--mantine-color-gray-5)"
                              size={16}
                            />
                          </Box>
                          <ThemeIcon color="blue" size="sm" variant="light">
                            <FieldIcon size={12} />
                          </ThemeIcon>
                          <Text fw={500} size="sm">
                            {
                              fieldTypes.find((f) => f.value === field.type)
                                ?.label
                            }
                          </Text>
                        </Group>
                        <ActionIcon
                          color="red"
                          onClick={() => removeField(field.id)}
                          size="sm"
                          variant="subtle"
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>

                      <Stack gap="xs">
                        <TextInput
                          onChange={(e) =>
                            updateField(field.id, { label: e.target.value })
                          }
                          placeholder="Etiqueta del campo"
                          size="sm"
                          value={field.label}
                        />
                        <TextInput
                          onChange={(e) =>
                            updateField(field.id, {
                              placeholder: e.target.value,
                            })
                          }
                          placeholder="Texto de ayuda (opcional)"
                          size="sm"
                          value={field.placeholder || ""}
                        />
                        {(field.type === "select" ||
                          field.type === "checkbox" ||
                          field.type === "radio") && (
                          <Textarea
                            minRows={2}
                            onChange={(e) =>
                              updateField(field.id, {
                                options: e.target.value.split("\n"),
                              })
                            }
                            placeholder="Opciones (una por línea)"
                            size="sm"
                            value={field.options?.join("\n") || ""}
                          />
                        )}
                        <Checkbox
                          checked={field.required}
                          label="Campo obligatorio"
                          onChange={(e) =>
                            updateField(field.id, {
                              required: e.currentTarget.checked,
                            })
                          }
                          size="sm"
                        />
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}

            <Divider label="Añadir campo" labelPosition="center" />

            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
              {fieldTypes.map((fieldType) => {
                const FieldIcon = fieldType.icon;
                return (
                  <Button
                    key={fieldType.value}
                    leftSection={<FieldIcon size={16} />}
                    onClick={() =>
                      addField(fieldType.value as FormField["type"])
                    }
                    size="sm"
                    variant="light"
                  >
                    {fieldType.label}
                  </Button>
                );
              })}
            </SimpleGrid>
          </Stack>
        </ScrollArea>

        <Group
          justify="flex-end"
          mt="md"
          p="md"
          style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
        >
          <Button onClick={closeBuilder} variant="default">
            Cancelar
          </Button>
          <Button onClick={handleSaveForm}>
            {editingForm ? "Guardar Cambios" : "Crear Formulario"}
          </Button>
        </Group>
      </Drawer>

      {/* Upload Document Modal */}
      <Modal
        onClose={closeUploadModal}
        opened={uploadModalOpened}
        size="md"
        title="Subir Documento"
      >
        <Stack>
          <Paper
            p="xl"
            radius="md"
            style={{
              borderStyle: "dashed",
              textAlign: "center",
              cursor: "pointer",
            }}
            withBorder
          >
            <ThemeIcon
              color="blue"
              mb="md"
              mx="auto"
              radius="xl"
              size={60}
              variant="light"
            >
              <IconUpload size={30} />
            </ThemeIcon>
            <Text fw={500} mb="xs">
              Arrastra archivos aquí
            </Text>
            <Text c="dimmed" mb="md" size="sm">
              o haz clic para seleccionar
            </Text>
            <FileButton
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
              onChange={() => {}}
            >
              {(props) => (
                <Button variant="light" {...props}>
                  Seleccionar Archivo
                </Button>
              )}
            </FileButton>
          </Paper>

          <Select
            data={[
              { value: "Recursos", label: "Recursos" },
              { value: "Plantillas", label: "Plantillas" },
              { value: "Legal", label: "Legal" },
              { value: "Otros", label: "Otros" },
            ]}
            label="Carpeta"
            placeholder="Selecciona una carpeta"
          />

          <Group justify="flex-end" mt="md">
            <Button onClick={closeUploadModal} variant="default">
              Cancelar
            </Button>
            <Button>Subir</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default FormsPage;
