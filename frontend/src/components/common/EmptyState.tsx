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
      className="nv-card animate-in"
      py={48}
      px="lg"
      ta="center"
      style={{
        background: "var(--nv-surface)",
        border: "1px dashed var(--border-medium)",
      }}
    >
      <Stack align="center" gap="md">
        <Box
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--nv-primary-glow) 0%, var(--nv-surface-subtle) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemeIcon
            size={40}
            radius="xl"
            variant="transparent"
            style={{ color: "var(--nv-primary)" }}
          >
            {icon}
          </ThemeIcon>
        </Box>

        <Box>
          <Text 
            fw={700} 
            size="md"
            mb={4}
            style={{ 
              color: "var(--nv-dark)",
              fontFamily: "'Space Grotesk', sans-serif"
            }}
          >
            {title}
          </Text>
          <Text 
            size="sm" 
            maw={320} 
            mx="auto"
            style={{ color: "var(--nv-slate)" }}
          >
            {description}
          </Text>
        </Box>

        {actionLabel && onAction && (
          <Button
            leftSection={<IconPlus size={16} stroke={2.5} />}
            onClick={onAction}
            size="sm"
            radius="md"
            styles={{
              root: {
                background: "var(--nv-accent)",
                color: "var(--nv-dark)",
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(231, 226, 71, 0.25)",
                transition: "all 0.2s",
                "&:hover": {
                  background: "var(--nv-accent-hover)",
                  boxShadow: "0 4px 12px rgba(231, 226, 71, 0.35)"
                }
              }
            }}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
