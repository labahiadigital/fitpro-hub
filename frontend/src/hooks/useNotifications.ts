import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../services/api";

export interface AppNotification {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  unread_count: number;
  page: number;
  size: number;
}

export function useNotifications(page = 1, size = 20, enabled = true) {
  return useQuery({
    queryKey: ["notifications", page, size],
    queryFn: async () => {
      const response = await notificationsApi.list({ page, size });
      return response.data as NotificationListResponse;
    },
    // The full notification list is only rendered inside the bell dropdown.
    // Only fetch when the dropdown is open (enabled=true). The unread badge
    // has its own lighter poll via useUnreadCount and invalidates this query
    // on mutations.
    enabled,
    refetchInterval: enabled ? 120_000 : false,
    staleTime: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const response = await notificationsApi.unreadCount();
      return response.data as { unread_count: number };
    },
    refetchInterval: 45_000,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await notificationsApi.markRead([notificationId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await notificationsApi.markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await notificationsApi.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export interface ChannelPref {
  email: boolean;
  in_app: boolean;
}

export type NotificationPrefsMap = Record<string, ChannelPref>;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const response = await notificationsApi.getPreferences();
      return response.data as NotificationPrefsMap;
    },
    staleTime: 60000,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, Partial<ChannelPref>>) => {
      const response = await notificationsApi.updatePreferences(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
