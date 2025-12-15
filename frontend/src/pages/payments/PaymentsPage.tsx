import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  Modal,
  TextInput,
  Select,
  Stack,
  Textarea,
  Tabs,
  Box,
  Text,
  Badge,
  Card,
  ActionIcon,
  SimpleGrid,
  Table,
  ThemeIcon,
  Divider,
  NumberInput,
  Switch,
  RingProgress,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconCreditCard,
  IconReceipt,
  IconCash,
  IconRefresh,
  IconDownload,
  IconEye,
  IconSend,
  IconX,
  IconClock,
  IconTrendingUp,
  IconUsers,
  IconArrowUpRight,
  IconBrandStripe,
  IconPackage,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { StatsCard } from '../../components/common/StatsCard'

interface Payment {
  id: string
  client_name: string
  description: string
  amount: number
  currency: string
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  payment_type: 'subscription' | 'one_time' | 'package'
  created_at: string
  paid_at?: string
}

interface Subscription {
  id: string
  client_name: string
  plan_name: string
  amount: number
  currency: string
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  current_period_end: string
  cancel_at_period_end: boolean
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  type: 'subscription' | 'one_time' | 'package'
  sessions_included?: number
  is_active: boolean
}

const mockPayments: Payment[] = [
  { id: '1', client_name: 'María García', description: 'Plan Premium - Julio', amount: 120, currency: 'EUR', status: 'completed', payment_type: 'subscription', created_at: '2024-07-20', paid_at: '2024-07-20' },
  { id: '2', client_name: 'Carlos López', description: 'Bono 10 Sesiones', amount: 450, currency: 'EUR', status: 'completed', payment_type: 'package', created_at: '2024-07-19', paid_at: '2024-07-19' },
  { id: '3', client_name: 'Ana Martínez', description: 'Plan Premium - Julio', amount: 120, currency: 'EUR', status: 'pending', payment_type: 'subscription', created_at: '2024-07-18' },
  { id: '4', client_name: 'Pedro Sánchez', description: 'Sesión Individual', amount: 50, currency: 'EUR', status: 'completed', payment_type: 'one_time', created_at: '2024-07-17', paid_at: '2024-07-17' },
  { id: '5', client_name: 'Laura Fernández', description: 'Plan Básico - Julio', amount: 80, currency: 'EUR', status: 'failed', payment_type: 'subscription', created_at: '2024-07-16' },
]

const mockSubscriptions: Subscription[] = [
  { id: '1', client_name: 'María García', plan_name: 'Plan Premium', amount: 120, currency: 'EUR', status: 'active', current_period_end: '2024-08-20', cancel_at_period_end: false },
  { id: '2', client_name: 'Carlos López', plan_name: 'Plan Básico', amount: 80, currency: 'EUR', status: 'active', current_period_end: '2024-08-15', cancel_at_period_end: false },
  { id: '3', client_name: 'Ana Martínez', plan_name: 'Plan Premium', amount: 120, currency: 'EUR', status: 'past_due', current_period_end: '2024-07-18', cancel_at_period_end: false },
  { id: '4', client_name: 'Pedro Sánchez', plan_name: 'Plan Básico', amount: 80, currency: 'EUR', status: 'trialing', current_period_end: '2024-07-25', cancel_at_period_end: false },
  { id: '5', client_name: 'Laura Fernández', plan_name: 'Plan Premium', amount: 120, currency: 'EUR', status: 'cancelled', current_period_end: '2024-07-31', cancel_at_period_end: true },
]

const mockProducts: Product[] = [
  { id: '1', name: 'Plan Básico', description: '4 sesiones al mes + seguimiento', price: 80, currency: 'EUR', type: 'subscription', is_active: true },
  { id: '2', name: 'Plan Premium', description: '8 sesiones al mes + nutrición + chat', price: 120, currency: 'EUR', type: 'subscription', is_active: true },
  { id: '3', name: 'Plan VIP', description: 'Sesiones ilimitadas + todo incluido', price: 200, currency: 'EUR', type: 'subscription', is_active: true },
  { id: '4', name: 'Bono 5 Sesiones', description: 'Válido por 2 meses', price: 225, currency: 'EUR', type: 'package', sessions_included: 5, is_active: true },
  { id: '5', name: 'Bono 10 Sesiones', description: 'Válido por 4 meses', price: 450, currency: 'EUR', type: 'package', sessions_included: 10, is_active: true },
  { id: '6', name: 'Sesión Individual', description: 'Sesión suelta de entrenamiento', price: 50, currency: 'EUR', type: 'one_time', is_active: true },
]

