import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconAlertCircle,
  IconChevronRight,
  IconMail,
  IconLock,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthStore } from "../../stores/auth";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      remember: true,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
      password: (value) => (value.length >= 6 ? null : "Mínimo 6 caracteres"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: values.email,
          password: values.password,
        }
      );

      if (authError) throw authError;

      if (data.user && data.session) {
        setUser({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name,
          is_active: true,
        });
        setTokens(data.session.access_token, data.session.refresh_token);
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Error al iniciar sesión");
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
      transition: "all 0.2s ease",
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

  return (
    <Stack gap="lg">
      <Box ta="center">
        <Title
          order={2}
          c="white"
          fw={700}
          style={{ letterSpacing: "-0.02em" }}
        >
          Inicia sesión
        </Title>
        <Text c="gray.5" size="sm" mt={4}>
          Accede a tu cuenta de E13 Fitness
        </Text>
      </Box>

      {error && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          variant="light"
          radius="lg"
          style={{
            background: "rgba(255, 87, 87, 0.1)",
            border: "1px solid rgba(255, 87, 87, 0.2)",
          }}
        >
          <Text size="sm" c="red.4">{error}</Text>
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Email"
            placeholder="tu@email.com"
            required
            leftSection={<IconMail size={18} />}
            styles={inputStyles}
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label="Contraseña"
            placeholder="Tu contraseña"
            required
            leftSection={<IconLock size={18} />}
            styles={inputStyles}
            {...form.getInputProps("password")}
          />

          <Group justify="space-between">
            <Checkbox
              label="Recordarme"
              styles={{
                label: { color: "rgba(255, 255, 255, 0.6)", fontSize: 13 },
                input: {
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  "&:checked": {
                    background: "var(--nv-accent)",
                    borderColor: "var(--nv-accent)",
                  },
                },
              }}
              {...form.getInputProps("remember", { type: "checkbox" })}
            />
            <Anchor
              component={Link}
              size="sm"
              to="/forgot-password"
              c="var(--nv-accent)"
              style={{ fontSize: 13 }}
            >
              ¿Olvidaste tu contraseña?
            </Anchor>
          </Group>

          <Button
            fullWidth
            loading={loading}
            type="submit"
            size="lg"
            rightSection={<IconChevronRight size={18} />}
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
            Iniciar Sesión
          </Button>

          <Text c="gray.5" size="sm" ta="center" mt="md">
            ¿No tienes cuenta?{" "}
            <Anchor
              component={Link}
              fw={600}
              to="/register"
              c="var(--nv-accent)"
            >
              Regístrate
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Stack>
  );
}
