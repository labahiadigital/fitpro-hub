import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Loader, Text } from "@mantine/core";
import { api } from "../../services/api";

/**
 * Página de callback para OAuth de Google Calendar.
 * Recibe el código de autorización y lo intercambia por tokens.
 */
export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Conectando con Google Calendar...");
  
  // Ref para evitar doble ejecución en StrictMode
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Evitar procesar múltiples veces
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    console.log("[GoogleCallback] code:", code ? "present" : "missing", "error:", error);

    if (error) {
      // Usuario canceló o hubo error de Google
      navigate("/settings?tab=integrations&google=error", { replace: true });
      return;
    }

    if (code) {
      setMessage("Verificando autorización...");
      
      // Llamar directamente a la API sin usar el hook
      api.post("/google-calendar/callback", { code })
        .then(() => {
          setMessage("¡Conectado correctamente!");
          setTimeout(() => {
            navigate("/settings?tab=integrations&google=success", { replace: true });
          }, 500);
        })
        .catch((err) => {
          console.error("Error en callback:", err);
          const errorMsg = err?.response?.data?.detail || "";
          if (errorMsg.includes("invalid_grant") || errorMsg.includes("expired")) {
            // Código expirado o ya usado - redirigir sin error
            navigate("/settings?tab=integrations", { replace: true });
          } else {
            navigate("/settings?tab=integrations&google=error", { replace: true });
          }
        });
    } else {
      // No hay código, redirigir a settings
      console.log("[GoogleCallback] No code found, redirecting...");
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
