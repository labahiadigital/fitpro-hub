import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  FileButton,
  Group,
  Image,
  Loader,
  Menu,
  Modal,
  Popover,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBrandWhatsapp,
  IconCheck,
  IconChecks,
  IconClock,
  IconDotsVertical,
  IconInfoCircle,
  IconLink,
  IconMessage,
  IconMessages,
  IconMoodSmile,
  IconPaperclip,
  IconPhone,
  IconPhoto,
  IconSearch,
  IconSend,
  IconSettings,
  IconToolsKitchen2,
  IconVideo,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import {
  type Conversation,
  type Message,
  type MessageSource,
  useConversations,
  useCreateConversation,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from "../../hooks/useChat";
import { useClients } from "../../hooks/useClients";
import { useWhatsAppStatus } from "../../hooks/useWhatsApp";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

// Message status indicator
function MessageStatus({ message }: { message: Message }) {
  if (message.direction === "inbound") return null;

  const { external_status } = message;

  if (external_status === "pending") {
    return <IconClock size={14} style={{ opacity: 0.7 }} />;
  }
  if (external_status === "sent") {
    return <IconCheck size={14} style={{ opacity: 0.7 }} />;
  }
  if (external_status === "delivered") {
    return <IconChecks size={14} style={{ opacity: 0.7 }} />;
  }
  if (external_status === "read") {
    return <IconChecks color="var(--mantine-color-blue-4)" size={14} />;
  }
  return null;
}

// Conversation list item
function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      p="md"
      style={{
        cursor: "pointer",
        backgroundColor: isSelected
          ? "var(--mantine-color-primary-0)"
          : undefined,
        borderBottom: "1px solid var(--mantine-color-gray-1)",
        transition: "background-color 0.15s ease",
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" style={{ flex: 1, overflow: "hidden" }} wrap="nowrap">
          <Box pos="relative">
            <Avatar color="primary" radius="xl">
              {conversation.client_name?.charAt(0) ||
                conversation.name?.charAt(0) ||
                "?"}
            </Avatar>
            {/* Channel indicator */}
            {conversation.whatsapp_phone && (
              <ThemeIcon
                color="green"
                radius="xl"
                size={16}
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  border: "2px solid white",
                }}
              >
                <IconBrandWhatsapp size={10} />
              </ThemeIcon>
            )}
          </Box>
          <Box style={{ flex: 1, overflow: "hidden" }}>
            <Group justify="space-between" wrap="nowrap">
              <Text
                fw={conversation.unread_count > 0 ? 600 : 500}
                size="sm"
                truncate
              >
                {conversation.client_name || conversation.name}
              </Text>
              <Text c="dimmed" size="xs">
                {conversation.last_message_at
                  ? dayjs(conversation.last_message_at).fromNow()
                  : ""}
              </Text>
            </Group>
            <Group gap="xs" justify="space-between" wrap="nowrap">
              <Group
                gap={4}
                style={{ flex: 1, overflow: "hidden" }}
                wrap="nowrap"
              >
                {/* Show source icon for last message */}
                {conversation.last_message_source === "whatsapp" && (
                  <IconBrandWhatsapp
                    color="var(--mantine-color-green-6)"
                    size={12}
                    style={{ flexShrink: 0 }}
                  />
                )}
                <Text
                  c={conversation.unread_count > 0 ? undefined : "dimmed"}
                  fw={conversation.unread_count > 0 ? 500 : 400}
                  size="xs"
                  style={{ flex: 1 }}
                  truncate
                >
                  {conversation.last_message_preview}
                </Text>
              </Group>
              {conversation.unread_count > 0 && (
                <Badge circle color="primary" size="xs">
                  {conversation.unread_count}
                </Badge>
              )}
            </Group>
          </Box>
        </Group>
      </Group>
    </Box>
  );
}

