import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("error loading dynamically imported module")
  );
}

const RELOAD_KEY = "trackfiz-chunk-reload";

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);

    if (isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem(RELOAD_KEY);
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10_000) {
        sessionStorage.setItem(RELOAD_KEY, String(now));
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunk = this.state.error && isChunkLoadError(this.state.error);

      return (
        <Center h="60vh">
          <Stack align="center" gap="md" maw={600}>
            <IconAlertTriangle size={48} color="var(--nv-warning)" stroke={1.5} />
            <Title order={3}>
              {isChunk ? "Nueva versión disponible" : "Algo salió mal"}
            </Title>
            <Text c="dimmed" ta="center" size="sm">
              {isChunk
                ? "Se ha publicado una actualización. Recarga la página para continuar."
                : "Ha ocurrido un error inesperado. Puedes intentar recargar la sección o volver al inicio."}
            </Text>
            {!isChunk && this.state.error && (
              <Text size="xs" c="red" ta="center" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto", background: "#fff0f0", padding: 12, borderRadius: 8, width: "100%" }}>
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack?.split("\n").slice(0, 8).join("\n")}
              </Text>
            )}
            <Button
              variant="light"
              onClick={() => {
                if (isChunk) {
                  window.location.reload();
                } else {
                  this.handleReset();
                }
              }}
            >
              {isChunk ? "Recargar página" : "Reintentar"}
            </Button>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
