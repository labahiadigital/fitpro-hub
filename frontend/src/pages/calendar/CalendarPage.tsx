import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Menu,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconCalendarEvent,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDotsVertical,
  IconEdit,
  IconMapPin,
  IconSettings,
  IconTrash,
  IconUser,
  IconUsers,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState, useMemo } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  useBookings,
  useCancelBooking,
  useCompleteBooking,
  useCreateBooking,
  useDeleteBooking,
  useUpdateBooking,
} from "../../hooks/useBookings";
import { useClients } from "../../hooks/useClients";
import { useTeamMembers } from "../../hooks/useTeam";
import { BottomSheet } from "../../components/common/BottomSheet";
import {
  useGoogleCalendarStatus,
  useGoogleCalendarEvents,
  type GoogleCalendarEvent,
} from "../../hooks/useGoogleCalendar";
import { useNavigate } from "react-router-dom";
import "dayjs/locale/es";

dayjs.locale("es");

interface Booking {
  id: string;
  title: string;
  client_name?: string;
  client_id?: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show";
  session_type: "individual" | "group";
  modality: "in_person" | "online";
  location?: { type: string; address?: string; online_link?: string };
  notes?: string;
  color?: string;
}

// Tipo unificado para mostrar en el calendario
interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: "booking" | "google";
  color: string;
  booking?: Booking;
  googleEvent?: GoogleCalendarEvent;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmada", color: "green" },
  pending: { label: "Pendiente", color: "yellow" },
  cancelled: { label: "Cancelada", color: "red" },
  completed: { label: "Completada", color: "blue" },
  no_show: { label: "No asistió", color: "gray" },
};

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);

  const startOfWeek = dayjs(currentDate).startOf("week");
  const endOfWeek = dayjs(currentDate).endOf("week");
  const startOfMonth = dayjs(currentDate).startOf("month");
  const endOfMonth = dayjs(currentDate).endOf("month");

  // Calcular fechas para las queries
  const dateParams = {
    start_date:
      view === "month"
        ? startOfMonth.toISOString()
        : view === "week"
          ? startOfWeek.toISOString()
          : dayjs(currentDate).startOf("day").toISOString(),
    end_date:
      view === "month"
        ? endOfMonth.toISOString()
        : view === "week"
          ? endOfWeek.toISOString()
          : dayjs(currentDate).endOf("day").toISOString(),
  };

  // Fetch bookings de Trackfiz
  const { data: bookingsData, isLoading: bookingsLoading, isError: bookingsError, refetch: refetchBookings } = useBookings(dateParams);

  // Verificar si Google Calendar está conectado
  const { data: gcalStatus } = useGoogleCalendarStatus();
  
  // Fetch eventos de Google Calendar (si está conectado, excluyendo los de Trackfiz)
  const { data: googleEvents } = useGoogleCalendarEvents({
    start_date: dateParams.start_date,
    end_date: dateParams.end_date,
    include_trackfiz: false,
    enabled: gcalStatus?.connected ?? false,
  });

  const { data: clientsData } = useClients({ page: 1 });
  const { data: teamMembers } = useTeamMembers();

  const teamMemberOptions = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers
      .filter((m) => m.role !== "client" && m.is_active)
      .map((m) => ({ value: m.user_id, label: m.full_name || m.name || m.email }));
  }, [teamMembers]);

  const clientsMap = useMemo(() => {
    const map = new Map<string, string>();
    (clientsData?.items || []).forEach((c: { id: string; full_name?: string; first_name: string; last_name: string }) => {
      map.set(c.id, c.full_name || `${c.first_name} ${c.last_name}`);
    });
    return map;
  }, [clientsData]);

  const bookings: Booking[] = (bookingsData || []).map((b: Booking) => ({
    ...b,
    client_name: b.client_name || (b.client_id ? clientsMap.get(b.client_id) : undefined) || "Sin cliente",
  })).filter((b: Booking) => !filterMemberId || (b as unknown as Record<string, unknown>).organizer_id === filterMemberId);
  
  // Combinar bookings con eventos de Google Calendar
  const allEvents: CalendarEvent[] = [
    // Bookings de Trackfiz
    ...bookings.map((b): CalendarEvent => ({
      id: b.id,
      title: b.title,
      start_time: b.start_time,
      end_time: b.end_time,
      type: "booking",
      color: b.status === "cancelled" ? "gray" : 
             b.status === "completed" ? "green" :
             b.modality === "online" ? "blue" : "teal",
      booking: b,
    })),
    // Eventos de Google Calendar (externos)
    ...(googleEvents || []).map((e): CalendarEvent => ({
      id: `gcal-${e.id}`,
      title: `📅 ${e.title}`,
      start_time: e.start,
      end_time: e.end,
      type: "google",
      color: "grape", // Color distintivo para eventos externos
      googleEvent: e,
    })),
  ];

  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const cancelBooking = useCancelBooking();
  const deleteBooking = useDeleteBooking();
  const completeBooking = useCompleteBooking();

  const form = useForm({
    initialValues: {
      title: "",
      client_id: "",
      session_type: "individual",
      modality: "in_person",
      start_time: new Date() as Date | null,
      end_time: new Date(Date.now() + 60 * 60 * 1000) as Date | null,
      location: "",
      notes: "",
      is_recurring: false,
      recurrence_type: "weekly",
      max_participants: 1,
    },
    validate: {
      title: (value) => (value.length < 2 ? "Título requerido" : null),
      start_time: (value) => (!value ? "Fecha de inicio requerida" : null),
      end_time: (value) => (!value ? "Fecha de fin requerida" : null),
    },
  });

  const handleCreateBooking = async (values: typeof form.values) => {
    // Validar que las fechas existen
    if (!values.start_time || !values.end_time) {
      console.error("Fechas inválidas");
      return;
    }
    
    // Convertir a Date si no lo es ya
    const startTime = values.start_time instanceof Date 
      ? values.start_time 
      : new Date(values.start_time);
    const endTime = values.end_time instanceof Date 
      ? values.end_time 
      : new Date(values.end_time);
    
    try {
      await createBooking.mutateAsync({
        title: values.title,
        description: values.notes || undefined,
        session_type: values.session_type as "individual" | "group",
        modality: values.modality as "in_person" | "online",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: {
          type: values.modality,
          address:
            values.modality === "in_person" ? values.location : undefined,
          online_link:
            values.modality === "online" ? values.location : undefined,
        },
        capacity: values.max_participants,
        is_recurring: values.is_recurring,
        // Only send client_id if a client was selected
        ...(values.client_id ? { client_id: values.client_id } : {}),
      });
      closeModal();
      form.reset();
    } catch (error) {
      console.error("Error creating booking:", error);
      // Error handled by mutation
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm("¿Estás seguro de que quieres cancelar esta sesión?")) {
      try {
        await cancelBooking.mutateAsync(bookingId);
        setSelectedBooking(null);
      } catch {
        // Error handled by mutation
      }
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (window.confirm("¿Estás seguro de que quieres ELIMINAR esta sesión permanentemente? Esta acción no se puede deshacer.")) {
      try {
        await deleteBooking.mutateAsync(bookingId);
        setSelectedBooking(null);
      } catch {
        // Error handled by mutation
      }
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      await completeBooking.mutateAsync(bookingId);
      setSelectedBooking(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await updateBooking.mutateAsync({
        id: bookingId,
        data: { status: "confirmed" },
      });
      setSelectedBooking(null);
    } catch {
      // Error handled by mutation
    }
  };

  const editForm = useForm({
    initialValues: {
      start_time: null as Date | null,
      end_time: null as Date | null,
    },
  });

  const handleOpenEdit = (booking: Booking) => {
    editForm.setValues({
      start_time: new Date(booking.start_time),
      end_time: new Date(booking.end_time),
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedBooking || !editForm.values.start_time || !editForm.values.end_time) return;
    try {
      await updateBooking.mutateAsync({
        id: selectedBooking.id,
        data: {
          start_time: editForm.values.start_time.toISOString(),
          end_time: editForm.values.end_time.toISOString(),
        },
      });
      setIsEditing(false);
      setSelectedBooking(null);
    } catch {
      // Error handled by mutation
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const unit = view === "month" ? "month" : view === "week" ? "week" : "day";
    setCurrentDate((current) =>
      direction === "prev"
        ? dayjs(current).subtract(1, unit).toDate()
        : dayjs(current).add(1, unit).toDate()
    );
  };

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    startOfWeek.add(i, "day")
  );
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  const getBookingsForDay = (day: dayjs.Dayjs) =>
    bookings.filter((booking) => dayjs(booking.start_time).isSame(day, "day"));
  
  // Incluye también eventos de Google Calendar
  const getEventsForDay = (day: dayjs.Dayjs) =>
    allEvents.filter((event) => dayjs(event.start_time).isSame(day, "day"));

  const getBookingStyle = (booking: Booking) => {
    const startHour = dayjs(booking.start_time).hour();
    const startMinute = dayjs(booking.start_time).minute();
    const duration = dayjs(booking.end_time).diff(
      dayjs(booking.start_time),
      "minute"
    );

    const top = ((startHour - 7) * 60 + startMinute) * (60 / 60);
    const height = Math.max(duration * (60 / 60), 30);

    return { top: `${top}px`, height: `${height}px` };
  };

  const getStatusColor = (status: Booking["status"]) => {
    switch (status) {
      case "confirmed":
        return "green";
      case "pending":
        return "yellow";
      case "cancelled":
        return "red";
      case "completed":
        return "blue";
      case "no_show":
        return "gray";
      default:
        return "gray";
    }
  };

  const getMonthDays = () => {
    const days = [];
    const startDay = startOfMonth.startOf("week");
    const endDay = endOfMonth.endOf("week");

    let day = startDay;
    while (day.isBefore(endDay) || day.isSame(endDay, "day")) {
      days.push(day);
      day = day.add(1, "day");
    }
    return days;
  };

  const todayStats = {
    total: bookings.filter((b) => dayjs(b.start_time).isSame(dayjs(), "day"))
      .length,
    confirmed: bookings.filter(
      (b) =>
        dayjs(b.start_time).isSame(dayjs(), "day") && b.status === "confirmed"
    ).length,
    pending: bookings.filter(
      (b) =>
        dayjs(b.start_time).isSame(dayjs(), "day") && b.status === "pending"
    ).length,
  };

  // Get clients for select dropdown
  const clientOptions = (clientsData?.items || []).map(
    (c: { id: string; full_name?: string; first_name: string; last_name: string }) => ({
      value: c.id,
      label: c.full_name || `${c.first_name} ${c.last_name}`,
    })
  );

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Nueva Sesión",
          onClick: openModal,
        }}
        description="Gestiona tus sesiones y reservas de forma eficiente"
        title="Calendario"
      >
        <Group justify="space-between" wrap="wrap">
          <Group>
            <ActionIcon
              onClick={() => navigateDate("prev")}
              size="lg"
              variant="default"
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <Text
              fw={600}
              size="lg"
              style={{ minWidth: 200, textAlign: "center" }}
            >
              {view === "month"
                ? dayjs(currentDate).format("MMMM YYYY")
                : view === "week"
                  ? `${startOfWeek.format("D MMM")} - ${endOfWeek.format("D MMM YYYY")}`
                  : dayjs(currentDate).format("dddd, D MMMM YYYY")}
            </Text>
            <ActionIcon
              onClick={() => navigateDate("next")}
              size="lg"
              variant="default"
            >
              <IconChevronRight size={18} />
            </ActionIcon>
            <Button
              onClick={() => setCurrentDate(new Date())}
              size="sm"
              variant="light"
            >
              Hoy
            </Button>
          </Group>
          <Group gap="sm">
            {teamMemberOptions.length > 1 && (
              <Select
                placeholder="Todos los miembros"
                data={teamMemberOptions}
                value={filterMemberId}
                onChange={setFilterMemberId}
                clearable
                size="sm"
                w={200}
              />
            )}
            <SegmentedControl
              data={[
                { label: "Mes", value: "month" },
                { label: "Semana", value: "week" },
                { label: "Día", value: "day" },
              ]}
              onChange={(v) => setView(v as "month" | "week" | "day")}
              value={view}
            />
            <Tooltip label="Configurar calendario">
              <ActionIcon variant="light" size="lg" onClick={() => navigate("/settings")}>
                <IconSettings size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </PageHeader>

      {/* Today's Summary */}
      <SimpleGrid
        cols={{ base: 1, sm: 3 }}
        mb="xl"
        spacing="md"
        className="stagger"
      >
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">
                Sesiones Hoy
              </Text>
              <Text
                className="text-display"
                style={{ fontSize: "2rem", color: "var(--nv-primary)" }}
              >
                {bookingsLoading ? <Loader size="sm" /> : todayStats.total}
              </Text>
            </Box>
            <ThemeIcon
              size={48}
              radius="xl"
              variant="light"
              style={{
                backgroundColor: "var(--nv-primary-glow)",
                color: "var(--nv-primary)",
              }}
            >
              <IconCalendarEvent size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">
                Confirmadas
              </Text>
              <Text
                className="text-display"
                style={{ fontSize: "2rem", color: "var(--nv-success)" }}
              >
                {bookingsLoading ? <Loader size="sm" /> : todayStats.confirmed}
              </Text>
            </Box>
            <ThemeIcon
              size={48}
              radius="xl"
              variant="light"
              style={{
                backgroundColor: "var(--nv-success-bg)",
                color: "var(--nv-success)",
              }}
            >
              <IconCheck size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">
                Pendientes
              </Text>
              <Text
                className="text-display"
                style={{ fontSize: "2rem", color: "var(--nv-warning)" }}
              >
                {bookingsLoading ? <Loader size="sm" /> : todayStats.pending}
              </Text>
            </Box>
            <ThemeIcon
              size={48}
              radius="xl"
              variant="light"
              style={{
                backgroundColor: "var(--nv-warning-bg)",
                color: "var(--nv-warning)",
              }}
            >
              <IconAlertCircle size={24} />
            </ThemeIcon>
          </Group>
        </Box>
      </SimpleGrid>

      {/* Calendar Views */}
      {bookingsLoading ? (
        <Paper radius="lg" p="xl" ta="center" withBorder>
          <Loader size="lg" />
          <Text c="dimmed" mt="md">
            Cargando calendario...
          </Text>
        </Paper>
      ) : bookingsError ? (
        <Paper radius="lg" p="xl" ta="center" withBorder>
          <Text c="dimmed" mb="md">Error al cargar las reservas</Text>
          <Button variant="light" onClick={() => refetchBookings()}>Reintentar</Button>
        </Paper>
      ) : view === "month" ? (
        <Paper radius="lg" style={{ overflow: "hidden" }} withBorder>
          {/* Month Header */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: "1px solid var(--mantine-color-gray-2)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
              <Box key={day} p="sm" ta="center">
                <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                  {day}
                </Text>
              </Box>
            ))}
          </Box>

          {/* Month Grid */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
            }}
          >
            {getMonthDays().map((day, index) => {
              const isCurrentMonth = day.month() === dayjs(currentDate).month();
              const isToday = day.isSame(dayjs(), "day");
              const dayBookings = getBookingsForDay(day);

              return (
                <Box
                  h={100}
                  key={index}
                  p="xs"
                  style={{
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    borderRight:
                      (index + 1) % 7 !== 0
                        ? "1px solid var(--mantine-color-gray-2)"
                        : undefined,
                    backgroundColor: isCurrentMonth
                      ? undefined
                      : "var(--mantine-color-gray-0)",
                  }}
                >
                  <Text
                    c={
                      isCurrentMonth
                        ? isToday
                          ? "primary"
                          : undefined
                        : "dimmed"
                    }
                    fw={isToday ? 700 : 400}
                    mb="xs"
                    size="sm"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: isToday
                        ? "var(--mantine-color-primary-6)"
                        : undefined,
                      color: isToday ? "white" : undefined,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {day.format("D")}
                  </Text>
                  <Stack gap={2}>
                    {dayBookings.slice(0, 2).map((booking) => {
                      const statusInfo = STATUS_LABELS[booking.status] || STATUS_LABELS.pending;
                      return (
                        <Box
                          key={booking.id}
                          p={2}
                          style={{
                            backgroundColor: `var(--mantine-color-${getStatusColor(booking.status)}-1)`,
                            borderLeft: `2px solid var(--mantine-color-${getStatusColor(booking.status)}-6)`,
                            borderRadius: 2,
                            cursor: "pointer",
                          }}
                        >
                          <Group gap={2} wrap="nowrap" justify="space-between">
                            <Text size="xs" truncate style={{ flex: 1, minWidth: 0 }}>
                              {booking.title}
                            </Text>
                            <Menu shadow="md" width={160} position="bottom-end" withinPortal>
                              <Menu.Target>
                                <ActionIcon size={14} variant="transparent" color="gray" onClick={(e) => e.stopPropagation()}>
                                  <IconDotsVertical size={10} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item onClick={() => setSelectedBooking(booking)}>Ver detalle</Menu.Item>
                                {booking.status === "pending" && (
                                  <>
                                    <Menu.Item color="green" leftSection={<IconCheck size={14} />} onClick={() => handleConfirmBooking(booking.id)}>Aprobar</Menu.Item>
                                    <Menu.Item color="red" leftSection={<IconX size={14} />} onClick={() => handleCancelBooking(booking.id)}>Rechazar</Menu.Item>
                                  </>
                                )}
                                {booking.status === "confirmed" && (
                                  <>
                                    <Menu.Item color="green" leftSection={<IconCheck size={14} />} onClick={() => handleCompleteBooking(booking.id)}>Completar</Menu.Item>
                                    <Menu.Item color="red" leftSection={<IconX size={14} />} onClick={() => handleCancelBooking(booking.id)}>Cancelar</Menu.Item>
                                  </>
                                )}
                                <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => { setSelectedBooking(booking); handleOpenEdit(booking); }}>Modificar</Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                          <Badge size="xs" variant="dot" color={statusInfo.color} style={{ fontSize: 7 }}>
                            {statusInfo.label}
                          </Badge>
                        </Box>
                      );
                    })}
                    {dayBookings.length > 2 && (
                      <Text c="dimmed" size="xs">
                        +{dayBookings.length - 2} más
                      </Text>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Paper>
      ) : (
        <Paper radius="lg" style={{ overflow: "hidden" }} withBorder>
          {/* Week/Day Header */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns:
                view === "week" ? "60px repeat(7, 1fr)" : "60px 1fr",
              borderBottom: "1px solid var(--mantine-color-gray-2)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Box p="sm" />
            {(view === "week" ? weekDays : [dayjs(currentDate)]).map((day) => (
              <Box
                key={day.format("YYYY-MM-DD")}
                p="sm"
                style={{
                  borderLeft: "1px solid var(--mantine-color-gray-2)",
                  backgroundColor: day.isSame(dayjs(), "day")
                    ? "var(--mantine-color-primary-0)"
                    : undefined,
                }}
                ta="center"
              >
                <Text c="dimmed" size="xs" tt="uppercase">
                  {day.format("ddd")}
                </Text>
                <Text
                  c={day.isSame(dayjs(), "day") ? "primary" : undefined}
                  fw={day.isSame(dayjs(), "day") ? 700 : 500}
                  size="lg"
                >
                  {day.format("D")}
                </Text>
              </Box>
            ))}
          </Box>

          {/* Time Grid */}
          <Box
            style={{ display: "flex", maxHeight: "600px", overflowY: "auto" }}
          >
            <Box style={{ width: 60, flexShrink: 0 }}>
              {hours.map((hour) => (
                <Box
                  h={60}
                  key={hour}
                  style={{
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    paddingRight: 8,
                    paddingTop: 4,
                  }}
                >
                  <Text c="dimmed" size="xs">
                    {hour}:00
                  </Text>
                </Box>
              ))}
            </Box>

            <Box
              style={{
                display: "grid",
                gridTemplateColumns: view === "week" ? "repeat(7, 1fr)" : "1fr",
                flex: 1,
              }}
            >
              {(view === "week" ? weekDays : [dayjs(currentDate)]).map(
                (day) => (
                  <Box
                    key={day.format("YYYY-MM-DD")}
                    style={{
                      borderLeft: "1px solid var(--mantine-color-gray-2)",
                      position: "relative",
                    }}
                  >
                    {hours.map((hour) => (
                      <Box
                        h={60}
                        key={hour}
                        style={{
                          borderBottom: "1px solid var(--mantine-color-gray-2)",
                        }}
                      />
                    ))}

                    {/* Bookings de Trackfiz */}
                    {getBookingsForDay(day).map((booking) => {
                      const statusInfo = STATUS_LABELS[booking.status] || STATUS_LABELS.pending;
                      return (
                        <Box
                          key={booking.id}
                          style={{
                            position: "absolute",
                            left: 2,
                            right: 2,
                            ...getBookingStyle(booking),
                            backgroundColor: `var(--mantine-color-${getStatusColor(booking.status)}-1)`,
                            borderLeft: `3px solid var(--mantine-color-${getStatusColor(booking.status)}-6)`,
                            borderRadius: 4,
                            padding: 4,
                            overflow: "hidden",
                          }}
                        >
                          <Group justify="space-between" wrap="nowrap" gap={2}>
                            <Box style={{ minWidth: 0, flex: 1 }}>
                              <Text fw={600} size="xs" truncate>{booking.title}</Text>
                              <Text c="dimmed" size="xs" truncate>{booking.client_name}</Text>
                            </Box>
                            <Menu shadow="md" width={160} position="bottom-end" withinPortal>
                              <Menu.Target>
                                <ActionIcon size="xs" variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
                                  <IconDotsVertical size={12} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item onClick={() => setSelectedBooking(booking)}>
                                  Ver detalle
                                </Menu.Item>
                                {booking.status === "pending" && (
                                  <>
                                    <Menu.Item color="green" leftSection={<IconCheck size={14} />} onClick={() => handleConfirmBooking(booking.id)}>
                                      Aprobar
                                    </Menu.Item>
                                    <Menu.Item color="red" leftSection={<IconX size={14} />} onClick={() => handleCancelBooking(booking.id)}>
                                      Rechazar
                                    </Menu.Item>
                                  </>
                                )}
                                {booking.status === "confirmed" && (
                                  <>
                                    <Menu.Item color="green" leftSection={<IconCheck size={14} />} onClick={() => handleCompleteBooking(booking.id)}>
                                      Completar
                                    </Menu.Item>
                                    <Menu.Item color="red" leftSection={<IconX size={14} />} onClick={() => handleCancelBooking(booking.id)}>
                                      Cancelar
                                    </Menu.Item>
                                  </>
                                )}
                                <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => { setSelectedBooking(booking); handleOpenEdit(booking); }}>
                                  Modificar
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                          <Group gap={4} mt={2}>
                            <Badge size="xs" variant="filled" color={statusInfo.color} style={{ fontSize: 8, height: 14, padding: "0 4px" }}>
                              {statusInfo.label}
                            </Badge>
                            <Text c="dimmed" size="xs">{dayjs(booking.start_time).format("HH:mm")}</Text>
                          </Group>
                        </Box>
                      );
                    })}
                    
                    {/* Eventos de Google Calendar (externos) */}
                    {getEventsForDay(day)
                      .filter((e) => e.type === "google")
                      .map((event) => {
                        const startHour = dayjs(event.start_time).hour();
                        const startMinute = dayjs(event.start_time).minute();
                        const duration = dayjs(event.end_time).diff(
                          dayjs(event.start_time),
                          "minute"
                        );
                        const top = ((startHour - 7) * 60 + startMinute) * (60 / 60);
                        const height = Math.max(duration * (60 / 60), 30);
                        
                        return (
                          <Box
                            key={event.id}
                            style={{
                              position: "absolute",
                              left: 2,
                              right: 2,
                              top: `${top}px`,
                              height: `${height}px`,
                              backgroundColor: "var(--mantine-color-grape-1)",
                              borderLeft: "3px solid var(--mantine-color-grape-6)",
                              borderRadius: 4,
                              padding: 4,
                              overflow: "hidden",
                              opacity: 0.85,
                            }}
                            title={`${event.googleEvent?.calendar_name || "Google Calendar"}\n${event.googleEvent?.location || ""}`}
                          >
                            <Text fw={600} size="xs" truncate>
                              📅 {event.title.replace("📅 ", "")}
                            </Text>
                            <Text c="dimmed" size="xs" truncate>
                              {event.googleEvent?.calendar_name}
                            </Text>
                            <Text c="dimmed" size="xs">
                              {dayjs(event.start_time).format("HH:mm")}
                            </Text>
                          </Box>
                        );
                      })}
                  </Box>
                )
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Create Session Modal */}
      <BottomSheet
        onClose={closeModal}
        opened={modalOpened}
        size="lg"
        title="Nueva Sesión"
      >
        <form onSubmit={form.onSubmit(handleCreateBooking)}>
          <Stack>
            <TextInput
              label="Título"
              leftSection={<IconCalendarEvent size={16} />}
              placeholder="Entrenamiento Personal"
              required
              {...form.getInputProps("title")}
            />

            <Select
              data={clientOptions}
              label="Cliente"
              leftSection={<IconUser size={16} />}
              placeholder="Selecciona un cliente"
              searchable
              {...form.getInputProps("client_id")}
            />

            <Group grow>
              <Select
                data={[
                  { value: "individual", label: "Individual" },
                  { value: "group", label: "Grupal" },
                ]}
                label="Tipo de sesión"
                {...form.getInputProps("session_type")}
              />
              <Select
                data={[
                  { value: "in_person", label: "Presencial" },
                  { value: "online", label: "Online" },
                ]}
                label="Modalidad"
                {...form.getInputProps("modality")}
              />
            </Group>

            {form.values.session_type === "group" && (
              <NumberInput
                label="Máximo de participantes"
                max={50}
                min={2}
                {...form.getInputProps("max_participants")}
              />
            )}

            <Group grow>
              <DateTimePicker
                label="Inicio"
                leftSection={<IconClock size={16} />}
                placeholder="Fecha y hora de inicio"
                required
                valueFormat="DD/MM/YYYY HH:mm"
                value={form.values.start_time}
                onChange={(value) => {
                  const dateValue = value ? (typeof value === 'string' ? new Date(value) : value) : null;
                  form.setFieldValue("start_time", dateValue);
                  // Actualizar fecha de fin automáticamente (+1 hora)
                  if (dateValue) {
                    const newEndTime = new Date(dateValue.getTime() + 60 * 60 * 1000);
                    form.setFieldValue("end_time", newEndTime);
                  }
                }}
                error={form.errors.start_time}
              />
              <DateTimePicker
                label="Fin"
                leftSection={<IconClock size={16} />}
                placeholder="Fecha y hora de fin"
                required
                valueFormat="DD/MM/YYYY HH:mm"
                minDate={form.values.start_time instanceof Date ? form.values.start_time : undefined}
                value={form.values.end_time}
                onChange={(value) => {
                  const dateValue = value ? (typeof value === 'string' ? new Date(value) : value) : null;
                  form.setFieldValue("end_time", dateValue);
                }}
                error={form.errors.end_time}
              />
            </Group>

            <TextInput
              label={
                form.values.modality === "in_person"
                  ? "Ubicación"
                  : "Enlace de videollamada"
              }
              leftSection={
                form.values.modality === "in_person" ? (
                  <IconMapPin size={16} />
                ) : (
                  <IconVideo size={16} />
                )
              }
              placeholder={
                form.values.modality === "in_person"
                  ? "Gimnasio Centro"
                  : "https://meet.google.com/..."
              }
              {...form.getInputProps("location")}
            />

            <Switch
              label="Sesión recurrente"
              {...form.getInputProps("is_recurring", { type: "checkbox" })}
            />

            {form.values.is_recurring && (
              <Select
                data={[
                  { value: "daily", label: "Diariamente" },
                  { value: "weekly", label: "Semanalmente" },
                  { value: "biweekly", label: "Cada 2 semanas" },
                  { value: "monthly", label: "Mensualmente" },
                ]}
                label="Repetir"
                {...form.getInputProps("recurrence_type")}
              />
            )}

            <Textarea
              label="Notas"
              minRows={2}
              placeholder="Notas adicionales..."
              {...form.getInputProps("notes")}
            />

            <Group justify="flex-end" mt="md">
              <Button onClick={closeModal} variant="default">
                Cancelar
              </Button>
              <Button loading={createBooking.isPending} type="submit">
                Crear Sesión
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Booking Detail Modal */}
      <BottomSheet
        onClose={() => { setSelectedBooking(null); setIsEditing(false); }}
        opened={!!selectedBooking}
        size="md"
        title={isEditing ? "Modificar Sesión" : "Detalle de Sesión"}
      >
        {selectedBooking && !isEditing && (
          <Stack>
            <Group justify="space-between">
              <Box>
                <Text fw={700} size="xl">
                  {selectedBooking.title}
                </Text>
                <Badge
                  color={getStatusColor(selectedBooking.status)}
                  mt="xs"
                  variant="light"
                  size="lg"
                >
                  {STATUS_LABELS[selectedBooking.status]?.label || selectedBooking.status}
                </Badge>
              </Box>
            </Group>

            <Divider />

            <Group gap="sm">
              <ThemeIcon color="gray" size="md" variant="light">
                <IconUser size={16} />
              </ThemeIcon>
              <Box>
                <Text c="dimmed" size="xs">Cliente</Text>
                <Text fw={500} size="sm">
                  {selectedBooking.client_name || "No especificado"}
                </Text>
              </Box>
            </Group>

            <Group gap="sm">
              <ThemeIcon color="gray" size="md" variant="light">
                <IconClock size={16} />
              </ThemeIcon>
              <Box>
                <Text c="dimmed" size="xs">Horario</Text>
                <Text fw={500} size="sm">
                  {dayjs(selectedBooking.start_time).format("dddd, D MMMM YYYY")}
                </Text>
                <Text size="sm">
                  {dayjs(selectedBooking.start_time).format("HH:mm")} -{" "}
                  {dayjs(selectedBooking.end_time).format("HH:mm")}
                </Text>
              </Box>
            </Group>

            <Group gap="sm">
              <ThemeIcon color="gray" size="md" variant="light">
                {selectedBooking.modality === "in_person" ? (
                  <IconMapPin size={16} />
                ) : (
                  <IconVideo size={16} />
                )}
              </ThemeIcon>
              <Box>
                <Text c="dimmed" size="xs">
                  {selectedBooking.modality === "in_person" ? "Ubicación" : "Online"}
                </Text>
                <Text fw={500} size="sm">
                  {selectedBooking.location?.address ||
                    selectedBooking.location?.online_link ||
                    "No especificada"}
                </Text>
              </Box>
            </Group>

            <Group gap="sm">
              <ThemeIcon color="gray" size="md" variant="light">
                <IconUsers size={16} />
              </ThemeIcon>
              <Box>
                <Text c="dimmed" size="xs">Tipo</Text>
                <Text fw={500} size="sm">
                  {selectedBooking.session_type === "individual" ? "Individual" : "Grupal"}
                </Text>
              </Box>
            </Group>

            <Divider />

            <Group gap="sm" justify="flex-end" wrap="wrap">
              {selectedBooking.status === "pending" && (
                <>
                  <Button color="green" leftSection={<IconCheck size={16} />} loading={updateBooking.isPending} onClick={() => handleConfirmBooking(selectedBooking.id)} variant="light">
                    Aprobar
                  </Button>
                  <Button color="red" leftSection={<IconX size={16} />} loading={cancelBooking.isPending} onClick={() => handleCancelBooking(selectedBooking.id)} variant="light">
                    Rechazar
                  </Button>
                </>
              )}
              {selectedBooking.status === "confirmed" && (
                <>
                  <Button color="green" leftSection={<IconCheck size={16} />} loading={completeBooking.isPending} onClick={() => handleCompleteBooking(selectedBooking.id)} variant="light">
                    Completar
                  </Button>
                  <Button color="red" leftSection={<IconX size={16} />} loading={cancelBooking.isPending} onClick={() => handleCancelBooking(selectedBooking.id)} variant="light">
                    Cancelar
                  </Button>
                </>
              )}
              <Button variant="light" leftSection={<IconEdit size={16} />} onClick={() => handleOpenEdit(selectedBooking)}>
                Modificar fecha/hora
              </Button>
              <Button color="red" leftSection={<IconTrash size={16} />} loading={deleteBooking.isPending} onClick={() => handleDeleteBooking(selectedBooking.id)} variant="outline">
                Eliminar
              </Button>
              <Button onClick={() => { setSelectedBooking(null); setIsEditing(false); }} variant="default">
                Cerrar
              </Button>
            </Group>
          </Stack>
        )}
        {selectedBooking && isEditing && (
          <Stack>
            <Text fw={600} size="lg">{selectedBooking.title}</Text>
            <Badge color={getStatusColor(selectedBooking.status)} variant="light">
              {STATUS_LABELS[selectedBooking.status]?.label}
            </Badge>
            <Divider />
            <DateTimePicker
              label="Nuevo inicio"
              leftSection={<IconClock size={16} />}
              valueFormat="DD/MM/YYYY HH:mm"
              value={editForm.values.start_time}
              onChange={(value) => {
                const dateValue = value ? (typeof value === "string" ? new Date(value) : value) : null;
                editForm.setFieldValue("start_time", dateValue);
                if (dateValue) {
                  const newEnd = new Date(dateValue.getTime() + 60 * 60 * 1000);
                  editForm.setFieldValue("end_time", newEnd);
                }
              }}
            />
            <DateTimePicker
              label="Nuevo fin"
              leftSection={<IconClock size={16} />}
              valueFormat="DD/MM/YYYY HH:mm"
              value={editForm.values.end_time}
              minDate={editForm.values.start_time || undefined}
              onChange={(value) => {
                const dateValue = value ? (typeof value === "string" ? new Date(value) : value) : null;
                editForm.setFieldValue("end_time", dateValue);
              }}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setIsEditing(false)}>
                Volver
              </Button>
              <Button loading={updateBooking.isPending} onClick={handleSaveEdit}>
                Guardar cambios
              </Button>
            </Group>
          </Stack>
        )}
      </BottomSheet>
    </Container>
  );
}

export default CalendarPage;
