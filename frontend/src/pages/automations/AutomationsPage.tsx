import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  TextInput,
  Select,
  Stack,
  Textarea,
  Box,
  Text,
  Badge,
  Card,
  ActionIcon,
  SimpleGrid,
  Switch,
  ThemeIcon,
  Divider,
  Stepper,
  Timeline,
  Drawer,
  ScrollArea,
  Alert,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconRobot,
  IconEdit,
  IconTrash,
  IconCopy,
  IconBolt,
  IconMail,
  IconMessage,
  IconCalendarEvent,
  IconUser,
  IconCreditCard,
  IconClockHour4,
  IconCheck,
  IconAlertCircle,
  IconGitBranch,
  IconSettings,
  IconBell,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'

interface AutomationTrigger {
  type: string
  config: Record<string, any>
}

interface AutomationAction {
  id: string
  type: string
  config: Record<string, any>
  delay?: number
  delayUnit?: 'minutes' | 'hours' | 'days'
}

interface Automation {
  id: string
  name: string
  description?: string
  trigger: AutomationTrigger
  actions: AutomationAction[]
  is_active: boolean
  last_run?: string
  run_count: number
}

const triggerTypes = [
  { value: 'client_created', label: 'Nuevo cliente creado', icon: IconUser, color: 'blue' },
  { value: 'booking_created', label: 'Nueva reserva creada', icon: IconCalendarEvent, color: 'green' },
  { value: 'booking_reminder', label: 'Recordatorio de reserva', icon: IconClockHour4, color: 'orange' },
  { value: 'payment_received', label: 'Pago recibido', icon: IconCreditCard, color: 'teal' },
  { value: 'payment_failed', label: 'Pago fallido', icon: IconAlertCircle, color: 'red' },
  { value: 'subscription_renewal', label: 'Renovación próxima', icon: IconBolt, color: 'grape' },
  { value: 'client_inactive', label: 'Cliente inactivo', icon: IconClockHour4, color: 'yellow' },
  { value: 'form_submitted', label: 'Formulario enviado', icon: IconCheck, color: 'cyan' },
]

const actionTypes = [
  { value: 'send_email', label: 'Enviar email', icon: IconMail, color: 'blue' },
  { value: 'send_notification', label: 'Enviar notificación', icon: IconBell, color: 'orange' },
  { value: 'send_message', label: 'Enviar mensaje', icon: IconMessage, color: 'green' },
  { value: 'assign_form', label: 'Asignar formulario', icon: IconCheck, color: 'teal' },
  { value: 'assign_program', label: 'Asignar programa', icon: IconGitBranch, color: 'grape' },
  { value: 'create_task', label: 'Crear tarea', icon: IconSettings, color: 'cyan' },
  { value: 'update_tags', label: 'Actualizar etiquetas', icon: IconUser, color: 'pink' },
]

const mockAutomations: Automation[] = [
  {
    id: '1',
    name: 'Onboarding de Nuevo Cliente',
    description: 'Secuencia de bienvenida para nuevos clientes',
    trigger: { type: 'client_created', config: {} },
    actions: [
      { id: 'a1', type: 'send_email', config: { template: 'welcome' } },
      { id: 'a2', type: 'assign_form', config: { form: 'par_q' }, delay: 1, delayUnit: 'hours' },
      { id: 'a3', type: 'send_message', config: { message: 'Bienvenido!' }, delay: 1, delayUnit: 'days' },
    ],
    is_active: true,
    last_run: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    run_count: 45,
  },
  {
    id: '2',
    name: 'Recordatorio de Sesión',
    description: 'Envía recordatorio 24h antes de la sesión',
    trigger: { type: 'booking_reminder', config: { hours_before: 24 } },
    actions: [
      { id: 'a1', type: 'send_email', config: { template: 'booking_reminder' } },
      { id: 'a2', type: 'send_notification', config: { title: 'Sesión mañana' } },
    ],
    is_active: true,
    last_run: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    run_count: 230,
  },
  {
    id: '3',
    name: 'Reactivación de Cliente Inactivo',
    description: 'Contacta clientes sin actividad en 30 días',
    trigger: { type: 'client_inactive', config: { days: 30 } },
    actions: [
      { id: 'a1', type: 'send_email', config: { template: 'reactivation' } },
      { id: 'a2', type: 'update_tags', config: { add: ['inactivo'] }, delay: 7, delayUnit: 'days' },
    ],
    is_active: false,
    run_count: 12,
  },
]

