import { Box, Modal, ScrollArea, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { type ReactNode, useEffect } from "react";

interface NativeBottomSheetProps {
  opened: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function NativeBottomSheet({ opened, onClose, title, subtitle, children, footer }: NativeBottomSheetProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (opened && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [opened, isMobile]);

  if (!opened) return null;

  if (!isMobile) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Box>
            {title && <Text fw={700} size="md">{title}</Text>}
            {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
          </Box>
        }
        size="md"
        radius="lg"
        centered
        styles={{
          body: { padding: 0 },
          header: { borderBottom: "1px solid var(--mantine-color-gray-2)", padding: "12px 20px" },
        }}
      >
        <ScrollArea mah="60vh" px="md" py="md">
          {children}
        </ScrollArea>
        {footer && (
          <Box p="md" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
            {footer}
          </Box>
        )}
      </Modal>
    );
  }

  return (
    <>
      <Box
        pos="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        onClick={onClose}
        style={{
          zIndex: 300,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          animation: "nbsFadeIn 0.2s ease",
        }}
      />

      <Box
        pos="fixed"
        left={0}
        right={0}
        bottom={0}
        style={{
          zIndex: 301,
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.12)",
          animation: "nbsSlideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <style>{`
          @keyframes nbsFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes nbsSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        `}</style>

        <Box style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <Box style={{ width: 48, height: 5, borderRadius: 3, background: "var(--mantine-color-gray-3)" }} />
        </Box>

        {(title || subtitle) && (
          <Box px="md" pb="sm" style={{ flexShrink: 0, borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
            <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box>
                {title && <Text fw={700} size="md">{title}</Text>}
                {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
              </Box>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--mantine-color-gray-1)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <IconX size={16} color="var(--mantine-color-gray-6)" />
              </button>
            </Box>
          </Box>
        )}

        <Box style={{ flex: 1, overflowY: "auto" }} px="md" py="md">
          {children}
        </Box>

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
    </>
  );
}
