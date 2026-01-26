import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconCheck,
  IconChecks,
  IconClock,
  IconMessage,
  IconMoodSmile,
  IconPaperclip,
  IconSend,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientPortalApi } from "../../services/api";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  source: string;
  direction: string;
  message_type: string;
  content: string | null;
  external_status: string;
  is_sent: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  trainer_name: string | null;
  trainer_avatar_url: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
}

// Message status indicator
function MessageStatus({ message }: { message: Message }) {
  // Only show status for outbound messages (from client)
  if (message.direction === "outbound") return null;

  const status = message.external_status;

  if (status === "pending") {
    return <IconClock size={14} style={{ opacity: 0.7 }} />;
  }
  if (status === "sent") {
    return <IconCheck size={14} style={{ opacity: 0.7 }} />;
  }
  if (status === "delivered") {
    return <IconChecks size={14} style={{ opacity: 0.7 }} />;
  }
  if (status === "read") {
    return <IconChecks color="var(--mantine-color-blue-4)" size={14} />;
  }
  return null;
}

// Message bubble component
function MessageBubble({ message, isFromTrainer }: { message: Message; isFromTrainer: boolean }) {
  return (
    <Box
      style={{
        display: "flex",
        justifyContent: isFromTrainer ? "flex-start" : "flex-end",
        marginBottom: 8,
      }}
    >
      <Box
        p="sm"
        style={{
          maxWidth: "70%",
          backgroundColor: isFromTrainer
            ? "var(--mantine-color-gray-1)"
            : "var(--mantine-color-yellow-1)",
          borderRadius: 12,
          borderTopLeftRadius: isFromTrainer ? 4 : 12,
          borderTopRightRadius: isFromTrainer ? 12 : 4,
        }}
      >
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {message.content}
        </Text>
        <Group gap={4} justify="flex-end" mt={4}>
          <Text size="xs" c="dimmed">
            {dayjs(message.created_at).format("HH:mm")}
          </Text>
          {!isFromTrainer && <MessageStatus message={message} />}
        </Group>
      </Box>
    </Box>
  );
}

export function MyMessagesPage() {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversation
  const { data: conversation, isLoading: convLoading } = useQuery<Conversation>({
    queryKey: ["client-conversation"],
    queryFn: async () => {
      const response = await clientPortalApi.getConversation();
      return response.data;
    },
  });

  // Fetch messages with polling
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["client-messages"],
    queryFn: async () => {
      const response = await clientPortalApi.getMessages(100);
      return response.data;
    },
    refetchInterval: 3000, // Poll every 3 seconds
    enabled: !!conversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await clientPortalApi.sendMessage(content);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-messages"] });
      setNewMessage("");
      inputRef.current?.focus();
    },
  });

  // Mark messages as read when viewing
  const markReadMutation = useMutation({
    mutationFn: async () => {
      await clientPortalApi.markMessagesRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-unread-count"] });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Mark messages as read when conversation is loaded
  useEffect(() => {
    if (conversation && conversation.unread_count > 0) {
      markReadMutation.mutate();
    }
  }, [conversation?.id]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (convLoading) {
    return (
      <Box
        h="100%"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader size="lg" color="yellow" />
      </Box>
    );
  }

  return (
    <Box
      h="calc(100vh - 60px)"
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--mantine-color-body)",
      }}
    >
      {/* Header */}
      <Box
        p="md"
        style={{
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          backgroundColor: "white",
        }}
      >
        <Group>
          <Avatar
            src={conversation?.trainer_avatar_url}
            size="md"
            radius="xl"
            color="yellow"
          >
            {conversation?.trainer_name?.charAt(0) || "E"}
          </Avatar>
          <Box>
            <Text fw={600}>{conversation?.trainer_name || "Tu Entrenador"}</Text>
            <Text size="xs" c="dimmed">
              Chat de la plataforma
            </Text>
          </Box>
        </Group>
      </Box>

      {/* Messages Area */}
      <ScrollArea
        flex={1}
        p="md"
        viewportRef={scrollRef}
        style={{ backgroundColor: "var(--mantine-color-gray-0)" }}
      >
        {messagesLoading ? (
          <Box
            h="100%"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Loader size="sm" color="yellow" />
          </Box>
        ) : messages.length === 0 ? (
          <Stack align="center" justify="center" h="100%" gap="md">
            <ThemeIcon size={60} radius="xl" variant="light" color="yellow">
              <IconMessage size={30} />
            </ThemeIcon>
            <Text c="dimmed" ta="center">
              No hay mensajes aún.
              <br />
              ¡Envía un mensaje a tu entrenador!
            </Text>
          </Stack>
        ) : (
          <>
            {/* Date separators and messages */}
            {messages.map((message, index) => {
              const currentDate = dayjs(message.created_at).format("YYYY-MM-DD");
              const prevDate =
                index > 0
                  ? dayjs(messages[index - 1].created_at).format("YYYY-MM-DD")
                  : null;
              const showDateSeparator = currentDate !== prevDate;
              
              // Direction: inbound = from trainer, outbound = from client (reversed perspective)
              const isFromTrainer = message.direction === "outbound";

              return (
                <Box key={message.id}>
                  {showDateSeparator && (
                    <Box ta="center" my="md">
                      <Text
                        size="xs"
                        c="dimmed"
                        px="sm"
                        py={4}
                        style={{
                          backgroundColor: "var(--mantine-color-gray-1)",
                          borderRadius: 12,
                          display: "inline-block",
                        }}
                      >
                        {dayjs(message.created_at).format("D [de] MMMM, YYYY")}
                      </Text>
                    </Box>
                  )}
                  <MessageBubble message={message} isFromTrainer={isFromTrainer} />
                </Box>
              );
            })}
          </>
        )}
      </ScrollArea>

      {/* Input Area */}
      <Box
        p="md"
        style={{
          borderTop: "1px solid var(--mantine-color-gray-2)",
          backgroundColor: "white",
        }}
      >
        <Group gap="sm">
          <ActionIcon variant="subtle" color="gray" size="lg" disabled>
            <IconMoodSmile size={20} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" size="lg" disabled>
            <IconPaperclip size={20} />
          </ActionIcon>
          <TextInput
            ref={inputRef}
            flex={1}
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            radius="xl"
            styles={{
              input: {
                backgroundColor: "var(--mantine-color-gray-0)",
                border: "none",
              },
            }}
          />
          <ActionIcon
            size="lg"
            radius="xl"
            color="yellow"
            variant="filled"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            loading={sendMessageMutation.isPending}
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}
