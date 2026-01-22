import {
  Box,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Button,
  TextInput,
  Avatar,
  SimpleGrid,
  Paper,
  Badge,
  Divider,
  Switch,
} from "@mantine/core";
import {
  IconCamera,
  IconMail,
  IconPhone,
  IconUser,
  IconLock,
  IconBell,
  IconPalette,
} from "@tabler/icons-react";
import { useAuthStore } from "../../stores/auth";

export function MyProfilePage() {
  const { user, currentWorkspace } = useAuthStore();

  return (
    <Box p="xl">
      <Title order={2} mb="xl">Mi Perfil</Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {/* Profile Info */}
        <Card shadow="sm" padding="xl" radius="lg" withBorder>
          <Group mb="xl">
            <Box pos="relative">
              <Avatar 
                size={100} 
                radius="xl" 
                color="yellow"
                src={user?.avatar_url}
              >
                {user?.full_name?.[0] || "U"}
              </Avatar>
              <Button
                size="xs"
                variant="filled"
                color="dark"
                radius="xl"
                pos="absolute"
                bottom={0}
                right={0}
                p={4}
              >
                <IconCamera size={14} />
              </Button>
            </Box>
            <Box>
              <Title order={3}>{user?.full_name || "Usuario"}</Title>
              <Text c="dimmed">{user?.email}</Text>
              <Badge color="yellow" variant="light" mt="xs">Cliente</Badge>
            </Box>
          </Group>

          <Stack gap="md">
            <TextInput
              label="Nombre completo"
              placeholder="Tu nombre"
              defaultValue={user?.full_name || ""}
              leftSection={<IconUser size={16} />}
            />
            <TextInput
              label="Email"
              placeholder="tu@email.com"
              defaultValue={user?.email || ""}
              leftSection={<IconMail size={16} />}
              disabled
            />
            <TextInput
              label="Teléfono"
              placeholder="+34 600 000 000"
              leftSection={<IconPhone size={16} />}
            />
            <Button color="yellow" mt="md">Guardar cambios</Button>
          </Stack>
        </Card>

        {/* Settings */}
        <Stack gap="lg">
          {/* Security */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group mb="md">
              <IconLock size={20} />
              <Text fw={600}>Seguridad</Text>
            </Group>
            <Button variant="light" fullWidth>
              Cambiar contraseña
            </Button>
          </Card>

          {/* Notifications */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group mb="md">
              <IconBell size={20} />
              <Text fw={600}>Notificaciones</Text>
            </Group>
            <Stack gap="md">
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Recordatorios de sesión</Text>
                  <Text size="xs" c="dimmed">Recibe alertas antes de tus citas</Text>
                </Box>
                <Switch defaultChecked color="yellow" />
              </Group>
              <Divider />
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Actualizaciones de plan</Text>
                  <Text size="xs" c="dimmed">Cuando tu entrenador actualice tu plan</Text>
                </Box>
                <Switch defaultChecked color="yellow" />
              </Group>
              <Divider />
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Mensajes</Text>
                  <Text size="xs" c="dimmed">Notificaciones de chat</Text>
                </Box>
                <Switch defaultChecked color="yellow" />
              </Group>
              <Divider />
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Email marketing</Text>
                  <Text size="xs" c="dimmed">Ofertas y novedades</Text>
                </Box>
                <Switch color="yellow" />
              </Group>
            </Stack>
          </Card>

          {/* Workspace Info */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group mb="md">
              <IconPalette size={20} />
              <Text fw={600}>Mi Entrenador</Text>
            </Group>
            <Paper p="md" radius="md" withBorder>
              <Group>
                <Avatar size="lg" color="yellow" radius="md">
                  {currentWorkspace?.name?.[0] || "E"}
                </Avatar>
                <Box>
                  <Text fw={600}>{currentWorkspace?.name || "E13 Fitness"}</Text>
                  <Text size="sm" c="dimmed">Cliente desde Enero 2026</Text>
                </Box>
              </Group>
            </Paper>
          </Card>
        </Stack>
      </SimpleGrid>
    </Box>
  );
}
