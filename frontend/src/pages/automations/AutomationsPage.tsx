import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  Modal,
  TextInput,
  Select,
  Stack,
  Textarea,
  Box,
  Text,
  Badge,
  Card,
  SimpleGrid,
  Switch,
  ActionIcon,
  Menu,
  ThemeIcon,
  Divider,
  MultiSelect,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconRobot,
  IconEdit,
  IconTrash,
  IconDotsVertical,
  IconPlayerPlay,
  IconPlayerPause,
  IconMail,
  IconBell,
  IconCalendarEvent,
  IconCreditCard,
  IconUser,
  IconClipboard,
  IconArrowRight,
  IconCopy,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'

interface Automation {
  id: string
  name: string
  description?: string
  trigger_type: string
  actions: { type: string; config: object }[]
  is_active: boolean
  stats: {
    total_runs: number
    successful_runs: number
    last_run_at?: string
  }
}

export function AutomationsPage() {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  
  // Mock data
  const automations: Automation[] = [
    {
      id: '1',
      name: 'Bienvenida a nuevos clientes',
      description: 'Envía email de bienvenida y asigna formulario PAR-Q cuando se crea un cliente',
      trigger_type: 'client_created',
      actions: [
        { type: 'send_email', config: { template: 'welcome' } },
        { type: 'send_form', config: { form_id: 'parq' } },
      ],
      is_active: true,
      stats: { total_runs: 45, successful_runs: 44, last_run_at: '2024-01-14T10:30:00Z' },
    },
    {
      id: '2',
      name: 'Recordatorio de sesión (24h)',
      description: 'Envía recordatorio por email 24 horas antes de la sesión',
      trigger_type: 'booking_reminder',
      actions: [
        { type: 'send_email', config: { template: 'booking_reminder' } },
      ],
      is_active: true,
      stats: { total_runs: 230, successful_runs: 228, last_run_at: '2024-01-15T08:00:00Z' },
    },
    {
      id: '3',
      name: 'Reactivación de clientes inactivos',
      description: 'Envía mensaje cuando un cliente no tiene actividad en 14 días',
      trigger_type: 'client_inactive',
      actions: [
        { type: 'send_email', config: { template: 'reactivation' } },
        { type: 'create_task', config: { title: 'Seguimiento cliente inactivo' } },
      ],
      is_active: false,
      stats: { total_runs: 12, successful_runs: 12, last_run_at: '2024-01-10T09:00:00Z' },
    },
    {
      id: '4',
      name: 'Aviso de renovación de suscripción',
      description: 'Notifica 7 días antes del vencimiento de la suscripción',
      trigger_type: 'subscription_renewal',
      actions: [
        { type: 'send_email', config: { template: 'renewal_reminder' } },
        { type: 'send_in_app', config: { message: 'Tu suscripción vence pronto' } },
      ],
      is_active: true,
      stats: { total_runs: 18, successful_runs: 18, last_run_at: '2024-01-13T06:00:00Z' },
    },
  ]
  
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      trigger_type: '',
      actions: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
      trigger_type: (value) => (!value ? 'Trigger requerido' : null),
    },
  })
  
  const handleCreate = (values: typeof form.values) => {
    console.log('Create automation:', values)
    closeModal()
    form.reset()
  }
  
  const handleToggle = (id: string, isActive: boolean) => {
    console.log('Toggle automation:', id, isActive)
  }
  
  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'client_created': return <IconUser size={18} />
      case 'client_inactive': return <IconUser size={18} />
      case 'booking_created': return <IconCalendarEvent size={18} />
      case 'booking_reminder': return <IconCalendarEvent size={18} />
      case 'booking_cancelled': return <IconCalendarEvent size={18} />
      case 'payment_received': return <IconCreditCard size={18} />
      case 'payment_failed': return <IconCreditCard size={18} />
      case 'subscription_renewal': return <IconCreditCard size={18} />
      case 'form_submitted': return <IconClipboard size={18} />
      default: return <IconRobot size={18} />
    }
  }
  
  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      client_created: 'Cliente creado',
      client_inactive: 'Cliente inactivo',
      booking_created: 'Reserva creada',
      booking_reminder: 'Recordatorio de reserva',
      booking_cancelled: 'Reserva cancelada',
      payment_received: 'Pago recibido',
      payment_failed: 'Pago fallido',
      subscription_renewal: 'Renovación de suscripción',
      form_submitted: 'Formulario enviado',
      workout_completed: 'Entrenamiento completado',
    }
    return labels[type] || type
  }
  
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'send_email': return <IconMail size={14} />
      case 'send_in_app': return <IconBell size={14} />
      case 'create_task': return <IconClipboard size={14} />
      default: return <IconArrowRight size={14} />
    }
  }
  
  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      send_email: 'Enviar email',
      send_in_app: 'Notificación in-app',
      send_sms: 'Enviar SMS',
      create_task: 'Crear tarea',
      update_tag: 'Actualizar etiqueta',
      webhook: 'Webhook',
    }
    return labels[type] || type
  }
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Automatizaciones"
        description="Configura flujos automáticos para ahorrar tiempo"
        action={{
          label: 'Nueva Automatización',
          onClick: openModal,
        }}
      />
      
      {automations.length > 0 ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {automations.map((automation) => (
            <Card key={automation.id} withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <ThemeIcon
                    size="lg"
                    radius="md"
                    color={automation.is_active ? 'primary' : 'gray'}
                    variant="light"
                  >
                    {getTriggerIcon(automation.trigger_type)}
                  </ThemeIcon>
                  <Box>
                    <Text fw={600}>{automation.name}</Text>
                    <Badge size="xs" variant="light" color={automation.is_active ? 'green' : 'gray'}>
                      {automation.is_active ? 'Activa' : 'Pausada'}
                    </Badge>
                  </Box>
                </Group>
                <Group gap="xs">
                  <Switch
                    checked={automation.is_active}
                    onChange={(e) => handleToggle(automation.id, e.currentTarget.checked)}
                    size="sm"
                  />
                  <Menu position="bottom-end" withArrow>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={14} />}>
                        Editar
                      </Menu.Item>
                      <Menu.Item leftSection={<IconCopy size={14} />}>
                        Duplicar
                      </Menu.Item>
                      <Menu.Item leftSection={<IconPlayerPlay size={14} />}>
                        Ejecutar ahora
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                        Eliminar
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
              
              <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                {automation.description}
              </Text>
              
              {/* Trigger */}
              <Box mb="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">
                  Cuando
                </Text>
                <Badge variant="outline" leftSection={getTriggerIcon(automation.trigger_type)}>
                  {getTriggerLabel(automation.trigger_type)}
                </Badge>
              </Box>
              
              {/* Actions */}
              <Box mb="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">
                  Entonces
                </Text>
                <Group gap="xs">
                  {automation.actions.map((action, index) => (
                    <Badge
                      key={index}
                      variant="light"
                      leftSection={getActionIcon(action.type)}
                    >
                      {getActionLabel(action.type)}
                    </Badge>
                  ))}
                </Group>
              </Box>
              
              <Divider my="sm" />
              
              {/* Stats */}
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {automation.stats.total_runs} ejecuciones ({automation.stats.successful_runs} exitosas)
                </Text>
                {automation.stats.last_run_at && (
                  <Text size="xs" c="dimmed">
                    Última: {new Date(automation.stats.last_run_at).toLocaleDateString('es-ES')}
                  </Text>
                )}
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <EmptyState
          icon={<IconRobot size={40} />}
          title="No hay automatizaciones"
          description="Crea tu primera automatización para ahorrar tiempo en tareas repetitivas."
          actionLabel="Crear Automatización"
          onAction={openModal}
        />
      )}
      
      {/* Modal para crear automatización */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Nueva Automatización"
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Bienvenida a nuevos clientes"
              required
              {...form.getInputProps('name')}
            />
            
            <Textarea
              label="Descripción"
              placeholder="Describe qué hace esta automatización..."
              minRows={2}
              {...form.getInputProps('description')}
            />
            
            <Select
              label="Trigger (Cuando...)"
              placeholder="Selecciona el evento que dispara la automatización"
              required
              data={[
                { group: 'Clientes', items: [
                  { value: 'client_created', label: 'Se crea un cliente' },
                  { value: 'client_inactive', label: 'Cliente inactivo (X días)' },
                ]},
                { group: 'Reservas', items: [
                  { value: 'booking_created', label: 'Se crea una reserva' },
                  { value: 'booking_reminder', label: 'Recordatorio de reserva' },
                  { value: 'booking_cancelled', label: 'Se cancela una reserva' },
                ]},
                { group: 'Pagos', items: [
                  { value: 'payment_received', label: 'Pago recibido' },
                  { value: 'payment_failed', label: 'Pago fallido' },
                  { value: 'subscription_renewal', label: 'Renovación próxima' },
                ]},
                { group: 'Otros', items: [
                  { value: 'form_submitted', label: 'Formulario enviado' },
                  { value: 'workout_completed', label: 'Entrenamiento completado' },
                ]},
              ]}
              {...form.getInputProps('trigger_type')}
            />
            
            <MultiSelect
              label="Acciones (Entonces...)"
              placeholder="Selecciona las acciones a ejecutar"
              data={[
                { value: 'send_email', label: 'Enviar email' },
                { value: 'send_in_app', label: 'Enviar notificación in-app' },
                { value: 'create_task', label: 'Crear tarea' },
                { value: 'update_tag', label: 'Actualizar etiqueta del cliente' },
                { value: 'webhook', label: 'Llamar webhook externo' },
              ]}
              {...form.getInputProps('actions')}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Automatización
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}

