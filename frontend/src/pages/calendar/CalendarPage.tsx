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
  Box,
  Text,
  Badge,
  ActionIcon,
  SegmentedControl,
  SimpleGrid,
  Card,
  ThemeIcon,
  Divider,
  Switch,
  NumberInput,
} from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconClock,
  IconUser,
  IconMapPin,
  IconVideo,
  IconUsers,
  IconCheck,
  IconX,
  IconRepeat,
  IconAlertCircle,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { useCreateBooking } from '../../hooks/useBookings'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

interface Booking {
  id: string
  title: string
  client_name: string
  start_time: string
  end_time: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  session_type: 'individual' | 'group'
  modality: 'in_person' | 'online'
  location?: string
  notes?: string
  color?: string
}

const mockBookings: Booking[] = [
  { id: '1', title: 'Entrenamiento Personal', client_name: 'María García', start_time: '2024-07-22T09:00:00', end_time: '2024-07-22T10:00:00', status: 'confirmed', session_type: 'individual', modality: 'in_person', location: 'Gimnasio Centro' },
  { id: '2', title: 'Clase Grupal HIIT', client_name: 'Grupo A', start_time: '2024-07-22T11:00:00', end_time: '2024-07-22T12:00:00', status: 'confirmed', session_type: 'group', modality: 'in_person', location: 'Sala 2' },
  { id: '3', title: 'Consulta Nutricional', client_name: 'Carlos López', start_time: '2024-07-22T16:00:00', end_time: '2024-07-22T16:30:00', status: 'pending', session_type: 'individual', modality: 'online' },
  { id: '4', title: 'Entrenamiento Personal', client_name: 'Ana Martínez', start_time: '2024-07-23T10:00:00', end_time: '2024-07-23T11:00:00', status: 'confirmed', session_type: 'individual', modality: 'in_person' },
  { id: '5', title: 'Yoga', client_name: 'Grupo B', start_time: '2024-07-24T08:00:00', end_time: '2024-07-24T09:00:00', status: 'confirmed', session_type: 'group', modality: 'in_person' },
]

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [bookings] = useState<Booking[]>(mockBookings)

  const startOfWeek = dayjs(currentDate).startOf('week')
  const endOfWeek = dayjs(currentDate).endOf('week')
  const startOfMonth = dayjs(currentDate).startOf('month')
  const endOfMonth = dayjs(currentDate).endOf('month')

  const createBooking = useCreateBooking()

  const form = useForm({
    initialValues: {
      title: '',
      client_id: '',
      session_type: 'individual',
      modality: 'in_person',
      start_time: new Date(),
      end_time: new Date(Date.now() + 60 * 60 * 1000),
      location: '',
      notes: '',
      is_recurring: false,
      recurrence_type: 'weekly',
      max_participants: 1,
    },
    validate: {
      title: (value) => (value.length < 2 ? 'Título requerido' : null),
    },
  })

  const handleCreateBooking = async (values: typeof form.values) => {
    try {
      await createBooking.mutateAsync({
        ...values,
        session_type: values.session_type as 'individual' | 'group',
        modality: values.modality as 'in_person' | 'online',
        start_time: values.start_time.toISOString(),
        end_time: values.end_time.toISOString(),
        location: {
          type: values.modality,
          address: values.modality === 'in_person' ? values.location : undefined,
          online_link: values.modality === 'online' ? values.location : undefined,
        },
      })
      closeModal()
      form.reset()
    } catch {
      // Error handled by mutation
    }
  }

  const navigate = (direction: 'prev' | 'next') => {
    const unit = view === 'month' ? 'month' : view === 'week' ? 'week' : 'day'
    setCurrentDate((current) =>
      direction === 'prev'
        ? dayjs(current).subtract(1, unit).toDate()
        : dayjs(current).add(1, unit).toDate()
    )
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'))
  const hours = Array.from({ length: 14 }, (_, i) => i + 7) // 7 AM to 8 PM

  const getBookingsForDay = (day: dayjs.Dayjs) => {
    return bookings.filter((booking) =>
      dayjs(booking.start_time).isSame(day, 'day')
    )
  }

  const getBookingStyle = (booking: Booking) => {
    const startHour = dayjs(booking.start_time).hour()
    const startMinute = dayjs(booking.start_time).minute()
    const duration = dayjs(booking.end_time).diff(dayjs(booking.start_time), 'minute')

    const top = ((startHour - 7) * 60 + startMinute) * (60 / 60)
    const height = Math.max(duration * (60 / 60), 30)

    return { top: `${top}px`, height: `${height}px` }
  }

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'green'
      case 'pending': return 'yellow'
      case 'cancelled': return 'red'
      case 'completed': return 'blue'
      default: return 'gray'
    }
  }

  const getMonthDays = () => {
    const days = []
    const startDay = startOfMonth.startOf('week')
    const endDay = endOfMonth.endOf('week')

    let day = startDay
    while (day.isBefore(endDay) || day.isSame(endDay, 'day')) {
      days.push(day)
      day = day.add(1, 'day')
    }
    return days
  }

  const todayStats = {
    total: bookings.filter(b => dayjs(b.start_time).isSame(dayjs(), 'day')).length,
    confirmed: bookings.filter(b => dayjs(b.start_time).isSame(dayjs(), 'day') && b.status === 'confirmed').length,
    pending: bookings.filter(b => dayjs(b.start_time).isSame(dayjs(), 'day') && b.status === 'pending').length,
  }

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Calendario"
        description="Gestiona tus sesiones y reservas"
        action={{
          label: 'Nueva Sesión',
          onClick: openModal,
        }}
      >
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="default" size="lg" onClick={() => navigate('prev')}>
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Text fw={600} size="lg" style={{ minWidth: 200, textAlign: 'center' }}>
              {view === 'month'
                ? dayjs(currentDate).format('MMMM YYYY')
                : view === 'week'
                ? `${startOfWeek.format('D MMM')} - ${endOfWeek.format('D MMM YYYY')}`
                : dayjs(currentDate).format('dddd, D MMMM YYYY')}
            </Text>
            <ActionIcon variant="default" size="lg" onClick={() => navigate('next')}>
              <IconChevronRight size={18} />
            </ActionIcon>
            <Button variant="light" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
          </Group>
          <SegmentedControl
            value={view}
            onChange={(v) => setView(v as 'month' | 'week' | 'day')}
            data={[
              { label: 'Mes', value: 'month' },
              { label: 'Semana', value: 'week' },
              { label: 'Día', value: 'day' },
            ]}
          />
        </Group>
      </PageHeader>

      {/* Today's Summary */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
        <Card withBorder radius="md" padding="sm">
          <Group justify="space-between">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase">Sesiones Hoy</Text>
              <Text size="xl" fw={700}>{todayStats.total}</Text>
            </Box>
            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
              <IconCalendarEvent size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder radius="md" padding="sm">
          <Group justify="space-between">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase">Confirmadas</Text>
              <Text size="xl" fw={700} c="green">{todayStats.confirmed}</Text>
            </Box>
            <ThemeIcon size="lg" radius="md" variant="light" color="green">
              <IconCheck size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder radius="md" padding="sm">
          <Group justify="space-between">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase">Pendientes</Text>
              <Text size="xl" fw={700} c="yellow">{todayStats.pending}</Text>
            </Box>
            <ThemeIcon size="lg" radius="md" variant="light" color="yellow">
              <IconAlertCircle size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Calendar Views */}
      {view === 'month' ? (
        <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
          {/* Month Header */}
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--mantine-color-gray-2)',
              backgroundColor: 'var(--mantine-color-gray-0)',
            }}
          >
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
              <Box key={day} p="sm" ta="center">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {day}
                </Text>
              </Box>
            ))}
          </Box>

          {/* Month Grid */}
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
            }}
          >
            {getMonthDays().map((day, index) => {
              const isCurrentMonth = day.month() === dayjs(currentDate).month()
              const isToday = day.isSame(dayjs(), 'day')
              const dayBookings = getBookingsForDay(day)

              return (
                <Box
                  key={index}
                  p="xs"
                  h={100}
                  style={{
                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                    borderRight: (index + 1) % 7 !== 0 ? '1px solid var(--mantine-color-gray-2)' : undefined,
                    backgroundColor: !isCurrentMonth ? 'var(--mantine-color-gray-0)' : undefined,
                  }}
                >
                  <Text
                    size="sm"
                    fw={isToday ? 700 : 400}
                    c={!isCurrentMonth ? 'dimmed' : isToday ? 'primary' : undefined}
                    mb="xs"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: isToday ? 'var(--mantine-color-primary-6)' : undefined,
                      color: isToday ? 'white' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {day.format('D')}
                  </Text>
                  <Stack gap={2}>
                    {dayBookings.slice(0, 2).map((booking) => (
                      <Box
                        key={booking.id}
                        p={2}
                        style={{
                          backgroundColor: `var(--mantine-color-${getStatusColor(booking.status)}-1)`,
                          borderLeft: `2px solid var(--mantine-color-${getStatusColor(booking.status)}-6)`,
                          borderRadius: 2,
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <Text size="xs" truncate>{booking.title}</Text>
                      </Box>
                    ))}
                    {dayBookings.length > 2 && (
                      <Text size="xs" c="dimmed">+{dayBookings.length - 2} más</Text>
                    )}
                  </Stack>
                </Box>
              )
            })}
          </Box>
        </Paper>
      ) : (
        <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
          {/* Week/Day Header */}
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: view === 'week' ? '60px repeat(7, 1fr)' : '60px 1fr',
              borderBottom: '1px solid var(--mantine-color-gray-2)',
              backgroundColor: 'var(--mantine-color-gray-0)',
            }}
          >
            <Box p="sm" />
            {(view === 'week' ? weekDays : [dayjs(currentDate)]).map((day) => (
              <Box
                key={day.format('YYYY-MM-DD')}
                p="sm"
                ta="center"
                style={{
                  borderLeft: '1px solid var(--mantine-color-gray-2)',
                  backgroundColor: day.isSame(dayjs(), 'day')
                    ? 'var(--mantine-color-primary-0)'
                    : undefined,
                }}
              >
                <Text size="xs" c="dimmed" tt="uppercase">
                  {day.format('ddd')}
                </Text>
                <Text
                  size="lg"
                  fw={day.isSame(dayjs(), 'day') ? 700 : 500}
                  c={day.isSame(dayjs(), 'day') ? 'primary' : undefined}
                >
                  {day.format('D')}
                </Text>
              </Box>
            ))}
          </Box>

          {/* Time Grid */}
          <Box style={{ display: 'flex', maxHeight: '600px', overflowY: 'auto' }}>
            <Box style={{ width: 60, flexShrink: 0 }}>
              {hours.map((hour) => (
                <Box
                  key={hour}
                  h={60}
                  style={{
                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                    paddingTop: 4,
                  }}
                >
                  <Text size="xs" c="dimmed">
                    {hour}:00
                  </Text>
                </Box>
              ))}
            </Box>

            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: view === 'week' ? 'repeat(7, 1fr)' : '1fr',
                flex: 1,
              }}
            >
              {(view === 'week' ? weekDays : [dayjs(currentDate)]).map((day) => (
                <Box
                  key={day.format('YYYY-MM-DD')}
                  style={{
                    borderLeft: '1px solid var(--mantine-color-gray-2)',
                    position: 'relative',
                  }}
                >
                  {hours.map((hour) => (
                    <Box
                      key={hour}
                      h={60}
                      style={{
                        borderBottom: '1px solid var(--mantine-color-gray-2)',
                      }}
                    />
                  ))}

                  {/* Bookings */}
                  {getBookingsForDay(day).map((booking) => (
                    <Box
                      key={booking.id}
                      style={{
                        position: 'absolute',
                        left: 2,
                        right: 2,
                        ...getBookingStyle(booking),
                        backgroundColor: `var(--mantine-color-${getStatusColor(booking.status)}-1)`,
                        borderLeft: `3px solid var(--mantine-color-${getStatusColor(booking.status)}-6)`,
                        borderRadius: 4,
                        padding: 4,
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <Text size="xs" fw={600} truncate>
                        {booking.title}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {booking.client_name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {dayjs(booking.start_time).format('HH:mm')}
                      </Text>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Create Session Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Nueva Sesión"
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleCreateBooking)}>
          <Stack>
            <TextInput
              label="Título"
              placeholder="Entrenamiento Personal"
              required
              leftSection={<IconCalendarEvent size={16} />}
              {...form.getInputProps('title')}
            />

            <Select
              label="Cliente"
              placeholder="Selecciona un cliente"
              leftSection={<IconUser size={16} />}
              data={[
                { value: '1', label: 'María García' },
                { value: '2', label: 'Carlos López' },
                { value: '3', label: 'Ana Martínez' },
              ]}
              searchable
              {...form.getInputProps('client_id')}
            />

            <Group grow>
              <Select
                label="Tipo de sesión"
                data={[
                  { value: 'individual', label: 'Individual' },
                  { value: 'group', label: 'Grupal' },
                ]}
                {...form.getInputProps('session_type')}
              />
              <Select
                label="Modalidad"
                data={[
                  { value: 'in_person', label: 'Presencial' },
                  { value: 'online', label: 'Online' },
                ]}
                {...form.getInputProps('modality')}
              />
            </Group>

            {form.values.session_type === 'group' && (
              <NumberInput
                label="Máximo de participantes"
                min={2}
                max={50}
                {...form.getInputProps('max_participants')}
              />
            )}

            <Group grow>
              <DateTimePicker
                label="Inicio"
                placeholder="Fecha y hora de inicio"
                leftSection={<IconClock size={16} />}
                {...form.getInputProps('start_time')}
              />
              <DateTimePicker
                label="Fin"
                placeholder="Fecha y hora de fin"
                leftSection={<IconClock size={16} />}
                {...form.getInputProps('end_time')}
              />
            </Group>

            <TextInput
              label={form.values.modality === 'in_person' ? 'Ubicación' : 'Enlace de videollamada'}
              placeholder={form.values.modality === 'in_person' ? 'Gimnasio Centro' : 'https://meet.google.com/...'}
              leftSection={form.values.modality === 'in_person' ? <IconMapPin size={16} /> : <IconVideo size={16} />}
              {...form.getInputProps('location')}
            />

            <Switch
              label="Sesión recurrente"
              {...form.getInputProps('is_recurring', { type: 'checkbox' })}
            />

            {form.values.is_recurring && (
              <Select
                label="Repetir"
                data={[
                  { value: 'daily', label: 'Diariamente' },
                  { value: 'weekly', label: 'Semanalmente' },
                  { value: 'biweekly', label: 'Cada 2 semanas' },
                  { value: 'monthly', label: 'Mensualmente' },
                ]}
                {...form.getInputProps('recurrence_type')}
              />
            )}

            <Textarea
              label="Notas"
              placeholder="Notas adicionales..."
              minRows={2}
              {...form.getInputProps('notes')}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={createBooking.isPending}>
                Crear Sesión
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Booking Detail Modal */}
      <Modal
        opened={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Detalle de Sesión"
        size="md"
      >
        {selectedBooking && (
          <Stack>
            <Group justify="space-between">
              <Box>
                <Text size="xl" fw={700}>{selectedBooking.title}</Text>
                <Badge
                  variant="light"
                  color={getStatusColor(selectedBooking.status)}
                  mt="xs"
                >
                  {selectedBooking.status === 'confirmed' ? 'Confirmada' :
                   selectedBooking.status === 'pending' ? 'Pendiente' :
                   selectedBooking.status === 'cancelled' ? 'Cancelada' : 'Completada'}
                </Badge>
              </Box>
            </Group>

            <Divider />

            <Group gap="sm">
              <ThemeIcon size="md" variant="light" color="gray">
                <IconUser size={16} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed">Cliente</Text>
                <Text size="sm" fw={500}>{selectedBooking.client_name}</Text>
              </Box>
            </Group>

            <Group gap="sm">
              <ThemeIcon size="md" variant="light" color="gray">
                <IconClock size={16} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed">Horario</Text>
                <Text size="sm" fw={500}>
                  {dayjs(selectedBooking.start_time).format('dddd, D MMMM YYYY')}
                </Text>
                <Text size="sm">
                  {dayjs(selectedBooking.start_time).format('HH:mm')} - {dayjs(selectedBooking.end_time).format('HH:mm')}
                </Text>
              </Box>
            </Group>

            <Group gap="sm">
              <ThemeIcon size="md" variant="light" color="gray">
                {selectedBooking.modality === 'in_person' ? <IconMapPin size={16} /> : <IconVideo size={16} />}
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed">
                  {selectedBooking.modality === 'in_person' ? 'Ubicación' : 'Online'}
                </Text>
                <Text size="sm" fw={500}>
                  {selectedBooking.location || 'No especificada'}
                </Text>
              </Box>
            </Group>

            <Group gap="sm">
              <ThemeIcon size="md" variant="light" color="gray">
                <IconUsers size={16} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed">Tipo</Text>
                <Text size="sm" fw={500}>
                  {selectedBooking.session_type === 'individual' ? 'Individual' : 'Grupal'}
                </Text>
              </Box>
            </Group>

            <Divider />

            <Group justify="flex-end" gap="sm">
              {selectedBooking.status === 'pending' && (
                <>
                  <Button variant="light" color="green" leftSection={<IconCheck size={16} />}>
                    Confirmar
                  </Button>
                  <Button variant="light" color="red" leftSection={<IconX size={16} />}>
                    Cancelar
                  </Button>
                </>
              )}
              {selectedBooking.status === 'confirmed' && (
                <>
                  <Button variant="light" leftSection={<IconRepeat size={16} />}>
                    Reprogramar
                  </Button>
                  <Button variant="light" color="red" leftSection={<IconX size={16} />}>
                    Cancelar
                  </Button>
                </>
              )}
              <Button variant="default" onClick={() => setSelectedBooking(null)}>
                Cerrar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  )
}

export default CalendarPage
