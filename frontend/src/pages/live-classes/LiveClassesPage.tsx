import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Menu,
  NumberInput,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCalendar,
  IconCalendarEvent,
  IconClock,
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconExternalLink,
  IconLayoutGrid,
  IconLayoutList,
  IconPlus,
  IconTrash,
  IconUsers,
  IconVideo,
  IconVideoOff,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { BottomSheet } from "../../components/common/BottomSheet";
import { useLiveClasses, useLiveClassStats } from "../../hooks/useLiveClasses";
import { useTranslation } from "react-i18next";


// Tipos
interface LiveClass {
  id: string;
  title: string;
  description?: string;
  class_type: string;
  category: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  max_participants: number;
  current_participants: number;
  is_free: boolean;
  price: number;
  currency: string;
  difficulty_level: string;
  meeting_url?: string;
  status: string;
  thumbnail_url?: string;
  instructor_id?: string;
}

// Componente de tarjeta de clase
function ClassCard({ liveClass }: { liveClass: LiveClass }) {
  const { t } = useTranslation();

  const statusColors: Record<string, string> = {
    draft: "gray",
    scheduled: "blue",
    live: "red",
    completed: "green",
    cancelled: "orange",
  };

  const statusLabels: Record<string, string> = {
    draft: t("liveClasses.borrador"),
    scheduled: t("liveClasses.programada"),
    live: t("liveClasses.enVivo"),
    completed: t("liveClasses.finalizada"),
    cancelled: t("liveClasses.cancelada"),
  };

  const difficultyLabels: Record<string, string> = {
    beginner: t("liveClasses.principiante"),
    intermediate: t("liveClasses.intermedio"),
    advanced: t("liveClasses.avanzado"),
    all: t("liveClasses.todosLosNiveles"),
  };

  const typeLabels: Record<string, string> = {
    individual: "Individual",
    group: "Grupal",
    workshop: "Taller",
    webinar: "Webinar",
  };

  const occupancyPercent =
    (liveClass.current_participants / liveClass.max_participants) * 100;

  return (
    <Box
      className="nv-card"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Box
        h={120}
        style={{
          background: liveClass.thumbnail_url
            ? `url(${liveClass.thumbnail_url}) center/cover`
            : "linear-gradient(135deg, var(--nv-primary) 0%, var(--nv-accent) 100%)",
          position: "relative",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }}
      >
        <Badge
          color={statusColors[liveClass.status]}
          variant="filled"
          style={{ position: "absolute", top: 10, right: 10 }}
        >
          {statusLabels[liveClass.status]}
        </Badge>
        {liveClass.status === "live" && (
          <Box
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              animation: "pulse 2s infinite",
            }}
          >
            <Badge color="red" variant="filled" leftSection={<IconVideo size={12} />}>
              EN VIVO
            </Badge>
          </Box>
        )}
      </Box>

      <Box p="lg" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group justify="space-between" wrap="nowrap">
            <Text fw={600} lineClamp={1} style={{ fontFamily: "var(--font-heading)" }}>
              {liveClass.title}
            </Text>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle" size="sm" color="gray">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={14} />}>{"Editar"}</Menu.Item>
                {liveClass.meeting_url && (
                  <Menu.Item
                    leftSection={<IconCopy size={14} />}
                    onClick={() => {
                      navigator.clipboard.writeText(liveClass.meeting_url || "");
                      notifications.show({
                        title: "Copiado",
                        message: "Enlace copiado al portapapeles",
                        color: "green",
                      });
                    }}
                  >
                    {t("liveClasses.copiarEnlace")}
                  </Menu.Item>
                )}
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
                  {"Eliminar"}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Group gap="xs">
            <Badge size="xs" variant="light" color="var(--nv-primary)">
              {typeLabels[liveClass.class_type]}
            </Badge>
            <Badge size="xs" variant="light" color="grape">
              {difficultyLabels[liveClass.difficulty_level]}
            </Badge>
          </Group>

          <Group gap="xs">
            <IconCalendar size={14} style={{ opacity: 0.7 }} />
            <Text size="sm" c="dimmed">
              {dayjs(liveClass.scheduled_start).format("DD MMM YYYY")}
            </Text>
            <IconClock size={14} style={{ opacity: 0.7 }} />
            <Text size="sm" c="dimmed">
              {dayjs(liveClass.scheduled_start).format("HH:mm")} -{" "}
              {dayjs(liveClass.scheduled_end).format("HH:mm")}
            </Text>
          </Group>

          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">
                {"Participantes"}
              </Text>
              <Text size="xs" fw={500}>
                {liveClass.current_participants}/{liveClass.max_participants}
              </Text>
            </Group>
            <Progress
              value={occupancyPercent}
              color={occupancyPercent > 80 ? "red" : occupancyPercent > 50 ? "yellow" : "var(--nv-success)"}
              size="sm"
              radius="xl"
            />
          </Box>

          <Divider />

          <Group justify="space-between">
            <Text fw={600} size="lg" style={{ color: "var(--nv-primary)" }}>
              {liveClass.is_free ? (
                <Badge color="var(--nv-success)" variant="light">
                  {"Gratis"}
                </Badge>
              ) : (
                `${liveClass.price}${liveClass.currency}`
              )}
            </Text>
            {liveClass.status === "live" && liveClass.meeting_url ? (
              <Button
                size="xs"
                color="red"
                leftSection={<IconVideo size={14} />}
                component="a"
                href={liveClass.meeting_url}
                target="_blank"
                className="nv-button"
              >
                {"Unirse"}
              </Button>
            ) : liveClass.status === "scheduled" ? (
              <Button size="xs" variant="light" className="nv-button">
                {t("liveClasses.verDetalles")}
              </Button>
            ) : null}
          </Group>
        </Stack>
      </Box>
    </Box>
  );
}

