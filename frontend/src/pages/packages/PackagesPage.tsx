import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Stack,
  Tabs,
  Text,
  Badge,
  Card,
  ActionIcon,
  SimpleGrid,
  Table,
  Progress,
  ThemeIcon,
  Menu,
  Divider,
  Switch,
  MultiSelect,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPackage,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDotsVertical,
  IconUsers,
  IconCalendarEvent,
  IconCurrencyEuro,
  IconClock,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'

interface SessionPackage {
  id: string
  name: string
  description: string
  totalSessions: number
  price: number
  validityDays: number
  sessionTypes: string[]
  isActive: boolean
  soldCount: number
}

interface ClientPackage {
  id: string
  clientName: string
  clientEmail: string
  packageName: string
  totalSessions: number
  usedSessions: number
  purchasedAt: string
  expiresAt: string
  status: 'active' | 'expired' | 'exhausted'
}

const mockPackages: SessionPackage[] = [
  { id: '1', name: 'Bono 10 Sesiones', description: 'Paquete de 10 sesiones de entrenamiento personal', totalSessions: 10, price: 350, validityDays: 90, sessionTypes: ['Personal Training'], isActive: true, soldCount: 15 },
  { id: '2', name: 'Bono 20 Sesiones', description: 'Paquete de 20 sesiones con descuento', totalSessions: 20, price: 600, validityDays: 180, sessionTypes: ['Personal Training', 'HIIT'], isActive: true, soldCount: 8 },
  { id: '3', name: 'Pack Nutrición', description: '5 consultas nutricionales', totalSessions: 5, price: 150, validityDays: 60, sessionTypes: ['Nutrición'], isActive: true, soldCount: 12 },
  { id: '4', name: 'Pack Completo', description: 'Entrenamiento + Nutrición', totalSessions: 15, price: 500, validityDays: 120, sessionTypes: ['Personal Training', 'Nutrición'], isActive: false, soldCount: 3 },
]

const mockClientPackages: ClientPackage[] = [
  { id: '1', clientName: 'María García', clientEmail: 'maria@email.com', packageName: 'Bono 10 Sesiones', totalSessions: 10, usedSessions: 6, purchasedAt: '2024-10-15', expiresAt: '2025-01-15', status: 'active' },
  { id: '2', clientName: 'Carlos López', clientEmail: 'carlos@email.com', packageName: 'Bono 20 Sesiones', totalSessions: 20, usedSessions: 20, purchasedAt: '2024-08-01', expiresAt: '2025-02-01', status: 'exhausted' },
  { id: '3', clientName: 'Ana Martínez', clientEmail: 'ana@email.com', packageName: 'Pack Nutrición', totalSessions: 5, usedSessions: 2, purchasedAt: '2024-11-01', expiresAt: '2024-12-31', status: 'active' },
  { id: '4', clientName: 'Pedro Sánchez', clientEmail: 'pedro@email.com', packageName: 'Bono 10 Sesiones', totalSessions: 10, usedSessions: 3, purchasedAt: '2024-06-01', expiresAt: '2024-09-01', status: 'expired' },
]

const sessionTypeOptions = [
  { value: 'Personal Training', label: 'Personal Training' },
  { value: 'HIIT', label: 'HIIT Grupal' },
  { value: 'Nutrición', label: 'Consulta Nutricional' },
  { value: 'Yoga', label: 'Yoga' },
  { value: 'Pilates', label: 'Pilates' },
  { value: 'Evaluación', label: 'Evaluación' },
]

