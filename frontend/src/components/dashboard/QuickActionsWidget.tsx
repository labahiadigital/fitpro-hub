import {
  Box,
  Group,
  SimpleGrid,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBarbell,
  IconCalendarPlus,
  IconCreditCard,
  IconForms,
  IconMessage,
  IconRobot,
  IconSalad,
  IconUserPlus,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  path: string;
}

const quickActions: QuickAction[] = [
  { icon: IconUserPlus, label: "Nuevo Cliente", color: "var(--nv-primary)", bgColor: "var(--nv-primary-glow)", path: "/clients?action=new" },
  { icon: IconCalendarPlus, label: "Agendar", color: "var(--nv-success)", bgColor: "var(--nv-success-bg)", path: "/calendar?action=new" },
  { icon: IconBarbell, label: "Entrenamiento", color: "var(--nv-warning)", bgColor: "var(--nv-warning-bg)", path: "/workouts?action=new" },
  { icon: IconMessage, label: "Mensaje", color: "#8b5cf6", bgColor: "rgba(139, 92, 246, 0.1)", path: "/chat" },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <Box className="premium-card" p="lg">
      <Text className="text-label" mb="md">Acciones Rápidas</Text>

      <SimpleGrid cols={2} spacing="sm">
        {quickActions.map((action) => (
          <UnstyledButton
            key={action.path}
            onClick={() => navigate(action.path)}
            style={{
              padding: "12px",
              borderRadius: "12px",
              transition: "all 0.2s",
              backgroundColor: "var(--nv-surface-subtle)",
              border: "1px solid transparent"
            }}
            className="quick-action-btn"
          >
            <Group gap="sm" wrap="nowrap">
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  backgroundColor: action.bgColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <action.icon size={16} style={{ color: action.color }} />
              </Box>
              <Text fw={600} size="xs" style={{ color: "var(--nv-dark)" }}>
                {action.label}
              </Text>
            </Group>
          </UnstyledButton>
        ))}
      </SimpleGrid>

      <style>{`
        .quick-action-btn:hover {
          background-color: var(--nv-surface) !important;
          border-color: var(--border-medium) !important;
          box-shadow: var(--shadow-sm);
          transform: translateY(-1px);
        }
      `}</style>
    </Box>
  );
}
