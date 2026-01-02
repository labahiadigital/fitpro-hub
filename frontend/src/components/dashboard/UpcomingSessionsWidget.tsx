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
    <Box className="premium-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box p="lg" pb="xs">
        <Group justify="space-between">
           <Text className="text-label">Agenda de Hoy</Text>
           <ActionIcon variant="subtle" color="gray" size="sm" onClick={onViewAll}>
              <IconChevronRight size={16} />
           </ActionIcon>
        </Group>
      </Box>

      <ScrollArea flex={1} p="xs">
         <Stack gap={8}>
            {/* Timeline Connector Line Implementation would go here for extra polish */}
            {sessions.map((session, index) => (
               <Box 
                  key={session.id}
                  p="sm"
                  style={{
                     borderRadius: "12px",
                     border: "1px solid var(--border-subtle)",
                     position: "relative",
                     overflow: "hidden"
                  }}
               >
                  {/* Status Indicator Bar */}
                  <Box 
                     style={{
                        position: "absolute",
                        left: 0, top: 0, bottom: 0, width: 4,
                        backgroundColor: session.status === "confirmed" ? "var(--nv-success)" : "var(--nv-warning)"
                     }}
                  />
                  
                  <Group pl="xs" align="flex-start" wrap="nowrap">
                     <Box style={{ minWidth: 45 }}>
                        <Text fw={700} size="sm">{dayjs(session.startTime).format("HH:mm")}</Text>
                        <Text size="xs" c="dimmed">{dayjs(session.endTime).format("HH:mm")}</Text>
                     </Box>
                     
                     <Box style={{ flex: 1 }}>
                        <Text fw={600} size="sm" lineClamp={1}>{session.title}</Text>
                        <Group gap={6} mt={2}>
                           <Avatar size={16} radius="xl" src={session.clientAvatar}>
                              {session.clientName.charAt(0)}
                           </Avatar>
                           <Text size="xs" c="dimmed">{session.clientName}</Text>
                        </Group>
                        
                        <Group gap={8} mt={6}>
                           <Box className="pill-badge" style={{ backgroundColor: "var(--nv-surface-subtle)", color: "var(--nv-slate)", padding: "2px 8px", fontSize: "10px" }}>
                              {session.modality === "online" ? <IconVideo size={10} style={{marginRight:4}} /> : <IconMapPin size={10} style={{marginRight:4}} />}
                              {session.modality === "online" ? "Zoom" : "Studio A"}
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
