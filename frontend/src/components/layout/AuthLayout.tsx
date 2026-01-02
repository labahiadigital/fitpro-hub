import { Box, Container, Group, Paper, Text } from "@mantine/core";
import { IconBrandApple, IconBrandAndroid } from "@tabler/icons-react";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
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
      {/* Animated background elements */}
      <Box
        style={{
          position: "absolute",
          top: "20%",
          left: "15%",
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 6s ease-in-out infinite reverse",
        }}
      />
      <Box
        style={{
          position: "absolute",
          top: "60%",
          left: "60%",
          width: 200,
          height: 200,
          background: "radial-gradient(circle, rgba(240, 147, 251, 0.06) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(50px)",
          animation: "float 10s ease-in-out infinite",
        }}
      />

      <Container size="xs" w="100%" style={{ position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <Group justify="center" mb="lg">
          <Box
            h={56}
            w={56}
            style={{
              background: "linear-gradient(135deg, var(--nv-accent) 0%, #E8C547 100%)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(212, 175, 55, 0.25)",
            }}
          >
            <Text c="#1a1a2e" fw={800} size="xl">
              T
            </Text>
          </Box>
        </Group>

        <Text c="white" fw={700} mb={4} size="xl" ta="center" style={{ letterSpacing: "-0.02em" }}>
          Trackfiz
        </Text>
        <Text c="gray.5" mb="xl" size="sm" ta="center" style={{ lineHeight: 1.5 }}>
          CRM/ERP/LMS todo-en-uno para profesionales del fitness y bienestar
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

        {/* App badges */}
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

        <Text c="gray.6" mt="xl" size="xs" ta="center">
          © 2026 Trackfiz by E13 Fitness. Todos los derechos reservados.
        </Text>
      </Container>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </Box>
  );
}
