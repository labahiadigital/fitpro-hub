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
      py={80}
      px="xl"
      ta="center"
      style={{
        background: "linear-gradient(180deg, var(--nv-surface) 0%, var(--nv-surface-subtle) 100%)",
        border: "2px dashed var(--border-medium)",
      }}
    >
      <Stack align="center" gap="lg">
        <Box
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--nv-primary-glow) 0%, var(--nv-accent-glow) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(92, 128, 188, 0.15)",
          }}
        >
          <ThemeIcon
            size={60}
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
            size="xl"
            mb="xs"
            style={{ 
              color: "var(--nv-dark)",
              fontFamily: "'Space Grotesk', sans-serif"
            }}
          >
            {title}
          </Text>
          <Text 
            size="md" 
            maw={400} 
            mx="auto"
            style={{ color: "var(--nv-slate)" }}
          >
            {description}
          </Text>
        </Box>

        {actionLabel && onAction && (
          <Button
            leftSection={<IconPlus size={18} stroke={2.5} />}
            onClick={onAction}
            size="lg"
            radius="xl"
            styles={{
              root: {
                background: "var(--nv-accent)",
                color: "var(--nv-dark)",
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(231, 226, 71, 0.3)",
                transition: "all 0.2s",
                "&:hover": {
                  background: "var(--nv-accent-hover)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 20px rgba(231, 226, 71, 0.4)"
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
