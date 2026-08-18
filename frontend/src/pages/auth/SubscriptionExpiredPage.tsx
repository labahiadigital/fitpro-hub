import { Button, Center, Container, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconLockOff } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth";

export default function SubscriptionExpiredPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Container size="xs" py={80}>
      <Center>
        <Stack align="center" gap="lg">
          <ThemeIcon size={80} radius="xl" variant="light" color="red">
            <IconLockOff size={40} />
          </ThemeIcon>

          <Text fw={700} size="xl" ta="center">
            Tu suscripción ha expirado
          </Text>

          <Text c="dimmed" ta="center" size="md" maw={400}>
            Tu acceso a la plataforma ha sido suspendido porque tu suscripción
            ha finalizado. Contacta con tu entrenador para renovarla y seguir
            disfrutando de todos los servicios.
          </Text>

          <Button variant="outline" color="gray" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </Stack>
      </Center>
    </Container>
  );
}
