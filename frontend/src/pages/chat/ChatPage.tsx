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
  Divider,
  ThemeIcon,
} from '@mantine/core'
import {
  IconSend,
  IconSearch,
  IconPaperclip,
  IconMoodSmile,
  IconMessages,
  IconCheck,
  IconChecks,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
}

interface Conversation {
  id: string
  name: string
  avatar_url?: string
  last_message: string
  last_message_at: string
  unread_count: number
}

export function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // Mock data
  const conversations: Conversation[] = [
    {
      id: '1',
      name: 'María García',
      last_message: '¡Perfecto! Nos vemos mañana entonces',
      last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      unread_count: 2,
    },
    {
      id: '2',
      name: 'Carlos López',
      last_message: '¿Puedo cambiar la sesión del viernes?',
      last_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      unread_count: 0,
    },
    {
      id: '3',
      name: 'Ana Martínez',
      last_message: 'Gracias por el plan de nutrición',
      last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      unread_count: 0,
    },
    {
      id: '4',
      name: 'Pedro Sánchez',
      last_message: 'He completado el entrenamiento de hoy',
      last_message_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      unread_count: 1,
    },
  ]
  
  const messages: Message[] = selectedConversation === '1' ? [
    { id: '1', content: 'Hola María, ¿cómo va todo?', sender_id: 'me', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), is_read: true },
    { id: '2', content: '¡Hola! Todo bien, gracias. He estado siguiendo el plan de entrenamiento', sender_id: '1', created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(), is_read: true },
    { id: '3', content: '¿Cómo te has sentido con los ejercicios de la semana?', sender_id: 'me', created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(), is_read: true },
    { id: '4', content: 'Muy bien, aunque las sentadillas me cuestan un poco más', sender_id: '1', created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), is_read: true },
    { id: '5', content: 'Es normal al principio. La próxima sesión trabajaremos la técnica', sender_id: 'me', created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(), is_read: true },
    { id: '6', content: '¡Perfecto! Nos vemos mañana entonces', sender_id: '1', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), is_read: false },
  ] : []
  
  const selectedConv = conversations.find((c) => c.id === selectedConversation)
  
  const handleSendMessage = () => {
    if (!message.trim()) return
    console.log('Send message:', message)
    setMessage('')
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])
  
  return (
    <Container size="xl" py="xl" h="calc(100vh - 100px)">
      <PageHeader
        title="Chat"
        description="Comunícate con tus clientes"
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
              {conversations
                .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((conv) => (
                  <Box
                    key={conv.id}
                    p="md"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedConversation === conv.id
                        ? 'var(--mantine-color-primary-0)'
                        : undefined,
                      borderBottom: '1px solid var(--mantine-color-gray-1)',
                    }}
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
                        <Avatar radius="xl" color="primary">
                          {conv.name.charAt(0)}
                        </Avatar>
                        <Box style={{ flex: 1, overflow: 'hidden' }}>
                          <Group justify="space-between" wrap="nowrap">
                            <Text fw={conv.unread_count > 0 ? 600 : 500} size="sm" truncate>
                              {conv.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {dayjs(conv.last_message_at).fromNow()}
                            </Text>
                          </Group>
                          <Group justify="space-between" wrap="nowrap">
                            <Text
                              size="xs"
                              c={conv.unread_count > 0 ? undefined : 'dimmed'}
                              fw={conv.unread_count > 0 ? 500 : 400}
                              truncate
                              style={{ flex: 1 }}
                            >
                              {conv.last_message}
                            </Text>
                            {conv.unread_count > 0 && (
                              <Badge size="xs" circle color="primary">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </Group>
                        </Box>
                      </Group>
                    </Group>
                  </Box>
                ))}
            </ScrollArea>
          </Grid.Col>
          
          {/* Área de chat */}
          <Grid.Col span={8} h="100%">
            {selectedConversation ? (
              <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header del chat */}
                <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                  <Group>
                    <Avatar radius="xl" color="primary">
                      {selectedConv?.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Text fw={600}>{selectedConv?.name}</Text>
                      <Text size="xs" c="dimmed">En línea</Text>
                    </Box>
                  </Group>
                </Box>
                
                {/* Mensajes */}
                <ScrollArea
                  flex={1}
                  p="md"
                  viewportRef={scrollAreaRef}
                  style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}
                >
                  <Stack gap="md">
                    {messages.map((msg) => (
                      <Box
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: msg.sender_id === 'me' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Box
                          p="sm"
                          maw="70%"
                          style={{
                            backgroundColor: msg.sender_id === 'me'
                              ? 'var(--mantine-color-primary-6)'
                              : 'white',
                            color: msg.sender_id === 'me' ? 'white' : undefined,
                            borderRadius: msg.sender_id === 'me'
                              ? '16px 16px 4px 16px'
                              : '16px 16px 16px 4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          }}
                        >
                          <Text size="sm">{msg.content}</Text>
                          <Group gap={4} justify="flex-end" mt={4}>
                            <Text size="xs" c={msg.sender_id === 'me' ? 'white' : 'dimmed'} style={{ opacity: 0.7 }}>
                              {dayjs(msg.created_at).format('HH:mm')}
                            </Text>
                            {msg.sender_id === 'me' && (
                              msg.is_read ? (
                                <IconChecks size={14} style={{ opacity: 0.7 }} />
                              ) : (
                                <IconCheck size={14} style={{ opacity: 0.7 }} />
                              )
                            )}
                          </Group>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </ScrollArea>
                
                {/* Input de mensaje */}
                <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                  <Group gap="sm">
                    <ActionIcon variant="subtle" color="gray" size="lg">
                      <IconPaperclip size={20} />
                    </ActionIcon>
                    <TextInput
                      placeholder="Escribe un mensaje..."
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
                      color="primary"
                      size="lg"
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
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
              </Box>
            )}
          </Grid.Col>
        </Grid>
      </Paper>
    </Container>
  )
}
