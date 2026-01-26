import {
  Anchor,
  Box,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconCheck,
  IconLock,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../services/api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const token = searchParams.get("token");

  const form = useForm({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validate: {
      password: (value) => (value.length >= 8 ? null : "Mínimo 8 caracteres"),
      confirmPassword: (value, values) =>
        value === values.password ? null : "Las contraseñas no coinciden",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (!token) {
      notifications.show({
        title: "Error",
        message: "Token de recuperación no válido",
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, values.password);
      setSuccess(true);
      notifications.show({
        title: "¡Contraseña actualizada!",
        message: "Ya puedes iniciar sesión con tu nueva contraseña.",
        color: "green",
      });
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const message = err.response?.data?.detail || "Error al restablecer la contraseña";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = {
    input: {
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "white",
      borderRadius: 12,
      padding: "12px 16px",
      paddingLeft: 44,
      height: 48,
      fontSize: 14,
      "&:focus": {
        borderColor: "var(--nv-accent)",
        background: "rgba(255, 255, 255, 0.05)",
      },
      "&::placeholder": {
        color: "rgba(255, 255, 255, 0.4)",
      },
    },
    label: {
      color: "rgba(255, 255, 255, 0.7)",
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 6,
    },
    section: {
      color: "rgba(255, 255, 255, 0.4)",
    },
  };

  if (!token) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Paper
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            maxWidth: 450,
            width: "100%",
          }}
        >
          <Stack align="center" gap="lg">
            <Title
              order={1}
              style={{
                background: "linear-gradient(135deg, #2D6A4F 0%, #52B788 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              Trackfiz
            </Title>

            <Text c="white" size="lg" fw={500} ta="center">
              Enlace no válido
            </Text>

            <Text c="gray.5" size="sm" ta="center">
              El enlace de recuperación no es válido o ha expirado.
              Solicita uno nuevo.
            </Text>

            <Anchor
              component={Link}
              to="/forgot-password"
              c="var(--nv-accent)"
              size="sm"
            >
              Solicitar nuevo enlace
            </Anchor>
          </Stack>
        </Paper>
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Paper
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            maxWidth: 450,
            width: "100%",
          }}
        >
          <Stack align="center" gap="lg">
            <Title
              order={1}
              style={{
                background: "linear-gradient(135deg, #2D6A4F 0%, #52B788 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              Trackfiz
            </Title>

            <ThemeIcon
              size={80}
              radius="xl"
              variant="gradient"
              gradient={{ from: "#2D6A4F", to: "#52B788" }}
            >
              <IconCheck size={40} stroke={2} />
            </ThemeIcon>

            <Text c="white" size="lg" fw={500} ta="center">
              ¡Contraseña actualizada!
            </Text>

            <Text c="gray.5" size="sm" ta="center">
              Tu contraseña ha sido actualizada correctamente.
              Ya puedes iniciar sesión con tu nueva contraseña.
            </Text>

            <Button
              fullWidth
              size="lg"
              onClick={() => navigate("/login")}
              style={{
                background: "var(--nv-accent)",
                color: "#1a1a2e",
                fontWeight: 600,
                height: 48,
                borderRadius: 12,
              }}
            >
              Ir a Iniciar Sesión
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Paper
        p="xl"
        radius="lg"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          maxWidth: 450,
          width: "100%",
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            <Box ta="center">
              <Title
                order={1}
                style={{
                  background: "linear-gradient(135deg, #2D6A4F 0%, #52B788 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: 32,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                Trackfiz
              </Title>
              <Title order={2} c="white" fw={700}>
                Nueva contraseña
              </Title>
              <Text c="gray.5" size="sm" mt={8}>
                Introduce tu nueva contraseña
              </Text>
            </Box>

            <PasswordInput
              label="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              required
              leftSection={<IconLock size={18} />}
              styles={inputStyles}
              {...form.getInputProps("password")}
            />

            <PasswordInput
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              required
              leftSection={<IconLock size={18} />}
              styles={inputStyles}
              {...form.getInputProps("confirmPassword")}
            />

            <Button
              fullWidth
              loading={loading}
              type="submit"
              size="lg"
              style={{
                background: "var(--nv-accent)",
                color: "#1a1a2e",
                fontWeight: 600,
                height: 48,
                borderRadius: 12,
                fontSize: 15,
                boxShadow: "0 4px 16px rgba(212, 175, 55, 0.25)",
              }}
            >
              Actualizar contraseña
            </Button>

            <Anchor
              component={Link}
              to="/login"
              c="var(--nv-accent)"
              size="sm"
              ta="center"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <IconArrowLeft size={16} />
              Volver al inicio de sesión
            </Anchor>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