export function PackagesPage() {
  const [activeTab, setActiveTab] = useState<string | null>('packages')
  const [packages, setPackages] = useState<SessionPackage[]>(mockPackages)
  const [clientPackages] = useState<ClientPackage[]>(mockClientPackages)
  const [packageModalOpened, { open: openPackageModal, close: closePackageModal }] = useDisclosure(false)
  const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(null)

  const packageForm = useForm({
    initialValues: {
      name: '',
      description: '',
      totalSessions: 10,
      price: 0,
      validityDays: 90,
      sessionTypes: [] as string[],
      isActive: true,
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
      totalSessions: (value) => (value < 1 ? 'Mínimo 1 sesión' : null),
      price: (value) => (value < 0 ? 'Precio inválido' : null),
    },
  })

  const handleOpenPackageModal = (pkg?: SessionPackage) => {
    if (pkg) {
      setEditingPackage(pkg)
      packageForm.setValues({
        name: pkg.name,
        description: pkg.description,
        totalSessions: pkg.totalSessions,
        price: pkg.price,
        validityDays: pkg.validityDays,
        sessionTypes: pkg.sessionTypes,
        isActive: pkg.isActive,
      })
    } else {
      setEditingPackage(null)
      packageForm.reset()
    }
    openPackageModal()
  }

  const handleSavePackage = (values: typeof packageForm.values) => {
    if (editingPackage) {
      setPackages(packages.map(p => 
        p.id === editingPackage.id 
          ? { ...p, ...values }
          : p
      ))
    } else {
      setPackages([...packages, {
        id: Date.now().toString(),
        ...values,
        soldCount: 0,
      }])
    }
    closePackageModal()
    packageForm.reset()
  }

  const handleDeletePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id))
  }

  const handleToggleActive = (id: string) => {
    setPackages(packages.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ))
  }

  const getStatusColor = (status: ClientPackage['status']) => {
    switch (status) {
      case 'active': return 'green'
      case 'expired': return 'red'
      case 'exhausted': return 'gray'
      default: return 'gray'
    }
  }

  const getStatusLabel = (status: ClientPackage['status']) => {
    switch (status) {
      case 'active': return 'Activo'
      case 'expired': return 'Expirado'
      case 'exhausted': return 'Agotado'
      default: return status
    }
  }

  // Estadísticas
  const totalRevenue = packages.reduce((sum, p) => sum + (p.price * p.soldCount), 0)
  const activePackagesCount = clientPackages.filter(p => p.status === 'active').length
  const totalSessionsSold = packages.reduce((sum, p) => sum + (p.totalSessions * p.soldCount), 0)

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Bonos y Paquetes"
        subtitle="Gestiona paquetes de sesiones para tus clientes"
        action={
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenPackageModal()}>
            Nuevo Paquete
          </Button>
        }
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Ingresos por Bonos</Text>
              <Text size="xl" fw={700}>€{totalRevenue.toLocaleString()}</Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="green" variant="light">
              <IconCurrencyEuro size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Bonos Activos</Text>
              <Text size="xl" fw={700}>{activePackagesCount}</Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconPackage size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Sesiones Vendidas</Text>
              <Text size="xl" fw={700}>{totalSessionsSold}</Text>
            </div>
            <ThemeIcon size="lg" radius="md" color="violet" variant="light">
              <IconCalendarEvent size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="packages" leftSection={<IconPackage size={16} />}>
            Paquetes Disponibles
          </Tabs.Tab>
          <Tabs.Tab value="clients" leftSection={<IconUsers size={16} />}>
            Bonos de Clientes
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="packages">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {packages.map((pkg) => (
              <Card key={pkg.id} withBorder radius="md" p="lg">
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <ThemeIcon 
                      size="lg" 
                      radius="md" 
                      color={pkg.isActive ? 'teal' : 'gray'}
                      variant="light"
                    >
                      <IconPackage size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600}>{pkg.name}</Text>
                      <Badge size="xs" color={pkg.isActive ? 'green' : 'gray'} variant="light">
                        {pkg.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </Group>
                  <Menu shadow="md" width={160}>
                    <Menu.Target>
                      <ActionIcon variant="subtle">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item 
                        leftSection={<IconEdit size={14} />}
                        onClick={() => handleOpenPackageModal(pkg)}
                      >
                        Editar
                      </Menu.Item>
                      <Menu.Item 
                        leftSection={pkg.isActive ? <IconX size={14} /> : <IconCheck size={14} />}
                        onClick={() => handleToggleActive(pkg.id)}
                      >
                        {pkg.isActive ? 'Desactivar' : 'Activar'}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item 
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => handleDeletePackage(pkg.id)}
                      >
                        Eliminar
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                  {pkg.description}
                </Text>

                <Stack gap="xs" mb="md">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Sesiones</Text>
                    <Text size="sm" fw={600}>{pkg.totalSessions}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Validez</Text>
                    <Text size="sm" fw={600}>{pkg.validityDays} días</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Vendidos</Text>
                    <Text size="sm" fw={600}>{pkg.soldCount}</Text>
                  </Group>
                </Stack>

                <Group gap={4} mb="md">
                  {pkg.sessionTypes.map((type) => (
                    <Badge key={type} size="xs" variant="outline">{type}</Badge>
                  ))}
                </Group>

                <Divider mb="md" />

                <Group justify="space-between">
                  <Text size="lg" fw={700} c="teal">€{pkg.price}</Text>
                  <Text size="xs" c="dimmed">
                    €{(pkg.price / pkg.totalSessions).toFixed(2)}/sesión
                  </Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="clients">
          <Paper withBorder radius="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Paquete</Table.Th>
                  <Table.Th>Sesiones</Table.Th>
                  <Table.Th>Progreso</Table.Th>
                  <Table.Th>Expira</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {clientPackages.map((cp) => {
                  const progress = (cp.usedSessions / cp.totalSessions) * 100
                  const remaining = cp.totalSessions - cp.usedSessions
                  
                  return (
                    <Table.Tr key={cp.id}>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500}>{cp.clientName}</Text>
                          <Text size="xs" c="dimmed">{cp.clientEmail}</Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{cp.packageName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {cp.usedSessions} / {cp.totalSessions}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {remaining} restantes
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ width: 150 }}>
                        <Progress 
                          value={progress} 
                          size="sm" 
                          color={progress >= 100 ? 'gray' : progress >= 80 ? 'yellow' : 'teal'}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {new Date(cp.expiresAt).toLocaleDateString('es-ES')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(cp.status)} variant="light">
                          {getStatusLabel(cp.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Menu shadow="md" width={160}>
                          <Menu.Target>
                            <ActionIcon variant="subtle">
                              <IconDotsVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconCalendarEvent size={14} />}>
                              Ver sesiones
                            </Menu.Item>
                            <Menu.Item leftSection={<IconClock size={14} />}>
                              Extender validez
                            </Menu.Item>
                            <Menu.Item leftSection={<IconPlus size={14} />}>
                              Añadir sesiones
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Modal de Paquete */}
      <Modal
        opened={packageModalOpened}
        onClose={closePackageModal}
        title={editingPackage ? 'Editar Paquete' : 'Nuevo Paquete'}
        size="md"
      >
        <form onSubmit={packageForm.onSubmit(handleSavePackage)}>
          <Stack gap="md">
            <TextInput
              label="Nombre del paquete"
              placeholder="Ej: Bono 10 Sesiones"
              required
              {...packageForm.getInputProps('name')}
            />
            <TextInput
              label="Descripción"
              placeholder="Descripción del paquete"
              {...packageForm.getInputProps('description')}
            />
            <Group grow>
              <NumberInput
                label="Número de sesiones"
                min={1}
                required
                {...packageForm.getInputProps('totalSessions')}
              />
              <NumberInput
                label="Precio (€)"
                min={0}
                decimalScale={2}
                required
                {...packageForm.getInputProps('price')}
              />
            </Group>
            <NumberInput
              label="Validez (días)"
              description="Días desde la compra hasta que expira"
              min={1}
              {...packageForm.getInputProps('validityDays')}
            />
            <MultiSelect
              label="Tipos de sesión aplicables"
              description="Deja vacío para aplicar a todos"
              data={sessionTypeOptions}
              {...packageForm.getInputProps('sessionTypes')}
            />
            <Switch
              label="Paquete activo"
              description="Los paquetes inactivos no se pueden comprar"
              {...packageForm.getInputProps('isActive', { type: 'checkbox' })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closePackageModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPackage ? 'Guardar Cambios' : 'Crear Paquete'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}

