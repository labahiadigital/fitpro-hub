import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FileInput,
  Group,
  Loader,
  MultiSelect,
  NumberInput,
  Paper,
  Radio,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconForms,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useMyForms,
  useRespondMyForm,
  type ClientFormItem,
  type FormField,
} from "../../hooks/useForms";

function renderField(
  field: FormField,
  value: unknown,
  onChange: (v: unknown) => void,
  disabled: boolean,
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
          <Group mt={6} gap="md">
            {(field.options || []).map((o) => (
              <Radio key={o} value={o} label={o} disabled={disabled} />
            ))}
          </Group>
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

export function SystemFormPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const respond = useRespondMyForm();
  const myForms = useMyForms();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const item: ClientFormItem | undefined = useMemo(
    () => (myForms.data || []).find((f) => f.submission_id === submissionId),
    [myForms.data, submissionId],
  );

  // Inicializar valores cuando llegan los datos del backend.
  useEffect(() => {
    if (!item) return;
    if (item.status === "submitted" && item.answers) {
      setValues({ ...item.answers });
    } else {
      setValues({ ...(item.prefill ?? {}) });
    }
  }, [item]);

  if (myForms.isLoading) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <Loader size="lg" />
          <Text c="dimmed" mt="md">Cargando cuestionario...</Text>
        </Paper>
      </Container>
    );
  }

  if (myForms.isError || !item) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <ThemeIcon color="red" mb="lg" mx="auto" radius="xl" size={80} variant="light">
            <IconAlertCircle size={40} />
          </ThemeIcon>
          <Title mb="sm" order={2}>
            Cuestionario no encontrado
          </Title>
          <Text c="dimmed" mb="xl">
            El enlace que has usado no es válido o ya no está disponible.
          </Text>
          <Button size="lg" onClick={() => navigate("/my-dashboard")}>
            Ir al panel
          </Button>
        </Paper>
      </Container>
    );
  }

  const isDone = item.status === "submitted" || submitted;

  const handleSubmit = async () => {
    const missing = item.fields.find(
      (f) =>
        f.required &&
        (values[f.id] === undefined ||
          values[f.id] === null ||
          values[f.id] === "" ||
          (Array.isArray(values[f.id]) && (values[f.id] as unknown[]).length === 0)),
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
      setSubmitted(true);
      notifications.show({
        title: "¡Cuestionario enviado!",
        message: "Te llevaremos a tu panel en unos segundos.",
        color: "green",
      });
      // Damos margen visual: 2.5s en la pantalla de éxito y luego al
      // dashboard. El backend ya ha encolado el segundo email.
      setTimeout(() => {
        navigate("/my-dashboard");
      }, 2500);
    } catch (e) {
      notifications.show({
        title: "Error",
        message: "No se pudo enviar el cuestionario. Inténtalo de nuevo.",
        color: "red",
      });
    }
  };

  if (isDone) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <ThemeIcon color="green" mb="lg" mx="auto" radius="xl" size={80} variant="light">
            <IconCheck size={40} />
          </ThemeIcon>
          <Title mb="sm" order={2}>
            ¡Listo!
          </Title>
          <Text c="dimmed" mb="xl">
            Tu cuestionario se ha enviado. Te hemos mandado un segundo email con
            los próximos pasos para acceder a tu plataforma.
          </Text>
          <Button size="lg" onClick={() => navigate("/my-dashboard")}>
            Ir a mi panel
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container py="xl" size="md">
      <Box mb="xl" ta="center">
        <ThemeIcon color="teal" radius="xl" size={56} mb="md" variant="light" mx="auto">
          <IconForms size={28} />
        </ThemeIcon>
        <Title mb="xs" order={2}>
          {item.form_name}
        </Title>
        {item.form_description && (
          <Text c="dimmed">
            {item.form_description}
          </Text>
        )}
      </Box>

      <Paper p="xl" radius="lg" withBorder>
        <Stack gap="md">
          {item.fields.map((f) => (
            <Box key={f.id}>
              {renderField(
                f,
                values[f.id],
                (v) => setValues((s) => ({ ...s, [f.id]: v })),
                false,
              )}
            </Box>
          ))}

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
          )}

          <Divider my="sm" />

          <Group justify="flex-end">
            <Button
              size="lg"
              onClick={handleSubmit}
              loading={respond.isPending}
              leftSection={<IconCheck size={18} />}
            >
              Enviar cuestionario
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
