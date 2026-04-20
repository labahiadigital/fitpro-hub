import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  ColorInput,
  Container,
  Divider,
  FileButton,
  FileInput,
  Group,
  List,
  Loader,
  Menu,
  NumberInput,
  Paper,
  PasswordInput,
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBell,
  IconBrandGoogle,
  IconBrandWhatsapp,
  IconBuilding,
  IconCalendar,
  IconCalendarEvent,
  IconCheck,
  IconCreditCard,
  IconDotsVertical,
  IconEdit,
  IconExternalLink,
  IconLink,
  IconLock,
  IconMail,
  IconPalette,
  IconPlugConnected,
  IconPlus,
  IconRefresh,
  IconShield,
  IconTrash,
  IconUpload,
  IconUser,
  IconUsers,
  IconRobot,
  IconBulb,
} from "@tabler/icons-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { openDangerConfirm } from "../../utils/confirmModal";
import { useSearchParams } from "react-router-dom";

const AutomationsPage = lazy(() => import("../automations/AutomationsPage").then(m => ({ default: m.AutomationsPage })));
const SuggestionsPage = lazy(() => import("../suggestions/SuggestionsPage").then(m => ({ default: m.SuggestionsPage })));
import { PageHeader } from "../../components/common/PageHeader";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../../hooks/useNotifications";
import {
  formatPhoneNumber,
  getConnectionTime,
  openWhatsAppSetupPopup,
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useSyncWhatsApp,
  useWhatsAppStatus,
} from "../../hooks/useWhatsApp";
import {
  formatLastSync,
  startGoogleCalendarAuth,
  useDisconnectGoogleCalendar,
  useGoogleCalendarAuthUrl,
  useGoogleCalendarStatus,
  useSyncGoogleCalendar,
  useUpdateGoogleCalendarSettings,
} from "../../hooks/useGoogleCalendar";
import { useAuthStore } from "../../stores/auth";
import { useTeamMembers } from "../../hooks/useTeam";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "../../components/common/BottomSheet";
import {
  accountApi,
  authApi,
  paymentsApi,
  usersApi,
  workspacesApi,
} from "../../services/api";

const SETTINGS_TAB_SELECT_DATA = [
  { value: "workspace", label: "Workspace" },
  { value: "profile", label: "Mi Perfil" },
  { value: "team", label: "Equipo" },
  { value: "branding", label: "Marca" },
  { value: "notifications", label: "Notificaciones" },
  { value: "booking", label: "Reservas" },
  { value: "integrations", label: "Integraciones" },
  { value: "billing", label: "Facturación" },
  { value: "security", label: "Seguridad" },
  { value: "automations", label: "Automatizaciones" },
  { value: "suggestions", label: "Sugerencias" },
];

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface TimeSlot { start: string; end: string }
type WeeklySchedule = Record<string, TimeSlot[]>;

