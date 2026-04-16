import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconClockPause,
  IconClockPlay,
  IconClockStop,
  IconDownload,
  IconListDetails,
  IconPlus,
  IconPlayerPause,
  IconPlayerPlay,
  IconSunHigh,
  IconTrash,
  IconUmbrellaFilled,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuthStore } from "../../stores/auth";
import { useTeamMembers } from "../../hooks/useTeam";
import {
  useClockStatus,
  useClockIn,
  useClockOut,
  useTogglePause,
  useTimeRecords,
  useDeleteRecord,
  useLeaveRequests,
  useCreateLeave,
  useApproveLeave,
  useRejectLeave,
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
} from "../../hooks/useTimeClock";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  vacaciones: "Vacaciones",
  baja_medica: "Baja Médica",
  asunto_personal: "Asunto Personal",
  maternidad_paternidad: "Maternidad/Paternidad",
  formacion: "Formación",
  otros: "Otros",
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
  vacaciones: "blue",
  baja_medica: "red",
  asunto_personal: "grape",
  maternidad_paternidad: "pink",
  formacion: "teal",
  otros: "gray",
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: "yellow",
  aprobada: "green",
  rechazada: "red",
};

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

// ─── Live Clock ─────────────────────────────────────────────────────────────

function LiveClock({ size = "xl" }: { size?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Text fw={700} size={size} ff="monospace" ta="center">
      {now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </Text>
  );
}

// ─── Tab: Fichar ────────────────────────────────────────────────────────────

function ClockTab() {
  const { data: status, isLoading } = useClockStatus();
  const { user } = useAuthStore();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const togglePause = useTogglePause();
  const { data: todayRecords = [] } = useTimeRecords({ start_date: new Date().toISOString().split("T")[0], end_date: new Date().toISOString().split("T")[0] });

  const [justification, setJustification] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!status?.is_clocked_in || !status.clock_in) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(status.clock_in!).getTime()) / 1000);
      setElapsed(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status?.is_clocked_in, status?.clock_in]);

  const elapsedStr = useMemo(() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [elapsed]);

  const WORK_DAY_HOURS = 8;
  const remaining = useMemo(() => {
    const totalMin = WORK_DAY_HOURS * 60;
    const worked = status?.net_minutes_today ?? 0;
    const rem = Math.max(0, totalMin - worked);
    return formatMinutes(rem);
  }, [status?.net_minutes_today]);

  const handleClockAction = useCallback((action: "in" | "out" | "pause" | "resume") => {
    const getGeoAndAct = () => {
      if (action === "in" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clockIn.mutate({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              justification: justification || undefined,
            } as Record<string, unknown>, {
              onSuccess: () => {
                const name = user?.full_name || user?.email?.split("@")[0] || "usuario";
                setSuccessMessage(`¡Fichaje realizado, ${name}!`);
                setShowSuccess(true);
                setJustification("");
                setTimeout(() => setShowSuccess(false), 4000);
              },
            });
          },
          () => {
            clockIn.mutate({ justification: justification || undefined } as Record<string, unknown>, {
              onSuccess: () => {
                const name = user?.full_name || user?.email?.split("@")[0] || "usuario";
                setSuccessMessage(`¡Fichaje realizado, ${name}!`);
                setShowSuccess(true);
                setJustification("");
                setTimeout(() => setShowSuccess(false), 4000);
              },
            });
          },
          { timeout: 5000 }
        );
      } else if (action === "out") {
        clockOut.mutate({ justification: justification || undefined } as Record<string, unknown>, {
          onSuccess: () => {
            setSuccessMessage("¡Salida registrada correctamente!");
            setShowSuccess(true);
            setJustification("");
            setTimeout(() => setShowSuccess(false), 4000);
          },
        });
      } else {
        togglePause.mutate({}, {
          onSuccess: () => {
            setSuccessMessage(action === "pause" ? "Pausa registrada" : "Retorno de pausa registrado");
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
          },
        });
      }
    };
    getGeoAndAct();
  }, [clockIn, clockOut, togglePause, justification, user]);

  if (isLoading) return <Loader mx="auto" mt="xl" />;

  const isClockedIn = status?.is_clocked_in ?? false;
  const isPaused = status?.is_paused ?? false;

  const myRecordsToday = todayRecords.filter((r: any) => r.user_id === user?.id).slice(0, 5);

  return (
    <Stack align="center" gap="xl" py="xl">
      {showSuccess && (
        <Paper shadow="md" radius="lg" p="lg" w="100%" maw={440} withBorder style={{ background: "var(--mantine-color-green-0)", border: "2px solid var(--mantine-color-green-5)" }}>
          <Stack align="center" gap="xs">
            <ThemeIcon variant="filled" color="green" size={48} radius="xl">
              <IconCheck size={28} />
            </ThemeIcon>
            <Text fw={700} size="lg" c="green">{successMessage}</Text>
            {status?.server_time && (
              <Text size="xs" c="dimmed">Hora servidor: {formatTime(status.server_time as unknown as string)}</Text>
            )}
          </Stack>
        </Paper>
      )}

      <Paper shadow="sm" radius="lg" p="xl" w="100%" maw={440} withBorder>
        <Stack align="center" gap="md">
          <LiveClock size="2.4rem" />
          <Text c="dimmed" size="sm">
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </Text>
          {status?.server_time && (
            <Text size="xs" c="dimmed">Hora del servidor: {formatTime(status.server_time as unknown as string)}</Text>
          )}
          <Divider w="100%" />

          {!isClockedIn ? (
            <>
              <ThemeIcon variant="light" color="gray" size={60} radius="xl">
                <IconClock size={32} />
              </ThemeIcon>
              <Text fw={600} size="lg">Sin fichar</Text>
              <TextInput
                placeholder="Justificación (opcional)"
                size="sm"
                radius="md"
                w="100%"
                value={justification}
                onChange={(e) => setJustification(e.currentTarget.value)}
              />
              <Button
                size="lg"
                leftSection={<IconClockPlay size={20} />}
                color="green"
                fullWidth
                loading={clockIn.isPending}
                onClick={() => handleClockAction("in")}
              >
                Entrada jornada
              </Button>
            </>
          ) : (
            <>
              <ThemeIcon variant="light" color={isPaused ? "yellow" : "green"} size={60} radius="xl">
                {isPaused ? <IconClockPause size={32} /> : <IconClockPlay size={32} />}
              </ThemeIcon>
              <Text fw={600} size="lg">
                {isPaused ? "En pausa" : "Fichado"} desde {formatTime(status?.clock_in)}
              </Text>
              <Text ff="monospace" fw={700} size="xl" c={isPaused ? "yellow" : "green"}>
                {elapsedStr}
              </Text>
              <Group gap="lg" justify="center">
                <Box ta="center">
                  <Text size="xs" c="dimmed">Neto trabajado</Text>
                  <Text fw={600} size="sm">{formatMinutes(status?.net_minutes_today ?? 0)}</Text>
                </Box>
                <Box ta="center">
                  <Text size="xs" c="dimmed">Restante jornada</Text>
                  <Text fw={600} size="sm">{remaining}</Text>
                </Box>
              </Group>
              <TextInput
                placeholder="Justificación (opcional)"
                size="sm"
                radius="md"
                w="100%"
                value={justification}
                onChange={(e) => setJustification(e.currentTarget.value)}
              />
              <SimpleGrid cols={2} w="100%">
                <Button
                  variant="light"
                  color={isPaused ? "blue" : "yellow"}
                  leftSection={isPaused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
                  loading={togglePause.isPending}
                  onClick={() => handleClockAction(isPaused ? "resume" : "pause")}
                >
                  {isPaused ? "Retorno de pausa" : "Pausa"}
                </Button>
                <Button
                  color="red"
                  leftSection={<IconClockStop size={16} />}
                  loading={clockOut.isPending}
                  onClick={() => handleClockAction("out")}
                >
                  Salida jornada
                </Button>
              </SimpleGrid>
            </>
          )}
        </Stack>
      </Paper>

      {myRecordsToday.length > 0 && (
        <Paper shadow="xs" radius="lg" p="md" w="100%" maw={440} withBorder>
          <Text fw={600} size="sm" mb="xs">Fichajes de hoy</Text>
          <Stack gap={4}>
            {myRecordsToday.map((r: any) => (
              <Group key={r.id} gap="xs" justify="space-between">
                <Text size="xs">Entrada: {formatTime(r.clock_in)}</Text>
                <Text size="xs">{r.clock_out ? `Salida: ${formatTime(r.clock_out)}` : "En curso"}</Text>
                {r.pauses && r.pauses.length > 0 && (
                  <Badge size="xs" variant="light">{r.pauses.length} pausa(s)</Badge>
                )}
              </Group>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

// ─── Tab: Registros ─────────────────────────────────────────────────────────

function RecordsTab() {
  const { data: members = [] } = useTeamMembers();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const deleteRecord = useDeleteRecord();

  const filters = useMemo(() => ({
    start_date: startDate ? new Date(startDate).toISOString().slice(0, 10) : undefined,
    end_date: endDate ? new Date(endDate).toISOString().slice(0, 10) : undefined,
    user_id: userId || undefined,
  }), [startDate, endDate, userId]);

  const { data: records = [], isLoading } = useTimeRecords(filters);

  const memberOptions = useMemo(
    () => members.map((m: { id: string; full_name?: string; name?: string; email: string }) => ({
      value: m.id,
      label: m.full_name || m.name || m.email,
    })),
    [members],
  );

  const setQuickFilter = useCallback((days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString());
    setEndDate(end.toISOString());
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.start_date) params.set("start_date", filters.start_date);
    if (filters.end_date) params.set("end_date", filters.end_date);
    if (filters.user_id) params.set("user_id", filters.user_id);
    const baseUrl = (window as unknown as Record<string, string>).__API_BASE__ || import.meta.env.VITE_API_URL || "";
    window.open(`${baseUrl}/api/v1/time-clock/records/export?${params.toString()}`, "_blank");
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Button size="xs" variant="light" onClick={() => setQuickFilter(7)}>7 días</Button>
          <Button size="xs" variant="light" onClick={() => setQuickFilter(30)}>30 días</Button>
          <Button size="xs" variant="light" onClick={() => setQuickFilter(90)}>3 meses</Button>
          <Button size="xs" variant="light" onClick={() => {
            const now = new Date();
            setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
            setEndDate(now.toISOString());
          }}>Este mes</Button>
        </Group>
        <Button size="xs" variant="light" color="green" leftSection={<IconDownload size={14} />} onClick={handleExport}>
          Exportar CSV
        </Button>
      </Group>

      <Group>
        <DatePickerInput
          placeholder="Desde"
          value={startDate}
          onChange={setStartDate}
          clearable
          size="xs"
          w={150}
        />
        <DatePickerInput
          placeholder="Hasta"
          value={endDate}
          onChange={setEndDate}
          clearable
          size="xs"
          w={150}
        />
        <Select
          placeholder="Todos los usuarios"
          data={memberOptions}
          value={userId}
          onChange={setUserId}
          clearable
          searchable
          size="xs"
          w={200}
        />
        <Badge variant="light">{records.length} registros</Badge>
      </Group>

      {isLoading ? (
        <Loader mx="auto" mt="xl" />
      ) : records.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No hay registros para el filtro seleccionado</Text>
      ) : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Usuario</Table.Th>
                <Table.Th>Fecha Entrada</Table.Th>
                <Table.Th>Entrada</Table.Th>
                <Table.Th>Fecha Salida</Table.Th>
                <Table.Th>Salida</Table.Th>
                <Table.Th>Pausas</Table.Th>
                <Table.Th>Tiempo Neto</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Notas</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {records.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.user_name || "-"}</Table.Td>
                  <Table.Td>{formatDate(r.clock_in)}</Table.Td>
                  <Table.Td>{formatTime(r.clock_in)}</Table.Td>
                  <Table.Td>{r.clock_out ? formatDate(r.clock_out) : "-"}</Table.Td>
                  <Table.Td>{r.clock_out ? formatTime(r.clock_out) : "-"}</Table.Td>
                  <Table.Td ta="center">{(r.pauses || []).length}</Table.Td>
                  <Table.Td>{r.net_minutes != null ? formatMinutes(r.net_minutes) : "-"}</Table.Td>
                  <Table.Td>
                    <Badge size="xs" color={r.status === "active" ? "green" : r.status === "completed" ? "blue" : "orange"}>
                      {r.status === "active" ? "Activo" : r.status === "completed" ? "Completado" : "Editado"}
                    </Badge>
                  </Table.Td>
                  <Table.Td maw={150}><Text size="xs" lineClamp={1}>{r.notes || "-"}</Text></Table.Td>
                  <Table.Td>
                    <Tooltip label="Eliminar">
                      <ActionIcon variant="light" color="red" size="sm" onClick={() => deleteRecord.mutate(r.id)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}

// ─── Tab: Solicitudes ───────────────────────────────────────────────────────

function LeaveRequestsTab() {
  const { user } = useAuthStore();
  const { data: members = [] } = useTeamMembers();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);

  const filters = useMemo(() => ({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    user_id: userFilter || undefined,
  }), [statusFilter, typeFilter, userFilter]);

  const { data: leaves = [], isLoading } = useLeaveRequests(filters);
  const createLeave = useCreateLeave();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const [opened, { open, close }] = useDisclosure(false);
  const [holidayOpened, { open: openHoliday, close: closeHoliday }] = useDisclosure(false);

  const [leaveType, setLeaveType] = useState("vacaciones");
  const [leaveStart, setLeaveStart] = useState<string | null>(null);
  const [leaveEnd, setLeaveEnd] = useState<string | null>(null);
  const [leaveNotes, setLeaveNotes] = useState("");

  const [holidayDate, setHolidayDate] = useState<string | null>(null);
  const [holidayName, setHolidayName] = useState("");
  const { data: holidays = [] } = useHolidays();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const kpi = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === "pendiente").length;
    const approved = leaves.filter((l) => l.status === "aprobada").length;
    const rejected = leaves.filter((l) => l.status === "rechazada").length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  const memberOptions = useMemo(
    () => members.map((m: { id: string; full_name?: string; name?: string; email: string }) => ({
      value: m.id,
      label: m.full_name || m.name || m.email,
    })),
    [members],
  );

  const handleCreateLeave = () => {
    if (!leaveStart || !leaveEnd) return;
    createLeave.mutate({
      leave_type: leaveType,
      start_date: new Date(leaveStart).toISOString().slice(0, 10),
      end_date: new Date(leaveEnd).toISOString().slice(0, 10),
      notes: leaveNotes || undefined,
    }, {
      onSuccess: () => {
        close();
        setLeaveNotes("");
        setLeaveStart(null);
        setLeaveEnd(null);
      },
    });
  };

  const handleCreateHoliday = () => {
    if (!holidayDate || !holidayName.trim()) return;
    createHoliday.mutate({
      date: new Date(holidayDate).toISOString().slice(0, 10),
      name: holidayName.trim(),
    }, {
      onSuccess: () => {
        closeHoliday();
        setHolidayName("");
        setHolidayDate(null);
      },
    });
  };

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Card shadow="xs" radius="md" p="md" withBorder>
          <Text size="xs" c="dimmed">Total</Text>
          <Text fw={700} size="xl">{kpi.total}</Text>
        </Card>
        <Card shadow="xs" radius="md" p="md" withBorder>
          <Text size="xs" c="dimmed">Pendientes</Text>
          <Text fw={700} size="xl" c="yellow">{kpi.pending}</Text>
        </Card>
        <Card shadow="xs" radius="md" p="md" withBorder>
          <Text size="xs" c="dimmed">Aprobadas</Text>
          <Text fw={700} size="xl" c="green">{kpi.approved}</Text>
        </Card>
        <Card shadow="xs" radius="md" p="md" withBorder>
          <Text size="xs" c="dimmed">Rechazadas</Text>
          <Text fw={700} size="xl" c="red">{kpi.rejected}</Text>
        </Card>
      </SimpleGrid>

      <Group justify="space-between">
        <Group gap="xs">
          <Select size="xs" placeholder="Estado" data={[
            { value: "pendiente", label: "Pendiente" },
            { value: "aprobada", label: "Aprobada" },
            { value: "rechazada", label: "Rechazada" },
          ]} value={statusFilter} onChange={setStatusFilter} clearable w={140} />
          <Select size="xs" placeholder="Tipo" data={Object.entries(LEAVE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} value={typeFilter} onChange={setTypeFilter} clearable w={180} />
          <Select size="xs" placeholder="Usuario" data={memberOptions} value={userFilter} onChange={setUserFilter} clearable searchable w={200} />
        </Group>
        <Group gap="xs">
          <Button size="xs" variant="light" leftSection={<IconSunHigh size={14} />} onClick={openHoliday}>
            Solicitud Festivos
          </Button>
          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={open}>
            Añadir Solicitud
          </Button>
        </Group>
      </Group>

      {isLoading ? (
        <Loader mx="auto" mt="xl" />
      ) : leaves.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No hay solicitudes</Text>
      ) : (
        <Stack gap="sm">
          {leaves.map((l) => (
            <Paper key={l.id} shadow="xs" radius="md" p="sm" withBorder>
              <Group justify="space-between" wrap="wrap">
                <Group gap="sm">
                  <Badge color={STATUS_COLORS[l.status] || "gray"} variant="light">
                    {l.status === "pendiente" ? "Pendiente" : l.status === "aprobada" ? "Aprobada" : "Rechazada"}
                  </Badge>
                  <Badge color={LEAVE_TYPE_COLORS[l.leave_type] || "gray"} variant="dot">
                    {LEAVE_TYPE_LABELS[l.leave_type] || l.leave_type}
                  </Badge>
                  <Text size="sm" fw={500}>{l.user_name || "Usuario"}</Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">{formatDateShort(l.start_date)} → {formatDateShort(l.end_date)}</Text>
                  {l.status === "pendiente" && user?.role === "owner" && (
                    <>
                      <Tooltip label="Aprobar">
                        <ActionIcon variant="light" color="green" size="sm" onClick={() => approveLeave.mutate(l.id)}>
                          <IconCheck size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Rechazar">
                        <ActionIcon variant="light" color="red" size="sm" onClick={() => rejectLeave.mutate(l.id)}>
                          <IconX size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </>
                  )}
                </Group>
              </Group>
              {l.notes && <Text size="xs" c="dimmed" mt={4}>{l.notes}</Text>}
            </Paper>
          ))}
        </Stack>
      )}

      {/* Holidays list */}
      {holidays.length > 0 && (
        <>
          <Divider label="Festivos configurados" />
          <Stack gap="xs">
            {holidays.map((h) => (
              <Group key={h.id} justify="space-between">
                <Group gap="xs">
                  <Badge variant="light" color="orange" size="sm">{formatDateShort(h.date)}</Badge>
                  <Text size="sm">{h.name}</Text>
                </Group>
                <ActionIcon variant="light" color="red" size="sm" onClick={() => deleteHoliday.mutate(h.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        </>
      )}

      {/* New Leave Modal */}
      <Modal opened={opened} onClose={close} title="Nueva Solicitud de Ausencia" centered>
        <Stack>
          <Select
            label="Tipo de ausencia"
            data={Object.entries(LEAVE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            value={leaveType}
            onChange={(v) => setLeaveType(v || "vacaciones")}
          />
          <DatePickerInput label="Fecha inicio" value={leaveStart} onChange={setLeaveStart} />
          <DatePickerInput label="Fecha fin" value={leaveEnd} onChange={setLeaveEnd} />
          <Textarea label="Notas (opcional)" value={leaveNotes} onChange={(e) => setLeaveNotes(e.currentTarget.value)} />
          <Button onClick={handleCreateLeave} loading={createLeave.isPending} disabled={!leaveStart || !leaveEnd}>
            Crear Solicitud
          </Button>
        </Stack>
      </Modal>

      {/* New Holiday Modal */}
      <Modal opened={holidayOpened} onClose={closeHoliday} title="Añadir Festivo" centered>
        <Stack>
          <DatePickerInput label="Fecha" value={holidayDate} onChange={setHolidayDate} />
          <TextInput label="Nombre del festivo" value={holidayName} onChange={(e) => setHolidayName(e.currentTarget.value)} />
          <Button onClick={handleCreateHoliday} loading={createHoliday.isPending} disabled={!holidayDate || !holidayName.trim()}>
            Añadir Festivo
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ─── Tab: Calendario ────────────────────────────────────────────────────────

function CalendarTab() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const { data: members = [] } = useTeamMembers();
  const { data: holidays = [] } = useHolidays();
  const { data: leaves = [] } = useLeaveRequests({ status: "aprobada" });

  const memberOptions = useMemo(
    () => members.map((m: { id: string; full_name?: string; name?: string; email: string }) => ({
      value: m.id,
      label: m.full_name || m.name || m.email,
    })),
    [members],
  );

  const filteredLeaves = useMemo(() => {
    let f = leaves;
    if (typeFilter) f = f.filter((l) => l.leave_type === typeFilter);
    if (userFilter) f = f.filter((l) => l.user_id === userFilter);
    return f;
  }, [leaves, typeFilter, userFilter]);

  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(month.year, month.month, 1).getDay() + 6) % 7;

  const getDayEvents = useCallback((day: number) => {
    const dateStr = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayLeaves = filteredLeaves.filter((l) => l.start_date <= dateStr && l.end_date >= dateStr);
    const dayHolidays = holidays.filter((h) => h.date === dateStr);
    return { leaves: dayLeaves, holidays: dayHolidays };
  }, [month, filteredLeaves, holidays]);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const goToday = () => {
    const now = new Date();
    setMonth({ year: now.getFullYear(), month: now.getMonth() });
  };
  const goPrev = () => setMonth((m) => m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 });
  const goNext = () => setMonth((m) => m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 });

  const upcomingLeaves = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return filteredLeaves
      .filter((l) => l.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 8);
  }, [filteredLeaves]);

  const monthStats = useMemo(() => {
    const prefix = `${month.year}-${String(month.month + 1).padStart(2, "0")}`;
    const inMonth = filteredLeaves.filter((l) => l.start_date.startsWith(prefix) || l.end_date.startsWith(prefix));
    const byType: Record<string, number> = {};
    inMonth.forEach((l) => { byType[l.leave_type] = (byType[l.leave_type] || 0) + 1; });
    return { total: inMonth.length, byType };
  }, [filteredLeaves, month]);

  const today = new Date();
  const isToday = (day: number) => today.getFullYear() === month.year && today.getMonth() === month.month && today.getDate() === day;

  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, md: 9 }}>
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="xs">
              <Button size="xs" variant="light" onClick={goPrev}>←</Button>
              <Text fw={600}>{monthNames[month.month]} {month.year}</Text>
              <Button size="xs" variant="light" onClick={goNext}>→</Button>
              <Button size="xs" variant="subtle" onClick={goToday}>Hoy</Button>
            </Group>
            <Group gap="xs">
              <Select size="xs" placeholder="Tipo" data={Object.entries(LEAVE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} value={typeFilter} onChange={setTypeFilter} clearable w={160} />
              <Select size="xs" placeholder="Usuario" data={memberOptions} value={userFilter} onChange={setUserFilter} clearable searchable w={180} />
            </Group>
          </Group>

          <Box style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <Text key={d} size="xs" fw={600} ta="center" c="dimmed" py={4}>{d}</Text>
            ))}
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <Box key={`e-${i}`} style={{ minHeight: 70 }} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const events = getDayEvents(day);
              const hasEvents = events.leaves.length > 0 || events.holidays.length > 0;
              return (
                <Paper
                  key={day}
                  p={4}
                  radius="sm"
                  withBorder={isToday(day)}
                  style={{
                    minHeight: 70,
                    borderColor: isToday(day) ? "var(--mantine-color-blue-5)" : undefined,
                    borderWidth: isToday(day) ? 2 : undefined,
                    background: hasEvents ? "var(--mantine-color-blue-0)" : undefined,
                  }}
                >
                  <Text size="xs" fw={isToday(day) ? 700 : 400} c={isToday(day) ? "blue" : undefined}>
                    {day}
                  </Text>
                  {events.holidays.map((h, hi) => (
                    <Badge key={`h-${hi}`} size="xs" color="orange" variant="filled" fullWidth mt={2}>
                      {h.name}
                    </Badge>
                  ))}
                  {events.leaves.slice(0, 2).map((l, li) => (
                    <Badge key={`l-${li}`} size="xs" color={LEAVE_TYPE_COLORS[l.leave_type] || "gray"} variant="light" fullWidth mt={2}>
                      {l.user_name?.split(" ")[0] || "—"}
                    </Badge>
                  ))}
                  {events.leaves.length > 2 && (
                    <Text size="xs" c="dimmed" ta="center">+{events.leaves.length - 2}</Text>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 3 }}>
        <Stack gap="md">
          <Paper shadow="xs" radius="md" p="sm" withBorder>
            <Text size="sm" fw={600} mb="xs">Estadísticas del mes</Text>
            <Text size="xs" c="dimmed">Total solicitudes: {monthStats.total}</Text>
            {Object.entries(monthStats.byType).map(([type, count]) => (
              <Group key={type} gap={4} mt={2}>
                <Badge size="xs" color={LEAVE_TYPE_COLORS[type] || "gray"} variant="dot">{LEAVE_TYPE_LABELS[type] || type}</Badge>
                <Text size="xs">{count}</Text>
              </Group>
            ))}
          </Paper>

          <Paper shadow="xs" radius="md" p="sm" withBorder>
            <Text size="sm" fw={600} mb="xs">Leyenda</Text>
            <Stack gap={4}>
              {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                <Group key={key} gap={6}>
                  <Badge size="xs" color={LEAVE_TYPE_COLORS[key]} variant="light" w={14} h={14} p={0} style={{ borderRadius: 4 }} />
                  <Text size="xs">{label}</Text>
                </Group>
              ))}
              <Group gap={6}>
                <Badge size="xs" color="orange" variant="filled" w={14} h={14} p={0} style={{ borderRadius: 4 }} />
                <Text size="xs">Festivo</Text>
              </Group>
            </Stack>
          </Paper>

          <Paper shadow="xs" radius="md" p="sm" withBorder>
            <Text size="sm" fw={600} mb="xs">Próximas ausencias</Text>
            {upcomingLeaves.length === 0 ? (
              <Text size="xs" c="dimmed">Sin ausencias próximas</Text>
            ) : (
              <Stack gap={4}>
                {upcomingLeaves.map((l) => (
                  <Group key={l.id} gap={4}>
                    <Badge size="xs" color={LEAVE_TYPE_COLORS[l.leave_type] || "gray"} variant="dot">
                      {formatDateShort(l.start_date)}
                    </Badge>
                    <Text size="xs">{l.user_name?.split(" ")[0] || "—"}</Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TimeClockPage() {
  const [activeTab, setActiveTab] = useState("clock");

  return (
    <Container size="xl" py="md">
      <PageHeader
        title="Control Horario"
        description="Gestiona fichajes, solicitudes de ausencia y calendario del equipo"
      />

      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || "clock")} mb="xl">
        <Tabs.List mb="lg">
          <Tabs.Tab value="clock" leftSection={<IconClock size={16} />}>Fichar</Tabs.Tab>
          <Tabs.Tab value="records" leftSection={<IconListDetails size={16} />}>Registros</Tabs.Tab>
          <Tabs.Tab value="requests" leftSection={<IconUmbrellaFilled size={16} />}>Solicitudes</Tabs.Tab>
          <Tabs.Tab value="calendar" leftSection={<IconCalendar size={16} />}>Calendario</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="clock"><ClockTab /></Tabs.Panel>
        <Tabs.Panel value="records"><RecordsTab /></Tabs.Panel>
        <Tabs.Panel value="requests"><LeaveRequestsTab /></Tabs.Panel>
        <Tabs.Panel value="calendar"><CalendarTab /></Tabs.Panel>
      </Tabs>
    </Container>
  );
}
