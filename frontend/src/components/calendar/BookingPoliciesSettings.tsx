import { Paper, Title, Stack, NumberInput, Switch, Group, Divider, Select } from '@mantine/core'
import { IconClock, IconCalendarOff, IconBell, IconUsers } from '@tabler/icons-react'

interface BookingPolicies {
  cancellationHours: number
  rescheduleHours: number
  maxAdvanceDays: number
  enableWaitlist: boolean
  maxWaitlistSize: number
  sendReminders: boolean
  reminderHoursBefore: number[]
  allowSelfBooking: boolean
  requireApproval: boolean
  bufferMinutes: number
}

interface BookingPoliciesSettingsProps {
  policies: BookingPolicies
  onChange: (policies: BookingPolicies) => void
}

export function BookingPoliciesSettings({ policies, onChange }: BookingPoliciesSettingsProps) {
  const updatePolicy = <K extends keyof BookingPolicies>(key: K, value: BookingPolicies[K]) => {
    onChange({ ...policies, [key]: value })
  }

  return (
    <Stack gap="lg">
      {/* Cancelación y Reprogramación */}
      <Paper withBorder p="md" radius="md">
        <Group gap="xs" mb="md">
          <IconCalendarOff size={20} />
          <Title order={5}>Políticas de Cancelación</Title>
        </Group>
        
        <Stack gap="md">
          <NumberInput
            label="Horas mínimas para cancelar"
            description="El cliente debe cancelar con al menos estas horas de antelación"
            min={0}
            max={168}
            value={policies.cancellationHours}
            onChange={(value) => updatePolicy('cancellationHours', Number(value) || 0)}
            suffix=" horas"
          />
          <NumberInput
            label="Horas mínimas para reprogramar"
            description="El cliente puede reprogramar hasta estas horas antes"
            min={0}
            max={168}
            value={policies.rescheduleHours}
            onChange={(value) => updatePolicy('rescheduleHours', Number(value) || 0)}
            suffix=" horas"
          />
        </Stack>
      </Paper>

      {/* Reservas */}
      <Paper withBorder p="md" radius="md">
        <Group gap="xs" mb="md">
          <IconClock size={20} />
          <Title order={5}>Configuración de Reservas</Title>
        </Group>
        
        <Stack gap="md">
          <NumberInput
            label="Días máximos de antelación"
            description="Los clientes pueden reservar hasta X días en el futuro"
            min={1}
            max={365}
            value={policies.maxAdvanceDays}
            onChange={(value) => updatePolicy('maxAdvanceDays', Number(value) || 30)}
            suffix=" días"
          />
          <NumberInput
            label="Buffer entre sesiones"
            description="Minutos de descanso entre sesiones consecutivas"
            min={0}
            max={60}
            value={policies.bufferMinutes}
            onChange={(value) => updatePolicy('bufferMinutes', Number(value) || 0)}
            suffix=" min"
          />
          <Divider />
          <Switch
            label="Permitir auto-reserva"
            description="Los clientes pueden reservar sin aprobación"
            checked={policies.allowSelfBooking}
            onChange={(e) => updatePolicy('allowSelfBooking', e.currentTarget.checked)}
          />
          <Switch
            label="Requerir aprobación"
            description="Las reservas requieren tu confirmación"
            checked={policies.requireApproval}
            onChange={(e) => updatePolicy('requireApproval', e.currentTarget.checked)}
          />
        </Stack>
      </Paper>

      {/* Lista de espera */}
      <Paper withBorder p="md" radius="md">
        <Group gap="xs" mb="md">
          <IconUsers size={20} />
          <Title order={5}>Lista de Espera</Title>
        </Group>
        
        <Stack gap="md">
          <Switch
            label="Habilitar lista de espera"
            description="Permite a clientes unirse a la lista cuando la sesión está llena"
            checked={policies.enableWaitlist}
            onChange={(e) => updatePolicy('enableWaitlist', e.currentTarget.checked)}
          />
          {policies.enableWaitlist && (
            <NumberInput
              label="Tamaño máximo de lista de espera"
              min={1}
              max={50}
              value={policies.maxWaitlistSize}
              onChange={(value) => updatePolicy('maxWaitlistSize', Number(value) || 10)}
            />
          )}
        </Stack>
      </Paper>

      {/* Recordatorios */}
      <Paper withBorder p="md" radius="md">
        <Group gap="xs" mb="md">
          <IconBell size={20} />
          <Title order={5}>Recordatorios</Title>
        </Group>
        
        <Stack gap="md">
          <Switch
            label="Enviar recordatorios automáticos"
            description="Envía emails de recordatorio antes de las sesiones"
            checked={policies.sendReminders}
            onChange={(e) => updatePolicy('sendReminders', e.currentTarget.checked)}
          />
          {policies.sendReminders && (
            <Select
              label="Enviar recordatorio"
              description="Cuándo enviar el recordatorio"
              data={[
                { value: '1', label: '1 hora antes' },
                { value: '2', label: '2 horas antes' },
                { value: '24', label: '24 horas antes' },
                { value: '48', label: '48 horas antes' },
              ]}
              value={String(policies.reminderHoursBefore[0] || 24)}
              onChange={(value) => updatePolicy('reminderHoursBefore', [Number(value)])}
            />
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}

