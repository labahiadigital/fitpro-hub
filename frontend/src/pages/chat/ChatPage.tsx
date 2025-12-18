import { useState, useRef, useEffect } from 'react'
import {
  Container,
  Grid,
  Paper,
  Group,
  TextInput,
  ActionIcon,
  Box,
  Text,
  Avatar,
  Stack,
  ScrollArea,
  Badge,
  ThemeIcon,
  Menu,
  Tooltip,
  Loader,
  SegmentedControl,
} from '@mantine/core'
import {
  IconSend,
  IconSearch,
  IconPaperclip,
  IconMoodSmile,
  IconMessages,
  IconCheck,
  IconChecks,
  IconBrandWhatsapp,
  IconMessage,
  IconDotsVertical,
  IconPhone,
  IconVideo,
  IconInfoCircle,
  IconClock,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { useAuthStore } from '../../stores/auth'
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  type Conversation,
  type Message,
  type MessageSource,
} from '../../hooks/useChat'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

// Message status indicator
function MessageStatus({ message }: { message: Message }) {
  if (message.direction === 'inbound') return null
  
  const { external_status } = message
  
  if (external_status === 'pending') {
    return <IconClock size={14} style={{ opacity: 0.7 }} />
  }
  if (external_status === 'sent') {
    return <IconCheck size={14} style={{ opacity: 0.7 }} />
  }
  if (external_status === 'delivered') {
    return <IconChecks size={14} style={{ opacity: 0.7 }} />
  }
  if (external_status === 'read') {
    return <IconChecks size={14} color="var(--mantine-color-blue-4)" />
  }
  return null
}

// Conversation list item
function ConversationItem({ 
  conversation, 
  isSelected, 
  onClick 
}: { 
  conversation: Conversation
  isSelected: boolean
  onClick: () => void 
}) {
  return (
    <Box
      p="md"
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? 'var(--mantine-color-primary-0)' : undefined,
        borderBottom: '1px solid var(--mantine-color-gray-1)',
        transition: 'background-color 0.15s ease',
      }}
      onClick={onClick}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
          <Box pos="relative">
            <Avatar radius="xl" color="primary">
              {conversation.client_name?.charAt(0) || conversation.name?.charAt(0) || '?'}
            </Avatar>
            {/* Channel indicator */}
            {conversation.whatsapp_phone && (
              <ThemeIcon 
                size={16} 
                radius="xl" 
                color="green" 
                style={{ 
                  position: 'absolute', 
                  bottom: -2, 
                  right: -2,
                  border: '2px solid white',
                }}
              >
                <IconBrandWhatsapp size={10} />
              </ThemeIcon>
            )}
          </Box>
          <Box style={{ flex: 1, overflow: 'hidden' }}>
            <Group justify="space-between" wrap="nowrap">
              <Text fw={conversation.unread_count > 0 ? 600 : 500} size="sm" truncate>
                {conversation.client_name || conversation.name}
              </Text>
              <Text size="xs" c="dimmed">
                {conversation.last_message_at ? dayjs(conversation.last_message_at).fromNow() : ''}
              </Text>
            </Group>
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Group gap={4} wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
                {/* Show source icon for last message */}
                {conversation.last_message_source === 'whatsapp' && (
                  <IconBrandWhatsapp size={12} color="var(--mantine-color-green-6)" style={{ flexShrink: 0 }} />
                )}
                <Text
                  size="xs"
                  c={conversation.unread_count > 0 ? undefined : 'dimmed'}
                  fw={conversation.unread_count > 0 ? 500 : 400}
                  truncate
                  style={{ flex: 1 }}
                >
                  {conversation.last_message_preview}
                </Text>
              </Group>
              {conversation.unread_count > 0 && (
                <Badge size="xs" circle color="primary">
                  {conversation.unread_count}
                </Badge>
              )}
            </Group>
          </Box>
        </Group>
      </Group>
    </Box>
  )
}

