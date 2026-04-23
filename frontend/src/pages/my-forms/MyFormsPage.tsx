import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  FileInput,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Radio,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconFileText,
  IconForms,
} from "@tabler/icons-react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  useMyForms,
  useRespondMyForm,
  type ClientFormItem,
  type FormField,
} from "../../hooks/useForms";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function renderField(
  field: FormField,
  value: unknown,
  onChange: (v: unknown) => void,
  disabled: boolean
) {
  const common = {
    label: field.label,
    placeholder: field.placeholder,
    required: field.required,
    disabled,
  };

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          {...common}
          minRows={3}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      );
    case "number":
      return (
        <NumberInput
          {...common}
          value={(value as number) ?? ""}
          onChange={(v) => onChange(v)}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );
    case "date":
      return (
        <DateInput
          {...common}
          value={value ? new Date(value as string) : null}
          onChange={(d) =>
            onChange(d ? new Date(d).toISOString().slice(0, 10) : null)
          }
          valueFormat="DD/MM/YYYY"
        />
      );
    case "select":
      return (
        <Select
          {...common}
          data={(field.options || []).map((o) => ({ value: o, label: o }))}
          value={(value as string) || null}
          onChange={(v) => onChange(v)}
          searchable
        />
      );
    case "multiselect":
      return (
        <MultiSelect
          {...common}
          data={(field.options || []).map((o) => ({ value: o, label: o }))}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(v) => onChange(v)}
          searchable
          clearable
        />
      );
    case "checkbox":
      return (
        <Checkbox.Group
          label={field.label}
          withAsterisk={field.required}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(v) => onChange(v)}
        >
          <Stack gap={6} mt={6}>
            {(field.options || []).map((o) => (
              <Checkbox key={o} value={o} label={o} disabled={disabled} />
            ))}
          </Stack>
        </Checkbox.Group>
      );
    case "radio":
      return (
        <Radio.Group
          label={field.label}
          withAsterisk={field.required}
          value={(value as string) || ""}
          onChange={(v) => onChange(v)}
        >
          <Stack gap={6} mt={6}>
            {(field.options || []).map((o) => (
              <Radio key={o} value={o} label={o} disabled={disabled} />
            ))}
          </Stack>
        </Radio.Group>
      );
    case "file":
      return (
        <FileInput
          {...common}
          value={value instanceof File ? value : null}
          onChange={(f) => onChange(f)}
        />
      );
    case "email":
    case "phone":
    case "text":
    default:
      return (
        <TextInput
          {...common}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      );
  }
}

interface FormRespondCardProps {
  item: ClientFormItem;
}

