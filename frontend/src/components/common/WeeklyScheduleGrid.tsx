import { Group, Switch, Text, TextInput, Stack } from "@mantine/core";
import { DAY_LABELS, type ScheduleSlot } from "../../hooks/useSchedules";

interface WeeklyScheduleGridProps {
  slots: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
  compact?: boolean;
}

export function WeeklyScheduleGrid({ slots, onChange, compact }: WeeklyScheduleGridProps) {
  const updateSlot = (index: number, field: keyof ScheduleSlot, value: unknown) => {
    const next = slots.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange(next);
  };

  return (
    <Stack gap="xs">
      {slots.map((slot, idx) => (
        <Group key={slot.day_of_week} gap="sm" wrap="nowrap" align="center">
          <Text size="sm" fw={500} w={compact ? 50 : 80} style={{ flexShrink: 0 }}>
            {compact ? DAY_LABELS[slot.day_of_week]?.slice(0, 3) : DAY_LABELS[slot.day_of_week]}
          </Text>
          <Switch
            size="xs"
            checked={slot.is_available}
            onChange={(e) => updateSlot(idx, "is_available", e.currentTarget.checked)}
            color="green"
          />
          <TextInput
            size="xs"
            type="time"
            value={slot.start_time}
            onChange={(e) => updateSlot(idx, "start_time", e.currentTarget.value)}
            disabled={!slot.is_available}
            w={100}
            styles={{ input: { padding: "2px 6px" } }}
          />
          <Text size="xs" c="dimmed">-</Text>
          <TextInput
            size="xs"
            type="time"
            value={slot.end_time}
            onChange={(e) => updateSlot(idx, "end_time", e.currentTarget.value)}
            disabled={!slot.is_available}
            w={100}
            styles={{ input: { padding: "2px 6px" } }}
          />
        </Group>
      ))}
    </Stack>
  );
}
