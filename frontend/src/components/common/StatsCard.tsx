import { Box, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeLabel?: string;
  color?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  change,
  changeLabel,
  color = "primary",
}: StatsCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Paper
      p="lg"
      radius="lg"
      style={{
        borderColor: "var(--mantine-color-gray-2)",
        background:
          "linear-gradient(135deg, var(--mantine-color-white) 0%, var(--mantine-color-gray-0) 100%)",
      }}
      withBorder
    >
      <Group align="flex-start" justify="space-between">
        <Box>
          <Text c="dimmed" fw={600} mb={4} size="xs" tt="uppercase">
            {title}
          </Text>
          <Text
            fw={700}
            size="xl"
            style={{ fontSize: "1.75rem", lineHeight: 1.2 }}
          >
            {value}
          </Text>
          {change !== undefined && (
            <Group gap={4} mt={8}>
              {isPositive && (
                <ThemeIcon color="green" radius="xl" size="xs" variant="light">
                  <IconArrowUpRight size={12} />
                </ThemeIcon>
              )}
              {isNegative && (
                <ThemeIcon color="red" radius="xl" size="xs" variant="light">
                  <IconArrowDownRight size={12} />
                </ThemeIcon>
              )}
              <Text
                c={isPositive ? "green" : isNegative ? "red" : "dimmed"}
                fw={500}
                size="xs"
              >
                {isPositive && "+"}
                {change}%
              </Text>
              {changeLabel && (
                <Text c="dimmed" size="xs">
                  {changeLabel}
                </Text>
              )}
            </Group>
          )}
        </Box>
        <ThemeIcon color={color} radius="xl" size={48} variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
