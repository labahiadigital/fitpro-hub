import { useState } from "react";
import {
  ActionIcon,
  Avatar,
  Box,
  Collapse,
  Group,
  Stack,
  Text,
  UnstyledButton,
  ScrollArea,
  Burger,
  Drawer,
  Popover,
  Divider,
  Badge,
  Loader,
  Tooltip,
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
  IconChartBar,
  IconBook,
  IconVideo,
  IconChartLine,
  IconChevronUp,
  IconChevronRight,
  IconCheck,
  IconBuildingStore,
  IconDownload,
  IconChecklist,
  IconBox,
  IconBuilding,
  IconTool,
  IconShield,
  IconClock,
} from "@tabler/icons-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore, type WorkspaceWithRole } from "../../stores/auth";
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
import { useMyForms, useMyPendingRequiredCount } from "../../hooks/useForms";
import { usePWAInstall } from "../../hooks/usePWAInstall";

// --- TIPOS Y DATOS ---

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
  onNavigate?: () => void;
}

interface NavItemDef {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
  requiredResource?: string;
}

interface NavGroupDef {
  icon: React.ReactNode;
  label: string;
  children: NavItemDef[];
}

type NavEntry = NavItemDef | NavGroupDef;

function isNavGroup(entry: NavEntry): entry is NavGroupDef {
  return "children" in entry;
}

const ALL_TRAINER_NAV_ENTRIES = (unreadCount: number): NavEntry[] => [
  { icon: <IconLayoutDashboard size={20} />, label: "Panel Principal", to: "/dashboard" },
  {
    icon: <IconCalendarEvent size={20} />,
    label: "Calendario y Tareas",
    children: [
      { icon: <IconCalendarEvent size={18} />, label: "Calendario", to: "/calendar", requiredResource: "calendar" },
      { icon: <IconChecklist size={18} />, label: "Tareas", to: "/tasks", requiredResource: "tasks" },
    ],
  },
  { icon: <IconUsers size={20} />, label: "Clientes", to: "/clients", requiredResource: "clients" },
  {
    icon: <IconReceipt size={20} />,
    label: "Facturación y Reportes",
    children: [
      { icon: <IconReceipt size={18} />, label: "Facturación", to: "/billing", requiredResource: "billing" },
      { icon: <IconChartBar size={18} />, label: "Reportes", to: "/reports", requiredResource: "reports" },
    ],
  },
  { icon: <IconMessage size={20} />, label: "Chat", to: "/chat", badge: unreadCount, requiredResource: "chat" },
  { icon: <IconBarbell size={20} />, label: "Entrenamientos", to: "/workouts", requiredResource: "workouts" },
  { icon: <IconSalad size={20} />, label: "Nutrición", to: "/nutrition", requiredResource: "nutrition" },
  {
    icon: <IconPackage size={20} />,
    label: "Catálogo y Stock",
    children: [
      { icon: <IconPackage size={18} />, label: "Catálogo", to: "/catalog", requiredResource: "catalog" },
      { icon: <IconBox size={18} />, label: "Stock", to: "/stock", requiredResource: "catalog" },
    ],
  },
  {
    icon: <IconBuilding size={20} />,
    label: "Boxes y Maquinaria",
    children: [
      { icon: <IconBuilding size={18} />, label: "Boxes", to: "/boxes", requiredResource: "catalog" },
      { icon: <IconTool size={18} />, label: "Maquinaria", to: "/machines", requiredResource: "catalog" },
    ],
  },
  {
    icon: <IconForms size={20} />,
    label: "Formularios y Docs",
    children: [
      { icon: <IconForms size={18} />, label: "Formularios", to: "/forms", requiredResource: "forms" },
      { icon: <IconFileText size={18} />, label: "Documentos", to: "/documents", requiredResource: "documents" },
    ],
  },
  {
    icon: <IconUsersGroup size={20} />,
    label: "Miembros y equipo",
    children: [
      { icon: <IconUsers size={18} />, label: "Miembros", to: "/team/members", requiredResource: "team" },
      { icon: <IconUsersGroup size={18} />, label: "Grupos", to: "/team/groups", requiredResource: "team" },
      { icon: <IconShield size={18} />, label: "Roles", to: "/team/roles", requiredResource: "team" },
      { icon: <IconClock size={18} />, label: "Control Horario", to: "/time-clock", requiredResource: "team" },
    ],
  },
  { icon: <IconTrophy size={20} />, label: "Comunidad", to: "/community", requiredResource: "community" },
  { icon: <IconBook size={20} />, label: "Academia / LMS", to: "/lms", requiredResource: "lms" },
  { icon: <IconVideo size={20} />, label: "Clases en Vivo", to: "/live-classes", requiredResource: "live_classes" },
];

