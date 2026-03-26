import { Badge, Card, Group, Progress, Text, Box } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { type ReactNode } from "react";

interface DayCardMenuProps {
  dayName: string;
  isToday?: boolean;
  isSelected?: boolean;
  isRestDay?: boolean;
  onClick?: () => void;
  badge?: ReactNode;
  summary?: ReactNode;
  progressValue?: number;
  progressColor?: string;
}

export function DayCardMenu({
  dayName,
  isToday,
  isSelected,
  isRestDay,
  onClick,
  badge,
  summary,
  progressValue,
  progressColor,
}: DayCardMenuProps) {
  return (
    <Card
      shadow="sm"
      padding="md"
      radius="lg"
      withBorder
      onClick={isRestDay ? undefined : onClick}
      style={{
        cursor: isRestDay ? "default" : "pointer",
        opacity: isRestDay ? 0.6 : 1,
        transition: "transform 0.12s, box-shadow 0.12s",
        border: isSelected
          ? "2px solid var(--mantine-color-yellow-5)"
          : isToday
            ? "2px solid var(--mantine-color-blue-3)"
            : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isRestDay) (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "";
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb={4}>
            <Text fw={600} size="sm">{dayName}</Text>
            {isToday && <Badge size="xs" color="blue" variant="light">Hoy</Badge>}
            {isRestDay && <Badge size="xs" color="gray" variant="light">Descanso</Badge>}
            {badge}
          </Group>
          {summary}
          {progressValue != null && (
            <Progress
              value={Math.min(progressValue, 100)}
              color={progressColor || "yellow"}
              size="xs"
              radius="xl"
              mt={6}
            />
          )}
        </Box>
        {!isRestDay && <IconChevronRight size={18} color="var(--mantine-color-dimmed)" />}
      </Group>
    </Card>
  );
}
