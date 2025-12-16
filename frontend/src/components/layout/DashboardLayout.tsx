import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  AppShell,
  Group,
  Text,
  UnstyledButton,
  Stack,
  Avatar,
  Menu,
  ActionIcon,
  Box,
  Badge,
  Tooltip,
} from '@mantine/core'
import {
  IconLayoutDashboard,
  IconUsers,
  IconCalendarEvent,
  IconBarbell,
  IconSalad,
  IconMessage,
  IconCreditCard,
  IconSettings,
  IconLogout,
  IconChevronRight,
  IconBell,
  IconMoon,
  IconSun,
  IconForms,
  IconRobot,
  IconChartBar,
  IconPackage,
  IconTrophy,
} from '@tabler/icons-react'
import { useAuthStore } from '../../stores/auth'

interface NavItemProps {
  icon: React.ReactNode
  label: string
  to: string
  badge?: number
}

function NavItem({ icon, label, to, badge }: NavItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to
  
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      <UnstyledButton
        p="sm"
        w="100%"
        style={(theme) => ({
          borderRadius: theme.radius.md,
          backgroundColor: isActive ? 'var(--mantine-color-primary-0)' : 'transparent',
          color: isActive ? 'var(--mantine-color-primary-7)' : 'var(--mantine-color-gray-7)',
          fontWeight: isActive ? 600 : 400,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isActive
              ? 'var(--mantine-color-primary-1)'
              : 'var(--mantine-color-gray-0)',
          },
        })}
      >
        <Group justify="space-between">
          <Group gap="sm">
            {icon}
            <Text size="sm">{label}</Text>
          </Group>
          {badge && badge > 0 && (
            <Badge size="xs" circle color="red">
              {badge}
            </Badge>
          )}
        </Group>
      </UnstyledButton>
    </NavLink>
  )
}

export function DashboardLayout() {
  const { user, currentWorkspace, logout } = useAuthStore()
  const [darkMode, setDarkMode] = useState(false)
  
  const navItems: NavItemProps[] = [
    { icon: <IconLayoutDashboard size={20} />, label: 'Dashboard', to: '/dashboard' },
    { icon: <IconUsers size={20} />, label: 'Clientes', to: '/clients' },
    { icon: <IconCalendarEvent size={20} />, label: 'Calendario', to: '/calendar' },
    { icon: <IconBarbell size={20} />, label: 'Entrenamientos', to: '/workouts' },
    { icon: <IconSalad size={20} />, label: 'Nutrición', to: '/nutrition' },
    { icon: <IconForms size={20} />, label: 'Formularios', to: '/forms' },
    { icon: <IconMessage size={20} />, label: 'Chat', to: '/chat', badge: 3 },
    { icon: <IconCreditCard size={20} />, label: 'Pagos', to: '/payments' },
    { icon: <IconPackage size={20} />, label: 'Bonos', to: '/packages' },
    { icon: <IconTrophy size={20} />, label: 'Comunidad', to: '/community' },
    { icon: <IconRobot size={20} />, label: 'Automatizaciones', to: '/automations' },
    { icon: <IconChartBar size={20} />, label: 'Reportes', to: '/reports' },
    { icon: <IconSettings size={20} />, label: 'Configuración', to: '/settings' },
  ]
  
  return (
    <AppShell
      navbar={{
        width: 260,
        breakpoint: 'sm',
      }}
      padding="md"
    >
      <AppShell.Navbar p="md" style={{ borderRight: '1px solid var(--mantine-color-gray-2)' }}>
        {/* Logo */}
        <Box mb="xl">
          <Group>
            <Box
              w={40}
              h={40}
              style={{
                background: 'linear-gradient(135deg, var(--mantine-color-primary-6) 0%, var(--mantine-color-primary-8) 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text c="white" fw={700} size="lg">F</Text>
            </Box>
            <Box>
              <Text fw={700} size="md">FitPro Hub</Text>
              <Text size="xs" c="dimmed">{currentWorkspace?.name || 'Mi Workspace'}</Text>
            </Box>
          </Group>
        </Box>
        
        {/* Navigation */}
        <Stack gap={4} flex={1}>
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </Stack>
        
        {/* User Menu */}
        <Box pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Menu position="top-start" withArrow>
            <Menu.Target>
              <UnstyledButton
                p="sm"
                w="100%"
                style={(theme) => ({
                  borderRadius: theme.radius.md,
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-gray-0)',
                  },
                })}
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <Avatar radius="xl" color="primary" size="sm">
                      {user?.full_name?.charAt(0) || 'U'}
                    </Avatar>
                    <Box>
                      <Text size="sm" fw={500} lineClamp={1}>
                        {user?.full_name || 'Usuario'}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {user?.email}
                      </Text>
                    </Box>
                  </Group>
                  <IconChevronRight size={16} color="var(--mantine-color-gray-5)" />
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
                leftSection={<IconLogout size={14} />}
                color="red"
                onClick={logout}
              >
                Cerrar sesión
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
      </AppShell.Navbar>
      
      <AppShell.Main style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        {/* Top bar */}
        <Group
          justify="flex-end"
          mb="md"
          p="sm"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'var(--mantine-color-gray-0)',
          }}
        >
          <Group gap="xs">
            <Tooltip label="Notificaciones">
              <ActionIcon variant="subtle" color="gray" size="lg">
                <IconBell size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={darkMode ? 'Modo claro' : 'Modo oscuro'}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
