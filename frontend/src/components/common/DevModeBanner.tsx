import { Box, Group, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

/**
 * Detección "positiva" del entorno DEV. Si NINGUNA señal positiva coincide,
 * por seguridad asumimos producción y no mostramos el banner. Esto evita
 * que un fallo de env vars en prod active accidentalmente el aviso.
 *
 * Señales:
 *   1. VITE_APP_ENV === 'development'  (set en Build Args dev)
 *   2. hostname empieza por preapp/preapi/dev. (subdominios pre)
 *   3. hostname es localhost / 127.x.x.x (desarrollo local)
 */
function detectDevMode(): boolean {
  const env = (import.meta.env.VITE_APP_ENV || "").toLowerCase();
  if (env === "development" || env === "dev" || env === "staging" || env === "pre") {
    return true;
  }

  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host.startsWith("127.")) return true;
  if (host.startsWith("preapp") || host.startsWith("preapi") || host.startsWith("dev.")) return true;

  return false;
}

const IS_DEV_ENV = detectDevMode();

/**
 * Banner sticky que avisa de que estamos en un entorno NO productivo.
 * Sólo se renderiza si `detectDevMode()` devuelve true.
 *
 * Se monta en DashboardLayout y AuthLayout, encima del header.
 */
export function DevModeBanner() {
  if (!IS_DEV_ENV) return null;

  return (
    <Box
      role="status"
      aria-label="Entorno de desarrollo"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        width: "100%",
        background:
          "repeating-linear-gradient(135deg, #f59e0b 0 14px, #fbbf24 14px 28px)",
        color: "#1a1a1a",
        padding: "6px 16px",
        borderBottom: "2px solid rgba(0, 0, 0, 0.18)",
        boxShadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
      }}
    >
      <Group gap="xs" justify="center" wrap="nowrap">
        <IconAlertTriangle size={16} stroke={2.4} />
        <Text size="sm" fw={800} style={{ letterSpacing: "0.18em" }}>
          DEV_MODE
        </Text>
        <Text size="xs" fw={600} visibleFrom="sm" style={{ opacity: 0.8 }}>
          · Entorno de desarrollo · No usar con datos reales
        </Text>
      </Group>
    </Box>
  );
}
