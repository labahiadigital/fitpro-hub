import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

export interface Notification {
  id: string
  workspace_id: string
  user_id: string
  title: string
  message: string
  notification_type: 'info' | 'success' | 'warning' | 'error' | 'reminder'
  category?: string
  is_read: boolean
  read_at?: string
  action_url?: string
  action_label?: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  email_booking_created: boolean
  email_booking_cancelled: boolean
  email_booking_reminder: boolean
  email_payment_received: boolean
  email_payment_failed: boolean
  email_new_message: boolean
  email_new_client: boolean
  email_form_submitted: boolean
  email_marketing: boolean
  push_enabled: boolean
  push_booking_created: boolean
  push_booking_cancelled: boolean
  push_booking_reminder: boolean
  push_new_message: boolean
  inapp_all: boolean
}

export function useNotifications(params?: { category?: string; is_read?: boolean }) {
  const { isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: '1',
              title: 'Nueva reserva',
              message: 'María García ha reservado una sesión para mañana a las 10:00',
              notification_type: 'info',
              category: 'booking',
              is_read: false,
              action_url: '/calendar',
              action_label: 'Ver calendario',
              created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            },
            {
              id: '2',
              title: 'Pago recibido',
              message: 'Carlos López ha pagado su suscripción mensual (€149)',
              notification_type: 'success',
              category: 'payment',
              is_read: false,
              action_url: '/payments',
              created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: '3',
              title: 'Formulario completado',
              message: 'Ana Martínez ha completado el cuestionario PAR-Q',
              notification_type: 'info',
              category: 'form',
              is_read: true,
              read_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              action_url: '/forms',
              created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: '4',
              title: 'Nuevo mensaje',
              message: 'Pedro Sánchez te ha enviado un mensaje',
              notification_type: 'info',
              category: 'message',
              is_read: true,
              action_url: '/chat',
              created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
          ] as Notification[],
          total: 4,
          unread_count: 2,
          page: 1,
          size: 20,
        }
      }
      
      const response = await api.get('/notifications/', { params })
      return response.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useUnreadCount() {
  const { isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      if (isDemoMode) {
        return { unread_count: 2 }
      }
      
      const response = await api.get('/notifications/unread-count')
      return response.data
    },
    refetchInterval: 30000,
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await api.post('/notifications/mark-read', {
        notification_ids: notificationIds,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (category?: string) => {
      const response = await api.post('/notifications/mark-all-read', { category })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.delete(`/notifications/${notificationId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })
}

export function useNotificationPreferences() {
  const { isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          id: '1',
          user_id: 'demo-user-1',
          email_booking_created: true,
          email_booking_cancelled: true,
          email_booking_reminder: true,
          email_payment_received: true,
          email_payment_failed: true,
          email_new_message: true,
          email_new_client: true,
          email_form_submitted: true,
          email_marketing: false,
          push_enabled: true,
          push_booking_created: true,
          push_booking_cancelled: true,
          push_booking_reminder: true,
          push_new_message: true,
          inapp_all: true,
        } as NotificationPreferences
      }
      
      const response = await api.get('/notifications/preferences')
      return response.data
    },
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Partial<NotificationPreferences>) => {
      const response = await api.patch('/notifications/preferences', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })
}

