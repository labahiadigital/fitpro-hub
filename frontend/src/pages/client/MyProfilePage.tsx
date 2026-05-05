import {
  Box,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Button,
  TextInput,
  PasswordInput,
  Avatar,
  SimpleGrid,
  Paper,
  Badge,
  Divider,
  Switch,
  Table,
  Loader,
  Alert,
  ThemeIcon,
  FileButton,
  ActionIcon,
  Tooltip,
  NumberInput,
  SegmentedControl,
} from "@mantine/core";
import { MonthPickerInput } from "@mantine/dates";
import {
  IconCamera,
  IconMail,
  IconPhone,
  IconUser,
  IconLock,
  IconBell,
  IconPalette,
  IconCreditCard,
  IconCalendar,
  IconReceipt,
  IconAlertCircle,
  IconX,
  IconCheck,
  IconDownload,
  IconPlayerPause,
  IconPlayerPlay,
  IconFileDownload,
} from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useAuthStore } from "../../stores/auth";
import { authApi, clientPortalApi, notificationsApi } from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { NativeBottomSheet } from "../../components/common/NativeBottomSheet";
import {
  PasswordRulesIndicator,
  passwordValidator,
} from "../../components/common/PasswordRulesIndicator";

interface SubscriptionPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  paid_at: string | null;
  created_at: string;
}

