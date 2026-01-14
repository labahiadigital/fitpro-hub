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
  Menu,
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
import {
  IconAlertCircle,
  IconBell,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconCreditCard,
  IconDotsVertical,
  IconEdit,
  IconLock,
  IconPalette,
  IconPlus,
  IconShield,
  IconTrash,
  IconUpload,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../../hooks/useNotifications";
import { useAuthStore } from "../../stores/auth";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("workspace");
  const { user, currentWorkspace } = useAuthStore();
  const { data: notifPrefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  // Workspace form
  const workspaceForm = useForm({
    initialValues: {
      name: currentWorkspace?.name || "",
      slug: currentWorkspace?.slug || "",
      email: "contacto@trackfiz.com",
      phone: "+34 600 000 000",
      address: "Calle Ejemplo 123, Madrid",
      website: "https://trackfiz.com",
      description: "Centro de entrenamiento personal y bienestar",
    },
  });

  // Profile form
  const profileForm = useForm({
    initialValues: {
      full_name: user?.full_name || "",
      email: user?.email || "",
      phone: "+34 600 000 000",
      timezone: "Europe/Madrid",
      language: "es",
    },
  });

  // Branding form
  const brandingForm = useForm({
    initialValues: {
      primary_color: currentWorkspace?.branding?.primary_color || "#2D6A4F",
      secondary_color: currentWorkspace?.branding?.secondary_color || "#40916C",
      accent_color: currentWorkspace?.branding?.accent_color || "#95D5B2",
    },
  });

  // Team members (mock)
  const teamMembers = [
    {
      id: "1",
      name: user?.full_name || "Usuario Demo",
      email: user?.email || "demo@trackfiz.com",
      role: "owner",
      status: "active",
    },
    {
      id: "2",
      name: "Ana García",
      email: "ana@trackfiz.com",
      role: "collaborator",
      status: "active",
    },
  ];

  // Booking settings
  const bookingForm = useForm({
    initialValues: {
      default_duration: 60,
      buffer_time: 15,
      max_advance_days: 30,
      min_advance_hours: 2,
      cancellation_policy_hours: 24,
      allow_client_booking: true,
      allow_client_cancellation: true,
      require_payment_upfront: false,
      send_reminders: true,
      reminder_hours: 24,
    },
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
          <Tabs.Tab leftSection={<IconBuilding size={16} />} value="workspace" style={{ fontWeight: 500 }}>
            Workspace
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconUser size={16} />} value="profile" style={{ fontWeight: 500 }}>
            Mi Perfil
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconUsers size={16} />} value="team" style={{ fontWeight: 500 }}>
            Equipo
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconPalette size={16} />} value="branding" style={{ fontWeight: 500 }}>
            Marca
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconBell size={16} />} value="notifications" style={{ fontWeight: 500 }}>
            Notificaciones
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconCalendar size={16} />} value="booking" style={{ fontWeight: 500 }}>
            Reservas
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconCreditCard size={16} />} value="billing" style={{ fontWeight: 500 }}>
            Facturación
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconShield size={16} />} value="security" style={{ fontWeight: 500 }}>
            Seguridad
          </Tabs.Tab>
        </Tabs.List>

        <Box style={{ flex: 1 }}>
          {/* Workspace Settings */}
          <Tabs.Panel value="workspace">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Información del Workspace
              </Text>

              <form
                onSubmit={workspaceForm.onSubmit((values) =>
                  console.log(values)
                )}
              >
                <Stack gap="md">
                  <Group grow>
                    <TextInput
                      label="Nombre del negocio"
                      placeholder="Mi Centro Fitness"
                      {...workspaceForm.getInputProps("name")}
                    />
                    <TextInput
                      label="Slug (URL)"
                      placeholder="mi-centro-fitness"
                      {...workspaceForm.getInputProps("slug")}
                    />
                  </Group>

                  <Group grow>
                    <TextInput
                      label="Email de contacto"
                      placeholder="contacto@ejemplo.com"
                      {...workspaceForm.getInputProps("email")}
                    />
                    <TextInput
                      label="Teléfono"
                      placeholder="+34 600 000 000"
                      {...workspaceForm.getInputProps("phone")}
                    />
                  </Group>

                  <TextInput
                    label="Dirección"
                    placeholder="Calle, número, ciudad"
                    {...workspaceForm.getInputProps("address")}
                  />

                  <TextInput
                    label="Sitio web"
                    placeholder="https://tuwebsite.com"
                    {...workspaceForm.getInputProps("website")}
                  />

                  <Textarea
                    label="Descripción"
                    minRows={3}
                    placeholder="Describe tu negocio..."
                    {...workspaceForm.getInputProps("description")}
                  />

                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" style={{ backgroundColor: "var(--nv-primary)" }}>
                      Guardar Cambios
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Box>
          </Tabs.Panel>

          {/* Profile Settings */}
          <Tabs.Panel value="profile">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Mi Perfil
              </Text>

              <Group mb="xl">
                <Avatar color="primary" radius="xl" size={80}>
                  {user?.full_name?.charAt(0) || "U"}
                </Avatar>
                <Box>
                  <Text fw={500}>{user?.full_name || "Usuario"}</Text>
                  <Text c="dimmed" size="sm">
                    {user?.email}
                  </Text>
                  <Button
                    leftSection={<IconUpload size={14} />}
                    mt="xs"
                    size="xs"
                    variant="light"
                  >
                    Cambiar foto
                  </Button>
                </Box>
              </Group>

              <form
                onSubmit={profileForm.onSubmit((values) => console.log(values))}
              >
                <Stack gap="md">
                  <TextInput
                    label="Nombre completo"
                    placeholder="Tu nombre"
                    {...profileForm.getInputProps("full_name")}
                  />

                  <TextInput
                    disabled
                    label="Email"
                    placeholder="tu@email.com"
                    {...profileForm.getInputProps("email")}
                  />

                  <TextInput
                    label="Teléfono"
                    placeholder="+34 600 000 000"
                    {...profileForm.getInputProps("phone")}
                  />

                  <Group grow>
                    <Select
                      data={[
                        { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
                        { value: "Europe/London", label: "Londres (GMT)" },
                        {
                          value: "America/New_York",
                          label: "Nueva York (GMT-5)",
                        },
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
                    <Button type="submit" radius="xl" style={{ backgroundColor: "var(--nv-primary)" }}>
                      Guardar Cambios
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Box>
          </Tabs.Panel>

          {/* Team Settings */}
          <Tabs.Panel value="team">
            <Box className="nv-card" p="lg">
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600} size="lg" style={{ color: "var(--nv-text-primary)" }}>
                    Equipo
                  </Text>
                  <Text c="dimmed" size="sm">
                    Gestiona los miembros de tu equipo
                  </Text>
                </Box>
                <Button leftSection={<IconPlus size={16} />} radius="xl" style={{ backgroundColor: "var(--nv-primary)" }}>
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
                          <Avatar color="primary" radius="xl" size="sm">
                            {member.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Text fw={500} size="sm">
                              {member.name}
                            </Text>
                            <Text c="dimmed" size="xs">
                              {member.email}
                            </Text>
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={member.role === "owner" ? "primary" : "blue"}
                          variant="light"
                        >
                          {member.role === "owner"
                            ? "Propietario"
                            : "Colaborador"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="green" variant="light">
                          Activo
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {member.role !== "owner" && (
                          <Menu position="bottom-end" withArrow>
                            <Menu.Target>
                              <ActionIcon color="gray" variant="subtle">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item leftSection={<IconEdit size={14} />}>
                                Editar permisos
                              </Menu.Item>
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={14} />}
                              >
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

          {/* Branding Settings */}
          <Tabs.Panel value="branding">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Personalización de Marca
              </Text>

              <Stack gap="lg">
                <Box>
                  <Text fw={500} mb="xs" size="sm">
                    Logo
                  </Text>
                  <Group>
                    <Avatar color="primary" radius="md" size={80}>
                      {currentWorkspace?.name?.charAt(0) || "F"}
                    </Avatar>
                    <Box>
                      <FileInput
                        accept="image/*"
                        leftSection={<IconUpload size={14} />}
                        placeholder="Subir logo"
                        w={200}
                      />
                      <Text c="dimmed" mt={4} size="xs">
                        PNG, JPG o SVG. Máximo 2MB.
                      </Text>
                    </Box>
                  </Group>
                </Box>

                <Divider />

                <form
                  onSubmit={brandingForm.onSubmit((values) =>
                    console.log(values)
                  )}
                >
                  <Text fw={500} mb="md" size="sm">
                    Colores
                  </Text>
                  <SimpleGrid cols={3} mb="lg" spacing="md">
                    <ColorInput
                      label="Color primario"
                      {...brandingForm.getInputProps("primary_color")}
                    />
                    <ColorInput
                      label="Color secundario"
                      {...brandingForm.getInputProps("secondary_color")}
                    />
                    <ColorInput
                      label="Color de acento"
                      {...brandingForm.getInputProps("accent_color")}
                    />
                  </SimpleGrid>

                  <Box mb="lg">
                    <Text fw={500} mb="xs" size="sm">
                      Vista previa
                    </Text>
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: `linear-gradient(135deg, ${brandingForm.values.primary_color} 0%, ${brandingForm.values.secondary_color} 100%)`,
                      }}
                    >
                      <Text c="white" fw={600}>
                        {currentWorkspace?.name || "Trackfiz"}
                      </Text>
                      <Text c="white" opacity={0.8} size="sm">
                        Tu centro de entrenamiento
                      </Text>
                      <Button
                        mt="sm"
                        size="xs"
                        style={{
                          backgroundColor: brandingForm.values.accent_color,
                        }}
                      >
                        Reservar
                      </Button>
                    </Paper>
                  </Box>

                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" style={{ backgroundColor: "var(--nv-primary)" }}>
                      Guardar Cambios
                    </Button>
                  </Group>
                </form>
              </Stack>
            </Box>
          </Tabs.Panel>

          {/* Notification Settings */}
          <Tabs.Panel value="notifications">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Preferencias de Notificaciones
              </Text>

              <Stack gap="lg">
                <Box>
                  <Text fw={500} mb="md">
                    Notificaciones por Email
                  </Text>
                  <Stack gap="sm">
                    <Switch
                      checked={notifPrefs?.email_booking_created ?? true}
                      description="Recibe un email cuando un cliente hace una reserva"
                      label="Nuevas reservas"
                      onChange={(e) =>
                        handleNotifPrefChange(
                          "email_booking_created",
                          e.currentTarget.checked
                        )
                      }
                    />
                    <Switch
                      checked={notifPrefs?.email_booking_cancelled ?? true}
                      description="Recibe un email cuando se cancela una reserva"
                      label="Cancelaciones"
                      onChange={(e) =>
                        handleNotifPrefChange(
                          "email_booking_cancelled",
                          e.currentTarget.checked
                        )
                      }
                    />
                    <Switch
                      checked={notifPrefs?.email_payment_received ?? true}
                      description="Recibe un email cuando se procesa un pago"
                      label="Pagos recibidos"
                      onChange={(e) =>
                        handleNotifPrefChange(
                          "email_payment_received",
                          e.currentTarget.checked
                        )
                      }
                    />
                    <Switch
                      checked={notifPrefs?.email_payment_failed ?? true}
                      description="Recibe un email cuando falla un cobro"
                      label="Pagos fallidos"
                      onChange={(e) =>
                        handleNotifPrefChange(
                          "email_payment_failed",
                          e.currentTarget.checked
                        )
                      }
                    />
                    <Switch
                      checked={notifPrefs?.email_new_message ?? true}
                      description="Recibe un email cuando un cliente te envía un mensaje"
                      label="Nuevos mensajes"
                      onChange={(e) =>
                        handleNotifPrefChange(
                          "email_new_message",
                          e.currentTarget.checked
                        )
                      }
                    />
                    <Switch
                      checked={notifPrefs?.email_new_client ?? true}
                      description="Recibe un email cuando se registra un nuevo cliente"
                      label="Nuevos clientes"
                      onChange={(e) =>
                        handleNotifPrefChange(
                          "email_new_client",
                          e.currentTarget.checked
                        )
                      }
                    />
                    <Switch
                      checked={notifPrefs?.email_form_submitted ?? true}
                      description="Recibe un email cuando un cliente completa un formulario"
                      label="Formularios completados"
                      onChange={(e) =>
                        handleNotifPrefChange(
                          "email_form_submitted",
                          e.currentTarget.checked
                        )
                      }
                    />
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Text fw={500} mb="md">
                    Notificaciones Push
                  </Text>
                  <Stack gap="sm">
                    <Switch
                      checked={notifPrefs?.push_enabled ?? true}
                      description="Recibe notificaciones en tu dispositivo"
                      label="Activar notificaciones push"
                      onChange={(e) =>
                        handleNotifPrefChange(
                          "push_enabled",
                          e.currentTarget.checked
                        )
                      }
                    />
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Tabs.Panel>

          {/* Booking Settings */}
          <Tabs.Panel value="booking">
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                Configuración de Reservas
              </Text>

              <form
                onSubmit={bookingForm.onSubmit((values) => console.log(values))}
              >
                <Stack gap="md">
                  <Group grow>
                    <NumberInput
                      label="Duración por defecto (minutos)"
                      max={240}
                      min={15}
                      step={15}
                      {...bookingForm.getInputProps("default_duration")}
                    />
                    <NumberInput
                      label="Tiempo entre sesiones (minutos)"
                      max={60}
                      min={0}
                      step={5}
                      {...bookingForm.getInputProps("buffer_time")}
                    />
                  </Group>

                  <Group grow>
                    <NumberInput
                      label="Máximo días de antelación"
                      max={365}
                      min={1}
                      {...bookingForm.getInputProps("max_advance_days")}
                    />
                    <NumberInput
                      label="Mínimo horas de antelación"
                      max={72}
                      min={0}
                      {...bookingForm.getInputProps("min_advance_hours")}
                    />
                  </Group>

                  <NumberInput
                    description="El cliente puede cancelar sin penalización hasta X horas antes"
                    label="Política de cancelación (horas antes)"
                    max={72}
                    min={0}
                    {...bookingForm.getInputProps("cancellation_policy_hours")}
                  />

                  <Divider my="sm" />

                  <Switch
                    description="Los clientes pueden reservar sesiones desde su app/portal"
                    label="Permitir reservas de clientes"
                    {...bookingForm.getInputProps("allow_client_booking", {
                      type: "checkbox",
                    })}
                  />

                  <Switch
                    description="Los clientes pueden cancelar sus propias reservas"
                    label="Permitir cancelaciones de clientes"
                    {...bookingForm.getInputProps("allow_client_cancellation", {
                      type: "checkbox",
                    })}
                  />

                  <Switch
                    description="El cliente debe pagar al hacer la reserva"
                    label="Requerir pago por adelantado"
                    {...bookingForm.getInputProps("require_payment_upfront", {
                      type: "checkbox",
                    })}
                  />

                  <Divider my="sm" />

                  <Switch
                    description="Envía recordatorios por email antes de las sesiones"
                    label="Enviar recordatorios automáticos"
                    {...bookingForm.getInputProps("send_reminders", {
                      type: "checkbox",
                    })}
                  />

                  {bookingForm.values.send_reminders && (
                    <NumberInput
                      label="Horas antes del recordatorio"
                      max={72}
                      min={1}
                      {...bookingForm.getInputProps("reminder_hours")}
                    />
                  )}

                  <Group justify="flex-end">
                    <Button type="submit" radius="xl" style={{ backgroundColor: "var(--nv-primary)" }}>
                      Guardar Cambios
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Box>
          </Tabs.Panel>

          {/* Billing Settings */}
          <Tabs.Panel value="billing">
            <Stack gap="lg">
              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                  Plan Actual
                </Text>

                <Group justify="space-between" mb="md">
                  <Box>
                    <Badge color="primary" mb="xs" size="lg">
                      Plan Pro
                    </Badge>
                    <Text c="dimmed" size="sm">
                      Renovación: 15 de febrero, 2024
                    </Text>
                  </Box>
                  <Box ta="right">
                    <Text fw={700} size="xl">
                      €49/mes
                    </Text>
                    <Button size="xs" variant="light">
                      Cambiar plan
                    </Button>
                  </Box>
                </Group>

                <Alert
                  color="green"
                  icon={<IconCheck size={16} />}
                  variant="light"
                  radius="lg"
                >
                  Tu plan incluye: clientes ilimitados, automatizaciones, chat,
                  y soporte prioritario.
                </Alert>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                  Método de Pago
                </Text>

                <Group
                  justify="space-between"
                  p="md"
                  style={{
                    border: "1px solid var(--nv-border)",
                    borderRadius: "var(--radius-item)",
                  }}
                >
                  <Group>
                    <ThemeIcon color="blue" size="lg" variant="light" radius="xl">
                      <IconCreditCard size={20} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        •••• •••• •••• 4242
                      </Text>
                      <Text c="dimmed" size="xs">
                        Expira 12/25
                      </Text>
                    </Box>
                  </Group>
                  <Button size="xs" variant="light" radius="xl">
                    Actualizar
                  </Button>
                </Group>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                  Historial de Facturas
                </Text>

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
                    <Table.Tr>
                      <Table.Td>15/01/2024</Table.Td>
                      <Table.Td>Plan Pro - Enero 2024</Table.Td>
                      <Table.Td>€49.00</Table.Td>
                      <Table.Td>
                        <Badge color="green" variant="light">
                          Pagado
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="subtle">
                          Descargar
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td>15/12/2023</Table.Td>
                      <Table.Td>Plan Pro - Diciembre 2023</Table.Td>
                      <Table.Td>€49.00</Table.Td>
                      <Table.Td>
                        <Badge color="green" variant="light">
                          Pagado
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="subtle">
                          Descargar
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Box>
            </Stack>
          </Tabs.Panel>

          {/* Security Settings */}
          <Tabs.Panel value="security">
            <Stack gap="lg">
              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                  Cambiar Contraseña
                </Text>

                <Stack gap="md">
                  <PasswordInput
                    label="Contraseña actual"
                    placeholder="Tu contraseña actual"
                  />
                  <PasswordInput
                    label="Nueva contraseña"
                    placeholder="Nueva contraseña"
                  />
                  <PasswordInput
                    label="Confirmar nueva contraseña"
                    placeholder="Confirmar nueva contraseña"
                  />
                  <Group justify="flex-end">
                    <Button radius="xl" style={{ backgroundColor: "var(--nv-primary)" }}>
                      Cambiar Contraseña
                    </Button>
                  </Group>
                </Stack>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                  Autenticación de Dos Factores
                </Text>

                <Group justify="space-between">
                  <Box>
                    <Text size="sm" style={{ color: "var(--nv-text-primary)" }}>Protege tu cuenta con 2FA</Text>
                    <Text c="dimmed" size="xs">
                      Añade una capa extra de seguridad a tu cuenta
                    </Text>
                  </Box>
                  <Button leftSection={<IconLock size={16} />} variant="light" radius="xl">
                    Configurar 2FA
                  </Button>
                </Group>
              </Box>

              <Box className="nv-card" p="lg">
                <Text fw={600} mb="lg" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                  Sesiones Activas
                </Text>

                <Stack gap="sm">
                  <Group
                    justify="space-between"
                    p="sm"
                    style={{
                      border: "1px solid var(--nv-border)",
                      borderRadius: "var(--radius-item)",
                    }}
                  >
                    <Box>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        Este dispositivo
                      </Text>
                      <Text c="dimmed" size="xs">
                        Chrome en Windows • Madrid, España
                      </Text>
                    </Box>
                    <Badge color="green" variant="light" radius="xl">
                      Actual
                    </Badge>
                  </Group>
                </Stack>

                <Button color="red" mt="md" variant="light" radius="xl">
                  Cerrar todas las sesiones
                </Button>
              </Box>

              <Box
                className="nv-card"
                p="lg"
                style={{ borderColor: "var(--nv-error)" }}
              >
                <Text c="red" fw={600} mb="lg" size="lg">
                  Zona de Peligro
                </Text>

                <Alert
                  color="red"
                  icon={<IconAlertCircle size={16} />}
                  mb="md"
                  variant="light"
                  radius="lg"
                >
                  Estas acciones son irreversibles. Procede con precaución.
                </Alert>

                <Stack gap="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        Exportar todos mis datos
                      </Text>
                      <Text c="dimmed" size="xs">
                        Descarga una copia de todos tus datos (GDPR)
                      </Text>
                    </Box>
                    <Button variant="light" radius="xl">Exportar</Button>
                  </Group>

                  <Divider style={{ borderColor: "var(--nv-border)" }} />

                  <Group justify="space-between">
                    <Box>
                      <Text c="red" fw={500} size="sm">
                        Eliminar cuenta
                      </Text>
                      <Text c="dimmed" size="xs">
                        Elimina permanentemente tu cuenta y todos los datos
                      </Text>
                    </Box>
                    <Button color="red" variant="light" radius="xl">
                      Eliminar Cuenta
                    </Button>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Container>
  );
}
