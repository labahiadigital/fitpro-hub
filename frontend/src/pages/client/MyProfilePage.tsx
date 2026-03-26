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
  FileButton,
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
  IconCheck,
} from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useAuthStore } from "../../stores/auth";
import { authApi, clientPortalApi, notificationsApi } from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sub.payments.map((p) => {
                  const pConfig = paymentStatusConfig[p.status] || { label: p.status, color: "gray" };
                  return (
                    <Table.Tr key={p.id}>
                      <Table.Td>{formatDate(p.paid_at || p.created_at)}</Table.Td>
                      <Table.Td>{p.description || "Pago de suscripción"}</Table.Td>
                      <Table.Td ta="right" fw={500}>{formatCurrencyLocal(p.amount, p.currency)}</Table.Td>
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

interface NotificationPrefs {
  email_booking_created: boolean;
  email_booking_cancelled: boolean;
  email_payment_received: boolean;
  email_payment_failed: boolean;
  email_new_message: boolean;
  email_new_client: boolean;
  email_form_submitted: boolean;
  push_enabled: boolean;
}

function NotificationsSection() {
  const { data: prefs, isLoading } = useQuery<NotificationPrefs>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await notificationsApi.getPreferences();
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, boolean>) =>
      notificationsApi.updatePreferences(data),
    onSuccess: () => {
      notifications.show({
        title: "Guardado",
        message: "Preferencias de notificaciones actualizadas",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudieron guardar las preferencias",
        color: "red",
      });
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group justify="center" p="md"><Loader size="sm" /></Group>
      </Card>
    );
  }

  const notifSettings = [
    { key: "email_booking_created", label: "Nuevas citas", desc: "Cuando se te agenda una nueva sesión" },
    { key: "email_booking_cancelled", label: "Cancelaciones", desc: "Cuando se cancela una de tus citas" },
    { key: "email_booking_reminder", label: "Recordatorios de sesión", desc: "Recibe un recordatorio antes de tus citas" },
    { key: "email_new_message", label: "Mensajes", desc: "Cuando tu entrenador te envía un mensaje" },
    { key: "email_payment_received", label: "Pagos recibidos", desc: "Confirmación cuando se procese un pago" },
    { key: "email_plan_updated", label: "Cambios en tu plan", desc: "Cuando se actualiza tu rutina o plan nutricional" },
    { key: "email_progress_milestone", label: "Hitos de progreso", desc: "Cuando alcances un objetivo importante" },
    { key: "push_enabled", label: "Notificaciones push", desc: "Notificaciones en el navegador" },
  ];

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group mb="md">
        <IconBell size={20} />
        <Text fw={600}>Notificaciones</Text>
      </Group>
      <Stack gap="md">
        {notifSettings.map((item, idx) => (
          <Box key={item.key}>
            {idx > 0 && <Divider mb="md" />}
            <Group justify="space-between">
              <Box>
                <Text size="sm" fw={500}>{item.label}</Text>
                <Text size="xs" c="dimmed">{item.desc}</Text>
              </Box>
              <Switch
                checked={prefs?.[item.key as keyof NotificationPrefs] ?? true}
                onChange={(e) => handleToggle(item.key, e.currentTarget.checked)}
                color="yellow"
              />
            </Group>
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
      new_password: (v) =>
        !v ? "Introduce la nueva contraseña" : v.length < 6 ? "Mínimo 6 caracteres" : null,
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

      <Modal
        opened={passwordModalOpened}
        onClose={closePasswordModal}
        title="Cambiar contraseña"
        centered
        radius="lg"
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
            <PasswordInput
              label="Nueva contraseña"
              placeholder="Mínimo 6 caracteres"
              {...changePasswordForm.getInputProps("new_password")}
            />
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
      </Modal>
    </Box>
  );
}
