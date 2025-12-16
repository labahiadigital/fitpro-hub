import { useState } from 'react'
import {
  Drawer,
  Stack,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tabs,
  Paper,
  ThemeIcon,
  Button,
  Divider,
  ScrollArea,
  Menu,
} from '@mantine/core'
import {
  IconBell,
  IconCheck,
  IconCheckbox,
  IconTrash,
  IconCalendarEvent,
  IconCreditCard,
  IconMessage,
  IconUser,
  IconAlertCircle,
  IconSettings,
  IconDotsVertical,
} from '@tabler/icons-react'

interface Notification {
  id: string
  type: 'booking' | 'payment' | 'message' | 'client' | 'alert' | 'system'
  title: string
  message: string
  timestamp: string
  isRead: boolean
  actionUrl?: string
}

interface NotificationCenterProps {
  opened: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

const notificationIcons: Record<string, React.ReactNode> = {
  booking: <IconCalendarEvent size={18} />,
  payment: <IconCreditCard size={18} />,
  message: <IconMessage size={18} />,
  client: <IconUser size={18} />,
  alert: <IconAlertCircle size={18} />,
  system: <IconSettings size={18} />,
}

const notificationColors: Record<string, string> = {
  booking: 'blue',
  payment: 'green',
  message: 'violet',
  client: 'cyan',
  alert: 'red',
  system: 'gray',
}

export function NotificationCenter({
  opened,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<string | null>('all')

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !n.isRead
    return n.type === activeTab
  })

  const unreadCount = notifications.filter(n => !n.isRead).length

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconBell size={20} />
          <Text fw={600}>Notificaciones</Text>
          {unreadCount > 0 && (
            <Badge size="sm" color="red" circle>
              {unreadCount}
            </Badge>
          )}
        </Group>
      }
      position="right"
      size="md"
      styles={{ body: { padding: 0 } }}
    >
      <Stack gap={0} h="100%">
        {/* Actions */}
        <Group justify="space-between" px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconCheckbox size={14} />}
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Marcar todo como leído
          </Button>
          <Button
            variant="subtle"
            size="xs"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={onClearAll}
            disabled={notifications.length === 0}
          >
            Limpiar todo
          </Button>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List px="md">
            <Tabs.Tab value="all">Todas</Tabs.Tab>
            <Tabs.Tab value="unread">
              Sin leer {unreadCount > 0 && `(${unreadCount})`}
            </Tabs.Tab>
            <Tabs.Tab value="booking">Reservas</Tabs.Tab>
            <Tabs.Tab value="payment">Pagos</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Notifications List */}
        <ScrollArea style={{ flex: 1 }}>
          {filteredNotifications.length === 0 ? (
            <Stack align="center" justify="center" py="xl" gap="sm">
              <ThemeIcon size="xl" variant="light" color="gray" radius="xl">
                <IconBell size={24} />
              </ThemeIcon>
              <Text c="dimmed" size="sm">No hay notificaciones</Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {filteredNotifications.map((notification) => (
                <Paper
                  key={notification.id}
                  p="md"
                  style={{
                    borderBottom: '1px solid var(--mantine-color-gray-1)',
                    background: notification.isRead ? undefined : 'var(--mantine-color-blue-0)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (!notification.isRead) onMarkAsRead(notification.id)
                  }}
                >
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                      <ThemeIcon
                        size="md"
                        radius="xl"
                        variant="light"
                        color={notificationColors[notification.type]}
                      >
                        {notificationIcons[notification.type]}
                      </ThemeIcon>
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" mb={2}>
                          <Text size="sm" fw={notification.isRead ? 400 : 600} lineClamp={1}>
                            {notification.title}
                          </Text>
                          {!notification.isRead && (
                            <Badge size="xs" color="blue" variant="filled">
                              Nuevo
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {notification.message}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {formatTimestamp(notification.timestamp)}
                        </Text>
                      </div>
                    </Group>
                    <Menu shadow="md" width={150}>
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconDotsVertical size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {!notification.isRead && (
                          <Menu.Item
                            leftSection={<IconCheck size={14} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkAsRead(notification.id)
                            }}
                          >
                            Marcar leído
                          </Menu.Item>
                        )}
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(notification.id)
                          }}
                        >
                          Eliminar
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </ScrollArea>

        {/* Footer */}
        <Divider />
        <Group justify="center" p="md">
          <Button variant="subtle" size="sm" leftSection={<IconSettings size={14} />}>
            Configurar notificaciones
          </Button>
        </Group>
      </Stack>
    </Drawer>
  )
}

