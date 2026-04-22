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
  Tooltip,
  Skeleton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconAlertTriangle,
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
  IconLoader,
  IconMail,
  IconNumber,
  IconPhone,
  IconRotateClockwise,
  IconSend,
  IconTextSize,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { openDangerConfirm } from "../../utils/confirmModal";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { BottomSheet } from "../../components/common/BottomSheet";
import { notifications } from "@mantine/notifications";
import {
  useForms,
  useFormSubmissions,
  useUpdateFormSubmission,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  useCopyForm,
  useSendForm,
  type Form,
} from "../../hooks/useForms";
import { useClients } from "../../hooks/useClients";
import { formatDecimal } from "../../utils/format";

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
  is_required: boolean;
  send_on_onboarding: boolean;
  is_global: boolean;
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

export function FormsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("forms");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [documents] = useState<Document[]>([]);
  
  // API hooks
  const { data: formsData = [], isLoading: isLoadingForms } = useForms();
  const { data: submissionsData = [], isLoading: isLoadingSubmissions } = useFormSubmissions();
  const updateSubmissionMutation = useUpdateFormSubmission();
  const createForm = useCreateForm();
  const updateForm = useUpdateForm();
  const deleteFormMutation = useDeleteForm();
  const copyFormMutation = useCopyForm();
  const sendFormMutation = useSendForm();
  const { data: clientsResponse } = useClients({ page_size: 500 });
  const clientsList = (clientsResponse?.items || []) as Array<{
    id: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  }>;
  
  // Map API forms to FormTemplate interface
  const forms: FormTemplate[] = Array.isArray(formsData) ? (formsData as Form[]).map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    type: f.form_type === "assessment" ? "custom" : f.form_type === "survey" ? "feedback" : f.form_type as FormTemplate["type"],
    fields: (f.fields || []).map((field, idx) => ({ ...field, order: field.order ?? idx })) as FormField[],
    is_active: f.is_active === true || f.is_active === "Y" || f.is_active === "true",
    is_required: f.is_required ?? false,
    send_on_onboarding: f.send_on_onboarding ?? false,
    is_global: f.is_global ?? false,
    submissions_count: f.submissions_count ?? 0,
    created_at: f.created_at ? f.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
  })) : [];

  // Separar plantillas del sistema de los formularios propios del workspace
  const systemForms = useMemo(() => forms.filter((f) => f.is_global), [forms]);
  const workspaceForms = useMemo(() => forms.filter((f) => !f.is_global), [forms]);
  type SubmissionApiItem = {
    id: string;
    form_id: string;
    client_id: string;
    client_name?: string;
    form_name?: string;
    status: string;
    submitted_at?: string;
    created_at: string;
    answers?: Record<string, unknown>;
  };

  // Map submissions from API
  const submissions = useMemo(() => {
    if (!Array.isArray(submissionsData)) return [];
    return (submissionsData as SubmissionApiItem[]).map((s) => ({
      id: s.id,
      form_id: s.form_id,
      client_id: s.client_id,
      client: s.client_name || "Cliente desconocido",
      form: s.form_name || "Formulario",
      status: s.status,
      date: (s.submitted_at || s.created_at || "").split("T")[0],
      answers: s.answers || {},
    }));
  }, [submissionsData]);

  const handleUpdateSubmissionStatus = async (submissionId: string, newStatus: string) => {
    try {
      await updateSubmissionMutation.mutateAsync({ submissionId, status: newStatus });
      notifications.show({
        title: "Estado actualizado",
        message: `La respuesta se ha marcado como ${newStatus === "completed" ? "completada" : newStatus === "read" ? "leída" : "pendiente"}`,
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo actualizar el estado",
        color: "red",
      });
    }
  };

  // Modal para ver respuestas de un formulario enviado por un cliente
  type ViewingSubmission = {
    id: string;
    form_id: string;
    client: string;
    form: string;
    status: string;
    date: string;
    answers: Record<string, unknown>;
  };
  const [viewingSubmission, setViewingSubmission] = useState<ViewingSubmission | null>(null);
  const [submissionViewerOpened, { open: openSubmissionViewer, close: closeSubmissionViewer }] = useDisclosure(false);

  const handleViewSubmission = async (submission: ViewingSubmission) => {
    setViewingSubmission(submission);
    openSubmissionViewer();
    // Marcar como "leída" automáticamente si aún está "submitted" (nueva/sin leer)
    if (submission.status === "submitted") {
      try {
        await updateSubmissionMutation.mutateAsync({ submissionId: submission.id, status: "read" });
      } catch {
        // silencioso: la vista ya se abrió
      }
    }
  };

  const handleDownloadSubmission = (submission: ViewingSubmission) => {
    try {
      const template = forms.find((f) => f.id === submission.form_id);
      const lines: string[] = [];
      lines.push(`Formulario: ${submission.form}`);
      lines.push(`Cliente: ${submission.client}`);
      lines.push(`Fecha: ${submission.date}`);
      lines.push("");
      const answers = submission.answers || {};
      const templateFields = template?.fields || [];
      if (templateFields.length > 0) {
        for (const field of templateFields) {
          const value = answers[field.id] ?? answers[field.label] ?? "";
          const printable = Array.isArray(value) ? value.join(", ") : String(value ?? "");
          lines.push(`${field.label}: ${printable}`);
        }
      } else {
        for (const [key, value] of Object.entries(answers)) {
          const printable = Array.isArray(value) ? value.join(", ") : String(value ?? "");
          lines.push(`${key}: ${printable}`);
        }
      }
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeClient = submission.client.replace(/[^\w\-]+/g, "_");
      const safeForm = submission.form.replace(/[^\w\-]+/g, "_");
      link.download = `${safeForm}-${safeClient}-${submission.date}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo descargar la respuesta",
        color: "red",
      });
    }
  };

  const [builderOpened, { open: openBuilder, close: closeBuilder }] =
    useDisclosure(false);
  const [
    uploadModalOpened,
    { open: openUploadModal, close: closeUploadModal },
  ] = useDisclosure(false);
  const [previewOpened, { open: openPreview, close: closePreview }] =
    useDisclosure(false);
  const [editingForm, setEditingForm] = useState<FormTemplate | null>(null);
  const [previewForm, setPreviewForm] = useState<FormTemplate | null>(null);
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

  const openCanalDenuncias = () => {
    setEditingForm(null);
    form.setValues({
      name: "Canal de Denuncias",
      description: "Formulario para reportar incidentes de forma confidencial",
      type: "custom",
      send_on_onboarding: false,
    });
    setFormFields([
      {
        id: `field-${Date.now()}-1`,
        type: "select",
        label: "Tipo de denuncia",
        required: true,
        options: ["Acoso", "Discriminación", "Seguridad", "Otro"],
        order: 0,
      },
      {
        id: `field-${Date.now()}-2`,
        type: "textarea",
        label: "Descripción del incidente",
        placeholder: "Describe lo sucedido con el mayor detalle posible...",
        required: true,
        order: 1,
      },
      {
        id: `field-${Date.now()}-3`,
        type: "date",
        label: "Fecha del incidente",
        required: false,
        order: 2,
      },
      {
        id: `field-${Date.now()}-4`,
        type: "text",
        label: "Personas involucradas",
        placeholder: "Nombres o descripciones de las personas involucradas",
        required: false,
        order: 3,
      },
      {
        id: `field-${Date.now()}-5`,
        type: "radio",
        label: "¿Desea mantener el anonimato?",
        required: true,
        options: ["Sí", "No"],
        order: 4,
      },
    ]);
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

  const handleSaveForm = async () => {
    const values = form.values;
    if (!values.name) return;

    // Map form type to backend enum
    const formTypeMap: Record<string, string> = {
      custom: "custom",
      par_q: "health",
      consent: "consent",
      health: "health",
      feedback: "survey",
    };

    const formData = {
      name: values.name,
      description: values.description || undefined,
      form_type: (formTypeMap[values.type] || "custom") as "health" | "consent" | "assessment" | "survey" | "custom",
      fields: formFields,
      is_active: editingForm?.is_active ?? true,
      send_on_onboarding: values.send_on_onboarding,
    };

    try {
      if (editingForm) {
        await updateForm.mutateAsync({ id: editingForm.id, data: formData });
        notifications.show({
          title: "Formulario actualizado",
          message: `${values.name} se ha actualizado correctamente`,
          color: "green",
        });
      } else {
        await createForm.mutateAsync(formData);
        notifications.show({
          title: "Formulario creado",
          message: `${values.name} se ha creado correctamente`,
          color: "green",
        });
      }

      closeBuilder();
      form.reset();
      setFormFields([]);
      setEditingForm(null);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudo guardar el formulario",
        color: "red",
      });
    }
  };

  const toggleFormActive = async (formId: string, currentStatus: boolean) => {
    try {
      await updateForm.mutateAsync({
        id: formId,
        data: { is_active: !currentStatus },
      });
      notifications.show({
        title: "Estado actualizado",
        message: !currentStatus
          ? "El formulario está activo."
          : "El formulario se ha desactivado.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo cambiar el estado del formulario",
        color: "red",
      });
    }
  };

  const toggleFormRequired = async (formId: string, currentValue: boolean) => {
    try {
      await updateForm.mutateAsync({
        id: formId,
        data: { is_required: !currentValue },
      });
      notifications.show({
        title: !currentValue ? "Formulario obligatorio" : "Formulario opcional",
        message: !currentValue
          ? "Los clientes verán una notificación persistente hasta completarlo."
          : "El formulario ya no es obligatorio.",
        color: !currentValue ? "orange" : "gray",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo cambiar el carácter obligatorio del formulario",
        color: "red",
      });
    }
  };

  const handleDeleteForm = (formId: string, formName: string) => {
    openDangerConfirm({
      title: "Eliminar formulario",
      message: `¿Estás seguro de que quieres eliminar "${formName}"?`,
      onConfirm: async () => {
        try {
          await deleteFormMutation.mutateAsync(formId);
          notifications.show({ title: "Formulario eliminado", message: `${formName} se ha eliminado correctamente`, color: "green" });
        } catch {
          notifications.show({ title: "Error", message: "No se pudo eliminar el formulario", color: "red" });
        }
      },
    });
  };

  const handleCopyForm = async (formTemplate: FormTemplate) => {
    try {
      await copyFormMutation.mutateAsync(formTemplate.id);
      notifications.show({
        title: "Plantilla copiada",
        message: `"${formTemplate.name}" se ha copiado a tu workspace y ya puedes editarla.`,
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo copiar el formulario",
        color: "red",
      });
    }
  };

  const openPreviewDrawer = (formTemplate: FormTemplate) => {
    setPreviewForm(formTemplate);
    openPreview();
  };

  const [sendOpened, { open: openSend, close: closeSend }] = useDisclosure(false);
  const [sendingForm, setSendingForm] = useState<FormTemplate | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const openSendDrawer = (formTemplate: FormTemplate) => {
    setSendingForm(formTemplate);
    setSelectedClientIds([]);
    openSend();
  };

  const handleSendForm = async () => {
    if (!sendingForm || selectedClientIds.length === 0) return;
    try {
      const results = await sendFormMutation.mutateAsync({
        form_id: sendingForm.id,
        client_ids: selectedClientIds,
      });
      const sent = Array.isArray(results)
        ? results.filter((r: { status: string }) => r.status === "sent").length
        : selectedClientIds.length;
      const already = Array.isArray(results)
        ? results.filter((r: { status: string }) => r.status === "already_pending").length
        : 0;
      notifications.show({
        title: "Formulario enviado",
        message:
          `Enviado a ${sent} cliente${sent === 1 ? "" : "s"}.` +
          (already > 0 ? ` ${already} ya tenían uno pendiente.` : ""),
        color: "green",
      });
      closeSend();
      setSendingForm(null);
      setSelectedClientIds([]);
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo enviar el formulario",
        color: "red",
      });
    }
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
    if (bytes < 1024 * 1024) return `${formatDecimal(bytes / 1024, 1)} KB`;
    return `${formatDecimal(bytes / (1024 * 1024), 1)} MB`;
  };

  const getFieldIcon = (type: FormField["type"]) => {
    const fieldType = fieldTypes.find((f) => f.value === type);
    return fieldType?.icon || IconTextSize;
  };

  const renderFormCard = (formTemplate: FormTemplate) => {
    const isSystem = formTemplate.is_global;
    return (
      <Card key={formTemplate.id} padding="lg" radius="lg" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap={6}>
            <Badge
              color={getFormTypeColor(formTemplate.type)}
              variant="light"
            >
              {getFormTypeLabel(formTemplate.type)}
            </Badge>
            {isSystem && (
              <Badge
                color="violet"
                variant="filled"
                size="sm"
                leftSection={<IconForms size={12} />}
              >
                Sistema
              </Badge>
            )}
          </Group>
          {isSystem ? (
            <Tooltip label="Las plantillas del sistema siempre están activas" withArrow>
              <Badge color="gray" variant="outline" size="sm">
                Plantilla
              </Badge>
            </Tooltip>
          ) : (
            <Tooltip
              label={formTemplate.is_active ? "Activo" : "Desactivado"}
              withArrow
            >
              <Switch
                checked={formTemplate.is_active}
                color="green"
                onChange={() =>
                  toggleFormActive(formTemplate.id, formTemplate.is_active)
                }
                size="sm"
              />
            </Tooltip>
          )}
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
          {formTemplate.is_required && (
            <Badge color="orange" size="xs" variant="filled">
              Obligatorio
            </Badge>
          )}
          {!isSystem && (
            <Badge size="xs" variant="light">
              {formTemplate.submissions_count} respuestas
            </Badge>
          )}
          <Badge size="xs" variant="light" color="gray">
            {formTemplate.fields.length} campos
          </Badge>
        </Group>

        {!isSystem && (
          <Group justify="space-between" mb="xs" gap="xs">
            <Text size="xs" c="dimmed">
              Marcar como obligatorio
            </Text>
            <Switch
              checked={formTemplate.is_required}
              color="orange"
              onChange={() =>
                toggleFormRequired(formTemplate.id, formTemplate.is_required)
              }
              size="sm"
            />
          </Group>
        )}

        <Divider mb="md" />

        {isSystem ? (
          <Group gap="xs">
            <Button
              flex={1}
              leftSection={<IconEye size={14} />}
              onClick={() => openPreviewDrawer(formTemplate)}
              size="xs"
              variant="light"
              color="violet"
            >
              Ver plantilla
            </Button>
            <Button
              flex={1}
              leftSection={<IconCopy size={14} />}
              onClick={() => handleCopyForm(formTemplate)}
              size="xs"
              variant="filled"
              loading={copyFormMutation.isPending}
            >
              Copiar y editar
            </Button>
          </Group>
        ) : (
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
            <ActionIcon
              color="blue"
              variant="light"
              onClick={() => openPreviewDrawer(formTemplate)}
              title="Previsualizar"
            >
              <IconEye size={16} />
            </ActionIcon>
            <ActionIcon
              color="green"
              variant="light"
              title="Enviar a clientes"
              onClick={() => openSendDrawer(formTemplate)}
            >
              <IconSend size={16} />
            </ActionIcon>
            <ActionIcon
              color="gray"
              variant="light"
              onClick={() => handleCopyForm(formTemplate)}
              loading={copyFormMutation.isPending}
              title="Duplicar"
            >
              <IconCopy size={16} />
            </ActionIcon>
            <ActionIcon
              color="red"
              loading={deleteFormMutation.isPending}
              onClick={() => handleDeleteForm(formTemplate.id, formTemplate.name)}
              variant="light"
              title="Eliminar"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        )}
      </Card>
    );
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

      {activeTab === "forms" && (
        <Group mb="lg">
          <Button
            variant="light"
            color="red"
            leftSection={<IconAlertTriangle size={16} />}
            onClick={openCanalDenuncias}
          >
            Canal de Denuncias
          </Button>
        </Group>
      )}

      {isMobile && (
        <Select
          data={[
            { value: "forms", label: "Formularios" },
            { value: "documents", label: "Documentos" },
            { value: "submissions", label: "Respuestas" },
          ]}
          mb="md"
          onChange={setActiveTab}
          radius="md"
          size="sm"
          value={activeTab}
        />
      )}
      <Tabs onChange={setActiveTab} value={activeTab}>
        {!isMobile && (
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
        )}

        <Tabs.Panel value="forms">
          {isLoadingForms ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height={200} radius="lg" />
              ))}
            </SimpleGrid>
          ) : forms.length > 0 ? (
            <Stack gap="xl">
              {systemForms.length > 0 && (
                <Box>
                  <Group gap="xs" mb="sm">
                    <Text fw={700} size="md">
                      Plantillas del sistema
                    </Text>
                    <Badge color="violet" variant="light" size="sm">
                      {systemForms.length}
                    </Badge>
                  </Group>
                  <Text c="dimmed" size="sm" mb="md">
                    Formularios predefinidos compartidos por toda la plataforma. No se
                    pueden editar, pero puedes copiarlos a tu workspace para personalizarlos.
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
                    {systemForms.map(renderFormCard)}
                  </SimpleGrid>
                </Box>
              )}

              <Box>
                <Group gap="xs" mb="sm">
                  <Text fw={700} size="md">
                    Mis formularios
                  </Text>
                  <Badge color="blue" variant="light" size="sm">
                    {workspaceForms.length}
                  </Badge>
                </Group>
                {workspaceForms.length > 0 ? (
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
                    {workspaceForms.map(renderFormCard)}
                  </SimpleGrid>
                ) : (
                  <EmptyState
                    actionLabel="Crear Formulario"
                    description="Crea tu primer formulario o copia una plantilla del sistema para empezar."
                    icon={<IconForms size={40} />}
                    onAction={() => openFormBuilder()}
                    title="Aún no tienes formularios propios"
                  />
                )}
              </Box>
            </Stack>
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
              <ScrollArea type="auto">
                <Table style={{ minWidth: 600 }}>
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
              </ScrollArea>
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
          {isLoadingSubmissions ? (
            <Paper p="xl" radius="lg" withBorder>
              <Group justify="center" py="xl">
                <IconLoader size={24} className="mantine-loader" />
                <Text c="dimmed">Cargando respuestas...</Text>
              </Group>
            </Paper>
          ) : submissions.length > 0 ? (
            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="md">
                Respuestas Recientes ({submissions.length})
              </Text>
              <ScrollArea type="auto">
                <Table style={{ minWidth: 600 }}>
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
                  {submissions.map((submission) => (
                    <Table.Tr key={submission.id}>
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
                            submission.status === "completed" || submission.status === "reviewed"
                              ? "green"
                              : submission.status === "submitted"
                                ? "red"
                                : submission.status === "read"
                                  ? "blue"
                                  : "yellow"
                          }
                          variant={submission.status === "submitted" ? "filled" : "light"}
                        >
                          {submission.status === "completed" || submission.status === "reviewed"
                            ? "Completado"
                            : submission.status === "submitted"
                              ? "Nueva"
                              : submission.status === "read"
                                ? "Leído"
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
                          <ActionIcon
                            color="blue"
                            variant="subtle"
                            title="Ver respuesta"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="green"
                            variant="subtle"
                            title="Descargar"
                            onClick={() => handleDownloadSubmission(submission)}
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                          {submission.status !== "completed" && submission.status !== "reviewed" && (
                            <ActionIcon
                              color="green"
                              variant="light"
                              title="Marcar como Completado"
                              loading={updateSubmissionMutation.isPending}
                              onClick={() => handleUpdateSubmissionStatus(submission.id, "completed")}
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                          )}
                          {submission.status !== "pending" && (
                            <ActionIcon
                              color="yellow"
                              variant="light"
                              title="Devolver a Pendiente"
                              loading={updateSubmissionMutation.isPending}
                              onClick={() => handleUpdateSubmissionStatus(submission.id, "pending")}
                            >
                              <IconRotateClockwise size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              </ScrollArea>
            </Paper>
          ) : (
            <EmptyState
              description="Cuando tus clientes respondan formularios, las respuestas aparecerán aquí."
              icon={<IconCheck size={40} />}
              title="No hay respuestas"
            />
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Form Preview Drawer (read-only, usado para plantillas del sistema) */}
      <Drawer
        onClose={closePreview}
        opened={previewOpened}
        position="right"
        size="lg"
        title={previewForm?.name || "Previsualización"}
      >
        {previewForm && (
          <ScrollArea h="calc(100vh - 180px)" offsetScrollbars>
            <Stack>
              <Paper p="md" radius="md" withBorder>
                <Group gap="xs" mb="sm">
                  <Badge color={getFormTypeColor(previewForm.type)} variant="light">
                    {getFormTypeLabel(previewForm.type)}
                  </Badge>
                  {previewForm.is_global && (
                    <Badge color="violet" variant="filled">
                      Plantilla del sistema
                    </Badge>
                  )}
                  {previewForm.send_on_onboarding && (
                    <Badge color="blue" variant="outline">
                      Onboarding
                    </Badge>
                  )}
                </Group>
                {previewForm.description && (
                  <Text c="dimmed" size="sm">
                    {previewForm.description}
                  </Text>
                )}
              </Paper>

              <Divider label={`${previewForm.fields.length} campos`} labelPosition="center" />

              <Stack gap="sm">
                {previewForm.fields.map((field, idx) => {
                  const FieldIcon = getFieldIcon(field.type);
                  return (
                    <Paper key={field.id || idx} p="md" radius="md" withBorder>
                      <Group gap="sm" mb="xs">
                        <ThemeIcon color="blue" size="sm" variant="light">
                          <FieldIcon size={12} />
                        </ThemeIcon>
                        <Text fw={500} size="sm">
                          {fieldTypes.find((f) => f.value === field.type)?.label || field.type}
                        </Text>
                        {field.required && (
                          <Badge size="xs" color="red" variant="light">
                            Obligatorio
                          </Badge>
                        )}
                      </Group>
                      <Text fw={600} size="sm" mb={4}>
                        {field.label || "(sin etiqueta)"}
                      </Text>
                      {field.placeholder && (
                        <Text c="dimmed" size="xs" mb="xs">
                          {field.placeholder}
                        </Text>
                      )}
                      {field.options && field.options.length > 0 && (
                        <Group gap={4} mt="xs">
                          {field.options.map((opt, i) => (
                            <Badge key={i} size="sm" variant="light">
                              {opt}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            </Stack>
          </ScrollArea>
        )}

        <Group
          justify="flex-end"
          mt="md"
          p="md"
          style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
        >
          <Button onClick={closePreview} variant="default">
            Cerrar
          </Button>
          {previewForm?.is_global && (
            <Button
              leftSection={<IconCopy size={16} />}
              loading={copyFormMutation.isPending}
              onClick={async () => {
                if (previewForm) {
                  await handleCopyForm(previewForm);
                  closePreview();
                }
              }}
            >
              Copiar a mi workspace
            </Button>
          )}
        </Group>
      </Drawer>

      {/* Submission Viewer Drawer */}
      <Drawer
        onClose={closeSubmissionViewer}
        opened={submissionViewerOpened}
        position="right"
        size="lg"
        title={viewingSubmission ? `Respuesta · ${viewingSubmission.form}` : "Respuesta"}
      >
        {viewingSubmission && (() => {
          const template = forms.find((f) => f.id === viewingSubmission.form_id);
          const answers = viewingSubmission.answers || {};
          const fields = template?.fields || [];
          return (
            <ScrollArea h="calc(100vh - 180px)" offsetScrollbars>
              <Stack>
                <Paper p="md" radius="md" withBorder>
                  <Group gap="xs" mb="xs">
                    <Badge color="yellow" variant="light">
                      {viewingSubmission.client}
                    </Badge>
                    <Badge color="gray" variant="light">
                      {viewingSubmission.date}
                    </Badge>
                    <Badge
                      color={
                        viewingSubmission.status === "completed" || viewingSubmission.status === "reviewed"
                          ? "green"
                          : viewingSubmission.status === "submitted"
                            ? "red"
                            : viewingSubmission.status === "read"
                              ? "blue"
                              : "yellow"
                      }
                      variant="light"
                    >
                      {viewingSubmission.status === "completed" || viewingSubmission.status === "reviewed"
                        ? "Completado"
                        : viewingSubmission.status === "submitted"
                          ? "Nueva"
                          : viewingSubmission.status === "read"
                            ? "Leído"
                            : "Pendiente"}
                    </Badge>
                  </Group>
                </Paper>

                {fields.length === 0 && Object.keys(answers).length === 0 ? (
                  <Text c="dimmed" ta="center" py="md">
                    Sin respuestas registradas
                  </Text>
                ) : (
                  <Stack gap="sm">
                    {(fields.length > 0 ? fields : Object.keys(answers).map((k, i) => ({ id: k, label: k, type: "text" as const, required: false, order: i }))).map((field) => {
                      const raw = answers[field.id] ?? answers[field.label];
                      const display = Array.isArray(raw)
                        ? raw.join(", ")
                        : raw === undefined || raw === null || raw === ""
                          ? "—"
                          : String(raw);
                      return (
                        <Paper key={field.id} p="sm" radius="md" withBorder>
                          <Text c="dimmed" fw={500} size="xs" tt="uppercase">
                            {field.label}
                          </Text>
                          <Text mt={4} style={{ whiteSpace: "pre-wrap" }}>
                            {display}
                          </Text>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </ScrollArea>
          );
        })()}

        <Group gap="xs" justify="flex-end" mt="md">
          <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={() => viewingSubmission && handleDownloadSubmission(viewingSubmission)}
          >
            Descargar
          </Button>
          {viewingSubmission && viewingSubmission.status !== "completed" && viewingSubmission.status !== "reviewed" && (
            <Button
              color="green"
              leftSection={<IconCheck size={16} />}
              loading={updateSubmissionMutation.isPending}
              onClick={async () => {
                await handleUpdateSubmissionStatus(viewingSubmission.id, "completed");
                setViewingSubmission({ ...viewingSubmission, status: "completed" });
              }}
            >
              Marcar como completado
            </Button>
          )}
        </Group>
      </Drawer>

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

      {/* Send Form Drawer */}
      <Drawer
        onClose={closeSend}
        opened={sendOpened}
        position="right"
        size="md"
        title={sendingForm ? `Enviar: ${sendingForm.name}` : "Enviar formulario"}
      >
        <Stack>
          <Text c="dimmed" size="sm">
            Selecciona los clientes a los que se les enviará este formulario.
            Recibirán una notificación y podrán responderlo desde su portal.
          </Text>
          {sendingForm?.is_required && (
            <Paper withBorder p="sm" radius="md" bg="orange.0">
              <Group gap={6}>
                <IconAlertTriangle color="orange" size={16} />
                <Text size="xs" c="orange.8" fw={500}>
                  Este formulario es obligatorio: generará una alerta persistente
                  hasta que el cliente lo complete.
                </Text>
              </Group>
            </Paper>
          )}

          <ScrollArea h={380} offsetScrollbars>
            <Stack gap="xs">
              {clientsList.map((c) => {
                const name =
                  c.full_name ||
                  [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                  c.email ||
                  c.id;
                return (
                  <Paper key={c.id} p="sm" radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                      <Box style={{ minWidth: 0 }}>
                        <Text fw={500} size="sm" truncate>
                          {name}
                        </Text>
                        {c.email && (
                          <Text c="dimmed" size="xs" truncate>
                            {c.email}
                          </Text>
                        )}
                      </Box>
                      <Checkbox
                        checked={selectedClientIds.includes(c.id)}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setSelectedClientIds((prev) =>
                            checked
                              ? [...prev, c.id]
                              : prev.filter((id) => id !== c.id)
                          );
                        }}
                      />
                    </Group>
                  </Paper>
                );
              })}
              {clientsList.length === 0 && (
                <Text c="dimmed" size="sm">
                  No hay clientes disponibles.
                </Text>
              )}
            </Stack>
          </ScrollArea>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {selectedClientIds.length} seleccionados
            </Text>
            <Group gap="xs">
              <Button
                variant="default"
                size="xs"
                onClick={() => setSelectedClientIds(clientsList.map((c) => c.id))}
              >
                Seleccionar todos
              </Button>
              <Button
                variant="default"
                size="xs"
                onClick={() => setSelectedClientIds([])}
              >
                Ninguno
              </Button>
            </Group>
          </Group>

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={closeSend}>
              Cancelar
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              disabled={selectedClientIds.length === 0}
              loading={sendFormMutation.isPending}
              onClick={handleSendForm}
            >
              Enviar ({selectedClientIds.length})
            </Button>
          </Group>
        </Stack>
      </Drawer>

      {/* Upload Document Modal */}
      <BottomSheet
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
      </BottomSheet>
    </Container>
  );
}

export default FormsPage;
