import { Badge, Group, Progress, Text, Box } from "@mantine/core";
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
    <Box
      onClick={isRestDay ? undefined : onClick}
      style={{
        cursor: isRestDay ? "default" : "pointer",
        opacity: isRestDay ? 0.5 : 1,
        borderBottom: "1px solid var(--mantine-color-gray-2)",
        background: isSelected
          ? "var(--mantine-color-yellow-0)"
          : isToday
            ? "var(--mantine-color-blue-0)"
            : "transparent",
        transition: "background 0.15s ease",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
      px="md"
      py="sm"
    >
      <Group justify="space-between" wrap="nowrap" align="center">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb={2}>
            <Text fw={600} size="sm">{dayName}</Text>
            {isToday && <Badge size="xs" color="blue" variant="light">Hoy</Badge>}
            {isRestDay && <Badge size="xs" color="gray" variant="light">Descanso</Badge>}
          </Group>
          {summary}
          {badge && <Box mt={2}>{badge}</Box>}
          {progressValue != null && (
            <Progress
              value={Math.min(progressValue, 100)}
              color={progressColor || "yellow"}
              size="xs"
              radius="xl"
              mt={4}
            />
          )}
        </Box>
        {!isRestDay && (
          <IconChevronRight
            size={20}
            color="var(--mantine-color-dimmed)"
            style={{ flexShrink: 0 }}
          />
        )}
      </Group>
    </Box>
  );
}
