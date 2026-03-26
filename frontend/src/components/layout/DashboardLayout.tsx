import {
  Avatar,
  Box,
  Group,
  Stack,
  Text,
  UnstyledButton,
  ScrollArea,
  Burger,
  Drawer,
} from "@mantine/core";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import {
  IconLayoutDashboard,
  IconUsers,
  IconCalendarEvent,
  IconBarbell,
  IconSettings,
  IconLogout,
  IconSearch,
  IconBell,
  IconCommand,
  IconSalad,
  IconForms,
  IconFileText,
  IconMessage,
  IconPackage,
  IconReceipt,
  IconTrophy,
  IconUsersGroup,
  IconRobot,
  IconChartBar,
  IconBook,
  IconVideo,
  IconChartLine,
  IconUser,
  IconBulb,
} from "@tabler/icons-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../stores/auth";
import { clientPortalApi, messagesApi } from "../../services/api";
import { CommandPalette } from "../common/CommandPalette";
import { NotificationCenter } from "../notifications/NotificationCenter";
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
} from "../../hooks/useNotifications";

// --- TIPOS Y DATOS ---

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
  onNavigate?: () => void;
}

interface NavItemWithPermission extends NavItemProps {
  requiredResource?: string;
}

const ALL_TRAINER_NAV_ITEMS = (unreadCount: number): NavItemWithPermission[] => [
  { icon: <IconLayoutDashboard size={20} />, label: "Panel Principal", to: "/dashboard" },
  { icon: <IconUsers size={20} />, label: "Clientes", to: "/clients", requiredResource: "clients" },
  { icon: <IconCalendarEvent size={20} />, label: "Calendario", to: "/calendar", requiredResource: "calendar" },
  { icon: <IconBarbell size={20} />, label: "Entrenamientos", to: "/workouts", requiredResource: "workouts" },
  { icon: <IconSalad size={20} />, label: "Nutrición", to: "/nutrition", requiredResource: "nutrition" },
  { icon: <IconForms size={20} />, label: "Formularios", to: "/forms", requiredResource: "forms" },
  { icon: <IconFileText size={20} />, label: "Documentos", to: "/documents", requiredResource: "documents" },
  { icon: <IconMessage size={20} />, label: "Chat", to: "/chat", badge: unreadCount, requiredResource: "chat" },
  { icon: <IconPackage size={20} />, label: "Catálogo", to: "/catalog", requiredResource: "catalog" },
  { icon: <IconReceipt size={20} />, label: "Facturación", to: "/billing", requiredResource: "billing" },
  { icon: <IconTrophy size={20} />, label: "Comunidad", to: "/community", requiredResource: "community" },
  { icon: <IconUsersGroup size={20} />, label: "Equipo", to: "/team", requiredResource: "team" },
  { icon: <IconRobot size={20} />, label: "Automatizaciones", to: "/automations", requiredResource: "automations" },
  { icon: <IconChartBar size={20} />, label: "Reportes", to: "/reports", requiredResource: "reports" },
  { icon: <IconBook size={20} />, label: "Academia / LMS", to: "/lms", requiredResource: "lms" },
  { icon: <IconVideo size={20} />, label: "Clases en Vivo", to: "/live-classes", requiredResource: "live_classes" },
  { icon: <IconBulb size={20} />, label: "Sugerencias", to: "/suggestions" },
  { icon: <IconSettings size={20} />, label: "Configuración", to: "/settings", requiredResource: "settings" },
];

function getTrainerNavItems(unreadCount: number, permissions?: Record<string, string[]>): NavItemProps[] {
  const items = ALL_TRAINER_NAV_ITEMS(unreadCount);
  if (!permissions || Object.keys(permissions).length === 0) {
    return items;
  }
  return items.filter((item) => {
    if (!item.requiredResource) return true;
    const resourcePerms = permissions[item.requiredResource];
    return resourcePerms && resourcePerms.length > 0;
  });
}

// Lista de navegación para Clientes (sin badge, se añade dinámicamente)
const getClientNavItems = (unreadCount: number): NavItemProps[] => [
  { icon: <IconLayoutDashboard size={20} />, label: "Mi Panel", to: "/dashboard" },
  { icon: <IconBarbell size={20} />, label: "Mis Entrenamientos", to: "/my-workouts" },
  { icon: <IconSalad size={20} />, label: "Mi Nutrición", to: "/my-nutrition" },
  { icon: <IconChartLine size={20} />, label: "Mi Progreso", to: "/my-progress" },
  { icon: <IconCalendarEvent size={20} />, label: "Mis Citas", to: "/my-calendar" },
  { icon: <IconMessage size={20} />, label: "Mensajes", to: "/my-messages", badge: unreadCount },
  { icon: <IconFileText size={20} />, label: "Mis Documentos", to: "/my-documents" },
  { icon: <IconBook size={20} />, label: "Academia", to: "/lms" },
  { icon: <IconUser size={20} />, label: "Mi Perfil", to: "/my-profile" },
];

// --- COMPONENTES ---

