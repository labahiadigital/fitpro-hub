import { useMutation } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import api from "../services/api";

interface CreateRectificationData {
  entity_type: string;
  entity_id?: string;
  entity_name: string;
  message: string;
}

export function useCreateRectification() {
  return useMutation({
    mutationFn: async (data: CreateRectificationData) => {
      const res = await api.post("/rectifications", data);
      return res.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Solicitud enviada",
        message: "Tu solicitud de rectificación ha sido registrada",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "No se pudo enviar la solicitud",
        color: "red",
      });
    },
  });
}
