import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "../services/api";
import { useAuthStore } from "../stores/auth";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  tags: Array<{ id: string; name: string; color: string }>;
  created_at: string;
}

interface ClientsResponse {
  items: Client[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ClientFilters {
  page?: number;
  search?: string;
  is_active?: boolean;
  tag_id?: string;
}

// Demo clients data
const demoClients: Client[] = [
  {
    id: "demo-client-1",
    first_name: "María",
    last_name: "García López",
    full_name: "María García López",
    email: "maria.garcia@email.com",
    phone: "+34 612 345 678",
    avatar_url: undefined,
    is_active: true,
    tags: [{ id: "tag-1", name: "VIP", color: "#2D6A4F" }],
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "demo-client-2",
    first_name: "Carlos",
    last_name: "Martínez Ruiz",
    full_name: "Carlos Martínez Ruiz",
    email: "carlos.martinez@email.com",
    phone: "+34 623 456 789",
    avatar_url: undefined,
    is_active: true,
    tags: [{ id: "tag-2", name: "Nuevo", color: "#3B82F6" }],
    created_at: "2024-02-20T14:30:00Z",
  },
  {
    id: "demo-client-3",
    first_name: "Ana",
    last_name: "Fernández Soto",
    full_name: "Ana Fernández Soto",
    email: "ana.fernandez@email.com",
    phone: "+34 634 567 890",
    avatar_url: undefined,
    is_active: true,
    tags: [
      { id: "tag-1", name: "VIP", color: "#2D6A4F" },
      { id: "tag-3", name: "Premium", color: "#8B5CF6" },
    ],
    created_at: "2024-03-10T09:15:00Z",
  },
  {
    id: "demo-client-4",
    first_name: "Pedro",
    last_name: "Sánchez Moreno",
    full_name: "Pedro Sánchez Moreno",
    email: "pedro.sanchez@email.com",
    phone: "+34 645 678 901",
    avatar_url: undefined,
    is_active: false,
    tags: [],
    created_at: "2024-01-05T16:45:00Z",
  },
  {
    id: "demo-client-5",
    first_name: "Laura",
    last_name: "Díaz Navarro",
    full_name: "Laura Díaz Navarro",
    email: "laura.diaz@email.com",
    phone: "+34 656 789 012",
    avatar_url: undefined,
    is_active: true,
    tags: [{ id: "tag-2", name: "Nuevo", color: "#3B82F6" }],
    created_at: "2024-04-01T11:20:00Z",
  },
];

export function useClients(filters: ClientFilters = {}) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useQuery({
    queryKey: ["clients", filters, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        // Filter demo data based on filters
        let filteredClients = [...demoClients];

        if (filters.search) {
          const search = filters.search.toLowerCase();
          filteredClients = filteredClients.filter(
            (c) =>
              c.first_name.toLowerCase().includes(search) ||
              c.last_name.toLowerCase().includes(search) ||
              c.email.toLowerCase().includes(search)
          );
        }

        if (filters.is_active !== undefined) {
          filteredClients = filteredClients.filter(
            (c) => c.is_active === filters.is_active
          );
        }

        const page = filters.page || 1;
        const pageSize = 10;
        const start = (page - 1) * pageSize;
        const paginatedClients = filteredClients.slice(start, start + pageSize);

        return {
          data: {
            items: paginatedClients,
            total: filteredClients.length,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(filteredClients.length / pageSize),
          } as ClientsResponse,
        };
      }
      return clientsApi.list(filters);
    },
    select: (response) => response.data as ClientsResponse,
  });
}

// Extended client data for detail view
interface ClientDetail extends Client {
  birth_date?: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  goals?: string;
  internal_notes?: string;
  consents?: {
    data_processing: boolean;
    marketing: boolean;
    health_data: boolean;
    consent_date: string;
  };
}

