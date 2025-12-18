import {
  ActionIcon,
  Avatar,
  Badge,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconCalendarEvent,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconVideo,
} from "@tabler/icons-react";
import dayjs from "dayjs";

interface Session {
  id: string;
  title: string;
  clientName: string;
  clientAvatar?: string;
  startTime: string;
  endTime: string;
  type: "individual" | "group";
  modality: "in_person" | "online";
  status: "confirmed" | "pending";
  location?: string;
}

interface UpcomingSessionsWidgetProps {
  sessions: Session[];
  onSessionClick?: (session: Session) => void;
  onViewAll?: () => void;
}

export function UpcomingSessionsWidget({
  sessions,
  onSessionClick,
  onViewAll,
}: UpcomingSessionsWidgetProps) {
  const today = dayjs();

  const groupedSessions = sessions.reduce(
    (acc, session) => {
      const date = dayjs(session.startTime);
      const key = date.isSame(today, "day")
        ? "Hoy"
        : date.isSame(today.add(1, "day"), "day")
          ? "Mañana"
          : date.format("dddd, D MMM");

      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    },
    {} as Record<string, Session[]>
  );

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconCalendarEvent size={20} />
          <Title order={5}>Próximas Sesiones</Title>
        </Group>
        {onViewAll && (
          <Text
            c="blue"
            onClick={onViewAll}
            size="sm"
            style={{ cursor: "pointer" }}
          >
            Ver todas
          </Text>
        )}
      </Group>

      {sessions.length === 0 ? (
        <Text c="dimmed" py="xl" size="sm" ta="center">
          No hay sesiones programadas
        </Text>
      ) : (
        <ScrollArea h={280}>
          <Stack gap="md">
            {Object.entries(groupedSessions).map(([date, dateSessions]) => (
              <div key={date}>
                <Text c="dimmed" fw={600} mb="xs" size="xs">
                  {date}
                </Text>
                <Stack gap="xs">
                  {dateSessions.map((session) => (
                    <Paper
                      key={session.id}
                      onClick={() => onSessionClick?.(session)}
                      p="sm"
                      radius="sm"
                      style={{ cursor: onSessionClick ? "pointer" : "default" }}
                      withBorder
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <Avatar
                            color="blue"
                            radius="xl"
                            size="sm"
                            src={session.clientAvatar}
                          >
                            {session.clientName.charAt(0)}
                          </Avatar>
                          <div style={{ minWidth: 0 }}>
                            <Group gap={4}>
                              <Text fw={500} size="sm" truncate>
                                {session.title}
                              </Text>
                              <Badge
                                color={
                                  session.status === "confirmed"
                                    ? "green"
                                    : "yellow"
                                }
                                size="xs"
                                variant="light"
                              >
                                {session.status === "confirmed"
                                  ? "Confirmada"
                                  : "Pendiente"}
                              </Badge>
                            </Group>
                            <Group gap="xs" mt={2}>
                              <Group gap={2}>
                                <IconClock size={12} style={{ opacity: 0.5 }} />
                                <Text c="dimmed" size="xs">
                                  {dayjs(session.startTime).format("HH:mm")} -{" "}
                                  {dayjs(session.endTime).format("HH:mm")}
                                </Text>
                              </Group>
                              <Group gap={2}>
                                {session.modality === "online" ? (
                                  <IconVideo
                                    size={12}
                                    style={{ opacity: 0.5 }}
                                  />
                                ) : (
                                  <IconMapPin
                                    size={12}
                                    style={{ opacity: 0.5 }}
                                  />
                                )}
                                <Text c="dimmed" size="xs">
                                  {session.modality === "online"
                                    ? "Online"
                                    : session.location || "Presencial"}
                                </Text>
                              </Group>
                            </Group>
                          </div>
                        </Group>
                        {onSessionClick && (
                          <ActionIcon size="sm" variant="subtle">
                            <IconChevronRight size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </div>
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Paper>
  );
}
