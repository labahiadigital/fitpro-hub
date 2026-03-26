import { ActionIcon, Box, Group, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { type ReactNode, useEffect } from "react";

interface FullPageDetailProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function FullPageDetail({ opened, onClose, title, subtitle, children, footer }: FullPageDetailProps) {
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
        background: "var(--mantine-color-gray-0)",
        display: "flex",
        flexDirection: "column",
        animation: "slideInRight 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Glassmorphism sticky header */}
      <Box
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
        }}
      >
        <Group gap="sm" wrap="nowrap" style={{ width: "100%" }}>
          <ActionIcon variant="subtle" size="lg" onClick={onClose} aria-label="Volver" radius="xl">
            <IconArrowLeft size={22} />
          </ActionIcon>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700} size="sm" lineClamp={1}>{title}</Text>
            {subtitle && <Text size="xs" c="dimmed" lineClamp={1}>{subtitle}</Text>}
          </Box>
        </Group>
      </Box>

      {/* Scrollable content */}
      <Box style={{ flex: 1, overflowY: "auto" }} px="md" py="md">
        {children}
      </Box>

      {/* Optional sticky footer */}
      {footer && (
        <Box
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--mantine-color-gray-2)",
            background: "#fff",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
            paddingBottom: "env(safe-area-inset-bottom, 8px)",
          }}
          px="md"
          py="sm"
        >
          {footer}
        </Box>
      )}
    </Box>
  );
}