// Demo client details
const demoClientDetails: Record<string, ClientDetail> = {
  "demo-client-1": {
    ...demoClients[0],
    birth_date: "1990-05-15",
    gender: "female",
    height_cm: 165,
    weight_kg: 62,
    goals: "Tonificación y mejora de resistencia cardiovascular",
    internal_notes: "Lesión antigua en rodilla derecha, evitar impacto alto",
    consents: {
      data_processing: true,
      marketing: true,
      health_data: true,
      consent_date: "2024-01-15",
    },
  },
  "demo-client-2": {
    ...demoClients[1],
    birth_date: "1988-11-22",
    gender: "male",
    height_cm: 180,
    weight_kg: 85,
    goals: "Ganar masa muscular y mejorar fuerza",
    internal_notes: "Trabaja turnos rotativos, flexibilidad en horarios",
    consents: {
      data_processing: true,
      marketing: false,
      health_data: true,
      consent_date: "2024-02-20",
    },
  },
  "demo-client-3": {
    ...demoClients[2],
    birth_date: "1995-03-08",
    gender: "female",
    height_cm: 170,
    weight_kg: 58,
    goals: "Preparación para maratón",
    internal_notes: "Cliente premium, prioridad alta",
    consents: {
      data_processing: true,
      marketing: true,
      health_data: true,
      consent_date: "2024-03-10",
    },
  },
  "demo-client-4": {
    ...demoClients[3],
    birth_date: "1975-07-30",
    gender: "male",
    height_cm: 175,
    weight_kg: 90,
    goals: "Pérdida de peso y mejora de salud general",
    internal_notes: "Inactivo temporalmente por viaje de trabajo",
    consents: {
      data_processing: true,
      marketing: false,
      health_data: true,
      consent_date: "2024-01-05",
    },
  },
  "demo-client-5": {
    ...demoClients[4],
    birth_date: "1992-09-12",
    gender: "female",
    height_cm: 162,
    weight_kg: 55,
    goals: "Mantenimiento y bienestar general",
    internal_notes: "Nueva clienta, muy motivada",
    consents: {
      data_processing: true,
      marketing: true,
      health_data: true,
      consent_date: "2024-04-01",
    },
  },
};

export function useClient(clientId: string) {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useQuery({
    queryKey: ["client", clientId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        // Return demo client data
        const demoClient = demoClientDetails[clientId] || demoClients.find(c => c.id === clientId);
        if (demoClient) {
          return { data: demoClient };
        }
        // Return first demo client as fallback
        return { data: { ...demoClientDetails["demo-client-1"], id: clientId } };
      }
      return clientsApi.get(clientId);
    },
    select: (response) => response.data,
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useMutation({
    mutationFn: async (data: Partial<Client>) => {
      if (isDemoMode) {
        // Simulate creating a client in demo mode
        return {
          data: {
            ...data,
            id: `demo-client-${Date.now()}`,
            created_at: new Date().toISOString(),
          },
        };
      }
      return clientsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      notifications.show({
        title: "Cliente creado",
        message: isDemoMode
          ? "Cliente creado (modo demo)"
          : "El cliente ha sido creado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al crear cliente",
        color: "red",
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", variables.id] });
      notifications.show({
        title: "Cliente actualizado",
        message: "El cliente ha sido actualizado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al actualizar cliente",
        color: "red",
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      notifications.show({
        title: "Cliente eliminado",
        message: "El cliente ha sido eliminado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al eliminar cliente",
        color: "red",
      });
    },
  });
}

// Demo tags data
const demoTags = [
  { id: "tag-1", name: "VIP", color: "#2D6A4F" },
  { id: "tag-2", name: "Nuevo", color: "#3B82F6" },
  { id: "tag-3", name: "Premium", color: "#8B5CF6" },
  { id: "tag-4", name: "Pérdida de peso", color: "#F59E0B" },
  { id: "tag-5", name: "Hipertrofia", color: "#EC4899" },
];

export function useClientTags() {
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useQuery({
    queryKey: ["client-tags", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return { data: demoTags };
      }
      return clientsApi.tags();
    },
    select: (response) => response.data,
  });
}

export function useCreateClientTag() {
  const queryClient = useQueryClient();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  return useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      if (isDemoMode) {
        // Simulate creating a tag in demo mode
        return { data: { ...data, id: `demo-tag-${Date.now()}` } };
      }
      return clientsApi.createTag(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tags"] });
      notifications.show({
        title: "Etiqueta creada",
        message: isDemoMode
          ? "Etiqueta creada (modo demo)"
          : "La etiqueta ha sido creada correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al crear etiqueta",
        color: "red",
      });
    },
  });
}
