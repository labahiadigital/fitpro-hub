import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { clientsApi } from '../services/api'
import { useAuthStore } from '../stores/auth'

interface Client {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone?: string
  avatar_url?: string
  is_active: boolean
  tags: Array<{ id: string; name: string; color: string }>
  created_at: string
}

interface ClientsResponse {
  items: Client[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

interface ClientFilters {
  page?: number
  search?: string
  is_active?: boolean
  tag_id?: string
}

// Demo clients data
const demoClients: Client[] = [
  {
    id: 'demo-client-1',
    first_name: 'María',
    last_name: 'García López',
    full_name: 'María García López',
    email: 'maria.garcia@email.com',
    phone: '+34 612 345 678',
    avatar_url: undefined,
    is_active: true,
    tags: [{ id: 'tag-1', name: 'VIP', color: '#2D6A4F' }],
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'demo-client-2',
    first_name: 'Carlos',
    last_name: 'Martínez Ruiz',
    full_name: 'Carlos Martínez Ruiz',
    email: 'carlos.martinez@email.com',
    phone: '+34 623 456 789',
    avatar_url: undefined,
    is_active: true,
    tags: [{ id: 'tag-2', name: 'Nuevo', color: '#3B82F6' }],
    created_at: '2024-02-20T14:30:00Z',
  },
  {
    id: 'demo-client-3',
    first_name: 'Ana',
    last_name: 'Fernández Soto',
    full_name: 'Ana Fernández Soto',
    email: 'ana.fernandez@email.com',
    phone: '+34 634 567 890',
    avatar_url: undefined,
    is_active: true,
    tags: [{ id: 'tag-1', name: 'VIP', color: '#2D6A4F' }, { id: 'tag-3', name: 'Premium', color: '#8B5CF6' }],
    created_at: '2024-03-10T09:15:00Z',
  },
  {
    id: 'demo-client-4',
    first_name: 'Pedro',
    last_name: 'Sánchez Moreno',
    full_name: 'Pedro Sánchez Moreno',
    email: 'pedro.sanchez@email.com',
    phone: '+34 645 678 901',
    avatar_url: undefined,
    is_active: false,
    tags: [],
    created_at: '2024-01-05T16:45:00Z',
  },
  {
    id: 'demo-client-5',
    first_name: 'Laura',
    last_name: 'Díaz Navarro',
    full_name: 'Laura Díaz Navarro',
    email: 'laura.diaz@email.com',
    phone: '+34 656 789 012',
    avatar_url: undefined,
    is_active: true,
    tags: [{ id: 'tag-2', name: 'Nuevo', color: '#3B82F6' }],
    created_at: '2024-04-01T11:20:00Z',
  },
]

export function useClients(filters: ClientFilters = {}) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useQuery({
    queryKey: ['clients', filters, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        // Filter demo data based on filters
        let filteredClients = [...demoClients]
        
        if (filters.search) {
          const search = filters.search.toLowerCase()
          filteredClients = filteredClients.filter(c =>
            c.first_name.toLowerCase().includes(search) ||
            c.last_name.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search)
          )
        }
        
        if (filters.is_active !== undefined) {
          filteredClients = filteredClients.filter(c => c.is_active === filters.is_active)
        }
        
        const page = filters.page || 1
        const pageSize = 10
        const start = (page - 1) * pageSize
        const paginatedClients = filteredClients.slice(start, start + pageSize)
        
        return {
          data: {
            items: paginatedClients,
            total: filteredClients.length,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(filteredClients.length / pageSize),
          } as ClientsResponse
        }
      }
      return clientsApi.list(filters)
    },
    select: (response) => response.data as ClientsResponse,
  })
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.get(clientId),
    select: (response) => response.data,
    enabled: !!clientId,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useMutation({
    mutationFn: async (data: Partial<Client>) => {
      if (isDemoMode) {
        // Simulate creating a client in demo mode
        return { data: { ...data, id: `demo-client-${Date.now()}`, created_at: new Date().toISOString() } }
      }
      return clientsApi.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      notifications.show({
        title: 'Cliente creado',
        message: isDemoMode ? 'Cliente creado (modo demo)' : 'El cliente ha sido creado correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al crear cliente',
        color: 'red',
      })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] })
      notifications.show({
        title: 'Cliente actualizado',
        message: 'El cliente ha sido actualizado correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al actualizar cliente',
        color: 'red',
      })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      notifications.show({
        title: 'Cliente eliminado',
        message: 'El cliente ha sido eliminado correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al eliminar cliente',
        color: 'red',
      })
    },
  })
}

// Demo tags data
const demoTags = [
  { id: 'tag-1', name: 'VIP', color: '#2D6A4F' },
  { id: 'tag-2', name: 'Nuevo', color: '#3B82F6' },
  { id: 'tag-3', name: 'Premium', color: '#8B5CF6' },
  { id: 'tag-4', name: 'Pérdida de peso', color: '#F59E0B' },
  { id: 'tag-5', name: 'Hipertrofia', color: '#EC4899' },
]

export function useClientTags() {
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useQuery({
    queryKey: ['client-tags', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return { data: demoTags }
      }
      return clientsApi.tags()
    },
    select: (response) => response.data,
  })
}

export function useCreateClientTag() {
  const queryClient = useQueryClient()
  const isDemoMode = useAuthStore((state) => state.isDemoMode)
  
  return useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      if (isDemoMode) {
        // Simulate creating a tag in demo mode
        return { data: { ...data, id: `demo-tag-${Date.now()}` } }
      }
      return clientsApi.createTag(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-tags'] })
      notifications.show({
        title: 'Etiqueta creada',
        message: isDemoMode ? 'Etiqueta creada (modo demo)' : 'La etiqueta ha sido creada correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al crear etiqueta',
        color: 'red',
      })
    },
  })
}

