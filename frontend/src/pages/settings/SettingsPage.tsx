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
  IconWorld,
} from "@tabler/icons-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { openDangerConfirm } from "../../utils/confirmModal";
import { useSearchParams } from "react-router-dom";
import { changeLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../i18n";

const AutomationsPage = lazy(() => import("../automations/AutomationsPage").then(m => ({ default: m.AutomationsPage })));
const SuggestionsPage = lazy(() => import("../suggestions/SuggestionsPage").then(m => ({ default: m.SuggestionsPage })));
import { PageHeader } from "../../components/common/PageHeader";
import {
  PasswordRulesIndicator,
  passwordValidator,
} from "../../components/common/PasswordRulesIndicator";
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
import { applyWorkspaceCssVars, DEFAULT_WORKSPACE_BRANDING } from "../../theme/workspaceBranding";
import { getPublicAppBaseUrl } from "../../hooks/useWhiteLabelBootstrap";
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

const TAB_KEYS = [
  "workspace", "profile", "team", "branding", "notifications",
  "booking", "integrations", "billing", "security", "automations", "suggestions",
] as const;

const DAY_KEYS_I18N: Record<string, string> = {
  monday: "days.monday",
  tuesday: "days.tuesday",
  wednesday: "days.wednesday",
  thursday: "days.thursday",
  friday: "days.friday",
  saturday: "days.saturday",
  sunday: "days.sunday",
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
  const { t } = useTranslation();
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
      notifications.show({ title: "Horario guardado", message: t("settings.tu_disponibilidad_semanal_ha_sido_actualizada"), color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: t("settings.no_se_pudo_guardar"), color: "red" });
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
        {"Horario de Disponibilidad"}
      </Text>
      <Text c="dimmed" size="sm" mb="md">
        {"Configura los horarios en los que tus clientes pueden solicitar citas."}
      </Text>
      <Stack gap="sm">
        {DAY_KEYS.map((day) => (
          <Paper key={day} p="sm" withBorder radius="md">
            <Group justify="space-between" mb={schedule[day]?.length ? "xs" : 0}>
              <Text fw={500} size="sm" w={100}>{t(DAY_KEYS_I18N[day])}</Text>
              {(schedule[day] || []).length === 0 ? (
                <Group gap="xs">
                  <Badge variant="light" color="gray" size="sm">{"No disponible"}</Badge>
                  <Button variant="subtle" size="xs" onClick={() => addSlot(day)}>{"Añadir"}</Button>
                </Group>
              ) : (
                <Button variant="subtle" size="xs" onClick={() => addSlot(day)}>{"+ Rango"}</Button>
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
                <Text size="xs">{"a"}</Text>
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
          {"Guardar Horario"}
        </Button>
      </Group>
    </Box>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
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
        title: t("settings.whatsappConectado"),
        message: t("settings.estamosSincronizandoConKapsoUn"),
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setIsConnecting(false);
      syncWhatsApp.mutate();
    } else if (setupResult === "failed") {
      notifications.show({
        title: t("settings.errorDeConexion"),
        message: t("settings.noSePudoConectarWhatsapp"),
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
        title: t("settings.googleCalendarConectado"),
        message: t("settings.tuCalendarioDeGoogleHa"),
        color: "green",
        icon: <IconCheck size={16} />,
      });
      window.history.replaceState({}, "", "/settings?tab=integrations");
    } else if (googleResult === "error") {
      notifications.show({
        title: t("settings.errorDeConexion"),
        message: t("settings.noSePudoConectarGoogle"),
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
      title: t("settings.desconectarWhatsapp"),
      message: t("settings.estasSeguroDeQueQuieres"),
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
      title: t("settings.desconectarGoogleCalendar"),
      message: t("settings.estasSeguroDeQueQuieres"),
      confirmLabel: "Desconectar",
      onConfirm: async () => { await disconnectGoogleCalendar.mutateAsync(); },
    });
  };

  // ==================== WORKSPACE ====================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsSettings = (currentWorkspace?.settings || {}) as Record<string, any>;
  const wsContact = wsSettings.contact || {};
  const wsSupport = wsSettings.support || {};

  const workspaceForm = useForm({
    initialValues: {
      name: currentWorkspace?.name || "",
      slug: currentWorkspace?.slug || "",
      domain: currentWorkspace?.domain || "",
      email: wsContact.email || "",
      phone: wsContact.phone || "",
      address: wsContact.address || "",
      website: wsContact.website || "",
      description: currentWorkspace?.description || "",
      // Datos de soporte públicos (visibles para clientes y al pie de emails)
      support_phone: wsSupport.phone || "",
      support_email: wsSupport.email || "",
      email_footer: wsSupport.email_footer || "",
    },
    validate: {
      slug: (v) => {
        if (!v?.trim()) return "El slug es obligatorio";
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.trim())) {
          return "Solo minúsculas, números y guiones";
        }
        if (v.length > 80) return "Máximo 80 caracteres";
        return null;
      },
      domain: (v) => {
        if (!v?.trim()) return null;
        const host = v.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) {
          return "Dominio inválido (ej. app.micentro.com)";
        }
        return null;
      },
    },
  });

  useEffect(() => {
    if (!currentWorkspace) return;
    workspaceForm.setValues({
      name: currentWorkspace.name || "",
      slug: currentWorkspace.slug || "",
      domain: currentWorkspace.domain || "",
      email: wsContact.email || "",
      phone: wsContact.phone || "",
      address: wsContact.address || "",
      website: wsContact.website || "",
      description: currentWorkspace.description || "",
      support_phone: wsSupport.phone || "",
      support_email: wsSupport.email || "",
      email_footer: wsSupport.email_footer || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, currentWorkspace?.slug, currentWorkspace?.domain, currentWorkspace?.name]);

  const workspaceUpdateMutation = useMutation({
    mutationFn: (values: typeof workspaceForm.values) => {
      const id = currentWorkspace?.id;
      if (!id) throw new Error("No workspace");
      const domainRaw = values.domain?.trim() || "";
      return workspacesApi.update(id, {
        name: values.name,
        slug: values.slug.trim().toLowerCase(),
        domain: domainRaw
          ? domainRaw.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
          : null,
        description: values.description || null,
        settings: {
          ...wsSettings,
          contact: {
            email: values.email || null,
            phone: values.phone || null,
            address: values.address || null,
            website: values.website || null,
          },
          support: {
            phone: values.support_phone || null,
            email: values.support_email || null,
            email_footer: values.email_footer || null,
          },
        },
      });
    },
    onSuccess: (res) => {
      const ws = res.data;
      setWorkspace(ws);
      notifications.show({ title: t("settings.workspace.updated"), message: t("common.savedSuccessfully"), color: "green", icon: <IconCheck size={16} /> });
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "No se pudo guardar";
      notifications.show({ title: t("settings.error"), message: detail, color: "red" });
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

  // Sync language from user preferences on mount
  useEffect(() => {
    const userLang = userPrefs.language as string | undefined;
    if (userLang && ["es", "en", "it"].includes(userLang)) {
      changeLanguage(userLang as SupportedLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPrefs.language]);

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
      notifications.show({ title: t("settings.profile.updated"), message: t("common.savedSuccessfully"), color: "green", icon: <IconCheck size={16} /> });
    },
    onError: () => {
      notifications.show({ title: t("settings.error"), message: t("settings.noSePudoGuardar"), color: "red" });
    },
  });

  const [avatarUploading, setAvatarUploading] = useState(false);
  const handleTrainerAvatarUpload = async (file: File | null) => {
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await usersApi.uploadAvatar(formData);
      const avatarUrl = (res.data as { avatar_url: string }).avatar_url;
      setUser({ ...user, avatar_url: avatarUrl });
      notifications.show({
        title: t("settings.fotoActualizada"),
        message: t("settings.tuFotoDePerfilSe"),
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch {
      notifications.show({
        title: t("settings.error"),
        message: t("settings.noSePudoSubirLa"),
        color: "red",
      });
    } finally {
      setAvatarUploading(false);
    }
  };
  // Change email
  const changeEmailForm = useForm({
    initialValues: { new_email: "", password: "" },
    validate: {
      new_email: (v) => !v ? "Requerido" : !/^\S+@\S+\.\S+$/.test(v) ? t("auth.invalidEmail") : v === user?.email ? "Debe ser diferente" : null,
      password: (v) => (!v ? "Requerida" : null),
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: (data: { new_email: string; password: string }) => authApi.changeEmail(data),
    onSuccess: (response) => {
      const { new_email } = response.data as { new_email: string };
      setUser({ ...user!, email: new_email });
      changeEmailForm.reset();
      notifications.show({ title: t("settings.emailActualizado"), message: t("settings.cambiadoCorrectamente"), color: "green", icon: <IconCheck size={16} /> });
    },
    onError: (error: any) => {
      notifications.show({ title: t("settings.error"), message: error.response?.data?.detail || "No se pudo cambiar", color: "red" });
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
    validate: { email: (v) => (!v || !/^\S+@\S+\.\S+$/.test(v) ? t("auth.invalidEmail") : null) },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => usersApi.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      notifications.show({ title: t("settings.invitacionEnviada"), message: t("settings.seHaEnviadoLaInvitacion"), color: "green", icon: <IconCheck size={16} /> });
      closeInviteModal();
      inviteForm.reset();
    },
    onError: (err: any) => {
      notifications.show({ title: t("settings.error"), message: err.response?.data?.detail || "No se pudo invitar", color: "red" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => usersApi.remove(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      notifications.show({ title: t("settings.miembroEliminado"), message: t("settings.eliminadoDelEquipo"), color: "green" });
      setDeleteConfirmMember(null);
    },
    onError: () => {
      notifications.show({ title: t("settings.error"), message: t("settings.noSePudoEliminar"), color: "red" });
    },
  });

  // ==================== BRANDING ====================
  const brandingForm = useForm({
    initialValues: {
      primary_color: currentWorkspace?.branding?.primary_color || DEFAULT_WORKSPACE_BRANDING.primary_color,
      secondary_color: currentWorkspace?.branding?.secondary_color || DEFAULT_WORKSPACE_BRANDING.secondary_color,
      accent_color: currentWorkspace?.branding?.accent_color || DEFAULT_WORKSPACE_BRANDING.accent_color,
    },
  });

  useEffect(() => {
    if (currentWorkspace?.branding) {
      brandingForm.setValues({
        primary_color: currentWorkspace.branding.primary_color || DEFAULT_WORKSPACE_BRANDING.primary_color,
        secondary_color: currentWorkspace.branding.secondary_color || DEFAULT_WORKSPACE_BRANDING.secondary_color,
        accent_color: currentWorkspace.branding.accent_color || DEFAULT_WORKSPACE_BRANDING.accent_color,
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
      applyWorkspaceCssVars(res.data.branding);
      notifications.show({ title: t("settings.marcaActualizada"), message: t("settings.coloresAplicadosEnTodaLa"), color: "green", icon: <IconCheck size={16} /> });
    },
    onError: () => {
      notifications.show({ title: t("settings.error"), message: t("settings.noSePudoGuardar"), color: "red" });
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
      notifications.show({ title: t("settings.reservasActualizado"), message: t("settings.politicasGuardadas"), color: "green", icon: <IconCheck size={16} /> });
    },
    onError: () => {
      notifications.show({ title: t("settings.error"), message: t("settings.noSePudoGuardar"), color: "red" });
    },
  });

  // ==================== SECURITY ====================
  const passwordForm = useForm({
    initialValues: { current_password: "", new_password: "", confirm_password: "" },
    validate: {
      current_password: (v) => (!v ? "Requerida" : null),
      new_password: passwordValidator,
      confirm_password: (v, values) => v !== values.new_password ? t("settingsPage.noCoinciden") : null,
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: typeof passwordForm.values) =>
      authApi.changePassword(values.current_password, values.new_password),
    onSuccess: () => {
      passwordForm.reset();
      notifications.show({ title: t("settings.contrasenaCambiada"), message: t("settings.tuContrasenaHaSidoActualizada"), color: "green", icon: <IconCheck size={16} /> });
    },
    onError: (err: any) => {
      notifications.show({ title: t("settings.error"), message: err.response?.data?.detail || "No se pudo cambiar", color: "red" });
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
      notifications.show({ title: t("settings.solicitudEnviada"), message: t("settings.tuCuentaSeraEliminadaEn"), color: "orange" });
    },
    onError: (err: any) => {
      notifications.show({ title: t("settings.error"), message: err.response?.data?.detail || "No se pudo procesar", color: "red" });
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
        description={t("settings.description")}
        title={t("settings.title")}
      />

      {isMobile && (
        <Select
          data={TAB_KEYS.map(k => ({ value: k, label: t(`settings.tabs.${k}`) }))}
          label={t("settings.section")}
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
            <Tabs.Tab leftSection={<IconBuilding size={16} />} value="workspace" style={{ fontWeight: 500 }}>{t("settings.tabs.workspace")}</Tabs.Tab>
            <Tabs.Tab leftSection={<IconUser size={16} />} value="profile" style={{ fontWeight: 500 }}>{t("settings.tabs.profile")}</Tabs.Tab>
            <Tabs.Tab leftSection={<IconUsers size={16} />} value="team" style={{ fontWeight: 500 }}>{t("settings.tabs.team")}</Tabs.Tab>
            <Tabs.Tab leftSection={<IconPalette size={16} />} value="branding" style={{ fontWeight: 500 }}>{t("settings.tabs.branding")}</Tabs.Tab>
            <Tabs.Tab leftSection={<IconBell size={16} />} value="notifications" style={{ fontWeight: 500 }}>{t("settings.tabs.notifications")}</Tabs.Tab>
            <Tabs.Tab leftSection={<IconCalendar size={16} />} value="booking" style={{ fontWeight: 500 }}>{t("settings.tabs.booking")}</Tabs.Tab>
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
              {t("settings.tabs.integrations")}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconCreditCard size={16} />} value="billing" style={{ fontWeight: 500 }}>{t("settings.tabs.billing")}</Tabs.Tab>
            <Tabs.Tab leftSection={<IconShield size={16} />} value="security" style={{ fontWeight: 500 }}>{t("settings.tabs.security")}</Tabs.Tab>
            <Divider my="xs" color="var(--nv-border)" />
            <Tabs.Tab leftSection={<IconRobot size={16} />} value="automations" style={{ fontWeight: 500 }}>{t("settings.tabs.automations")}</Tabs.Tab>
            <Tabs.Tab leftSection={<IconBulb size={16} />} value="suggestions" style={{ fontWeight: 500 }}>{t("settings.tabs.suggestions")}</Tabs.Tab>
          </Tabs.List>
        )}

        <Box style={{ flex: 1 }}>
          {/* ==================== WORKSPACE ==================== */}
          <Tabs.Panel value="workspace">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                {t("settings.workspace.title")}
              </Text>

              <Group mb="xl">
                <Avatar color="primary" radius="md" size={80} src={currentWorkspace?.logo_url}>
                  {currentWorkspace?.name?.charAt(0) || "W"}
                </Avatar>
                <Box>
                  <Text fw={500}>{currentWorkspace?.name || "Workspace"}</Text>
                  <Text c="dimmed" size="sm">{t("settings.workspace.photo")}</Text>
                  <FileButton
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (file) => {
                      if (!file || !currentWorkspace?.id) return;
                      try {
                        const res = await workspacesApi.uploadLogo(currentWorkspace.id, file);
                        setWorkspace({ ...currentWorkspace, logo_url: res.data.logo_url });
                        notifications.show({ title: t("settings.fotoActualizada"), message: t("settings.laFotoDelWorkspaceSe"), color: "green" });
                      } catch {
                        notifications.show({ title: t("settings.error"), message: t("settings.noSePudoSubirLa"), color: "red" });
                      }
                    }}
                  >
                    {(props) => (
                      <Button {...props} leftSection={<IconUpload size={14} />} mt="xs" size="xs" variant="light">
                        {t("common.changePhoto")}
                      </Button>
                    )}
                  </FileButton>
                </Box>
              </Group>

              <Divider mb="lg" />

              <form onSubmit={workspaceForm.onSubmit((v) => workspaceUpdateMutation.mutate(v))}>
                <Stack gap="md">
                  <Group grow>
                    <TextInput label={t("settings.workspace.businessName")} placeholder={t("settings.workspace.businessNamePlaceholder")} {...workspaceForm.getInputProps("name")} />
                    <TextInput
                      label={t("settings.slugUrlPublica")}
                      description={`Alta de clientes: ${getPublicAppBaseUrl({ domain: currentWorkspace?.domain, slug: workspaceForm.values.slug })}/onboarding/${workspaceForm.values.slug || "tu-slug"}`}
                      placeholder={t("settings.miCentroFitness")}
                      {...workspaceForm.getInputProps("slug")}
                      onChange={(e) => {
                        const raw = e.currentTarget.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-{2,}/g, "-");
                        workspaceForm.setFieldValue("slug", raw);
                      }}
                    />
                  </Group>
                  <TextInput
                    label={t("settings.dominioPersonalizadoWhiteLabel")}
                    description={t("settings.hostnamePropioEjAppMicentro")}
                    placeholder={t("settings.appMicentroCom")}
                    leftSection={<IconWorld size={16} />}
                    {...workspaceForm.getInputProps("domain")}
                  />
                  {workspaceForm.values.domain?.trim() ? (
                    <Alert color="blue" radius="md" variant="light" icon={<IconWorld size={16} />}>
                      <Text size="sm" fw={600} mb={6}>{t("settings.configuracionDns")}</Text>
                      <Text size="sm" mb={4}>
                        1. Crea un registro <b>CNAME</b> en tu DNS:
                      </Text>
                      <Text size="xs" mb={6} style={{ fontFamily: "monospace" }}>
                        {workspaceForm.values.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")} → app.trackfiz.com
                      </Text>
                      <Text size="sm" mb={4}>
                        2. Espera la propagación DNS (minutos a pocas horas).
                      </Text>
                      <Text size="sm">
                        3. Abre{" "}
                        <Text span fw={600}>
                          https://{workspaceForm.values.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
                        </Text>{" "}
                        — verás tu logo, colores y nombre. Los emails de invitación siguen usando app.trackfiz.com hasta que el DNS esté activo (así no se rompe el enlace).
                      </Text>
                    </Alert>
                  ) : null}
                  <Group grow>
                    <TextInput label={t("settings.emailDeContacto")} placeholder={t("settings.contactoEjemploCom")} {...workspaceForm.getInputProps("email")} />
                    <TextInput label={t("settings.telefono")} placeholder="+34 600 000 000" {...workspaceForm.getInputProps("phone")} />
                  </Group>
                  <TextInput label={t("settings.direccion")} placeholder={t("settings.calleNumeroCiudad")} {...workspaceForm.getInputProps("address")} />
                  <TextInput label={t("settings.sitioWeb")} placeholder="https://tuwebsite.com" {...workspaceForm.getInputProps("website")} />
                  <Textarea label={t("settings.descripcion")} minRows={3} placeholder={t("settings.describeTuNegocio")} {...workspaceForm.getInputProps("description")} />

                  <Divider
                    my="sm"
                    label={t("settings.datosDeContactoDeSoporte")}
                    labelPosition="left"
                  />
                  <Alert color="blue" variant="light" radius="md">
                    <Text size="sm">
                      {t("settings.estosDatosSon")} <b>{t("settings.publicos")}</b>: aparecerán en la pantalla
                      que ven los clientes tras pagar, en los emails que les
                      enviamos y en sus avisos cuando tengan algún problema.
                    </Text>
                  </Alert>
                  <Group grow>
                    <TextInput
                      label={t("settings.movilDeSoporte")}
                      placeholder="+34 600 000 000"
                      leftSection={<IconBrandWhatsapp size={16} />}
                      {...workspaceForm.getInputProps("support_phone")}
                    />
                    <TextInput
                      label={t("settings.emailDeSoporte")}
                      placeholder={t("settings.soporteTudominioCom")}
                      leftSection={<IconMail size={16} />}
                      {...workspaceForm.getInputProps("support_email")}
                    />
                  </Group>
                  <Textarea
                    label={t("settings.pieDeEmail")}
                    description={t("settings.textoQueApareceraAlFinal")}
                    placeholder={t("settingsPage.vamosADarleGASNBorjaSanfélix")}
                    minRows={3}
                    autosize
                    {...workspaceForm.getInputProps("email_footer")}
                  />

                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={workspaceUpdateMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      {t("common.saveChanges")}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Box>
          </Tabs.Panel>

          {/* ==================== PROFILE ==================== */}
          <Tabs.Panel value="profile">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.profile.title")}</Text>
              <Group mb="xl">
                <Avatar color="primary" radius="xl" size={80} src={user?.avatar_url}>
                  {user?.full_name?.charAt(0) || "U"}
                </Avatar>
                <Box>
                  <Text fw={500}>{user?.full_name || "Usuario"}</Text>
                  <Text c="dimmed" size="sm">{user?.email}</Text>
                  <FileButton onChange={handleTrainerAvatarUpload} accept="image/png,image/jpeg,image/webp">
                    {(props) => (
                      <Button
                        {...props}
                        leftSection={<IconUpload size={14} />}
                        mt="xs"
                        size="xs"
                        variant="light"
                        loading={avatarUploading}
                      >
                        {t("settings.cambiarFoto")}
                      </Button>
                    )}
                  </FileButton>
                </Box>
              </Group>

              <form onSubmit={profileForm.onSubmit((v) => profileUpdateMutation.mutate(v))}>
                <Stack gap="md">
                  <TextInput label={t("settings.profile.fullName")} placeholder={t("settings.profile.fullNamePlaceholder")} {...profileForm.getInputProps("full_name")} />
                  <TextInput disabled label={t("settings.profile.emailLabel")} {...profileForm.getInputProps("email")} />
                  <TextInput label={t("common.phone")} placeholder={t("settings.profile.phonePlaceholder")} {...profileForm.getInputProps("phone")} />
                  <Group grow>
                    <Select
                      data={[
                        { value: "Europe/Madrid", label: t("settings.profile.timezones.madrid") },
                        { value: "Europe/London", label: t("settings.profile.timezones.london") },
                        { value: "America/New_York", label: t("settings.profile.timezones.newYork") },
                      ]}
                      label={t("settings.profile.timezone")}
                      {...profileForm.getInputProps("timezone")}
                    />
                    <Select
                      data={SUPPORTED_LANGUAGES.map(l => ({ value: l.value, label: l.label }))}
                      label={t("settings.profile.language")}
                      {...profileForm.getInputProps("language")}
                      onChange={(value) => {
                        profileForm.setFieldValue("language", value || "es");
                        if (value) {
                          changeLanguage(value as SupportedLanguage);
                        }
                      }}
                    />
                  </Group>
                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={profileUpdateMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      {t("common.saveChanges")}
                    </Button>
                  </Group>
                </Stack>
              </form>

              <Divider my="xl" />

              <Text fw={600} mb="md" size="md" style={{ color: "var(--nv-text-primary)" }}>{t("settings.cambiarEmail")}</Text>
              <form onSubmit={changeEmailForm.onSubmit((v) => changeEmailMutation.mutate(v))}>
                <Stack gap="md">
                  <TextInput label={t("settings.emailActual")} value={user?.email || ""} leftSection={<IconMail size={16} />} readOnly disabled />
                  <TextInput label={t("settings.nuevoEmail")} placeholder={t("settings.nuevoEmailCom")} leftSection={<IconMail size={16} />} {...changeEmailForm.getInputProps("new_email")} />
                  <PasswordInput label={t("settings.contrasenaActual")} placeholder={t("settings.tuContrasenaActual")} {...changeEmailForm.getInputProps("password")} />
                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={changeEmailMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      {t("settings.cambiarEmail")}
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
                  <Text fw={600} size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.team.title")}</Text>
                  <Text c="dimmed" size="sm">{t("settings.team.description")}</Text>
                </Box>
                <Button leftSection={<IconPlus size={16} />} radius="xl" onClick={openInviteModal} style={{ backgroundColor: "var(--nv-primary)" }}>
                  {t("settings.team.inviteMember")}
                </Button>
              </Group>

              <ScrollArea type="auto">
                <Table style={{ minWidth: 500 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t("common.member")}</Table.Th>
                      <Table.Th>{t("common.role")}</Table.Th>
                      <Table.Th>{t("common.status")}</Table.Th>
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
                            {t(`settings.team.roles.${member.role}`)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={member.status === "active" ? "green" : "gray"} variant="light">
                            {member.status === "active" ? t("common.active") : t("common.inactive")}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {member.role !== "owner" && (
                            <Menu position="bottom-end" withArrow>
                              <Menu.Target>
                                <ActionIcon color="gray" variant="subtle"><IconDotsVertical size={16} /></ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<IconEdit size={14} />}>{t("settings.team.editPermissions")}</Menu.Item>
                                <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => setDeleteConfirmMember(member.id)}>
                                  {t("common.delete")}
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
                {t("settings.personalizacionDeMarca")}
              </Text>

              <Stack gap="lg">
                <Box>
                  <Text fw={500} mb="xs" size="sm">{t("settings.logo")}</Text>
                  <Group>
                    <Avatar color="primary" radius="md" size={80} src={currentWorkspace?.logo_url}>
                      {currentWorkspace?.name?.charAt(0) || "F"}
                    </Avatar>
                    <Box>
                      <FileButton
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async (file) => {
                          if (!file || !currentWorkspace?.id) return;
                          try {
                            const res = await workspacesApi.uploadLogo(currentWorkspace.id, file);
                            setWorkspace({ ...currentWorkspace, logo_url: res.data.logo_url });
                            notifications.show({
                              title: t("settings.logoActualizado"),
                              message: t("settings.seMostraraEnElMenu"),
                              color: "green",
                            });
                          } catch {
                            notifications.show({ title: t("settings.error"), message: t("settings.noSePudoSubirEl"), color: "red" });
                          }
                        }}
                      >
                        {(props) => (
                          <Button {...props} leftSection={<IconUpload size={14} />} size="sm" variant="light">
                            {t("settings.subirLogo")}
                          </Button>
                        )}
                      </FileButton>
                      <Text c="dimmed" mt={4} size="xs">{t("settings.pngJpgOWebpMaximo")}</Text>
                    </Box>
                  </Group>
                </Box>

                <Divider />

                <form
                  onSubmit={brandingForm.onSubmit((v) => {
                    applyWorkspaceCssVars(v);
                    brandingUpdateMutation.mutate(v);
                  })}
                >
                  <Text fw={500} mb="md" size="sm">{t("settings.colores")}</Text>
                  <Text c="dimmed" mb="md" size="xs">
                    {t("settings.losColoresSeAplicanEn")}
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mb="lg" spacing="md">
                    <ColorInput
                      label={t("settings.colorPrimario")}
                      {...brandingForm.getInputProps("primary_color")}
                      onChange={(value) => {
                        brandingForm.setFieldValue("primary_color", value);
                        applyWorkspaceCssVars({
                          ...brandingForm.values,
                          primary_color: value,
                        });
                      }}
                    />
                    <ColorInput
                      label={t("settings.colorSecundario")}
                      {...brandingForm.getInputProps("secondary_color")}
                      onChange={(value) => {
                        brandingForm.setFieldValue("secondary_color", value);
                        applyWorkspaceCssVars({
                          ...brandingForm.values,
                          secondary_color: value,
                        });
                      }}
                    />
                    <ColorInput
                      label={t("settings.colorDeAcento")}
                      {...brandingForm.getInputProps("accent_color")}
                      onChange={(value) => {
                        brandingForm.setFieldValue("accent_color", value);
                        applyWorkspaceCssVars({
                          ...brandingForm.values,
                          accent_color: value,
                        });
                      }}
                    />
                  </SimpleGrid>

                  <Box mb="lg">
                    <Text fw={500} mb="xs" size="sm">{t("settings.vistaPrevia")}</Text>
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: `linear-gradient(135deg, ${brandingForm.values.primary_color} 0%, ${brandingForm.values.secondary_color} 100%)`,
                      }}
                    >
                      <Text c="white" fw={600}>{currentWorkspace?.name || "Trackfiz"}</Text>
                      <Text c="white" opacity={0.8} size="sm">{t("settings.tuCentroDeEntrenamiento")}</Text>
                      <Button mt="sm" size="xs" style={{ backgroundColor: brandingForm.values.accent_color }}>{t("settings.reservar")}</Button>
                    </Paper>
                  </Box>

                  <Alert color="blue" mb="md" radius="md" variant="light">
                    <Text size="sm">
                      URL pública de alta:{" "}
                      <Text span fw={600}>
                        {getPublicAppBaseUrl({
                          domain: currentWorkspace?.domain,
                          slug: currentWorkspace?.slug,
                        })}
                        /onboarding/{currentWorkspace?.slug || "tu-slug"}
                      </Text>
                    </Text>
                  </Alert>

                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={brandingUpdateMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      {t("common.saveChanges")}
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
                {t("settings.preferenciasDeNotificaciones")}
              </Text>
              <Text c="dimmed" size="sm" mb="lg">
                {t("settings.eligeComoQuieresRecibirCada")}
              </Text>

              <Group justify="space-between" mb="sm" px="md">
                <Text fw={600} size="sm" style={{ flex: 1 }}>{t("settings.tipoDeNotificacion")}</Text>
                <Group gap="lg" wrap="nowrap">
                  <Group gap={4}><IconMail size={14} /><Text fw={600} size="xs">{t("settings.email")}</Text></Group>
                  <Group gap={4}><IconBell size={14} /><Text fw={600} size="xs">{t("settings.appWeb")}</Text></Group>
                </Group>
              </Group>

              <Divider mb="md" />

              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>{t("settings.reservasYPagos")}</Text>
              <Stack gap="sm" mb="lg">
                {[
                  { key: "booking_created", label: t("settings.nuevasReservas"), desc: "Cuando un cliente hace una reserva" },
                  { key: "booking_cancelled", label: t("settings.cancelaciones"), desc: "Cuando se cancela una reserva" },
                  { key: "payment_received", label: t("settings.pagosRecibidos"), desc: "Cuando se procesa un pago" },
                  { key: "payment_failed", label: t("settings.pagosFallidos"), desc: "Cuando falla un cobro" },
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
                          <Tooltip label={t("settings.email")}><Switch size="sm" checked={emailOn} onChange={(e) => handleNotifPrefChange(item.key, "email", e.currentTarget.checked)} thumbIcon={<IconMail size={10} />} /></Tooltip>
                          <Tooltip label={t("settings.appWeb")}><Switch size="sm" checked={inAppOn} onChange={(e) => handleNotifPrefChange(item.key, "in_app", e.currentTarget.checked)} thumbIcon={<IconBell size={10} />} /></Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>{t("settings.clientesYComunicacion")}</Text>
              <Stack gap="sm" mb="lg">
                {[
                  { key: "new_message", label: t("settings.nuevosMensajes"), desc: t("settingsPage.cuandoUnClienteTeEnvíaUnMensaje") },
                  { key: "new_client", label: t("settings.nuevosClientes"), desc: "Cuando se registra un nuevo cliente" },
                  { key: "form_submitted", label: t("settings.formulariosCompletados"), desc: "Cuando un cliente completa un formulario" },
                  { key: "progress_milestone", label: t("settings.hitosDeProgreso"), desc: "Cuando un cliente alcanza un hito" },
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
                          <Tooltip label={t("settings.email")}><Switch size="sm" checked={emailOn} onChange={(e) => handleNotifPrefChange(item.key, "email", e.currentTarget.checked)} thumbIcon={<IconMail size={10} />} /></Tooltip>
                          <Tooltip label={t("settings.appWeb")}><Switch size="sm" checked={inAppOn} onChange={(e) => handleNotifPrefChange(item.key, "in_app", e.currentTarget.checked)} thumbIcon={<IconBell size={10} />} /></Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>{t("settings.tareasYAutomatizaciones")}</Text>
              <Stack gap="sm" mb="lg">
                {[
                  { key: "task_assigned", label: t("settings.tareasAsignadas"), desc: "Cuando se te asigna una nueva tarea" },
                  { key: "task_due", label: t("settings.tareasPorVencer"), desc: t("settingsPage.recordatorioDeTareasPróximasASuFec") },
                  { key: "low_stock", label: t("settings.stockBajo"), desc: "Cuando un producto tiene cantidades bajas en inventario" },
                  { key: "automation_completed", label: t("settings.automatizacionesCompletadas"), desc: t("settingsPage.cuandoUnaAutomatizaciónFinalizaSuEj") },
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
                          <Tooltip label={t("settings.email")}><Switch size="sm" checked={emailOn} onChange={(e) => handleNotifPrefChange(item.key, "email", e.currentTarget.checked)} thumbIcon={<IconMail size={10} />} /></Tooltip>
                          <Tooltip label={t("settings.appWeb")}><Switch size="sm" checked={inAppOn} onChange={(e) => handleNotifPrefChange(item.key, "in_app", e.currentTarget.checked)} thumbIcon={<IconBell size={10} />} /></Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>{t("settings.controlHorario")}</Text>
              <Stack gap="sm" mb="lg">
                {[
                  { key: "clock_in_reminder", label: t("settings.recordatorioDeFichaje"), desc: "Aviso para recordarte que debes fichar tu entrada" },
                  { key: "clock_event", label: t("settings.eventoDeFichaje"), desc: t("settingsPage.notificaciónCuandoSeRealizaUnFichaj") },
                  { key: "clock_missed", label: t("settings.fichajeNoRealizado"), desc: t("settingsPage.avisoCuandoNoSeHaFichadoYDebería") },
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
                          <Tooltip label={t("settings.email")}><Switch size="sm" checked={emailOn} onChange={(e) => handleNotifPrefChange(item.key, "email", e.currentTarget.checked)} thumbIcon={<IconMail size={10} />} /></Tooltip>
                          <Tooltip label={t("settings.appWeb")}><Switch size="sm" checked={inAppOn} onChange={(e) => handleNotifPrefChange(item.key, "in_app", e.currentTarget.checked)} thumbIcon={<IconBell size={10} />} /></Tooltip>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              <Divider my="lg" />

              <Text fw={600} size="sm" mb="sm" style={{ color: "var(--nv-text-primary)" }}>{t("settings.anticipacionDeNotificaciones")}</Text>
              <Text c="dimmed" size="xs" mb="md">
                {t("settings.configuraConCuantosDiasDe")}
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
                <Paper p="md" withBorder radius="md">
                  <Text fw={500} size="sm" mb="xs">{t("settings.primerRecordatorio")}</Text>
                  <NumberInput
                    size="sm"
                    radius="md"
                    label={t("settings.diasDeAntelacion")}
                    placeholder={t("settings.ej3")}
                    min={1}
                    max={30}
                    value={(notifPrefs as Record<string, unknown>)?.advance_days_1 as number ?? 3}
                    onChange={(v) => updatePrefs.mutate({ advance_days_1: { email: true, in_app: true, value: Number(v) || 3 } } as never)}
                  />
                </Paper>
                <Paper p="md" withBorder radius="md">
                  <Text fw={500} size="sm" mb="xs">{t("settings.segundoRecordatorioOpcional")}</Text>
                  <NumberInput
                    size="sm"
                    radius="md"
                    label={t("settings.diasDeAntelacion")}
                    placeholder={t("settings.ej1")}
                    min={1}
                    max={30}
                    value={(notifPrefs as Record<string, unknown>)?.advance_days_2 as number ?? undefined}
                    onChange={(v) => updatePrefs.mutate({ advance_days_2: { email: true, in_app: true, value: v ? Number(v) : null } } as never)}
                  />
                </Paper>
              </SimpleGrid>

              <Divider my="lg" />

              <Group justify="center" gap="xl">
                <Group gap="xs"><IconMail size={14} color="var(--mantine-color-dimmed)" /><Text size="xs" c="dimmed">{t("settings.notifica_por_email")}</Text></Group>
                <Group gap="xs"><IconBell size={14} color="var(--mantine-color-dimmed)" /><Text size="xs" c="dimmed">= Notifica en app/web</Text></Group>
              </Group>
            </Box>
          </Tabs.Panel>

          {/* ==================== BOOKING ==================== */}
          <Tabs.Panel value="booking">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                {t("settings.configuracionDeReservas")}
              </Text>
              <form onSubmit={bookingForm.onSubmit((v) => bookingUpdateMutation.mutate(v))}>
                <Stack gap="md">
                  <Group grow>
                    <NumberInput label={t("settings.duracionPorDefectoMinutos")} max={240} min={15} step={15} {...bookingForm.getInputProps("default_duration")} />
                    <NumberInput label={t("settings.tiempoEntreSesionesMinutos")} max={60} min={0} step={5} {...bookingForm.getInputProps("buffer_time")} />
                  </Group>
                  <Group grow>
                    <NumberInput label={t("settings.maximoDiasDeAntelacion")} max={365} min={1} {...bookingForm.getInputProps("max_advance_days")} />
                    <NumberInput label={t("settings.minimoHorasDeAntelacion")} max={72} min={0} {...bookingForm.getInputProps("min_advance_hours")} />
                  </Group>
                  <NumberInput description={t("settings.elClientePuedeCancelarSin")} label={t("settings.politicaDeCancelacionHorasAntes")} max={72} min={0} {...bookingForm.getInputProps("cancellation_policy_hours")} />

                  <Divider my="sm" />

                  <Switch description={t("settings.losClientesPuedenReservarSesiones")} label={t("settings.permitirReservasDeClientes")} {...bookingForm.getInputProps("allow_client_booking", { type: "checkbox" })} />
                  <Switch description={t("settings.losClientesPuedenCancelarSus")} label={t("settings.permitirCancelacionesDeClientes")} {...bookingForm.getInputProps("allow_client_cancellation", { type: "checkbox" })} />
                  <Switch description={t("settings.elClienteDebePagarAl")} label={t("settings.requerirPagoPorAdelantado")} {...bookingForm.getInputProps("require_payment_upfront", { type: "checkbox" })} />

                  <Divider my="sm" />

                  <Switch description={t("settings.enviaRecordatoriosPorEmailAntes")} label={t("settings.enviarRecordatoriosAutomaticos")} {...bookingForm.getInputProps("send_reminders", { type: "checkbox" })} />
                  {bookingForm.values.send_reminders && (
                    <NumberInput label={t("settings.horasAntesDelRecordatorio")} max={72} min={1} {...bookingForm.getInputProps("reminder_hours")} />
                  )}

                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" loading={bookingUpdateMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                      {t("common.saveChanges")}
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
                      <Text fw={600} size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.googleCalendar")}</Text>
                    </Group>
                    <Text c="dimmed" size="sm">{t("settings.sincronizaTusReservasConGoogle")}</Text>
                  </Box>
                  {googleCalendarStatus?.connected && (
                    <Badge color="green" size="lg" variant="light" leftSection={<IconCheck size={14} />}>{t("settings.conectado")}</Badge>
                  )}
                </Group>

                {loadingGoogleCalendar ? (
                  <Box py="xl" ta="center">
                    <Loader size="sm" />
                    <Text c="dimmed" size="sm" mt="sm">{t("settings.cargandoEstadoDeGoogleCalendar")}</Text>
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
                          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => syncGoogleCalendar.mutate()} loading={syncGoogleCalendar.isPending}>{t("settings.sincronizar")}</Button>
                          <Button color="red" variant="subtle" onClick={handleDisconnectGoogleCalendar} loading={disconnectGoogleCalendar.isPending}>{t("settings.desconectar")}</Button>
                        </Group>
                      </Group>
                    </Paper>
                    <Group>
                      <Switch checked={googleCalendarStatus.sync_enabled} onChange={(e) => updateGoogleCalendarSettings.mutate(e.currentTarget.checked)} label={t("settings.sincronizacionAutomatica")} description={t("settings.lasReservasSeSincronizanAutomaticamente")} />
                    </Group>
                    <Alert color="blue" variant="light" radius="lg">
                      <Text size="sm">{t("settings.tusReservasSeSincronizaranAutomaticamente")}</Text>
                    </Alert>
                  </Stack>
                ) : (
                  <Stack gap="md">
                    <Paper p="xl" radius="lg" style={{ backgroundColor: "var(--nv-surface)", border: "1px dashed var(--nv-border)", textAlign: "center" }}>
                      <ThemeIcon color="blue" size={64} radius="xl" variant="light" mx="auto" mb="md"><IconCalendarEvent size={36} /></ThemeIcon>
                      <Text fw={600} size="lg" mb="xs">{t("settings.conectaTuGoogleCalendar")}</Text>
                      <Text c="dimmed" size="sm" mb="lg" maw={400} mx="auto">{t("settings.sincronizaTusReservasDeForma")}</Text>
                      <Button color="blue" size="md" radius="xl" leftSection={<IconBrandGoogle size={18} />} onClick={handleConnectGoogleCalendar} loading={googleCalendarAuthUrl.isPending}>{t("settings.conectarConGoogle")}</Button>
                    </Paper>
                    <Box>
                      <Text fw={500} mb="sm">{t("settings.beneficiosDeConectarGoogleCalendar")}</Text>
                      <List spacing="xs" size="sm" icon={<IconCheck size={14} color="var(--mantine-color-green-6)" />}>
                        <List.Item>{t("settings.sincronizacionBidireccionalDeReservas")}</List.Item>
                        <List.Item>{t("settings.veTusSesionesJuntoA")}</List.Item>
                        <List.Item>{t("settings.recibeRecordatoriosDeGoogleCalendar")}</List.Item>
                        <List.Item>{t("settings.evitaConflictosDeHorarioAutomaticamente")}</List.Item>
                        <List.Item>{t("settings.comparteDisponibilidadFacilmente")}</List.Item>
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
                      <Text fw={600} size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.whatsappBusiness")}</Text>
                    </Group>
                    <Text c="dimmed" size="sm">{t("settings.conectaTuCuentaDeWhatsapp")}</Text>
                  </Box>
                  {whatsappStatus?.connected && (
                    <Badge color="green" size="lg" variant="light" leftSection={<IconCheck size={14} />}>{t("settings.conectado")}</Badge>
                  )}
                </Group>

                {loadingWhatsApp ? (
                  <Box py="xl" ta="center">
                    <Loader size="sm" />
                    <Text c="dimmed" size="sm" mt="sm">{t("settings.cargandoEstadoDeWhatsapp")}</Text>
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
                        <Button color="red" variant="subtle" onClick={handleDisconnectWhatsApp} loading={disconnectWhatsApp.isPending}>{t("settings.desconectar")}</Button>
                      </Group>
                    </Paper>
                    {whatsappStatus.is_coexistence ? (
                      <Alert
                        color="yellow"
                        icon={<IconAlertTriangle size={16} />}
                        radius="lg"
                        title={t("settings.modoCoexistenciaActivo")}
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
                          <b>{t("settings.apiNativaDedicated")}</b>, o crea plantillas
                          aprobadas para tus mensajes proactivos.
                        </Text>
                      </Alert>
                    ) : (
                      <Alert color="blue" variant="light" radius="lg">
                        <Text size="sm">
                          {t("settings.losMensajesDeWhatsappAhora")}
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                ) : (
                  <Stack gap="md">
                    <Paper p="xl" radius="lg" style={{ backgroundColor: "var(--nv-surface)", border: "1px dashed var(--nv-border)", textAlign: "center" }}>
                      <ThemeIcon color="green" size={64} radius="xl" variant="light" mx="auto" mb="md"><IconBrandWhatsapp size={36} /></ThemeIcon>
                      <Text fw={600} size="lg" mb="xs">{t("settings.conectaTuWhatsappBusiness")}</Text>
                      <Text c="dimmed" size="sm" mb="lg" maw={400} mx="auto">{t("settings.integraTuCuentaDeWhatsapp")}</Text>
                      <Button color="green" size="md" radius="xl" leftSection={<IconPlugConnected size={18} />} onClick={handleConnectWhatsApp} loading={connectWhatsApp.isPending || isConnecting}>
                        {isConnecting ? t("settingsPage.esperandoConexión") : "Conectar WhatsApp"}
                      </Button>
                      {isConnecting && <Text c="dimmed" size="xs" mt="sm">{t("settings.completaElProcesoEnLa")}</Text>}
                    </Paper>
                    <Box>
                      <Text fw={500} mb="sm">{t("settings.beneficiosDeConectarWhatsapp")}</Text>
                      <List spacing="xs" size="sm" icon={<IconCheck size={14} color="var(--mantine-color-green-6)" />}>
                        <List.Item>{t("settings.recibeMensajesDeClientesEn")}</List.Item>
                        <List.Item>{t("settings.enviaMensajesAClientesPor")}</List.Item>
                        <List.Item>{t("settings.indicadoresVisualesClarosDelOrigen")}</List.Item>
                        <List.Item>{t("settings.historialCompletoDeConversacionesEn")}</List.Item>
                        <List.Item>{t("settings.notificacionesCuandoRecibasNuevosMensajes")}</List.Item>
                      </List>
                    </Box>
                  </Stack>
                )}
              </Box>

              {/* Info section */}
              <Box className="nv-card" p="lg">
                <Text fw={600} mb="md" size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.informacionSobreIntegraciones")}</Text>
                <Stack gap="sm">
                  <Group><ThemeIcon color="blue" variant="light" size="sm"><IconShield size={14} /></ThemeIcon><Text size="sm">{t("settings.tusCredencialesEstanSegurasUtilizamos")}</Text></Group>
                  <Group><ThemeIcon color="blue" variant="light" size="sm"><IconRefresh size={14} /></ThemeIcon><Text size="sm">{t("settings.lasSincronizacionesSeRealizanAutomaticamente")}</Text></Group>
                  <Group><ThemeIcon color="blue" variant="light" size="sm"><IconExternalLink size={14} /></ThemeIcon><Text size="sm">{t("settings.puedesRevocarElAccesoEn")}</Text></Group>
                </Stack>
              </Box>
            </Stack>
          </Tabs.Panel>

          {/* ==================== BILLING ==================== */}
          <Tabs.Panel value="billing">
            <Stack gap="lg">
              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.planActual")}</Text>
                <Group justify="space-between" mb="md">
                  <Box>
                    <Badge color="primary" mb="xs" size="lg">{billingData?.plan_name || "Plan Pro"}</Badge>
                    <Text c="dimmed" size="sm">
                      {billingData?.renewal_date
                        ? `Renovación: ${new Date(billingData.renewal_date).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}`
                        : t("settingsPage.renovaciónInformaciónNoDisponible")}
                    </Text>
                  </Box>
                  <Box ta="right">
                    <Text fw={700} size="xl">{billingData?.price || "—"}</Text>
                    <Button size="xs" variant="light">{t("settings.cambiarPlan")}</Button>
                  </Box>
                </Group>
                <Alert color="green" icon={<IconCheck size={16} />} variant="light" radius="lg">
                  {t("settings.tuPlanIncluyeClientesIlimitados")}
                </Alert>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.metodoDePago")}</Text>
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
                  <Button size="xs" variant="light" radius="xl">{t("settings.actualizar")}</Button>
                </Group>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.historialDeFacturas")}</Text>
                {billingData?.invoices?.length > 0 ? (
                  <ScrollArea type="auto">
                    <Table style={{ minWidth: 500 }}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t("settings.fecha")}</Table.Th>
                          <Table.Th>{t("settings.concepto")}</Table.Th>
                          <Table.Th>{t("settings.importe")}</Table.Th>
                          <Table.Th>{t("settings.estado")}</Table.Th>
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
                            <Table.Td>{inv.pdf_url && <Button size="xs" variant="subtle" component="a" href={inv.pdf_url} target="_blank">{t("settings.descargar")}</Button>}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <Text c="dimmed" size="sm" ta="center" py="lg">{t("settings.noHayFacturasDisponibles")}</Text>
                )}
              </Box>
            </Stack>
          </Tabs.Panel>

          {/* ==================== SECURITY ==================== */}
          <Tabs.Panel value="security">
            <Stack gap="lg">
              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.cambiarContrasena")}</Text>
                <form onSubmit={passwordForm.onSubmit((v) => changePasswordMutation.mutate(v))}>
                  <Stack gap="md">
                    <PasswordInput label={t("settings.contrasenaActual")} placeholder={t("settings.tuContrasenaActual")} {...passwordForm.getInputProps("current_password")} />
                    <Box>
                      <PasswordInput label={t("settings.nuevaContrasena")} placeholder={t("settings.minimo8Caracteres")} {...passwordForm.getInputProps("new_password")} />
                      <PasswordRulesIndicator value={passwordForm.values.new_password} />
                    </Box>
                    <PasswordInput label={t("settings.confirmarNuevaContrasena")} placeholder={t("settings.confirmarNuevaContrasena")} {...passwordForm.getInputProps("confirm_password")} />
                    <Group justify="flex-end">
                      <Button type="submit" radius="xl" loading={changePasswordMutation.isPending} style={{ backgroundColor: "var(--nv-primary)" }}>
                        {t("settings.cambiarContrasena")}
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.autenticacionDeDosFactores")}</Text>
                <Group justify="space-between">
                  <Box>
                    <Text size="sm" style={{ color: "var(--nv-text-primary)" }}>{t("settings.protegeTuCuentaCon2fa")}</Text>
                    <Text c="dimmed" size="xs">{t("settings.anadeUnaCapaExtraDe")}</Text>
                  </Box>
                  <Button leftSection={<IconLock size={16} />} variant="light" radius="xl">{t("settings.configurar2fa")}</Button>
                </Group>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>{t("settings.sesionesActivas")}</Text>
                <Stack gap="sm">
                  <Group justify="space-between" p="sm" style={{ border: "1px solid var(--nv-border)", borderRadius: "var(--radius-item)" }}>
                    <Box>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>{t("settings.esteDispositivo")}</Text>
                      <Text c="dimmed" size="xs">{t("settings.sesionActual")}</Text>
                    </Box>
                    <Badge color="green" variant="light" radius="xl">{t("settings.actual")}</Badge>
                  </Group>
                </Stack>
              </Box>

              <Box className="nv-card" p="lg" style={{ borderColor: "var(--nv-error)" }}>
                <Text c="red" fw={600} mb="lg" size="lg">{t("settings.zonaDePeligro")}</Text>
                <Alert color="red" icon={<IconAlertCircle size={16} />} mb="md" variant="light" radius="lg">
                  {t("settings.estasAccionesSonIrreversiblesProcede")}
                </Alert>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>{t("settings.exportarTodosMisDatos")}</Text>
                      <Text c="dimmed" size="xs">{t("settings.descargaUnaCopiaDeTodos")}</Text>
                    </Box>
                    <Button variant="light" radius="xl">{t("settings.exportar")}</Button>
                  </Group>
                  <Divider style={{ borderColor: "var(--nv-border)" }} />
                  <Group justify="space-between">
                    <Box>
                      <Text c="red" fw={500} size="sm">{t("settings.eliminarCuenta")}</Text>
                      <Text c="dimmed" size="xs">{t("settings.eliminaPermanentementeTuCuentaY")}</Text>
                    </Box>
                    <Button color="red" variant="light" radius="xl" onClick={openDeleteAccount}>{t("settings.eliminarCuenta")}</Button>
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
      <BottomSheet opened={inviteModalOpen} onClose={closeInviteModal} title={t("settings.team.inviteMember")} radius="lg">
        <form onSubmit={inviteForm.onSubmit((v) => inviteMutation.mutate(v))}>
          <Stack gap="md">
            <TextInput label={t("common.email")} placeholder={t("settings.team.emailPlaceholder")} {...inviteForm.getInputProps("email")} />
            <Select
              label={t("settings.team.roleLabel")}
              data={[
                { value: "collaborator", label: t("settings.team.roles.collaborator") },
                { value: "client", label: t("settings.team.roles.client") },
              ]}
              {...inviteForm.getInputProps("role")}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeInviteModal} radius="xl">{t("common.cancel")}</Button>
              <Button type="submit" loading={inviteMutation.isPending} radius="xl" style={{ backgroundColor: "var(--nv-primary)" }}>{t("common.sendInvitation")}</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Remove team member confirmation */}
      <BottomSheet opened={!!deleteConfirmMember} onClose={() => setDeleteConfirmMember(null)} title={t("settings.team.removeMember")} size="sm" radius="lg" centered>
        <Stack gap="md">
          <Text size="sm">{t("settings.team.removeConfirm")}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteConfirmMember(null)} radius="xl">{t("common.cancel")}</Button>
            <Button color="red" loading={removeMemberMutation.isPending} onClick={() => deleteConfirmMember && removeMemberMutation.mutate(deleteConfirmMember)} radius="xl">
              {t("common.delete")}
            </Button>
          </Group>
        </Stack>
      </BottomSheet>

      {/* Delete account confirmation */}
      <BottomSheet opened={deleteAccountModal} onClose={closeDeleteAccount} title={t("settings.eliminarCuenta")} size="md" radius="lg" centered>
        <form onSubmit={deleteAccountForm.onSubmit((v) => deleteAccountMutation.mutate(v))}>
          <Stack gap="md">
            <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light" radius="lg">
              {t("settings.estaAccionEsIrreversibleTu")}
            </Alert>
            <PasswordInput label={t("settings.confirmaTuContrasena")} placeholder={t("settings.tuContrasenaActual")} {...deleteAccountForm.getInputProps("password")} />
            <Textarea label={t("settings.motivoOpcional")} placeholder={t("settings.porQueQuieresEliminarTu")} {...deleteAccountForm.getInputProps("reason")} />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDeleteAccount} radius="xl">{t("settings.cancelar")}</Button>
              <Button color="red" type="submit" loading={deleteAccountMutation.isPending} radius="xl">{t("settings.eliminarCuenta")}</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}
