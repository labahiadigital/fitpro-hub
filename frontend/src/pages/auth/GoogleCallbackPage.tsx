import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Loader, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

/**
 * PÃ¡gina de callback para OAuth de Google Calendar.
 * Recibe el cÃ³digo de autorizaciÃ³n y lo intercambia por tokens.
 */
export function GoogleCallbackPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(t("auth.conectandoGoogleCalendar"));
  
  // Ref para evitar doble ejecuciÃ³n en StrictMode
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Evitar procesar mÃºltiples veces
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      // Usuario cancelÃ³ o hubo error de Google
      navigate("/settings?tab=integrations&google=error", { replace: true });
      return;
    }

    if (code) {
      setMessage(t("auth.verificandoAutorizacion"));
      
      // Llamar directamente a la API sin usar el hook
      api.post("/google-calendar/callback", { code })
        .then(() => {
          setMessage(t("auth.conectadoCorrectamente"));
          setTimeout(() => {
            navigate("/settings?tab=integrations&google=success", { replace: true });
          }, 500);
        })
        .catch((err) => {
          console.error("Error en callback:", err);
          const errorMsg = err?.response?.data?.detail || "";
          if (errorMsg.includes("invalid_grant") || errorMsg.includes("expired")) {
            // CÃ³digo expirado o ya usado - redirigir sin error
            navigate("/settings?tab=integrations", { replace: true });
          } else {
            navigate("/settings?tab=integrations&google=error", { replace: true });
          }
        });
    } else {
      // No hay cÃ³digo, redirigir a settings
      navigate("/settings?tab=integrations", { replace: true });
    }
  }, []);

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
      }}
    >
      <Loader size="lg" />
      <Text c="dimmed">{message}</Text>
    </Box>
  );
}
