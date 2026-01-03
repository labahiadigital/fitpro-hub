import {
  Box,
  Group,
  Stack,
  Text,
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
  payment_due: { icon: IconCreditCard, color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.1)" },
  inactive_client: { icon: IconUserOff, color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.1)" },
  renewal_soon: { icon: IconCalendarDue, color: "#E7E247", bgColor: "rgba(231, 226, 71, 0.1)" },
  form_pending: { icon: IconForms, color: "#5C80BC", bgColor: "rgba(92, 128, 188, 0.1)" },
};

export function AlertsWidget({ alerts, onAlertClick }: AlertsWidgetProps) {
  return (
    <Box className="premium-card" p={{ base: "sm", lg: "md", xl: "lg" }} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Group justify="space-between" mb="sm">
        <Text className="stat-label">Acciones Requeridas</Text>
        {alerts.length > 0 && (
          <Box 
            className="pill-badge" 
            style={{ backgroundColor: "var(--nv-error-bg)", color: "var(--nv-error)", fontSize: "10px", padding: "4px 8px" }}
          >
            {alerts.length} Pendientes
          </Box>
        )}
      </Group>

      <Stack gap="xs" style={{ flex: 1 }}>
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <Box
              key={alert.id}
              onClick={() => onAlertClick?.(alert)}
              p="sm"
              style={{
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s",
                border: "1px solid transparent",
              }}
              className="alert-item-hover"
            >
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Group gap="sm" wrap="nowrap">
                  <Box
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      backgroundColor: config.bgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} style={{ color: config.color }} stroke={2} />
                  </Box>
                  <Box style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" c="var(--nv-dark)" lineClamp={1}>
                      {alert.title}
                    </Text>
                    <Text c="dimmed" size="xs" lineClamp={1}>
                      {alert.description}
                    </Text>
                  </Box>
                </Group>
                {onAlertClick && (
                  <IconChevronRight size={14} color="var(--nv-slate-light)" style={{ flexShrink: 0 }} />
                )}
              </Group>
            </Box>
          );
        })}
      </Stack>
      <style>{`
         .alert-item-hover:hover {
            background-color: var(--nv-surface-subtle);
            border-color: var(--border-subtle);
         }
      `}</style>
    </Box>
  );
}
