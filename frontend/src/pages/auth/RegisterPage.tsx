import {
  Anchor,
  Button,
  Checkbox,
  Divider,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBuilding,
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

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Text fw={600} size="lg" ta="center">
          Crea tu cuenta
        </Text>
        <Text c="dimmed" mb="md" size="sm" ta="center">
          Empieza a gestionar tu negocio fitness
        </Text>

        <TextInput
          label="Nombre completo"
          leftSection={<IconUser size={16} />}
          placeholder="Juan García"
          required
          {...form.getInputProps("full_name")}
        />

        <TextInput
          label="Email"
          leftSection={<IconMail size={16} />}
          placeholder="tu@email.com"
          required
          {...form.getInputProps("email")}
        />

        <PasswordInput
          label="Contraseña"
          leftSection={<IconLock size={16} />}
          placeholder="Mínimo 8 caracteres"
          required
          {...form.getInputProps("password")}
        />

        <TextInput
          label="Nombre de tu negocio"
          leftSection={<IconBuilding size={16} />}
          placeholder="Mi Gimnasio"
          required
          {...form.getInputProps("workspace_name")}
        />

        <Checkbox
          label={
            <Text size="xs">
              Acepto los{" "}
              <Anchor component={Link} size="xs" to="/terms">
                términos y condiciones
              </Anchor>{" "}
              y la{" "}
              <Anchor component={Link} size="xs" to="/privacy">
                política de privacidad
              </Anchor>
            </Text>
          }
          {...form.getInputProps("terms", { type: "checkbox" })}
        />

        <Button fullWidth loading={loading} mt="md" type="submit">
          Crear Cuenta
        </Button>

        <Divider label="o" labelPosition="center" my="md" />

        <Text size="sm" ta="center">
          ¿Ya tienes cuenta?{" "}
          <Anchor component={Link} fw={500} to="/login">
            Inicia sesión
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}
