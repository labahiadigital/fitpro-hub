import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconEdit,
  IconMailFast,
  IconPlus,
  IconTag,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { BottomSheet } from "../../components/common/BottomSheet";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import {
  CampaignTemplate,
  useCampaignTemplates,
  useCreateCampaignTemplate,
  useDeleteCampaignTemplate,
  useUpdateCampaignTemplate,
} from "../../hooks/useClientSegments";

const SEGMENT_OPTIONS = [
  { value: "abandoned_cart", label: "Carrito abandonado" },
  { value: "inactive", label: "Inactivos (cancelados)" },
  { value: "custom", label: "Personalizada" },
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "", label: "Sin descuento" },
  { value: "percent", label: "% Porcentaje" },
  { value: "amount", label: "€ Importe fijo" },
];

interface FormValues {
  name: string;
  subject: string;
  body_html: string;
  target_segment: string;
  discount_type: string;
  discount_value: number | "";
  discount_code: string;
  is_active: boolean;
}

const INITIAL_VALUES: FormValues = {
  name: "",
  subject: "",
  body_html: "",
  target_segment: "abandoned_cart",
  discount_type: "",
  discount_value: "",
  discount_code: "",
  is_active: true,
};

const PLACEHOLDER_BODY = `Hola {{name}}, \n\nTe escribimos para recordarte que… \n\nUn saludo,\nEl equipo`;

