import { Box, Button, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      px="xl"
      py={60}
      style={{
        textAlign: "center",
        background:
          "linear-gradient(180deg, var(--mantine-color-gray-0) 0%, transparent 100%)",
        borderRadius: "var(--mantine-radius-lg)",
      }}
    >
      <Stack align="center" gap="md">
        <ThemeIcon
          color="primary"
          radius="xl"
          size={80}
          style={{ opacity: 0.8 }}
          variant="light"
        >
          {icon}
        </ThemeIcon>
        <Text fw={600} size="lg">
          {title}
        </Text>
        <Text c="dimmed" maw={400} size="sm">
          {description}
        </Text>
        {actionLabel && onAction && (
          <Button
            leftSection={<IconPlus size={16} />}
            mt="md"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
