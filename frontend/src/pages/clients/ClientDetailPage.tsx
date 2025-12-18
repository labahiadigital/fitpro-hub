import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Menu,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";
import {
  IconBarbell,
  IconCalendarEvent,
  IconClipboard,
  IconCreditCard,
  IconDotsVertical,
  IconEdit,
  IconHistory,
  IconMail,
  IconMessage,
  IconPhone,
  IconPlus,
  IconSalad,
  IconTrash,
  IconTrendingUp,
  IconUser,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { useClient } from "../../hooks/useClients";
import { Center, Loader } from "@mantine/core";

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  void useNavigate(); // Keep for future navigation features
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  
  // Fetch client data using hook (handles demo mode internally)
  const { data: fetchedClient, isLoading } = useClient(id || "");

  // Mock client data as fallback
  const mockClient = {
    id: id || "1",
    first_name: "María",
    last_name: "García",
    email: "maria@email.com",
    phone: "+34 600 123 456",
    avatar_url: null,
    birth_date: "1990-05-15",
    gender: "female",
    height_cm: 165,
    weight_kg: 62,
    goals: "Tonificación y mejora de resistencia cardiovascular",
    internal_notes: "Lesión antigua en rodilla derecha, evitar impacto alto",
    is_active: true,
    tags: [
      { name: "VIP", color: "#8B5CF6" },
      { name: "Presencial", color: "#2D6A4F" },
    ],
    created_at: "2023-06-15",
    consents: {
      data_processing: true,
      marketing: true,
      health_data: true,
      consent_date: "2023-06-15",
    },
  };

  const client = fetchedClient || mockClient;
  
  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // Mock stats
  const stats = {
    total_sessions: 48,
    sessions_this_month: 8,
    adherence: 92,
    mrr: 149,
    lifetime_value: 1788,
    days_as_client: 214,
  };

  // Mock activity timeline
  const activities = [
    {
      id: "1",
      type: "session",
      title: "Sesión completada",
      description: "Entrenamiento de fuerza",
      date: "2024-01-15 10:00",
    },
    {
      id: "2",
      type: "payment",
      title: "Pago recibido",
      description: "Plan Premium - Enero",
      date: "2024-01-01 06:00",
    },
    {
      id: "3",
      type: "message",
      title: "Mensaje enviado",
      description: "Recordatorio de objetivos",
      date: "2023-12-28 14:30",
    },
    {
      id: "4",
      type: "workout",
      title: "Programa asignado",
      description: "Plan Hipertrofia Q1",
      date: "2023-12-20 09:00",
    },
    {
      id: "5",
      type: "form",
      title: "Formulario completado",
      description: "Evaluación mensual",
      date: "2023-12-15 11:00",
    },
  ];

  // Mock sessions
  const sessions = [
    {
      id: "1",
      date: "2024-01-15",
      time: "10:00",
      type: "Personal Training",
      status: "completed",
      notes: "Buen progreso en sentadillas",
    },
    {
      id: "2",
      date: "2024-01-12",
      time: "10:00",
      type: "Personal Training",
      status: "completed",
      notes: "",
    },
    {
      id: "3",
      date: "2024-01-10",
      time: "10:00",
      type: "Personal Training",
      status: "completed",
      notes: "Revisión de técnica",
    },
    {
      id: "4",
      date: "2024-01-18",
      time: "10:00",
      type: "Personal Training",
      status: "confirmed",
      notes: "",
    },
  ];

  // Mock measurements
  const measurements = [
    { date: "2024-01-01", weight: 62, body_fat: 24, muscle_mass: 26 },
    { date: "2023-12-01", weight: 63, body_fat: 25, muscle_mass: 25.5 },
    { date: "2023-11-01", weight: 64, body_fat: 26, muscle_mass: 25 },
    { date: "2023-10-01", weight: 65, body_fat: 27, muscle_mass: 24.5 },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "session":
        return <IconCalendarEvent size={14} />;
      case "payment":
        return <IconCreditCard size={14} />;
      case "message":
        return <IconMessage size={14} />;
      case "workout":
        return <IconBarbell size={14} />;
      case "form":
        return <IconClipboard size={14} />;
      default:
        return <IconHistory size={14} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "session":
        return "blue";
      case "payment":
        return "green";
      case "message":
        return "violet";
      case "workout":
        return "orange";
      case "form":
        return "cyan";
      default:
        return "gray";
    }
  };

  return (
    <Container py="xl" size="xl">
      <PageHeader
        breadcrumbs={[
          { label: "Clientes", href: "/clients" },
          { label: `${client.first_name} ${client.last_name}` },
        ]}
        title=""
      />

      {/* Header con info del cliente */}
      <Paper mb="lg" p="lg" radius="lg" withBorder>
        <Group align="flex-start" justify="space-between">
          <Group>
            <Avatar color="primary" radius="xl" size={80}>
              {client.first_name.charAt(0)}
              {client.last_name.charAt(0)}
            </Avatar>
            <Box>
              <Group gap="xs" mb={4}>
                <Text fw={700} size="xl">
                  {client.first_name} {client.last_name}
                </Text>
                <Badge
                  color={client.is_active ? "green" : "gray"}
                  variant="light"
                >
                  {client.is_active ? "Activo" : "Inactivo"}
                </Badge>
                {client.tags.map((tag: { name: string; color: string }, index: number) => (
                  <Badge
                    color={tag.color}
                    key={index}
                    size="sm"
                    variant="light"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </Group>
              <Group gap="lg" mt="sm">
                <Group gap={4}>
                  <IconMail color="var(--mantine-color-gray-6)" size={14} />
                  <Text c="dimmed" size="sm">
                    {client.email}
                  </Text>
                </Group>
                <Group gap={4}>
                  <IconPhone color="var(--mantine-color-gray-6)" size={14} />
                  <Text c="dimmed" size="sm">
                    {client.phone}
                  </Text>
                </Group>
                <Group gap={4}>
                  <IconCalendarEvent
                    color="var(--mantine-color-gray-6)"
                    size={14}
                  />
                  <Text c="dimmed" size="sm">
                    Cliente desde{" "}
                    {new Date(client.created_at).toLocaleDateString("es-ES")}
                  </Text>
                </Group>
              </Group>
            </Box>
          </Group>

          <Group>
            <Button leftSection={<IconMessage size={16} />} variant="light">
              Enviar Mensaje
            </Button>
            <Button leftSection={<IconCalendarEvent size={16} />}>
              Nueva Sesión
            </Button>
            <Menu position="bottom-end" withArrow>
              <Menu.Target>
                <ActionIcon size="lg" variant="default">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={14} />}>
                  Editar cliente
                </Menu.Item>
                <Menu.Item leftSection={<IconBarbell size={14} />}>
                  Asignar programa
                </Menu.Item>
                <Menu.Item leftSection={<IconSalad size={14} />}>
                  Asignar plan nutricional
                </Menu.Item>
                <Menu.Item leftSection={<IconClipboard size={14} />}>
                  Enviar formulario
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
                  Eliminar cliente
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Paper>

      {/* KPIs del cliente */}
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} mb="lg" spacing="md">
        <Paper p="md" radius="md" ta="center" withBorder>
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            Sesiones Totales
          </Text>
          <Text fw={700} mt={4} size="xl">
            {stats.total_sessions}
          </Text>
        </Paper>
        <Paper p="md" radius="md" ta="center" withBorder>
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            Este Mes
          </Text>
          <Text fw={700} mt={4} size="xl">
            {stats.sessions_this_month}
          </Text>
        </Paper>
        <Paper p="md" radius="md" ta="center" withBorder>
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            Adherencia
          </Text>
          <Text c="green" fw={700} mt={4} size="xl">
            {stats.adherence}%
          </Text>
        </Paper>
        <Paper p="md" radius="md" ta="center" withBorder>
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            MRR
          </Text>
          <Text fw={700} mt={4} size="xl">
            €{stats.mrr}
          </Text>
        </Paper>
        <Paper p="md" radius="md" ta="center" withBorder>
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            LTV
          </Text>
          <Text fw={700} mt={4} size="xl">
            €{stats.lifetime_value}
          </Text>
        </Paper>
        <Paper p="md" radius="md" ta="center" withBorder>
          <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            Días como cliente
          </Text>
          <Text fw={700} mt={4} size="xl">
            {stats.days_as_client}
          </Text>
        </Paper>
      </SimpleGrid>

      {/* Tabs con información detallada */}
      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconUser size={14} />} value="overview">
            Resumen
          </Tabs.Tab>
          <Tabs.Tab
            leftSection={<IconCalendarEvent size={14} />}
            value="sessions"
          >
            Sesiones
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconTrendingUp size={14} />} value="progress">
            Progreso
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconBarbell size={14} />} value="programs">
            Programas
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconCreditCard size={14} />} value="payments">
            Pagos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {/* Información personal */}
            <Paper p="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={600}>Información Personal</Text>
                <ActionIcon color="gray" variant="subtle">
                  <IconEdit size={16} />
                </ActionIcon>
              </Group>

              <Stack gap="sm">
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Fecha de nacimiento
                  </Text>
                  <Text size="sm">
                    {new Date(client.birth_date).toLocaleDateString("es-ES")}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Género
                  </Text>
                  <Text size="sm">
                    {client.gender === "female" ? "Femenino" : "Masculino"}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Altura
                  </Text>
                  <Text size="sm">{client.height_cm} cm</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Peso actual
                  </Text>
                  <Text size="sm">{client.weight_kg} kg</Text>
                </Group>

                <Divider my="sm" />

                <Box>
                  <Text c="dimmed" mb={4} size="sm">
                    Objetivos
                  </Text>
                  <Text size="sm">{client.goals}</Text>
                </Box>

                <Box>
                  <Text c="dimmed" mb={4} size="sm">
                    Notas internas
                  </Text>
                  <Text c="orange" size="sm">
                    {client.internal_notes}
                  </Text>
                </Box>
              </Stack>
            </Paper>

            {/* Actividad reciente */}
            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="md">
                Actividad Reciente
              </Text>

              <Timeline
                active={activities.length}
                bulletSize={24}
                lineWidth={2}
              >
                {activities.map((activity) => (
                  <Timeline.Item
                    bullet={
                      <ThemeIcon
                        color={getActivityColor(activity.type)}
                        radius="xl"
                        size={24}
                        variant="light"
                      >
                        {getActivityIcon(activity.type)}
                      </ThemeIcon>
                    }
                    key={activity.id}
                    title={activity.title}
                  >
                    <Text c="dimmed" size="xs">
                      {activity.description}
                    </Text>
                    <Text c="dimmed" mt={4} size="xs">
                      {new Date(activity.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Paper>

            {/* Consentimientos */}
            <Paper p="lg" radius="lg" withBorder>
              <Text fw={600} mb="md">
                Consentimientos GDPR
              </Text>

              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm">Tratamiento de datos</Text>
                  <Badge
                    color={client.consents.data_processing ? "green" : "red"}
                    size="sm"
                    variant="light"
                  >
                    {client.consents.data_processing ? "Aceptado" : "Pendiente"}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Comunicaciones de marketing</Text>
                  <Badge
                    color={client.consents.marketing ? "green" : "gray"}
                    size="sm"
                    variant="light"
                  >
                    {client.consents.marketing ? "Aceptado" : "No aceptado"}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Datos de salud</Text>
                  <Badge
                    color={client.consents.health_data ? "green" : "red"}
                    size="sm"
                    variant="light"
                  >
                    {client.consents.health_data ? "Aceptado" : "Pendiente"}
                  </Badge>
                </Group>
                <Text c="dimmed" mt="sm" size="xs">
                  Consentimientos actualizados el{" "}
                  {new Date(client.consents.consent_date).toLocaleDateString(
                    "es-ES"
                  )}
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="sessions">
          <Paper radius="lg" withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Hora</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Notas</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sessions.map((session) => (
                  <Table.Tr key={session.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {new Date(session.date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{session.time}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{session.type}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          session.status === "completed" ? "green" : "blue"
                        }
                        size="sm"
                        variant="light"
                      >
                        {session.status === "completed"
                          ? "Completada"
                          : "Confirmada"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">
                        {session.notes || "-"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="progress">
          <Paper p="lg" radius="lg" withBorder>
            <Text fw={600} mb="lg">
              Evolución de Medidas
            </Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Peso (kg)</Table.Th>
                  <Table.Th>% Grasa</Table.Th>
                  <Table.Th>Masa Muscular (kg)</Table.Th>
                  <Table.Th>Variación</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {measurements.map((m, index) => {
                  const prevWeight =
                    measurements[index + 1]?.weight || m.weight;
                  const weightChange = m.weight - prevWeight;
                  return (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Text fw={500} size="sm">
                          {new Date(m.date).toLocaleDateString("es-ES", {
                            month: "long",
                            year: "numeric",
                          })}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{m.weight} kg</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{m.body_fat}%</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{m.muscle_mass} kg</Text>
                      </Table.Td>
                      <Table.Td>
                        {index < measurements.length - 1 && (
                          <Badge
                            color={weightChange <= 0 ? "green" : "red"}
                            size="sm"
                            variant="light"
                          >
                            {weightChange <= 0 ? "" : "+"}
                            {weightChange} kg
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="programs">
          <Paper p="lg" py="xl" radius="lg" ta="center" withBorder>
            <ThemeIcon
              color="gray"
              mb="md"
              radius="xl"
              size={60}
              variant="light"
            >
              <IconBarbell size={30} />
            </ThemeIcon>
            <Text fw={500}>Sin programas asignados actualmente</Text>
            <Text c="dimmed" mb="md" size="sm">
              Asigna un programa de entrenamiento para este cliente
            </Text>
            <Button leftSection={<IconPlus size={16} />}>
              Asignar Programa
            </Button>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="payments">
          <Paper p="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="lg">
              <Text fw={600}>Historial de Pagos</Text>
              <Badge color="green" variant="light">
                Plan Premium - €149/mes
              </Badge>
            </Group>

            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Concepto</Table.Th>
                  <Table.Th>Importe</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>
                    <Text size="sm">01/01/2024</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">Plan Premium - Enero 2024</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500} size="sm">
                      €149.00
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green" size="sm" variant="light">
                      Pagado
                    </Badge>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>
                    <Text size="sm">01/12/2023</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">Plan Premium - Diciembre 2023</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500} size="sm">
                      €149.00
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green" size="sm" variant="light">
                      Pagado
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