// Chat message bubble
function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  const isWhatsApp = message.source === "whatsapp";

  return (
    <Box
      style={{
        display: "flex",
        justifyContent: isOwn ? "flex-end" : "flex-start",
      }}
    >
      <Box
        maw={{ base: "85%", sm: "70%" }}
        p="sm"
        style={{
          backgroundColor: isOwn
            ? isWhatsApp
              ? "var(--mantine-color-green-6)"
              : "var(--mantine-color-primary-6)"
            : "white",
          color: isOwn ? "white" : undefined,
          borderRadius: isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        }}
      >
        {/* Source indicator for incoming messages */}
        {!isOwn && (
          <Group gap={4} mb={4}>
            {isWhatsApp ? (
              <IconBrandWhatsapp
                color="var(--mantine-color-green-6)"
                size={12}
              />
            ) : (
              <IconMessage color="var(--mantine-color-blue-6)" size={12} />
            )}
            <Text c="dimmed" size="xs">
              {isWhatsApp ? "WhatsApp" : "Plataforma"}
            </Text>
          </Group>
        )}

        {message.media_url && message.message_type === "image" && (
          <Image
            src={message.media_url}
            alt={message.content || "Imagen"}
            radius="sm"
            maw={300}
            mb={message.content ? 4 : 0}
            style={{ cursor: "pointer" }}
            onClick={() => window.open(message.media_url!, "_blank")}
          />
        )}

        {message.media_url && message.message_type !== "image" && (
          <Anchor href={message.media_url} target="_blank" size="sm" c={isOwn ? "white" : undefined} underline="always" mb={message.content ? 4 : 0}>
            {message.media_url}
          </Anchor>
        )}

        {message.content && <Text size="sm">{message.content}</Text>}

        <Group gap={4} justify="flex-end" mt={4}>
          {/* Source indicator for outgoing messages */}
          {isOwn && isWhatsApp && (
            <IconBrandWhatsapp size={12} style={{ opacity: 0.7 }} />
          )}
          <Text
            c={isOwn ? "white" : "dimmed"}
            size="xs"
            style={{ opacity: 0.7 }}
          >
            {dayjs(message.created_at).format("HH:mm")}
          </Text>
          <MessageStatus message={message} />
        </Group>
      </Box>
    </Box>
  );
}

