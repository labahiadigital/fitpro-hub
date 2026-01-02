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
}

export function UpcomingSessionsWidget({
  sessions,
  onViewAll,
}: UpcomingSessionsWidgetProps) {
  return (
    <Box className="premium-card" p="sm" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Group justify="space-between" mb="xs">
        <Text className="stat-label" style={{ fontSize: "10px" }}>Agenda de Hoy</Text>
        <ActionIcon variant="subtle" color="gray" size="xs" onClick={onViewAll}>
          <IconChevronRight size={12} />
        </ActionIcon>
      </Group>

      <Stack gap={4} style={{ flex: 1 }}>
        {sessions.map((session) => (
          <Box 
            key={session.id}
            p={6}
            style={{
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Status Indicator Bar */}
            <Box 
              style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0, width: 2,
                backgroundColor: session.status === "confirmed" ? "var(--nv-success)" : "var(--nv-warning)"
              }}
            />
            
            <Group pl={6} align="flex-start" wrap="nowrap" gap={6}>
              <Box style={{ minWidth: 32 }}>
                <Text fw={700} size="xs">{dayjs(session.startTime).format("HH:mm")}</Text>
                <Text size="10px" c="dimmed">{dayjs(session.endTime).format("HH:mm")}</Text>
              </Box>
              
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="xs" lineClamp={1} style={{ color: "var(--nv-dark)" }}>{session.title}</Text>
                <Group gap={4} mt={2}>
                  <Avatar size={12} radius="xl" src={session.clientAvatar}>
                    {session.clientName.charAt(0)}
                  </Avatar>
                  <Text size="10px" c="dimmed" lineClamp={1}>{session.clientName}</Text>
                </Group>
                
                <Box className="pill-badge" mt={3} style={{ backgroundColor: "var(--nv-surface-subtle)", color: "var(--nv-slate)", padding: "1px 5px", fontSize: "8px", display: "inline-flex", alignItems: "center" }}>
                  {session.modality === "online" ? <IconVideo size={8} style={{marginRight:2}} /> : <IconMapPin size={8} style={{marginRight:2}} />}
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
