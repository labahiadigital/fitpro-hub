import { Modal, Stack, Text, Group, Avatar, Badge, Button, ActionIcon, Paper } from '@mantine/core'
import { IconTrash, IconCheck, IconClock } from '@tabler/icons-react'

interface WaitlistEntry {
  id: string
  clientName: string
  clientEmail: string
  addedAt: string
  position: number
}

interface WaitlistModalProps {
  opened: boolean
  onClose: () => void
  sessionTitle: string
  waitlist: WaitlistEntry[]
  onPromote: (entryId: string) => void
  onRemove: (entryId: string) => void
}

export function WaitlistModal({ 
  opened, 
  onClose, 
  sessionTitle, 
  waitlist, 
  onPromote, 
  onRemove 
}: WaitlistModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Lista de Espera - ${sessionTitle}`}
      size="md"
    >
      {waitlist.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No hay nadie en la lista de espera
        </Text>
      ) : (
        <Stack gap="sm">
          {waitlist.map((entry) => (
            <Paper key={entry.id} withBorder p="sm" radius="md">
              <Group justify="space-between">
                <Group gap="sm">
                  <Badge size="lg" circle variant="light" color="gray">
                    {entry.position}
                  </Badge>
                  <Avatar size="sm" radius="xl" color="blue">
                    {entry.clientName.charAt(0)}
                  </Avatar>
                  <div>
                    <Text size="sm" fw={500}>{entry.clientName}</Text>
                    <Group gap={4}>
                      <IconClock size={12} style={{ opacity: 0.5 }} />
                      <Text size="xs" c="dimmed">
                        {new Date(entry.addedAt).toLocaleDateString('es-ES', { 
                          day: 'numeric', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </Group>
                  </div>
                </Group>
                <Group gap="xs">
                  <Button 
                    size="xs" 
                    variant="light" 
                    color="green"
                    leftSection={<IconCheck size={14} />}
                    onClick={() => onPromote(entry.id)}
                  >
                    Confirmar
                  </Button>
                  <ActionIcon 
                    size="sm" 
                    color="red" 
                    variant="subtle"
                    onClick={() => onRemove(entry.id)}
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
  )
}

