import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { clientsApi } from '../services/api'

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

export function useClients(filters: ClientFilters = {}) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: () => clientsApi.list(filters),
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
  
  return useMutation({
    mutationFn: (data: Partial<Client>) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      notifications.show({
        title: 'Cliente creado',
        message: 'El cliente ha sido creado correctamente',
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

export function useClientTags() {
  return useQuery({
    queryKey: ['client-tags'],
    queryFn: () => clientsApi.tags(),
    select: (response) => response.data,
  })
}

export function useCreateClientTag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { name: string; color: string }) => clientsApi.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-tags'] })
      notifications.show({
        title: 'Etiqueta creada',
        message: 'La etiqueta ha sido creada correctamente',
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

