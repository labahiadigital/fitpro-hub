import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Center,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCheck, IconX, IconUserPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { usersApi } from "../../services/api";
import {
  PasswordRulesIndicator,
  passwordValidator,
} from "../../components/common/PasswordRulesIndicator";

type PageState = "loading" | "form" | "success" | "error";

export function AcceptStaffInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    workspace_name: string;
    role: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { full_name: "", password: "", password_confirm: "" },
    validate: {
      full_name: (v) => (v.trim().length < 2 ? "Nombre demasiado corto" : null),
      password: passwordValidator,
      password_confirm: (v, values) =>
        v !== values.password ? "Las contraseÃ±as no coinciden" : null,
    },
  });

  useEffect(() => {
    if (!token) {
      setErrorMessage("Enlace de invitaciÃ³n invÃ¡lido.");
      setPageState("error");
      return;
    }

    usersApi
      .validateInvite(token)
      .then((res) => {
        setInviteInfo(res.data);
        setPageState("form");
      })
      .catch((err) => {
        setErrorMessage(
          err.response?.data?.detail || "InvitaciÃ³n no encontrada o expirada."
        );
        setPageState("error");
      });
  }, [token]);

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitting(true);
    try {
      await usersApi.acceptInvite({
        token,
        full_name: values.full_name,
        password: values.password,
      });
      setPageState("success");
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message:
          err.response?.data?.detail || "No se pudo completar el registro",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = (r?: string) => {
    const map: Record<string, string> = {
      owner: "Propietario",
      collaborator: "Colaborador",
      client: "Cliente",
    };
    return map[r || ""] || r || "Miembro";
  };

  return (
    <Center
      mih="100vh"
      style={{
        background:
          "linear-gradient(135deg, #f0fdf4 0%, #e0f2f1 50%, #f0fdf4 100%)",
      }}
    >
      <Paper
        shadow="xl"
        radius="xl"
        p="xl"
        w={420}
        style={{ border: "1px solid #e2e8f0" }}
      >
        {pageState === "loading" && (
          <Stack align="center" gap="md" py="xl">
            <Loader color="teal" />
            <Text c="dimmed">Verificando invitaciÃ³n...</Text>
          </Stack>
        )}

        {pageState === "error" && (
          <Stack align="center" gap="md">
            <ThemeIcon size={60} radius="xl" color="red" variant="light">
              <IconX size={30} />
            </ThemeIcon>
            <Title order={3} ta="center">
              InvitaciÃ³n invÃ¡lida
            </Title>
            <Text c="dimmed" ta="center" size="sm">
              {errorMessage}
            </Text>
            <Button
              variant="light"
              color="teal"
              radius="xl"
              onClick={() => navigate("/login")}
            >
              Ir a Iniciar SesiÃ³n
            </Button>
          </Stack>
        )}

        {pageState === "form" && inviteInfo && (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Box ta="center">
                <ThemeIcon
                  size={60}
                  radius="xl"
                  color="teal"
                  variant="light"
                  mb="sm"
                >
                  <IconUserPlus size={30} />
                </ThemeIcon>
                <Title order={3}>Ãšnete al equipo</Title>
                <Text c="dimmed" size="sm" mt={4}>
                  Has sido invitado a{" "}
                  <Text span fw={600} c="teal">
                    {inviteInfo.workspace_name}
                  </Text>{" "}
                  como{" "}
                  <Text span fw={600}>
                    {roleLabel(inviteInfo.role)}
                  </Text>
                </Text>
              </Box>

              <TextInput
                label="Email"
                value={inviteInfo.email}
                disabled
                radius="md"
              />

              <TextInput
                label="Nombre completo"
                placeholder="Tu nombre y apellidos"
                radius="md"
                {...form.getInputProps("full_name")}
              />

              <Box>
                <PasswordInput
                  label="ContraseÃ±a"
                  placeholder="MÃ­nimo 8 caracteres"
                  radius="md"
                  {...form.getInputProps("password")}
                />
                <PasswordRulesIndicator value={form.values.password} />
              </Box>

              <PasswordInput
                label="Confirmar contraseÃ±a"
                placeholder="Repite tu contraseÃ±a"
                radius="md"
                {...form.getInputProps("password_confirm")}
              />

              <Button
                type="submit"
                fullWidth
                radius="xl"
                loading={submitting}
                style={{ backgroundColor: "var(--mantine-color-teal-7)" }}
              >
                Activar mi cuenta
              </Button>
            </Stack>
          </form>
        )}

        {pageState === "success" && (
          <Stack align="center" gap="md">
            <ThemeIcon size={60} radius="xl" color="green" variant="light">
              <IconCheck size={30} />
            </ThemeIcon>
            <Title order={3} ta="center">
              Â¡Cuenta activada!
            </Title>
            <Text c="dimmed" ta="center" size="sm">
              Tu cuenta ha sido creada correctamente. Ya puedes iniciar sesiÃ³n.
            </Text>
            <Button
              fullWidth
              radius="xl"
              onClick={() => navigate("/login")}
              style={{ backgroundColor: "var(--mantine-color-teal-7)" }}
            >
              Iniciar sesiÃ³n
            </Button>
          </Stack>
        )}
      </Paper>
    </Center>
  );
}
