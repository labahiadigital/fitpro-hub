import {
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Title,
} from "@mantine/core";
import {
  IconBell,
  IconCalendarOff,
  IconClock,
  IconUsers,
} from "@tabler/icons-react";

interface BookingPolicies {
  cancellationHours: number;
  rescheduleHours: number;
  maxAdvanceDays: number;
  enableWaitlist: boolean;
  maxWaitlistSize: number;
  sendReminders: boolean;
  reminderHoursBefore: number[];
  allowSelfBooking: boolean;
  requireApproval: boolean;
  bufferMinutes: number;
}

interface BookingPoliciesSettingsProps {
  policies: BookingPolicies;
  onChange: (policies: BookingPolicies) => void;
}

export function BookingPoliciesSettings({
  policies,
  onChange,
}: BookingPoliciesSettingsProps) {
  const updatePolicy = <K extends keyof BookingPolicies>(
    key: K,
    value: BookingPolicies[K]
  ) => {
    onChange({ ...policies, [key]: value });
  };

  return (
    <Stack gap="lg">
      {/* Cancelación y Reprogramación */}
      <Paper p="md" radius="md" withBorder>
        <Group gap="xs" mb="md">
          <IconCalendarOff size={20} />
          <Title order={5}>Políticas de Cancelación</Title>
        </Group>

        <Stack gap="md">
          <NumberInput
            description="El cliente debe cancelar con al menos estas horas de antelación"
            label="Horas mínimas para cancelar"
            max={168}
            min={0}
            onChange={(value) =>
              updatePolicy("cancellationHours", Number(value) || 0)
            }
            suffix=" horas"
            value={policies.cancellationHours}
          />
          <NumberInput
            description="El cliente puede reprogramar hasta estas horas antes"
            label="Horas mínimas para reprogramar"
            max={168}
            min={0}
            onChange={(value) =>
              updatePolicy("rescheduleHours", Number(value) || 0)
            }
            suffix=" horas"
            value={policies.rescheduleHours}
          />
        </Stack>
      </Paper>

      {/* Reservas */}
      <Paper p="md" radius="md" withBorder>
        <Group gap="xs" mb="md">
          <IconClock size={20} />
          <Title order={5}>Configuración de Reservas</Title>
        </Group>

        <Stack gap="md">
          <NumberInput
            description="Los clientes pueden reservar hasta X días en el futuro"
            label="Días máximos de antelación"
            max={365}
            min={1}
            onChange={(value) =>
              updatePolicy("maxAdvanceDays", Number(value) || 30)
            }
            suffix=" días"
            value={policies.maxAdvanceDays}
          />
          <NumberInput
            description="Minutos de descanso entre sesiones consecutivas"
            label="Buffer entre sesiones"
            max={60}
            min={0}
            onChange={(value) =>
              updatePolicy("bufferMinutes", Number(value) || 0)
            }
            suffix=" min"
            value={policies.bufferMinutes}
          />
          <Divider />
          <Switch
            checked={policies.allowSelfBooking}
            description="Los clientes pueden reservar sin aprobación"
            label="Permitir auto-reserva"
            onChange={(e) =>
              updatePolicy("allowSelfBooking", e.currentTarget.checked)
            }
          />
          <Switch
            checked={policies.requireApproval}
            description="Las reservas requieren tu confirmación"
            label="Requerir aprobación"
            onChange={(e) =>
              updatePolicy("requireApproval", e.currentTarget.checked)
            }
          />
        </Stack>
      </Paper>

      {/* Lista de espera */}
      <Paper p="md" radius="md" withBorder>
        <Group gap="xs" mb="md">
          <IconUsers size={20} />
          <Title order={5}>Lista de Espera</Title>
        </Group>

        <Stack gap="md">
          <Switch
            checked={policies.enableWaitlist}
            description="Permite a clientes unirse a la lista cuando la sesión está llena"
            label="Habilitar lista de espera"
            onChange={(e) =>
              updatePolicy("enableWaitlist", e.currentTarget.checked)
            }
          />
          {policies.enableWaitlist && (
            <NumberInput
              label="Tamaño máximo de lista de espera"
              max={50}
              min={1}
              onChange={(value) =>
                updatePolicy("maxWaitlistSize", Number(value) || 10)
              }
              value={policies.maxWaitlistSize}
            />
          )}
        </Stack>
      </Paper>

      {/* Recordatorios */}
      <Paper p="md" radius="md" withBorder>
        <Group gap="xs" mb="md">
          <IconBell size={20} />
          <Title order={5}>Recordatorios</Title>
        </Group>

        <Stack gap="md">
          <Switch
            checked={policies.sendReminders}
            description="Envía emails de recordatorio antes de las sesiones"
            label="Enviar recordatorios automáticos"
            onChange={(e) =>
              updatePolicy("sendReminders", e.currentTarget.checked)
            }
          />
          {policies.sendReminders && (
            <Select
              data={[
                { value: "1", label: "1 hora antes" },
                { value: "2", label: "2 horas antes" },
                { value: "24", label: "24 horas antes" },
                { value: "48", label: "48 horas antes" },
              ]}
              description="Cuándo enviar el recordatorio"
              label="Enviar recordatorio"
              onChange={(value) =>
                updatePolicy("reminderHoursBefore", [Number(value)])
              }
              value={String(policies.reminderHoursBefore[0] || 24)}
            />
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
