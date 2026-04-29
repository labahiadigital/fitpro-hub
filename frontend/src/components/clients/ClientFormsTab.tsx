import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconClock,
  IconEye,
  IconFileText,
  IconForms,
  IconSend,
} from "@tabler/icons-react";
import {
  useForms,
  useClientForms,
  useSendForm,
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

interface ClientFormsTabProps {
  clientId: string;
  clientName?: string;
}

type SubmissionRow = {
  id: string;
  form_id: string;
  client_id: string;
  status: "pending" | "submitted" | "expired";
  answers: Record<string, unknown>;
  created_at: string;
  submitted_at?: string | null;
};

export function ClientFormsTab({ clientId, clientName }: ClientFormsTabProps) {
  const { data: formsData = [], isLoading: isLoadingForms } = useForms();
  const { data: submissions = [], isLoading: isLoadingSubmissions } =
    useClientForms(clientId);
  const sendForm = useSendForm();

  const [sendOpened, { open: openSend, close: closeSend }] = useDisclosure(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const [viewOpened, { open: openView, close: closeView }] = useDisclosure(false);
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionRow | null>(null);

  const forms = useMemo(() => {
    if (!Array.isArray(formsData)) return [];
    return formsData as Array<{
      id: string;
      name: string;
      is_active: boolean | string;
      fields: FormField[];
      is_required?: boolean;
      is_global?: boolean;
    }>;
  }, [formsData]);

  const formById = useMemo(() => {
    const map = new Map<string, (typeof forms)[number]>();
    forms.forEach((f) => map.set(f.id, f));
    return map;
  }, [forms]);

  // Solo se pueden enviar al cliente formularios PROPIOS del workspace.
  // Las plantillas del sistema (is_global=true) deben copiarse primero
  // a "Mis formularios" desde la pantalla de Formularios y, una vez
  // copiadas, ya forman parte del workspace y se pueden enviar.
  const sendableForms = useMemo(
    () =>
      forms.filter((f) => {
        const active = f.is_active === true || f.is_active === "Y" || f.is_active === "true";
        return active && !f.is_global;
      }),
    [forms]
  );

  const rows: SubmissionRow[] = useMemo(() => {
    if (!Array.isArray(submissions)) return [];
    return submissions as SubmissionRow[];
  }, [submissions]);

  const handleSend = async () => {
    if (!selectedFormId) return;
    try {
      await sendForm.mutateAsync({
        form_id: selectedFormId,
        client_ids: [clientId],
      });
      notifications.show({
        title: "Formulario enviado",
        message: clientName
          ? `Se ha enviado a ${clientName}.`
          : "Se ha enviado al cliente.",
        color: "green",
      });
      closeSend();
      setSelectedFormId(null);
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo enviar el formulario",
        color: "red",
      });
    }
  };

  const renderStatus = (status: SubmissionRow["status"]) => {
    if (status === "submitted") {
      return (
        <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
          Completado
        </Badge>
      );
    }
    if (status === "expired") {
      return (
        <Badge color="red" variant="light">
          Expirado
        </Badge>
      );
    }
    return (
      <Badge color="yellow" variant="light" leftSection={<IconClock size={12} />}>
        Pendiente
      </Badge>
    );
  };

  const viewingForm = viewingSubmission ? formById.get(viewingSubmission.form_id) : null;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Group gap="xs" mb={4}>
            <ThemeIcon color="indigo" variant="light" size="md">
              <IconForms size={16} />
            </ThemeIcon>
            <Text fw={600}>Formularios del cliente</Text>
          </Group>
          <Text c="dimmed" size="sm">
            Envía formularios al cliente y revisa sus respuestas aquí.
          </Text>
        </Box>
        <Button
          leftSection={<IconSend size={16} />}
          onClick={() => {
            setSelectedFormId(null);
            openSend();
          }}
        >
          Enviar formulario
        </Button>
      </Group>

      {isLoadingSubmissions || isLoadingForms ? (
        <Paper withBorder p="lg" radius="md">
          <Text c="dimmed" size="sm">
            Cargando formularios...
          </Text>
        </Paper>
      ) : rows.length === 0 ? (
        <Paper withBorder p="xl" radius="md">
          <Stack align="center" gap="xs">
            <ThemeIcon color="gray" size="xl" variant="light">
              <IconFileText size={22} />
            </ThemeIcon>
            <Text fw={600}>Aún no se han enviado formularios</Text>
            <Text c="dimmed" size="sm" ta="center">
              Cuando envíes un formulario al cliente aparecerá aquí con su estado.
            </Text>
            <Button
              leftSection={<IconSend size={16} />}
              mt="xs"
              onClick={() => {
                setSelectedFormId(null);
                openSend();
              }}
            >
              Enviar formulario
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Card withBorder radius="md" p={0}>
          <ScrollArea type="auto">
            <Table highlightOnHover style={{ minWidth: 720 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Formulario</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Enviado</Table.Th>
                  <Table.Th>Completado</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r) => {
                  const f = formById.get(r.form_id);
                  return (
                    <Table.Tr key={r.id}>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Text fw={500} size="sm" lineClamp={1}>
                            {f?.name || "Formulario"}
                          </Text>
                          {f?.is_required && (
                            <Badge color="orange" size="xs" variant="filled">
                              Obligatorio
                            </Badge>
                          )}
                          {f?.is_global && (
                            <Badge color="violet" size="xs" variant="light">
                              Sistema
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>{renderStatus(r.status)}</Table.Td>
                      <Table.Td>
                        <Text c="dimmed" size="sm">
                          {formatDate(r.created_at)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="dimmed" size="sm">
                          {r.submitted_at ? formatDate(r.submitted_at) : "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            title={
                              r.status === "submitted"
                                ? "Ver respuesta"
                                : "Ver detalles"
                            }
                            onClick={() => {
                              setViewingSubmission(r);
                              openView();
                            }}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Drawer: Enviar formulario */}
      <Drawer
        opened={sendOpened}
        onClose={closeSend}
        position="right"
        size="md"
        title="Enviar formulario al cliente"
      >
        <Stack>
          <Text c="dimmed" size="sm">
            Elige qué formulario quieres enviar
            {clientName ? ` a ${clientName}` : ""}. El cliente recibirá una
            notificación en su portal.
          </Text>
          {sendableForms.length === 0 ? (
            <Paper withBorder p="md" radius="md">
              <Stack gap={6}>
                <Text fw={600} size="sm">No tienes formularios propios todavía</Text>
                <Text size="xs" c="dimmed">
                  Sólo se pueden enviar al cliente formularios de tu workspace.
                  Las plantillas del sistema deben copiarse antes desde la
                  pantalla de Formularios.
                </Text>
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => {
                    closeSend();
                    window.location.assign("/forms");
                  }}
                >
                  Ir a Formularios
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Select
              label="Formulario"
              placeholder="Selecciona un formulario activo"
              searchable
              data={sendableForms.map((f) => ({
                value: f.id,
                label: f.is_required ? `${f.name} · Obligatorio` : f.name,
              }))}
              value={selectedFormId}
              onChange={setSelectedFormId}
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeSend}>
              Cancelar
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              disabled={!selectedFormId || sendableForms.length === 0}
              loading={sendForm.isPending}
              onClick={handleSend}
            >
              Enviar
            </Button>
          </Group>
        </Stack>
      </Drawer>

      {/* Modal: Ver respuestas */}
      <Modal
        opened={viewOpened}
        onClose={closeView}
        size="lg"
        title={viewingForm?.name || "Respuesta del formulario"}
      >
        {viewingSubmission && (
          <Stack>
            <Group gap="xs">
              {renderStatus(viewingSubmission.status)}
              <Text c="dimmed" size="xs">
                Enviado: {formatDate(viewingSubmission.created_at)}
              </Text>
              {viewingSubmission.submitted_at && (
                <Text c="dimmed" size="xs">
                  · Completado: {formatDate(viewingSubmission.submitted_at)}
                </Text>
              )}
            </Group>

            <Divider />

            {viewingSubmission.status !== "submitted" ? (
              <Paper withBorder p="md" radius="md">
                <Group gap="xs">
                  <IconClock size={16} />
                  <Text size="sm" c="dimmed">
                    El cliente aún no ha respondido este formulario.
                  </Text>
                </Group>
              </Paper>
            ) : (
              <Stack gap="sm">
                {(viewingForm?.fields || []).map((field) => {
                  const answer = viewingSubmission.answers?.[field.id];
                  return (
                    <Paper key={field.id} withBorder p="sm" radius="md">
                      <Text fw={600} size="sm" mb={4}>
                        {field.label}
                      </Text>
                      <Text size="sm">
                        {renderAnswer(answer)}
                      </Text>
                    </Paper>
                  );
                })}
                {(!viewingForm?.fields || viewingForm.fields.length === 0) && (
                  <Paper withBorder p="sm" radius="md">
                    <Text size="sm" c="dimmed">
                      {JSON.stringify(viewingSubmission.answers)}
                    </Text>
                  </Paper>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function renderAnswer(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

