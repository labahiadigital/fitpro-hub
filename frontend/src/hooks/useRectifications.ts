import i18next from "i18next";
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
        title: i18next.t("hooks.requestSent"),
        message: i18next.t("hooks.rectificationRequestSent"),
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: i18next.t("hooks.requestSendFailed"),
        color: "red",
      });
    },
  });
}
