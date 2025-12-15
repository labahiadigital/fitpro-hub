import { Paper, Title, Text, Group, Stack, Badge, Avatar, ActionIcon, ScrollArea } from '@mantine/core'
import { IconCalendarEvent, IconClock, IconMapPin, IconVideo, IconChevronRight } from '@tabler/icons-react'
import dayjs from 'dayjs'

interface Session {
  id: string
  title: string
  clientName: string
  clientAvatar?: string
  startTime: string
  endTime: string
  type: 'individual' | 'group'
  modality: 'in_person' | 'online'
  status: 'confirmed' | 'pending'
  location?: string
}

interface UpcomingSessionsWidgetProps {
  sessions: Session[]
  onSessionClick?: (session: Session) => void
  onViewAll?: () => void
}

export function UpcomingSessionsWidget({ sessions, onSessionClick, onViewAll }: UpcomingSessionsWidgetProps) {
  const today = dayjs()
  
  const groupedSessions = sessions.reduce((acc, session) => {
    const date = dayjs(session.startTime)
    const key = date.isSame(today, 'day') 
      ? 'Hoy' 
      : date.isSame(today.add(1, 'day'), 'day')
        ? 'Mañana'
        : date.format('dddd, D MMM')
    
    if (!acc[key]) acc[key] = []
    acc[key].push(session)
    return acc
  }, {} as Record<string, Session[]>)

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconCalendarEvent size={20} />
          <Title order={5}>Próximas Sesiones</Title>
        </Group>
        {onViewAll && (
          <Text 
            size="sm" 
            c="blue" 
            style={{ cursor: 'pointer' }}
            onClick={onViewAll}
          >
            Ver todas
          </Text>
        )}
      </Group>

      {sessions.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No hay sesiones programadas
        </Text>
      ) : (
        <ScrollArea h={280}>
          <Stack gap="md">
            {Object.entries(groupedSessions).map(([date, dateSessions]) => (
              <div key={date}>
                <Text size="xs" fw={600} c="dimmed" mb="xs">{date}</Text>
                <Stack gap="xs">
                  {dateSessions.map((session) => (
                    <Paper
                      key={session.id}
                      p="sm"
                      radius="sm"
                      withBorder
                      style={{ cursor: onSessionClick ? 'pointer' : 'default' }}
                      onClick={() => onSessionClick?.(session)}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <Avatar 
                            src={session.clientAvatar} 
                            size="sm" 
                            radius="xl"
                            color="blue"
                          >
                            {session.clientName.charAt(0)}
                          </Avatar>
                          <div style={{ minWidth: 0 }}>
                            <Group gap={4}>
                              <Text size="sm" fw={500} truncate>{session.title}</Text>
                              <Badge 
                                size="xs" 
                                variant="light"
                                color={session.status === 'confirmed' ? 'green' : 'yellow'}
                              >
                                {session.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                              </Badge>
                            </Group>
                            <Group gap="xs" mt={2}>
                              <Group gap={2}>
                                <IconClock size={12} style={{ opacity: 0.5 }} />
                                <Text size="xs" c="dimmed">
                                  {dayjs(session.startTime).format('HH:mm')} - {dayjs(session.endTime).format('HH:mm')}
                                </Text>
                              </Group>
                              <Group gap={2}>
                                {session.modality === 'online' ? (
                                  <IconVideo size={12} style={{ opacity: 0.5 }} />
                                ) : (
                                  <IconMapPin size={12} style={{ opacity: 0.5 }} />
                                )}
                                <Text size="xs" c="dimmed">
                                  {session.modality === 'online' ? 'Online' : session.location || 'Presencial'}
                                </Text>
                              </Group>
                            </Group>
                          </div>
                        </Group>
                        {onSessionClick && (
                          <ActionIcon variant="subtle" size="sm">
                            <IconChevronRight size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </div>
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Paper>
  )
}

