import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconCheck, IconClock, IconTrash } from "@tabler/icons-react";

interface WaitlistEntry {
  id: string;
  clientName: string;
  clientEmail: string;
  addedAt: string;
  position: number;
}

interface WaitlistModalProps {
  opened: boolean;
  onClose: () => void;
  sessionTitle: string;
  waitlist: WaitlistEntry[];
  onPromote: (entryId: string) => void;
  onRemove: (entryId: string) => void;
}

export function WaitlistModal({
  opened,
  onClose,
  sessionTitle,
  waitlist,
  onPromote,
  onRemove,
}: WaitlistModalProps) {
  return (
    <Modal
      onClose={onClose}
      opened={opened}
      size="md"
      title={`Lista de Espera - ${sessionTitle}`}
    >
      {waitlist.length === 0 ? (
        <Text c="dimmed" py="xl" ta="center">
          No hay nadie en la lista de espera
        </Text>
      ) : (
        <Stack gap="sm">
          {waitlist.map((entry) => (
            <Paper key={entry.id} p="sm" radius="md" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <Badge circle color="gray" size="lg" variant="light">
                    {entry.position}
                  </Badge>
                  <Avatar color="blue" radius="xl" size="sm">
                    {entry.clientName.charAt(0)}
                  </Avatar>
                  <div>
                    <Text fw={500} size="sm">
                      {entry.clientName}
                    </Text>
                    <Group gap={4}>
                      <IconClock size={12} style={{ opacity: 0.5 }} />
                      <Text c="dimmed" size="xs">
                        {new Date(entry.addedAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Group>
                  </div>
                </Group>
                <Group gap="xs">
                  <Button
                    color="green"
                    leftSection={<IconCheck size={14} />}
                    onClick={() => onPromote(entry.id)}
                    size="xs"
                    variant="light"
                  >
                    Confirmar
                  </Button>
                  <ActionIcon
                    color="red"
                    onClick={() => onRemove(entry.id)}
                    size="sm"
                    variant="subtle"
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Modal>
  );
}
