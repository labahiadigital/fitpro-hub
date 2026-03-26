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

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Center h="60vh">
          <Stack align="center" gap="md" maw={600}>
            <IconAlertTriangle size={48} color="var(--nv-warning)" stroke={1.5} />
            <Title order={3}>Algo salió mal</Title>
            <Text c="dimmed" ta="center" size="sm">
              Ha ocurrido un error inesperado. Puedes intentar recargar la
              sección o volver al inicio.
            </Text>
            {this.state.error && (
              <Text size="xs" c="red" ta="center" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto", background: "#fff0f0", padding: 12, borderRadius: 8, width: "100%" }}>
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack?.split("\n").slice(0, 8).join("\n")}
              </Text>
            )}
            <Button variant="light" onClick={this.handleReset}>
              Reintentar
            </Button>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
