import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Center,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconMail,
  IconLogin,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

// Supabase config - these are public keys, safe to hardcode
const SUPABASE_URL = "https://ougfmkbjrpnjvujhuuyy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Z2Zta2JqcnBuanZ1amh1dXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDM0MzcsImV4cCI6MjA4MTM3OTQzN30.MfdBfljoorNx5ekcFj1iVVOaZvPQ1Fs-tXiKLizVINk";

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";

  useEffect(() => {
    const confirmEmail = async () => {
      if (!tokenHash) {
        setStatus("error");
        setErrorMessage("Token de confirmación no válido o faltante.");
        return;
      }

      try {
        // Call Supabase to verify the token
        // The token_hash is used by Supabase to verify the email
        const response = await fetch(
          `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${type}`,
          {
            method: "GET",
            headers: {
              "apikey": SUPABASE_ANON_KEY,
            },
          }
        );

        if (response.ok || response.redirected) {
          setStatus("success");
          notifications.show({
            title: "¡Email confirmado!",
            message: "Tu cuenta ha sido verificada correctamente.",
            color: "green",
            icon: <IconCheck size={18} />,
          });
        } else {
          const data = await response.json();
          throw new Error(data.error_description || data.msg || "Error al verificar el email");
        }
      } catch (error) {
        console.error("Error confirming email:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error 
            ? error.message 
            : "Ha ocurrido un error al verificar tu email. El enlace puede haber expirado."
        );
      }
    };

    confirmEmail();
  }, [tokenHash, type]);

  const getTitle = () => {
    switch (type) {
      case "signup":
        return "Confirmación de cuenta";
      case "recovery":
        return "Restablecer contraseña";
      case "magiclink":
        return "Acceso a tu cuenta";
      case "email_change":
        return "Cambio de email";
      default:
        return "Verificación";
    }
  };

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
          {/* Logo */}
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

          <Title order={3} c="white" ta="center">
            {getTitle()}
          </Title>

          {status === "loading" && (
            <Center py="xl">
              <Stack align="center" gap="md">
                <Loader color="green" size="lg" />
                <Text c="gray.5">Verificando tu email...</Text>
              </Stack>
            </Center>
          )}

          {status === "success" && (
            <Stack align="center" gap="md">
              <ThemeIcon
                size={80}
                radius="xl"
                variant="gradient"
                gradient={{ from: "#2D6A4F", to: "#52B788" }}
              >
                <IconCheck size={40} stroke={2} />
              </ThemeIcon>

              <Text c="white" size="lg" fw={500} ta="center">
                ¡Tu email ha sido verificado!
              </Text>

              <Text c="gray.5" size="sm" ta="center">
                {type === "signup" 
                  ? "Tu cuenta está lista. Ya puedes iniciar sesión y comenzar a usar Trackfiz."
                  : type === "recovery"
                  ? "Ahora puedes crear una nueva contraseña."
                  : "La verificación se ha completado correctamente."
                }
              </Text>

              <Button
                fullWidth
                size="lg"
                leftSection={<IconLogin size={18} />}
                onClick={() => navigate("/login")}
                style={{
                  background: "linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)",
                  marginTop: 10,
                }}
              >
                Ir a Iniciar Sesión
              </Button>
            </Stack>
          )}

          {status === "error" && (
            <Stack align="center" gap="md">
              <ThemeIcon
                size={80}
                radius="xl"
                variant="gradient"
                gradient={{ from: "#e74c3c", to: "#c0392b" }}
              >
                <IconX size={40} stroke={2} />
              </ThemeIcon>

              <Text c="white" size="lg" fw={500} ta="center">
                No se pudo verificar
              </Text>

              <Text c="gray.5" size="sm" ta="center">
                {errorMessage}
              </Text>

              <Stack w="100%" gap="sm" mt="md">
                <Button
                  fullWidth
                  variant="outline"
                  leftSection={<IconMail size={18} />}
                  onClick={() => navigate("/login")}
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                  }}
                >
                  Volver al inicio de sesión
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