export function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations)
  const [builderOpened, { open: openBuilder, close: closeBuilder }] = useDisclosure(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null)
  const [actions, setActions] = useState<AutomationAction[]>([])

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      trigger_type: '',
      trigger_config: {} as Record<string, any>,
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
      trigger_type: (value) => (!value ? 'Selecciona un disparador' : null),
    },
  })

  const openAutomationBuilder = (automation?: Automation) => {
    if (automation) {
      setEditingAutomation(automation)
      form.setValues({
        name: automation.name,
        description: automation.description || '',
        trigger_type: automation.trigger.type,
        trigger_config: automation.trigger.config,
      })
      setSelectedTrigger(automation.trigger.type)
      setActions(automation.actions)
    } else {
      setEditingAutomation(null)
      form.reset()
      setSelectedTrigger(null)
      setActions([])
    }
    setActiveStep(0)
    openBuilder()
  }

  const addAction = (type: string) => {
    const newAction: AutomationAction = {
      id: `action-${Date.now()}`,
      type,
      config: {},
    }
    setActions([...actions, newAction])
  }

  const removeAction = (actionId: string) => {
    setActions(actions.filter(a => a.id !== actionId))
  }

  const updateAction = (actionId: string, updates: Partial<AutomationAction>) => {
    setActions(actions.map(a => a.id === actionId ? { ...a, ...updates } : a))
  }

  const handleSaveAutomation = () => {
    const values = form.values
    if (!values.name || !values.trigger_type) return

    const newAutomation: Automation = {
      id: editingAutomation?.id || `auto-${Date.now()}`,
      name: values.name,
      description: values.description,
      trigger: {
        type: values.trigger_type,
        config: values.trigger_config,
      },
      actions,
      is_active: editingAutomation?.is_active ?? true,
      run_count: editingAutomation?.run_count ?? 0,
    }

    if (editingAutomation) {
      setAutomations(autos => autos.map(a => a.id === editingAutomation.id ? newAutomation : a))
    } else {
      setAutomations(autos => [...autos, newAutomation])
    }

    closeBuilder()
    form.reset()
    setActions([])
    setSelectedTrigger(null)
    setEditingAutomation(null)
  }

  const toggleAutomation = (automationId: string) => {
    setAutomations(autos =>
      autos.map(a => a.id === automationId ? { ...a, is_active: !a.is_active } : a)
    )
  }

  const deleteAutomation = (automationId: string) => {
    setAutomations(autos => autos.filter(a => a.id !== automationId))
  }

  const getTriggerInfo = (type: string) => {
    return triggerTypes.find(t => t.value === type)
  }

  const getActionInfo = (type: string) => {
    return actionTypes.find(a => a.value === type)
  }

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Automatizaciones"
        description="Configura workflows automáticos para tu negocio"
        action={{
          label: 'Nueva Automatización',
          onClick: () => openAutomationBuilder(),
        }}
      />

      {automations.length > 0 ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {automations.map((automation) => {
            const triggerInfo = getTriggerInfo(automation.trigger.type)
            const TriggerIcon = triggerInfo?.icon || IconBolt

            return (
              <Card key={automation.id} withBorder radius="lg" padding="lg">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <ThemeIcon
                      size="lg"
                      radius="md"
                      variant="light"
                      color={triggerInfo?.color || 'gray'}
                    >
                      <TriggerIcon size={18} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={600}>{automation.name}</Text>
                      <Text size="xs" c="dimmed">{triggerInfo?.label}</Text>
                    </Box>
                  </Group>
                  <Switch
                    checked={automation.is_active}
                    onChange={() => toggleAutomation(automation.id)}
                    color="green"
                  />
                </Group>

                {automation.description && (
                  <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                    {automation.description}
                  </Text>
                )}

                <Box mb="md">
                  <Text size="xs" c="dimmed" mb="xs">Acciones ({automation.actions.length})</Text>
                  <Group gap="xs">
                    {automation.actions.slice(0, 4).map((action) => {
                      const actionInfo = getActionInfo(action.type)
                      const ActionIconComponent = actionInfo?.icon || IconBolt
                      return (
                        <ThemeIcon
                          key={action.id}
                          size="sm"
                          radius="md"
                          variant="light"
                          color={actionInfo?.color || 'gray'}
                        >
                          <ActionIconComponent size={12} />
                        </ThemeIcon>
                      )
                    })}
                    {automation.actions.length > 4 && (
                      <Badge size="xs" variant="light">
                        +{automation.actions.length - 4}
                      </Badge>
                    )}
                  </Group>
                </Box>

                <Divider mb="md" />

                <Group justify="space-between">
                  <Group gap="xs">
                    <Badge
                      size="sm"
                      variant={automation.is_active ? 'filled' : 'outline'}
                      color={automation.is_active ? 'green' : 'gray'}
                    >
                      {automation.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {automation.run_count} ejecuciones
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => openAutomationBuilder(automation)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="gray">
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => deleteAutomation(automation.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            )
          })}
        </SimpleGrid>
      ) : (
        <EmptyState
          icon={<IconRobot size={40} />}
          title="No hay automatizaciones"
          description="Crea tu primera automatización para optimizar tu negocio."
          actionLabel="Crear Automatización"
          onAction={() => openAutomationBuilder()}
        />
      )}

      {/* Automation Builder Drawer */}
      <Drawer
        opened={builderOpened}
        onClose={closeBuilder}
        title={editingAutomation ? 'Editar Automatización' : 'Nueva Automatización'}
        size="xl"
        position="right"
      >
        <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
          <Stepper active={activeStep} onStepClick={setActiveStep} mb="xl">
            <Stepper.Step label="Información" description="Nombre y descripción">
              <Stack mt="md">
                <TextInput
                  label="Nombre de la automatización"
                  placeholder="Ej: Onboarding de nuevos clientes"
                  required
                  {...form.getInputProps('name')}
                />
                <Textarea
                  label="Descripción"
                  placeholder="Describe qué hace esta automatización..."
                  minRows={2}
                  {...form.getInputProps('description')}
                />
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Disparador" description="Cuándo se activa">
              <Stack mt="md">
                <Text size="sm" fw={500} mb="xs">¿Cuándo debe activarse esta automatización?</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {triggerTypes.map((trigger) => {
                    const TriggerIcon = trigger.icon
                    const isSelected = selectedTrigger === trigger.value
                    return (
                      <Card
                        key={trigger.value}
                        withBorder
                        padding="sm"
                        radius="md"
                        style={{
                          cursor: 'pointer',
                          borderColor: isSelected ? `var(--mantine-color-${trigger.color}-5)` : undefined,
                          backgroundColor: isSelected ? `var(--mantine-color-${trigger.color}-0)` : undefined,
                        }}
                        onClick={() => {
                          setSelectedTrigger(trigger.value)
                          form.setFieldValue('trigger_type', trigger.value)
                        }}
                      >
                        <Group gap="sm">
                          <ThemeIcon
                            size="md"
                            radius="md"
                            variant={isSelected ? 'filled' : 'light'}
                            color={trigger.color}
                          >
                            <TriggerIcon size={16} />
                          </ThemeIcon>
                          <Text size="sm" fw={isSelected ? 600 : 400}>
                            {trigger.label}
                          </Text>
                        </Group>
                      </Card>
                    )
                  })}
                </SimpleGrid>

                {selectedTrigger === 'booking_reminder' && (
                  <Select
                    label="¿Cuánto tiempo antes?"
                    data={[
                      { value: '1', label: '1 hora antes' },
                      { value: '2', label: '2 horas antes' },
                      { value: '24', label: '24 horas antes' },
                      { value: '48', label: '48 horas antes' },
                    ]}
                    mt="md"
                  />
                )}

                {selectedTrigger === 'client_inactive' && (
                  <Select
                    label="¿Después de cuántos días?"
                    data={[
                      { value: '7', label: '7 días' },
                      { value: '14', label: '14 días' },
                      { value: '30', label: '30 días' },
                      { value: '60', label: '60 días' },
                    ]}
                    mt="md"
                  />
                )}
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Acciones" description="Qué hacer">
              <Stack mt="md">
                <Text size="sm" fw={500}>Acciones a ejecutar</Text>

                {actions.length > 0 && (
                  <Timeline active={actions.length} bulletSize={24} lineWidth={2}>
                    {actions.map((action, actionIndex) => {
                      const actionInfo = getActionInfo(action.type)
                      const ActionIconComponent = actionInfo?.icon || IconBolt
                      return (
                        <Timeline.Item
                          key={action.id}
                          bullet={
                            <ThemeIcon
                              size={24}
                              radius="xl"
                              color={actionInfo?.color || 'gray'}
                            >
                              <ActionIconComponent size={12} />
                            </ThemeIcon>
                          }
                          title={
                            <Group justify="space-between">
                              <Text size="sm" fw={500}>{actionInfo?.label}</Text>
                              <ActionIcon
                                size="xs"
                                color="red"
                                variant="subtle"
                                onClick={() => removeAction(action.id)}
                              >
                                <IconTrash size={12} />
                              </ActionIcon>
                            </Group>
                          }
                        >
                          <Stack gap="xs" mt="xs">
                            {action.type === 'send_email' && (
                              <Select
                                size="xs"
                                placeholder="Selecciona plantilla"
                                data={[
                                  { value: 'welcome', label: 'Bienvenida' },
                                  { value: 'booking_reminder', label: 'Recordatorio de reserva' },
                                  { value: 'payment_reminder', label: 'Recordatorio de pago' },
                                  { value: 'reactivation', label: 'Reactivación' },
                                ]}
                                value={action.config.template}
                                onChange={(v) => updateAction(action.id, { config: { ...action.config, template: v } })}
                              />
                            )}
                            {action.type === 'send_message' && (
                              <Textarea
                                size="xs"
                                placeholder="Escribe el mensaje..."
                                minRows={2}
                                value={action.config.message || ''}
                                onChange={(e) => updateAction(action.id, { config: { ...action.config, message: e.target.value } })}
                              />
                            )}
                            {actionIndex > 0 && (
                              <Group gap="xs">
                                <Text size="xs" c="dimmed">Esperar</Text>
                                <Select
                                  size="xs"
                                  w={80}
                                  data={[
                                    { value: '0', label: '0' },
                                    { value: '1', label: '1' },
                                    { value: '2', label: '2' },
                                    { value: '5', label: '5' },
                                    { value: '10', label: '10' },
                                    { value: '24', label: '24' },
                                  ]}
                                  value={String(action.delay || 0)}
                                  onChange={(v) => updateAction(action.id, { delay: Number(v) })}
                                />
                                <Select
                                  size="xs"
                                  w={100}
                                  data={[
                                    { value: 'minutes', label: 'minutos' },
                                    { value: 'hours', label: 'horas' },
                                    { value: 'days', label: 'días' },
                                  ]}
                                  value={action.delayUnit || 'hours'}
                                  onChange={(v) => updateAction(action.id, { delayUnit: v as any })}
                                />
                              </Group>
                            )}
                          </Stack>
                        </Timeline.Item>
                      )
                    })}
                  </Timeline>
                )}

                <Divider label="Añadir acción" labelPosition="center" />

                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                  {actionTypes.map((action) => {
                    const ActionIcon = action.icon
                    return (
                      <Button
                        key={action.value}
                        variant="light"
                        color={action.color}
                        leftSection={<ActionIcon size={16} />}
                        onClick={() => addAction(action.value)}
                        size="sm"
                      >
                        {action.label}
                      </Button>
                    )
                  })}
                </SimpleGrid>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Alert color="green" title="¡Automatización lista!" icon={<IconCheck />} mt="md">
                Tu automatización está configurada. Revisa los detalles y guárdala.
              </Alert>

              <Paper withBorder p="md" radius="md" mt="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Nombre</Text>
                    <Text size="sm" fw={500}>{form.values.name || '-'}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Disparador</Text>
                    <Text size="sm" fw={500}>
                      {getTriggerInfo(form.values.trigger_type)?.label || '-'}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Acciones</Text>
                    <Text size="sm" fw={500}>{actions.length} acciones</Text>
                  </Group>
                </Stack>
              </Paper>
            </Stepper.Completed>
          </Stepper>
        </ScrollArea>

        <Group justify="space-between" mt="md" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Button
            variant="default"
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
          >
            Anterior
          </Button>
          <Group>
            <Button variant="default" onClick={closeBuilder}>
              Cancelar
            </Button>
            {activeStep < 3 ? (
              <Button onClick={() => setActiveStep(Math.min(3, activeStep + 1))}>
                Siguiente
              </Button>
            ) : (
              <Button onClick={handleSaveAutomation} color="green">
                {editingAutomation ? 'Guardar Cambios' : 'Crear Automatización'}
              </Button>
            )}
          </Group>
        </Group>
      </Drawer>
    </Container>
  )
}

export default AutomationsPage
