import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "../../services/api";

interface ClientReport {
  id: string;
  client_id: string;
  created_by: string | null;
  title: string | null;
  body: string;
  client_feedback: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  clientId: string;
}

export function ClientReportsTab({ clientId }: Props) {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery<ClientReport[]>({
    queryKey: ["client-reports", clientId],
    queryFn: async () => {
      const res = await clientsApi.listReports(clientId);
      return res.data;
    },
    enabled: !!clientId,
  });

  const form = useForm({
    initialValues: {
      title: "",
      body: "",
      client_feedback: "",
    },
    validate: {
      body: (v) => (v.trim().length < 1 ? "El contenido es obligatorio" : null),
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { title?: string; body: string; client_feedback?: string }) =>
      clientsApi.createReport(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-reports", clientId] });
      notifications.show({ title: "Reporte creado", message: "El reporte se ha guardado correctamente", color: "green" });
      close();
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: { title?: string; body?: string; client_feedback?: string } }) =>
      clientsApi.updateReport(clientId, reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-reports", clientId] });
      notifications.show({ title: "Reporte actualizado", message: "Los cambios se han guardado", color: "green" });
      close();
      form.reset();
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => clientsApi.deleteReport(clientId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-reports", clientId] });
      notifications.show({ title: "Reporte eliminado", message: "El reporte ha sido eliminado", color: "blue" });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    const payload = {
      title: values.title.trim() || undefined,
      body: values.body.trim(),
      client_feedback: values.client_feedback.trim() || undefined,
    };
    if (editId) {
      updateMutation.mutate({ reportId: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (report: ClientReport) => {
    setEditId(report.id);
    form.setValues({
      title: report.title || "",
      body: report.body,
      client_feedback: report.client_feedback || "",
    });
    open();
  };

  const handleNew = () => {
    setEditId(null);
    form.reset();
    open();
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={700} size="lg">
          Reportes de Revisión
        </Text>
        <Button leftSection={<IconPlus size={16} />} size="sm" onClick={handleNew}>
          Nueva revisión
        </Button>
      </Group>

      {(!reports || reports.length === 0) ? (
        <Text c="dimmed" ta="center" py="xl">
          No hay reportes de revisión para este cliente todavía.
        </Text>
      ) : (
        reports.map((report) => (
          <Card key={report.id} withBorder padding="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Group gap="sm">
                {report.title && <Text fw={600}>{report.title}</Text>}
                <Badge size="sm" variant="light" color="gray">
                  {new Date(report.created_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Badge>
              </Group>
              <Group gap={4}>
                <ActionIcon variant="subtle" size="sm" onClick={() => handleEdit(report)}>
                  <IconEdit size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="red"
                  onClick={() => {
                    if (window.confirm("¿Eliminar este reporte?")) {
                      deleteMutation.mutate(report.id);
                    }
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>

            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {report.body}
            </Text>

            {report.client_feedback && (
              <Box mt="sm" p="sm" style={{ background: "var(--mantine-color-blue-light)", borderRadius: 8 }}>
                <Text size="xs" fw={600} c="blue" mb={4}>
                  Feedback del cliente:
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {report.client_feedback}
                </Text>
              </Box>
            )}
          </Card>
        ))
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={editId ? "Editar reporte" : "Nuevo reporte de revisión"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Título (opcional)"
              placeholder="Ej: Revisión mensual - Marzo"
              {...form.getInputProps("title")}
            />
            <Textarea
              label="Notas de la revisión"
              placeholder="Has adelgazado 1.2kg, buen trabajo. Voy a subir el cardio 10 minutos más. El plan nutricional sigue igual porque estás respondiendo bien..."
              minRows={6}
              autosize
              required
              {...form.getInputProps("body")}
            />
            <Textarea
              label="Feedback del cliente (opcional)"
              placeholder="Lo que el cliente ha comentado sobre cómo se siente, adherencia, etc."
              minRows={3}
              autosize
              {...form.getInputProps("client_feedback")}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={close}>
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editId ? "Guardar cambios" : "Crear reporte"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
