import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Drawer,
  Group,
  SegmentedControl,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconSettings, IconX } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";

interface PlanEditorLayoutProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  clientBadge?: string;
  badgeColor?: string;
  isSaving?: boolean;
  onSave: () => void;
  saveLabel: string;
  sidebarContent: ReactNode;
  mainContent: ReactNode;
}

export function PlanEditorLayout({
  opened,
  onClose,
  title,
  clientBadge,
  badgeColor = "blue",
  isSaving,
  onSave,
  saveLabel,
  sidebarContent,
  mainContent,
}: PlanEditorLayoutProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mobileTab, setMobileTab] = useState<string>("config");

  return (
    <Drawer
      onClose={onClose}
      opened={opened}
      position={isMobile ? "bottom" : "right"}
      size="100%"
      withCloseButton={false}
      styles={{
        content: { backgroundColor: "var(--nv-bg)", padding: 0 },
        header: { display: "none" },
        body: {
          padding: 0,
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box
        px={isMobile ? "sm" : "lg"}
        py="sm"
        style={{
          borderBottom: "1px solid var(--nv-border)",
          backgroundColor: "var(--nv-paper-bg)",
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ActionIcon
              variant="subtle"
              color="gray"
              radius="xl"
              size="lg"
              onClick={onClose}
            >
              {isMobile ? <IconChevronLeft size={20} /> : <IconX size={20} />}
            </ActionIcon>
            <Box style={{ minWidth: 0 }}>
              <Text
                fw={700}
                size={isMobile ? "md" : "lg"}
                style={{ lineHeight: 1.2 }}
                truncate
              >
                {title}
              </Text>
              {clientBadge && (
                <Badge color={badgeColor} size="sm" variant="light" mt={2}>
                  {clientBadge}
                </Badge>
              )}
            </Box>
          </Group>
          {!isMobile && (
            <Group gap="sm">
              <Button onClick={onClose} variant="default" radius="xl" size="sm">
                Cancelar
              </Button>
              <Button
                loading={isSaving}
                onClick={onSave}
                radius="xl"
                size="sm"
                style={{ backgroundColor: "var(--nv-primary)" }}
              >
                {saveLabel}
              </Button>
            </Group>
          )}
        </Group>

        {/* Mobile tab selector */}
        {isMobile && (
          <SegmentedControl
            fullWidth
            mt="xs"
            size="xs"
            radius="xl"
            value={mobileTab}
            onChange={setMobileTab}
            data={[
              {
                value: "config",
                label: (
                  <Group gap={4} justify="center">
                    <IconSettings size={14} />
                    <span>Configuración</span>
                  </Group>
                ),
              },
              {
                value: "builder",
                label: "Planificación",
              },
            ]}
          />
        )}
      </Box>

      {/* Body */}
      {isMobile ? (
        <Box style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Box
            style={{
              flex: 1,
              overflow: "auto",
              display: mobileTab === "config" ? "block" : "none",
            }}
          >
            <Box p="md">{sidebarContent}</Box>
          </Box>
          <Box
            style={{
              flex: 1,
              overflow: "auto",
              display: mobileTab === "builder" ? "block" : "none",
            }}
          >
            <Box p="sm">{mainContent}</Box>
          </Box>
        </Box>
      ) : (
        <Box style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <Box
            style={{
              width: 340,
              flexShrink: 0,
              borderRight: "1px solid var(--nv-border)",
              backgroundColor: "var(--nv-paper-bg)",
              overflow: "auto",
            }}
          >
            <Box p="md">{sidebarContent}</Box>
          </Box>
          <Box style={{ flex: 1, overflow: "auto" }}>
            <Box p="lg" style={{ maxWidth: 960, margin: "0 auto" }}>
              {mainContent}
            </Box>
          </Box>
        </Box>
      )}

      {/* Mobile fixed bottom save bar */}
      {isMobile && (
        <Box
          p="sm"
          style={{
            borderTop: "1px solid var(--nv-border)",
            backgroundColor: "var(--nv-paper-bg)",
            flexShrink: 0,
          }}
        >
          <Button
            fullWidth
            loading={isSaving}
            onClick={onSave}
            radius="xl"
            size="md"
            style={{ backgroundColor: "var(--nv-primary)", minHeight: 44 }}
          >
            {saveLabel}
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
