import { Stack, Text, Button, ThemeIcon, Box } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
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
      py={60}
      px="xl"
      style={{
        textAlign: 'center',
        background: 'linear-gradient(180deg, var(--mantine-color-gray-0) 0%, transparent 100%)',
        borderRadius: 'var(--mantine-radius-lg)',
      }}
    >
      <Stack align="center" gap="md">
        <ThemeIcon
          size={80}
          radius="xl"
          variant="light"
          color="primary"
          style={{ opacity: 0.8 }}
        >
          {icon}
        </ThemeIcon>
        <Text size="lg" fw={600}>
          {title}
        </Text>
        <Text size="sm" c="dimmed" maw={400}>
          {description}
        </Text>
        {actionLabel && onAction && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={onAction}
            mt="md"
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Box>
  )
}

