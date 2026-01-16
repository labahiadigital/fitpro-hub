import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: "info" | "success" | "warning" | "error" | "reminder";
  category?: string;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  action_label?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_booking_created: boolean;
  email_booking_cancelled: boolean;
  email_booking_reminder: boolean;
  email_payment_received: boolean;
  email_payment_failed: boolean;
  email_new_message: boolean;
  email_new_client: boolean;
  email_form_submitted: boolean;
  email_marketing: boolean;
  push_enabled: boolean;
  push_booking_created: boolean;
  push_booking_cancelled: boolean;
  push_booking_reminder: boolean;
  push_new_message: boolean;
  inapp_all: boolean;
}

export function useNotifications(params?: {
  category?: string;
  is_read?: boolean;
}) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: async () => {
      const response = await api.get("/notifications/", { params });
      return response.data;
    },
    refetchInterval: 30_000, // Refetch every 30 seconds
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const response = await api.get("/notifications/unread-count");
      return response.data;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await api.post("/notifications/mark-read", {
        notification_ids: notificationIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category?: string) => {
      const response = await api.post("/notifications/mark-all-read", {
        category,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const response = await api.get("/notifications/preferences");
      return response.data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<NotificationPreferences>) => {
      const response = await api.patch("/notifications/preferences", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