// Chat message bubble
function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const isWhatsApp = message.source === 'whatsapp'
  
  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
      }}
    >
      <Box
        p="sm"
        maw="70%"
        style={{
          backgroundColor: isOwn
            ? isWhatsApp 
              ? 'var(--mantine-color-green-6)' 
              : 'var(--mantine-color-primary-6)'
            : 'white',
          color: isOwn ? 'white' : undefined,
          borderRadius: isOwn
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        {/* Source indicator for incoming messages */}
        {!isOwn && (
          <Group gap={4} mb={4}>
            {isWhatsApp ? (
              <IconBrandWhatsapp size={12} color="var(--mantine-color-green-6)" />
            ) : (
              <IconMessage size={12} color="var(--mantine-color-blue-6)" />
            )}
            <Text size="xs" c="dimmed">
              {isWhatsApp ? 'WhatsApp' : 'Plataforma'}
            </Text>
          </Group>
        )}
        
        <Text size="sm">{message.content}</Text>
        
        <Group gap={4} justify="flex-end" mt={4}>
          {/* Source indicator for outgoing messages */}
          {isOwn && isWhatsApp && (
            <IconBrandWhatsapp size={12} style={{ opacity: 0.7 }} />
          )}
          <Text size="xs" c={isOwn ? 'white' : 'dimmed'} style={{ opacity: 0.7 }}>
            {dayjs(message.created_at).format('HH:mm')}
          </Text>
          <MessageStatus message={message} />
        </Group>
      </Box>
    </Box>
  )
}

