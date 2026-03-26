import { Box, Paper, Stack, Text, ThemeIcon, Center } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconLayoutSidebar } from "@tabler/icons-react";
import { type ReactNode } from "react";

interface MasterDetailLayoutProps {
  master: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  emptyMessage?: string;
}

export function MasterDetailLayout({
  master,
  detail,
  hasSelection,
  emptyMessage = "Selecciona un día en el menú lateral para ver los detalles",
}: MasterDetailLayoutProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!isDesktop) {
    return <>{master}</>;
  }

  return (
    <Box
      style={{
        display: "flex",
        gap: "var(--mantine-spacing-lg)",
        alignItems: "flex-start",
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <Box style={{ width: 360, flexShrink: 0 }}>
        <Stack gap="sm">{master}</Stack>
      </Box>

      <Paper
        shadow="sm"
        radius="lg"
        withBorder
        p="lg"
        style={{
          flex: 1,
          minHeight: 500,
          position: "sticky",
          top: 80,
          maxHeight: "calc(100vh - 100px)",
          overflowY: "auto",
        }}
      >
        {hasSelection ? (
          detail
        ) : (
          <Center h={400}>
            <Stack align="center" gap="md">
              <ThemeIcon size={64} variant="light" color="gray" radius="xl">
                <IconLayoutSidebar size={32} />
              </ThemeIcon>
              <Text c="dimmed" ta="center" maw={280}>
                {emptyMessage}
              </Text>
            </Stack>
          </Center>
        )}
      </Paper>
    </Box>
  );
}