function hasPermission(requiredResource: string | undefined, permissions?: Record<string, string[]>): boolean {
  if (!requiredResource) return true;
  if (!permissions || Object.keys(permissions).length === 0) return true;
  const resourcePerms = permissions[requiredResource];
  if (resourcePerms === undefined) return true;
  return resourcePerms.length > 0;
}

function filterNavEntries(entries: NavEntry[], permissions?: Record<string, string[]>): NavEntry[] {
  return entries.reduce<NavEntry[]>((acc, entry) => {
    if (isNavGroup(entry)) {
      const filtered = entry.children.filter((c) => hasPermission(c.requiredResource, permissions));
      if (filtered.length > 0) {
        acc.push({ ...entry, children: filtered });
      }
    } else {
      if (hasPermission(entry.requiredResource, permissions)) {
        acc.push(entry);
      }
    }
    return acc;
  }, []);
}

const getClientNavItems = (
  unreadCount: number,
  pendingRequiredForms = 0
): NavItemProps[] => [
  { icon: <IconLayoutDashboard size={20} />, label: "Mi Panel", to: "/dashboard" },
  { icon: <IconBarbell size={20} />, label: "Mis Entrenamientos", to: "/my-workouts" },
  { icon: <IconSalad size={20} />, label: "Mi Nutrición", to: "/my-nutrition" },
  { icon: <IconChartLine size={20} />, label: "Mi Progreso", to: "/my-progress" },
  { icon: <IconCalendarEvent size={20} />, label: "Mis Citas", to: "/my-calendar" },
  { icon: <IconMessage size={20} />, label: "Mensajes", to: "/my-messages", badge: unreadCount },
  { icon: <IconFileText size={20} />, label: "Mis Documentos", to: "/my-documents" },
  {
    icon: <IconForms size={20} />,
    label: "Formularios",
    to: "/my-forms",
    badge: pendingRequiredForms,
  },
  { icon: <IconBook size={20} />, label: "Academia", to: "/lms" },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  collaborator: "Colaborador",
  client: "Cliente",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "yellow",
  collaborator: "teal",
  client: "blue",
};

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
              flex: 1,
              whiteSpace: "normal",
              wordBreak: "break-word",
              lineHeight: 1.3,
            }}
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

