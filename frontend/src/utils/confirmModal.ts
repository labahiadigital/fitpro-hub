import { modals } from "@mantine/modals";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: string;
  onConfirm: () => void;
}

export function openConfirm({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  color = "red",
  onConfirm,
}: ConfirmOptions) {
  modals.openConfirmModal({
    title,
    children: message,
    labels: { confirm: confirmLabel, cancel: cancelLabel },
    confirmProps: { color },
    onConfirm,
  });
}

export function openDangerConfirm({
  title,
  message,
  confirmLabel = "Eliminar",
  onConfirm,
}: Omit<ConfirmOptions, "color" | "cancelLabel">) {
  openConfirm({
    title,
    message,
    confirmLabel,
    cancelLabel: "Cancelar",
    color: "red",
    onConfirm,
  });
}
