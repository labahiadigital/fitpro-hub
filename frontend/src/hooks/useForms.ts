import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

export interface Form {
  id: string
  workspace_id: string
  name: string
  description?: string
  form_type: 'health' | 'consent' | 'assessment' | 'survey' | 'custom'
  fields: FormField[]
  is_active: boolean
  is_required: boolean
  send_on_onboarding: boolean
  submissions_count: number
  created_at: string
  updated_at: string
}

export interface FormField {
  id: string
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'file' | 'signature'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface FormSubmission {
  id: string
  workspace_id: string
  form_id: string
  client_id: string
  responses: Record<string, any>
  status: 'pending' | 'completed' | 'expired'
  sent_at: string
  submitted_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export function useForms(params?: { form_type?: string; is_active?: boolean }) {
  const { currentWorkspace, isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['forms', currentWorkspace?.id, params],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: '1',
              workspace_id: currentWorkspace?.id,
              name: 'Cuestionario PAR-Q',
              description: 'Cuestionario de aptitud física previo al ejercicio',
              form_type: 'health',
              fields: [],
              is_active: true,
              is_required: true,
              send_on_onboarding: true,
              submissions_count: 45,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '2',
              workspace_id: currentWorkspace?.id,
              name: 'Consentimiento GDPR',
              description: 'Consentimiento para tratamiento de datos personales',
              form_type: 'consent',
              fields: [],
              is_active: true,
              is_required: true,
              send_on_onboarding: true,
              submissions_count: 52,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '3',
              workspace_id: currentWorkspace?.id,
              name: 'Evaluación Inicial',
              description: 'Evaluación de objetivos y estado físico inicial',
              form_type: 'assessment',
              fields: [],
              is_active: true,
              is_required: false,
              send_on_onboarding: true,
              submissions_count: 38,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as Form[],
          total: 3,
          page: 1,
          size: 20,
        }
      }
      
      const response = await api.get('/forms/', {
        params: { workspace_id: currentWorkspace?.id, ...params },
      })
      return response.data
    },
    enabled: !!currentWorkspace?.id,
  })
}

export function useForm(id: string) {
  const { isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          id,
          name: 'Cuestionario PAR-Q',
          description: 'Cuestionario de aptitud física previo al ejercicio',
          form_type: 'health',
          fields: [
            {
              id: '1',
              type: 'radio',
              label: '¿Le ha dicho alguna vez un médico que tiene una enfermedad cardíaca?',
              required: true,
              options: ['Sí', 'No'],
            },
            {
              id: '2',
              type: 'radio',
              label: '¿Siente dolor en el pecho cuando realiza actividad física?',
              required: true,
              options: ['Sí', 'No'],
            },
            {
              id: '3',
              type: 'radio',
              label: '¿Ha tenido dolor en el pecho en el último mes sin realizar actividad física?',
              required: true,
              options: ['Sí', 'No'],
            },
            {
              id: '4',
              type: 'textarea',
              label: 'Comentarios adicionales sobre su salud',
              required: false,
            },
            {
              id: '5',
              type: 'signature',
              label: 'Firma del cliente',
              required: true,
            },
          ],
          is_active: true,
          is_required: true,
        } as Form
      }
      
      const response = await api.get(`/forms/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateForm() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useAuthStore()
  
  return useMutation({
    mutationFn: async (data: Partial<Form>) => {
      const response = await api.post('/forms/', {
        ...data,
        workspace_id: currentWorkspace?.id,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
  })
}

export function useFormSubmissions(formId?: string, clientId?: string) {
  const { currentWorkspace, isDemoMode } = useAuthStore()
  
  return useQuery({
    queryKey: ['form-submissions', currentWorkspace?.id, formId, clientId],
    queryFn: async () => {
      if (isDemoMode) {
        return {
          items: [
            {
              id: '1',
              form_id: '1',
              client_id: '1',
              responses: {},
              status: 'completed',
              sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              submitted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: '2',
              form_id: '1',
              client_id: '2',
              responses: {},
              status: 'pending',
              sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as FormSubmission[],
          total: 2,
          page: 1,
          size: 20,
        }
      }
      
      const response = await api.get('/forms/submissions/', {
        params: { workspace_id: currentWorkspace?.id, form_id: formId, client_id: clientId },
      })
      return response.data
    },
    enabled: !!currentWorkspace?.id,
  })
}

export function useSendForm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { form_id: string; client_ids: string[] }) => {
      const response = await api.post('/forms/send', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions'] })
    },
  })
}

