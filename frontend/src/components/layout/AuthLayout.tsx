import { Avatar, Box, Container, Group, Paper, Text } from "@mantine/core";
import { IconBrandApple, IconBrandAndroid } from "@tabler/icons-react";
import { Outlet } from "react-router-dom";
import {
  useBrandDisplayName,
  useBrandLogoUrl,
  useIsWhiteLabelHost,
} from "../../hooks/useWhiteLabelBootstrap";

export function AuthLayout() {
  const brandName = useBrandDisplayName();
  const logoUrl = useBrandLogoUrl();
  const isWhiteLabel = useIsWhiteLabelHost();

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        style={{
          position: "absolute",
          top: "20%",
          left: "15%",
          width: 300,
          height: 300,
          background: "radial-gradient(circle, color-mix(in srgb, var(--nv-accent) 20%, transparent) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <Box
        style={{
          position: "absolute",
          bottom: "20%",
          right: "15%",
          width: 250,
          height: 250,
          background: "radial-gradient(circle, color-mix(in srgb, var(--nv-primary) 25%, transparent) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 6s ease-in-out infinite reverse",
        }}
      />

      <Container size="xs" w="100%" style={{ position: "relative", zIndex: 1 }}>
        <Group justify="center" mb="lg">
          {logoUrl ? (
            <Avatar src={logoUrl} size={56} radius={16} alt={brandName} />
          ) : (
            <Box
              h={56}
              w={56}
              style={{
                background: "linear-gradient(135deg, var(--nv-accent) 0%, var(--nv-primary) 100%)",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 32px var(--nv-accent-glow)",
              }}
            >
              <Text c="#1a1a2e" fw={800} size="xl">
                {brandName.charAt(0).toUpperCase()}
              </Text>
            </Box>
          )}
        </Group>

        <Text c="white" fw={700} mb={4} size="xl" ta="center" style={{ letterSpacing: "-0.02em" }}>
          {brandName}
        </Text>
        <Text c="gray.5" mb="xl" size="sm" ta="center" style={{ lineHeight: 1.5 }}>
          {isWhiteLabel
            ? "Accede a tu espacio de entrenamiento"
            : "CRM/ERP/LMS todo-en-uno para profesionales del fitness y bienestar"}
        </Text>

        <Paper
          p="xl"
          radius="xl"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Outlet />
        </Paper>

        {!isWhiteLabel && (
          <Group justify="center" gap="xl" mt="xl" style={{ opacity: 0.5 }}>
            <Group gap="xs">
              <IconBrandApple size={16} color="white" />
              <Text size="xs" c="gray.5">iOS App</Text>
            </Group>
            <Group gap="xs">
              <IconBrandAndroid size={16} color="white" />
              <Text size="xs" c="gray.5">Android App</Text>
            </Group>
          </Group>
        )}

        <Text c="gray.6" mt="xl" size="xs" ta="center">
          {isWhiteLabel
            ? `© ${new Date().getFullYear()} ${brandName}`
            : "© 2026 Trackfiz. Todos los derechos reservados."}
        </Text>
      </Container>
    </Box>
  );
}