export function EmailTemplatesPage() {
  const [segmentFilter, setSegmentFilter] = useState<string>("");
  const { data, isLoading } = useCampaignTemplates(segmentFilter || undefined);
  const createMutation = useCreateCampaignTemplate();
  const updateMutation = useUpdateCampaignTemplate();
  const deleteMutation = useDeleteCampaignTemplate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  const form = useForm<FormValues>({
    initialValues: INITIAL_VALUES,
    validate: {
      name: (v) => (v.length < 2 ? "Nombre requerido" : null),
      subject: (v) => (v.length < 2 ? "Asunto requerido" : null),
      body_html: (v) => (v.length < 5 ? "Cuerpo requerido" : null),
    },
  });

  const handleNew = () => {
    setEditingId(null);
    form.setValues(INITIAL_VALUES);
    openModal();
  };

  const handleEdit = (tpl: CampaignTemplate) => {
    setEditingId(tpl.id);
    form.setValues({
      name: tpl.name,
      subject: tpl.subject,
      body_html: tpl.body_html,
      target_segment: tpl.target_segment || "abandoned_cart",
      discount_type: tpl.discount_type || "",
      discount_value: tpl.discount_value ?? "",
      discount_code: tpl.discount_code || "",
      is_active: tpl.is_active,
    });
    openModal();
  };

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      subject: values.subject,
      body_html: values.body_html,
      target_segment: values.target_segment,
      discount_type: values.discount_type || null,
      discount_value:
        values.discount_value === "" ? null : Number(values.discount_value),
      discount_code: values.discount_code || null,
      is_active: values.is_active,
    } as const;
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        notifications.show({ title: "Plantilla actualizada", message: values.name, color: "green" });
      } else {
        await createMutation.mutateAsync(payload as Omit<CampaignTemplate, "id" | "created_at">);
        notifications.show({ title: "Plantilla creada", message: values.name, color: "green" });
      }
      closeModal();
      form.reset();
      setEditingId(null);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      notifications.show({
        title: "Error al guardar",
        message: detail || "No se pudo guardar la plantilla.",
        color: "red",
      });
    }
  };

  const handleDelete = async (tpl: CampaignTemplate) => {
    if (!confirm(`¿Eliminar plantilla "${tpl.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(tpl.id);
      notifications.show({ title: "Plantilla eliminada", message: tpl.name, color: "green" });
    } catch {
      // Error handled by mutation
    }
  };

  const segmentLabel = (value: string) =>
    SEGMENT_OPTIONS.find((o) => o.value === value)?.label || value;

  const renderDiscount = (tpl: CampaignTemplate) => {
    if (!tpl.discount_value) return <Text size="xs" c="dimmed">—</Text>;
    if (tpl.discount_type === "percent") return <Badge color="grape" variant="light">-{tpl.discount_value}%</Badge>;
    return <Badge color="grape" variant="light">-{tpl.discount_value}€</Badge>;
  };

  return (
    <Container size="xl" py="md">
      <PageHeader
        title="Plantillas de email"
        description="Crea plantillas personalizadas para campañas de carrito abandonado y reactivación de clientes inactivos."
        action={
          <Button leftSection={<IconPlus size={16} />} radius="xl" onClick={handleNew}>
            Nueva plantilla
          </Button>
        }
      />

      <Box className="nv-card" p="md" mb="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconTag size={16} />
            <Text size="sm" fw={500}>Filtrar por segmento</Text>
          </Group>
          <Select
            data={[
              { value: "", label: "Todos" },
              ...SEGMENT_OPTIONS,
            ]}
            value={segmentFilter}
            onChange={(v) => setSegmentFilter(v || "")}
            placeholder="Todos"
            radius="md"
            clearable={false}
            w={220}
          />
        </Group>
      </Box>

      {isLoading ? (
        <Group justify="center" my="xl">
          <Loader />
        </Group>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<IconMailFast size={48} />}
          title="Sin plantillas"
          description="Crea tu primera plantilla para empezar a enviar campañas a tus clientes."
          actionLabel="Nueva plantilla"
          onAction={handleNew}
        />
      ) : (
        <Box className="nv-card" p={0} style={{ overflowX: "auto" }}>
          <Table verticalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Segmento</Table.Th>
                <Table.Th>Asunto</Table.Th>
                <Table.Th>Descuento</Table.Th>
                <Table.Th>Código</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data || []).map((tpl) => (
                <Table.Tr key={tpl.id}>
                  <Table.Td>
                    <Text fw={600}>{tpl.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="blue" variant="light">{segmentLabel(tpl.target_segment)}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1} maw={280}>{tpl.subject}</Text>
                  </Table.Td>
                  <Table.Td>{renderDiscount(tpl)}</Table.Td>
                  <Table.Td>
                    {tpl.discount_code ? (
                      <Text size="xs" ff="monospace">{tpl.discount_code}</Text>
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {tpl.is_active ? (
                      <Badge color="green" variant="light">Activa</Badge>
                    ) : (
                      <Badge color="gray" variant="light">Inactiva</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <Tooltip label="Editar">
                        <ActionIcon variant="subtle" onClick={() => handleEdit(tpl)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(tpl)}
                          loading={deleteMutation.isPending && deleteMutation.variables === tpl.id}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}

      <BottomSheet
        opened={modalOpened}
        onClose={() => {
          closeModal();
          setEditingId(null);
          form.reset();
        }}
        size="lg"
        title={editingId ? "Editar plantilla" : "Nueva plantilla"}
        radius="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Nombre interno"
              placeholder="Ej: Recordatorio carrito 24h"
              required
              radius="md"
              {...form.getInputProps("name")}
            />
            <Select
              label="Segmento objetivo"
              data={SEGMENT_OPTIONS}
              required
              radius="md"
              {...form.getInputProps("target_segment")}
            />
            <TextInput
              label="Asunto del email"
              placeholder="Ej: ¡Vuelve y disfruta de un 20%!"
              required
              radius="md"
              {...form.getInputProps("subject")}
            />
            <Textarea
              label="Cuerpo (HTML soportado)"
              placeholder={PLACEHOLDER_BODY}
              autosize
              minRows={6}
              maxRows={14}
              required
              radius="md"
              description="Variables disponibles: {{name}}"
              {...form.getInputProps("body_html")}
            />
            <Group grow>
              <Select
                label="Tipo de descuento"
                data={DISCOUNT_TYPE_OPTIONS}
                radius="md"
                {...form.getInputProps("discount_type")}
              />
              <NumberInput
                label="Valor"
                placeholder="0"
                min={0}
                radius="md"
                disabled={!form.values.discount_type}
                {...form.getInputProps("discount_value")}
              />
              <TextInput
                label="Código de cupón"
                placeholder="VUELVE20"
                radius="md"
                disabled={!form.values.discount_type}
                {...form.getInputProps("discount_code")}
              />
            </Group>
            <Switch
              label="Plantilla activa"
              {...form.getInputProps("is_active", { type: "checkbox" })}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  closeModal();
                  setEditingId(null);
                  form.reset();
                }}
                radius="xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                radius="xl"
                loading={createMutation.isPending || updateMutation.isPending}
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                  },
                }}
              >
                {editingId ? "Guardar cambios" : "Crear plantilla"}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}

export default EmailTemplatesPage;
