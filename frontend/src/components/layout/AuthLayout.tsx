import { Box, Container, Group, Paper, Text } from "@mantine/core";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <Container size="xs" w="100%">
        {/* Logo */}
        <Group justify="center" mb="xl">
          <Box
            h={60}
            style={{
              background: "linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(45, 106, 79, 0.3)",
            }}
            w={60}
          >
            <Text c="white" fw={700} size="xl">
              T
            </Text>
          </Box>
        </Group>

        <Text c="white" fw={700} mb={4} size="xl" ta="center">
          Trackfiz
        </Text>
        <Text c="gray.4" mb="xl" size="sm" ta="center">
          CRM/ERP/LMS todo-en-uno para profesionales del fitness y bienestar
        </Text>

        <Paper
          p="xl"
          radius="lg"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
          withBorder
        >
          <Outlet />
        </Paper>

        <Text c="gray.5" mt="xl" size="xs" ta="center">
          © 2026 Trackfiz by E13 Fitness. Todos los derechos reservados.
        </Text>
      </Container>
    </Box>
  );
}
