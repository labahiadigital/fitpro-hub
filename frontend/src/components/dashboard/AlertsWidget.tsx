import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconCalendarDue,
  IconChevronRight,
  IconCreditCard,
  IconForms,
  IconUserOff,
} from "@tabler/icons-react";

interface Alert {
  id: string;
  type: "payment_due" | "inactive_client" | "renewal_soon" | "form_pending";
  title: string;
  description: string;
  severity: "warning" | "error" | "info";
  actionUrl?: string;
}

interface AlertsWidgetProps {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
}

const alertConfig = {
  payment_due: { icon: IconCreditCard, color: "red" },
  inactive_client: { icon: IconUserOff, color: "orange" },
  renewal_soon: { icon: IconCalendarDue, color: "yellow" },
  form_pending: { icon: IconForms, color: "blue" },
};

export function AlertsWidget({ alerts, onAlertClick }: AlertsWidgetProps) {
  if (alerts.length === 0) {
    return (
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={5}>Alertas</Title>
          <Badge color="green" variant="light">
            Todo bien
          </Badge>
        </Group>
        <Text c="dimmed" py="xl" size="sm" ta="center">
          No hay alertas pendientes 🎉
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={5}>Alertas</Title>
        <Badge color="red" variant="filled">
          {alerts.length}
        </Badge>
      </Group>

      <ScrollArea h={200}>
        <Stack gap="xs">
          {alerts.map((alert) => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;

            return (
              <Paper
                key={alert.id}
                onClick={() => onAlertClick?.(alert)}
                p="sm"
                radius="sm"
                style={{ cursor: onAlertClick ? "pointer" : "default" }}
                withBorder
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                      color={config.color}
                      radius="xl"
                      size="md"
                      variant="light"
                    >
                      <Icon size={14} />
                    </ThemeIcon>
                    <div style={{ minWidth: 0 }}>
                      <Text fw={500} size="sm" truncate>
                        {alert.title}
                      </Text>
                      <Text c="dimmed" size="xs" truncate>
                        {alert.description}
                      </Text>
                    </div>
                  </Group>
                  {onAlertClick && (
                    <ActionIcon size="sm" variant="subtle">
                      <IconChevronRight size={14} />
                    </ActionIcon>
                  )}
                </Group>
              </Paper>
            );
          })}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
