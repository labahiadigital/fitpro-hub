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
  Grid,
  Box,
  Text,
  Badge,
  ActionIcon,
  SegmentedControl,
  SimpleGrid,
} from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconClock,
  IconUser,
  IconMapPin,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { useBookings, useCreateBooking } from '../../hooks/useBookings'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'week' | 'day'>('week')
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  
  const startOfWeek = dayjs(currentDate).startOf('week')
  const endOfWeek = dayjs(currentDate).endOf('week')
  
  const { data: bookings, isLoading } = useBookings({
    start_date: startOfWeek.toISOString(),
    end_date: endOfWeek.toISOString(),
  })
  
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
    },
    validate: {
      title: (value) => (value.length < 2 ? 'Título requerido' : null),
    },
  })
  
  const handleCreateBooking = async (values: typeof form.values) => {
    try {
      await createBooking.mutateAsync({
        ...values,
        start_time: values.start_time.toISOString(),
        end_time: values.end_time.toISOString(),
        location: {
          type: values.modality,
          address: values.modality === 'in_person' ? values.location : null,
          online_link: values.modality === 'online' ? values.location : null,
        },
      })
      closeModal()
      form.reset()
    } catch {
      // Error handled by mutation
    }
  }
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate((current) =>
      direction === 'prev'
        ? dayjs(current).subtract(1, 'week').toDate()
        : dayjs(current).add(1, 'week').toDate()
    )
  }
  
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    startOfWeek.add(i, 'day')
  )
  
  const hours = Array.from({ length: 12 }, (_, i) => i + 7) // 7 AM to 6 PM
  
  const getBookingsForDay = (day: dayjs.Dayjs) => {
    return bookings?.filter((booking: { start_time: string }) =>
      dayjs(booking.start_time).isSame(day, 'day')
    ) || []
  }
  
  const getBookingStyle = (booking: { start_time: string; end_time: string }) => {
    const startHour = dayjs(booking.start_time).hour()
    const startMinute = dayjs(booking.start_time).minute()
    const duration = dayjs(booking.end_time).diff(dayjs(booking.start_time), 'minute')
    
    const top = ((startHour - 7) * 60 + startMinute) * (60 / 60) // 60px per hour
    const height = duration * (60 / 60)
    
    return { top: `${top}px`, height: `${height}px` }
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
            <ActionIcon variant="default" size="lg" onClick={() => navigateWeek('prev')}>
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Text fw={600} size="lg" style={{ minWidth: 200, textAlign: 'center' }}>
              {startOfWeek.format('D MMM')} - {endOfWeek.format('D MMM YYYY')}
            </Text>
            <ActionIcon variant="default" size="lg" onClick={() => navigateWeek('next')}>
              <IconChevronRight size={18} />
            </ActionIcon>
            <Button
              variant="light"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoy
            </Button>
          </Group>
          <SegmentedControl
            value={view}
            onChange={(v) => setView(v as 'week' | 'day')}
            data={[
              { label: 'Semana', value: 'week' },
              { label: 'Día', value: 'day' },
            ]}
          />
        </Group>
      </PageHeader>
      
      <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
        {/* Header con días */}
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: '60px repeat(7, 1fr)',
            borderBottom: '1px solid var(--mantine-color-gray-2)',
            backgroundColor: 'var(--mantine-color-gray-0)',
          }}
        >
          <Box p="sm" />
          {weekDays.map((day) => (
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
        
        {/* Grid de horas */}
        <Box style={{ display: 'flex', maxHeight: '600px', overflowY: 'auto' }}>
          {/* Columna de horas */}
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
          
          {/* Columnas de días */}
          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
            {weekDays.map((day) => (
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
                {getBookingsForDay(day).map((booking: { id: string; title: string; start_time: string; end_time: string; status: string }) => (
                  <Box
                    key={booking.id}
                    style={{
                      position: 'absolute',
                      left: 2,
                      right: 2,
                      ...getBookingStyle(booking),
                      backgroundColor: booking.status === 'confirmed'
                        ? 'var(--mantine-color-primary-1)'
                        : 'var(--mantine-color-yellow-1)',
                      borderLeft: `3px solid ${
                        booking.status === 'confirmed'
                          ? 'var(--mantine-color-primary-6)'
                          : 'var(--mantine-color-yellow-6)'
                      }`,
                      borderRadius: 4,
                      padding: 4,
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    <Text size="xs" fw={600} truncate>
                      {booking.title}
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
      
      {/* Modal para crear sesión */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Nueva Sesión"
        size="md"
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
              leftSection={<IconMapPin size={16} />}
              {...form.getInputProps('location')}
            />
            
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
    </Container>
  )
}