function NavGroupItem({ icon, label, children, onNavigate, isOpen, onToggle }: NavGroupDef & { onNavigate?: () => void; isOpen: boolean; onToggle: () => void }) {
  const location = useLocation();
  const isChildActive = children.some(
    (c) => location.pathname === c.to || (c.to !== "/dashboard" && location.pathname.startsWith(c.to))
  );

  return (
    <Box>
      <UnstyledButton
        w="100%"
        p="10px"
        onClick={onToggle}
        style={{
          borderRadius: "12px",
          backgroundColor: isChildActive ? "rgba(255, 255, 255, 0.04)" : "transparent",
          color: isChildActive ? "#E7E247" : "rgba(255, 255, 255, 0.5)",
          transition: "all 0.2s ease",
        }}
        className="nav-item"
      >
        <Group gap="sm" wrap="nowrap">
          <Box style={{ opacity: isChildActive ? 1 : 0.8, flexShrink: 0 }}>{icon}</Box>
          <Text size="sm" fw={isChildActive ? 600 : 500} style={{ letterSpacing: "-0.01em", flex: 1, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3 }}>
            {label}
          </Text>
          <IconChevronRight
            size={14}
            style={{
              opacity: 0.5,
              flexShrink: 0,
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </Group>
      </UnstyledButton>
      <Collapse expanded={isOpen}>
        <Stack gap={0} pl={12} mt={2}>
          {children.map((child) => (
            <NavItem
              key={child.to}
              icon={child.icon}
              label={child.label}
              to={child.to}
              badge={child.badge}
              onNavigate={onNavigate}
            />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

function WorkspaceSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { user, currentWorkspace } = useAuthStore();
  const { logout, switchWorkspace, loading } = useAuth();
  const [opened, { toggle, close }] = useDisclosure(false);
  const navigate = useNavigate();

  const workspaces: WorkspaceWithRole[] = user?.workspaces || [];
  const currentWsId = currentWorkspace?.id || user?.workspace_id;

  const handleSwitch = async (wsId: string) => {
    if (wsId === currentWsId) {
      close();
      return;
    }
    close();
    onNavigate?.();
    await switchWorkspace(wsId);
  };

  return (
    <Popover
      opened={opened}
      onChange={(o) => { if (!o) close(); }}
      position="top-start"
      width={280}
      shadow="xl"
      radius="lg"
      offset={8}
    >
      <Popover.Target>
        <UnstyledButton
          w="100%"
          onClick={toggle}
          style={{
            padding: "10px",
            borderRadius: "12px",
            transition: "background 0.2s",
            background: opened ? "rgba(255, 255, 255, 0.06)" : "transparent",
          }}
          className="profile-btn"
        >
          <Group wrap="nowrap">
            <Avatar
              src={user?.avatar_url || null}
              radius="xl"
              color="yellow"
              size="sm"
              style={{ border: "2px solid rgba(255,255,255,0.1)" }}
            >
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
            <IconChevronUp
              size={14}
              color="gray"
              style={{
                opacity: 0.5,
                transform: opened ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 0.2s",
              }}
            />
          </Group>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown
        p={0}
        style={{
          background: "#1a1a2e",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Current user info */}
        <Box px="md" pt="md" pb="sm">
          <Group wrap="nowrap" gap="sm">
            <Avatar
              src={user?.avatar_url || null}
              radius="xl"
              color="yellow"
              size="md"
              style={{ border: "2px solid rgba(255,255,255,0.1)" }}
            >
              {user?.full_name?.[0]}
            </Avatar>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text c="white" size="sm" fw={700} lineClamp={1}>
                {user?.full_name || "Usuario"}
              </Text>
              <Text c="dimmed" size="xs" lineClamp={1}>
                {user?.email}
              </Text>
            </Box>
          </Group>
        </Box>

        <Divider color="rgba(255,255,255,0.06)" />

        {/* Workspace section */}
        <Box px="xs" py="xs">
          <Text c="dimmed" size="10px" fw={700} tt="uppercase" px="xs" pb={4} style={{ letterSpacing: "0.1em" }}>
            {workspaces.length > 1 ? "Tus espacios" : "Espacio actual"}
          </Text>

          <Stack gap={2}>
            {workspaces.map((ws) => {
              const isActive = ws.id === currentWsId;
              return (
                <UnstyledButton
                  key={ws.id}
                  w="100%"
                  px="xs"
                  py={8}
                  onClick={() => handleSwitch(ws.id)}
                  disabled={loading}
                  style={{
                    borderRadius: "8px",
                    background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                    transition: "background 0.15s",
                    opacity: loading ? 0.5 : 1,
                    cursor: loading ? "wait" : "pointer",
                  }}
                  className="profile-btn"
                >
                  <Group wrap="nowrap" gap="sm">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        background: isActive
                          ? "var(--nv-accent)"
                          : "rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {ws.logo_url ? (
                        <Avatar src={ws.logo_url} size={32} radius={8} />
                      ) : (
                        <IconBuildingStore
                          size={16}
                          color={isActive ? "#2A2822" : "rgba(255,255,255,0.4)"}
                        />
                      )}
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        c={isActive ? "white" : "rgba(255,255,255,0.7)"}
                        size="sm"
                        fw={isActive ? 600 : 500}
                        lineClamp={1}
                      >
                        {ws.name}
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        color={ROLE_COLORS[ws.role] || "gray"}
                        radius="sm"
                        style={{ textTransform: "capitalize" }}
                      >
                        {ROLE_LABELS[ws.role] || ws.role}
                      </Badge>
                    </Box>
                    {isActive && !loading && (
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="gray"
                          onClick={(e) => { e.stopPropagation(); navigate(ws.role === "client" ? "/my-profile" : "/settings"); close(); onNavigate?.(); }}
                        >
                          <IconSettings size={14} color="rgba(255,255,255,0.5)" />
                        </ActionIcon>
                        <IconCheck size={16} color="var(--nv-accent)" />
                      </Group>
                    )}
                    {isActive && loading && (
                      <Loader size={14} color="var(--nv-accent)" />
                    )}
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        </Box>

        <Divider color="rgba(255,255,255,0.06)" />

        {/* Logout */}
        <Box px="xs" py="xs">
          <UnstyledButton
            w="100%"
            px="xs"
            py={8}
            onClick={() => { close(); logout(); }}
            style={{
              borderRadius: "8px",
              transition: "background 0.15s",
            }}
            className="profile-btn"
          >
            <Group gap="sm">
              <IconLogout size={16} color="rgba(255,255,255,0.4)" />
              <Text c="rgba(255,255,255,0.5)" size="sm" fw={500}>
                Cerrar sesión
              </Text>
            </Group>
          </UnstyledButton>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}

// Sidebar Component
function SidebarContent({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { user, currentWorkspace } = useAuthStore();
  const location = useLocation();
  const isClient = user?.role === 'client';
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  
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
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  
  const unreadCount = unreadData?.unread_count || 0;

  // Badge de formularios obligatorios pendientes (solo para cliente)
  const { data: pendingRequiredData } = useMyPendingRequiredCount({ enabled: isClient });
  const pendingRequired = isClient ? pendingRequiredData?.pending_required || 0 : 0;

  const navEntries = isClient
    ? getClientNavItems(unreadCount, pendingRequired)
    : filterNavEntries(ALL_TRAINER_NAV_ENTRIES(unreadCount), user?.permissions);
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
          {isClient
            ? (navEntries as NavItemProps[]).map((item) => (
                <NavItem key={item.to} {...item} onNavigate={onNavigate} />
              ))
            : (navEntries as NavEntry[]).map((entry, idx) =>
                isNavGroup(entry) ? (
                  <NavGroupItem
                    key={`g-${idx}`}
                    {...entry}
                    onNavigate={onNavigate}
                    isOpen={openGroup === entry.label || (openGroup === null && entry.children.some((c) => location.pathname === c.to || (c.to !== "/dashboard" && location.pathname.startsWith(c.to))))}
                    onToggle={() => setOpenGroup((prev) => prev === entry.label ? null : entry.label)}
                  />
                ) : (
                  <NavItem key={entry.to} icon={entry.icon} label={entry.label} to={entry.to} badge={entry.badge} onNavigate={onNavigate} />
                )
              )
          }
        </Stack>
      </ScrollArea>

      {/* Workspace Switcher Footer */}
      <Box pt="md" mt="sm" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <WorkspaceSwitcher onNavigate={onNavigate} />
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
  "/stock": "Stock",
  "/boxes": "Boxes",
  "/machines": "Maquinaria",
  "/billing": "Facturación",
  "/community": "Comunidad",
  "/documents": "Documentos",
  "/team": "Equipo",
  "/team/members": "Miembros",
  "/team/groups": "Grupos",
  "/team/roles": "Roles",
  "/time-clock": "Control Horario",
  "/reports": "Reportes",
  "/settings": "Configuración",
  "/live-classes": "Clases en Vivo",
  "/chat": "Chat",
  "/lms": "Academia",
  "/tasks": "Tareas",
  "/my-workouts": "Mis Entrenamientos",
  "/my-nutrition": "Mi Nutrición",
  "/my-progress": "Mi Progreso",
  "/my-calendar": "Mis Citas",
  "/my-documents": "Mis Documentos",
  "/my-profile": "Mi Perfil",
  "/my-messages": "Mensajes",
  "/my-forms": "Formularios",
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
  const { user: layoutUser } = useAuthStore();
  const isClientLayout = layoutUser?.role === "client";

  const { data: notifData } = useNotifications(1, 20, notifOpen);
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();

  const unreadNotifCount = unreadData?.unread_count || 0;
  const { canInstall, install: installPWA } = usePWAInstall();

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

  // Formularios obligatorios pendientes (solo para cliente) — alertas persistentes
  const { data: myPendingForms = [] } = useMyForms("pending", { enabled: isClientLayout });
  const requiredPendingForms = (myPendingForms || [])
    .filter((f) => f.is_required)
    .map((f) => ({
      id: f.submission_id,
      form_id: f.form_id,
      title: f.form_name,
      message:
        f.form_description || "Tienes un formulario obligatorio pendiente.",
      link: "/my-forms",
    }));
  const hasPersistentAlert = requiredPendingForms.length > 0;

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
          display: "none",
          flexDirection: "column",
          width: 280,
        }}
      >
        <Box
          h="100%"
          style={{
            borderRadius: "24px",
            overflow: "hidden",
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
            {canInstall && (
              <Tooltip label="Instalar app" withArrow>
                <UnstyledButton aria-label="Instalar aplicación" onClick={installPWA}>
                  <IconDownload size={22} color="var(--nv-text-secondary)" stroke={1.5} />
                </UnstyledButton>
              </Tooltip>
            )}
            <UnstyledButton style={{ position: "relative" }} aria-label="Notificaciones" onClick={openNotif}>
              <IconBell size={22} color="var(--nv-text-secondary)" stroke={1.5} />
              {(unreadNotifCount > 0 || hasPersistentAlert) && (
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

      <CommandPalette opened={paletteOpen} close={closePalette} isClient={isClientLayout} />
      <NotificationCenter
        opened={notifOpen}
        onClose={closeNotif}
        notifications={mappedNotifications}
        requiredPendingForms={requiredPendingForms}
        onMarkAsRead={(id) => markRead.mutate(id)}
        onMarkAllAsRead={() => markAllRead.mutate()}
        onDelete={(id) => deleteNotif.mutate(id)}
        onClearAll={() => markAllRead.mutate()}
      />
    </div>
  );
}
