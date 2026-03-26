import {
  ActionIcon,
  Box,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Button,
  Paper,
  ThemeIcon,
  Center,
  Loader,
  Modal,
  Textarea,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconUser,
  IconVideo,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMyBookings, useAvailableSlots, useCreateClientBooking } from "../../hooks/useClientPortal";

function getWeekDays(weekOffset: number) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return labels.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return {
      day,
      dateNum: date.getDate(),
      fullDate: new Date(date),
      hasSession: false,
      isPast: date < today && date.toDateString() !== today.toDateString(),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

function RequestBookingModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const dateStr = selectedDate ? selectedDate.toISOString().split("T")[0] : "";
  const { data: slots = [], isLoading: loadingSlots } = useAvailableSlots(dateStr);
  const createBooking = useCreateClientBooking();

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  const handleSubmit = async () => {
    if (!selectedSlot) return;
    await createBooking.mutateAsync({ start_time: selectedSlot, notes: notes || undefined });
    setSelectedDate(null);
    setSelectedSlot(null);
    setNotes("");
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Solicitar cita" size="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">Selecciona una fecha y un horario disponible</Text>
        <Center>
          <DatePicker
            value={selectedDate}
            onChange={(d) => { setSelectedDate(d ? new Date(d) : null); setSelectedSlot(null); }}
            minDate={minDate}
            maxDate={maxDate}
            locale="es"
          />
        </Center>

        {selectedDate && (
          <Box>
            <Text fw={500} size="sm" mb="xs">
              Horarios disponibles - {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </Text>
            {loadingSlots ? (
              <Center py="md"><Loader size="sm" /></Center>
            ) : slots.length > 0 ? (
              <Group gap="xs">
                {slots.map((slot: { start: string; end: string }) => (
                  <Button
                    key={slot.start}
                    variant={selectedSlot === slot.start ? "filled" : "outline"}
                    color="yellow"
                    size="xs"
                    onClick={() => setSelectedSlot(slot.start)}
                  >
                    {new Date(slot.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </Button>
                ))}
              </Group>
            ) : (
              <Text size="sm" c="dimmed" ta="center">No hay horarios disponibles para este día</Text>
            )}
          </Box>
        )}

        <Textarea
          label="Notas (opcional)"
          placeholder="Indica si tienes alguna preferencia..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={2}
        />

        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>Cancelar</Button>
          <Button
            color="yellow"
            onClick={handleSubmit}
            loading={createBooking.isPending}
            disabled={!selectedSlot}
            leftSection={<IconCalendarPlus size={16} />}
          >
            Solicitar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function MyCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: upcomingBookings, isLoading: isLoadingUpcoming } = useMyBookings({ upcoming_only: true, limit: 20 });
  const { data: allBookings, isLoading: isLoadingAll } = useMyBookings({ upcoming_only: false, limit: 100 });
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const [bookingModalOpened, { open: openBookingModal, close: closeBookingModal }] = useDisclosure(false);

  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (!sessionId || isLoadingUpcoming || isLoadingAll) return;
    const allB = [...(upcomingBookings || []), ...(allBookings || [])];
    const target = allB.find(b => b.id === sessionId);
    if (target) {
      const targetDate = new Date(target.start_time);
      const today = new Date();
      const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1;
      const offset = Math.floor((diffDays + todayDow) / 7);
      setWeekOffset(offset);
      setSelectedDayDate(targetDate.toDateString());
      setHighlightedSessionId(sessionId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, upcomingBookings, allBookings, isLoadingUpcoming, isLoadingAll, setSearchParams]);

  const isLoading = isLoadingUpcoming || isLoadingAll;

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  const now = new Date();

  const upcomingSessions = (upcomingBookings || []).map(b => ({
    id: b.id,
    startDate: new Date(b.start_time),
    date: new Date(b.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }),
    time: `${new Date(b.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
    title: b.title,
    trainer: "Trackfiz",
    type: b.session_type || "presencial",
    location: (b.location as Record<string, unknown>)?.address as string || "Gimnasio",
    status: b.status,
  }));

  const pastSessions = (allBookings || [])
    .filter(b => new Date(b.end_time) < now && (b.status === "completed" || b.status === "no_show"))
    .slice(0, 10)
    .map(b => ({
      id: b.id,
      startDate: new Date(b.start_time),
      title: b.title,
      date: new Date(b.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }),
      time: `${new Date(b.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
    }));

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const allBookingDates = new Set(
    [...(upcomingBookings || []), ...(allBookings || [])].map(b => new Date(b.start_time).toDateString())
  );
  weekDays.forEach(d => {
    d.hasSession = allBookingDates.has(d.fullDate.toDateString());
  });

  const weekStart = weekDays[0].fullDate;
  const weekEnd = weekDays[6].fullDate;
  const weekMonthLabel = (() => {
    const startMonth = weekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const endMonth = weekEnd.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    if (startMonth === endMonth) return capitalize(startMonth);
    return `${capitalize(weekStart.toLocaleDateString('es-ES', { month: 'short' }))} - ${capitalize(endMonth)}`;
  })();

  const weekStartStr = weekDays[0].fullDate.toDateString();
  const weekEndStr = weekDays[6].fullDate.toDateString();
  const isInSelectedWeek = (d: Date) => {
    const ds = d.toDateString();
    return ds >= weekStartStr && ds <= weekEndStr;
  };

  const filteredUpcoming = selectedDayDate
    ? upcomingSessions.filter(s => s.startDate.toDateString() === selectedDayDate)
    : upcomingSessions.filter(s => weekOffset === 0 || isInSelectedWeek(s.startDate));
  const filteredPast = selectedDayDate
    ? pastSessions.filter(s => s.startDate.toDateString() === selectedDayDate)
    : pastSessions.filter(s => weekOffset === 0 || isInSelectedWeek(s.startDate));

  return (
    <Box p="xl" maw={1280} mx="auto">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mis Citas</Title>
          <Text c="dimmed">Tus sesiones programadas con tu entrenador</Text>
        </Box>
        <Button leftSection={<IconCalendarPlus size={16} />} color="yellow" onClick={openBookingModal}>
          Solicitar cita
        </Button>
      </Group>

      {/* Week Overview */}
      <Card shadow="sm" padding="lg" radius="lg" withBorder mb="xl">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <ActionIcon variant="subtle" color="gray" onClick={() => setWeekOffset(o => o - 1)}>
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Text fw={600}>{weekOffset === 0 ? "Esta Semana" : `Semana del ${weekDays[0].fullDate.getDate()}`} - {weekMonthLabel}</Text>
            <ActionIcon variant="subtle" color="gray" onClick={() => setWeekOffset(o => o + 1)}>
              <IconChevronRight size={18} />
            </ActionIcon>
            {weekOffset !== 0 && (
              <Button variant="subtle" size="xs" color="yellow" onClick={() => setWeekOffset(0)}>
                Hoy
              </Button>
            )}
          </Group>
          {selectedDayDate && (
            <Button variant="subtle" size="xs" color="gray" onClick={() => setSelectedDayDate(null)}>
              Ver todas
            </Button>
          )}
        </Group>
        <Group justify="space-around" wrap="nowrap" style={{ overflowX: "auto" }}>
          {weekDays.map((day, index) => {
            const isSelected = selectedDayDate === day.fullDate.toDateString();
            return (
              <Paper
                key={index}
                p="xs"
                radius="md"
                withBorder={day.isToday || isSelected}
                style={{
                  background: isSelected
                    ? "var(--mantine-color-blue-light)"
                    : day.isToday
                      ? "var(--mantine-color-yellow-light)"
                      : day.isPast
                        ? "var(--mantine-color-gray-light)"
                        : undefined,
                  minWidth: 44,
                  textAlign: "center",
                  flex: "1 1 0",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onClick={() => setSelectedDayDate(isSelected ? null : day.fullDate.toDateString())}
              >
                <Text size="xs" c="dimmed" fw={500}>{day.day}</Text>
                <Text size="lg" fw={day.isToday || isSelected ? 700 : 500}>{day.dateNum}</Text>
                {day.hasSession && (
                  <Box
                    mt={4}
                    mx="auto"
                    w={8}
                    h={8}
                    style={{
                      borderRadius: "50%",
                      background: day.isPast ? "var(--mantine-color-green-filled)" : "var(--mantine-color-yellow-filled)",
                    }}
                  />
                )}
              </Paper>
            );
          })}
        </Group>
      </Card>

      {/* Upcoming Sessions */}
      <Title order={4} mb="md">Próximas Sesiones</Title>
      <Stack gap="md" mb="xl">
        {filteredUpcoming.length === 0 && (
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Text c="dimmed" ta="center">
              {selectedDayDate ? "No hay sesiones para este día" : "No tienes sesiones próximas programadas"}
            </Text>
          </Card>
        )}
        {filteredUpcoming.map((session) => (
          <Card
            key={session.id}
            shadow="sm"
            padding="lg"
            radius="lg"
            withBorder
            style={highlightedSessionId === session.id ? { borderColor: "var(--mantine-color-yellow-filled)", borderWidth: 2 } : undefined}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <ThemeIcon
                  size="xl"
                  radius="md"
                  variant="light"
                  color={session.type === "online" ? "blue" : "yellow"}
                >
                  {session.type === "online" ? <IconVideo size={24} /> : <IconCalendarEvent size={24} />}
                </ThemeIcon>
                <Box>
                  <Group gap="xs" mb={4}>
                    <Text fw={600}>{session.title}</Text>
                    <Badge
                      color={session.status === "confirmed" ? "green" : "yellow"}
                      variant="light"
                      size="sm"
                    >
                      {session.status === "confirmed" ? "Confirmada" : "Pendiente"}
                    </Badge>
                  </Group>
                  <Group gap="md">
                    <Group gap={4}>
                      <IconClock size={14} />
                      <Text size="sm" c="dimmed">{session.date} &bull; {session.time}</Text>
                    </Group>
                  </Group>
                  <Group gap="md" mt={4}>
                    <Group gap={4}>
                      <IconUser size={14} />
                      <Text size="sm" c="dimmed">{session.trainer}</Text>
                    </Group>
                    <Group gap={4}>
                      <IconMapPin size={14} />
                      <Text size="sm" c="dimmed">{session.location}</Text>
                    </Group>
                  </Group>
                </Box>
              </Group>
              <Stack gap="xs">
                {session.type === "online" && (
                  <Button size="sm" color="blue">Unirse</Button>
                )}
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>

      {/* Past Sessions */}
      <Title order={4} mb="md">Sesiones Anteriores</Title>
      <Stack gap="sm">
        {filteredPast.length === 0 && (
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ opacity: 0.8 }}>
            <Text c="dimmed" ta="center">
              {selectedDayDate ? "No hay sesiones anteriores este día" : "No hay sesiones anteriores"}
            </Text>
          </Card>
        )}
        {filteredPast.map((session) => (
          <Card key={session.id} shadow="sm" padding="md" radius="md" withBorder style={{ opacity: 0.8 }}>
            <Group justify="space-between">
              <Group>
                <ThemeIcon size="md" radius="md" variant="light" color="green">
                  <IconCalendarEvent size={16} />
                </ThemeIcon>
                <Box>
                  <Text fw={500}>{session.title}</Text>
                  <Text size="sm" c="dimmed">{session.date} &bull; {session.time}</Text>
                </Box>
              </Group>
              <Badge color="green" variant="light">Completada</Badge>
            </Group>
          </Card>
        ))}
      </Stack>

      <RequestBookingModal opened={bookingModalOpened} onClose={closeBookingModal} />
    </Box>
  );
}
