import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

// Types
export type MessageSource = 'platform' | 'whatsapp'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
export type MessageType = 'text' | 'image' | 'voice' | 'file' | 'template'

export interface Conversation {
  id: string
  workspace_id: string
  client_id?: string
  name?: string
  conversation_type: 'direct' | 'group' | 'broadcast'
  participant_ids: string[]
  whatsapp_phone?: string
  whatsapp_profile_name?: string
  preferred_channel: MessageSource
  last_message_at?: string
  last_message_preview?: string
  last_message_source?: MessageSource
  unread_count: number
  is_archived: boolean
  created_at: string
  client_name?: string
  client_avatar_url?: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id?: string
  source: MessageSource
  direction: MessageDirection
  message_type: MessageType
  content?: string
  media_url?: string
  media_metadata?: Record<string, unknown>
  external_id?: string
  external_status: MessageStatus
  read_by: string[]
  is_sent: boolean
  is_deleted: boolean
  created_at: string
}

export interface SendMessageData {
  conversation_id: string
  message_type?: MessageType
  content?: string
  media_url?: string
  send_via?: MessageSource
}

// Demo data for conversations
const demoConversations: Conversation[] = [
  {
    id: 'conv-1',
    workspace_id: '11111111-1111-1111-1111-111111111111',
    client_id: 'demo-client-1',
    name: 'María García',
    conversation_type: 'direct',
    participant_ids: [],
    whatsapp_phone: '+34612345678',
    preferred_channel: 'whatsapp',
    last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    last_message_preview: '¡Perfecto! Nos vemos mañana entonces',
    last_message_source: 'whatsapp',
    unread_count: 2,
    is_archived: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    client_name: 'María García',
  },
  {
    id: 'conv-2',
    workspace_id: '11111111-1111-1111-1111-111111111111',
    client_id: 'demo-client-2',
    name: 'Carlos López',
    conversation_type: 'direct',
    participant_ids: [],
    preferred_channel: 'platform',
    last_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    last_message_preview: '¿Puedo cambiar la sesión del viernes?',
    last_message_source: 'platform',
    unread_count: 0,
    is_archived: false,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    client_name: 'Carlos López',
  },
  {
    id: 'conv-3',
    workspace_id: '11111111-1111-1111-1111-111111111111',
    client_id: 'demo-client-3',
    name: 'Ana Martínez',
    conversation_type: 'direct',
    participant_ids: [],
    whatsapp_phone: '+34634567890',
    preferred_channel: 'whatsapp',
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_message_preview: 'Gracias por el plan de nutrición 🙏',
    last_message_source: 'whatsapp',
    unread_count: 0,
    is_archived: false,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    client_name: 'Ana Martínez',
  },
  {
    id: 'conv-4',
    workspace_id: '11111111-1111-1111-1111-111111111111',
    client_id: 'demo-client-4',
    name: 'Pedro Sánchez',
    conversation_type: 'direct',
    participant_ids: [],
    preferred_channel: 'platform',
    last_message_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    last_message_preview: 'He completado el entrenamiento de hoy 💪',
    last_message_source: 'platform',
    unread_count: 1,
    is_archived: false,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    client_name: 'Pedro Sánchez',
  },
]

// Demo messages for conversation 1 (María García - mixed WhatsApp + Platform)
const demoMessagesConv1: Message[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'trainer',
    source: 'platform',
    direction: 'outbound',
    message_type: 'text',
    content: 'Hola María, ¿cómo va todo?',
    external_status: 'sent',
    read_by: ['trainer'],
    is_sent: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    source: 'whatsapp',
    direction: 'inbound',
    message_type: 'text',
    content: '¡Hola! Todo bien, gracias. He estado siguiendo el plan de entrenamiento',
    external_id: 'wamid.xxx1',
    external_status: 'delivered',
    read_by: [],
    is_sent: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    sender_id: 'trainer',
    source: 'whatsapp',
    direction: 'outbound',
    message_type: 'text',
    content: '¿Cómo te has sentido con los ejercicios de la semana?',
    external_id: 'wamid.xxx2',
    external_status: 'read',
    read_by: ['trainer'],
    is_sent: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-4',
    conversation_id: 'conv-1',
    source: 'whatsapp',
    direction: 'inbound',
    message_type: 'text',
    content: 'Muy bien, aunque las sentadillas me cuestan un poco más 😅',
    external_id: 'wamid.xxx3',
    external_status: 'delivered',
    read_by: [],
    is_sent: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-5',
    conversation_id: 'conv-1',
    sender_id: 'trainer',
    source: 'whatsapp',
    direction: 'outbound',
    message_type: 'text',
    content: 'Es normal al principio. La próxima sesión trabajaremos la técnica 💪',
    external_id: 'wamid.xxx4',
    external_status: 'read',
    read_by: ['trainer'],
    is_sent: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-6',
    conversation_id: 'conv-1',
    source: 'whatsapp',
    direction: 'inbound',
    message_type: 'text',
    content: '¡Perfecto! Nos vemos mañana entonces',
    external_id: 'wamid.xxx5',
    external_status: 'delivered',
    read_by: [],
    is_sent: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
]

