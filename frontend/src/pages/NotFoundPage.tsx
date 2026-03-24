import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { IconError404 } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Center h="80vh">
      <Stack align="center" gap="md" maw={420}>
        <IconError404 size={64} color="var(--nv-slate-light)" stroke={1} />
        <Title order={2}>Página no encontrada</Title>
        <Text c="dimmed" ta="center" size="sm">
          La página que buscas no existe o ha sido movida.
        </Text>
        <Button
          variant="filled"
          color="var(--nv-primary)"
          onClick={() => navigate("/dashboard")}
        >
          Volver al inicio
        </Button>
      </Stack>
    </Center>
  );
}

export default NotFoundPage;