interface SubscriptionData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  card_last4: string | null;
  card_brand: string | null;
  payment_method: string | null;
  payments: SubscriptionPayment[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrencyLocal(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

const intervalLabels: Record<string, string> = {
  week: "semana",
  biweekly: "quincenal",
  month: "mes",
  quarter: "trimestre",
  semester: "semestre",
  year: "año",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "green" },
  past_due: { label: "Pago pendiente", color: "orange" },
  cancelled: { label: "Cancelada", color: "red" },
  trialing: { label: "Periodo de prueba", color: "blue" },
  paused: { label: "Pausada", color: "gray" },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  succeeded: { label: "Pagado", color: "green" },
  pending: { label: "Pendiente", color: "yellow" },
  failed: { label: "Fallido", color: "red" },
  refunded: { label: "Devuelto", color: "gray" },
};

async function _downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function SubscriptionSection() {
  const queryClient = useQueryClient();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseUnit, setPauseUnit] = useState<"days" | "months">("days");
  const [pauseAmount, setPauseAmount] = useState<number>(7);
  const [bulkFrom, setBulkFrom] = useState<Date | null>(null);
  const [bulkTo, setBulkTo] = useState<Date | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: subscription, isLoading } = useQuery<SubscriptionData | null>({
    queryKey: ["my-subscription"],
    queryFn: async () => {
      const res = await clientPortalApi.subscription();
      return res.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => clientPortalApi.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      setCancelModalOpen(false);
      notifications.show({
        title: "Suscripción cancelada",
        message: "Tu acceso continuará hasta el fin del periodo actual.",
        color: "blue",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo cancelar la suscripción. Inténtalo de nuevo.",
        color: "red",
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (vars: { id: string; data: { duration_days?: number; duration_months?: number } }) =>
      clientPortalApi.pauseSubscription(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      setPauseModalOpen(false);
      notifications.show({
        title: "Suscripción pausada",
        message: "Tu suscripción se reanudará automáticamente al finalizar la pausa.",
        color: "blue",
      });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      notifications.show({
        title: "No se pudo pausar",
        message: err?.response?.data?.detail || "Inténtalo de nuevo.",
        color: "red",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => clientPortalApi.resumeSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      notifications.show({
        title: "Suscripción reanudada",
        message: "Vuelves a tener acceso completo.",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo reanudar la suscripción.",
        color: "red",
      });
    },
  });

  async function handleDownloadInvoice(paymentId: string): Promise<void> {
    setDownloadingId(paymentId);
    try {
      const res = await clientPortalApi.downloadInvoicePdf(paymentId);
      await _downloadBlob(res.data, `Factura_${paymentId.slice(0, 8)}.pdf`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: "No se pudo descargar la factura",
        message: e?.response?.data?.detail || "Inténtalo de nuevo más tarde.",
        color: "red",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDownloadBulk(): Promise<void> {
    const fmt = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : undefined);
    try {
      const res = await clientPortalApi.downloadInvoicesBulk({ date_from: fmt(bulkFrom), date_to: fmt(bulkTo) });
      const tag = `${fmt(bulkFrom) || "inicio"}_a_${fmt(bulkTo) || "hoy"}`;
      await _downloadBlob(res.data, `Mis_Facturas_${tag}.pdf`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: "No se pudo descargar el PDF combinado",
        message: e?.response?.data?.detail || "Comprueba el periodo seleccionado.",
        color: "red",
      });
    }
  }

  if (isLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group justify="center" p="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">Cargando suscripción...</Text>
        </Group>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group mb="md">
          <IconCreditCard size={20} />
          <Text fw={600}>Mi Suscripción</Text>
        </Group>
        <Text size="sm" c="dimmed">No tienes una suscripción activa.</Text>
      </Card>
    );
  }

  const sub = subscription;
  const stConfig = statusConfig[sub.status] || { label: sub.status, color: "gray" };

  return (
    <>
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group justify="space-between" mb="lg">
          <Group>
            <IconCreditCard size={20} />
            <Text fw={600}>Mi Suscripción</Text>
          </Group>
          <Badge color={stConfig.color} variant="light" size="lg">
            {stConfig.label}
          </Badge>
        </Group>

        <Paper p="md" radius="md" withBorder mb="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text fw={700} size="lg">{sub.name}</Text>
              {sub.description && (
                <Text size="sm" c="dimmed" mt={4}>{sub.description}</Text>
              )}
            </Box>
            <Box ta="right">
              <Text fw={700} size="xl" style={{ lineHeight: 1 }}>
                {formatCurrencyLocal(sub.amount, sub.currency)}
              </Text>
              <Text size="sm" c="dimmed">
                /{intervalLabels[sub.interval] || sub.interval}
              </Text>
            </Box>
          </Group>
        </Paper>

        <SimpleGrid cols={2} spacing="md" mb="md">
          <Paper p="sm" radius="md" withBorder>
            <Group gap="xs" mb={4}>
              <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">Fecha inicio</Text>
            </Group>
            <Text size="sm" fw={500}>{formatDate(sub.current_period_start)}</Text>
          </Paper>
          <Paper p="sm" radius="md" withBorder>
            <Group gap="xs" mb={4}>
              <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">Próximo cobro</Text>
            </Group>
            <Text size="sm" fw={500}>{formatDate(sub.current_period_end)}</Text>
          </Paper>
        </SimpleGrid>

        {sub.card_last4 && (
          <Paper p="sm" radius="md" withBorder mb="md">
            <Group>
              <ThemeIcon variant="light" color="gray" size="md" radius="md">
                <IconCreditCard size={16} />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={500}>
                  {sub.card_brand || "Tarjeta"} ····{sub.card_last4}
                </Text>
                <Text size="xs" c="dimmed">Método de pago</Text>
              </Box>
            </Group>
          </Paper>
        )}

        {sub.status === "cancelled" && sub.cancelled_at && (
          <Alert color="orange" variant="light" mb="md" icon={<IconAlertCircle size={16} />}>
            Suscripción cancelada el {formatDate(sub.cancelled_at)}.
            {sub.current_period_end && (
              <> Tu acceso continúa hasta el {formatDate(sub.current_period_end)}.</>
            )}
          </Alert>
        )}

        {sub.payments && sub.payments.length > 0 && (
          <>
            <Divider mb="md" />
            <Group mb="sm">
              <IconReceipt size={16} />
              <Text size="sm" fw={600}>Historial de pagos</Text>
            </Group>
            <Table striped highlightOnHover withTableBorder withColumnBorders={false} fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Descripción</Table.Th>
                  <Table.Th ta="right">Importe</Table.Th>
                  <Table.Th ta="center">Estado</Table.Th>
                  <Table.Th ta="center">Factura</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sub.payments.map((p) => {
                  const pConfig = paymentStatusConfig[p.status] || { label: p.status, color: "gray" };
                  const canDownload = p.status === "succeeded";
                  return (
                    <Table.Tr key={p.id}>
                      <Table.Td>{formatDate(p.paid_at || p.created_at)}</Table.Td>
                      <Table.Td>{p.description || "Pago de suscripción"}</Table.Td>
                      <Table.Td ta="right" fw={500}>{formatCurrencyLocal(p.amount, p.currency)}</Table.Td>
                      <Table.Td ta="center">
                        <Badge size="sm" color={pConfig.color} variant="light">{pConfig.label}</Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        {canDownload ? (
                          <Tooltip label="Descargar factura">
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              loading={downloadingId === p.id}
                              onClick={() => handleDownloadInvoice(p.id)}
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Tooltip>
                        ) : (
                          <Text size="xs" c="dimmed">—</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </>
        )}

        {/* Mis facturas: descargar todas las facturas en un PDF único */}
        <Divider mt="md" mb="md" />
        <Group mb="sm">
          <IconFileDownload size={16} />
          <Text size="sm" fw={600}>Mis facturas</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="sm">
          Selecciona el periodo y descarga todas tus facturas pagadas en un único PDF.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <MonthPickerInput
            label="Desde"
            value={bulkFrom}
            onChange={(value) => setBulkFrom(value as Date | null)}
            placeholder="Inicio"
            clearable
            valueFormat="MM/YYYY"
            maxDate={new Date()}
          />
          <MonthPickerInput
            label="Hasta"
            value={bulkTo}
            onChange={(value) => setBulkTo(value as Date | null)}
            placeholder="Hoy"
            clearable
            valueFormat="MM/YYYY"
            maxDate={new Date()}
          />
          <Button
            mt={{ base: 0, sm: 24 }}
            leftSection={<IconFileDownload size={16} />}
            onClick={handleDownloadBulk}
            disabled={!sub.payments || sub.payments.length === 0}
          >
            Descargar PDF combinado
          </Button>
        </SimpleGrid>

        {sub.status === "active" && (
          <>
            <Divider mt="md" mb="md" />
            <Group justify="flex-start" gap="sm">
              <Button
                variant="light"
                color="blue"
                size="xs"
                leftSection={<IconPlayerPause size={14} />}
                onClick={() => setPauseModalOpen(true)}
              >
                Pausar suscripción
              </Button>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => setCancelModalOpen(true)}
              >
                Cancelar suscripción
              </Button>
            </Group>
          </>
        )}

        {sub.status === "paused" && (
          <>
            <Divider mt="md" mb="md" />
            <Alert color="blue" variant="light" mb="sm" icon={<IconAlertCircle size={16} />}>
              Tu suscripción está pausada. Reanudará automáticamente cuando termine la pausa.
            </Alert>
            <Button
              variant="filled"
              color="green"
              size="xs"
              leftSection={<IconPlayerPlay size={14} />}
              onClick={() => resumeMutation.mutate(sub.id)}
              loading={resumeMutation.isPending}
            >
              Reanudar ahora
            </Button>
          </>
        )}
      </Card>

      <NativeBottomSheet
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancelar suscripción"
      >
        <Stack gap="md">
          <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />}>
            Al cancelar tu suscripción, tu acceso continuará hasta el{" "}
            <Text span fw={700}>{formatDate(sub.current_period_end)}</Text>.
            Después de esa fecha, no se realizarán más cobros.
          </Alert>
          <Text size="sm" c="dimmed">
            Si cambias de opinión, podrás reactivar tu suscripción contactando con tu entrenador.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelModalOpen(false)}>
              Mantener suscripción
            </Button>
            <Button
              color="red"
              onClick={() => cancelMutation.mutate()}
              loading={cancelMutation.isPending}
              leftSection={<IconX size={16} />}
            >
              Confirmar cancelación
            </Button>
          </Group>
        </Stack>
      </NativeBottomSheet>

      <NativeBottomSheet
        opened={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        title="Pausar suscripción"
      >
        <Stack gap="md">
          <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
            Mientras esté pausada no se realizarán cobros y tu plan quedará suspendido.
            La suscripción se reanudará automáticamente al finalizar el periodo seleccionado.
          </Alert>
          <SegmentedControl
            value={pauseUnit}
            onChange={(v) => setPauseUnit(v as "days" | "months")}
            data={[
              { label: "Días", value: "days" },
              { label: "Meses", value: "months" },
            ]}
          />
          <NumberInput
            label={`Pausar durante ${pauseUnit === "days" ? "X días" : "X meses"}`}
            value={pauseAmount}
            onChange={(v) => setPauseAmount(typeof v === "number" ? v : 1)}
            min={1}
            max={pauseUnit === "days" ? 180 : 6}
            allowDecimal={false}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPauseModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="blue"
              loading={pauseMutation.isPending}
              leftSection={<IconPlayerPause size={16} />}
              onClick={() =>
                pauseMutation.mutate({
                  id: sub.id,
                  data: pauseUnit === "days" ? { duration_days: pauseAmount } : { duration_months: pauseAmount },
                })
              }
            >
              Confirmar pausa
            </Button>
          </Group>
        </Stack>
      </NativeBottomSheet>
    </>
  );
}

type ChannelPref = { email: boolean; in_app: boolean };
type NotificationPrefs = Record<string, ChannelPref>;

const NOTIF_CATEGORIES: Array<{
  title: string;
  items: Array<{ key: string; label: string; desc: string }>;
}> = [
  {
    title: "Reservas y citas",
    items: [
      { key: "booking_created", label: "Nuevas citas", desc: "Cuando se te agenda una nueva sesión" },
      { key: "booking_cancelled", label: "Cancelaciones", desc: "Cuando se cancela una de tus citas" },
      { key: "booking_modified", label: "Modificaciones", desc: "Cuando se modifica una cita existente" },
      { key: "booking_reminder", label: "Recordatorios", desc: "Recordatorio antes de tus citas" },
    ],
  },
  {
    title: "Seguimiento y progreso",
    items: [
      { key: "progress_registered", label: "Registro de progreso", desc: "Confirmación al registrar tu progreso" },
      { key: "milestone_reached", label: "Hitos alcanzados", desc: "Cuando alcances un objetivo importante" },
      { key: "weekly_comparison", label: "Comparativa semanal", desc: "Resumen comparativo entre semanas" },
    ],
  },
  {
    title: "Entrenamientos y nutrición",
    items: [
      { key: "meal_reminder", label: "Recordatorio de comidas", desc: "Recuerda registrar tus comidas" },
      { key: "workout_reminder", label: "Recordatorio de entreno", desc: "Recuerda realizar tu entrenamiento" },
      { key: "supplement_alert", label: "Alerta de suplementos", desc: "Alertas sobre comidas o suplementos" },
      { key: "plan_updated", label: "Cambios en tu plan", desc: "Cuando se actualiza tu rutina o plan" },
    ],
  },
  {
    title: "Pagos y facturas",
    items: [
      { key: "payment_received", label: "Pagos recibidos", desc: "Confirmación al procesarse un pago" },
      { key: "payment_invoice", label: "Facturas", desc: "Cuando se genera una factura" },
    ],
  },
  {
    title: "Comunicaciones",
    items: [
      { key: "new_message", label: "Mensajes", desc: "Cuando tu entrenador te envía un mensaje" },
      { key: "promotion", label: "Promociones", desc: "Ofertas y promociones de tu centro" },
    ],
  },
  {
    title: "Documentos",
    items: [
      { key: "form_pending", label: "Formularios pendientes", desc: "Formularios que debes completar" },
      { key: "consent_pending", label: "Consentimientos", desc: "Consentimientos legales pendientes" },
      { key: "survey_pending", label: "Encuestas", desc: "Encuestas de satisfacción pendientes" },
    ],
  },
];

function NotificationsSection() {
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useQuery<NotificationPrefs>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await notificationsApi.getPreferences();
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      notificationsApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudieron guardar las preferencias",
        color: "red",
      });
    },
  });

  const handleToggle = (key: string, channel: "email" | "in_app", value: boolean) => {
    updateMutation.mutate({ [key]: { [channel]: value } });
  };

  if (isLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group justify="center" p="md"><Loader size="sm" /></Group>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group mb="lg">
        <IconBell size={20} />
        <Text fw={600}>Notificaciones</Text>
      </Group>

      <Group justify="flex-end" mb="sm" gap="lg" pr={4}>
        <Group gap={4}>
          <IconMail size={14} />
          <Text size="xs" fw={600} c="dimmed">Email</Text>
        </Group>
        <Group gap={4}>
          <IconBell size={14} />
          <Text size="xs" fw={600} c="dimmed">App</Text>
        </Group>
      </Group>

      <Stack gap="lg">
        {NOTIF_CATEGORIES.map((cat) => (
          <Box key={cat.title}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="xs">{cat.title}</Text>
            <Stack gap={6}>
              {cat.items.map((item) => {
                const pref = prefs?.[item.key] as ChannelPref | undefined;
                return (
                  <Group key={item.key} justify="space-between" wrap="nowrap" gap="xs">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} lineClamp={1}>{item.label}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{item.desc}</Text>
                    </Box>
                    <Group gap="lg" wrap="nowrap" style={{ flexShrink: 0 }}>
                      <Switch
                        size="xs"
                        color="yellow"
                        checked={pref?.email ?? true}
                        onChange={(e) => handleToggle(item.key, "email", e.currentTarget.checked)}
                      />
                      <Switch
                        size="xs"
                        color="yellow"
                        checked={pref?.in_app ?? true}
                        onChange={(e) => handleToggle(item.key, "in_app", e.currentTarget.checked)}
                      />
                    </Group>
                  </Group>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Card>
  );
}

export function MyProfilePage() {
  const { user, currentWorkspace } = useAuthStore();
  const [passwordModalOpened, { open: openPasswordModal, close: closePasswordModal }] = useDisclosure(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const profileForm = useForm({
    initialValues: {
      full_name: user?.full_name || "",
      phone: "",
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.setFieldValue("full_name", user.full_name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.full_name]);

  const { data: profileData } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const res = await clientPortalApi.profile();
      return res.data;
    },
  });

  useEffect(() => {
    if (profileData?.phone) {
      profileForm.setFieldValue("phone", profileData.phone || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.phone]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { first_name?: string; last_name?: string; phone?: string }) =>
      clientPortalApi.updateProfile(data),
    onSuccess: (_res, variables) => {
      const parts = [variables.first_name, variables.last_name].filter(Boolean);
      if (parts.length > 0) {
        useAuthStore.getState().setUser({
          ...useAuthStore.getState().user!,
          full_name: parts.join(" "),
        });
      }
      notifications.show({
        title: "Perfil actualizado",
        message: "Tus datos han sido guardados correctamente.",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudieron guardar los cambios.",
        color: "red",
      });
    },
  });

  const handleSaveProfile = () => {
    const fullName = profileForm.values.full_name.trim();
    const parts = fullName.split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    updateProfileMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone: profileForm.values.phone || undefined,
    });
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await clientPortalApi.uploadAvatar(formData);
      const avatarUrl = (res.data as { avatar_url: string }).avatar_url;
      useAuthStore.getState().setUser({
        ...useAuthStore.getState().user!,
        avatar_url: avatarUrl,
      });
      notifications.show({
        title: "Foto actualizada",
        message: "Tu foto de perfil se ha cambiado correctamente.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo subir la foto. Inténtalo de nuevo.",
        color: "red",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const changePasswordForm = useForm({
    initialValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
    validate: {
      current_password: (v) => (!v ? "Introduce tu contraseña actual" : null),
      new_password: passwordValidator,
      confirm_password: (v, values) =>
        v !== values.new_password ? "Las contraseñas no coinciden" : null,
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      authApi.changePassword(data.current_password, data.new_password),
    onSuccess: () => {
      changePasswordForm.reset();
      closePasswordModal();
      notifications.show({
        title: "Contraseña actualizada",
        message: "Tu contraseña ha sido cambiada correctamente.",
        color: "green",
      });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      const detail =
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "No se pudo cambiar la contraseña.";
      notifications.show({ title: "Error", message: detail, color: "red" });
    },
  });

  const changeEmailForm = useForm({
    initialValues: { new_email: "", password: "" },
    validate: {
      new_email: (value) =>
        !value
          ? "El nuevo email es obligatorio"
          : !/^\S+@\S+\.\S+$/.test(value)
            ? "Introduce un email válido"
            : value === user?.email
              ? "El nuevo email debe ser distinto al actual"
              : null,
      password: (value) => (!value ? "La contraseña es obligatoria" : null),
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: (data: { new_email: string; password: string }) =>
      authApi.changeEmail(data),
    onSuccess: (response) => {
      const { new_email } = response.data as { new_email: string };
      useAuthStore.getState().setUser({
        ...useAuthStore.getState().user!,
        email: new_email,
      });
      changeEmailForm.reset();
      notifications.show({
        title: "Email actualizado",
        message: "Tu email ha sido cambiado correctamente.",
        color: "blue",
      });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      const detail =
        typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "No se pudo cambiar el email. Inténtalo de nuevo.";
      notifications.show({ title: "Error", message: detail, color: "red" });
    },
  });

  return (
    <Box p="xl">
      <Title order={2} mb="xl">Mi Perfil</Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Card shadow="sm" padding="xl" radius="lg" withBorder>
          <Group mb="xl">
            <Box pos="relative">
              <Avatar
                size={100}
                radius="xl"
                color="yellow"
                src={user?.avatar_url}
              >
                {user?.full_name?.[0] || "U"}
              </Avatar>
              <FileButton
                onChange={handleAvatarUpload}
                accept="image/png,image/jpeg,image/webp"
              >
                {(props) => (
                  <Button
                    {...props}
                    size="xs"
                    variant="filled"
                    color="dark"
                    radius="xl"
                    pos="absolute"
                    bottom={0}
                    right={0}
                    p={4}
                    loading={avatarUploading}
                  >
                    <IconCamera size={14} />
                  </Button>
                )}
              </FileButton>
            </Box>
            <Box>
              <Title order={3}>{user?.full_name || "Usuario"}</Title>
              <Text c="dimmed">{user?.email}</Text>
              <Badge color="yellow" variant="light" mt="xs">Cliente</Badge>
            </Box>
          </Group>

          <Stack gap="md">
            <TextInput
              label="Nombre completo"
              placeholder="Tu nombre"
              leftSection={<IconUser size={16} />}
              {...profileForm.getInputProps("full_name")}
            />
            <TextInput
              label="Email"
              placeholder="tu@email.com"
              value={user?.email || ""}
              leftSection={<IconMail size={16} />}
              disabled
            />
            <TextInput
              label="Teléfono"
              placeholder="+34 600 000 000"
              leftSection={<IconPhone size={16} />}
              {...profileForm.getInputProps("phone")}
            />
            <Button
              color="yellow"
              mt="md"
              onClick={handleSaveProfile}
              loading={updateProfileMutation.isPending}
              leftSection={<IconCheck size={16} />}
            >
              Guardar cambios
            </Button>
          </Stack>
        </Card>

        <Stack gap="lg">
          <SubscriptionSection />

          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group mb="md">
              <IconLock size={20} />
              <Text fw={600}>Seguridad</Text>
            </Group>
            <Button variant="light" fullWidth onClick={openPasswordModal}>
              Cambiar contraseña
            </Button>
          </Card>

          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group mb="md">
              <IconMail size={20} />
              <Text fw={600}>Cambiar email</Text>
            </Group>
            <form
              onSubmit={changeEmailForm.onSubmit((values) =>
                changeEmailMutation.mutate({
                  new_email: values.new_email,
                  password: values.password,
                })
              )}
            >
              <Stack gap="md">
                <TextInput
                  label="Email actual"
                  value={user?.email || ""}
                  leftSection={<IconMail size={16} />}
                  disabled
                />
                <TextInput
                  label="Nuevo email"
                  placeholder="nuevo@email.com"
                  leftSection={<IconMail size={16} />}
                  {...changeEmailForm.getInputProps("new_email")}
                />
                <PasswordInput
                  label="Contraseña actual"
                  placeholder="Tu contraseña actual"
                  {...changeEmailForm.getInputProps("password")}
                />
                <Button
                  type="submit"
                  color="yellow"
                  fullWidth
                  loading={changeEmailMutation.isPending}
                >
                  Cambiar email
                </Button>
              </Stack>
            </form>
          </Card>

          <NotificationsSection />

          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group mb="md">
              <IconPalette size={20} />
              <Text fw={600}>Mi Entrenador</Text>
            </Group>
            <Paper p="md" radius="md" withBorder>
              <Group>
                <Avatar size="lg" color="yellow" radius="md">
                  {currentWorkspace?.name?.[0] || "E"}
                </Avatar>
                <Box>
                  <Text fw={600}>{currentWorkspace?.name || "Trackfiz"}</Text>
                  <Text size="sm" c="dimmed">Tu centro de entrenamiento</Text>
                </Box>
              </Group>
            </Paper>
          </Card>
        </Stack>
      </SimpleGrid>

      <NativeBottomSheet
        opened={passwordModalOpened}
        onClose={closePasswordModal}
        title="Cambiar contraseña"
      >
        <form
          onSubmit={changePasswordForm.onSubmit((values) =>
            changePasswordMutation.mutate({
              current_password: values.current_password,
              new_password: values.new_password,
            })
          )}
        >
          <Stack gap="md">
            <PasswordInput
              label="Contraseña actual"
              placeholder="Tu contraseña actual"
              {...changePasswordForm.getInputProps("current_password")}
            />
            <Box>
              <PasswordInput
                label="Nueva contraseña"
                placeholder="Mínimo 8 caracteres"
                {...changePasswordForm.getInputProps("new_password")}
              />
              <PasswordRulesIndicator value={changePasswordForm.values.new_password} />
            </Box>
            <PasswordInput
              label="Confirmar contraseña"
              placeholder="Repite la nueva contraseña"
              {...changePasswordForm.getInputProps("confirm_password")}
            />
            <Button
              type="submit"
              color="yellow"
              fullWidth
              loading={changePasswordMutation.isPending}
            >
              Cambiar contraseña
            </Button>
          </Stack>
        </form>
      </NativeBottomSheet>
    </Box>
  );
}
