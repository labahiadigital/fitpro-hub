import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  ScrollArea,
  Stack,
  Text,
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
  return (
    <Box className="premium-card" style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 280 }}>
      <Box p="md" pb="sm">
        <Group justify="space-between">
           <Text className="stat-label">Agenda de Hoy</Text>
           <ActionIcon variant="subtle" color="gray" size="xs" onClick={onViewAll}>
              <IconChevronRight size={14} />
           </ActionIcon>
        </Group>
      </Box>

      <ScrollArea flex={1} px="sm" pb="sm">
         <Stack gap={6}>
            {sessions.map((session) => (
               <Box 
                  key={session.id}
                  p="xs"
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
                  
                  <Group pl="xs" align="flex-start" wrap="nowrap" gap="xs">
                     <Box style={{ minWidth: 40 }}>
                        <Text fw={700} size="xs">{dayjs(session.startTime).format("HH:mm")}</Text>
                        <Text size="xs" c="dimmed">{dayjs(session.endTime).format("HH:mm")}</Text>
                     </Box>
                     
                     <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} size="xs" lineClamp={1} style={{ color: "var(--nv-dark)" }}>{session.title}</Text>
                        <Group gap={4} mt={2}>
                           <Avatar size={14} radius="xl" src={session.clientAvatar}>
                              {session.clientName.charAt(0)}
                           </Avatar>
                           <Text size="xs" c="dimmed" lineClamp={1}>{session.clientName}</Text>
                        </Group>
                        
                        <Group gap={4} mt={4}>
                           <Box className="pill-badge" style={{ backgroundColor: "var(--nv-surface-subtle)", color: "var(--nv-slate)", padding: "1px 6px", fontSize: "9px" }}>
                              {session.modality === "online" ? <IconVideo size={8} style={{marginRight:2}} /> : <IconMapPin size={8} style={{marginRight:2}} />}
                              {session.modality === "online" ? "Online" : "Presencial"}
                           </Box>
                        </Group>
                     </Box>
                  </Group>
               </Box>
            ))}
         </Stack>
      </ScrollArea>
    </Box>
  );
}
