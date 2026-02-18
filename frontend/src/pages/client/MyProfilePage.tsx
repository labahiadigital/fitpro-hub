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
  Modal,
  Alert,
  ThemeIcon,
} from "@mantine/core";
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
} from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useAuthStore } from "../../stores/auth";
import { authApi, clientPortalApi } from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { notifications } from "@mantine/notifications";

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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

const intervalLabels: Record<string, string> = {
  month: "mes",
  year: "año",
  week: "semana",
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

function SubscriptionSection() {
  const queryClient = useQueryClient();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

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

        {/* Plan info */}
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
                {formatCurrency(sub.amount, sub.currency)}
              </Text>
              <Text size="sm" c="dimmed">
                /{intervalLabels[sub.interval] || sub.interval}
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* Dates and card info */}
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

        {/* Payment method */}
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

        {/* Cancelled notice */}
        {sub.status === "cancelled" && sub.cancelled_at && (
          <Alert color="orange" variant="light" mb="md" icon={<IconAlertCircle size={16} />}>
            Suscripción cancelada el {formatDate(sub.cancelled_at)}.
            {sub.current_period_end && (
              <> Tu acceso continúa hasta el {formatDate(sub.current_period_end)}.</>
            )}
          </Alert>
        )}

        {/* Payment history */}
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
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sub.payments.map((p) => {
                  const pConfig = paymentStatusConfig[p.status] || { label: p.status, color: "gray" };
                  return (
                    <Table.Tr key={p.id}>
                      <Table.Td>{formatDate(p.paid_at || p.created_at)}</Table.Td>
                      <Table.Td>{p.description || "Pago de suscripción"}</Table.Td>
                      <Table.Td ta="right" fw={500}>{formatCurrency(p.amount, p.currency)}</Table.Td>
                      <Table.Td ta="center">
                        <Badge size="sm" color={pConfig.color} variant="light">{pConfig.label}</Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </>
        )}

        {/* Cancel button */}
        {sub.status === "active" && (
          <>
            <Divider mt="md" mb="md" />
            <Button
              variant="subtle"
              color="red"
              size="xs"
              onClick={() => setCancelModalOpen(true)}
            >
              Cancelar suscripción
            </Button>
          </>
        )}
      </Card>

      {/* Cancel confirmation modal */}
      <Modal
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancelar suscripción"
        centered
        radius="lg"
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
      </Modal>
    </>
  );
}

export function MyProfilePage() {
  const { user, currentWorkspace } = useAuthStore();

  const changeEmailForm = useForm({
    initialValues: {
      new_email: "",
      password: "",
    },
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
      notifications.show({
        title: "Error",
        message: detail,
        color: "red",
      });
    },
  });

  return (
    <Box p="xl">
      <Title order={2} mb="xl">Mi Perfil</Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {/* Profile Info */}
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
              <Button
                size="xs"
                variant="filled"
                color="dark"
                radius="xl"
                pos="absolute"
                bottom={0}
                right={0}
                p={4}
              >
                <IconCamera size={14} />
              </Button>
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
              defaultValue={user?.full_name || ""}
              leftSection={<IconUser size={16} />}
            />
            <TextInput
              label="Email"
              placeholder="tu@email.com"
              defaultValue={user?.email || ""}
              leftSection={<IconMail size={16} />}
              disabled
            />
            <TextInput
              label="Teléfono"
              placeholder="+34 600 000 000"
              leftSection={<IconPhone size={16} />}
            />
            <Button color="yellow" mt="md">Guardar cambios</Button>
          </Stack>
        </Card>

        {/* Right column */}
        <Stack gap="lg">
          {/* Subscription */}
          <SubscriptionSection />

          {/* Security */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group mb="md">
              <IconLock size={20} />
              <Text fw={600}>Seguridad</Text>
            </Group>
            <Button variant="light" fullWidth>
              Cambiar contraseña
            </Button>
          </Card>

          {/* Change Email */}
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

          {/* Notifications */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group mb="md">
              <IconBell size={20} />
              <Text fw={600}>Notificaciones</Text>
            </Group>
            <Stack gap="md">
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Recordatorios de sesión</Text>
                  <Text size="xs" c="dimmed">Recibe alertas antes de tus citas</Text>
                </Box>
                <Switch defaultChecked color="yellow" />
              </Group>
              <Divider />
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Actualizaciones de plan</Text>
                  <Text size="xs" c="dimmed">Cuando tu entrenador actualice tu plan</Text>
                </Box>
                <Switch defaultChecked color="yellow" />
              </Group>
              <Divider />
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Mensajes</Text>
                  <Text size="xs" c="dimmed">Notificaciones de chat</Text>
                </Box>
                <Switch defaultChecked color="yellow" />
              </Group>
              <Divider />
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Email marketing</Text>
                  <Text size="xs" c="dimmed">Ofertas y novedades</Text>
                </Box>
                <Switch color="yellow" />
              </Group>
            </Stack>
          </Card>

          {/* Workspace Info */}
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
                  <Text size="sm" c="dimmed">Cliente desde Enero 2026</Text>
                </Box>
              </Group>
            </Paper>
          </Card>
        </Stack>
      </SimpleGrid>
    </Box>
  );
}
