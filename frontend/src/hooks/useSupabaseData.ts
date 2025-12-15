import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../stores/auth'

// Demo workspace ID para pruebas
const DEMO_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111'

// Hook para obtener clientes desde Supabase
export function useSupabaseClients() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-clients', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { items: [], total: 0 }

      const { data, error, count } = await supabase
        .from('clients')
        .select('*, client_tags_association(tag_id, client_tags(id, name, color))', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        items: data?.map(client => ({
          ...client,
          tags: client.client_tags_association?.map((ta: any) => ta.client_tags) || []
        })) || [],
        total: count || 0
      }
    },
    enabled: !!workspaceId,
  })
}

// Hook para obtener reservas desde Supabase
export function useSupabaseBookings() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-bookings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []

      const { data, error } = await supabase
        .from('bookings')
        .select('*, clients(first_name, last_name, email)')
        .eq('workspace_id', workspaceId)
        .order('start_time', { ascending: true })

      if (error) throw error

      return data?.map(booking => ({
        ...booking,
        client_name: booking.clients 
          ? `${booking.clients.first_name} ${booking.clients.last_name}`
          : booking.title
      })) || []
    },
    enabled: !!workspaceId,
  })
}

// Hook para obtener ejercicios desde Supabase
export function useSupabaseExercises() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-exercises', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`workspace_id.eq.${workspaceId},is_global.eq.true`)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: true,
  })
}

// Hook para obtener alimentos desde Supabase
export function useSupabaseFoods() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-foods', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .or(`workspace_id.eq.${workspaceId},is_global.eq.true`)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: true,
  })
}

// Hook para obtener programas de entrenamiento desde Supabase
export function useSupabaseWorkoutPrograms() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-workout-programs', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []

      const { data, error } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!workspaceId,
  })
}

// Hook para obtener planes nutricionales desde Supabase
export function useSupabaseMealPlans() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-meal-plans', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, clients(first_name, last_name)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!workspaceId,
  })
}

// Hook para obtener tags de clientes
export function useSupabaseClientTags() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-client-tags', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []

      const { data, error } = await supabase
        .from('client_tags')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!workspaceId,
  })
}

// Hook para crear un cliente
export function useCreateSupabaseClient() {
  const queryClient = useQueryClient()
  const { isDemoMode, currentWorkspace, user } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useMutation({
    mutationFn: async (data: {
      first_name: string
      last_name: string
      email: string
      phone?: string
      goals?: string
    }) => {
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          ...data,
          workspace_id: workspaceId,
          created_by: user?.id,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      return client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase-clients'] })
    },
  })
}

// Hook para obtener KPIs del dashboard
export function useSupabaseKPIs() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-kpis', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null

      // Obtener conteo de clientes
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)

      // Obtener conteo de reservas del mes actual
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('start_time', startOfMonth.toISOString())

      // Obtener reservas confirmadas
      const { count: confirmedBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'confirmed')
        .gte('start_time', startOfMonth.toISOString())

      // Obtener programas de entrenamiento
      const { count: programsCount } = await supabase
        .from('workout_programs')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      return {
        total_clients: clientsCount || 0,
        active_clients: clientsCount || 0,
        monthly_bookings: bookingsCount || 0,
        confirmed_bookings: confirmedBookings || 0,
        workout_programs: programsCount || 0,
        mrr: 0, // TODO: calcular desde subscriptions
        client_change: 12,
        booking_change: 8,
      }
    },
    enabled: !!workspaceId,
  })
}

// Hook para obtener el workspace actual
export function useSupabaseWorkspace() {
  const { isDemoMode, currentWorkspace } = useAuthStore()
  const workspaceId = isDemoMode ? DEMO_WORKSPACE_ID : currentWorkspace?.id

  return useQuery({
    queryKey: ['supabase-workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null

      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!workspaceId,
  })
}

