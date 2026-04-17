import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type TaskState = "created" | "archived" | "deleted";

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  team_group_id?: string;
  client_id?: string;
  created_by?: string;
  due_date?: string;
  due_time?: string;
  source?: string;
  source_ref?: string;
  archived_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  assigned_to?: string;
  client_id?: string;
  priority?: TaskPriority;
  state?: TaskState;
  search?: string;
  due_from?: string;
  due_to?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  team_group_id?: string;
  client_id?: string;
  due_date?: string;
  due_time?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  team_group_id?: string;
  client_id?: string;
  due_date?: string;
  due_time?: string;
}

export function useTasksList(
  filters: TaskFilters = {},
  options?: { enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);
  if (filters.client_id) params.set("client_id", filters.client_id);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.state) params.set("state", filters.state);
  if (filters.search) params.set("search", filters.search);
  if (filters.due_from) params.set("due_from", filters.due_from);
  if (filters.due_to) params.set("due_to", filters.due_to);

  const qs = params.toString();
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => api.get(`/tasks${qs ? `?${qs}` : ""}`),
    select: (response) => response.data as Task[],
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTaskData) => api.post("/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      notifications.show({ title: "Tarea creada", message: "La tarea se ha creado correctamente", color: "green" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo crear la tarea", color: "red" });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTaskData & { id: string }) =>
      api.patch(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo actualizar la tarea", color: "red" });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo mover la tarea", color: "red" });
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.patch(`/tasks/${id}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      notifications.show({ title: "Tarea archivada", message: "La tarea se ha archivado", color: "blue" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo archivar la tarea", color: "red" });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      notifications.show({ title: "Tarea eliminada", message: "La tarea se ha eliminado", color: "orange" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo eliminar la tarea", color: "red" });
    },
  });
}
