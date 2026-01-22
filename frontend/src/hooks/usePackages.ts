import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

export interface SessionPackage {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  total_sessions: number;
  price: number;
  validity_days: number;
  session_types: string[];
  is_active: boolean;
  sold_count: number;
  created_at: string;
  updated_at?: string;
}

export interface ClientPackage {
  id: string;
  workspace_id: string;
  client_id: string;
  package_id: string;
  package_name?: string;
  client_name?: string;
  client_email?: string;
  total_sessions: number;
  used_sessions: number;
  purchased_at: string;
  expires_at: string;
  status: "active" | "expired" | "exhausted";
}

interface PackageListResponse {
  items: SessionPackage[];
  total: number;
  page: number;
  size: number;
}

interface ClientPackageListResponse {
  items: ClientPackage[];
  total: number;
  page: number;
  size: number;
}

export function useSessionPackages(params?: { is_active?: boolean; page?: number }) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["session-packages", currentWorkspace?.id, params],
    queryFn: async () => {
      const response = await api.get("/products/packages/", {
        params: { workspace_id: currentWorkspace?.id, ...params },
      });
      return response.data as PackageListResponse;
    },
    enabled: !!currentWorkspace?.id,
    select: (data) => data.items,
  });
}

export function useClientPackages(params?: { client_id?: string; status?: string; page?: number }) {
  const { currentWorkspace } = useAuthStore();

  return useQuery({
    queryKey: ["client-packages", currentWorkspace?.id, params],
    queryFn: async () => {
      const response = await api.get("/products/client-packages/", {
        params: { workspace_id: currentWorkspace?.id, ...params },
      });
      return response.data as ClientPackageListResponse;
    },
    enabled: !!currentWorkspace?.id,
    select: (data) => data.items,
  });
}

export function useCreateSessionPackage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<SessionPackage>) => {
      const response = await api.post("/products/packages/", {
        ...data,
        workspace_id: currentWorkspace?.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-packages"] });
    },
  });
}

export function useUpdateSessionPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SessionPackage> }) => {
      const response = await api.patch(`/products/packages/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-packages"] });
    },
  });
}

export function useDeleteSessionPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/products/packages/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-packages"] });
    },
  });
}

export function useCreateClientPackage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { client_id: string; package_id: string }) => {
      const response = await api.post("/products/client-packages/", {
        ...data,
        workspace_id: currentWorkspace?.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-packages"] });
    },
  });
}

export function useUsePackageSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const response = await api.post(`/products/client-packages/${packageId}/use-session`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-packages"] });
    },
  });
}