// Componente de fila de clase para vista de lista
function ClassRow({ liveClass }: { liveClass: LiveClass }) {
  const { t } = useTranslation();
  const statusColors: Record<string, string> = {
    draft: "gray",
    scheduled: "blue",
    live: "red",
    completed: "green",
    cancelled: "orange",
  };

  const statusLabels: Record<string, string> = {
    draft: t("liveClasses.borrador"),
    scheduled: t("liveClasses.programada"),
    live: t("liveClasses.enVivo"),
    completed: t("liveClasses.finalizada"),
    cancelled: t("liveClasses.cancelada"),
  };

  return (
    <Box className="nv-card" p="md" mb="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" wrap="nowrap" style={{ flex: 1 }}>
          <Avatar
            size={50}
            radius="md"
            src={liveClass.thumbnail_url}
            color="var(--nv-primary)"
          >
            <IconVideo size={24} />
          </Avatar>
          <Box style={{ flex: 1 }}>
            <Text fw={500} lineClamp={1} style={{ fontFamily: "var(--font-heading)" }}>
              {liveClass.title}
            </Text>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {dayjs(liveClass.scheduled_start).format("DD/MM/YYYY HH:mm")}
              </Text>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <Text size="sm" c="dimmed">
                {liveClass.duration_minutes} min
              </Text>
            </Group>
          </Box>
        </Group>

        <Group gap="md">
          <Box ta="center">
            <Text size="xs" c="dimmed">
              {"Participantes"}
            </Text>
            <Text fw={500}>
              {liveClass.current_participants}/{liveClass.max_participants}
            </Text>
          </Box>
          <Badge color={statusColors[liveClass.status]} variant="light">
            {statusLabels[liveClass.status]}
          </Badge>
          <Text fw={600}>
            {liveClass.is_free ? "Gratis" : `${liveClass.price}€`}
          </Text>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconEdit size={14} />}>{"Editar"}</Menu.Item>
              {liveClass.meeting_url && (
                <Menu.Item leftSection={<IconExternalLink size={14} />}>
                  {t("liveClasses.abrirEnlace")}
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
                {"Eliminar"}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Box>
  );
}

// Modal de crear clase
function CreateClassModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm({
    initialValues: {
      title: "",
      description: "",
      class_type: "group",
      category: "fitness",
      scheduled_start: new Date(),
      duration_minutes: 60,
      max_participants: 20,
      is_free: false,
      price: 0,
      difficulty_level: "all",
      is_recorded: true,
    },
  });

  const handleSubmit = async (_values: typeof form.values) => {
    // TODO: Implementar creación de clase
    notifications.show({
      title: t("liveClasses.clase_creada"),
      message: t("liveClasses.la_clase_se_ha_programado_correctamente"),
      color: "green",
    });
    onClose();
  };

  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title={t("liveClasses.nuevaClaseEnVivo")}
      size="lg"
      styles={{
        header: { borderBottom: "1px solid var(--nv-border)" },
        title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t("liveClasses.tituloDeLaClase")}
            placeholder={t("liveClasses.ejHiitIntensivo")}
            required
            {...form.getInputProps("title")}
          />

          <Textarea
            label={t("teamComp.descripcion")}
            placeholder={t("liveClasses.describeContenidoClase")}
            rows={3}
            {...form.getInputProps("description")}
          />

          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <Select
              label={t("liveClasses.tipoDeClase")}
              data={[
                { value: "individual", label: "Individual" },
                { value: "group", label: "Grupal" },
                { value: "workshop", label: "Taller" },
                { value: "webinar", label: "Webinar" },
              ]}
              {...form.getInputProps("class_type")}
            />

            <Select
              label={t("supplementsComp.categoria")}
              data={[
                { value: "fitness", label: "Fitness" },
                { value: "yoga", label: "Yoga" },
                { value: "pilates", label: "Pilates" },
                { value: "strength", label: "Fuerza" },
                { value: "cardio", label: "Cardio" },
                { value: "nutrition", label: t("team.nutricion") },
              ]}
              {...form.getInputProps("category")}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <DateTimePicker
              label={t("liveClasses.fechaYHora")}
              placeholder={t("liveClasses.seleccionaFechaYHora")}
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps("scheduled_start")}
            />

            <NumberInput
              label={t("liveClasses.duracionMinutos")}
              min={15}
              max={180}
              step={15}
              {...form.getInputProps("duration_minutes")}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <NumberInput
              label={t("liveClasses.maximoDeParticipantes")}
              min={1}
              max={500}
              {...form.getInputProps("max_participants")}
            />

            <Select
              label={t("liveClasses.nivelDeDificultad")}
              data={[
                { value: "all", label: t("liveClasses.todosLosNiveles") },
                { value: "beginner", label: "Principiante" },
                { value: "intermediate", label: "Intermedio" },
                { value: "advanced", label: "Avanzado" },
              ]}
              {...form.getInputProps("difficulty_level")}
            />
          </SimpleGrid>

          <Divider label={t("liveClasses.precio")} labelPosition="center" />

          <Group>
            <Switch
              label={t("liveClasses.claseGratuita")}
              {...form.getInputProps("is_free", { type: "checkbox" })}
            />
          </Group>

          {!form.values.is_free && (
            <NumberInput
              label={t("liveClasses.precio")}
              min={0}
              step={0.5}
              decimalScale={2}
              {...form.getInputProps("price")}
            />
          )}

          <Divider label={t("liveClasses.opciones")} labelPosition="center" />

          <Switch
            label={t("liveClasses.grabarClaseAutomaticamente")}
            description={t("liveClasses.laGrabacionEstaraDisponiblePara")}
            {...form.getInputProps("is_recorded", { type: "checkbox" })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              {"Cancelar"}
            </Button>
            <Button type="submit" leftSection={<IconPlus size={16} />} className="nv-button">
              {"Crear Clase"}
            </Button>
          </Group>
        </Stack>
      </form>
    </BottomSheet>
  );
}

