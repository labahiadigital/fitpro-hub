import {
  Anchor,
  Box,
  Button,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconCheck,
  IconMail,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../services/api";

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(values.email);
      setSubmitted(true);
      notifications.show({
        title: "Email enviado",
        message: "Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.",
        color: "green",
      });
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al procesar la solicitud",
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

  if (submitted) {
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
              ¡Email enviado!
            </Text>

            <Text c="gray.5" size="sm" ta="center">
              Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.
              Revisa tu bandeja de entrada y la carpeta de spam.
            </Text>

            <Anchor
              component={Link}
              to="/login"
              c="var(--nv-accent)"
              size="sm"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <IconArrowLeft size={16} />
              Volver al inicio de sesión
            </Anchor>
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
                ¿Olvidaste tu contraseña?
              </Title>
              <Text c="gray.5" size="sm" mt={8}>
                Introduce tu email y te enviaremos instrucciones para restablecerla.
              </Text>
            </Box>

            <TextInput
              label="Email"
              placeholder="tu@email.com"
              required
              leftSection={<IconMail size={18} />}
              styles={inputStyles}
              {...form.getInputProps("email")}
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
              Enviar instrucciones
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