export function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sendVia, setSendVia] = useState<MessageSource>('platform')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  const { isDemoMode, demoRole } = useAuthStore()
  const isClientView = isDemoMode && demoRole === 'client'
  
  // Queries
  const { data: conversations = [], isLoading: loadingConversations } = useConversations()
  const { data: messages = [], isLoading: loadingMessages } = useMessages(selectedConversationId)
  const sendMessageMutation = useSendMessage()
  const markReadMutation = useMarkConversationRead()
  
  const selectedConversation = conversations.find(c => c.id === selectedConversationId)
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])
  
  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversationId && (selectedConversation?.unread_count ?? 0) > 0) {
      markReadMutation.mutate(selectedConversationId)
    }
  }, [selectedConversationId])
  
  // Update send channel based on conversation preference
  useEffect(() => {
    if (selectedConversation) {
      setSendVia(selectedConversation.preferred_channel)
    }
  }, [selectedConversation])
  
  const handleSendMessage = () => {
    if (!message.trim() || !selectedConversationId) return
    
    sendMessageMutation.mutate({
      conversation_id: selectedConversationId,
      content: message.trim(),
      send_via: sendVia,
    })
    
    setMessage('')
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  const filteredConversations = conversations.filter(c => 
    (c.client_name || c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return (
    <Container size="xl" py="xl" h="calc(100vh - 100px)">
      <PageHeader
        title="Chat"
        description={isClientView ? 'Comunícate con tu entrenador' : 'Comunícate con tus clientes'}
      />
      
      <Paper withBorder radius="lg" h="calc(100% - 80px)" style={{ overflow: 'hidden' }}>
        <Grid h="100%" gutter={0}>
          {/* Lista de conversaciones */}
          <Grid.Col span={4} h="100%" style={{ borderRight: '1px solid var(--mantine-color-gray-2)' }}>
            <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
              <TextInput
                placeholder="Buscar conversaciones..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                styles={{
                  input: {
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    border: 'none',
                  },
                }}
              />
            </Box>
            
            <ScrollArea h="calc(100% - 70px)">
              {loadingConversations ? (
                <Box p="xl" ta="center">
                  <Loader size="sm" />
                </Box>
              ) : filteredConversations.length === 0 ? (
                <Box p="xl" ta="center">
                  <Text c="dimmed" size="sm">No hay conversaciones</Text>
                </Box>
              ) : (
                filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversationId === conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                  />
                ))
              )}
            </ScrollArea>
          </Grid.Col>
          
          {/* Área de chat */}
          <Grid.Col span={8} h="100%">
            {selectedConversation ? (
              <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header del chat */}
                <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                  <Group justify="space-between">
                    <Group>
                      <Box pos="relative">
                        <Avatar radius="xl" color="primary">
                          {selectedConversation.client_name?.charAt(0) || '?'}
                        </Avatar>
                        {selectedConversation.whatsapp_phone && (
                          <ThemeIcon 
                            size={16} 
                            radius="xl" 
                            color="green" 
                            style={{ 
                              position: 'absolute', 
                              bottom: -2, 
                              right: -2,
                              border: '2px solid white',
                            }}
                          >
                            <IconBrandWhatsapp size={10} />
                          </ThemeIcon>
                        )}
                      </Box>
                      <Box>
                        <Group gap="xs">
                          <Text fw={600}>{selectedConversation.client_name || selectedConversation.name}</Text>
                          {selectedConversation.whatsapp_phone && (
                            <Badge size="xs" variant="light" color="green">
                              {selectedConversation.whatsapp_phone}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {selectedConversation.preferred_channel === 'whatsapp' 
                            ? 'Conectado por WhatsApp' 
                            : 'Chat de plataforma'}
                        </Text>
                      </Box>
                    </Group>
                    <Group gap="xs">
                      <Tooltip label="Llamar">
                        <ActionIcon variant="subtle" color="gray" size="lg">
                          <IconPhone size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Videollamada">
                        <ActionIcon variant="subtle" color="gray" size="lg">
                          <IconVideo size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Info">
                        <ActionIcon variant="subtle" color="gray" size="lg">
                          <IconInfoCircle size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" size="lg">
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item>Ver perfil del cliente</Menu.Item>
                          <Menu.Item>Archivar conversación</Menu.Item>
                          <Menu.Divider />
                          <Menu.Item color="red">Eliminar conversación</Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Box>
                
                {/* Mensajes */}
                <ScrollArea
                  flex={1}
                  p="md"
                  viewportRef={scrollAreaRef}
                  style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}
                >
                  {loadingMessages ? (
                    <Box ta="center" py="xl">
                      <Loader size="sm" />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box ta="center" py="xl">
                      <Text c="dimmed" size="sm">No hay mensajes aún</Text>
                      <Text c="dimmed" size="xs">Envía el primer mensaje para iniciar la conversación</Text>
                    </Box>
                  ) : (
                    <Stack gap="md">
                      {messages.map((msg) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isOwn={msg.direction === 'outbound'}
                        />
                      ))}
                    </Stack>
                  )}
                </ScrollArea>
                
                {/* Input de mensaje */}
                <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                  {/* Channel selector */}
                  {selectedConversation.whatsapp_phone && (
                    <Group mb="xs" justify="center">
                      <SegmentedControl
                        size="xs"
                        value={sendVia}
                        onChange={(value) => setSendVia(value as MessageSource)}
                        data={[
                          { 
                            value: 'platform', 
                            label: (
                              <Group gap={4}>
                                <IconMessage size={14} />
                                <span>Plataforma</span>
                              </Group>
                            )
                          },
                          { 
                            value: 'whatsapp', 
                            label: (
                              <Group gap={4}>
                                <IconBrandWhatsapp size={14} />
                                <span>WhatsApp</span>
                              </Group>
                            )
                          },
                        ]}
                      />
                    </Group>
                  )}
                  
                  <Group gap="sm">
                    <ActionIcon variant="subtle" color="gray" size="lg">
                      <IconPaperclip size={20} />
                    </ActionIcon>
                    <TextInput
                      placeholder={`Escribe un mensaje${sendVia === 'whatsapp' ? ' por WhatsApp' : ''}...`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      flex={1}
                      styles={{
                        input: {
                          backgroundColor: 'var(--mantine-color-gray-0)',
                          border: 'none',
                        },
                      }}
                    />
                    <ActionIcon variant="subtle" color="gray" size="lg">
                      <IconMoodSmile size={20} />
                    </ActionIcon>
                    <ActionIcon
                      variant="filled"
                      color={sendVia === 'whatsapp' ? 'green' : 'primary'}
                      size="lg"
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      loading={sendMessageMutation.isPending}
                    >
                      <IconSend size={18} />
                    </ActionIcon>
                  </Group>
                </Box>
              </Box>
            ) : (
              <Box
                h="100%"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <ThemeIcon size={80} radius="xl" variant="light" color="gray" mb="md">
                  <IconMessages size={40} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  Selecciona una conversación
                </Text>
                <Text size="sm" c="dimmed">
                  Elige un chat de la lista para empezar a conversar
                </Text>
                {!isClientView && (
                  <Text size="xs" c="dimmed" mt="md">
                    💡 Los mensajes de WhatsApp y plataforma se unifican aquí
                  </Text>
                )}
              </Box>
            )}
          </Grid.Col>
        </Grid>
      </Paper>
    </Container>
  )
}
