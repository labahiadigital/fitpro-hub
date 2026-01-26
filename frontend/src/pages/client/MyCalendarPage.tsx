import {
  Box,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Button,
  Paper,
  ThemeIcon,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconCalendarEvent,
  IconClock,
  IconMapPin,
  IconUser,
  IconVideo,
} from "@tabler/icons-react";
import { useMyBookings } from "../../hooks/useClientPortal";

// No mock data - all data comes from backend

// Generate week days dynamically
function getWeekDays() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return days.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return {
      day,
      date: date.getDate(),
      hasSession: false, // Will be updated based on bookings
      isPast: date < today && date.toDateString() !== today.toDateString(),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

export function MyCalendarPage() {
  const { data: bookings, isLoading } = useMyBookings({ upcoming_only: true, limit: 20 });

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  // Transform API bookings to display format
  const upcomingSessions = bookings?.map(b => ({
    id: b.id,
    date: new Date(b.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }),
    time: `${new Date(b.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
    title: b.title,
    trainer: "Trackfiz",
    type: b.booking_type || "presencial",
    location: b.location || "Gimnasio",
    status: b.status,
  })) || [];

  const data = {
    upcomingSessions,
    pastSessions: [] as { id: string; title: string; date: string; time: string }[],
    weekDays: getWeekDays(),
  };

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mis Citas</Title>
          <Text c="dimmed">Tus sesiones programadas con tu entrenador</Text>
        </Box>
        <Button leftSection={<IconCalendarEvent size={16} />} color="yellow">
          Solicitar cita
        </Button>
      </Group>

      {/* Week Overview */}
      <Card shadow="sm" padding="lg" radius="lg" withBorder mb="xl">
        <Text fw={600} mb="md">Esta Semana - Enero 2026</Text>
        <Group justify="space-around">
          {data.weekDays.map((day, index) => (
            <Paper
              key={index}
              p="md"
              radius="md"
              withBorder={day.isToday}
              style={{
                background: day.isToday 
                  ? "var(--mantine-color-yellow-light)" 
                  : day.isPast 
                    ? "var(--mantine-color-gray-light)" 
                    : undefined,
                minWidth: 60,
                textAlign: "center",
              }}
            >
              <Text size="xs" c="dimmed" fw={500}>{day.day}</Text>
              <Text size="lg" fw={day.isToday ? 700 : 500}>{day.date}</Text>
              {day.hasSession && (
                <Box
                  mt={4}
                  mx="auto"
                  w={8}
                  h={8}
                  style={{
                    borderRadius: "50%",
                    background: day.isPast ? "var(--mantine-color-green-filled)" : "var(--mantine-color-yellow-filled)",
                  }}
                />
              )}
            </Paper>
          ))}
        </Group>
      </Card>

      {/* Upcoming Sessions */}
      <Title order={4} mb="md">Próximas Sesiones</Title>
      <Stack gap="md" mb="xl">
        {data.upcomingSessions.map((session) => (
          <Card key={session.id} shadow="sm" padding="lg" radius="lg" withBorder>
            <Group justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <ThemeIcon 
                  size="xl" 
                  radius="md" 
                  variant="light"
                  color={session.type === "online" ? "blue" : "yellow"}
                >
                  {session.type === "online" ? <IconVideo size={24} /> : <IconCalendarEvent size={24} />}
                </ThemeIcon>
                <Box>
                  <Group gap="xs" mb={4}>
                    <Text fw={600}>{session.title}</Text>
                    <Badge 
                      color={session.status === "confirmed" ? "green" : "yellow"} 
                      variant="light" 
                      size="sm"
                    >
                      {session.status === "confirmed" ? "Confirmada" : "Pendiente"}
                    </Badge>
                  </Group>
                  <Group gap="md">
                    <Group gap={4}>
                      <IconClock size={14} />
                      <Text size="sm" c="dimmed">{session.date} • {session.time}</Text>
                    </Group>
                  </Group>
                  <Group gap="md" mt={4}>
                    <Group gap={4}>
                      <IconUser size={14} />
                      <Text size="sm" c="dimmed">{session.trainer}</Text>
                    </Group>
                    <Group gap={4}>
                      <IconMapPin size={14} />
                      <Text size="sm" c="dimmed">{session.location}</Text>
                    </Group>
                  </Group>
                </Box>
              </Group>
              <Stack gap="xs">
                {session.type === "online" && (
                  <Button size="sm" color="blue">
                    Unirse
                  </Button>
                )}
                <Button size="sm" variant="light">
                  Ver detalles
                </Button>
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>

      {/* Past Sessions */}
      <Title order={4} mb="md">Sesiones Anteriores</Title>
      <Stack gap="sm">
        {data.pastSessions.map((session) => (
          <Card key={session.id} shadow="sm" padding="md" radius="md" withBorder style={{ opacity: 0.8 }}>
            <Group justify="space-between">
              <Group>
                <ThemeIcon size="md" radius="md" variant="light" color="green">
                  <IconCalendarEvent size={16} />
                </ThemeIcon>
                <Box>
                  <Text fw={500}>{session.title}</Text>
                  <Text size="sm" c="dimmed">{session.date} • {session.time}</Text>
                </Box>
              </Group>
              <Badge color="green" variant="light">Completada</Badge>
            </Group>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