function WeeklyScheduleSection({
  wsSettings,
  workspaceId,
  setWorkspace,
}: {
  wsSettings: Record<string, unknown>;
  workspaceId?: string;
  setWorkspace: (ws: any) => void;
}) {
  const initialSchedule = (wsSettings.weekly_schedule || {}) as WeeklySchedule;
  const [schedule, setSchedule] = useState<WeeklySchedule>(() => {
    const s: WeeklySchedule = {};
    for (const day of DAY_KEYS) {
      s[day] = (initialSchedule[day] as TimeSlot[] | undefined) || [];
    }
    return s;
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!workspaceId) throw new Error("No workspace");
      return workspacesApi.update(workspaceId, {
        settings: { ...wsSettings, weekly_schedule: schedule },
      });
    },
    onSuccess: (res) => {
      setWorkspace(res.data);
      notifications.show({ title: "Horario guardado", message: "Tu disponibilidad semanal ha sido actualizada", color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo guardar el horario", color: "red" });
    },
  });

  const addSlot = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "09:00", end: "14:00" }],
    }));
  };

  const removeSlot = (day: string, idx: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, i) => i !== idx),
    }));
  };

  const updateSlot = (day: string, idx: number, field: "start" | "end", value: string) => {
    setSchedule((prev) => {
      const slots = [...(prev[day] || [])];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...prev, [day]: slots };
    });
  };

  return (
    <Box className="nv-card" p="lg" mt="lg">
      <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
        Horario de Disponibilidad
      </Text>
      <Text c="dimmed" size="sm" mb="md">
        Configura los horarios en los que tus clientes pueden solicitar citas.
      </Text>
      <Stack gap="sm">
        {DAY_KEYS.map((day) => (
          <Paper key={day} p="sm" withBorder radius="md">
            <Group justify="space-between" mb={schedule[day]?.length ? "xs" : 0}>
              <Text fw={500} size="sm" w={100}>{DAY_LABELS[day]}</Text>
              {(schedule[day] || []).length === 0 ? (
                <Group gap="xs">
                  <Badge variant="light" color="gray" size="sm">No disponible</Badge>
                  <Button variant="subtle" size="xs" onClick={() => addSlot(day)}>Añadir</Button>
                </Group>
              ) : (
                <Button variant="subtle" size="xs" onClick={() => addSlot(day)}>+ Rango</Button>
              )}
            </Group>
            {(schedule[day] || []).map((slot, idx) => (
              <Group key={idx} gap="xs" mb={4}>
                <TextInput
                  size="xs"
                  value={slot.start}
                  onChange={(e) => updateSlot(day, idx, "start", e.target.value)}
                  placeholder="09:00"
                  w={80}
                />
                <Text size="xs">a</Text>
                <TextInput
                  size="xs"
                  value={slot.end}
                  onChange={(e) => updateSlot(day, idx, "end", e.target.value)}
                  placeholder="14:00"
                  w={80}
                />
                <ActionIcon size="sm" variant="subtle" color="red" onClick={() => removeSlot(day, idx)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Paper>
        ))}
      </Stack>
      <Group justify="flex-end" mt="md">
        <Button
          onClick={() => updateMutation.mutate()}
          loading={updateMutation.isPending}
          style={{ backgroundColor: "var(--nv-primary)" }}
          radius="xl"
        >
          Guardar Horario
        </Button>
      </Group>
    </Box>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<string | null>(
    searchParams.get("tab") || "workspace"
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setActiveTab(t);
  }, [searchParams]);

  const { user, currentWorkspace, setUser, setWorkspace } = useAuthStore();
  // Cargas pesadas por pestaña: evitamos pegar a /whatsapp/status,
  // /google-calendar/status, /notifications/preferences, /workspaces/members
  // y /payments/connect/status salvo cuando la pestaña correspondiente está
  // activa. Así /settings deja ~2-3 requests al abrir por defecto en vez de 7.
  const isTab = (name: string) => activeTab === name;
  const { data: notifPrefs } = useNotificationPreferences({ enabled: isTab("notifications") });
  const updatePrefs = useUpdateNotificationPreferences();

  // WhatsApp integration
  const { data: whatsappStatus, isLoading: loadingWhatsApp } = useWhatsAppStatus({
    enabled: isTab("integrations"),
  });
  const connectWhatsApp = useConnectWhatsApp();
  const disconnectWhatsApp = useDisconnectWhatsApp();
  const syncWhatsApp = useSyncWhatsApp();
  const [isConnecting, setIsConnecting] = useState(false);

  // Google Calendar integration
  const { data: googleCalendarStatus, isLoading: loadingGoogleCalendar } = useGoogleCalendarStatus({
    enabled: isTab("integrations"),
  });
  const googleCalendarAuthUrl = useGoogleCalendarAuthUrl();
  const disconnectGoogleCalendar = useDisconnectGoogleCalendar();
  const syncGoogleCalendar = useSyncGoogleCalendar();
  const updateGoogleCalendarSettings = useUpdateGoogleCalendarSettings();

  // Team modals
  const [inviteModalOpen, { open: openInviteModal, close: closeInviteModal }] = useDisclosure(false);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<string | null>(null);
  const [deleteAccountModal, { open: openDeleteAccount, close: closeDeleteAccount }] = useDisclosure(false);

  // Handle WhatsApp setup callback from URL
  useEffect(() => {
    const setupResult = searchParams.get("setup");
    if (setupResult === "success") {
      notifications.show({
        title: "WhatsApp conectado",
        message: "Estamos sincronizando con Kapso, un momento…",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setIsConnecting(false);
      syncWhatsApp.mutate();
    } else if (setupResult === "failed") {
      notifications.show({
        title: "Error de conexión",
        message: "No se pudo conectar WhatsApp. Por favor, intenta de nuevo.",
        color: "red",
      });
      setIsConnecting(false);
    }
    // Nota: syncWhatsApp.mutate es estable con react-query, no hace falta
    // añadirlo al array de dependencias y evita loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Handle Google Calendar OAuth callback
  useEffect(() => {
    const googleResult = searchParams.get("google");
    if (googleResult === "success") {
      notifications.show({
        title: "Google Calendar conectado",
        message: "Tu calendario de Google ha sido conectado correctamente",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      window.history.replaceState({}, "", "/settings?tab=integrations");
    } else if (googleResult === "error") {
      notifications.show({
        title: "Error de conexión",
        message: "No se pudo conectar Google Calendar. Por favor, intenta de nuevo.",
        color: "red",
      });
      window.history.replaceState({}, "", "/settings?tab=integrations");
    }
  }, [searchParams]);

  const handleConnectWhatsApp = async () => {
    setIsConnecting(true);
    try {
      const result = await connectWhatsApp.mutateAsync();
      if (result.setup_url) {
        openWhatsAppSetupPopup(result.setup_url);
      }
    } catch {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = () => {
    openDangerConfirm({
      title: "Desconectar WhatsApp",
      message: "¿Estás seguro de que quieres desconectar WhatsApp? Los mensajes existentes se conservarán.",
      confirmLabel: "Desconectar",
      onConfirm: async () => { await disconnectWhatsApp.mutateAsync(); },
    });
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const result = await googleCalendarAuthUrl.mutateAsync();
      if (result.auth_url) {
        startGoogleCalendarAuth(result.auth_url);
      }
    } catch {
      // Error handled in hook
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    openDangerConfirm({
      title: "Desconectar Google Calendar",
      message: "¿Estás seguro de que quieres desconectar Google Calendar?",
      confirmLabel: "Desconectar",
      onConfirm: async () => { await disconnectGoogleCalendar.mutateAsync(); },
    });
  };

  // ==================== WORKSPACE ====================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsSettings = (currentWorkspace?.settings || {}) as Record<string, any>;
  const wsContact = wsSettings.contact || {};

  const workspaceForm = useForm({
    initialValues: {
      name: currentWorkspace?.name || "",
      slug: currentWorkspace?.slug || "",
      email: wsContact.email || "",
      phone: wsContact.phone || "",
      address: wsContact.address || "",
      website: wsContact.website || "",
      description: currentWorkspace?.description || "",
    },
  });

  const workspaceUpdateMutation = useMutation({
    mutationFn: (values: typeof workspaceForm.values) => {
      const id = currentWorkspace?.id;
      if (!id) throw new Error("No workspace");
      return workspacesApi.update(id, {
        name: values.name,
        description: values.description || null,
        settings: {
          ...wsSettings,
          contact: {
            email: values.email || null,
            phone: values.phone || null,
            address: values.address || null,
            website: values.website || null,
          },
        },
      });
    },
    onSuccess: (res) => {
      const ws = res.data;
      setWorkspace(ws);
      notifications.show({ title: "Workspace actualizado", message: "Cambios guardados", color: "green", icon: <IconCheck size={16} /> });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo guardar", color: "red" });
    },
  });

  // ==================== PROFILE ====================
  const userPrefs = (user?.preferences || {}) as Record<string, any>;

  const profileForm = useForm({
    initialValues: {
      full_name: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      timezone: userPrefs.timezone || "Europe/Madrid",
      language: userPrefs.language || "es",
    },
  });

  const profileUpdateMutation = useMutation({
    mutationFn: (values: typeof profileForm.values) => {
      if (!user?.id) throw new Error("No user");
      return usersApi.update(user.id, {
        full_name: values.full_name,
        phone: values.phone || null,
        preferences: {
          ...userPrefs,
          timezone: values.timezone,
          language: values.language,
        },
      });
    },
    onSuccess: (res) => {
      setUser(res.data);
      notifications.show({ title: "Perfil actualizado", message: "Cambios guardados", color: "green", icon: <IconCheck size={16} /> });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo guardar", color: "red" });
    },
  });

  // Change email
  const changeEmailForm = useForm({
    initialValues: { new_email: "", password: "" },
    validate: {
      new_email: (v) => !v ? "Requerido" : !/^\S+@\S+\.\S+$/.test(v) ? "Email inválido" : v === user?.email ? "Debe ser diferente" : null,
      password: (v) => (!v ? "Requerida" : null),
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: (data: { new_email: string; password: string }) => authApi.changeEmail(data),
    onSuccess: (response) => {
      const { new_email } = response.data as { new_email: string };
      setUser({ ...user!, email: new_email });
      changeEmailForm.reset();
      notifications.show({ title: "Email actualizado", message: "Cambiado correctamente", color: "green", icon: <IconCheck size={16} /> });
    },
    onError: (error: any) => {
      notifications.show({ title: "Error", message: error.response?.data?.detail || "No se pudo cambiar", color: "red" });
    },
  });

  // ==================== TEAM ====================
  const { data: fetchedTeamMembers = [] } = useTeamMembers({
    enabled: isTab("team") || inviteModalOpen,
  });
  const teamMembers = fetchedTeamMembers.length > 0
    ? fetchedTeamMembers.map((m: any) => ({
        id: m.id || m.user_id,
        name: m.full_name || m.name || "Usuario",
        email: m.email || "",
        role: m.role || "collaborator",
        status: m.is_active ? "active" : "inactive",
      }))
    : [{
        id: user?.id || "1",
        name: user?.full_name || "Usuario",
        email: user?.email || "",
        role: "owner",
        status: "active",
      }];

  const inviteForm = useForm({
    initialValues: { email: "", role: "collaborator" },
    validate: { email: (v) => (!v || !/^\S+@\S+\.\S+$/.test(v) ? "Email inválido" : null) },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => usersApi.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      notifications.show({ title: "Invitación enviada", message: "Se ha enviado la invitación", color: "green", icon: <IconCheck size={16} /> });
      closeInviteModal();
      inviteForm.reset();
    },
    onError: (err: any) => {
      notifications.show({ title: "Error", message: err.response?.data?.detail || "No se pudo invitar", color: "red" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => usersApi.remove(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      notifications.show({ title: "Miembro eliminado", message: "Eliminado del equipo", color: "green" });
      setDeleteConfirmMember(null);
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo eliminar", color: "red" });
    },
  });

  // ==================== BRANDING ====================
  const brandingForm = useForm({
    initialValues: {
      primary_color: currentWorkspace?.branding?.primary_color || "#2D6A4F",
      secondary_color: currentWorkspace?.branding?.secondary_color || "#40916C",
      accent_color: currentWorkspace?.branding?.accent_color || "#95D5B2",
    },
  });

  useEffect(() => {
    if (currentWorkspace?.branding) {
      brandingForm.setValues({
        primary_color: currentWorkspace.branding.primary_color || "#2D6A4F",
        secondary_color: currentWorkspace.branding.secondary_color || "#40916C",
        accent_color: currentWorkspace.branding.accent_color || "#95D5B2",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.branding?.primary_color, currentWorkspace?.branding?.secondary_color, currentWorkspace?.branding?.accent_color]);

  const brandingUpdateMutation = useMutation({
    mutationFn: (values: typeof brandingForm.values) => {
      const id = currentWorkspace?.id;
      if (!id) throw new Error("No workspace");
      return workspacesApi.update(id, { branding: values });
    },
    onSuccess: (res) => {
      setWorkspace(res.data);
      notifications.show({ title: "Marca actualizada", message: "Colores guardados", color: "green", icon: <IconCheck size={16} /> });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo guardar", color: "red" });
    },
  });

  // ==================== BOOKING ====================
  const bookingPolicies = wsSettings.booking_policies || {};

  const bookingForm = useForm({
    initialValues: {
      default_duration: bookingPolicies.default_duration ?? 60,
      buffer_time: bookingPolicies.buffer_time ?? 15,
      max_advance_days: bookingPolicies.max_advance_days ?? 30,
      min_advance_hours: bookingPolicies.min_advance_hours ?? 2,
      cancellation_policy_hours: bookingPolicies.cancellation_hours ?? 24,
      allow_client_booking: bookingPolicies.allow_client_booking ?? true,
      allow_client_cancellation: bookingPolicies.allow_client_cancellation ?? true,
      require_payment_upfront: bookingPolicies.require_payment_upfront ?? false,
      send_reminders: bookingPolicies.send_reminders ?? true,
      reminder_hours: bookingPolicies.reminder_hours ?? 24,
    },
  });

  const bookingUpdateMutation = useMutation({
    mutationFn: (values: typeof bookingForm.values) => {
      const id = currentWorkspace?.id;
      if (!id) throw new Error("No workspace");
      return workspacesApi.update(id, {
        settings: {
          ...wsSettings,
          booking_policies: {
            default_duration: values.default_duration,
            buffer_time: values.buffer_time,
            max_advance_days: values.max_advance_days,
            min_advance_hours: values.min_advance_hours,
            cancellation_hours: values.cancellation_policy_hours,
            allow_client_booking: values.allow_client_booking,
            allow_client_cancellation: values.allow_client_cancellation,
            require_payment_upfront: values.require_payment_upfront,
            send_reminders: values.send_reminders,
            reminder_hours: values.reminder_hours,
          },
        },
      });
    },
    onSuccess: (res) => {
      setWorkspace(res.data);
      notifications.show({ title: "Reservas actualizado", message: "Políticas guardadas", color: "green", icon: <IconCheck size={16} /> });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo guardar", color: "red" });
    },
  });

  // ==================== SECURITY ====================
  const passwordForm = useForm({
    initialValues: { current_password: "", new_password: "", confirm_password: "" },
    validate: {
      current_password: (v) => (!v ? "Requerida" : null),
      new_password: (v) => (!v ? "Requerida" : v.length < 8 ? "Mínimo 8 caracteres" : null),
      confirm_password: (v, values) => v !== values.new_password ? "No coinciden" : null,
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: typeof passwordForm.values) =>
      authApi.changePassword(values.current_password, values.new_password),
    onSuccess: () => {
      passwordForm.reset();
      notifications.show({ title: "Contraseña cambiada", message: "Tu contraseña ha sido actualizada", color: "green", icon: <IconCheck size={16} /> });
    },
    onError: (err: any) => {
      notifications.show({ title: "Error", message: err.response?.data?.detail || "No se pudo cambiar", color: "red" });
    },
  });

  const deleteAccountForm = useForm({
    initialValues: { password: "", reason: "" },
    validate: { password: (v) => (!v ? "Requerida" : null) },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (values: typeof deleteAccountForm.values) =>
      accountApi.requestDeletion({ password: values.password, reason: values.reason || undefined }),
    onSuccess: () => {
      closeDeleteAccount();
      notifications.show({ title: "Solicitud enviada", message: "Tu cuenta será eliminada en 30 días", color: "orange" });
    },
    onError: (err: any) => {
      notifications.show({ title: "Error", message: err.response?.data?.detail || "No se pudo procesar", color: "red" });
    },
  });

  // ==================== BILLING (read from API if available) ====================
  // Solo lo pedimos cuando el usuario entra a la pestaña de facturación, para
  // no disparar /payments/connect/status en cada visita a /settings.
  const { data: billingData } = useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      try {
        const res = await paymentsApi.accountStatus();
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: isTab("billing"),
    staleTime: 60_000,
    retry: false,
  });

  const handleNotifPrefChange = (event: string, channel: "email" | "in_app", value: boolean) => {
    updatePrefs.mutate({ [event]: { [channel]: value } });
  };

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        description="Gestiona tu workspace, perfil y preferencias"
        title="Configuración"
      />

      {isMobile && (
        <Select
          data={SETTINGS_TAB_SELECT_DATA}
          label="Sección"
          mb="md"
          onChange={(v) => setActiveTab(v)}
          value={activeTab ?? undefined}
        />
      )}

      <Tabs
        onChange={setActiveTab}
        orientation={isMobile ? "horizontal" : "vertical"}
        value={activeTab}
      >
        {!isMobile && (
          <Tabs.List mr="xl" w={220} style={{ borderRight: "1px solid var(--nv-border)" }}>
            <Tabs.Tab leftSection={<IconBuilding size={16} />} value="workspace" style={{ fontWeight: 500 }}>Workspace</Tabs.Tab>
            <Tabs.Tab leftSection={<IconUser size={16} />} value="profile" style={{ fontWeight: 500 }}>Mi Perfil</Tabs.Tab>
            <Tabs.Tab leftSection={<IconUsers size={16} />} value="team" style={{ fontWeight: 500 }}>Equipo</Tabs.Tab>
            <Tabs.Tab leftSection={<IconPalette size={16} />} value="branding" style={{ fontWeight: 500 }}>Marca</Tabs.Tab>
            <Tabs.Tab leftSection={<IconBell size={16} />} value="notifications" style={{ fontWeight: 500 }}>Notificaciones</Tabs.Tab>
            <Tabs.Tab leftSection={<IconCalendar size={16} />} value="booking" style={{ fontWeight: 500 }}>Reservas</Tabs.Tab>
            <Tabs.Tab
              leftSection={<IconLink size={16} />}
              value="integrations"
              style={{ fontWeight: 500 }}
              rightSection={
                (whatsappStatus?.connected || googleCalendarStatus?.connected) ? (
                  <Badge color="green" size="xs" variant="dot" />
                ) : null
              }
            >
              Integraciones
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconCreditCard size={16} />} value="billing" style={{ fontWeight: 500 }}>Facturación</Tabs.Tab>
            <Tabs.Tab leftSection={<IconShield size={16} />} value="security" style={{ fontWeight: 500 }}>Seguridad</Tabs.Tab>
            <Divider my="xs" color="var(--nv-border)" />
            <Tabs.Tab leftSection={<IconRobot size={16} />} value="automations" style={{ fontWeight: 500 }}>Automatizaciones</Tabs.Tab>
            <Tabs.Tab leftSection={<IconBulb size={16} />} value="suggestions" style={{ fontWeight: 500 }}>Sugerencias</Tabs.Tab>
          </Tabs.List>
        )}

        <Box style={{ flex: 1 }}>
          {/* ==================== WORKSPACE ==================== */}
          <Tabs.Panel value="workspace">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Información del Workspace
              </Text>

              <Group mb="xl">
                <Avatar color="primary" radius="md" size={80} src={currentWorkspace?.logo_url}>
                  {currentWorkspace?.name?.charAt(0) || "W"}
                </Avatar>
                <Box>
                  <Text fw={500}>{currentWorkspace?.name || "Workspace"}</Text>
                  <Text c="dimmed" size="sm">Foto del workspace (aparecerá en PDFs)</Text>
                  <FileButton
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (file) => {
                      if (!file || !currentWorkspace?.id) return;
                      try {
                        const res = await workspacesApi.uploadLogo(currentWorkspace.id, file);
                        setWorkspace({ ...currentWorkspace, logo_url: res.data.logo_url });
                        notifications.show({ title: "Foto actualizada", message: "La foto del workspace se ha guardado", color: "green" });
                      } catch {
                        notifications.show({ title: "Error", message: "No se pudo subir la foto", color: "red" });
                      }
                    }}
                  >
                    {(props) => (
                      <Button {...props} leftSection={<IconUpload size={14} />} mt="xs" size="xs" variant="light">
                        Cambiar foto
                      </Button>
                    )}
                  </FileButton>
                </Box>
              </Group>

              <Divider mb="lg" />

              <form onSubmit={workspaceForm.onSubmit((v) => workspaceUpdateMutation.mutate(v))}>
                <Stack gap="md">
                  <Group grow>
                    <TextInput label="Nombre del negocio" placeholder="Mi Centro Fitness" {...workspaceForm.getInputProps("name")} />
                    <TextInput label="Slug (URL)" placeholder="mi-centro-fitness" disabled {...workspaceForm.getInputProps("slug")} />
                  </Group>
                  <Group grow>
                    <TextInput label="Email de contacto" placeholder="contacto@ejemplo.com" {...workspaceForm.getInputProps("email")} />
                    <TextInput label="Teléfono" placeholder="+34 600 000 000" {...workspaceForm.getInputProps("phone")} />
                  </Group>
                  <TextInput label="Dirección" placeholder="Calle, número, ciudad" {...workspaceForm.getInputProps("address")} />
                  <TextInput label="Sitio web" placeholder="https://tuwebsite.com" {...workspaceForm.getInputProps("website")} />
                  <Textarea label="Descripción" minRows={3} placeholder="Describe tu negocio..." {...workspaceForm.getInputProps("description")} />
                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={workspaceUpdateMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      Guardar Cambios
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Box>
          </Tabs.Panel>

          {/* ==================== PROFILE ==================== */}
          <Tabs.Panel value="profile">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>Mi Perfil</Text>
              <Group mb="xl">
                <Avatar color="primary" radius="xl" size={80} src={user?.avatar_url}>
                  {user?.full_name?.charAt(0) || "U"}
                </Avatar>
                <Box>
                  <Text fw={500}>{user?.full_name || "Usuario"}</Text>
                  <Text c="dimmed" size="sm">{user?.email}</Text>
                  <Button leftSection={<IconUpload size={14} />} mt="xs" size="xs" variant="light">
                    Cambiar foto
                  </Button>
                </Box>
              </Group>

              <form onSubmit={profileForm.onSubmit((v) => profileUpdateMutation.mutate(v))}>
                <Stack gap="md">
                  <TextInput label="Nombre completo" placeholder="Tu nombre" {...profileForm.getInputProps("full_name")} />
                  <TextInput disabled label="Email" {...profileForm.getInputProps("email")} />
                  <TextInput label="Teléfono" placeholder="+34 600 000 000" {...profileForm.getInputProps("phone")} />
                  <Group grow>
                    <Select
                      data={[
                        { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
                        { value: "Europe/London", label: "Londres (GMT)" },
                        { value: "America/New_York", label: "Nueva York (GMT-5)" },
                      ]}
                      label="Zona horaria"
                      {...profileForm.getInputProps("timezone")}
                    />
                    <Select
                      data={[
                        { value: "es", label: "Español" },
                        { value: "en", label: "English" },
                      ]}
                      label="Idioma"
                      {...profileForm.getInputProps("language")}
                    />
                  </Group>
                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={profileUpdateMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      Guardar Cambios
                    </Button>
                  </Group>
                </Stack>
              </form>

              <Divider my="xl" />

              <Text fw={600} mb="md" size="md" style={{ color: "var(--nv-text-primary)" }}>Cambiar email</Text>
              <form onSubmit={changeEmailForm.onSubmit((v) => changeEmailMutation.mutate(v))}>
                <Stack gap="md">
                  <TextInput label="Email actual" value={user?.email || ""} leftSection={<IconMail size={16} />} readOnly disabled />
                  <TextInput label="Nuevo email" placeholder="nuevo@email.com" leftSection={<IconMail size={16} />} {...changeEmailForm.getInputProps("new_email")} />
                  <PasswordInput label="Contraseña actual" placeholder="Tu contraseña actual" {...changeEmailForm.getInputProps("password")} />
                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={changeEmailMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      Cambiar email
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Box>
          </Tabs.Panel>

          {/* ==================== TEAM ==================== */}
          <Tabs.Panel value="team">
            <Box className="nv-card" p="lg">
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600} size="lg" style={{ color: "var(--nv-text-primary)" }}>Equipo</Text>
                  <Text c="dimmed" size="sm">Gestiona los miembros de tu equipo</Text>
                </Box>
                <Button leftSection={<IconPlus size={16} />} radius="xl" onClick={openInviteModal} style={{ backgroundColor: "var(--nv-primary)" }}>
                  Invitar Miembro
                </Button>
              </Group>

              <ScrollArea type="auto">
                <Table style={{ minWidth: 500 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Miembro</Table.Th>
                      <Table.Th>Rol</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      <Table.Th style={{ width: 60 }} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {teamMembers.map((member) => (
                      <Table.Tr key={member.id}>
                        <Table.Td>
                          <Group gap="sm">
                            <Avatar color="primary" radius="xl" size="sm">{member.name.charAt(0)}</Avatar>
                            <Box>
                              <Text fw={500} size="sm">{member.name}</Text>
                              <Text c="dimmed" size="xs">{member.email}</Text>
                            </Box>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={member.role === "owner" ? "primary" : "blue"} variant="light">
                            {member.role === "owner" ? "Propietario" : "Colaborador"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={member.status === "active" ? "green" : "gray"} variant="light">
                            {member.status === "active" ? "Activo" : "Inactivo"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {member.role !== "owner" && (
                            <Menu position="bottom-end" withArrow>
                              <Menu.Target>
                                <ActionIcon color="gray" variant="subtle"><IconDotsVertical size={16} /></ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<IconEdit size={14} />}>Editar permisos</Menu.Item>
                                <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => setDeleteConfirmMember(member.id)}>
                                  Eliminar
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Box>
          </Tabs.Panel>

          {/* ==================== BRANDING ==================== */}
          <Tabs.Panel value="branding">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Personalización de Marca
              </Text>

              <Stack gap="lg">
                <Box>
                  <Text fw={500} mb="xs" size="sm">Logo</Text>
                  <Group>
                    <Avatar color="primary" radius="md" size={80} src={currentWorkspace?.logo_url}>
                      {currentWorkspace?.name?.charAt(0) || "F"}
                    </Avatar>
                    <Box>
                      <FileInput accept="image/*" leftSection={<IconUpload size={14} />} placeholder="Subir logo" w={200} />
                      <Text c="dimmed" mt={4} size="xs">PNG, JPG o SVG. Máximo 2MB.</Text>
                    </Box>
                  </Group>
                </Box>

                <Divider />

                <form onSubmit={brandingForm.onSubmit((v) => brandingUpdateMutation.mutate(v))}>
                  <Text fw={500} mb="md" size="sm">Colores</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mb="lg" spacing="md">
                    <ColorInput label="Color primario" {...brandingForm.getInputProps("primary_color")} />
                    <ColorInput label="Color secundario" {...brandingForm.getInputProps("secondary_color")} />
                    <ColorInput label="Color de acento" {...brandingForm.getInputProps("accent_color")} />
                  </SimpleGrid>

                  <Box mb="lg">
                    <Text fw={500} mb="xs" size="sm">Vista previa</Text>
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: `linear-gradient(135deg, ${brandingForm.values.primary_color} 0%, ${brandingForm.values.secondary_color} 100%)`,
                      }}
                    >
                      <Text c="white" fw={600}>{currentWorkspace?.name || "Trackfiz"}</Text>
                      <Text c="white" opacity={0.8} size="sm">Tu centro de entrenamiento</Text>
                      <Button mt="sm" size="xs" style={{ backgroundColor: brandingForm.values.accent_color }}>Reservar</Button>
                    </Paper>
                  </Box>

                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={brandingUpdateMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      Guardar Cambios
                    </Button>
                  </Group>
                </form>
              </Stack>
            </Box>
          </Tabs.Panel>

          {/* ==================== NOTIFICATIONS ==================== */}
          <Tabs.Panel value="notifications">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="xs" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Preferencias de Notificaciones
              </Text>
              <Text c="dimmed" size="sm" mb="lg">
                Elige cómo quieres recibir cada tipo de notificación. Puedes activar el correo electrónico,
                las notificaciones in-app (campanita), ambos, o ninguno. Para notificaciones de tipo recordatorio
                puedes configurar los días de antelación.
              </Text>

              <Group justify="space-between" mb="sm" px="md">
                <Text fw={600} size="sm" style={{ flex: 1 }}>Tipo de notificación</Text>
                <Group gap="lg" wrap="nowrap">
                  <Group gap={4}><IconMail size={14} /><Text fw={600} size="xs">Email</Text></Group>
                  <Group gap={4}><IconBell size={14} /><Text fw={600} size="xs">App/Web</Text></Group>
                </Group>
              </Group>

              <Divider mb="md" />

              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>Reservas y pagos</Text>
              <Stack gap="sm" mb="lg">
                {[
                  { key: "booking_created", label: "Nuevas reservas", desc: "Cuando un cliente hace una reserva" },
                  { key: "booking_cancelled", label: "Cancelaciones", desc: "Cuando se cancela una reserva" },
                  { key: "payment_received", label: "Pagos recibidos", desc: "Cuando se procesa un pago" },
                  { key: "payment_failed", label: "Pagos fallidos", desc: "Cuando falla un cobro" },
                ].map((item) => {
                  const prefs = notifPrefs?.[item.key as keyof typeof notifPrefs];
                  const emailOn = typeof prefs === "object" && prefs !== null ? (prefs as { email?: boolean }).email ?? true : true;
                  const inAppOn = typeof prefs === "object" && prefs !== null ? (prefs as { in_app?: boolean }).in_app ?? true : true;
                  return (
                    <Paper key={item.key} p="md" withBorder radius="md">
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <Box style={{ flex: 1 }}>
                          <Text fw={500} size="sm">{item.label}</Text>
                          <Text c="dimmed" size="xs">{item.desc}</Text>
                        </Box>
                        <Group gap="lg" wrap="nowrap">
                          <Tooltip label="Email"><Switch size="sm" checked={emailOn} onChange={(e) => handleNotifPrefChange(item.key, "email", e.currentTarget.checked)} thumbIcon={<IconMail size={10} />} /></Tooltip>
                          <Tooltip label="App/Web"><Switch size="sm" checked={inAppOn} onChange={(e) => handleNotifPrefChange(item.key, "in_app", e.currentTarget.checked)} thumbIcon={<IconBell size={10} />} /></Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>Clientes y comunicación</Text>
              <Stack gap="sm" mb="lg">
                {[
                  { key: "new_message", label: "Nuevos mensajes", desc: "Cuando un cliente te envía un mensaje" },
                  { key: "new_client", label: "Nuevos clientes", desc: "Cuando se registra un nuevo cliente" },
                  { key: "form_submitted", label: "Formularios completados", desc: "Cuando un cliente completa un formulario" },
                  { key: "progress_milestone", label: "Hitos de progreso", desc: "Cuando un cliente alcanza un hito" },
                ].map((item) => {
                  const prefs = notifPrefs?.[item.key as keyof typeof notifPrefs];
                  const emailOn = typeof prefs === "object" && prefs !== null ? (prefs as { email?: boolean }).email ?? true : true;
                  const inAppOn = typeof prefs === "object" && prefs !== null ? (prefs as { in_app?: boolean }).in_app ?? true : true;
                  return (
                    <Paper key={item.key} p="md" withBorder radius="md">
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <Box style={{ flex: 1 }}>
                          <Text fw={500} size="sm">{item.label}</Text>
                          <Text c="dimmed" size="xs">{item.desc}</Text>
                        </Box>
                        <Group gap="lg" wrap="nowrap">
                          <Tooltip label="Email"><Switch size="sm" checked={emailOn} onChange={(e) => handleNotifPrefChange(item.key, "email", e.currentTarget.checked)} thumbIcon={<IconMail size={10} />} /></Tooltip>
                          <Tooltip label="App/Web"><Switch size="sm" checked={inAppOn} onChange={(e) => handleNotifPrefChange(item.key, "in_app", e.currentTarget.checked)} thumbIcon={<IconBell size={10} />} /></Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>Tareas y automatizaciones</Text>
              <Stack gap="sm" mb="lg">
                {[
                  { key: "task_assigned", label: "Tareas asignadas", desc: "Cuando se te asigna una nueva tarea" },
                  { key: "task_due", label: "Tareas por vencer", desc: "Recordatorio de tareas próximas a su fecha límite" },
                  { key: "low_stock", label: "Stock bajo", desc: "Cuando un producto tiene cantidades bajas en inventario" },
                  { key: "automation_completed", label: "Automatizaciones completadas", desc: "Cuando una automatización finaliza su ejecución" },
                ].map((item) => {
                  const prefs = notifPrefs?.[item.key as keyof typeof notifPrefs];
                  const emailOn = typeof prefs === "object" && prefs !== null ? (prefs as { email?: boolean }).email ?? true : true;
                  const inAppOn = typeof prefs === "object" && prefs !== null ? (prefs as { in_app?: boolean }).in_app ?? true : true;
                  return (
                    <Paper key={item.key} p="md" withBorder radius="md">
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <Box style={{ flex: 1 }}>
                          <Text fw={500} size="sm">{item.label}</Text>
                          <Text c="dimmed" size="xs">{item.desc}</Text>
                        </Box>
                        <Group gap="lg" wrap="nowrap">
                          <Tooltip label="Email"><Switch size="sm" checked={emailOn} onChange={(e) => handleNotifPrefChange(item.key, "email", e.currentTarget.checked)} thumbIcon={<IconMail size={10} />} /></Tooltip>
                          <Tooltip label="App/Web"><Switch size="sm" checked={inAppOn} onChange={(e) => handleNotifPrefChange(item.key, "in_app", e.currentTarget.checked)} thumbIcon={<IconBell size={10} />} /></Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>Control horario</Text>
              <Stack gap="sm" mb="lg">
                {[
                  { key: "clock_in_reminder", label: "Recordatorio de fichaje", desc: "Aviso para recordarte que debes fichar tu entrada" },
                  { key: "clock_event", label: "Evento de fichaje", desc: "Notificación cuando se realiza un fichaje (dentro/fuera de horario)" },
                  { key: "clock_missed", label: "Fichaje no realizado", desc: "Aviso cuando no se ha fichado y debería haberse hecho" },
                ].map((item) => {
                  const prefs = notifPrefs?.[item.key as keyof typeof notifPrefs];
                  const emailOn = typeof prefs === "object" && prefs !== null ? (prefs as { email?: boolean }).email ?? true : true;
                  const inAppOn = typeof prefs === "object" && prefs !== null ? (prefs as { in_app?: boolean }).in_app ?? true : true;
                  return (
                    <Paper key={item.key} p="md" withBorder radius="md">
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <Box style={{ flex: 1 }}>
                          <Text fw={500} size="sm">{item.label}</Text>
                          <Text c="dimmed" size="xs">{item.desc}</Text>
                        </Box>
                        <Group gap="lg" wrap="nowrap">
                          <Tooltip label="Email"><Switch size="sm" checked={emailOn} onChange={(e) => handleNotifPrefChange(item.key, "email", e.currentTarget.checked)} thumbIcon={<IconMail size={10} />} /></Tooltip>
                          <Tooltip label="App/Web"><Switch size="sm" checked={inAppOn} onChange={(e) => handleNotifPrefChange(item.key, "in_app", e.currentTarget.checked)} thumbIcon={<IconBell size={10} />} /></Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              <Divider my="lg" />

              <Text fw={600} size="sm" mb="sm" style={{ color: "var(--nv-text-primary)" }}>Anticipación de notificaciones</Text>
              <Text c="dimmed" size="xs" mb="md">
                Configura con cuántos días de antelación quieres recibir recordatorios para tareas, revisiones y eventos próximos.
                Puedes configurar hasta dos recordatorios con días de antelación distintos.
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
                <Paper p="md" withBorder radius="md">
                  <Text fw={500} size="sm" mb="xs">Primer recordatorio</Text>
                  <NumberInput
                    size="sm"
                    radius="md"
                    label="Días de antelación"
                    placeholder="Ej: 3"
                    min={1}
                    max={30}
                    value={(notifPrefs as Record<string, unknown>)?.advance_days_1 as number ?? 3}
                    onChange={(v) => updatePrefs.mutate({ advance_days_1: { email: true, in_app: true, value: Number(v) || 3 } } as never)}
                  />
                </Paper>
                <Paper p="md" withBorder radius="md">
                  <Text fw={500} size="sm" mb="xs">Segundo recordatorio (opcional)</Text>
                  <NumberInput
                    size="sm"
                    radius="md"
                    label="Días de antelación"
                    placeholder="Ej: 1"
                    min={1}
                    max={30}
                    value={(notifPrefs as Record<string, unknown>)?.advance_days_2 as number ?? undefined}
                    onChange={(v) => updatePrefs.mutate({ advance_days_2: { email: true, in_app: true, value: v ? Number(v) : null } } as never)}
                  />
                </Paper>
              </SimpleGrid>

              <Divider my="lg" />

              <Group justify="center" gap="xl">
                <Group gap="xs"><IconMail size={14} color="var(--mantine-color-dimmed)" /><Text size="xs" c="dimmed">= Notifica por email</Text></Group>
                <Group gap="xs"><IconBell size={14} color="var(--mantine-color-dimmed)" /><Text size="xs" c="dimmed">= Notifica en app/web</Text></Group>
              </Group>
            </Box>
          </Tabs.Panel>

          {/* ==================== BOOKING ==================== */}
          <Tabs.Panel value="booking">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Configuración de Reservas
              </Text>
              <form onSubmit={bookingForm.onSubmit((v) => bookingUpdateMutation.mutate(v))}>
                <Stack gap="md">
                  <Group grow>
                    <NumberInput label="Duración por defecto (minutos)" max={240} min={15} step={15} {...bookingForm.getInputProps("default_duration")} />
                    <NumberInput label="Tiempo entre sesiones (minutos)" max={60} min={0} step={5} {...bookingForm.getInputProps("buffer_time")} />
                  </Group>
                  <Group grow>
                    <NumberInput label="Máximo días de antelación" max={365} min={1} {...bookingForm.getInputProps("max_advance_days")} />
                    <NumberInput label="Mínimo horas de antelación" max={72} min={0} {...bookingForm.getInputProps("min_advance_hours")} />
                  </Group>
                  <NumberInput description="El cliente puede cancelar sin penalización hasta X horas antes" label="Política de cancelación (horas antes)" max={72} min={0} {...bookingForm.getInputProps("cancellation_policy_hours")} />

                  <Divider my="sm" />

                  <Switch description="Los clientes pueden reservar sesiones desde su app/portal" label="Permitir reservas de clientes" {...bookingForm.getInputProps("allow_client_booking", { type: "checkbox" })} />
                  <Switch description="Los clientes pueden cancelar sus propias reservas" label="Permitir cancelaciones de clientes" {...bookingForm.getInputProps("allow_client_cancellation", { type: "checkbox" })} />
                  <Switch description="El cliente debe pagar al hacer la reserva" label="Requerir pago por adelantado" {...bookingForm.getInputProps("require_payment_upfront", { type: "checkbox" })} />

                  <Divider my="sm" />

                  <Switch description="Envía recordatorios por email antes de las sesiones" label="Enviar recordatorios automáticos" {...bookingForm.getInputProps("send_reminders", { type: "checkbox" })} />
                  {bookingForm.values.send_reminders && (
                    <NumberInput label="Horas antes del recordatorio" max={72} min={1} {...bookingForm.getInputProps("reminder_hours")} />
                  )}

                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={bookingUpdateMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      Guardar Cambios
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Box>

            <WeeklyScheduleSection wsSettings={wsSettings} workspaceId={currentWorkspace?.id} setWorkspace={setWorkspace} />
          </Tabs.Panel>

          {/* ==================== INTEGRATIONS ==================== */}
          <Tabs.Panel value="integrations">
            <Stack gap="lg">
              {/* Google Calendar */}
              <Box className="nv-card" p="lg">
                <Group justify="space-between" mb="lg">
                  <Box>
                    <Group gap="sm" mb={4}>
                      <IconBrandGoogle size={24} color="#4285F4" />
                      <Text fw={600} size="lg" style={{ color: "var(--nv-text-primary)" }}>Google Calendar</Text>
                    </Group>
                    <Text c="dimmed" size="sm">Sincroniza tus reservas con Google Calendar de forma bidireccional</Text>
                  </Box>
                  {googleCalendarStatus?.connected && (
                    <Badge color="green" size="lg" variant="light" leftSection={<IconCheck size={14} />}>Conectado</Badge>
                  )}
                </Group>

                {loadingGoogleCalendar ? (
                  <Box py="xl" ta="center">
                    <Loader size="sm" />
                    <Text c="dimmed" size="sm" mt="sm">Cargando estado de Google Calendar...</Text>
                  </Box>
                ) : googleCalendarStatus?.connected ? (
                  <Stack gap="md">
                    <Paper p="md" radius="md" style={{ backgroundColor: "var(--mantine-color-blue-0)", border: "1px solid var(--mantine-color-blue-2)" }}>
                      <Group>
                        <ThemeIcon color="blue" size={48} radius="xl" variant="light"><IconCalendarEvent size={28} /></ThemeIcon>
                        <Box flex={1}>
                          <Text fw={600} size="lg">{googleCalendarStatus.email}</Text>
                          <Text c="dimmed" size="sm">Calendario: {googleCalendarStatus.calendar_name || "Principal"}</Text>
                          <Text c="dimmed" size="xs">{formatLastSync(googleCalendarStatus.last_sync_at)}</Text>
                        </Box>
                        <Group>
                          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => syncGoogleCalendar.mutate()} loading={syncGoogleCalendar.isPending}>Sincronizar</Button>
                          <Button color="red" variant="subtle" onClick={handleDisconnectGoogleCalendar} loading={disconnectGoogleCalendar.isPending}>Desconectar</Button>
                        </Group>
                      </Group>
                    </Paper>
                    <Group>
                      <Switch checked={googleCalendarStatus.sync_enabled} onChange={(e) => updateGoogleCalendarSettings.mutate(e.currentTarget.checked)} label="Sincronización automática" description="Las reservas se sincronizan automáticamente con Google Calendar" />
                    </Group>
                    <Alert color="blue" variant="light" radius="lg">
                      <Text size="sm">Tus reservas se sincronizarán automáticamente con Google Calendar. Los cambios en cualquier plataforma se reflejarán en la otra.</Text>
                    </Alert>
                  </Stack>
                ) : (
                  <Stack gap="md">
                    <Paper p="xl" radius="lg" style={{ backgroundColor: "var(--nv-surface)", border: "1px dashed var(--nv-border)", textAlign: "center" }}>
                      <ThemeIcon color="blue" size={64} radius="xl" variant="light" mx="auto" mb="md"><IconCalendarEvent size={36} /></ThemeIcon>
                      <Text fw={600} size="lg" mb="xs">Conecta tu Google Calendar</Text>
                      <Text c="dimmed" size="sm" mb="lg" maw={400} mx="auto">Sincroniza tus reservas de forma bidireccional con Google Calendar.</Text>
                      <Button color="blue" size="md" radius="xl" leftSection={<IconBrandGoogle size={18} />} onClick={handleConnectGoogleCalendar} loading={googleCalendarAuthUrl.isPending}>Conectar con Google</Button>
                    </Paper>
                    <Box>
                      <Text fw={500} mb="sm">Beneficios de conectar Google Calendar:</Text>
                      <List spacing="xs" size="sm" icon={<IconCheck size={14} color="var(--mantine-color-green-6)" />}>
                        <List.Item>Sincronización bidireccional de reservas</List.Item>
                        <List.Item>Ve tus sesiones junto a tus otros eventos</List.Item>
                        <List.Item>Recibe recordatorios de Google Calendar</List.Item>
                        <List.Item>Evita conflictos de horario automáticamente</List.Item>
                        <List.Item>Comparte disponibilidad fácilmente</List.Item>
                      </List>
                    </Box>
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* WhatsApp Business */}
              <Box className="nv-card" p="lg">
                <Group justify="space-between" mb="lg">
                  <Box>
                    <Group gap="sm" mb={4}>
                      <IconBrandWhatsapp size={24} color="#25D366" />
                      <Text fw={600} size="lg" style={{ color: "var(--nv-text-primary)" }}>WhatsApp Business</Text>
                    </Group>
                    <Text c="dimmed" size="sm">Conecta tu cuenta de WhatsApp Business para comunicarte con tus clientes</Text>
                  </Box>
                  {whatsappStatus?.connected && (
                    <Badge color="green" size="lg" variant="light" leftSection={<IconCheck size={14} />}>Conectado</Badge>
                  )}
                </Group>

                {loadingWhatsApp ? (
                  <Box py="xl" ta="center">
                    <Loader size="sm" />
                    <Text c="dimmed" size="sm" mt="sm">Cargando estado de WhatsApp...</Text>
                  </Box>
                ) : whatsappStatus?.connected ? (
                  <Stack gap="md">
                    <Paper p="md" radius="md" style={{ backgroundColor: "var(--mantine-color-green-0)", border: "1px solid var(--mantine-color-green-2)" }}>
                      <Group>
                        <ThemeIcon color="green" size={48} radius="xl" variant="light"><IconBrandWhatsapp size={28} /></ThemeIcon>
                        <Box flex={1}>
                          <Text fw={600} size="lg">{formatPhoneNumber(whatsappStatus.display_phone_number)}</Text>
                          <Text c="dimmed" size="sm">{getConnectionTime(whatsappStatus.connected_at)}</Text>
                        </Box>
                        <Button color="red" variant="subtle" onClick={handleDisconnectWhatsApp} loading={disconnectWhatsApp.isPending}>Desconectar</Button>
                      </Group>
                    </Paper>
                    {whatsappStatus.is_coexistence ? (
                      <Alert
                        color="yellow"
                        icon={<IconAlertTriangle size={16} />}
                        radius="lg"
                        title="Modo coexistencia activo"
                        variant="light"
                      >
                        <Text size="sm">
                          Conectaste tu número manteniéndolo activo en la app
                          oficial de WhatsApp (modo coexistencia). Por
                          limitaciones de Meta, desde Trackfiz sólo podrás{" "}
                          <b>responder</b> a clientes que te hayan escrito en
                          las últimas 24&nbsp;h; los mensajes de texto
                          iniciados desde la plataforma serán rechazados por
                          WhatsApp.
                        </Text>
                        <Text mt={4} size="sm">
                          Si necesitas iniciar conversaciones libremente,
                          desconecta y vuelve a conectar eligiendo{" "}
                          <b>API nativa (dedicated)</b>, o crea plantillas
                          aprobadas para tus mensajes proactivos.
                        </Text>
                      </Alert>
                    ) : (
                      <Alert color="blue" variant="light" radius="lg">
                        <Text size="sm">
                          Los mensajes de WhatsApp ahora aparecerán en tu
                          bandeja de Chat.
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                ) : (
                  <Stack gap="md">
                    <Paper p="xl" radius="lg" style={{ backgroundColor: "var(--nv-surface)", border: "1px dashed var(--nv-border)", textAlign: "center" }}>
                      <ThemeIcon color="green" size={64} radius="xl" variant="light" mx="auto" mb="md"><IconBrandWhatsapp size={36} /></ThemeIcon>
                      <Text fw={600} size="lg" mb="xs">Conecta tu WhatsApp Business</Text>
                      <Text c="dimmed" size="sm" mb="lg" maw={400} mx="auto">Integra tu cuenta de WhatsApp Business para enviar y recibir mensajes directamente desde la plataforma.</Text>
                      <Button color="green" size="md" radius="xl" leftSection={<IconPlugConnected size={18} />} onClick={handleConnectWhatsApp} loading={connectWhatsApp.isPending || isConnecting}>
                        {isConnecting ? "Esperando conexión..." : "Conectar WhatsApp"}
                      </Button>
                      {isConnecting && <Text c="dimmed" size="xs" mt="sm">Completa el proceso en la ventana emergente</Text>}
                    </Paper>
                    <Box>
                      <Text fw={500} mb="sm">Beneficios de conectar WhatsApp:</Text>
                      <List spacing="xs" size="sm" icon={<IconCheck size={14} color="var(--mantine-color-green-6)" />}>
                        <List.Item>Recibe mensajes de clientes en tu bandeja de chat unificada</List.Item>
                        <List.Item>Envía mensajes a clientes por WhatsApp o plataforma</List.Item>
                        <List.Item>Indicadores visuales claros del origen de cada mensaje</List.Item>
                        <List.Item>Historial completo de conversaciones en un solo lugar</List.Item>
                        <List.Item>Notificaciones cuando recibas nuevos mensajes</List.Item>
                      </List>
                    </Box>
                  </Stack>
                )}
              </Box>

              {/* Info section */}
              <Box className="nv-card" p="lg">
                <Text fw={600} mb="md" size="lg" style={{ color: "var(--nv-text-primary)" }}>Información sobre integraciones</Text>
                <Stack gap="sm">
                  <Group><ThemeIcon color="blue" variant="light" size="sm"><IconShield size={14} /></ThemeIcon><Text size="sm">Tus credenciales están seguras. Utilizamos OAuth para autenticación segura.</Text></Group>
                  <Group><ThemeIcon color="blue" variant="light" size="sm"><IconRefresh size={14} /></ThemeIcon><Text size="sm">Las sincronizaciones se realizan automáticamente cuando creas o modificas reservas.</Text></Group>
                  <Group><ThemeIcon color="blue" variant="light" size="sm"><IconExternalLink size={14} /></ThemeIcon><Text size="sm">Puedes revocar el acceso en cualquier momento desde la configuración de tu cuenta de Google/WhatsApp.</Text></Group>
                </Stack>
              </Box>
            </Stack>
          </Tabs.Panel>

          {/* ==================== BILLING ==================== */}
          <Tabs.Panel value="billing">
            <Stack gap="lg">
              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>Plan Actual</Text>
                <Group justify="space-between" mb="md">
                  <Box>
                    <Badge color="primary" mb="xs" size="lg">{billingData?.plan_name || "Plan Pro"}</Badge>
                    <Text c="dimmed" size="sm">
                      {billingData?.renewal_date
                        ? `Renovación: ${new Date(billingData.renewal_date).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}`
                        : "Renovación: información no disponible"}
                    </Text>
                  </Box>
                  <Box ta="right">
                    <Text fw={700} size="xl">{billingData?.price || "—"}</Text>
                    <Button size="xs" variant="light">Cambiar plan</Button>
                  </Box>
                </Group>
                <Alert color="green" icon={<IconCheck size={16} />} variant="light" radius="lg">
                  Tu plan incluye: clientes ilimitados, automatizaciones, chat, y soporte prioritario.
                </Alert>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>Método de Pago</Text>
                <Group justify="space-between" p="md" style={{ border: "1px solid var(--nv-border)", borderRadius: "var(--radius-item)" }}>
                  <Group>
                    <ThemeIcon color="blue" size="lg" variant="light" radius="xl"><IconCreditCard size={20} /></ThemeIcon>
                    <Box>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        {billingData?.card_last4 ? `•••• •••• •••• ${billingData.card_last4}` : "Sin método de pago"}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {billingData?.card_expiry ? `Expira ${billingData.card_expiry}` : "Añade un método de pago"}
                      </Text>
                    </Box>
                  </Group>
                  <Button size="xs" variant="light" radius="xl">Actualizar</Button>
                </Group>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>Historial de Facturas</Text>
                {billingData?.invoices?.length > 0 ? (
                  <ScrollArea type="auto">
                    <Table style={{ minWidth: 500 }}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Fecha</Table.Th>
                          <Table.Th>Concepto</Table.Th>
                          <Table.Th>Importe</Table.Th>
                          <Table.Th>Estado</Table.Th>
                          <Table.Th />
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {billingData.invoices.map((inv: any) => (
                          <Table.Tr key={inv.id}>
                            <Table.Td>{new Date(inv.date).toLocaleDateString("es-ES")}</Table.Td>
                            <Table.Td>{inv.description}</Table.Td>
                            <Table.Td>{inv.amount}</Table.Td>
                            <Table.Td><Badge color={inv.status === "paid" ? "green" : "orange"} variant="light">{inv.status === "paid" ? "Pagado" : "Pendiente"}</Badge></Table.Td>
                            <Table.Td>{inv.pdf_url && <Button size="xs" variant="subtle" component="a" href={inv.pdf_url} target="_blank">Descargar</Button>}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <Text c="dimmed" size="sm" ta="center" py="lg">No hay facturas disponibles</Text>
                )}
              </Box>
            </Stack>
          </Tabs.Panel>

          {/* ==================== SECURITY ==================== */}
          <Tabs.Panel value="security">
            <Stack gap="lg">
              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>Cambiar Contraseña</Text>
                <form onSubmit={passwordForm.onSubmit((v) => changePasswordMutation.mutate(v))}>
                  <Stack gap="md">
                    <PasswordInput label="Contraseña actual" placeholder="Tu contraseña actual" {...passwordForm.getInputProps("current_password")} />
                    <PasswordInput label="Nueva contraseña" placeholder="Nueva contraseña" {...passwordForm.getInputProps("new_password")} />
                    <PasswordInput label="Confirmar nueva contraseña" placeholder="Confirmar nueva contraseña" {...passwordForm.getInputProps("confirm_password")} />
                    <Group justify="flex-end">
                      <Button type="submit" radius="xl" loading={changePasswordMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                        Cambiar Contraseña
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>Autenticación de Dos Factores</Text>
                <Group justify="space-between">
                  <Box>
                    <Text size="sm" style={{ color: "var(--nv-text-primary)" }}>Protege tu cuenta con 2FA</Text>
                    <Text c="dimmed" size="xs">Añade una capa extra de seguridad a tu cuenta</Text>
                  </Box>
                  <Button leftSection={<IconLock size={16} />} variant="light" radius="xl">Configurar 2FA</Button>
                </Group>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>Sesiones Activas</Text>
                <Stack gap="sm">
                  <Group justify="space-between" p="sm" style={{ border: "1px solid var(--nv-border)", borderRadius: "var(--radius-item)" }}>
                    <Box>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>Este dispositivo</Text>
                      <Text c="dimmed" size="xs">Sesión actual</Text>
                    </Box>
                    <Badge color="green" variant="light" radius="xl">Actual</Badge>
                  </Group>
                </Stack>
              </Box>

              <Box className="nv-card" p="lg" style={{ borderColor: "var(--nv-error)" }}>
                <Text c="red" fw={600} mb="lg" size="lg">Zona de Peligro</Text>
                <Alert color="red" icon={<IconAlertCircle size={16} />} mb="md" variant="light" radius="lg">
                  Estas acciones son irreversibles. Procede con precaución.
                </Alert>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>Exportar todos mis datos</Text>
                      <Text c="dimmed" size="xs">Descarga una copia de todos tus datos (GDPR)</Text>
                    </Box>
                    <Button variant="light" radius="xl">Exportar</Button>
                  </Group>
                  <Divider style={{ borderColor: "var(--nv-border)" }} />
                  <Group justify="space-between">
                    <Box>
                      <Text c="red" fw={500} size="sm">Eliminar cuenta</Text>
                      <Text c="dimmed" size="xs">Elimina permanentemente tu cuenta y todos los datos</Text>
                    </Box>
                    <Button color="red" variant="light" radius="xl" onClick={openDeleteAccount}>Eliminar Cuenta</Button>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Tabs.Panel>

          {/* ==================== AUTOMATIONS ==================== */}
          <Tabs.Panel value="automations">
            <Suspense fallback={<Loader size="md" mx="auto" mt="xl" />}>
              <AutomationsPage embedded />
            </Suspense>
          </Tabs.Panel>

          {/* ==================== SUGGESTIONS ==================== */}
          <Tabs.Panel value="suggestions">
            <Suspense fallback={<Loader size="md" mx="auto" mt="xl" />}>
              <SuggestionsPage embedded />
            </Suspense>
          </Tabs.Panel>
        </Box>
      </Tabs>

      {/* ==================== MODALS ==================== */}

      {/* Invite team member */}
      <BottomSheet opened={inviteModalOpen} onClose={closeInviteModal} title="Invitar Miembro" radius="lg">
        <form onSubmit={inviteForm.onSubmit((v) => inviteMutation.mutate(v))}>
          <Stack gap="md">
            <TextInput label="Email" placeholder="email@ejemplo.com" {...inviteForm.getInputProps("email")} />
            <Select
              label="Rol"
              data={[
                { value: "collaborator", label: "Colaborador" },
                { value: "client", label: "Cliente" },
              ]}
              {...inviteForm.getInputProps("role")}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeInviteModal} radius="xl">Cancelar</Button>
              <Button type="submit" loading={inviteMutation.isPending} radius="xl" style={{ backgroundColor: "var(--nv-primary)" }}>Enviar Invitación</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Remove team member confirmation */}
      <BottomSheet opened={!!deleteConfirmMember} onClose={() => setDeleteConfirmMember(null)} title="Eliminar Miembro" size="sm" radius="lg" centered>
        <Stack gap="md">
          <Text size="sm">¿Estás seguro de que quieres eliminar este miembro del equipo?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteConfirmMember(null)} radius="xl">Cancelar</Button>
            <Button color="red" loading={removeMemberMutation.isPending} onClick={() => deleteConfirmMember && removeMemberMutation.mutate(deleteConfirmMember)} radius="xl">
              Eliminar
            </Button>
          </Group>
        </Stack>
      </BottomSheet>

      {/* Delete account confirmation */}
      <BottomSheet opened={deleteAccountModal} onClose={closeDeleteAccount} title="Eliminar Cuenta" size="md" radius="lg" centered>
        <form onSubmit={deleteAccountForm.onSubmit((v) => deleteAccountMutation.mutate(v))}>
          <Stack gap="md">
            <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light" radius="lg">
              Esta acción es irreversible. Tu cuenta y todos los datos asociados serán eliminados permanentemente tras un periodo de gracia de 30 días.
            </Alert>
            <PasswordInput label="Confirma tu contraseña" placeholder="Tu contraseña actual" {...deleteAccountForm.getInputProps("password")} />
            <Textarea label="Motivo (opcional)" placeholder="¿Por qué quieres eliminar tu cuenta?" {...deleteAccountForm.getInputProps("reason")} />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDeleteAccount} radius="xl">Cancelar</Button>
              <Button color="red" type="submit" loading={deleteAccountMutation.isPending} radius="xl">Eliminar Cuenta</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}