export function ChatPage() {
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendVia, setSendVia] = useState<MessageSource>("platform");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [newChatOpened, { open: openNewChat, close: closeNewChat }] = useDisclosure(false);
  const [newChatClientId, setNewChatClientId] = useState<string | null>(null);
  const [attachMenuOpened, setAttachMenuOpened] = useState(false);
  const [urlInputOpened, setUrlInputOpened] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const isClientView = false;
  const isMobile = useMediaQuery("(max-width: 768px)");

  // WhatsApp status
  const { data: whatsappStatus } = useWhatsAppStatus();
  const isWhatsAppEnabled = whatsappStatus?.connected ?? false;

  // Queries
  const { data: conversations = [], isLoading: loadingConversations } =
    useConversations();
  const { data: messages = [], isLoading: loadingMessages } = useMessages(
    selectedConversationId
  );
  const sendMessageMutation = useSendMessage();
  const markReadMutation = useMarkConversationRead();
  const createConversationMutation = useCreateConversation();
  const { data: clientsData } = useClients({ page: 1, page_size: 100 });

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (
      selectedConversationId &&
      (selectedConversation?.unread_count ?? 0) > 0
    ) {
      markReadMutation.mutate(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Update send channel based on conversation preference
  useEffect(() => {
    if (selectedConversation) {
      // If WhatsApp is not enabled, always use platform
      if (!isWhatsAppEnabled) {
        setSendVia("platform");
      } else {
        setSendVia(selectedConversation.preferred_channel);
      }
    }
  }, [selectedConversation, isWhatsAppEnabled]);

  const handleSendMessage = () => {
    if (!(message.trim() && selectedConversationId)) return;

    sendMessageMutation.mutate({
      conversation_id: selectedConversationId,
      content: message.trim(),
      send_via: sendVia,
    });

    setMessage("");
  };

  const handleImageSelected = (file: File | null) => {
    if (!file || !selectedConversationId) return;
    setAttachMenuOpened(false);
    const reader = new FileReader();
    reader.onload = () => {
      sendMessageMutation.mutate({
        conversation_id: selectedConversationId,
        content: file.name,
        message_type: "image",
        media_url: reader.result as string,
        send_via: sendVia,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendUrl = () => {
    if (!urlValue.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate({
      conversation_id: selectedConversationId,
      content: urlValue.trim(),
      send_via: sendVia,
    });
    setUrlValue("");
    setUrlInputOpened(false);
    setAttachMenuOpened(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateConversation = async () => {
    if (!newChatClientId) return;
    const existing = conversations.find((c) => c.client_id === newChatClientId);
    if (existing) {
      setSelectedConversationId(existing.id);
      closeNewChat();
      setNewChatClientId(null);
      return;
    }
    try {
      const res = await createConversationMutation.mutateAsync({ client_id: newChatClientId });
      if (res.data?.id) {
        setSelectedConversationId(res.data.id);
      }
      closeNewChat();
      setNewChatClientId(null);
    } catch {
      // Error handled by mutation
    }
  };

  const clientOptions = (clientsData?.items || []).map((c: { id: string; first_name?: string; last_name?: string }) => ({
    value: c.id,
    label: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sin nombre",
  }));

  const filteredConversations = conversations.filter((c) =>
    (c.client_name || c.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const showConversationList = isMobile ? !selectedConversationId : true;
  const showChatArea = isMobile ? !!selectedConversationId : true;

  const handleBackToList = () => {
    setSelectedConversationId(null);
  };

  return (
    <Container h="calc(100vh - 100px)" py={isMobile ? "sm" : "xl"} fluid px={{ base: isMobile ? 0 : "md", sm: "lg", lg: "xl", xl: 48 }}>
      {!isMobile && (
        <PageHeader
          description={
            isClientView
              ? "Comunícate con tu entrenador"
              : "Comunícate con tus clientes"
          }
          title="Chat"
        />
      )}

      <Box
        h={isMobile ? "calc(100vh - 120px)" : "calc(100% - 80px)"}
        className={isMobile ? undefined : "nv-card"}
        p={0}
        style={{ overflow: "hidden", display: "flex" }}
      >
        {/* Lista de conversaciones */}
        {showConversationList && (
          <Box
            h="100%"
            style={{
              borderRight: isMobile ? "none" : "1px solid var(--nv-border)",
              width: isMobile ? "100%" : "33.33%",
              minWidth: isMobile ? undefined : 300,
              flexShrink: 0,
            }}
          >
            <Box
              p="md"
              style={{ borderBottom: "1px solid var(--nv-border)" }}
            >
              <Group gap="xs">
                <TextInput
                  flex={1}
                  leftSection={<IconSearch size={16} />}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversaciones..."
                  radius="xl"
                  styles={{
                    input: {
                      backgroundColor: "var(--nv-surface)",
                      border: "1px solid var(--nv-border)",
                    },
                  }}
                  value={searchQuery}
                />
                {!isClientView && (
                  <Tooltip label="Nueva conversación">
                    <ActionIcon
                      color="primary"
                      onClick={openNewChat}
                      radius="xl"
                      size="lg"
                      variant="filled"
                    >
                      <IconMessage size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Box>

            <ScrollArea h="calc(100% - 70px)">
              {loadingConversations ? (
                <Box p="xl" ta="center">
                  <Loader size="sm" />
                </Box>
              ) : filteredConversations.length === 0 ? (
                <Box p="xl" ta="center">
                  <Text c="dimmed" size="sm">
                    No hay conversaciones
                  </Text>
                </Box>
              ) : (
                filteredConversations.map((conv) => (
                  <ConversationItem
                    conversation={conv}
                    isSelected={selectedConversationId === conv.id}
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                  />
                ))
              )}
            </ScrollArea>
          </Box>
        )}

        {/* Área de chat */}
        {showChatArea && (
          <Box h="100%" style={{ flex: 1, minWidth: 0 }}>
            {selectedConversation ? (
              <Box
                h="100%"
                style={{ display: "flex", flexDirection: "column" }}
              >
                {/* Header del chat */}
                <Box
                  p="md"
                  style={{
                    borderBottom: "1px solid var(--nv-border)",
                    backgroundColor: "var(--nv-paper-bg)",
                  }}
                >
                  <Group justify="space-between">
                    <Group>
                      {isMobile && (
                        <ActionIcon variant="subtle" color="gray" size="lg" onClick={handleBackToList}>
                          <IconArrowLeft size={20} />
                        </ActionIcon>
                      )}
                      <Box pos="relative">
                        <Avatar color="primary" radius="xl">
                          {selectedConversation.client_name?.charAt(0) || "?"}
                        </Avatar>
                        {selectedConversation.whatsapp_phone && (
                          <ThemeIcon
                            color="green"
                            radius="xl"
                            size={16}
                            style={{
                              position: "absolute",
                              bottom: -2,
                              right: -2,
                              border: "2px solid white",
                            }}
                          >
                            <IconBrandWhatsapp size={10} />
                          </ThemeIcon>
                        )}
                      </Box>
                      <Box>
                        <Group gap="xs">
                          <Text fw={600}>
                            {selectedConversation.client_name ||
                              selectedConversation.name}
                          </Text>
                          {selectedConversation.whatsapp_phone && (
                            <Badge color="green" size="xs" variant="light">
                              {selectedConversation.whatsapp_phone}
                            </Badge>
                          )}
                        </Group>
                        <Text c="dimmed" size="xs">
                          {selectedConversation.preferred_channel === "whatsapp"
                            ? "Conectado por WhatsApp"
                            : "Chat de plataforma"}
                        </Text>
                      </Box>
                    </Group>
                    <Group gap="xs">
                      {!isMobile && (
                        <>
                          <Tooltip label="Llamar">
                            <ActionIcon
                              color="gray"
                              size="lg"
                              variant="subtle"
                              onClick={() => notifications.show({ title: "Llamar", message: "Función en desarrollo", color: "blue" })}
                            >
                              <IconPhone size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Videollamada">
                            <ActionIcon
                              color="gray"
                              size="lg"
                              variant="subtle"
                              onClick={() => notifications.show({ title: "Videollamada", message: "Función en desarrollo", color: "blue" })}
                            >
                              <IconVideo size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Información">
                            <ActionIcon
                              color="gray"
                              size="lg"
                              variant="subtle"
                              onClick={() => notifications.show({ title: "Información", message: "Función en desarrollo", color: "blue" })}
                            >
                              <IconInfoCircle size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </>
                      )}
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon color="gray" size="lg" variant="subtle">
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            onClick={() => {
                              if (selectedConversation.client_id) {
                                navigate(`/clients/${selectedConversation.client_id}`);
                              }
                            }}
                          >
                            Ver perfil del cliente
                          </Menu.Item>
                          <Menu.Item
                            onClick={() => notifications.show({ title: "Archivar", message: "Función en desarrollo", color: "blue" })}
                          >
                            Archivar conversación
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            onClick={() => notifications.show({ title: "Eliminar", message: "Función en desarrollo", color: "red" })}
                          >
                            Eliminar conversación
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Box>

                {/* Mensajes */}
                <ScrollArea
                  flex={1}
                  p="md"
                  style={{ backgroundColor: "var(--nv-surface)" }}
                  viewportRef={scrollAreaRef}
                >
                  {loadingMessages ? (
                    <Box py="xl" ta="center">
                      <Loader size="sm" />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box py="xl" ta="center">
                      <Text c="dimmed" size="sm">
                        No hay mensajes aún
                      </Text>
                      <Text c="dimmed" size="xs">
                        Envía el primer mensaje para iniciar la conversación
                      </Text>
                    </Box>
                  ) : (
                    <Stack gap="md">
                      {messages.map((msg) => (
                        <MessageBubble
                          isOwn={msg.direction === "outbound"}
                          key={msg.id}
                          message={msg}
                        />
                      ))}
                    </Stack>
                  )}
                </ScrollArea>

                {/* Input de mensaje */}
                <Box
                  p="md"
                  style={{ borderTop: "1px solid var(--nv-border)", backgroundColor: "var(--nv-paper-bg)" }}
                >
                  {/* Channel selector - only show if conversation has WhatsApp */}
                  {selectedConversation.whatsapp_phone && (
                    <Group justify="center" mb="xs">
                      {isWhatsAppEnabled ? (
                        <SegmentedControl
                          data={[
                            {
                              value: "platform",
                              label: (
                                <Group gap={4}>
                                  <IconMessage size={14} />
                                  <span>Plataforma</span>
                                </Group>
                              ),
                            },
                            {
                              value: "whatsapp",
                              label: (
                                <Group gap={4}>
                                  <IconBrandWhatsapp size={14} />
                                  <span>WhatsApp</span>
                                </Group>
                              ),
                            },
                          ]}
                          onChange={(value) => setSendVia(value as MessageSource)}
                          size="xs"
                          value={sendVia}
                          radius="xl"
                          styles={{
                            root: { backgroundColor: "var(--nv-surface)" },
                            indicator: { borderRadius: "999px" }
                          }}
                        />
                      ) : (
                        <Alert
                          color="yellow"
                          variant="light"
                          radius="lg"
                          icon={<IconAlertCircle size={16} />}
                          py={6}
                          px="sm"
                        >
                          <Group gap="xs">
                            <Text size="xs">
                              Este cliente tiene WhatsApp pero no está configurado.
                            </Text>
                            <Button
                              component={Link}
                              to="/settings?tab=whatsapp"
                              size="xs"
                              variant="subtle"
                              leftSection={<IconSettings size={12} />}
                            >
                              Configurar
                            </Button>
                          </Group>
                        </Alert>
                      )}
                    </Group>
                  )}

                  <Group gap={isMobile ? "xs" : "sm"}>
                    <Popover
                      opened={attachMenuOpened}
                      onChange={setAttachMenuOpened}
                      position="top-start"
                      shadow="md"
                      radius="lg"
                    >
                      <Popover.Target>
                        <ActionIcon
                          color="gray"
                          size="lg"
                          variant="subtle"
                          radius="xl"
                          onClick={() => setAttachMenuOpened((o) => !o)}
                        >
                          <IconPaperclip size={20} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown p="xs">
                        <Stack gap={4}>
                          <FileButton onChange={handleImageSelected} accept="image/*">
                            {(props) => (
                              <Button
                                variant="subtle"
                                color="gray"
                                leftSection={<IconPhoto size={16} />}
                                justify="flex-start"
                                size="sm"
                                {...props}
                              >
                                Imagen
                              </Button>
                            )}
                          </FileButton>

                          {urlInputOpened ? (
                            <Group gap="xs" px="xs">
                              <TextInput
                                size="xs"
                                placeholder="https://..."
                                value={urlValue}
                                onChange={(e) => setUrlValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleSendUrl(); }}
                                style={{ flex: 1 }}
                              />
                              <ActionIcon size="sm" variant="filled" color="primary" onClick={handleSendUrl} disabled={!urlValue.trim()}>
                                <IconSend size={12} />
                              </ActionIcon>
                            </Group>
                          ) : (
                            <Button
                              variant="subtle"
                              color="gray"
                              leftSection={<IconLink size={16} />}
                              justify="flex-start"
                              size="sm"
                              onClick={() => setUrlInputOpened(true)}
                            >
                              URL
                            </Button>
                          )}

                          <Divider my={4} />

                          {["Alimento", "Suplemento", "Ejercicio", "Receta"].map((item) => (
                            <Button
                              key={item}
                              variant="subtle"
                              color="gray"
                              leftSection={<IconToolsKitchen2 size={16} />}
                              justify="flex-start"
                              size="sm"
                              onClick={() => {
                                notifications.show({ title: item, message: "Próximamente: compartir alimentos desde el chat", color: "yellow" });
                                setAttachMenuOpened(false);
                              }}
                            >
                              {item}
                            </Button>
                          ))}
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>
                    <TextInput
                      flex={1}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={`Escribe un mensaje${sendVia === "whatsapp" && isWhatsAppEnabled ? " por WhatsApp" : ""}...`}
                      radius="xl"
                      styles={{
                        input: {
                          backgroundColor: "var(--nv-surface)",
                          border: "1px solid var(--nv-border)",
                        },
                      }}
                      value={message}
                    />
                    <ActionIcon color="gray" size="lg" variant="subtle" radius="xl">
                      <IconMoodSmile size={20} />
                    </ActionIcon>
                    <Tooltip
                      label={
                        sendVia === "whatsapp" && isWhatsAppEnabled
                          ? "Enviar por WhatsApp"
                          : "Enviar por plataforma"
                      }
                    >
                      <ActionIcon
                        color={sendVia === "whatsapp" && isWhatsAppEnabled ? "green" : "primary"}
                        disabled={!message.trim()}
                        loading={sendMessageMutation.isPending}
                        onClick={handleSendMessage}
                        size="lg"
                        variant="filled"
                        radius="xl"
                      >
                        <IconSend size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Box>
              </Box>
            ) : (
              <Box
                h="100%"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  backgroundColor: "var(--nv-surface)",
                }}
              >
                <ThemeIcon
                  mb="md"
                  radius="xl"
                  size={80}
                  variant="light"
                  style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}
                >
                  <IconMessages size={40} />
                </ThemeIcon>
                <Text c="dimmed" fw={500} size="lg">
                  Selecciona una conversación
                </Text>
                <Text c="dimmed" size="sm">
                  Elige un chat de la lista para empezar a conversar
                </Text>
                {!isClientView && (
                  <Text c="dimmed" mt="md" size="xs">
                    💡 Los mensajes de WhatsApp y plataforma se unifican aquí
                  </Text>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Modal opened={newChatOpened} onClose={closeNewChat} title="Nueva conversación" radius="lg">
        <Stack>
          <Select
            data={clientOptions}
            label="Selecciona un cliente"
            placeholder="Buscar cliente..."
            searchable
            value={newChatClientId}
            onChange={setNewChatClientId}
          />
          <Button
            disabled={!newChatClientId}
            loading={createConversationMutation.isPending}
            onClick={handleCreateConversation}
            fullWidth
          >
            Iniciar conversación
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
