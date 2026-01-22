import {
  Avatar,
  Box,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../stores/auth";

// --- Tipos y Datos ---
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
  collapsed?: boolean;
}

// --- Componente NavItem Individual ---
function NavItem({ icon, label, to, badge, collapsed }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  const content = (
    <UnstyledButton
      px={collapsed ? "xs" : "md"}
      py={10}
      style={{
        borderRadius: "12px",
        backgroundColor: isActive ? "rgba(231, 226, 71, 0.15)" : "transparent",
        color: isActive ? "#E7E247" : "rgba(255, 255, 255, 0.65)",
        fontWeight: isActive ? 600 : 500,
        transition: "all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)",
        position: "relative",
        border: isActive
          ? "1px solid rgba(231, 226, 71, 0.1)"
          : "1px solid transparent",
        display: "flex",
        justifyContent: collapsed ? "center" : "flex-start",
        alignItems: "center",
      }}
      w="100%"
      className={isActive ? "nav-active-glow" : "nav-item-hover"}
    >
      <Box
        style={{
          color: isActive ? "#E7E247" : "currentColor",
          display: "flex",
          alignItems: "center",
          opacity: isActive ? 1 : 0.8,
          minWidth: collapsed ? "auto" : 20,
        }}
      >
        {icon}
      </Box>

      {!collapsed && (
        <Group ml="sm" justify="space-between" style={{ flex: 1 }}>
          <Text
            size="sm"
            fw={isActive ? 600 : 500}
            style={{
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </Text>
          {badge && badge > 0 && (
            <Box
              style={{
                backgroundColor: "#EF4444",
                color: "white",
                fontSize: "10px",
                fontWeight: 700,
                borderRadius: "99px",
                padding: "1px 6px",
                boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)",
              }}
            >
              {badge}
            </Box>
          )}
        </Group>
      )}

      {/* Indicador de activo sutil */}
      {isActive && !collapsed && (
        <Box
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "3px",
            height: "20px",
            backgroundColor: "#E7E247",
            borderRadius: "0 4px 4px 0",
            boxShadow: "0 0 8px rgba(231, 226, 71, 0.5)",
          }}
        />
      )}
    </UnstyledButton>
  );

  if (collapsed) {
    return (
      <Tooltip label={label} position="right" withArrow transitionProps={{ duration: 0 }}>
        <NavLink style={{ textDecoration: "none" }} to={to}>
          {content}
        </NavLink>
      </Tooltip>
    );
  }

  return (
    <NavLink style={{ textDecoration: "none" }} to={to}>
      {content}
    </NavLink>
  );
}

// --- Componente Sidebar Principal ---
interface SidebarProps {
  navItems: any[];
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ navItems, collapsed, onToggle }: SidebarProps) {
  const { user, currentWorkspace } = useAuthStore();
  const { logout } = useAuth();

  return (
    <Box
      h="100%"
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#2A2822",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        width: "100%",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Brand Section */}
      <Box p={collapsed ? "xs" : "lg"} pb="xs">
        <Group
          gap={collapsed ? 0 : "sm"}
          mb="xs"
          justify={collapsed ? "center" : "flex-start"}
          onClick={onToggle}
          style={{ cursor: "pointer" }}
        >
          <Box
            style={{
              width: collapsed ? 32 : 42,
              height: collapsed ? 32 : 42,
              background: "linear-gradient(135deg, #E7E247 0%, #D4CF2E 100%)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(231, 226, 71, 0.2)",
              color: "#2A2822",
              flexShrink: 0,
              transition: "all 0.3s ease"
            }}
          >
            <Text fw={800} size={collapsed ? "md" : "xl"} style={{ letterSpacing: "-0.05em" }}>
              T
            </Text>
          </Box>
          {!collapsed && (
            <Box style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <Text
                c="white"
                fw={700}
                size="lg"
                style={{ letterSpacing: "-0.03em", lineHeight: 1.1 }}
              >
                Trackfiz
              </Text>
              <Text c="dimmed" size="xs" fw={500}>
                {currentWorkspace?.name || "Workspace"}
              </Text>
            </Box>
          )}
        </Group>

      </Box>

      {/* Navigation */}
      <ScrollArea
        flex={1}
        px="md"
        py="xs"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent, black 10px, black 95%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 10px, black 95%, transparent)",
        }}
      >
        <Stack gap={2}>
          {!collapsed && (
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              px="sm"
              mb={4}
              style={{
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: "10px",
              }}
            >
              Menu Principal
            </Text>
          )}
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </Stack>
      </ScrollArea>

      {/* Footer / User Profile */}
      <Box
        p="md"
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          backgroundColor: "rgba(0,0,0,0.2)",
        }}
      >
        <Menu position="right-end" shadow="lg" width={220}>
          <Menu.Target>
            <UnstyledButton
              w="100%"
              style={{
                padding: "8px",
                borderRadius: "10px",
                transition: "background-color 0.2s",
                display: "flex",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              className="user-btn-hover"
            >
              <Group gap="sm" wrap="nowrap">
                <Avatar
                  size={36}
                  radius="xl"
                  style={{
                    border: "2px solid #E7E247",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                  }}
                  src={null}
                  alt={user?.full_name}
                  color="dark"
                >
                  {user?.full_name?.charAt(0) || "U"}
                </Avatar>
                {!collapsed && (
                  <Box style={{ flex: 1, overflow: "hidden" }}>
                    <Text c="white" fw={600} size="sm" lineClamp={1}>
                      {user?.full_name || "Usuario"}
                    </Text>
                    <Text c="dimmed" size="xs" lineClamp={1}>
                      {user?.email}
                    </Text>
                  </Box>
                )}
                {!collapsed && (
                  <IconSettings size={16} color="rgba(255,255,255,0.4)" />
                )}
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown
            style={{
              backgroundColor: "#2A2822",
              borderColor: "rgba(255,255,255,0.1)",
              color: "white",
            }}
          >
            <Menu.Label c="dimmed">Mi Cuenta</Menu.Label>
            <Menu.Item
              leftSection={<IconSettings size={14} />}
              style={{ color: "white" }}
              className="menu-item-hover"
            >
              Configuración
            </Menu.Item>
            <Menu.Divider style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={14} />}
              onClick={logout}
              className="menu-item-hover"
            >
              Cerrar sesión
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Box>
  );
}

