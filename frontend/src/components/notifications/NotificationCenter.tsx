import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Menu,
  Paper,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBell,
  IconCalendarEvent,
  IconCheck,
  IconCheckbox,
  IconCreditCard,
  IconDotsVertical,
  IconMessage,
  IconSettings,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useState } from "react";

interface Notification {
  id: string;
  type: "booking" | "payment" | "message" | "client" | "alert" | "system";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

interface NotificationCenterProps {
  opened: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const notificationIcons: Record<string, React.ReactNode> = {
  booking: <IconCalendarEvent size={18} />,
  payment: <IconCreditCard size={18} />,
  message: <IconMessage size={18} />,
  client: <IconUser size={18} />,
  alert: <IconAlertCircle size={18} />,
  system: <IconSettings size={18} />,
};

const notificationColors: Record<string, string> = {
  booking: "blue",
  payment: "green",
  message: "violet",
  client: "cyan",
  alert: "red",
  system: "gray",
};

export function NotificationCenter({
  opened,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<string | null>("all");

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.isRead;
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  return (
    <Drawer
      onClose={onClose}
      opened={opened}
      position="right"
      size="md"
      styles={{ body: { padding: 0 } }}
      title={
        <Group gap="sm">
          <IconBell size={20} />
          <Text fw={600}>Notificaciones</Text>
          {unreadCount > 0 && (
            <Badge circle color="red" size="sm">
              {unreadCount}
            </Badge>
          )}
        </Group>
      }
    >
      <Stack gap={0} h="100%">
        {/* Actions */}
        <Group
          justify="space-between"
          px="md"
          py="xs"
          style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
        >
          <Button
            disabled={unreadCount === 0}
            leftSection={<IconCheckbox size={14} />}
            onClick={onMarkAllAsRead}
            size="xs"
            variant="subtle"
          >
            Marcar todo como leído
          </Button>
          <Button
            color="red"
            disabled={notifications.length === 0}
            leftSection={<IconTrash size={14} />}
            onClick={onClearAll}
            size="xs"
            variant="subtle"
          >
            Limpiar todo
          </Button>
        </Group>

        {/* Tabs */}
        <Tabs onChange={setActiveTab} value={activeTab}>
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
            <Stack align="center" gap="sm" justify="center" py="xl">
              <ThemeIcon color="gray" radius="xl" size="xl" variant="light">
                <IconBell size={24} />
              </ThemeIcon>
              <Text c="dimmed" size="sm">
                No hay notificaciones
              </Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {filteredNotifications.map((notification) => (
                <Paper
                  key={notification.id}
                  onClick={() => {
                    if (!notification.isRead) onMarkAsRead(notification.id);
                  }}
                  p="md"
                  style={{
                    borderBottom: "1px solid var(--mantine-color-gray-1)",
                    background: notification.isRead
                      ? undefined
                      : "var(--mantine-color-blue-0)",
                    cursor: "pointer",
                  }}
                >
                  <Group
                    align="flex-start"
                    justify="space-between"
                    wrap="nowrap"
                  >
                    <Group align="flex-start" gap="sm" wrap="nowrap">
                      <ThemeIcon
                        color={notificationColors[notification.type]}
                        radius="xl"
                        size="md"
                        variant="light"
                      >
                        {notificationIcons[notification.type]}
                      </ThemeIcon>
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" mb={2}>
                          <Text
                            fw={notification.isRead ? 400 : 600}
                            lineClamp={1}
                            size="sm"
                          >
                            {notification.title}
                          </Text>
                          {!notification.isRead && (
                            <Badge color="blue" size="xs" variant="filled">
                              Nuevo
                            </Badge>
                          )}
                        </Group>
                        <Text c="dimmed" lineClamp={2} size="xs">
                          {notification.message}
                        </Text>
                        <Text c="dimmed" mt={4} size="xs">
                          {formatTimestamp(notification.timestamp)}
                        </Text>
                      </div>
                    </Group>
                    <Menu shadow="md" width={150}>
                      <Menu.Target>
                        <ActionIcon
                          color="gray"
                          onClick={(e) => e.stopPropagation()}
                          size="sm"
                          variant="subtle"
                        >
                          <IconDotsVertical size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {!notification.isRead && (
                          <Menu.Item
                            leftSection={<IconCheck size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(notification.id);
                            }}
                          >
                            Marcar leído
                          </Menu.Item>
                        )}
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notification.id);
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
          <Button
            leftSection={<IconSettings size={14} />}
            size="sm"
            variant="subtle"
          >
            Configurar notificaciones
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