// Demo messages for conversation 2 (Carlos López - Platform only)
const demoMessagesConv2: Message[] = [
  {
    id: 'msg-10',
    conversation_id: 'conv-2',
    sender_id: 'trainer',
    source: 'platform',
    direction: 'outbound',
    message_type: 'text',
    content: 'Hola Carlos, te confirmo la sesión del viernes a las 10:00',
    external_status: 'sent',
    read_by: ['trainer', 'client'],
    is_sent: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-11',
    conversation_id: 'conv-2',
    source: 'platform',
    direction: 'inbound',
    message_type: 'text',
    content: '¿Puedo cambiar la sesión del viernes?',
    external_status: 'delivered',
    read_by: ['trainer'],
    is_sent: true,
    is_deleted: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
]

const demoMessagesByConversation: Record<string, Message[]> = {
  'conv-1': demoMessagesConv1,
  'conv-2': demoMessagesConv2,
  'conv-3': [],
  'conv-4': [],
}

// Hooks

export function useConversations() {
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useQuery({
    queryKey: ['conversations', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return { data: demoConversations }
      }
      return api.get('/messages/conversations')
    },
    select: (response) => response.data as Conversation[],
  })
}

export function useConversation(conversationId: string | null) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useQuery({
    queryKey: ['conversation', conversationId, isDemoMode],
    queryFn: async () => {
      if (!conversationId) return null
      if (isDemoMode) {
        const conv = demoConversations.find(c => c.id === conversationId)
        return { data: conv }
      }
      return api.get(`/messages/conversations/${conversationId}`)
    },
    select: (response) => response?.data as Conversation | null,
    enabled: !!conversationId,
  })
}

export function useMessages(conversationId: string | null) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useQuery({
    queryKey: ['messages', conversationId, isDemoMode],
    queryFn: async () => {
      if (!conversationId) return { data: [] }
      if (isDemoMode) {
        return { data: demoMessagesByConversation[conversationId] || [] }
      }
      return api.get(`/messages/conversations/${conversationId}/messages`)
    },
    select: (response) => response.data as Message[],
    enabled: !!conversationId,
    refetchInterval: isDemoMode ? false : 5000, // Poll every 5 seconds in real mode
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useMutation({
    mutationFn: async (data: SendMessageData) => {
      if (isDemoMode) {
        // Simulate sending message in demo mode
        const newMessage: Message = {
          id: `demo-msg-${Date.now()}`,
          conversation_id: data.conversation_id,
          sender_id: 'trainer',
          source: data.send_via || 'platform',
          direction: 'outbound',
          message_type: data.message_type || 'text',
          content: data.content,
          media_url: data.media_url,
          external_status: data.send_via === 'whatsapp' ? 'pending' : 'sent',
          read_by: ['trainer'],
          is_sent: true,
          is_deleted: false,
          created_at: new Date().toISOString(),
        }
        
        // Add to demo messages
        if (!demoMessagesByConversation[data.conversation_id]) {
          demoMessagesByConversation[data.conversation_id] = []
        }
        demoMessagesByConversation[data.conversation_id].push(newMessage)
        
        // Update conversation preview
        const conv = demoConversations.find(c => c.id === data.conversation_id)
        if (conv) {
          conv.last_message_at = newMessage.created_at
          conv.last_message_preview = data.content?.slice(0, 100) || '[Media]'
          conv.last_message_source = newMessage.source
        }
        
        return { data: newMessage }
      }
      return api.post('/messages', data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversation_id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al enviar mensaje',
        color: 'red',
      })
    },
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (isDemoMode) {
        const conv = demoConversations.find(c => c.id === conversationId)
        if (conv) {
          conv.unread_count = 0
        }
        return { data: { status: 'ok' } }
      }
      return api.post(`/messages/conversations/${conversationId}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// Helper to get source icon/label
export function getSourceInfo(source: MessageSource) {
  switch (source) {
    case 'whatsapp':
      return { icon: '📱', label: 'WhatsApp', color: 'green' }
    case 'platform':
    default:
      return { icon: '💬', label: 'Plataforma', color: 'blue' }
  }
}

// Helper to get status info
export function getStatusInfo(status: MessageStatus) {
  switch (status) {
    case 'pending':
      return { icon: '⏳', label: 'Enviando...' }
    case 'sent':
      return { icon: '✓', label: 'Enviado' }
    case 'delivered':
      return { icon: '✓✓', label: 'Entregado' }
    case 'read':
      return { icon: '✓✓', label: 'Leído', color: 'blue' }
    case 'failed':
      return { icon: '❌', label: 'Fallido', color: 'red' }
    default:
      return { icon: '', label: '' }
  }
}

