import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBarbell,
  IconBell,
  IconBook,
  IconCalendarEvent,
  IconChartBar,
  IconChevronRight,
  IconCreditCard,
  IconFileText,
  IconForms,
  IconHistory,
  IconLayoutDashboard,
  IconLogout,
  IconMessage,
  IconMoon,
  IconPackage,
  IconProgress,
  IconRobot,
  IconSalad,
  IconSettings,
  IconSun,
  IconTrophy,
  IconUsers,
  IconUsersGroup,
  IconVideo,
} from "@tabler/icons-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/auth";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
}

function NavItem({ icon, label, to, badge }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink style={{ textDecoration: "none" }} to={to}>
      <UnstyledButton
        p="sm"
        style={(theme) => ({
          borderRadius: theme.radius.md,
          backgroundColor: isActive
            ? "var(--mantine-color-primary-0)"
            : "transparent",
          color: isActive
            ? "var(--mantine-color-primary-7)"
            : "var(--mantine-color-gray-7)",
          fontWeight: isActive ? 600 : 400,
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: isActive
              ? "var(--mantine-color-primary-1)"
              : "var(--mantine-color-gray-0)",
          },
        })}
        w="100%"
      >
        <Group justify="space-between">
          <Group gap="sm">
            {icon}
            <Text size="sm">{label}</Text>
          </Group>
          {badge && badge > 0 && (
            <Badge circle color="red" size="xs">
              {badge}
            </Badge>
          )}
        </Group>
      </UnstyledButton>
    </NavLink>
  );
}

// Navigation items for trainer/admin view
const trainerNavItems: NavItemProps[] = [
  {
    icon: <IconLayoutDashboard size={20} />,
    label: "Dashboard",
    to: "/dashboard",
  },
  { icon: <IconUsers size={20} />, label: "Clientes", to: "/clients" },
  {
    icon: <IconCalendarEvent size={20} />,
    label: "Calendario",
    to: "/calendar",
  },
  { icon: <IconBarbell size={20} />, label: "Entrenamientos", to: "/workouts" },
  { icon: <IconSalad size={20} />, label: "Nutrición", to: "/nutrition" },
  { icon: <IconForms size={20} />, label: "Formularios", to: "/forms" },
  { icon: <IconFileText size={20} />, label: "Documentos", to: "/documents" },
  { icon: <IconMessage size={20} />, label: "Chat", to: "/chat", badge: 3 },
  { icon: <IconCreditCard size={20} />, label: "Pagos", to: "/payments" },
  { icon: <IconPackage size={20} />, label: "Bonos", to: "/packages" },
  { icon: <IconTrophy size={20} />, label: "Comunidad", to: "/community" },
  { icon: <IconUsersGroup size={20} />, label: "Equipo", to: "/team" },
  {
    icon: <IconRobot size={20} />,
    label: "Automatizaciones",
    to: "/automations",
  },
  { icon: <IconChartBar size={20} />, label: "Reportes", to: "/reports" },
  { icon: <IconBook size={20} />, label: "Academia / LMS", to: "/lms" },
  { icon: <IconVideo size={20} />, label: "Clases en Vivo", to: "/live-classes" },
  { icon: <IconSettings size={20} />, label: "Configuración", to: "/settings" },
];

// Navigation items for client view
const clientNavItems: NavItemProps[] = [
  {
    icon: <IconLayoutDashboard size={20} />,
    label: "Mi Panel",
    to: "/dashboard",
  },
  {
    icon: <IconBarbell size={20} />,
    label: "Mis Entrenamientos",
    to: "/workouts",
  },
  { icon: <IconSalad size={20} />, label: "Mi Nutrición", to: "/nutrition" },
  { icon: <IconProgress size={20} />, label: "Mi Progreso", to: "/progress" },
  {
    icon: <IconCalendarEvent size={20} />,
    label: "Mis Citas",
    to: "/calendar",
  },
  { icon: <IconHistory size={20} />, label: "Historial", to: "/history" },
  { icon: <IconMessage size={20} />, label: "Chat", to: "/chat", badge: 1 },
  { icon: <IconTrophy size={20} />, label: "Comunidad", to: "/community" },
  { icon: <IconFileText size={20} />, label: "Documentos", to: "/documents" },
  { icon: <IconSettings size={20} />, label: "Mi Perfil", to: "/settings" },
];

