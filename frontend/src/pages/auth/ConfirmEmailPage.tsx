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
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconMail,
  IconLogin,
  IconRefresh,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { authApi } from "../../services/api";

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "resend">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const token = searchParams.get("token");
  const type = searchParams.get("type") || "signup";

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("Token de confirmación no válido o faltante.");
        return;
      }

      try {
        // Call our backend to verify the token
        const response = await authApi.verifyEmail(token);

        if (response.data.success) {
          setStatus("success");
          notifications.show({
            title: "¡Email confirmado!",
            message: "Tu cuenta ha sido verificada correctamente.",
            color: "green",
            icon: <IconCheck size={18} />,
          });
        } else {
          throw new Error(response.data.message || "Error al verificar el email");
        }
      } catch (error) {
        console.error("Error confirming email:", error);
        setStatus("error");
        
        // Extract error message from response
        const err = error as { response?: { data?: { detail?: string } }; message?: string };
        const message = err.response?.data?.detail || err.message || "Ha ocurrido un error al verificar tu email.";
        
        // Check if it's an expired token
        if (message.includes("expirado")) {
          setErrorMessage("El enlace de verificación ha expirado. Solicita uno nuevo.");
        } else {
          setErrorMessage(message);
        }
      }
    };

    confirmEmail();
  }, [token, type]);

  const handleResendVerification = async () => {
    if (!resendEmail || !/^\S+@\S+$/.test(resendEmail)) {
      notifications.show({
        title: "Error",
        message: "Por favor, introduce un email válido",
        color: "red",
      });
      return;
    }

    setResendLoading(true);
    try {
      const response = await authApi.resendVerification(resendEmail);
      
      notifications.show({
        title: "Email enviado",
        message: response.data.message || "Si el email está registrado, recibirás un enlace de verificación.",
        color: "green",
      });
      
      setStatus("resend");
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al enviar el email de verificación",
        color: "red",
      });
    } finally {
      setResendLoading(false);
    }
  };

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
                <Text c="gray.5" size="sm" ta="center">
                  ¿Necesitas un nuevo enlace de verificación?
                </Text>
                
                <TextInput
                  placeholder="tu@email.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  leftSection={<IconMail size={16} />}
                  styles={{
                    input: {
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "white",
                      "&::placeholder": {
                        color: "rgba(255, 255, 255, 0.4)",
                      },
                    },
                  }}
                />

                <Button
                  fullWidth
                  leftSection={<IconRefresh size={18} />}
                  onClick={handleResendVerification}
                  loading={resendLoading}
                  variant="gradient"
                  gradient={{ from: "#2D6A4F", to: "#40916C" }}
                >
                  Enviar nuevo enlace
                </Button>

                <Button
                  fullWidth
                  variant="outline"
                  leftSection={<IconLogin size={18} />}
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

          {status === "resend" && (
            <Stack align="center" gap="md">
              <ThemeIcon
                size={80}
                radius="xl"
                variant="gradient"
                gradient={{ from: "#2D6A4F", to: "#52B788" }}
              >
                <IconMail size={40} stroke={2} />
              </ThemeIcon>

              <Text c="white" size="lg" fw={500} ta="center">
                ¡Email enviado!
              </Text>

              <Text c="gray.5" size="sm" ta="center">
                Hemos enviado un nuevo enlace de verificación a tu email. 
                Revisa tu bandeja de entrada (y la carpeta de spam).
              </Text>

              <Button
                fullWidth
                variant="outline"
                leftSection={<IconLogin size={18} />}
                onClick={() => navigate("/login")}
                style={{
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  marginTop: 10,
                }}
              >
                Volver al inicio de sesión
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
