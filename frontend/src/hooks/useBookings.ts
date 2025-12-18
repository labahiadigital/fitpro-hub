import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingsApi } from "../services/api";

interface Booking {
  id: string;
  workspace_id: string;
  organizer_id?: string;
  client_id?: string;
  title: string;
  description?: string;
  session_type: "individual" | "group";
  modality: "in_person" | "online";
  start_time: string;
  end_time: string;
  location: {
    type: string;
    address?: string;
    online_link?: string;
  };
  capacity: number;
  current_attendees: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  is_recurring: boolean;
  notes?: string;
  created_at: string;
}

interface BookingFilters {
  start_date?: string;
  end_date?: string;
  client_id?: string;
  status?: string;
}

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: () => bookingsApi.list(filters),
    select: (response) => response.data as Booking[],
  });
}

export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => bookingsApi.get(bookingId),
    select: (response) => response.data,
    enabled: !!bookingId,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Booking>) => bookingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      notifications.show({
        title: "Sesión creada",
        message: "La sesión ha sido creada correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al crear sesión",
        color: "red",
      });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Booking> }) =>
      bookingsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", variables.id] });
      notifications.show({
        title: "Sesión actualizada",
        message: "La sesión ha sido actualizada correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al actualizar sesión",
        color: "red",
      });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      notifications.show({
        title: "Sesión cancelada",
        message: "La sesión ha sido cancelada correctamente",
        color: "orange",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al cancelar sesión",
        color: "red",
      });
    },
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      notifications.show({
        title: "Sesión completada",
        message: "La sesión ha sido marcada como completada",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Error al completar sesión",
        color: "red",
      });
    },
  });
}