export function DashboardLayout() {
  const { user, currentWorkspace, logout, demoRole, isDemoMode } =
    useAuthStore();
  const [darkMode, setDarkMode] = useState(false);

  // Determine which navigation to show based on role
  const isClientView = isDemoMode && demoRole === "client";
  const navItems = isClientView ? clientNavItems : trainerNavItems;

  return (
    <AppShell
      navbar={{
        width: 260,
        breakpoint: "sm",
      }}
      padding="md"
    >
      <AppShell.Navbar
        p="md"
        style={{ borderRight: "1px solid var(--mantine-color-gray-2)" }}
      >
        {/* Logo */}
        <Box mb="xl">
          <Group>
            <Box
              h={40}
              style={{
                background: isClientView
                  ? "linear-gradient(135deg, var(--mantine-color-violet-6) 0%, var(--mantine-color-violet-8) 100%)"
                  : "linear-gradient(135deg, var(--mantine-color-primary-6) 0%, var(--mantine-color-primary-8) 100%)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              w={40}
            >
              <Text c="white" fw={700} size="lg">
                T
              </Text>
            </Box>
            <Box>
              <Text fw={700} size="md">
                Trackfiz
              </Text>
              <Text c="dimmed" size="xs">
                {currentWorkspace?.name || "Mi Workspace"}
              </Text>
            </Box>
          </Group>
        </Box>

        {/* Demo Mode Indicator */}
        {isDemoMode && (
          <Box
            mb="md"
            p="xs"
            style={{
              borderRadius: 8,
              background: isClientView
                ? "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)"
                : "linear-gradient(135deg, rgba(45, 106, 79, 0.1) 0%, rgba(45, 106, 79, 0.05) 100%)",
              border: isClientView
                ? "1px solid var(--mantine-color-violet-2)"
                : "1px solid var(--mantine-color-teal-2)",
            }}
          >
            <Group gap="xs" justify="center">
              <Badge
                color={isClientView ? "violet" : "teal"}
                size="sm"
                variant="light"
              >
                {isClientView ? "👤 Vista Cliente" : "💪 Vista Entrenador"}
              </Badge>
            </Group>
          </Box>
        )}

        {/* Navigation */}
        <Stack flex={1} gap={4}>
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </Stack>

        {/* User Menu */}
        <Box
          pt="md"
          style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
        >
          <Menu position="top-start" withArrow>
            <Menu.Target>
              <UnstyledButton
                p="sm"
                style={(theme) => ({
                  borderRadius: theme.radius.md,
                  "&:hover": {
                    backgroundColor: "var(--mantine-color-gray-0)",
                  },
                })}
                w="100%"
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <Avatar color="primary" radius="xl" size="sm">
                      {user?.full_name?.charAt(0) || "U"}
                    </Avatar>
                    <Box>
                      <Text fw={500} lineClamp={1} size="sm">
                        {user?.full_name || "Usuario"}
                      </Text>
                      <Text c="dimmed" lineClamp={1} size="xs">
                        {user?.email}
                      </Text>
                    </Box>
                  </Group>
                  <IconChevronRight
                    color="var(--mantine-color-gray-5)"
                    size={16}
                  />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Cuenta</Menu.Label>
              <Menu.Item leftSection={<IconSettings size={14} />}>
                Configuración
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={logout}
              >
                Cerrar sesión
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
        {/* Top bar */}
        <Group
          justify="flex-end"
          mb="md"
          p="sm"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            backgroundColor: "var(--mantine-color-gray-0)",
          }}
        >
          <Group gap="xs">
            <Tooltip label="Notificaciones">
              <ActionIcon color="gray" size="lg" variant="subtle">
                <IconBell size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={darkMode ? "Modo claro" : "Modo oscuro"}>
              <ActionIcon
                color="gray"
                onClick={() => setDarkMode(!darkMode)}
                size="lg"
                variant="subtle"
              >
                {darkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
