import {
  Anchor,
  Box,
  Button,
  Checkbox,
  Divider,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBuilding,
  IconChevronRight,
  IconLock,
  IconMail,
  IconUser,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function RegisterPage() {
  const { register, loading } = useAuth();

  const form = useForm({
    initialValues: {
      full_name: "",
      email: "",
      password: "",
      workspace_name: "",
      terms: false,
    },
    validate: {
      full_name: (value) => (value.length < 2 ? "Nombre requerido" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
      password: (value) => (value.length < 8 ? "Mínimo 8 caracteres" : null),
      workspace_name: (value) =>
        value.length < 2 ? "Nombre del negocio requerido" : null,
      terms: (value) => (value ? null : "Debes aceptar los términos"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await register(
        values.email,
        values.password,
        values.full_name,
        values.workspace_name
      );
    } catch {
      // Error handled by useAuth hook
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
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="lg">
        <Box ta="center">
          <Title
            order={2}
            c="white"
            fw={700}
            style={{ letterSpacing: "-0.02em" }}
          >
            Crea tu cuenta
          </Title>
          <Text c="gray.5" size="sm" mt={4}>
            Empieza a gestionar tu negocio fitness
          </Text>
        </Box>

        <Stack gap="md">
          <TextInput
            label="Nombre completo"
            leftSection={<IconUser size={18} />}
            placeholder="Juan García"
            required
            styles={inputStyles}
            {...form.getInputProps("full_name")}
          />

          <TextInput
            label="Email"
            leftSection={<IconMail size={18} />}
            placeholder="tu@email.com"
            required
            styles={inputStyles}
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label="Contraseña"
            leftSection={<IconLock size={18} />}
            placeholder="Mínimo 8 caracteres"
            required
            styles={inputStyles}
            {...form.getInputProps("password")}
          />

          <TextInput
            label="Nombre de tu negocio"
            leftSection={<IconBuilding size={18} />}
            placeholder="Mi Gimnasio"
            required
            styles={inputStyles}
            {...form.getInputProps("workspace_name")}
          />

          <Checkbox
            label={
              <Text size="xs" c="gray.5">
                Acepto los{" "}
                <Anchor component={Link} size="xs" to="/terms" c="var(--nv-accent)">
                  términos y condiciones
                </Anchor>{" "}
                y la{" "}
                <Anchor component={Link} size="xs" to="/privacy" c="var(--nv-accent)">
                  política de privacidad
                </Anchor>
              </Text>
            }
            styles={{
              input: {
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                "&:checked": {
                  background: "var(--nv-accent)",
                  borderColor: "var(--nv-accent)",
                },
              },
            }}
            {...form.getInputProps("terms", { type: "checkbox" })}
          />

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
              marginTop: 8,
            }}
          >
            Crear Cuenta
          </Button>
        </Stack>

        <Divider label="o" labelPosition="center" color="rgba(255, 255, 255, 0.1)" />

        <Text size="sm" ta="center" c="gray.5">
          ¿Ya tienes cuenta?{" "}
          <Anchor component={Link} fw={600} to="/login" c="var(--nv-accent)">
            Inicia sesión
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}
