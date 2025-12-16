import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Avatar,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  SimpleGrid,
  Card,
  ThemeIcon,
  Menu,
  Switch,
  Divider,
  Tooltip,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import {
  IconUsers,
  IconUserPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconMail,
  IconCalendarEvent,
  IconCurrencyEuro,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'trainer' | 'receptionist'
  avatar?: string
  status: 'active' | 'pending' | 'inactive'
  permissions: {
    clients: boolean
    calendar: boolean
    payments: boolean
    reports: boolean
    settings: boolean
  }
  stats: {
    clients: number
    sessionsThisMonth: number
    revenue: number
  }
}

const roleLabels: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  trainer: 'Entrenador',
  receptionist: 'Recepcionista',
}

const roleColors: Record<string, string> = {
  owner: 'violet',
  admin: 'blue',
  trainer: 'green',
  receptionist: 'gray',
}

export function TeamPage() {
  const [inviteModalOpened, { open: openInviteModal, close: closeInviteModal }] = useDisclosure(false)
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  // Mock data
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Juan García',
      email: 'juan@fitprohub.com',
      role: 'owner',
      status: 'active',
      permissions: { clients: true, calendar: true, payments: true, reports: true, settings: true },
      stats: { clients: 45, sessionsThisMonth: 120, revenue: 8500 },
    },
    {
      id: '2',
      name: 'María López',
      email: 'maria@fitprohub.com',
      role: 'trainer',
      status: 'active',
      permissions: { clients: true, calendar: true, payments: false, reports: false, settings: false },
      stats: { clients: 25, sessionsThisMonth: 80, revenue: 4200 },
    },
    {
      id: '3',
      name: 'Carlos Rodríguez',
      email: 'carlos@fitprohub.com',
      role: 'trainer',
      status: 'active',
      permissions: { clients: true, calendar: true, payments: false, reports: false, settings: false },
      stats: { clients: 18, sessionsThisMonth: 65, revenue: 3100 },
    },
    {
      id: '4',
      name: 'Ana Martínez',
      email: 'ana@fitprohub.com',
      role: 'receptionist',
      status: 'pending',
      permissions: { clients: true, calendar: true, payments: false, reports: false, settings: false },
      stats: { clients: 0, sessionsThisMonth: 0, revenue: 0 },
    },
  ])

  const inviteForm = useForm({
    initialValues: {
      email: '',
      role: 'trainer',
      permissions: {
        clients: true,
        calendar: true,
        payments: false,
        reports: false,
        settings: false,
      },
    },
  })

  const totalMembers = teamMembers.length
  const activeMembers = teamMembers.filter(m => m.status === 'active').length
  const totalRevenue = teamMembers.reduce((sum, m) => sum + m.stats.revenue, 0)

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member)
    openEditModal()
  }

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Equipo"
        description="Gestiona los miembros de tu equipo y sus permisos"
        action={{
          label: 'Invitar Miembro',
          icon: <IconUserPlus size={16} />,
          onClick: openInviteModal,
        }}
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Miembros del Equipo</Text>
              <Text size="xl" fw={700}>{totalMembers}</Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconUsers size={20} />
            </ThemeIcon>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            {activeMembers} activos, {totalMembers - activeMembers} pendientes
          </Text>
        </Card>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Sesiones Este Mes</Text>
              <Text size="xl" fw={700}>
                {teamMembers.reduce((sum, m) => sum + m.stats.sessionsThisMonth, 0)}
              </Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="green" variant="light">
              <IconCalendarEvent size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Ingresos del Equipo</Text>
              <Text size="xl" fw={700}>€{totalRevenue.toLocaleString()}</Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="violet" variant="light">
              <IconCurrencyEuro size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Team Members */}
      <Stack gap="md">
        {teamMembers.map((member) => (
          <Paper key={member.id} withBorder radius="md" p="lg">
            <Group justify="space-between">
              <Group gap="md">
                <Avatar size="lg" radius="xl" color={roleColors[member.role]}>
                  {member.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
                <div>
                  <Group gap="xs">
                    <Text fw={600}>{member.name}</Text>
                    <Badge size="sm" color={roleColors[member.role]} variant="light">
                      {roleLabels[member.role]}
                    </Badge>
                    {member.status === 'pending' && (
                      <Badge size="sm" color="yellow" variant="light">
                        Pendiente
                      </Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">{member.email}</Text>
                </div>
              </Group>

              <Group gap="xl">
                {/* Stats */}
                <Group gap="lg" visibleFrom="md">
                  <div style={{ textAlign: 'center' }}>
                    <Text size="lg" fw={700}>{member.stats.clients}</Text>
                    <Text size="xs" c="dimmed">Clientes</Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Text size="lg" fw={700}>{member.stats.sessionsThisMonth}</Text>
                    <Text size="xs" c="dimmed">Sesiones</Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Text size="lg" fw={700}>€{member.stats.revenue}</Text>
                    <Text size="xs" c="dimmed">Ingresos</Text>
                  </div>
                </Group>

                {/* Permissions Icons */}
                <Group gap={4}>
                  <Tooltip label={member.permissions.clients ? 'Puede ver clientes' : 'Sin acceso a clientes'}>
                    <ThemeIcon
                      size="sm"
                      radius="xl"
                      color={member.permissions.clients ? 'green' : 'gray'}
                      variant="light"
                    >
                      {member.permissions.clients ? <IconCheck size={12} /> : <IconX size={12} />}
                    </ThemeIcon>
                  </Tooltip>
                  <Tooltip label={member.permissions.payments ? 'Puede ver pagos' : 'Sin acceso a pagos'}>
                    <ThemeIcon
                      size="sm"
                      radius="xl"
                      color={member.permissions.payments ? 'green' : 'gray'}
                      variant="light"
                    >
                      {member.permissions.payments ? <IconCheck size={12} /> : <IconX size={12} />}
                    </ThemeIcon>
                  </Tooltip>
                  <Tooltip label={member.permissions.settings ? 'Puede ver configuración' : 'Sin acceso a configuración'}>
                    <ThemeIcon
                      size="sm"
                      radius="xl"
                      color={member.permissions.settings ? 'green' : 'gray'}
                      variant="light"
                    >
                      {member.permissions.settings ? <IconCheck size={12} /> : <IconX size={12} />}
                    </ThemeIcon>
                  </Tooltip>
                </Group>

                {/* Actions */}
                <Menu shadow="md" width={180}>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconEdit size={14} />}
                      onClick={() => handleEditMember(member)}
                    >
                      Editar Permisos
                    </Menu.Item>
                    {member.status === 'pending' && (
                      <Menu.Item leftSection={<IconMail size={14} />}>
                        Reenviar Invitación
                      </Menu.Item>
                    )}
                    {member.role !== 'owner' && (
                      <>
                        <Menu.Divider />
                        <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                          Eliminar del Equipo
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>

      {/* Invite Modal */}
      <Modal opened={inviteModalOpened} onClose={closeInviteModal} title="Invitar Miembro" centered>
        <form onSubmit={inviteForm.onSubmit((values) => {
          console.log(values)
          closeInviteModal()
        })}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="email@ejemplo.com"
              leftSection={<IconMail size={14} />}
              {...inviteForm.getInputProps('email')}
            />
            <Select
              label="Rol"
              data={[
                { value: 'admin', label: 'Administrador' },
                { value: 'trainer', label: 'Entrenador' },
                { value: 'receptionist', label: 'Recepcionista' },
              ]}
              {...inviteForm.getInputProps('role')}
            />
            <Divider label="Permisos" labelPosition="center" />
            <Stack gap="xs">
              <Switch
                label="Gestión de Clientes"
                description="Ver y editar clientes"
                {...inviteForm.getInputProps('permissions.clients', { type: 'checkbox' })}
              />
              <Switch
                label="Calendario"
                description="Ver y gestionar reservas"
                {...inviteForm.getInputProps('permissions.calendar', { type: 'checkbox' })}
              />
              <Switch
                label="Pagos"
                description="Ver pagos y suscripciones"
                {...inviteForm.getInputProps('permissions.payments', { type: 'checkbox' })}
              />
              <Switch
                label="Reportes"
                description="Ver estadísticas y reportes"
                {...inviteForm.getInputProps('permissions.reports', { type: 'checkbox' })}
              />
              <Switch
                label="Configuración"
                description="Modificar ajustes del workspace"
                {...inviteForm.getInputProps('permissions.settings', { type: 'checkbox' })}
              />
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeInviteModal}>Cancelar</Button>
              <Button type="submit" leftSection={<IconMail size={14} />}>
                Enviar Invitación
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editModalOpened}
        onClose={closeEditModal}
        title={`Editar Permisos - ${selectedMember?.name}`}
        centered
      >
        {selectedMember && (
          <Stack>
            <Select
              label="Rol"
              data={[
                { value: 'admin', label: 'Administrador' },
                { value: 'trainer', label: 'Entrenador' },
                { value: 'receptionist', label: 'Recepcionista' },
              ]}
              value={selectedMember.role}
              disabled={selectedMember.role === 'owner'}
            />
            <Divider label="Permisos" labelPosition="center" />
            <Stack gap="xs">
              <Switch
                label="Gestión de Clientes"
                checked={selectedMember.permissions.clients}
                disabled={selectedMember.role === 'owner'}
              />
              <Switch
                label="Calendario"
                checked={selectedMember.permissions.calendar}
                disabled={selectedMember.role === 'owner'}
              />
              <Switch
                label="Pagos"
                checked={selectedMember.permissions.payments}
                disabled={selectedMember.role === 'owner'}
              />
              <Switch
                label="Reportes"
                checked={selectedMember.permissions.reports}
                disabled={selectedMember.role === 'owner'}
              />
              <Switch
                label="Configuración"
                checked={selectedMember.permissions.settings}
                disabled={selectedMember.role === 'owner'}
              />
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeEditModal}>Cancelar</Button>
              <Button onClick={closeEditModal}>Guardar Cambios</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  )
}

