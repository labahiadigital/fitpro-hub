import { ActionIcon, Box, Group, Overlay, Text, Title, ScrollArea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { type ReactNode, useEffect } from "react";

interface SlideOverProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SlideOver({ opened, onClose, title, subtitle, children }: SlideOverProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (opened) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [opened]);

  if (!opened) return null;

  if (!isDesktop) {
    return (
      <Box
        pos="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        style={{ zIndex: 300, background: "var(--mantine-color-body)", overflowY: "auto" }}
      >
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
          <Group justify="space-between">
            <Box>
              <Title order={4}>{title}</Title>
              {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
            </Box>
            <ActionIcon variant="subtle" size="lg" onClick={onClose}>
              <IconX size={22} />
            </ActionIcon>
          </Group>
        </Box>
        <Box p="md" pb="xl">
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Overlay
        fixed
        opacity={0.3}
        color="#000"
        zIndex={299}
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />
      <Box
        pos="fixed"
        top={0}
        right={0}
        bottom={0}
        style={{
          zIndex: 300,
          width: "100%",
          maxWidth: 520,
          background: "var(--mantine-color-body)",
          boxShadow: "var(--mantine-shadow-xl)",
          animation: "slideInFromRight 0.25s ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <style>{`
          @keyframes slideInFromRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>

        <Box
          p="lg"
          style={{ borderBottom: "1px solid var(--mantine-color-gray-3)", flexShrink: 0 }}
        >
          <Group justify="space-between">
            <Box>
              <Title order={4}>{title}</Title>
              {subtitle && <Text size="sm" c="dimmed">{subtitle}</Text>}
            </Box>
            <ActionIcon variant="subtle" size="lg" onClick={onClose}>
              <IconX size={22} />
            </ActionIcon>
          </Group>
        </Box>

        <ScrollArea style={{ flex: 1 }} p="lg">
          <Box pb="xl">{children}</Box>
        </ScrollArea>
      </Box>
    </>
  );
}
