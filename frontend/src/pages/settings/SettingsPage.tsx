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
  FileInput,
  Group,
  List,
  Loader,
  Menu,
  Modal,
  NumberInput,
  Paper,
  PasswordInput,
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
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
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import {
  accountApi,
  authApi,
  paymentsApi,
  usersApi,
  workspacesApi,
} from "../../services/api";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string | null>(
    searchParams.get("tab") || "workspace"
  );
  const { user, currentWorkspace, setUser, setWorkspace } = useAuthStore();
  const { data: notifPrefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  // WhatsApp integration
  const { data: whatsappStatus, isLoading: loadingWhatsApp } = useWhatsAppStatus();
  const connectWhatsApp = useConnectWhatsApp();
  const disconnectWhatsApp = useDisconnectWhatsApp();
  const [isConnecting, setIsConnecting] = useState(false);

  // Google Calendar integration
  const { data: googleCalendarStatus, isLoading: loadingGoogleCalendar } = useGoogleCalendarStatus();
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
        message: "Tu cuenta de WhatsApp Business ha sido conectada correctamente",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setIsConnecting(false);
    } else if (setupResult === "failed") {
      notifications.show({
        title: "Error de conexión",
        message: "No se pudo conectar WhatsApp. Por favor, intenta de nuevo.",
        color: "red",
      });
      setIsConnecting(false);
    }
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

  const handleDisconnectWhatsApp = async () => {
    if (window.confirm("¿Estás seguro de que quieres desconectar WhatsApp? Los mensajes existentes se conservarán.")) {
      await disconnectWhatsApp.mutateAsync();
    }
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

  const handleDisconnectGoogleCalendar = async () => {
    if (window.confirm("¿Estás seguro de que quieres desconectar Google Calendar?")) {
      await disconnectGoogleCalendar.mutateAsync();
    }
  };

  // ==================== WORKSPACE ====================
  const wsSettings = currentWorkspace?.settings || {};
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
  const { data: fetchedTeamMembers = [] } = useTeamMembers();
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

  const brandingUpdateMutation = useMutation({
    mutationFn: (values: typeof brandingForm.values) => {
      const id = currentWorkspace?.id;
      if (!id) throw new Error("No workspace");
      return workspacesApi.update(id, { branding: values });
    },
    onSuccess: (res) => {
      setCurrentWorkspace(res.data);
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
      setCurrentWorkspace(res.data);
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
    staleTime: 60_000,
    retry: false,
  });

  const handleNotifPrefChange = (key: string, value: boolean) => {
    updatePrefs.mutate({ [key]: value });
  };

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        description="Gestiona tu workspace, perfil y preferencias"
        title="Configuración"
      />

      <Tabs onChange={setActiveTab} orientation="vertical" value={activeTab}>
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
        </Tabs.List>

        <Box style={{ flex: 1 }}>
          {/* ==================== WORKSPACE ==================== */}
          <Tabs.Panel value="workspace">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Información del Workspace
              </Text>
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

              <Table>
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
                  <SimpleGrid cols={3} mb="lg" spacing="md">
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
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Preferencias de Notificaciones
              </Text>

              <Stack gap="lg">
                <Box>
                  <Text fw={500} mb="md">Notificaciones por Email</Text>
                  <Stack gap="sm">
                    <Switch checked={notifPrefs?.email_booking_created ?? true} description="Recibe un email cuando un cliente hace una reserva" label="Nuevas reservas" onChange={(e) => handleNotifPrefChange("email_booking_created", e.currentTarget.checked)} />
                    <Switch checked={notifPrefs?.email_booking_cancelled ?? true} description="Recibe un email cuando se cancela una reserva" label="Cancelaciones" onChange={(e) => handleNotifPrefChange("email_booking_cancelled", e.currentTarget.checked)} />
                    <Switch checked={notifPrefs?.email_payment_received ?? true} description="Recibe un email cuando se procesa un pago" label="Pagos recibidos" onChange={(e) => handleNotifPrefChange("email_payment_received", e.currentTarget.checked)} />
                    <Switch checked={notifPrefs?.email_payment_failed ?? true} description="Recibe un email cuando falla un cobro" label="Pagos fallidos" onChange={(e) => handleNotifPrefChange("email_payment_failed", e.currentTarget.checked)} />
                    <Switch checked={notifPrefs?.email_new_message ?? true} description="Recibe un email cuando un cliente te envía un mensaje" label="Nuevos mensajes" onChange={(e) => handleNotifPrefChange("email_new_message", e.currentTarget.checked)} />
                    <Switch checked={notifPrefs?.email_new_client ?? true} description="Recibe un email cuando se registra un nuevo cliente" label="Nuevos clientes" onChange={(e) => handleNotifPrefChange("email_new_client", e.currentTarget.checked)} />
                    <Switch checked={notifPrefs?.email_form_submitted ?? true} description="Recibe un email cuando un cliente completa un formulario" label="Formularios completados" onChange={(e) => handleNotifPrefChange("email_form_submitted", e.currentTarget.checked)} />
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Text fw={500} mb="md">Notificaciones Push</Text>
                  <Stack gap="sm">
                    <Switch checked={notifPrefs?.push_enabled ?? true} description="Recibe notificaciones en tu dispositivo" label="Activar notificaciones push" onChange={(e) => handleNotifPrefChange("push_enabled", e.currentTarget.checked)} />
                  </Stack>
                </Box>
              </Stack>
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
                    <Alert color="blue" variant="light" radius="lg">
                      <Text size="sm">Los mensajes de WhatsApp ahora aparecerán en tu bandeja de Chat.</Text>
                    </Alert>
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
                  <Table>
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
        </Box>
      </Tabs>

      {/* ==================== MODALS ==================== */}

      {/* Invite team member */}
      <Modal opened={inviteModalOpen} onClose={closeInviteModal} title="Invitar Miembro" radius="lg">
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
      </Modal>

      {/* Remove team member confirmation */}
      <Modal opened={!!deleteConfirmMember} onClose={() => setDeleteConfirmMember(null)} title="Eliminar Miembro" size="sm" radius="lg" centered>
        <Stack gap="md">
          <Text size="sm">¿Estás seguro de que quieres eliminar este miembro del equipo?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteConfirmMember(null)} radius="xl">Cancelar</Button>
            <Button color="red" loading={removeMemberMutation.isPending} onClick={() => deleteConfirmMember && removeMemberMutation.mutate(deleteConfirmMember)} radius="xl">
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete account confirmation */}
      <Modal opened={deleteAccountModal} onClose={closeDeleteAccount} title="Eliminar Cuenta" size="md" radius="lg" centered>
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
      </Modal>
    </Container>
  );
}
