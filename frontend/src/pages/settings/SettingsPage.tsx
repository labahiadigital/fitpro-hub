import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  Tabs,
  Stack,
  TextInput,
  Textarea,
  Select,
  Switch,
  ColorInput,
  FileInput,
  Box,
  Text,
  Avatar,
  Divider,
  Table,
  Badge,
  ActionIcon,
  Menu,
  ThemeIcon,
  SimpleGrid,
  NumberInput,
  PasswordInput,
  Alert,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import {
  IconBuilding,
  IconUser,
  IconBell,
  IconCreditCard,
  IconUsers,
  IconPalette,
  IconShield,
  IconTrash,
  IconEdit,
  IconDotsVertical,
  IconPlus,
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconCalendar,
  IconLock,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { useAuthStore } from '../../stores/auth'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../hooks/useNotifications'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('workspace')
  const { user, currentWorkspace } = useAuthStore()
  const { data: notifPrefs } = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()
  
  // Workspace form
  const workspaceForm = useForm({
    initialValues: {
      name: currentWorkspace?.name || '',
      slug: currentWorkspace?.slug || '',
      email: 'contacto@fitprodemo.com',
      phone: '+34 600 000 000',
      address: 'Calle Ejemplo 123, Madrid',
      website: 'https://fitprodemo.com',
      description: 'Centro de entrenamiento personal y bienestar',
    },
  })
  
  // Profile form
  const profileForm = useForm({
    initialValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: '+34 600 000 000',
      timezone: 'Europe/Madrid',
      language: 'es',
    },
  })
  
  // Branding form
  const brandingForm = useForm({
    initialValues: {
      primary_color: currentWorkspace?.branding?.primary_color || '#2D6A4F',
      secondary_color: currentWorkspace?.branding?.secondary_color || '#40916C',
      accent_color: currentWorkspace?.branding?.accent_color || '#95D5B2',
    },
  })
  
  // Team members (mock)
  const teamMembers = [
    { id: '1', name: user?.full_name || 'Usuario Demo', email: user?.email || 'demo@fitprohub.com', role: 'owner', status: 'active' },
    { id: '2', name: 'Ana García', email: 'ana@fitprodemo.com', role: 'collaborator', status: 'active' },
  ]
  
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
  })
  
  const handleNotifPrefChange = (key: string, value: boolean) => {
    updatePrefs.mutate({ [key]: value })
  }
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Configuración"
        description="Gestiona tu workspace, perfil y preferencias"
      />
      
      <Tabs value={activeTab} onChange={setActiveTab} orientation="vertical">
        <Tabs.List w={220} mr="xl">
          <Tabs.Tab value="workspace" leftSection={<IconBuilding size={16} />}>
            Workspace
          </Tabs.Tab>
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
            Mi Perfil
          </Tabs.Tab>
          <Tabs.Tab value="team" leftSection={<IconUsers size={16} />}>
            Equipo
          </Tabs.Tab>
          <Tabs.Tab value="branding" leftSection={<IconPalette size={16} />}>
            Marca
          </Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
            Notificaciones
          </Tabs.Tab>
          <Tabs.Tab value="booking" leftSection={<IconCalendar size={16} />}>
            Reservas
          </Tabs.Tab>
          <Tabs.Tab value="billing" leftSection={<IconCreditCard size={16} />}>
            Facturación
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
            Seguridad
          </Tabs.Tab>
        </Tabs.List>
        
        <Box style={{ flex: 1 }}>
          {/* Workspace Settings */}
          <Tabs.Panel value="workspace">
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} size="lg" mb="lg">Información del Workspace</Text>
              
              <form onSubmit={workspaceForm.onSubmit((values) => console.log(values))}>
                <Stack gap="md">
                  <Group grow>
                    <TextInput
                      label="Nombre del negocio"
                      placeholder="Mi Centro Fitness"
                      {...workspaceForm.getInputProps('name')}
                    />
                    <TextInput
                      label="Slug (URL)"
                      placeholder="mi-centro-fitness"
                      {...workspaceForm.getInputProps('slug')}
                    />
                  </Group>
                  
                  <Group grow>
                    <TextInput
                      label="Email de contacto"
                      placeholder="contacto@ejemplo.com"
                      {...workspaceForm.getInputProps('email')}
                    />
                    <TextInput
                      label="Teléfono"
                      placeholder="+34 600 000 000"
                      {...workspaceForm.getInputProps('phone')}
                    />
                  </Group>
                  
                  <TextInput
                    label="Dirección"
                    placeholder="Calle, número, ciudad"
                    {...workspaceForm.getInputProps('address')}
                  />
                  
                  <TextInput
                    label="Sitio web"
                    placeholder="https://tuwebsite.com"
                    {...workspaceForm.getInputProps('website')}
                  />
                  
                  <Textarea
                    label="Descripción"
                    placeholder="Describe tu negocio..."
                    minRows={3}
                    {...workspaceForm.getInputProps('description')}
                  />
                  
                  <Group justify="flex-end">
                    <Button type="submit">Guardar Cambios</Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Tabs.Panel>
          
          {/* Profile Settings */}
          <Tabs.Panel value="profile">
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} size="lg" mb="lg">Mi Perfil</Text>
              
              <Group mb="xl">
                <Avatar size={80} radius="xl" color="primary">
                  {user?.full_name?.charAt(0) || 'U'}
                </Avatar>
                <Box>
                  <Text fw={500}>{user?.full_name || 'Usuario'}</Text>
                  <Text size="sm" c="dimmed">{user?.email}</Text>
                  <Button variant="light" size="xs" mt="xs" leftSection={<IconUpload size={14} />}>
                    Cambiar foto
                  </Button>
                </Box>
              </Group>
              
              <form onSubmit={profileForm.onSubmit((values) => console.log(values))}>
                <Stack gap="md">
                  <TextInput
                    label="Nombre completo"
                    placeholder="Tu nombre"
                    {...profileForm.getInputProps('full_name')}
                  />
                  
                  <TextInput
                    label="Email"
                    placeholder="tu@email.com"
                    disabled
                    {...profileForm.getInputProps('email')}
                  />
                  
                  <TextInput
                    label="Teléfono"
                    placeholder="+34 600 000 000"
                    {...profileForm.getInputProps('phone')}
                  />
                  
                  <Group grow>
                    <Select
                      label="Zona horaria"
                      data={[
                        { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
                        { value: 'Europe/London', label: 'Londres (GMT)' },
                        { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
                      ]}
                      {...profileForm.getInputProps('timezone')}
                    />
                    <Select
                      label="Idioma"
                      data={[
                        { value: 'es', label: 'Español' },
                        { value: 'en', label: 'English' },
                      ]}
                      {...profileForm.getInputProps('language')}
                    />
                  </Group>
                  
                  <Group justify="flex-end">
                    <Button type="submit">Guardar Cambios</Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Tabs.Panel>
          
          {/* Team Settings */}
          <Tabs.Panel value="team">
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text fw={600} size="lg">Equipo</Text>
                  <Text size="sm" c="dimmed">Gestiona los miembros de tu equipo</Text>
                </Box>
                <Button leftSection={<IconPlus size={16} />}>
                  Invitar Miembro
                </Button>
              </Group>
              
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Miembro</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th style={{ width: 60 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {teamMembers.map((member) => (
                    <Table.Tr key={member.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar size="sm" radius="xl" color="primary">
                            {member.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Text size="sm" fw={500}>{member.name}</Text>
                            <Text size="xs" c="dimmed">{member.email}</Text>
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={member.role === 'owner' ? 'primary' : 'blue'}
                          variant="light"
                        >
                          {member.role === 'owner' ? 'Propietario' : 'Colaborador'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="green" variant="light">
                          Activo
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {member.role !== 'owner' && (
                          <Menu position="bottom-end" withArrow>
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item leftSection={<IconEdit size={14} />}>
                                Editar permisos
                              </Menu.Item>
                              <Menu.Item leftSection={<IconTrash size={14} />} color="red">
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
            </Paper>
          </Tabs.Panel>
          
          {/* Branding Settings */}
          <Tabs.Panel value="branding">
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} size="lg" mb="lg">Personalización de Marca</Text>
              
              <Stack gap="lg">
                <Box>
                  <Text size="sm" fw={500} mb="xs">Logo</Text>
                  <Group>
                    <Avatar size={80} radius="md" color="primary">
                      {currentWorkspace?.name?.charAt(0) || 'F'}
                    </Avatar>
                    <Box>
                      <FileInput
                        placeholder="Subir logo"
                        accept="image/*"
                        leftSection={<IconUpload size={14} />}
                        w={200}
                      />
                      <Text size="xs" c="dimmed" mt={4}>
                        PNG, JPG o SVG. Máximo 2MB.
                      </Text>
                    </Box>
                  </Group>
                </Box>
                
                <Divider />
                
                <form onSubmit={brandingForm.onSubmit((values) => console.log(values))}>
                  <Text size="sm" fw={500} mb="md">Colores</Text>
                  <SimpleGrid cols={3} spacing="md" mb="lg">
                    <ColorInput
                      label="Color primario"
                      {...brandingForm.getInputProps('primary_color')}
                    />
                    <ColorInput
                      label="Color secundario"
                      {...brandingForm.getInputProps('secondary_color')}
                    />
                    <ColorInput
                      label="Color de acento"
                      {...brandingForm.getInputProps('accent_color')}
                    />
                  </SimpleGrid>
                  
                  <Box mb="lg">
                    <Text size="sm" fw={500} mb="xs">Vista previa</Text>
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: `linear-gradient(135deg, ${brandingForm.values.primary_color} 0%, ${brandingForm.values.secondary_color} 100%)`,
                      }}
                    >
                      <Text c="white" fw={600}>
                        {currentWorkspace?.name || 'FitPro Hub'}
                      </Text>
                      <Text c="white" size="sm" opacity={0.8}>
                        Tu centro de entrenamiento
                      </Text>
                      <Button
                        mt="sm"
                        size="xs"
                        style={{ backgroundColor: brandingForm.values.accent_color }}
                      >
                        Reservar
                      </Button>
                    </Paper>
                  </Box>
                  
                  <Group justify="flex-end">
                    <Button type="submit">Guardar Cambios</Button>
                  </Group>
                </form>
              </Stack>
            </Paper>
          </Tabs.Panel>
          
          {/* Notification Settings */}
          <Tabs.Panel value="notifications">
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} size="lg" mb="lg">Preferencias de Notificaciones</Text>
              
              <Stack gap="lg">
                <Box>
                  <Text fw={500} mb="md">Notificaciones por Email</Text>
                  <Stack gap="sm">
                    <Switch
                      label="Nuevas reservas"
                      description="Recibe un email cuando un cliente hace una reserva"
                      checked={notifPrefs?.email_booking_created ?? true}
                      onChange={(e) => handleNotifPrefChange('email_booking_created', e.currentTarget.checked)}
                    />
                    <Switch
                      label="Cancelaciones"
                      description="Recibe un email cuando se cancela una reserva"
                      checked={notifPrefs?.email_booking_cancelled ?? true}
                      onChange={(e) => handleNotifPrefChange('email_booking_cancelled', e.currentTarget.checked)}
                    />
                    <Switch
                      label="Pagos recibidos"
                      description="Recibe un email cuando se procesa un pago"
                      checked={notifPrefs?.email_payment_received ?? true}
                      onChange={(e) => handleNotifPrefChange('email_payment_received', e.currentTarget.checked)}
                    />
                    <Switch
                      label="Pagos fallidos"
                      description="Recibe un email cuando falla un cobro"
                      checked={notifPrefs?.email_payment_failed ?? true}
                      onChange={(e) => handleNotifPrefChange('email_payment_failed', e.currentTarget.checked)}
                    />
                    <Switch
                      label="Nuevos mensajes"
                      description="Recibe un email cuando un cliente te envía un mensaje"
                      checked={notifPrefs?.email_new_message ?? true}
                      onChange={(e) => handleNotifPrefChange('email_new_message', e.currentTarget.checked)}
                    />
                    <Switch
                      label="Nuevos clientes"
                      description="Recibe un email cuando se registra un nuevo cliente"
                      checked={notifPrefs?.email_new_client ?? true}
                      onChange={(e) => handleNotifPrefChange('email_new_client', e.currentTarget.checked)}
                    />
                    <Switch
                      label="Formularios completados"
                      description="Recibe un email cuando un cliente completa un formulario"
                      checked={notifPrefs?.email_form_submitted ?? true}
                      onChange={(e) => handleNotifPrefChange('email_form_submitted', e.currentTarget.checked)}
                    />
                  </Stack>
                </Box>
                
                <Divider />
                
                <Box>
                  <Text fw={500} mb="md">Notificaciones Push</Text>
                  <Stack gap="sm">
                    <Switch
                      label="Activar notificaciones push"
                      description="Recibe notificaciones en tu dispositivo"
                      checked={notifPrefs?.push_enabled ?? true}
                      onChange={(e) => handleNotifPrefChange('push_enabled', e.currentTarget.checked)}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Tabs.Panel>
          
          {/* Booking Settings */}
          <Tabs.Panel value="booking">
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} size="lg" mb="lg">Configuración de Reservas</Text>
              
              <form onSubmit={bookingForm.onSubmit((values) => console.log(values))}>
                <Stack gap="md">
                  <Group grow>
                    <NumberInput
                      label="Duración por defecto (minutos)"
                      min={15}
                      max={240}
                      step={15}
                      {...bookingForm.getInputProps('default_duration')}
                    />
                    <NumberInput
                      label="Tiempo entre sesiones (minutos)"
                      min={0}
                      max={60}
                      step={5}
                      {...bookingForm.getInputProps('buffer_time')}
                    />
                  </Group>
                  
                  <Group grow>
                    <NumberInput
                      label="Máximo días de antelación"
                      min={1}
                      max={365}
                      {...bookingForm.getInputProps('max_advance_days')}
                    />
                    <NumberInput
                      label="Mínimo horas de antelación"
                      min={0}
                      max={72}
                      {...bookingForm.getInputProps('min_advance_hours')}
                    />
                  </Group>
                  
                  <NumberInput
                    label="Política de cancelación (horas antes)"
                    description="El cliente puede cancelar sin penalización hasta X horas antes"
                    min={0}
                    max={72}
                    {...bookingForm.getInputProps('cancellation_policy_hours')}
                  />
                  
                  <Divider my="sm" />
                  
                  <Switch
                    label="Permitir reservas de clientes"
                    description="Los clientes pueden reservar sesiones desde su app/portal"
                    {...bookingForm.getInputProps('allow_client_booking', { type: 'checkbox' })}
                  />
                  
                  <Switch
                    label="Permitir cancelaciones de clientes"
                    description="Los clientes pueden cancelar sus propias reservas"
                    {...bookingForm.getInputProps('allow_client_cancellation', { type: 'checkbox' })}
                  />
                  
                  <Switch
                    label="Requerir pago por adelantado"
                    description="El cliente debe pagar al hacer la reserva"
                    {...bookingForm.getInputProps('require_payment_upfront', { type: 'checkbox' })}
                  />
                  
                  <Divider my="sm" />
                  
                  <Switch
                    label="Enviar recordatorios automáticos"
                    description="Envía recordatorios por email antes de las sesiones"
                    {...bookingForm.getInputProps('send_reminders', { type: 'checkbox' })}
                  />
                  
                  {bookingForm.values.send_reminders && (
                    <NumberInput
                      label="Horas antes del recordatorio"
                      min={1}
                      max={72}
                      {...bookingForm.getInputProps('reminder_hours')}
                    />
                  )}
                  
                  <Group justify="flex-end">
                    <Button type="submit">Guardar Cambios</Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Tabs.Panel>
          
          {/* Billing Settings */}
          <Tabs.Panel value="billing">
            <Stack gap="lg">
              <Paper withBorder radius="lg" p="lg">
                <Text fw={600} size="lg" mb="lg">Plan Actual</Text>
                
                <Group justify="space-between" mb="md">
                  <Box>
                    <Badge color="primary" size="lg" mb="xs">Plan Pro</Badge>
                    <Text size="sm" c="dimmed">Renovación: 15 de febrero, 2024</Text>
                  </Box>
                  <Box ta="right">
                    <Text size="xl" fw={700}>€49/mes</Text>
                    <Button variant="light" size="xs">Cambiar plan</Button>
                  </Box>
                </Group>
                
                <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                  Tu plan incluye: clientes ilimitados, automatizaciones, chat, y soporte prioritario.
                </Alert>
              </Paper>
              
              <Paper withBorder radius="lg" p="lg">
                <Text fw={600} size="lg" mb="lg">Método de Pago</Text>
                
                <Group justify="space-between" p="md" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-md)' }}>
                  <Group>
                    <ThemeIcon size="lg" variant="light" color="blue">
                      <IconCreditCard size={20} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" fw={500}>•••• •••• •••• 4242</Text>
                      <Text size="xs" c="dimmed">Expira 12/25</Text>
                    </Box>
                  </Group>
                  <Button variant="light" size="xs">Actualizar</Button>
                </Group>
              </Paper>
              
              <Paper withBorder radius="lg" p="lg">
                <Text fw={600} size="lg" mb="lg">Historial de Facturas</Text>
                
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Fecha</Table.Th>
                      <Table.Th>Concepto</Table.Th>
                      <Table.Th>Importe</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td>15/01/2024</Table.Td>
                      <Table.Td>Plan Pro - Enero 2024</Table.Td>
                      <Table.Td>€49.00</Table.Td>
                      <Table.Td><Badge color="green" variant="light">Pagado</Badge></Table.Td>
                      <Table.Td><Button variant="subtle" size="xs">Descargar</Button></Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td>15/12/2023</Table.Td>
                      <Table.Td>Plan Pro - Diciembre 2023</Table.Td>
                      <Table.Td>€49.00</Table.Td>
                      <Table.Td><Badge color="green" variant="light">Pagado</Badge></Table.Td>
                      <Table.Td><Button variant="subtle" size="xs">Descargar</Button></Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>
          
          {/* Security Settings */}
          <Tabs.Panel value="security">
            <Stack gap="lg">
              <Paper withBorder radius="lg" p="lg">
                <Text fw={600} size="lg" mb="lg">Cambiar Contraseña</Text>
                
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
                    <Button>Cambiar Contraseña</Button>
                  </Group>
                </Stack>
              </Paper>
              
              <Paper withBorder radius="lg" p="lg">
                <Text fw={600} size="lg" mb="lg">Autenticación de Dos Factores</Text>
                
                <Group justify="space-between">
                  <Box>
                    <Text size="sm">Protege tu cuenta con 2FA</Text>
                    <Text size="xs" c="dimmed">
                      Añade una capa extra de seguridad a tu cuenta
                    </Text>
                  </Box>
                  <Button variant="light" leftSection={<IconLock size={16} />}>
                    Configurar 2FA
                  </Button>
                </Group>
              </Paper>
              
              <Paper withBorder radius="lg" p="lg">
                <Text fw={600} size="lg" mb="lg">Sesiones Activas</Text>
                
                <Stack gap="sm">
                  <Group justify="space-between" p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-md)' }}>
                    <Box>
                      <Text size="sm" fw={500}>Este dispositivo</Text>
                      <Text size="xs" c="dimmed">Chrome en Windows • Madrid, España</Text>
                    </Box>
                    <Badge color="green" variant="light">Actual</Badge>
                  </Group>
                </Stack>
                
                <Button variant="light" color="red" mt="md">
                  Cerrar todas las sesiones
                </Button>
              </Paper>
              
              <Paper withBorder radius="lg" p="lg" style={{ borderColor: 'var(--mantine-color-red-3)' }}>
                <Text fw={600} size="lg" mb="lg" c="red">Zona de Peligro</Text>
                
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="md">
                  Estas acciones son irreversibles. Procede con precaución.
                </Alert>
                
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" fw={500}>Exportar todos mis datos</Text>
                      <Text size="xs" c="dimmed">Descarga una copia de todos tus datos (GDPR)</Text>
                    </Box>
                    <Button variant="light">Exportar</Button>
                  </Group>
                  
                  <Divider />
                  
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" fw={500} c="red">Eliminar cuenta</Text>
                      <Text size="xs" c="dimmed">Elimina permanentemente tu cuenta y todos los datos</Text>
                    </Box>
                    <Button color="red" variant="light">Eliminar Cuenta</Button>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Container>
  )
}