function FormRespondCard({ item }: FormRespondCardProps) {
  const respond = useRespondMyForm();
  // Pre-rellenamos con las respuestas previas (si ya se envió) o con los
  // valores sugeridos por el backend a partir del perfil del cliente
  // (alergias e intolerancias ya declaradas en el onboarding, etc).
  const initialValues = useMemo<Record<string, unknown>>(() => {
    if (item.status === "submitted" && item.answers) {
      return { ...item.answers };
    }
    return { ...(item.prefill ?? {}) };
  }, [item.status, item.answers, item.prefill]);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const isDone = item.status === "submitted";

  const handleSubmit = async () => {
    const missing = item.fields.find(
      (f) =>
        f.required &&
        (values[f.id] === undefined ||
          values[f.id] === null ||
          values[f.id] === "" ||
          (Array.isArray(values[f.id]) && (values[f.id] as unknown[]).length === 0))
    );
    if (missing) {
      setError(`Completa el campo obligatorio: "${missing.label}"`);
      return;
    }
    setError(null);
    try {
      await respond.mutateAsync({
        submissionId: item.submission_id,
        answers: values,
      });
      notifications.show({
        title: "Formulario enviado",
        message: "Tu respuesta se ha registrado correctamente.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo enviar el formulario. Inténtalo de nuevo.",
        color: "red",
      });
    }
  };

  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="xs">
        <Group gap="xs" wrap="nowrap">
          <ThemeIcon color="indigo" variant="light" size="md">
            <IconForms size={18} />
          </ThemeIcon>
          <Text fw={700} size="md">
            {item.form_name}
          </Text>
          {item.is_required && (
            <Badge color="red" variant="filled">
              Obligatorio
            </Badge>
          )}
        </Group>
        {isDone ? (
          <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
            Completado
          </Badge>
        ) : (
          <Badge color="yellow" variant="light" leftSection={<IconClock size={12} />}>
            Pendiente
          </Badge>
        )}
      </Group>

      {item.form_description && (
        <Text c="dimmed" size="sm" mb="sm">
          {item.form_description}
        </Text>
      )}

      <Text c="dimmed" size="xs" mb="md">
        Recibido: {formatDate(item.created_at)}
        {item.submitted_at ? ` · Respondido: ${formatDate(item.submitted_at)}` : ""}
      </Text>

      <Divider mb="md" />

      {isDone ? (
        <Stack gap="md">
          <Alert color="green" icon={<IconCheck size={16} />}>
            Ya has respondido este formulario. Puedes revisar tus respuestas abajo.
          </Alert>
          {item.fields.map((f) => (
            <Box key={f.id}>
              {renderField(
                f,
                values[f.id],
                () => undefined,
                true,
              )}
            </Box>
          ))}
        </Stack>
      ) : (
        <Stack gap="md">
          {item.fields.map((f) => (
            <Box key={f.id}>
              {renderField(
                f,
                values[f.id],
                (v) => setValues((prev) => ({ ...prev, [f.id]: v })),
                respond.isPending
              )}
            </Box>
          ))}
          {error && (
            <Alert color="red" icon={<IconAlertTriangle size={16} />}>
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              loading={respond.isPending}
              onClick={handleSubmit}
              leftSection={<IconCheck size={16} />}
            >
              Enviar respuesta
            </Button>
          </Group>
        </Stack>
      )}
    </Card>
  );
}

export function MyFormsPage() {
  const [tab, setTab] = useState<string | null>("pending");
  const { data: forms = [], isLoading } = useMyForms();

  const pending = useMemo(
    () => forms.filter((f) => f.status !== "submitted"),
    [forms]
  );
  const done = useMemo(
    () => forms.filter((f) => f.status === "submitted"),
    [forms]
  );
  const requiredPending = useMemo(
    () => pending.filter((f) => f.is_required),
    [pending]
  );

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title="Formularios"
        description="Formularios que tu entrenador te ha compartido."
      />

      {requiredPending.length > 0 && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          mb="lg"
          title={`Tienes ${requiredPending.length} formulario${requiredPending.length === 1 ? "" : "s"} obligatorio${requiredPending.length === 1 ? "" : "s"} pendiente${requiredPending.length === 1 ? "" : "s"}`}
        >
          Son requeridos por tu entrenador. Por favor, complétalos lo antes posible.
        </Alert>
      )}

      <Tabs value={tab} onChange={setTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab
            value="pending"
            leftSection={<IconClock size={14} />}
            rightSection={
              pending.length > 0 ? (
                <Badge size="xs" color="yellow" variant="filled">
                  {pending.length}
                </Badge>
              ) : null
            }
          >
            Pendientes
          </Tabs.Tab>
          <Tabs.Tab value="done" leftSection={<IconCheck size={14} />}>
            Completados
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pending">
          {isLoading ? (
            <Paper withBorder p="lg" radius="md">
              <Text c="dimmed" size="sm">
                Cargando...
              </Text>
            </Paper>
          ) : pending.length === 0 ? (
            <Paper withBorder p="xl" radius="md">
              <Stack align="center" gap="xs">
                <ThemeIcon color="gray" size="xl" variant="light">
                  <IconFileText size={22} />
                </ThemeIcon>
                <Text fw={600}>No tienes formularios pendientes</Text>
                <Text c="dimmed" size="sm">
                  Cuando tu entrenador te envíe uno lo verás aquí.
                </Text>
              </Stack>
            </Paper>
          ) : (
            <Stack gap="lg">
              <ScrollArea>
                <Stack gap="lg">
                  {pending.map((f) => (
                    <FormRespondCard key={f.submission_id} item={f} />
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="done">
          {done.length === 0 ? (
            <Paper withBorder p="xl" radius="md">
              <Stack align="center" gap="xs">
                <ThemeIcon color="gray" size="xl" variant="light">
                  <IconCheck size={22} />
                </ThemeIcon>
                <Text fw={600}>Todavía no hay formularios completados</Text>
              </Stack>
            </Paper>
          ) : (
            <Stack gap="lg">
              {done.map((f) => (
                <FormRespondCard key={f.submission_id} item={f} />
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

export default MyFormsPage;
