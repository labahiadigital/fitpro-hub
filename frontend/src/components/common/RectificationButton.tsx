import { ActionIcon, Button, Group, Stack, Text, Textarea, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFlag } from "@tabler/icons-react";
import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { useCreateRectification } from "../../hooks/useRectifications";

interface RectificationButtonProps {
  entityType: string;
  entityId?: string;
  entityName: string;
  size?: "xs" | "sm" | "md";
}

export function RectificationButton({ entityType, entityId, entityName, size = "sm" }: RectificationButtonProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [message, setMessage] = useState("");
  const createRectification = useCreateRectification();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    await createRectification.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      message: message.trim(),
    });
    setMessage("");
    close();
  };

  return (
    <>
      <Tooltip label="Solicitar rectificación">
        <ActionIcon
          color="orange"
          variant="subtle"
          size={size}
          radius="md"
          onClick={(e) => { e.stopPropagation(); open(); }}
        >
          <IconFlag size={size === "xs" ? 12 : 16} />
        </ActionIcon>
      </Tooltip>

      <BottomSheet opened={opened} onClose={close} title="Solicitar rectificación" desktopSize="sm">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Solicita la corrección de <strong>{entityName}</strong>
          </Text>
          <Textarea
            label="Describe la rectificación"
            placeholder="Indica qué información es incorrecta y cuál sería la correcta..."
            minRows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              loading={createRectification.isPending}
              disabled={!message.trim()}
              color="orange"
            >
              Enviar solicitud
            </Button>
          </Group>
        </Stack>
      </BottomSheet>
    </>
  );
}
