import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconAlertCircle,
  IconBarbell,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuthStore } from "../../stores/auth";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser, setTokens, loginDemoTrainer, loginDemoClient } =
    useAuthStore();

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
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoTrainer = () => {
    loginDemoTrainer();
    navigate("/dashboard");
  };

  const handleDemoClient = () => {
    loginDemoClient();
    navigate("/dashboard");
  };

  return (
    <Paper bg="transparent" p="xl" radius="md" withBorder={false}>
      <Stack gap="md">
        <Title fw={700} order={2} ta="center">
          Inicia sesión
        </Title>
        <Text c="dimmed" size="sm" ta="center">
          Accede a tu cuenta de Trackfiz
        </Text>

        {error && (
          <Alert
            color="red"
            icon={<IconAlertCircle size={16} />}
            variant="light"
          >
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="tu@email.com"
              required
              {...form.getInputProps("email")}
            />

            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              {...form.getInputProps("password")}
            />

            <Group justify="space-between">
              <Checkbox
                label="Recordarme"
                {...form.getInputProps("remember", { type: "checkbox" })}
              />
              <Anchor component={Link} size="sm" to="/forgot-password">
                ¿Olvidaste tu contraseña?
              </Anchor>
            </Group>

            <Button fullWidth loading={loading} type="submit">
              Iniciar Sesión
            </Button>

            <Divider
              label={
                <Group gap={6}>
                  <IconSparkles size={14} />
                  <Text size="xs">Prueba la demo</Text>
                </Group>
              }
              labelPosition="center"
            />

            {/* Demo buttons */}
            <Stack gap="xs">
              <Button
                color="teal"
                fullWidth
                leftSection={
                  <ThemeIcon color="teal" radius="xl" size="sm" variant="light">
                    <IconBarbell size={14} />
                  </ThemeIcon>
                }
                onClick={handleDemoTrainer}
                styles={{
                  root: {
                    height: "auto",
                    padding: "10px 16px",
                  },
                  inner: {
                    justifyContent: "flex-start",
                  },
                }}
                variant="light"
              >
                <Box>
                  <Text fw={600} size="sm">
                    Demo Entrenador
                  </Text>
                  <Text c="dimmed" size="xs">
                    Gestiona clientes, entrenamientos y pagos
                  </Text>
                </Box>
              </Button>

              <Button
                color="violet"
                fullWidth
                leftSection={
                  <ThemeIcon
                    color="violet"
                    radius="xl"
                    size="sm"
                    variant="light"
                  >
                    <IconUser size={14} />
                  </ThemeIcon>
                }
                onClick={handleDemoClient}
                styles={{
                  root: {
                    height: "auto",
                    padding: "10px 16px",
                  },
                  inner: {
                    justifyContent: "flex-start",
                  },
                }}
                variant="light"
              >
                <Box>
                  <Text fw={600} size="sm">
                    Demo Cliente
                  </Text>
                  <Text c="dimmed" size="xs">
                    Ve tus entrenamientos, progreso y más
                  </Text>
                </Box>
              </Button>
            </Stack>

            <Text c="dimmed" size="sm" ta="center">
              ¿No tienes cuenta?{" "}
              <Anchor component={Link} fw={500} to="/register">
                Regístrate
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
}
