import { ActionIcon, Box, Group, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { type ReactNode, useEffect } from "react";

interface FullPageDetailProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function FullPageDetail({ opened, onClose, title, subtitle, children }: FullPageDetailProps) {
  useEffect(() => {
    if (opened) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [opened]);

  if (!opened) return null;

  return (
    <Box
      pos="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      style={{
        zIndex: 200,
        background: "var(--mantine-color-body)",
        overflowY: "auto",
        animation: "slideInRight 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <Box
        pos="sticky"
        top={0}
        style={{
          zIndex: 10,
          background: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-gray-3)",
        }}
        p="md"
      >
        <Group gap="sm">
          <ActionIcon variant="subtle" size="lg" onClick={onClose} aria-label="Volver">
            <IconArrowLeft size={22} />
          </ActionIcon>
          <Box>
            <Title order={4} lineClamp={1}>{title}</Title>
            {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
          </Box>
        </Group>
      </Box>

      <Box p="md" pb="xl">
        {children}
      </Box>
    </Box>
  );
}
