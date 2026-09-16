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
import { useTranslation } from "react-i18next";

export function ConfirmEmailPage() {
  const { t } = useTranslation();
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
        setErrorMessage(t("auth.tokenInvalido"));
        return;
      }

      try {
        // Call our backend to verify the token
        const response = await authApi.verifyEmail(token);

        if (response.data.success) {
          setStatus("success");
          notifications.show({
            title: t("auth.emailConfirmado"),
            message: t("auth.tuCuentaHaSidoVerificada"),
            color: "green",
            icon: <IconCheck size={18} />,
          });
        } else {
          throw new Error(response.data.message || t("auth.errorVerificarEmail"));
        }
      } catch (error) {
        console.error("Error confirming email:", error);
        setStatus("error");
        
        // Extract error message from response
        const err = error as { response?: { data?: { detail?: string } }; message?: string };
        const message = err.response?.data?.detail || err.message || t("auth.errorVerificarEmail");
        
        // Check if it's an expired token
        if (message.includes("expirado")) {
          setErrorMessage(t("auth.enlaceExpirado"));
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
        title: t("auth.error"),
        message: t("auth.porFavorIntroduceUnEmail"),
        color: "red",
      });
      return;
    }

    setResendLoading(true);
    try {
      const response = await authApi.resendVerification(resendEmail);
      
      notifications.show({
        title: t("auth.emailEnviado"),
        message: response.data.message || t("auth.siEmailRegistrado"),
        color: "green",
      });
      
      setStatus("resend");
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      notifications.show({
        title: t("auth.error"),
        message: err.response?.data?.detail || t("auth.errorEnviarVerificacion"),
        color: "red",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case "signup":
        return t("auth.confirmacionCuenta");
      case "recovery":
        return t("auth.restablecerContrasena");
      case "magiclink":
        return t("auth.accesoTuCuenta");
      case "email_change":
        return t("auth.cambioDeEmail");
      default:
        return t("auth.verificacion");
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
              background: "linear-gradient(135deg, var(--nv-primary) 0%, var(--nv-accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {t("auth.trackfiz")}
          </Title>

          <Title order={3} c="white" ta="center">
            {getTitle()}
          </Title>

          {status === "loading" && (
            <Center py="xl">
              <Stack align="center" gap="md">
                <Loader color="green" size="lg" />
                <Text c="gray.5">{t("auth.verificandoTuEmail")}</Text>
              </Stack>
            </Center>
          )}

          {status === "success" && (
            <Stack align="center" gap="md">
              <ThemeIcon
                size={80}
                radius="xl"
                variant="gradient"
                gradient={{ from: "primary", to: "accent" }}
              >
                <IconCheck size={40} stroke={2} />
              </ThemeIcon>

              <Text c="white" size="lg" fw={500} ta="center">
                {t("auth.emailVerificado")}
              </Text>

              <Text c="gray.5" size="sm" ta="center">
                {type === "signup" 
                  ? t("auth.cuentaListaIniciarSesion")
                  : type === "recovery"
                  ? t("auth.ahoraPuedesCrearContrasena")
                  : t("auth.verificacionCompletada")
                }
              </Text>

              <Button
                fullWidth
                size="lg"
                leftSection={<IconLogin size={18} />}
                onClick={() => navigate("/login")}
                style={{
                  background: "linear-gradient(135deg, var(--nv-primary) 0%, var(--nv-accent) 100%)",
                  marginTop: 10,
                }}
              >
                {t("auth.irAIniciarSesiN")}
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
                {t("auth.noSePudoVerificar")}
              </Text>

              <Text c="gray.5" size="sm" ta="center">
                {errorMessage}
              </Text>

              <Stack w="100%" gap="sm" mt="md">
                <Text c="gray.5" size="sm" ta="center">
                  {t("auth.necesitasNuevoEnlace")}
                </Text>
                
                <TextInput
                  placeholder={t("auth.tuEmailCom")}
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
                  gradient={{ from: "primary", to: "accent" }}
                >
                  {t("auth.enviarNuevoEnlace")}
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
                  {t("auth.volverAlInicioDeSesi")}
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
                gradient={{ from: "primary", to: "accent" }}
              >
                <IconMail size={40} stroke={2} />
              </ThemeIcon>

              <Text c="white" size="lg" fw={500} ta="center">
                {t("auth.emailEnviadoExcl")}
              </Text>

              <Text c="gray.5" size="sm" ta="center">
                {t("auth.hemosEnviadoUnNuevoEnlace")}
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
                {t("auth.volverAlInicioDeSesi")}
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
