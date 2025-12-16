import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

export interface AutomationAction {
  type: 'send_email' | 'send_in_app' | 'create_task' | 'update_tag' | 'webhook' | 'send_form'
  config: Record<string, any>
}

export interface AutomationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}

export interface Automation {
  id: string
  workspace_id: string
  name: string
  description?: string
  trigger_type: string
  trigger_config?: Record<string, any>
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  is_active: boolean
  stats: {
    total_runs: number
    successful_runs: number
    failed_runs: number
    last_run_at?: string
  }
  created_at: string
  updated_at: string
}

export interface AutomationLog {
  id: string
  automation_id: string
  trigger_data: Record<string, any>
  actions_executed: string[]
  status: 'success' | 'partial' | 'failed'
  error_message?: string
  executed_at: string
}

export function useAutomations(params?: { is_active?: boolean; trigger_type?: string }) {
  const { currentWorkspace, isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['automations', currentWorkspace?.id, params],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: '1',
              workspace_id: currentWorkspace?.id,
              name: 'Bienvenida a nuevos clientes',
              description: 'Envía email de bienvenida y asigna formulario PAR-Q cuando se crea un cliente',
              trigger_type: 'client_created',
              conditions: [],
              actions: [
                { type: 'send_email', config: { template: 'welcome' } },
                { type: 'send_form', config: { form_id: 'parq' } },
              ],
              is_active: true,
              stats: { total_runs: 45, successful_runs: 44, failed_runs: 1, last_run_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '2',
              workspace_id: currentWorkspace?.id,
              name: 'Recordatorio de sesión (24h)',
              description: 'Envía recordatorio por email 24 horas antes de la sesión',
              trigger_type: 'booking_reminder',
              trigger_config: { hours_before: 24 },
              conditions: [],
              actions: [
                { type: 'send_email', config: { template: 'booking_reminder' } },
              ],
              is_active: true,
              stats: { total_runs: 230, successful_runs: 228, failed_runs: 2, last_run_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '3',
              workspace_id: currentWorkspace?.id,
              name: 'Reactivación de clientes inactivos',
              description: 'Envía mensaje cuando un cliente no tiene actividad en 14 días',
              trigger_type: 'client_inactive',
              trigger_config: { days_inactive: 14 },
              conditions: [],
              actions: [
                { type: 'send_email', config: { template: 'reactivation' } },
                { type: 'create_task', config: { title: 'Seguimiento cliente inactivo', priority: 'high' } },
              ],
              is_active: false,
              stats: { total_runs: 12, successful_runs: 12, failed_runs: 0, last_run_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '4',
              workspace_id: currentWorkspace?.id,
              name: 'Aviso de renovación de suscripción',
              description: 'Notifica 7 días antes del vencimiento de la suscripción',
              trigger_type: 'subscription_renewal',
              trigger_config: { days_before: 7 },
              conditions: [],
              actions: [
                { type: 'send_email', config: { template: 'renewal_reminder' } },
                { type: 'send_in_app', config: { message: 'Tu suscripción vence pronto' } },
              ],
              is_active: true,
              stats: { total_runs: 18, successful_runs: 18, failed_runs: 0, last_run_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as Automation[],
          total: 4,
          page: 1,
          size: 20,
        }
      }
      
      const response = await api.get('/automations/', {
        params: { workspace_id: currentWorkspace?.id, ...params },
      })
      return response.data
    },
    enabled: !!currentWorkspace?.id,
  })
}

export function useAutomation(id: string) {
  const { isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['automation', id],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          id,
          workspace_id: '11111111-1111-1111-1111-111111111111',
          name: 'Bienvenida a nuevos clientes',
          description: 'Envía email de bienvenida y asigna formulario PAR-Q cuando se crea un cliente',
          trigger_type: 'client_created',
          conditions: [],
          actions: [
            { type: 'send_email', config: { template: 'welcome' } },
            { type: 'send_form', config: { form_id: 'parq' } },
          ],
          is_active: true,
          stats: { total_runs: 45, successful_runs: 44, failed_runs: 1 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Automation
      }
      
      const response = await api.get(`/automations/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateAutomation() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useAuthStore()
  
  return useMutation({
    mutationFn: async (data: Partial<Automation>) => {
      const response = await api.post('/automations/', {
        ...data,
        workspace_id: currentWorkspace?.id,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
    },
  })
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Automation> }) => {
      const response = await api.patch(`/automations/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
    },
  })
}

export function useToggleAutomation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await api.patch(`/automations/${id}`, { is_active })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
    },
  })
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/automations/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
    },
  })
}

export function useAutomationLogs(automationId: string) {
  const { isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['automation-logs', automationId],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: '1',
              automation_id: automationId,
              trigger_data: { client_id: '1', client_name: 'María García' },
              actions_executed: ['send_email', 'send_form'],
              status: 'success',
              executed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: '2',
              automation_id: automationId,
              trigger_data: { client_id: '2', client_name: 'Carlos López' },
              actions_executed: ['send_email'],
              status: 'partial',
              error_message: 'Failed to send form: Form not found',
              executed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ] as AutomationLog[],
          total: 2,
          page: 1,
          size: 20,
        }
      }
      
      const response = await api.get(`/automations/${automationId}/logs`)
      return response.data
    },
    enabled: !!automationId,
  })
}

export function useTriggerTypes() {
  return [
    { group: 'Clientes', items: [
      { value: 'client_created', label: 'Se crea un cliente' },
      { value: 'client_inactive', label: 'Cliente inactivo (X días)' },
      { value: 'client_birthday', label: 'Cumpleaños del cliente' },
    ]},
    { group: 'Reservas', items: [
      { value: 'booking_created', label: 'Se crea una reserva' },
      { value: 'booking_reminder', label: 'Recordatorio de reserva' },
      { value: 'booking_cancelled', label: 'Se cancela una reserva' },
      { value: 'booking_completed', label: 'Se completa una sesión' },
      { value: 'booking_no_show', label: 'Cliente no asiste' },
    ]},
    { group: 'Pagos', items: [
      { value: 'payment_received', label: 'Pago recibido' },
      { value: 'payment_failed', label: 'Pago fallido' },
      { value: 'subscription_renewal', label: 'Renovación próxima' },
      { value: 'subscription_cancelled', label: 'Suscripción cancelada' },
    ]},
    { group: 'Contenido', items: [
      { value: 'form_submitted', label: 'Formulario enviado' },
      { value: 'workout_completed', label: 'Entrenamiento completado' },
      { value: 'goal_achieved', label: 'Objetivo alcanzado' },
    ]},
  ]
}

export function useActionTypes() {
  return [
    { value: 'send_email', label: 'Enviar email', icon: 'mail' },
    { value: 'send_in_app', label: 'Enviar notificación in-app', icon: 'bell' },
    { value: 'create_task', label: 'Crear tarea', icon: 'clipboard' },
    { value: 'send_form', label: 'Enviar formulario', icon: 'forms' },
    { value: 'update_tag', label: 'Actualizar etiqueta del cliente', icon: 'tag' },
    { value: 'webhook', label: 'Llamar webhook externo', icon: 'webhook' },
  ]
}