function NavItem({ icon, label, to, badge, onNavigate }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));

  return (
    <NavLink to={to} style={{ textDecoration: "none" }} onClick={onNavigate}>
      <UnstyledButton
        w="100%"
        p="10px"
        style={{
          borderRadius: "12px",
          backgroundColor: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
          color: isActive ? "#E7E247" : "rgba(255, 255, 255, 0.5)",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
        }}
        className="nav-item"
      >
        <Group gap="sm" wrap="nowrap">
          <Box style={{ opacity: isActive ? 1 : 0.8, transition: "opacity 0.2s" }}>
            {icon}
          </Box>
          <Text 
            size="sm" 
            fw={isActive ? 600 : 500} 
            style={{ 
              letterSpacing: "-0.01em",
              flex: 1
            }}
            lineClamp={1}
          >
            {label}
          </Text>
          {badge && badge > 0 && (
            <Box
              style={{
                backgroundColor: "#E7E247",
                color: "#2A2822",
                fontSize: "10px",
                fontWeight: 800,
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {badge}
            </Box>
          )}
        </Group>
        
        {/* Glow effect on active */}
        {isActive && (
          <Box
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: "3px",
              height: "20px",
              background: "#E7E247",
              borderRadius: "0 4px 4px 0",
              boxShadow: "0 0 12px rgba(231, 226, 71, 0.6)",
            }}
          />
        )}
      </UnstyledButton>
    </NavLink>
  );
}