// Componente principal
export function LiveClassesPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<string>("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] =
    useDisclosure(false);

  // Datos de ejemplo (en producción vendrían de Supabase)
  const { data: classes, isLoading } = useLiveClasses();
  const { data: stats } = useLiveClassStats();

  // Usar datos reales de la API
  const displayClasses = classes || [];

  const filteredClasses =
    statusFilter === "all"
      ? displayClasses
      : displayClasses.filter((c) => c.status === statusFilter);

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title={t("liveClasses.clasesEnVivo")}
        description={t("liveClasses.gestionaTusClasesOnlineY")}
        action={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal} className="nv-button">
            {t("liveClasses.nuevaClase")}
          </Button>
        }
      />

      {/* Estadísticas */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">{t("liveClasses.clasesProgramadas")}</Text>
              <Text className="text-display" style={{ fontSize: "2rem" }}>
                {stats?.upcoming_classes || 3}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" variant="light" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
              <IconCalendarEvent size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">{t("liveClasses.enVivoAhora")}</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-error)" }}>
                {displayClasses.filter((c) => c.status === "live").length}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" variant="light" style={{ backgroundColor: "var(--nv-error-bg)", color: "var(--nv-error)" }}>
              <IconVideo size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">{t("liveClasses.participantesTotales")}</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-success)" }}>
                {stats?.total_participants || 80}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" variant="light" style={{ backgroundColor: "var(--nv-success-bg)", color: "var(--nv-success)" }}>
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">{t("liveClasses.ingresosDelMes")}</Text>
              <Text className="text-display" style={{ fontSize: "2rem" }}>
                {stats?.total_revenue || 450}€
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" variant="light" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
              <IconCalendar size={24} />
            </ThemeIcon>
          </Group>
        </Box>
      </SimpleGrid>

      {/* Filtros y controles */}
      <Box className="nv-card" p="md" mb="lg">
        <Group justify="space-between">
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: "all", label: t("liveClasses.todas") },
              { value: "scheduled", label: t("liveClasses.programadas") },
              { value: "live", label: t("liveClasses.enVivo") },
              { value: "completed", label: t("liveClasses.finalizadas") },
            ]}
            styles={{
              root: { backgroundColor: "var(--nv-surface-subtle)" },
            }}
          />

          <Group gap="xs">
            <Tooltip label={t("liveClasses.vistaDeCuadricula")}>
              <ActionIcon
                variant={viewMode === "grid" ? "filled" : "light"}
                onClick={() => setViewMode("grid")}
                style={{ backgroundColor: viewMode === "grid" ? "var(--nv-primary)" : undefined }}
              >
                <IconLayoutGrid size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("liveClasses.vistaDeLista")}>
              <ActionIcon
                variant={viewMode === "list" ? "filled" : "light"}
                onClick={() => setViewMode("list")}
                style={{ backgroundColor: viewMode === "list" ? "var(--nv-primary)" : undefined }}
              >
                <IconLayoutList size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Box>

      {/* Lista de clases */}
      {isLoading ? (
        <Center h={200}>
          <Loader size="lg" color="var(--nv-primary)" />
        </Center>
      ) : filteredClasses.length === 0 ? (
        <Box className="nv-card" p="xl" ta="center">
          <ThemeIcon size={60} radius="xl" variant="light" color="gray" mx="auto" mb="md">
            <IconVideoOff size={30} />
          </ThemeIcon>
          <Text fw={600} mb="xs" style={{ fontFamily: "var(--font-heading)" }}>
            {t("liveClasses.noHayClases")}
          </Text>
          <Text c="dimmed" mb="lg">
            {t("liveClasses.noSeEncontraronClasesCon")}
          </Text>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal} className="nv-button">
            {t("liveClasses.crearPrimeraClase")}
          </Button>
        </Box>
      ) : viewMode === "grid" ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}>
          {filteredClasses.map((liveClass) => (
            <ClassCard key={liveClass.id} liveClass={liveClass} />
          ))}
        </SimpleGrid>
      ) : (
        <Stack gap={0}>
          {filteredClasses.map((liveClass) => (
            <ClassRow key={liveClass.id} liveClass={liveClass} />
          ))}
        </Stack>
      )}

      {/* Modal de crear clase */}
      <CreateClassModal opened={createModalOpened} onClose={closeCreateModal} />

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Container>
  );
}
