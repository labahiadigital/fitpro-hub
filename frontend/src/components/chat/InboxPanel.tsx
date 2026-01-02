import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Collapse,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconInbox,
  IconMail,
  IconMailOpened,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useState } from "react";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

// Types
interface InboxMessage {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  content: string;
  receivedAt: string;
  isRead: boolean;
  isImportant: boolean;
  attachments?: string[];
}

// Mock data
const mockInboxMessages: InboxMessage[] = [
  {
    id: "1",
    from: "María García",
    fromEmail: "maria@email.com",
    subject: "Consulta sobre mi dieta",
    preview: "Hola, tengo una duda sobre los carbohidratos en mi plan...",
    content:
      "Hola, tengo una duda sobre los carbohidratos en mi plan. ¿Puedo sustituir el arroz por quinoa? Gracias.",
    receivedAt: "2024-01-15T10:30:00",
    isRead: false,
    isImportant: true,
  },
  {
    id: "2",
    from: "Carlos López",
    fromEmail: "carlos@email.com",
    subject: "Re: Sesión de mañana",
    preview: "Perfecto, nos vemos a las 10:00 en el gimnasio...",
    content:
      "Perfecto, nos vemos a las 10:00 en el gimnasio. Llevaré la toalla y el agua.",
    receivedAt: "2024-01-15T09:15:00",
    isRead: true,
    isImportant: false,
  },
  {
    id: "3",
    from: "Ana Martínez",
    fromEmail: "ana@email.com",
    subject: "Fotos de progreso",
    preview: "Te adjunto las fotos de este mes para que veas mi evolución...",
    content:
      "Te adjunto las fotos de este mes para que veas mi evolución. Creo que he mejorado bastante.",
    receivedAt: "2024-01-14T18:45:00",
    isRead: false,
    isImportant: false,
    attachments: ["progreso_enero.jpg", "progreso_enero_2.jpg"],
  },
];

interface InboxPanelProps {
  maxHeight?: number;
  onMessageClick?: (message: InboxMessage) => void;
}

/**
 * InboxPanel - Panel de bandeja de entrada integrado bajo el chat
 */
export function InboxPanel({ maxHeight = 300, onMessageClick }: InboxPanelProps) {
  const [opened, { toggle }] = useDisclosure(false);
  const [messages, setMessages] = useState<InboxMessage[]>(mockInboxMessages);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const markAsRead = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m))
    );
  };

  const deleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  return (
    <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
      {/* Header */}
      <Box
        p="sm"
        style={{
          backgroundColor: "var(--mantine-color-gray-0)",
          cursor: "pointer",
        }}
        onClick={toggle}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light" size="sm">
              <IconInbox size={14} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              Bandeja de Entrada
            </Text>
            {unreadCount > 0 && (
              <Badge color="red" size="sm" circle>
                {unreadCount}
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Tooltip label="Actualizar">
              <ActionIcon
                color="gray"
                variant="subtle"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Refresh messages
                }}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
            <ActionIcon color="gray" variant="subtle" size="sm">
              {opened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {/* Messages list */}
      <Collapse in={opened}>
        <Divider />
        <ScrollArea h={maxHeight}>
          {messages.length > 0 ? (
            messages.map((message) => (
              <Box
                key={message.id}
                p="sm"
                style={{
                  backgroundColor: message.isRead
                    ? undefined
                    : "var(--mantine-color-blue-0)",
                  borderBottom: "1px solid var(--mantine-color-gray-2)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  markAsRead(message.id);
                  onMessageClick?.(message);
                }}
              >
                <Group justify="space-between" wrap="nowrap" mb={4}>
                  <Group gap="xs" wrap="nowrap" style={{ flex: 1, overflow: "hidden" }}>
                    <Avatar color="primary" size="sm" radius="xl">
                      {message.from.charAt(0)}
                    </Avatar>
                    <Box style={{ flex: 1, overflow: "hidden" }}>
                      <Group gap="xs" wrap="nowrap">
                        <Text
                          fw={message.isRead ? 400 : 600}
                          size="sm"
                          truncate
                          style={{ flex: 1 }}
                        >
                          {message.from}
                        </Text>
                        {message.isImportant && (
                          <Badge color="red" size="xs" variant="light">
                            Importante
                          </Badge>
                        )}
                      </Group>
                      <Text
                        fw={message.isRead ? 400 : 600}
                        size="xs"
                        truncate
                      >
                        {message.subject}
                      </Text>
                    </Box>
                  </Group>
                  <Text c="dimmed" size="xs" style={{ flexShrink: 0 }}>
                    {dayjs(message.receivedAt).fromNow()}
                  </Text>
                </Group>

                <Text c="dimmed" size="xs" lineClamp={1} ml={36}>
                  {message.preview}
                </Text>

                {message.attachments && message.attachments.length > 0 && (
                  <Group gap={4} mt={4} ml={36}>
                    <Text c="dimmed" size="xs">
                      📎 {message.attachments.length} adjunto(s)
                    </Text>
                  </Group>
                )}

                <Group gap="xs" mt="xs" ml={36}>
                  <Tooltip label={message.isRead ? "Marcar como no leído" : "Marcar como leído"}>
                    <ActionIcon
                      color="gray"
                      variant="subtle"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === message.id ? { ...m, isRead: !m.isRead } : m
                          )
                        );
                      }}
                    >
                      {message.isRead ? (
                        <IconMailOpened size={12} />
                      ) : (
                        <IconMail size={12} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Eliminar">
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(message.id);
                      }}
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Box>
            ))
          ) : (
            <Box p="xl" ta="center">
              <ThemeIcon color="gray" size={40} variant="light" radius="xl" mb="sm">
                <IconInbox size={20} />
              </ThemeIcon>
              <Text c="dimmed" size="sm">
                No hay mensajes en la bandeja
              </Text>
            </Box>
          )}
        </ScrollArea>
      </Collapse>
    </Paper>
  );
}

export default InboxPanel;
