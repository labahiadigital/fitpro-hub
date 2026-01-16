import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconChevronRight,
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
  loading?: boolean;
}

export function UpcomingSessionsWidget({
  sessions,
  onViewAll,
  loading,
}: UpcomingSessionsWidgetProps) {
  if (loading) {
    return (
      <Box className="premium-card" p={{ base: "sm", lg: "md", xl: "lg" }} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Group justify="space-between" mb="sm">
          <Text className="stat-label">Agenda de Hoy</Text>
        </Group>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text c="dimmed" ta="center" py="md">Cargando sesiones...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box className="premium-card" p={{ base: "sm", lg: "md", xl: "lg" }} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Group justify="space-between" mb="sm">
        <Text className="stat-label">Agenda de Hoy</Text>
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={onViewAll}>
          <IconChevronRight size={14} />
        </ActionIcon>
      </Group>

      <Stack gap="xs" style={{ flex: 1 }}>
        {sessions.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl" size="sm">No hay sesiones programadas para hoy</Text>
        ) : sessions.map((session) => (
          <Box 
            key={session.id}
            p="sm"
            style={{
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Status Indicator Bar */}
            <Box 
              style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0, width: 3,
                backgroundColor: session.status === "confirmed" ? "var(--nv-success)" : "var(--nv-warning)"
              }}
            />
            
            <Group pl="sm" align="flex-start" wrap="nowrap" gap="sm">
              <Box style={{ minWidth: 40 }}>
                <Text fw={700} size="sm">{dayjs(session.startTime).format("HH:mm")}</Text>
                <Text size="xs" c="dimmed">{dayjs(session.endTime).format("HH:mm")}</Text>
              </Box>
              
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="sm" lineClamp={1} style={{ color: "var(--nv-dark)" }}>{session.title}</Text>
                <Group gap="xs" mt={4}>
                  <Avatar size={16} radius="xl" src={session.clientAvatar}>
                    {session.clientName.charAt(0)}
                  </Avatar>
                  <Text size="xs" c="dimmed" lineClamp={1}>{session.clientName}</Text>
                </Group>
                
                <Box className="pill-badge" mt={6} style={{ backgroundColor: "var(--nv-surface-subtle)", color: "var(--nv-slate)", padding: "2px 6px", fontSize: "10px", display: "inline-flex", alignItems: "center" }}>
                  {session.modality === "online" ? <IconVideo size={10} style={{marginRight:3}} /> : <IconMapPin size={10} style={{marginRight:3}} />}
                  {session.modality === "online" ? "Online" : "Presencial"}
                </Box>
              </Box>
            </Group>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
