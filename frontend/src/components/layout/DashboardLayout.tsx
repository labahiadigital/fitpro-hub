import {
  Box,
  Burger,
  Drawer,
  Group,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconBarbell,
  IconBell,
  IconBook,
  IconCalendarEvent,
  IconChartBar,
  IconCommand,
  IconCreditCard,
  IconFileText,
  IconForms,
  IconHistory,
  IconLayoutDashboard,
  IconMessage,
  IconPackage,
  IconProgress,
  IconRobot,
  IconSalad,
  IconSearch,
  IconSettings,
  IconTrophy,
  IconUsers,
  IconUsersGroup,
  IconVideo,
} from "@tabler/icons-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { MouseSpotlight } from "../common/MouseSpotlight";
import { Sidebar } from "./Sidebar";

// --- TIPOS Y DATOS ---

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
}

// Lista completa de navegación para Entrenadores
const trainerNavItems: NavItemProps[] = [
  { icon: <IconLayoutDashboard size={20} />, label: "Panel Principal", to: "/dashboard" },
  { icon: <IconUsers size={20} />, label: "Clientes", to: "/clients" },
  { icon: <IconCalendarEvent size={20} />, label: "Calendario", to: "/calendar" },
  { icon: <IconBarbell size={20} />, label: "Entrenamientos", to: "/workouts" },
  { icon: <IconSalad size={20} />, label: "Nutrición", to: "/nutrition" },
  { icon: <IconForms size={20} />, label: "Formularios", to: "/forms" },
  { icon: <IconFileText size={20} />, label: "Documentos", to: "/documents" },
  { icon: <IconMessage size={20} />, label: "Chat", to: "/chat", badge: 3 },
  { icon: <IconCreditCard size={20} />, label: "Pagos", to: "/payments" },
  { icon: <IconPackage size={20} />, label: "Bonos", to: "/packages" },
  { icon: <IconTrophy size={20} />, label: "Comunidad", to: "/community" },
  { icon: <IconUsersGroup size={20} />, label: "Equipo", to: "/team" },
  { icon: <IconRobot size={20} />, label: "Automatizaciones", to: "/automations" },
  { icon: <IconChartBar size={20} />, label: "Reportes", to: "/reports" },
  { icon: <IconBook size={20} />, label: "Academia / LMS", to: "/lms" },
  { icon: <IconVideo size={20} />, label: "Clases en Vivo", to: "/live-classes" },
  { icon: <IconSettings size={20} />, label: "Configuración", to: "/settings" },
];

// Lista completa de navegación para Clientes
const clientNavItems: NavItemProps[] = [
  { icon: <IconLayoutDashboard size={20} />, label: "Mi Panel", to: "/dashboard" },
  { icon: <IconBarbell size={20} />, label: "Mis Entrenamientos", to: "/workouts" },
  { icon: <IconSalad size={20} />, label: "Mi Nutrición", to: "/nutrition" },
  { icon: <IconProgress size={20} />, label: "Mi Progreso", to: "/progress" },
  { icon: <IconCalendarEvent size={20} />, label: "Mis Citas", to: "/calendar" },
  { icon: <IconHistory size={20} />, label: "Historial", to: "/history" },
  { icon: <IconMessage size={20} />, label: "Chat", to: "/chat", badge: 1 },
  { icon: <IconTrophy size={20} />, label: "Comunidad", to: "/community" },
  { icon: <IconFileText size={20} />, label: "Documentos", to: "/documents" },
  { icon: <IconSettings size={20} />, label: "Mi Perfil", to: "/settings" },
];

export function DashboardLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Choose nav items based on role (Mocked for now)
  // In real app, get from store
  const navItems = trainerNavItems;

  const toggleDesktop = () => setDesktopCollapsed(!desktopCollapsed);

  return (
    <MouseSpotlight className="layout-root" style={{ minHeight: "100vh", display: "flex" }}>
      {/* Desktop Sidebar (Floating Dock Style) */}
      <Box
        visibleFrom="sm"
        style={{
          width: desktopCollapsed ? 80 : 280,
          transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          padding: "12px",
        }}
      >
        <Sidebar 
          navItems={navItems} 
          collapsed={desktopCollapsed} 
          onToggle={toggleDesktop} 
        />
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        opened={mobileOpened}
        onClose={closeMobile}
        size="280px"
        padding={0}
        withCloseButton={false}
        hiddenFrom="sm"
        styles={{ body: { height: '100%', background: 'var(--bg-deep)' } }}
      >
        <Sidebar navItems={navItems} collapsed={false} onToggle={closeMobile} />
      </Drawer>

      {/* Main Content */}
      <Box
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : (desktopCollapsed ? 80 : 280),
          transition: "margin-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          minHeight: "100vh",
          position: "relative",
          background: "var(--bg-deep)",
        }}
      >
        {/* Floating Header */}
        <Box
          py="md"
          px="xl"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 90,
            background: "linear-gradient(180deg, var(--bg-deep) 0%, rgba(13, 13, 16, 0.8) 80%, transparent 100%)",
            backdropFilter: "blur(4px)",
            maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
          }}
        >
          <Group justify="space-between">
            <Group>
              <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" color="white" />
              
              {/* Context Breadcrumbs */}
              <Group gap={8} visibleFrom="xs">
                <Text c="dimmed" size="sm" fw={500}>App</Text>
                <Text c="dimmed" size="sm">/</Text>
                <Text c="white" size="sm" fw={600}>
                  {navItems.find(i => i.to === location.pathname)?.label || "Panel"}
                </Text>
              </Group>
            </Group>

            {/* Global Search Bar */}
            <Group 
              visibleFrom="sm"
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <Box
                style={{
                  width: 400,
                  height: 44,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 16px",
                  gap: 12,
                  transition: "all 0.2s ease",
                  cursor: "text",
                }}
                className="search-bar-hover"
              >
                <IconSearch size={16} color="var(--text-secondary)" />
                <Text size="sm" c="dimmed" style={{ flex: 1 }}>Buscar (clientes, rutinas, facturas)...</Text>
                <Group gap={4}>
                  <Box 
                    style={{ 
                      background: "rgba(255,255,255,0.1)", 
                      padding: "2px 6px", 
                      borderRadius: "4px",
                      border: "1px solid rgba(255,255,255,0.05)" 
                    }}
                  >
                    <Group gap={2}>
                      <IconCommand size={10} color="gray" />
                      <Text size="10px" fw={700} c="gray">K</Text>
                    </Group>
                  </Box>
                </Group>
              </Box>
            </Group>

            {/* Right Actions */}
            <Group gap="sm">
              <UnstyledButton
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  position: "relative",
                  transition: "all 0.2s ease",
                }}
                className="action-btn-hover"
              >
                <IconBell size={20} color="var(--text-secondary)" />
                <Box
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#EF4444",
                    boxShadow: "0 0 8px rgba(239, 68, 68, 0.5)",
                  }}
                />
              </UnstyledButton>
            </Group>
          </Group>
        </Box>

        <Box p="xl" pt={0}>
          <Outlet />
        </Box>
      </Box>

      <style>{`
        .search-bar-hover:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
        .action-btn-hover:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </MouseSpotlight>
  );
}
