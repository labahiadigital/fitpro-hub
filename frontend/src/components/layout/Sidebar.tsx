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

  return (
    <Tooltip 
      label={label} 
      position="right" 
      withArrow 
      transitionProps={{ duration: 0 }}
      disabled={!collapsed}
      offset={20}
      color="dark"
    >
      <NavLink to={to} style={{ textDecoration: "none", width: "100%" }}>
        <UnstyledButton
          className={`dock-item ${isActive ? "active" : ""}`}
          py={12}
          px={collapsed ? 0 : 16}
          w="100%"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            // Colores específicos para el Sidebar Oscuro
            color: isActive ? "#E7E247" : "rgba(255, 255, 255, 0.6)", 
            background: isActive 
              ? "rgba(231, 226, 71, 0.1)" 
              : "transparent",
            borderRadius: "12px",
            marginBottom: "4px",
            position: "relative",
          }}
        >
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              color: isActive ? "#E7E247" : "currentColor",
              filter: isActive ? "drop-shadow(0 0 8px rgba(231, 226, 71, 0.3))" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {icon}
          </Box>

          {!collapsed && (
            <Group ml="md" style={{ flex: 1, overflow: "hidden" }} wrap="nowrap">
              <Text
                size="sm"
                fw={isActive ? 600 : 500}
                className="truncate"
                style={{
                  color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </Text>
              {badge && badge > 0 && (
                <Box
                  style={{
                    backgroundColor: "#E7E247",
                    color: "#3D3B30",
                    fontSize: "9px",
                    fontWeight: 800,
                    borderRadius: "99px",
                    padding: "0px 6px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {badge}
                </Box>
              )}
            </Group>
          )}
          
          {/* Active Indicator Bar (Left) handled by CSS .dock-item.active::after */}
        </UnstyledButton>
      </NavLink>
    </Tooltip>
  );
}

// --- Componente Sidebar Principal ---
interface SidebarProps {
  navItems: any[];
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ navItems, collapsed, onToggle }: SidebarProps) {
  const { user, currentWorkspace, logout, isDemoMode, demoRole } = useAuthStore();
  const isClientView = isDemoMode && demoRole === "client";

  return (
    <Box
      h="100%"
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-sidebar)", // #3D3B30 Dark Olive
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
        width: "100%",
        transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        color: "white",
        borderRadius: "24px", // Rounded corners for Floating Dock feel
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        overflow: "hidden"
      }}
    >
      {/* Brand Section */}
      <Box p={collapsed ? "xs" : "lg"} pb="md">
        <Group
          wrap="nowrap"
          justify={collapsed ? "center" : "space-between"}
          onClick={onToggle}
          style={{ cursor: "pointer" }}
        >
          <Group gap="sm" wrap="nowrap">
            <Box
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #E7E247 0%, #D4CF2E 100%)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(231, 226, 71, 0.15)",
                color: "#3D3B30",
                flexShrink: 0,
              }}
            >
              <Text fw={900} size="lg" style={{ fontFamily: "Space Grotesk" }}>T</Text>
            </Box>
            
            {!collapsed && (
              <Box style={{ overflow: "hidden" }}>
                <Text
                  c="white"
                  fw={700}
                  size="sm"
                  style={{ fontFamily: "Space Grotesk", letterSpacing: "-0.01em" }}
                >
                  Trackfiz
                </Text>
                <Text c="dimmed" size="xs" fw={500} className="truncate">
                  {currentWorkspace?.name || "Workspace"}
                </Text>
              </Box>
            )}
          </Group>
        </Group>

        {/* Demo Mode Badge */}
        {isDemoMode && !collapsed && (
          <Box
            mt="lg"
            p="xs"
            style={{
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Group gap="xs">
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isClientView ? "#A78BFA" : "#E7E247",
                  boxShadow: `0 0 8px ${isClientView ? "#A78BFA" : "#E7E247"}`,
                }}
              />
              <Text size="xs" fw={600} c="dimmed" style={{ textTransform: "uppercase", fontSize: "10px" }}>
                {isClientView ? "Vista Cliente" : "Vista Entrenador"}
              </Text>
            </Group>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <ScrollArea
        flex={1}
        px={collapsed ? 4 : "md"}
        type="scroll"
        className="sidebar-scroll"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 20px, black 95%, transparent)",
        }}
      >
        <Stack gap={4} py="sm">
          {!collapsed && (
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              px="xs"
              mb={8}
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: "10px",
                opacity: 0.5,
              }}
            >
              Navegación
            </Text>
          )}
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </Stack>
      </ScrollArea>

      {/* Footer Profile */}
      <Box p={collapsed ? "xs" : "md"} style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
        <Menu position="right-end" shadow="xl" width={240} withArrow arrowPosition="center">
          <Menu.Target>
            <UnstyledButton
              w="100%"
              p={4}
              style={{
                borderRadius: "12px",
                transition: "background-color 0.2s",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" },
              }}
            >
              <Group gap={collapsed ? 0 : "sm"} justify={collapsed ? "center" : "flex-start"}>
                <Avatar
                  src={null}
                  alt={user?.full_name}
                  radius="md"
                  size={32}
                  style={{ 
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "#E7E247",
                    color: "#3D3B30"
                  }}
                >
                  {user?.full_name?.charAt(0)}
                </Avatar>
                {!collapsed && (
                  <Box style={{ flex: 1, overflow: "hidden" }}>
                    <Text size="sm" fw={600} c="white" lineClamp={1}>
                      {user?.full_name}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {user?.email}
                    </Text>
                  </Box>
                )}
                {!collapsed && <IconSettings size={14} style={{ opacity: 0.5, color: "white" }} />}
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown style={{ background: "#3D3B30", borderColor: "rgba(255,255,255,0.1)", color: "white" }}>
            <Menu.Label c="dimmed">Mi Cuenta</Menu.Label>
            <Menu.Item leftSection={<IconSettings size={14} />} className="menu-item-hover">Configuración</Menu.Item>
            <Menu.Divider style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={logout} className="menu-item-hover">
              Cerrar Sesión
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>
      <style>{`
        .menu-item-hover:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </Box>
  );
}
