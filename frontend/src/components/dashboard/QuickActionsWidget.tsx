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
  IconMessage,
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
    <Box className="premium-card" p="sm">
      <Text className="stat-label" mb="xs" style={{ fontSize: "10px" }}>Acciones Rápidas</Text>

      <SimpleGrid cols={4} spacing={6}>
        {quickActions.map((action) => (
          <UnstyledButton
            key={action.path}
            onClick={() => navigate(action.path)}
            style={{
              padding: "8px",
              borderRadius: "8px",
              transition: "all 0.15s",
              backgroundColor: "var(--nv-surface-subtle)",
              border: "1px solid transparent"
            }}
            className="quick-action-btn"
          >
            <Group gap={6} wrap="nowrap">
              <Box
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "5px",
                  backgroundColor: action.bgColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <action.icon size={12} style={{ color: action.color }} />
              </Box>
              <Text fw={600} size="10px" style={{ color: "var(--nv-dark)" }} lineClamp={1}>
                {action.label}
              </Text>
            </Group>
          </UnstyledButton>
        ))}
      </SimpleGrid>

      <style>{`
        .quick-action-btn:hover {
          background-color: var(--nv-surface) !important;
          border-color: var(--border-subtle) !important;
          box-shadow: var(--shadow-xs);
        }
      `}</style>
    </Box>
  );
}
