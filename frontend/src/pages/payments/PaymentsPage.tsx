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
  Tabs,
  Box,
  Text,
  Badge,
  SimpleGrid,
  NumberInput,
  Alert,
  ThemeIcon,
  Table,
  ActionIcon,
  Menu,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconCreditCard,
  IconReceipt,
  IconChartLine,
  IconAlertCircle,
  IconDotsVertical,
  IconEye,
  IconRefresh,
  IconBan,
  IconDownload,
  IconBrandStripe,
  IconCheck,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { StatsCard } from '../../components/common/StatsCard'
import { StatusBadge } from '../../components/common/DataTable'

export function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('overview')
  const [subscriptionModalOpened, { open: openSubscriptionModal, close: closeSubscriptionModal }] = useDisclosure(false)
  
  // Mock data
  const stripeConnected = true
  
  const subscriptions = [
    { id: '1', client: 'María García', plan: 'Plan Premium', amount: 99, status: 'active', next_billing: '2024-02-15' },
    { id: '2', client: 'Carlos López', plan: 'Plan Básico', amount: 49, status: 'active', next_billing: '2024-02-20' },
    { id: '3', client: 'Ana Martínez', plan: 'Plan Premium', amount: 99, status: 'past_due', next_billing: '2024-02-10' },
    { id: '4', client: 'Pedro Sánchez', plan: 'Plan Básico', amount: 49, status: 'cancelled', next_billing: null },
  ]
  
  const payments = [
    { id: '1', client: 'María García', description: 'Plan Premium - Febrero', amount: 99, status: 'succeeded', date: '2024-01-15' },
    { id: '2', client: 'Carlos López', description: 'Plan Básico - Febrero', amount: 49, status: 'succeeded', date: '2024-01-20' },
    { id: '3', client: 'Ana Martínez', description: 'Plan Premium - Febrero', amount: 99, status: 'failed', date: '2024-01-10' },
    { id: '4', client: 'Pedro Sánchez', description: 'Sesión Individual', amount: 35, status: 'succeeded', date: '2024-01-08' },
    { id: '5', client: 'Laura Fernández', description: 'Plan Premium - Enero', amount: 99, status: 'refunded', date: '2024-01-05' },
  ]
  
  const subscriptionForm = useForm({
    initialValues: {
      client_id: '',
      plan_name: '',
      amount: 49,
      interval: 'month',
    },
    validate: {
      client_id: (value) => (!value ? 'Cliente requerido' : null),
      plan_name: (value) => (value.length < 2 ? 'Nombre del plan requerido' : null),
    },
  })
  
  const handleCreateSubscription = async (values: typeof subscriptionForm.values) => {
    console.log('Create subscription:', values)
    closeSubscriptionModal()
    subscriptionForm.reset()
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }
  
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'green'
      case 'pending': return 'yellow'
      case 'failed': return 'red'
      case 'refunded': return 'gray'
      default: return 'gray'
    }
  }
  
  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded': return 'Completado'
      case 'pending': return 'Pendiente'
      case 'failed': return 'Fallido'
      case 'refunded': return 'Reembolsado'
      default: return status
    }
  }
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Pagos"
        description="Gestiona suscripciones y pagos de tus clientes"
        action={{
          label: 'Nueva Suscripción',
          onClick: openSubscriptionModal,
        }}
      />
      
      {!stripeConnected && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Conecta tu cuenta de Stripe"
          color="yellow"
          mb="lg"
        >
          Para poder recibir pagos, necesitas conectar tu cuenta de Stripe.
          <Button
            variant="light"
            color="yellow"
            size="xs"
            mt="sm"
            leftSection={<IconBrandStripe size={16} />}
          >
            Conectar Stripe
          </Button>
        </Alert>
      )}
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="overview" leftSection={<IconChartLine size={14} />}>
            Resumen
          </Tabs.Tab>
          <Tabs.Tab value="subscriptions" leftSection={<IconCreditCard size={14} />}>
            Suscripciones
          </Tabs.Tab>
          <Tabs.Tab value="payments" leftSection={<IconReceipt size={14} />}>
            Historial de Pagos
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
            <StatsCard
              title="MRR"
              value={formatCurrency(2940)}
              icon={<IconChartLine size={24} />}
              change={12}
              changeLabel="vs mes anterior"
              color="green"
            />
            <StatsCard
              title="Suscripciones Activas"
              value={subscriptions.filter(s => s.status === 'active').length}
              icon={<IconCreditCard size={24} />}
              color="blue"
            />
            <StatsCard
              title="Ingresos Este Mes"
              value={formatCurrency(3240)}
              icon={<IconReceipt size={24} />}
              change={8}
              changeLabel="vs mes anterior"
              color="primary"
            />
            <StatsCard
              title="Tasa de Impago"
              value="3.2%"
              icon={<IconAlertCircle size={24} />}
              change={-1.5}
              changeLabel="vs mes anterior"
              color="red"
            />
          </SimpleGrid>
          
          <Paper withBorder radius="lg" p="lg">
            <Group justify="space-between" mb="lg">
              <Text fw={600}>Pagos Recientes</Text>
              <Button variant="subtle" size="xs">
                Ver todos
              </Button>
            </Group>
            
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Descripción</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Importe</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {payments.slice(0, 5).map((payment) => (
                  <Table.Tr key={payment.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{payment.client}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{payment.description}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(payment.date).toLocaleDateString('es-ES')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{formatCurrency(payment.amount)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getPaymentStatusColor(payment.status)} variant="light" size="sm">
                        {getPaymentStatusLabel(payment.status)}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
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
                  <Table.Th>Importe</Table.Th>
                  <Table.Th>Próximo Cobro</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th style={{ width: 60 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subscriptions.map((sub) => (
                  <Table.Tr key={sub.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{sub.client}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{sub.plan}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{formatCurrency(sub.amount)}/mes</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {sub.next_billing
                          ? new Date(sub.next_billing).toLocaleDateString('es-ES')
                          : '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          sub.status === 'active' ? 'green' :
                          sub.status === 'past_due' ? 'yellow' :
                          sub.status === 'cancelled' ? 'red' : 'gray'
                        }
                        variant="light"
                        size="sm"
                      >
                        {sub.status === 'active' ? 'Activa' :
                         sub.status === 'past_due' ? 'Vencida' :
                         sub.status === 'cancelled' ? 'Cancelada' : sub.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEye size={14} />}>
                            Ver detalles
                          </Menu.Item>
                          {sub.status === 'past_due' && (
                            <Menu.Item leftSection={<IconRefresh size={14} />}>
                              Reintentar cobro
                            </Menu.Item>
                          )}
                          {sub.status === 'active' && (
                            <Menu.Item leftSection={<IconBan size={14} />} color="red">
                              Cancelar suscripción
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
        
        <Tabs.Panel value="payments">
          <Paper withBorder radius="lg">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Descripción</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Importe</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th style={{ width: 60 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {payments.map((payment) => (
                  <Table.Tr key={payment.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{payment.client}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{payment.description}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(payment.date).toLocaleDateString('es-ES')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{formatCurrency(payment.amount)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getPaymentStatusColor(payment.status)} variant="light" size="sm">
                        {getPaymentStatusLabel(payment.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEye size={14} />}>
                            Ver detalles
                          </Menu.Item>
                          <Menu.Item leftSection={<IconDownload size={14} />}>
                            Descargar factura
                          </Menu.Item>
                          {payment.status === 'succeeded' && (
                            <Menu.Item leftSection={<IconRefresh size={14} />} color="red">
                              Reembolsar
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
      
      {/* Modal para crear suscripción */}
      <Modal
        opened={subscriptionModalOpened}
        onClose={closeSubscriptionModal}
        title="Nueva Suscripción"
        size="md"
      >
        <form onSubmit={subscriptionForm.onSubmit(handleCreateSubscription)}>
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
              required
              {...subscriptionForm.getInputProps('client_id')}
            />
            
            <TextInput
              label="Nombre del plan"
              placeholder="Plan Premium"
              required
              {...subscriptionForm.getInputProps('plan_name')}
            />
            
            <Group grow>
              <NumberInput
                label="Importe"
                prefix="€ "
                min={0}
                decimalScale={2}
                {...subscriptionForm.getInputProps('amount')}
              />
              <Select
                label="Intervalo"
                data={[
                  { value: 'week', label: 'Semanal' },
                  { value: 'month', label: 'Mensual' },
                  { value: 'year', label: 'Anual' },
                ]}
                {...subscriptionForm.getInputProps('interval')}
              />
            </Group>
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeSubscriptionModal}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Suscripción
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}