export function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('overview')
  const [productModalOpened, { open: openProductModal, close: closeProductModal }] = useDisclosure(false)
  const [chargeModalOpened, { open: openChargeModal, close: closeChargeModal }] = useDisclosure(false)

  const productForm = useForm({
    initialValues: {
      name: '',
      description: '',
      price: 0,
      type: 'subscription',
      sessions_included: 0,
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
      price: (value) => (value <= 0 ? 'Precio debe ser mayor a 0' : null),
    },
  })

  const chargeForm = useForm({
    initialValues: {
      client_id: '',
      product_id: '',
      amount: 0,
      description: '',
    },
  })

  const kpis = {
    mrr: 6800,
    mrrChange: 9.7,
    activeSubscriptions: 45,
    pendingPayments: 3,
    pendingAmount: 360,
    thisMonthRevenue: 8500,
    revenueChange: 12,
  }

  const getStatusColor = (status: Payment['status'] | Subscription['status']) => {
    switch (status) {
      case 'completed':
      case 'active': return 'green'
      case 'pending':
      case 'trialing': return 'yellow'
      case 'failed':
      case 'past_due': return 'red'
      case 'refunded':
      case 'cancelled': return 'gray'
      default: return 'gray'
    }
  }

  const getStatusLabel = (status: Payment['status'] | Subscription['status']) => {
    switch (status) {
      case 'completed': return 'Completado'
      case 'pending': return 'Pendiente'
      case 'failed': return 'Fallido'
      case 'refunded': return 'Reembolsado'
      case 'active': return 'Activa'
      case 'trialing': return 'Prueba'
      case 'past_due': return 'Vencida'
      case 'cancelled': return 'Cancelada'
      default: return status
    }
  }

  const getPaymentTypeIcon = (type: Payment['payment_type']) => {
    switch (type) {
      case 'subscription': return IconRefresh
      case 'package': return IconPackage
      case 'one_time': return IconCash
      default: return IconCreditCard
    }
  }

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Pagos y Suscripciones"
        description="Gestiona ingresos, suscripciones y productos"
        action={{
          label: 'Nuevo Cobro',
          onClick: openChargeModal,
        }}
        secondaryAction={{
          label: 'Nuevo Producto',
          icon: <IconPlus size={16} />,
          onClick: openProductModal,
          variant: 'default',
        }}
      />

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <StatsCard
          title="MRR"
          value={`€${kpis.mrr.toLocaleString()}`}
          icon={<IconTrendingUp size={24} />}
          change={kpis.mrrChange}
          changeLabel="vs mes anterior"
          color="green"
        />
        <StatsCard
          title="Ingresos del Mes"
          value={`€${kpis.thisMonthRevenue.toLocaleString()}`}
          icon={<IconCash size={24} />}
          change={kpis.revenueChange}
          changeLabel="vs mes anterior"
          color="blue"
        />
        <StatsCard
          title="Suscripciones Activas"
          value={kpis.activeSubscriptions}
          icon={<IconUsers size={24} />}
          change={5}
          changeLabel="nuevas este mes"
          color="grape"
        />
        <Paper p="lg" radius="lg" withBorder>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                Pagos Pendientes
              </Text>
              <Text size="xl" fw={700} style={{ fontSize: '1.75rem', lineHeight: 1.2 }}>
                {kpis.pendingPayments}
              </Text>
              <Text size="sm" c="orange" fw={500} mt={8}>
                €{kpis.pendingAmount} por cobrar
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" color="orange" variant="light">
              <IconClock size={24} />
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="overview" leftSection={<IconCreditCard size={14} />}>
            Resumen
          </Tabs.Tab>
          <Tabs.Tab value="payments" leftSection={<IconReceipt size={14} />}>
            Historial
          </Tabs.Tab>
          <Tabs.Tab value="subscriptions" leftSection={<IconRefresh size={14} />}>
            Suscripciones
          </Tabs.Tab>
          <Tabs.Tab value="products" leftSection={<IconPackage size={14} />}>
            Productos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            {/* Revenue Distribution */}
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} mb="lg">Distribución de Ingresos</Text>
              <Group justify="center" mb="md">
                <RingProgress
                  size={180}
                  thickness={20}
                  roundCaps
                  sections={[
                    { value: 65, color: 'blue', tooltip: 'Suscripciones: 65%' },
                    { value: 25, color: 'green', tooltip: 'Bonos: 25%' },
                    { value: 10, color: 'orange', tooltip: 'Sesiones: 10%' },
                  ]}
                  label={
                    <Box ta="center">
                      <Text size="lg" fw={700}>€8,500</Text>
                      <Text size="xs" c="dimmed">Este mes</Text>
                    </Box>
                  }
                />
              </Group>
              <SimpleGrid cols={3} spacing="sm">
                <Group gap="xs" justify="center">
                  <Box w={12} h={12} style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-blue-6)' }} />
                  <Text size="xs">Suscripciones (65%)</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box w={12} h={12} style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-green-6)' }} />
                  <Text size="xs">Bonos (25%)</Text>
                </Group>
                <Group gap="xs" justify="center">
                  <Box w={12} h={12} style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-orange-6)' }} />
                  <Text size="xs">Sesiones (10%)</Text>
                </Group>
              </SimpleGrid>
            </Paper>

            {/* Recent Payments */}
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="lg">
                <Text fw={600}>Pagos Recientes</Text>
                <Button variant="subtle" size="xs" rightSection={<IconArrowUpRight size={14} />}>
                  Ver todos
                </Button>
              </Group>
              <Stack gap="sm">
                {mockPayments.slice(0, 5).map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type)
                  return (
                    <Group key={payment.id} justify="space-between">
                      <Group gap="sm">
                        <ThemeIcon
                          size="md"
                          radius="md"
                          variant="light"
                          color={getStatusColor(payment.status)}
                        >
                          <PaymentIcon size={14} />
                        </ThemeIcon>
                        <Box>
                          <Text size="sm" fw={500}>{payment.client_name}</Text>
                          <Text size="xs" c="dimmed">{payment.description}</Text>
                        </Box>
                      </Group>
                      <Box ta="right">
                        <Text size="sm" fw={600}>€{payment.amount}</Text>
                        <Badge size="xs" variant="light" color={getStatusColor(payment.status)}>
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </Box>
                    </Group>
                  )
                })}
              </Stack>
            </Paper>

            {/* Upcoming Renewals */}
            <Paper withBorder radius="lg" p="lg">
              <Text fw={600} mb="lg">Próximas Renovaciones</Text>
              <Stack gap="sm">
                {mockSubscriptions
                  .filter(s => s.status === 'active')
                  .slice(0, 4)
                  .map((sub) => (
                    <Group key={sub.id} justify="space-between">
                      <Box>
                        <Text size="sm" fw={500}>{sub.client_name}</Text>
                        <Text size="xs" c="dimmed">{sub.plan_name}</Text>
                      </Box>
                      <Box ta="right">
                        <Text size="sm" fw={600}>€{sub.amount}</Text>
                        <Text size="xs" c="dimmed">{sub.current_period_end}</Text>
                      </Box>
                    </Group>
                  ))}
              </Stack>
            </Paper>

            {/* Stripe Integration */}
            <Paper withBorder radius="lg" p="lg">
              <Group justify="space-between" mb="lg">
                <Group gap="sm">
                  <ThemeIcon size="lg" radius="md" variant="light" color="violet">
                    <IconBrandStripe size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600}>Stripe Connect</Text>
                    <Text size="xs" c="dimmed">Gestiona tu cuenta de pagos</Text>
                  </Box>
                </Group>
                <Badge color="green" variant="light">Conectado</Badge>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Balance disponible</Text>
                  <Text size="sm" fw={600}>€2,450.00</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Pendiente de liquidación</Text>
                  <Text size="sm" fw={600}>€680.00</Text>
                </Group>
                <Divider my="xs" />
                <Button variant="light" fullWidth>
                  Ir al Dashboard de Stripe
                </Button>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="payments">
          <Paper withBorder radius="lg">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Descripción</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th ta="right">Importe</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mockPayments.map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type)
                  return (
                    <Table.Tr key={payment.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{payment.client_name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{payment.description}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ThemeIcon size="sm" variant="light" color="gray">
                            <PaymentIcon size={12} />
                          </ThemeIcon>
                          <Text size="xs">
                            {payment.payment_type === 'subscription' ? 'Suscripción' :
                             payment.payment_type === 'package' ? 'Bono' : 'Puntual'}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={getStatusColor(payment.status)}>
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">{payment.created_at}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={600}>€{payment.amount}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <ActionIcon variant="subtle" color="blue">
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDownload size={16} />
                          </ActionIcon>
                          {payment.status === 'pending' && (
                            <ActionIcon variant="subtle" color="green">
                              <IconSend size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="subscriptions">
          <Paper withBorder radius="lg">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Plan</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Próxima renovación</Table.Th>
                  <Table.Th ta="right">Importe</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mockSubscriptions.map((sub) => (
                  <Table.Tr key={sub.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{sub.client_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{sub.plan_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={getStatusColor(sub.status)}>
                        {getStatusLabel(sub.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{sub.current_period_end}</Text>
                      {sub.cancel_at_period_end && (
                        <Text size="xs" c="red">Cancela al finalizar</Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={600}>€{sub.amount}/mes</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon variant="subtle" color="blue">
                          <IconEye size={16} />
                        </ActionIcon>
                        {sub.status === 'active' && (
                          <ActionIcon variant="subtle" color="red">
                            <IconX size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="products">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {mockProducts.map((product) => (
              <Card key={product.id} withBorder radius="lg" padding="lg">
                <Group justify="space-between" mb="sm">
                  <Badge
                    variant="light"
                    color={product.type === 'subscription' ? 'blue' :
                           product.type === 'package' ? 'green' : 'orange'}
                  >
                    {product.type === 'subscription' ? 'Suscripción' :
                     product.type === 'package' ? 'Bono' : 'Puntual'}
                  </Badge>
                  <Switch size="sm" checked={product.is_active} color="green" />
                </Group>

                <Text fw={600} size="lg" mb="xs">{product.name}</Text>
                <Text size="sm" c="dimmed" mb="md">
                  {product.description}
                </Text>

                {product.sessions_included && (
                  <Badge variant="outline" mb="md">
                    {product.sessions_included} sesiones incluidas
                  </Badge>
                )}

                <Divider mb="md" />

                <Group justify="space-between" align="flex-end">
                  <Box>
                    <Text size="xl" fw={700}>€{product.price}</Text>
                    <Text size="xs" c="dimmed">
                      {product.type === 'subscription' ? '/mes' : ''}
                    </Text>
                  </Box>
                  <Group gap="xs">
                    <ActionIcon variant="light" color="blue">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="red">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>

      {/* New Product Modal */}
      <Modal
        opened={productModalOpened}
        onClose={closeProductModal}
        title="Nuevo Producto"
        size="md"
      >
        <form onSubmit={productForm.onSubmit((values) => console.log(values))}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Plan Premium"
              required
              {...productForm.getInputProps('name')}
            />

            <Textarea
              label="Descripción"
              placeholder="Describe el producto..."
              minRows={2}
              {...productForm.getInputProps('description')}
            />

            <Group grow>
              <NumberInput
                label="Precio (€)"
                placeholder="0"
                min={0}
                required
                {...productForm.getInputProps('price')}
              />
              <Select
                label="Tipo"
                data={[
                  { value: 'subscription', label: 'Suscripción' },
                  { value: 'package', label: 'Bono/Paquete' },
                  { value: 'one_time', label: 'Pago único' },
                ]}
                {...productForm.getInputProps('type')}
              />
            </Group>

            {productForm.values.type === 'package' && (
              <NumberInput
                label="Sesiones incluidas"
                placeholder="0"
                min={1}
                {...productForm.getInputProps('sessions_included')}
              />
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeProductModal}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Producto
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* New Charge Modal */}
      <Modal
        opened={chargeModalOpened}
        onClose={closeChargeModal}
        title="Nuevo Cobro"
        size="md"
      >
        <form onSubmit={chargeForm.onSubmit((values) => console.log(values))}>
          <Stack>
            <Select
              label="Cliente"
              placeholder="Selecciona un cliente"
              data={[
                { value: '1', label: 'María García' },
                { value: '2', label: 'Carlos López' },
                { value: '3', label: 'Ana Martínez' },
              ]}
              searchable
              {...chargeForm.getInputProps('client_id')}
            />

            <Select
              label="Producto"
              placeholder="Selecciona un producto"
              data={mockProducts.map(p => ({ value: p.id, label: `${p.name} - €${p.price}` }))}
              {...chargeForm.getInputProps('product_id')}
            />

            <NumberInput
              label="Importe (€)"
              placeholder="0"
              min={0}
              {...chargeForm.getInputProps('amount')}
            />

            <Textarea
              label="Descripción"
              placeholder="Descripción del cobro..."
              {...chargeForm.getInputProps('description')}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeChargeModal}>
                Cancelar
              </Button>
              <Button type="submit" leftSection={<IconCreditCard size={16} />}>
                Crear Cobro
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}

export default PaymentsPage