// Sidebar Component (Reutilizable para Desktop y Mobile)
function SidebarContent({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { user, currentWorkspace } = useAuthStore();
  const { logout } = useAuth();
  
  // Determinar qué items de navegación mostrar según el rol
  const isClient = user?.role === 'client';
  
  // Fetch unread message count based on role
  const { data: unreadData } = useQuery({
    queryKey: ["unread-messages-count", isClient ? "client" : "trainer"],
    queryFn: async () => {
      if (isClient) {
        const response = await clientPortalApi.getUnreadCount();
        return response.data;
      } else {
        const response = await messagesApi.getUnreadCount();
        return response.data;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });
  
  const unreadCount = unreadData?.unread_count || 0;
  const navItems = isClient ? getClientNavItems(unreadCount) : getTrainerNavItems(unreadCount, user?.permissions);
  const menuTitle = isClient ? "Mi Espacio" : "Menú Principal";

  return (
    <Box
      h="100%"
      p="lg"
      style={{
        background: "var(--nv-dark-surface)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Logo */}
      <Group mb="xl" align="center">
        <Box
          style={{
            width: 36,
            height: 36,
            background: "var(--nv-accent)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "20px",
            color: "#2A2822",
            boxShadow: "0 0 20px rgba(231, 226, 71, 0.15)",
          }}
        >
          T
        </Box>
        <Box>
          <Text c="white" fw={700} size="lg" style={{ fontFamily: "Space Grotesk", lineHeight: 1 }}>
            Trackfiz
          </Text>
          <Text c="dimmed" size="xs" fw={500} style={{ fontSize: "11px" }}>
            {currentWorkspace?.name || "Espacio de Trabajo"}
          </Text>
        </Box>
      </Group>


      {/* Navigation Scroll Area */}
      <ScrollArea 
        flex={1} 
        scrollbars="y" 
        offsetScrollbars
        styles={{ 
          scrollbar: { backgroundColor: "transparent" }, 
          thumb: { backgroundColor: "rgba(255,255,255,0.1)" } 
        }}
      >
        <Stack gap={4}>
          <Text c="dimmed" size="xs" fw={700} tt="uppercase" mb={4} style={{ letterSpacing: "0.1em", fontSize: "10px", paddingLeft: "10px" }}>
            {menuTitle}
          </Text>
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </Stack>
      </ScrollArea>

      {/* User Profile Footer */}
      <Box pt="md" mt="sm" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <UnstyledButton
          w="100%"
          onClick={logout}
          style={{
            padding: "8px",
            borderRadius: "12px",
            transition: "background 0.2s",
          }}
          className="profile-btn"
        >
          <Group>
            <Avatar src={null} radius="xl" color="yellow" size="sm" style={{ border: "2px solid #2A2822" }}>
              {user?.full_name?.[0]}
            </Avatar>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text c="white" size="sm" fw={600} lh={1.2} lineClamp={1}>
                {user?.full_name || "Usuario"}
              </Text>
              <Text c="dimmed" size="xs" lh={1.2} lineClamp={1}>
                {user?.email}
              </Text>
            </Box>
            <IconLogout size={16} color="gray" style={{ opacity: 0.5 }} />
          </Group>
        </UnstyledButton>
      </Box>
    </Box>
  );
}

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Panel Principal",
  "/clients": "Clientes",
  "/calendar": "Calendario",
  "/workouts": "Entrenamientos",
  "/nutrition": "Nutrición",
  "/supplements": "Suplementos",
  "/forms": "Formularios",
  "/catalog": "Catálogo",
  "/billing": "Facturación",
  "/community": "Comunidad",
  "/documents": "Documentos",
  "/team": "Equipo",
  "/automations": "Automatizaciones",
  "/reports": "Informes",
  "/settings": "Configuración",
  "/live-classes": "Clases en Vivo",
  "/chat": "Chat",
  "/lms": "Academia",
  "/suggestions": "Sugerencias",
  "/my-workouts": "Mis Entrenamientos",
  "/my-nutrition": "Mi Nutrición",
  "/my-progress": "Mi Progreso",
  "/my-calendar": "Mis Citas",
  "/my-documents": "Mis Documentos",
  "/my-profile": "Mi Perfil",
  "/my-messages": "Mensajes",
};

function useBreadcrumb(): string {
  const { pathname } = useLocation();
  const base = "/" + pathname.split("/").filter(Boolean)[0];
  return ROUTE_LABELS[base] || "App";
}

export function DashboardLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const [paletteOpen, { open: openPalette, close: closePalette }] = useDisclosure(false);
  const [notifOpen, { open: openNotif, close: closeNotif }] = useDisclosure(false);
  const breadcrumbLabel = useBreadcrumb();

  const { data: notifData } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();

  const unreadNotifCount = unreadData?.unread_count || 0;

  const mappedNotifications = (notifData?.items || []).map((n) => ({
    id: n.id,
    type: (n.type === "reminder" ? "alert" : n.type === "info" ? "system" : n.type || "system") as
      "booking" | "payment" | "message" | "client" | "alert" | "system",
    title: n.title,
    message: n.body || "",
    timestamp: n.created_at,
    isRead: n.is_read,
    actionUrl: n.link || undefined,
  }));

  useHotkeys([["mod+K", () => openPalette()]]);

  return (
    <div className="layout-grid">
      {/* --- SIDEBAR FLOTANTE (DESKTOP) --- */}
      <Box
        component="nav"
        className="desktop-sidebar"
        p="md"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "none", // Oculto por defecto, visible en media query
          flexDirection: "column",
          width: 280,
        }}
      >
        <Box
          h="100%"
          style={{
            borderRadius: "24px",
            overflow: "hidden", // Para recortar el contenido en las esquinas redondeadas
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <SidebarContent />
        </Box>
      </Box>

      {/* --- MOBILE DRAWER --- */}
      <Drawer
        opened={opened}
        onClose={close}
        withCloseButton={false}
        size="280px"
        padding={0}
        styles={{ body: { height: '100%', background: 'var(--nv-dark-surface)' } }}
      >
        <SidebarContent onNavigate={close} />
      </Drawer>

      {/* --- MAIN CONTENT AREA --- */}
      <Box style={{ position: "relative", flex: 1, minWidth: 0 }}>
        {/* Floating Header */}
        <Box
          py="lg"
          px="xl"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 99,
            backdropFilter: "blur(12px)",
            background: "linear-gradient(to bottom, rgba(240, 242, 235, 0.9) 0%, rgba(240, 242, 235, 0.5) 100%)",
            borderBottom: "1px solid rgba(0,0,0,0.03)",
          }}
        >
          {/* Mobile Menu Toggle & Search */}
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Abrir menú de navegación" />
            
            <Group gap="xs" visibleFrom="xs">
              <Text c="dimmed" size="sm" fw={500}>App</Text>
              <Text c="dimmed" size="sm">/</Text>
              <Text size="sm" fw={600}>{breadcrumbLabel}</Text>
            </Group>
          </Group>

          {/* Global Search */}
          <UnstyledButton
            mx="auto"
            visibleFrom="sm"
            onClick={openPalette}
            aria-label="Abrir paleta de comandos (⌘K)"
            style={{
              background: "white",
              padding: "8px 16px",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.04)",
              width: "380px",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <IconSearch size={16} color="var(--nv-text-tertiary)" />
            <Text c="dimmed" size="sm" style={{ flex: 1 }}>Buscar...</Text>
            <Box style={{ background: "#F8F9FA", padding: "2px 6px", borderRadius: "6px", border: "1px solid #E9ECEF" }}>
              <Group gap={2}>
                <IconCommand size={10} color="gray" />
                <Text size="10px" fw={700} c="gray">K</Text>
              </Group>
            </Box>
          </UnstyledButton>

          {/* Actions */}
          <Group gap="md">
            <UnstyledButton style={{ position: "relative" }} aria-label="Notificaciones" onClick={openNotif}>
              <IconBell size={22} color="var(--nv-text-secondary)" stroke={1.5} />
              {unreadNotifCount > 0 && (
                <Box
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 2,
                    width: 8,
                    height: 8,
                    background: "#EF4444",
                    borderRadius: "50%",
                    border: "2px solid var(--nv-paper-bg)",
                  }}
                />
              )}
            </UnstyledButton>
          </Group>
        </Box>

        {/* Content Outlet */}
        <div className="content-area">
          <Outlet />
        </div>
      </Box>

      <CommandPalette opened={paletteOpen} close={closePalette} />
      <NotificationCenter
        opened={notifOpen}
        onClose={closeNotif}
        notifications={mappedNotifications}
        onMarkAsRead={(id) => markRead.mutate(id)}
        onMarkAllAsRead={() => markAllRead.mutate()}
        onDelete={(id) => deleteNotif.mutate(id)}
        onClearAll={() => markAllRead.mutate()}
      />
    </div>
  );
}
