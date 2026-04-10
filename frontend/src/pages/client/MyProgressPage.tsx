import {
  Box,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Button,
  SimpleGrid,
  Progress,
  Paper,
  ThemeIcon,
  Tabs,
  Table,
  Grid,
  Center,
  Loader,
  Modal,
  NumberInput,
  Textarea,
  FileButton,
  Image,
  ActionIcon,
  ScrollArea,
  SegmentedControl,
  Select,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useForm } from "@mantine/form";
// notifications is available via useCreateMeasurement/useUploadProgressPhoto hooks
import {
  IconCamera,
  IconChartLine,
  IconPhoto,
  IconPlus,
  IconRuler,
  IconTrendingUp,
  IconTrendingDown,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { openDangerConfirm } from "../../utils/confirmModal";
import { useProgressSummary, useMeasurements, useCreateMeasurement, useUploadProgressPhoto, useProgressPhotos, useDeleteProgressPhoto } from "../../hooks/useClientPortal";
import { formatDecimal } from "../../utils/format";
import { NativeBottomSheet } from "../../components/common/NativeBottomSheet";
import { IconArrowLeft } from "@tabler/icons-react";

function StatProgress({ 
  label, 
  current, 
  start, 
  target, 
  unit,
  inverse = false,
}: { 
  label: string; 
  current: number; 
  start: number; 
  target: number; 
  unit: string;
  inverse?: boolean;
}) {
  const progress = target !== start 
    ? (inverse 
        ? ((start - current) / (start - target)) * 100
        : ((current - start) / (target - start)) * 100)
    : 0;
  const change = current - start;
  const isPositive = inverse ? change < 0 : change > 0;

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">{label}</Text>
        {change !== 0 && (
          <Badge 
            color={isPositive ? "green" : "red"} 
            variant="light"
            leftSection={isPositive ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
          >
            {change > 0 ? "+" : ""}{formatDecimal(change, 1)}{unit}
          </Badge>
        )}
      </Group>
      <Text size="xl" fw={700}>{current}{unit}</Text>
      <Group justify="space-between" mt="xs" mb={4}>
        <Text size="xs" c="dimmed">Inicio: {start}{unit}</Text>
        <Text size="xs" c="dimmed">Objetivo: {target || "?"}{unit}</Text>
      </Group>
      <Progress value={Math.max(0, Math.min(100, progress))} size="sm" radius="xl" color="yellow" />
    </Card>
  );
}

function MeasurementRow({ 
  label, 
  current, 
  previous 
}: { 
  label: string; 
  current: number; 
  previous: number; 
}) {
  const change = current - previous;
  return (
    <Table.Tr>
      <Table.Td>
        <Text fw={500}>{label}</Text>
      </Table.Td>
      <Table.Td ta="center">
        <Text>{current > 0 ? `${current} cm` : "-"}</Text>
      </Table.Td>
      <Table.Td ta="center">
        <Text c="dimmed">{previous > 0 ? `${previous} cm` : "-"}</Text>
      </Table.Td>
      <Table.Td ta="right">
        {current > 0 && previous > 0 && change !== 0 && (
          <Badge 
            color={change > 0 ? "green" : change < 0 ? "red" : "gray"} 
            variant="light"
            size="sm"
          >
            {change > 0 ? "+" : ""}{change} cm
          </Badge>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

// Modal para registrar medidas
function LogMeasurementModal({
  opened,
  onClose,
  onSubmit,
  isLoading,
  existingMeasurements,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    measured_at: string;
    weight_kg?: number;
    body_fat_percentage?: number;
    muscle_mass_kg?: number;
    measurements?: {
      chest?: number;
      waist?: number;
      hips?: number;
      arms?: number;
      thighs?: number;
    };
    notes?: string;
  }) => void;
  isLoading: boolean;
  existingMeasurements?: Array<{
    measured_at: string;
    weight_kg?: number;
    body_fat_percentage?: number;
    muscle_mass_kg?: number;
    measurements?: Record<string, number>;
    notes?: string;
  }>;
}) {
  const [measurementDate, setMeasurementDate] = useState<Date>(new Date());
  const form = useForm({
    initialValues: {
      weight_kg: undefined as number | undefined,
      body_fat_percentage: undefined as number | undefined,
      muscle_mass_kg: undefined as number | undefined,
      chest: undefined as number | undefined,
      waist: undefined as number | undefined,
      hips: undefined as number | undefined,
      arms: undefined as number | undefined,
      thighs: undefined as number | undefined,
      notes: "",
    },
  });

  const dateStr = measurementDate.toISOString().split("T")[0];
  const existingForDate = useMemo(() => {
    return existingMeasurements?.find((m) => m.measured_at?.startsWith(dateStr));
  }, [existingMeasurements, dateStr]);

  const handleDateChange = (d: string | null) => {
    if (!d) return;
    const dateObj = new Date(d);
    setMeasurementDate(dateObj);
    const existing = existingMeasurements?.find((m) => m.measured_at?.startsWith(dateObj.toISOString().split("T")[0]));
    if (existing) {
      form.setValues({
        weight_kg: existing.weight_kg ?? undefined,
        body_fat_percentage: existing.body_fat_percentage ?? undefined,
        muscle_mass_kg: existing.muscle_mass_kg ?? undefined,
        chest: existing.measurements?.chest ?? undefined,
        waist: existing.measurements?.waist ?? undefined,
        hips: existing.measurements?.hips ?? undefined,
        arms: existing.measurements?.arms ?? undefined,
        thighs: existing.measurements?.thighs ?? undefined,
        notes: existing.notes ?? "",
      });
    } else {
      form.reset();
    }
  };

  const handleSubmit = () => {
    const measurements: Record<string, number> = {};
    if (form.values.chest) measurements.chest = form.values.chest;
    if (form.values.waist) measurements.waist = form.values.waist;
    if (form.values.hips) measurements.hips = form.values.hips;
    if (form.values.arms) measurements.arms = form.values.arms;
    if (form.values.thighs) measurements.thighs = form.values.thighs;

    onSubmit({
      measured_at: measurementDate.toISOString(),
      weight_kg: form.values.weight_kg,
      body_fat_percentage: form.values.body_fat_percentage,
      muscle_mass_kg: form.values.muscle_mass_kg,
      measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
      notes: form.values.notes || undefined,
    });

    form.reset();
  };

  if (!opened) return null;

  return (
    <Box
      pos="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      style={{ zIndex: 300, background: "var(--mantine-color-gray-0)", display: "flex", flexDirection: "column" }}
    >
      {/* Glassmorphism header */}
      <Box
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
        }}
      >
        <Group gap="sm" style={{ width: "100%" }}>
          <ActionIcon variant="subtle" size="lg" onClick={onClose} radius="xl">
            <IconArrowLeft size={22} />
          </ActionIcon>
          <Box style={{ flex: 1 }}>
            <Text fw={700} size="sm">{existingForDate ? "Editar Medidas" : "Registrar Medidas"}</Text>
            <Text size="xs" c="dimmed">Peso, grasa y medidas corporales</Text>
          </Box>
        </Group>
      </Box>

      {/* Scrollable content */}
      <Box style={{ flex: 1, overflowY: "auto" }} px="md" py="md">
        <DateInput
          label="Fecha"
          value={measurementDate}
          onChange={handleDateChange}
          maxDate={new Date()}
          locale="es"
          valueFormat="DD/MM/YYYY"
          size="sm"
          styles={{ input: { height: 44, borderRadius: 10 } }}
        />
        {existingForDate && (
          <Badge color="blue" variant="light" mt="xs">Editando medidas existentes</Badge>
        )}

        <Text fw={600} size="sm" mt="lg" mb="xs">Datos Corporales</Text>
        <SimpleGrid cols={3} spacing="sm">
          <NumberInput
            label="Peso (kg)"
            placeholder="78.5"
            {...form.getInputProps("weight_kg")}
            min={30}
            max={300}
            decimalScale={1}
            size="sm"
            hideControls
            styles={{ input: { height: 44, borderRadius: 10, textAlign: "center", fontWeight: 700 } }}
          />
          <NumberInput
            label="% Grasa"
            placeholder="18.5"
            {...form.getInputProps("body_fat_percentage")}
            min={3}
            max={50}
            decimalScale={1}
            size="sm"
            hideControls
            styles={{ input: { height: 44, borderRadius: 10, textAlign: "center", fontWeight: 700 } }}
          />
          <NumberInput
            label="Músculo (kg)"
            placeholder="35.2"
            {...form.getInputProps("muscle_mass_kg")}
            min={10}
            max={100}
            decimalScale={1}
            size="sm"
            hideControls
            styles={{ input: { height: 44, borderRadius: 10, textAlign: "center", fontWeight: 700 } }}
          />
        </SimpleGrid>

        <Text fw={600} size="sm" mt="lg" mb="xs">Medidas Corporales (cm)</Text>
        <SimpleGrid cols={3} spacing="sm">
          <NumberInput label="Pecho" placeholder="102" {...form.getInputProps("chest")} min={50} max={200} size="sm" hideControls styles={{ input: { height: 44, borderRadius: 10, textAlign: "center", fontWeight: 700 } }} />
          <NumberInput label="Cintura" placeholder="82" {...form.getInputProps("waist")} min={40} max={200} size="sm" hideControls styles={{ input: { height: 44, borderRadius: 10, textAlign: "center", fontWeight: 700 } }} />
          <NumberInput label="Cadera" placeholder="98" {...form.getInputProps("hips")} min={50} max={200} size="sm" hideControls styles={{ input: { height: 44, borderRadius: 10, textAlign: "center", fontWeight: 700 } }} />
          <NumberInput label="Brazos" placeholder="36" {...form.getInputProps("arms")} min={15} max={60} size="sm" hideControls styles={{ input: { height: 44, borderRadius: 10, textAlign: "center", fontWeight: 700 } }} />
          <NumberInput label="Muslos" placeholder="58" {...form.getInputProps("thighs")} min={30} max={100} size="sm" hideControls styles={{ input: { height: 44, borderRadius: 10, textAlign: "center", fontWeight: 700 } }} />
        </SimpleGrid>

        <Textarea
          label="Notas (opcional)"
          placeholder="¿Cómo te sientes?"
          {...form.getInputProps("notes")}
          minRows={2}
          mt="md"
          size="sm"
          styles={{ input: { borderRadius: 10 } }}
        />
      </Box>

      {/* Sticky footer */}
      <Box
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--mantine-color-gray-2)",
          background: "#fff",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}
        px="md"
        py="sm"
      >
        <Button
          color="yellow"
          onClick={handleSubmit}
          loading={isLoading}
          disabled={!form.values.weight_kg && !form.values.body_fat_percentage && !form.values.muscle_mass_kg}
          fullWidth
          size="lg"
          radius="xl"
          styles={{ root: { height: 48, fontWeight: 700 } }}
        >
          Guardar Medidas
        </Button>
      </Box>
    </Box>
  );
}

// Modal para subir foto
function UploadPhotoModal({
  opened,
  onClose,
  onUpload,
  isLoading,
}: {
  opened: boolean;
  onClose: () => void;
  onUpload: (file: File, type: string, notes?: string, measurement_date?: string) => void;
  isLoading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [photoType, setPhotoType] = useState<string>("front");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [photoDate, setPhotoDate] = useState<Date>(new Date());

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = () => {
    if (!file) return;
    onUpload(file, photoType, notes || undefined, photoDate.toISOString().split("T")[0]);
    setFile(null);
    setPreview(null);
    setNotes("");
    setPhotoType("front");
    setPhotoDate(new Date());
  };

  return (
    <NativeBottomSheet
      opened={opened}
      onClose={onClose}
      title="Subir Foto de Progreso"
      subtitle="Añade una foto para comparar tu evolución"
      footer={
        <Button
          color="yellow"
          onClick={handleSubmit}
          loading={isLoading}
          disabled={!file}
          leftSection={<IconCamera size={18} />}
          fullWidth
          size="lg"
          radius="xl"
          styles={{ root: { height: 48, fontWeight: 700 } }}
        >
          Subir Foto
        </Button>
      }
    >
      <Stack gap="md">
        <DateInput
          label="Fecha de la foto"
          value={photoDate}
          onChange={(d) => d && setPhotoDate(new Date(d))}
          maxDate={new Date()}
          locale="es"
          valueFormat="DD/MM/YYYY"
          size="sm"
          styles={{ input: { height: 44, borderRadius: 10 } }}
        />
        <Select
          label="Tipo de foto"
          data={[
            { value: "front", label: "Frontal" },
            { value: "back", label: "Espalda" },
            { value: "side", label: "Lateral" },
          ]}
          value={photoType}
          onChange={(v) => setPhotoType(v || "front")}
          size="sm"
          styles={{ input: { height: 44, borderRadius: 10 } }}
        />

        <FileButton onChange={handleFileSelect} accept="image/png,image/jpeg,image/webp">
          {(props) => (
            <Button 
              {...props} 
              variant="light" 
              leftSection={<IconUpload size={16} />}
              fullWidth
              size="md"
              radius="xl"
              styles={{ root: { height: 48 } }}
            >
              {file ? file.name : "Seleccionar imagen"}
            </Button>
          )}
        </FileButton>

        {preview && (
          <Image
            src={preview}
            alt="Vista previa"
            radius="md"
            h={180}
            fit="contain"
          />
        )}

        <Textarea
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={2}
          size="sm"
          styles={{ input: { borderRadius: 10 } }}
        />
      </Stack>
    </NativeBottomSheet>
  );
}

export function MyProgressPage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const { data: summary, isLoading: isLoadingSummary } = useProgressSummary();
  const { data: measurements } = useMeasurements(50);
  const { data: photos = [] } = useProgressPhotos(50);
  const createMeasurementMutation = useCreateMeasurement();
  const uploadPhotoMutation = useUploadProgressPhoto();
  const deletePhotoMutation = useDeleteProgressPhoto();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [photoModalOpened, { open: openPhotoModal, close: closePhotoModal }] = useDisclosure(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; type: string; date?: string } | null>(null);
  const [enlargeOpened, { open: openEnlarge, close: closeEnlarge }] = useDisclosure(false);
  const [selectedComparison, setSelectedComparison] = useState<number>(1);
  const [photoTypeFilter, setPhotoTypeFilter] = useState<string>("all");

  const filteredPhotos = useMemo(() => {
    if (!photos) return [];
    if (photoTypeFilter === "all") return photos;
    return photos.filter((p) => p.type === photoTypeFilter);
  }, [photos, photoTypeFilter]);

  const photosByDate = useMemo(() => {
    if (!filteredPhotos || filteredPhotos.length === 0) return [];
    const groups: Record<string, typeof filteredPhotos> = {};
    for (const photo of filteredPhotos) {
      const rawDate = photo.measurement_date || photo.uploaded_at || "";
      const dateKey = rawDate.split("T")[0] || "sin-fecha";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(photo);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => ({
        dateKey,
        label:
          dateKey === "sin-fecha"
            ? "Sin fecha"
            : new Date(dateKey + "T12:00:00").toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
        photos: items,
      }));
  }, [filteredPhotos]);

  const handlePhotoClick = (photo: { url: string; type: string; measurement_date?: string; uploaded_at?: string }) => {
    setEnlargedPhoto({
      url: photo.url,
      type: photo.type,
      date: photo.measurement_date || photo.uploaded_at,
    });
    openEnlarge();
  };

  if (isLoadingSummary) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  // Get last two measurements for comparison
  const lastMeasurement = measurements?.[0];
  const comparisonMeasurement = measurements?.[selectedComparison] || measurements?.[1];

  // Use only API data - no mocks
  const data = {
    currentStats: {
      weight: summary?.current_stats?.weight || lastMeasurement?.weight_kg || 0,
      bodyFat: summary?.current_stats?.body_fat || lastMeasurement?.body_fat_percentage || 0,
      muscleMass: summary?.current_stats?.muscle_mass || lastMeasurement?.muscle_mass_kg || 0,
    },
    startStats: {
      weight: summary?.start_stats?.weight || 0,
      bodyFat: summary?.start_stats?.body_fat || 0,
      muscleMass: summary?.start_stats?.muscle_mass || 0,
    },
    targetStats: {
      weight: summary?.target_stats?.weight || 0,
      bodyFat: summary?.target_stats?.body_fat || 0,
      muscleMass: summary?.target_stats?.muscle_mass || 0,
    },
    measurements: {
      chest: { 
        current: lastMeasurement?.measurements?.chest || 0, 
        previous: comparisonMeasurement?.measurements?.chest || 0 
      },
      waist: { 
        current: lastMeasurement?.measurements?.waist || 0, 
        previous: comparisonMeasurement?.measurements?.waist || 0 
      },
      hips: { 
        current: lastMeasurement?.measurements?.hips || 0, 
        previous: comparisonMeasurement?.measurements?.hips || 0 
      },
      arms: { 
        current: lastMeasurement?.measurements?.arms || 0, 
        previous: comparisonMeasurement?.measurements?.arms || 0 
      },
      thighs: { 
        current: lastMeasurement?.measurements?.thighs || 0, 
        previous: comparisonMeasurement?.measurements?.thighs || 0 
      },
    },
    weightHistory: measurements?.map(m => ({
      date: m.measured_at ? new Date(m.measured_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '',
      weight: m.weight_kg || 0,
      body_fat: m.body_fat_percentage || 0,
      muscle_mass: m.muscle_mass_kg || 0,
    })).reverse() || [],
  };

  const handleLogMeasurement = async (measurementData: {
    measured_at: string;
    weight_kg?: number;
    body_fat_percentage?: number;
    muscle_mass_kg?: number;
    measurements?: {
      chest?: number;
      waist?: number;
      hips?: number;
      arms?: number;
      thighs?: number;
    };
    notes?: string;
  }) => {
    await createMeasurementMutation.mutateAsync(measurementData);
    closeModal();
  };

  const handleUploadPhoto = async (file: File, type: string, notes?: string, measurement_date?: string) => {
    try {
      await uploadPhotoMutation.mutateAsync({ file, type, notes, measurement_date });
      closePhotoModal();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Box p="xl" maw={1280} mx="auto">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mi Progreso</Title>
          <Text c="dimmed">Seguimiento de tu evolución física</Text>
        </Box>
        <Group>
          <Button variant="light" leftSection={<IconCamera size={16} />} onClick={openPhotoModal}>
            Subir foto
          </Button>
          <Button leftSection={<IconPlus size={16} />} color="yellow" onClick={openModal}>
            Registrar medidas
          </Button>
        </Group>
      </Group>

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "overview", label: "Resumen" },
            { value: "measurements", label: "Medidas" },
            { value: "history", label: "Historial" },
            { value: "photos", label: "Fotos" },
            { value: "visual-evolution", label: "Evolución" },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
        {!isMobile && (
        <Tabs.List mb="lg">
          <Tabs.Tab value="overview" leftSection={<IconChartLine size={16} />}>
            Resumen
          </Tabs.Tab>
          <Tabs.Tab value="measurements" leftSection={<IconRuler size={16} />}>
            Medidas
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconTrendingUp size={16} />}>
            Historial
          </Tabs.Tab>
          <Tabs.Tab value="photos" leftSection={<IconCamera size={16} />}>
            Fotos
          </Tabs.Tab>
          <Tabs.Tab value="visual-evolution" leftSection={<IconPhoto size={16} />}>
            Evolución visual
          </Tabs.Tab>
        </Tabs.List>
        )}

        <Tabs.Panel value="overview">
          {/* Main Stats */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
            <StatProgress
              label="Peso"
              current={data.currentStats.weight}
              start={data.startStats.weight}
              target={data.targetStats.weight}
              unit="kg"
            />
            <StatProgress
              label="% Grasa Corporal"
              current={data.currentStats.bodyFat}
              start={data.startStats.bodyFat}
              target={data.targetStats.bodyFat}
              unit="%"
              inverse
            />
            <StatProgress
              label="Masa Muscular"
              current={data.currentStats.muscleMass}
              start={data.startStats.muscleMass}
              target={data.targetStats.muscleMass}
              unit="kg"
            />
          </SimpleGrid>

          <Grid gutter="lg">
            {/* Multi-line Chart */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card shadow="sm" padding="lg" radius="lg" withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Evolución Corporal</Text>
                  <Group gap="md">
                    <Group gap={4}>
                      <Box w={12} h={12} style={{ background: "#fab005", borderRadius: 2 }} />
                      <Text size="xs">Peso (kg)</Text>
                    </Group>
                    <Group gap={4}>
                      <Box w={12} h={12} style={{ background: "#fa5252", borderRadius: 2 }} />
                      <Text size="xs">% Grasa</Text>
                    </Group>
                    <Group gap={4}>
                      <Box w={12} h={12} style={{ background: "#40c057", borderRadius: 2 }} />
                      <Text size="xs">Músculo (kg)</Text>
                    </Group>
                  </Group>
                </Group>
                {data.weightHistory.length === 0 ? (
                  <Box 
                    h={220} 
                    style={{ 
                      background: "var(--mantine-color-gray-light)", 
                      borderRadius: "var(--mantine-radius-md)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Stack align="center" gap="xs">
                      <IconChartLine size={40} color="var(--mantine-color-dimmed)" />
                      <Text c="dimmed" size="sm">Registra tu primera medida para ver la evolución</Text>
                    </Stack>
                  </Box>
                ) : (
                  <>
                    {/* SVG Line Chart */}
                    {(() => {
                      const chartData = data.weightHistory.slice(-12);
                      const width = 600;
                      const height = 200;
                      const padding = { top: 20, right: 20, bottom: 40, left: 50 };
                      const chartWidth = width - padding.left - padding.right;
                      const chartHeight = height - padding.top - padding.bottom;
                      
                      // Get ranges for each metric
                      const weights = chartData.filter(p => p.weight > 0).map(p => p.weight);
                      const bodyFats = chartData.filter(p => p.body_fat > 0).map(p => p.body_fat);
                      const muscles = chartData.filter(p => p.muscle_mass > 0).map(p => p.muscle_mass);
                      
                      const minWeight = weights.length ? Math.min(...weights) - 2 : 0;
                      const maxWeight = weights.length ? Math.max(...weights) + 2 : 100;
                      const minFat = bodyFats.length ? Math.min(...bodyFats) - 2 : 0;
                      const maxFat = bodyFats.length ? Math.max(...bodyFats) + 2 : 50;
                      const minMuscle = muscles.length ? Math.min(...muscles) - 2 : 0;
                      const maxMuscle = muscles.length ? Math.max(...muscles) + 2 : 100;
                      
                      // Normalize to 0-1 range
                      const normalizeWeight = (v: number) => (v - minWeight) / (maxWeight - minWeight || 1);
                      const normalizeFat = (v: number) => (v - minFat) / (maxFat - minFat || 1);
                      const normalizeMuscle = (v: number) => (v - minMuscle) / (maxMuscle - minMuscle || 1);
                      
                      // Generate points
                      const getX = (i: number) => padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth;
                      const getY = (normalized: number) => padding.top + (1 - normalized) * chartHeight;
                      
                      const weightPoints = chartData.map((p, i) => p.weight > 0 ? `${getX(i)},${getY(normalizeWeight(p.weight))}` : null).filter(Boolean);
                      const fatPoints = chartData.map((p, i) => p.body_fat > 0 ? `${getX(i)},${getY(normalizeFat(p.body_fat))}` : null).filter(Boolean);
                      const musclePoints = chartData.map((p, i) => p.muscle_mass > 0 ? `${getX(i)},${getY(normalizeMuscle(p.muscle_mass))}` : null).filter(Boolean);
                      
                      return (
                        <Box style={{ overflowX: "auto" }}>
                          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                              <line
                                key={i}
                                x1={padding.left}
                                y1={getY(v)}
                                x2={width - padding.right}
                                y2={getY(v)}
                                stroke="#e9ecef"
                                strokeWidth="1"
                              />
                            ))}
                            
                            {/* Weight line (yellow) */}
                            {weightPoints.length > 1 && (
                              <polyline
                                points={weightPoints.join(" ")}
                                fill="none"
                                stroke="#fab005"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                            {/* Weight dots */}
                            {chartData.map((p, i) => p.weight > 0 && (
                              <circle
                                key={`w-${i}`}
                                cx={getX(i)}
                                cy={getY(normalizeWeight(p.weight))}
                                r="5"
                                fill="#fab005"
                              />
                            ))}
                            
                            {/* Body fat line (red) */}
                            {fatPoints.length > 1 && (
                              <polyline
                                points={fatPoints.join(" ")}
                                fill="none"
                                stroke="#fa5252"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="5,5"
                              />
                            )}
                            {/* Body fat dots */}
                            {chartData.map((p, i) => p.body_fat > 0 && (
                              <circle
                                key={`f-${i}`}
                                cx={getX(i)}
                                cy={getY(normalizeFat(p.body_fat))}
                                r="4"
                                fill="#fa5252"
                              />
                            ))}
                            
                            {/* Muscle line (green) */}
                            {musclePoints.length > 1 && (
                              <polyline
                                points={musclePoints.join(" ")}
                                fill="none"
                                stroke="#40c057"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                            {/* Muscle dots */}
                            {chartData.map((p, i) => p.muscle_mass > 0 && (
                              <circle
                                key={`m-${i}`}
                                cx={getX(i)}
                                cy={getY(normalizeMuscle(p.muscle_mass))}
                                r="4"
                                fill="#40c057"
                              />
                            ))}
                            
                            {/* X-axis labels */}
                            {chartData.map((p, i) => (
                              <text
                                key={`label-${i}`}
                                x={getX(i)}
                                y={height - 10}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#868e96"
                              >
                                {p.date}
                              </text>
                            ))}
                            
                            {/* Y-axis labels (weight scale on left) */}
                            <text x={padding.left - 10} y={padding.top} textAnchor="end" fontSize="10" fill="#fab005">
                              {formatDecimal(maxWeight, 0)}
                            </text>
                            <text x={padding.left - 10} y={height - padding.bottom} textAnchor="end" fontSize="10" fill="#fab005">
                              {formatDecimal(minWeight, 0)}
                            </text>
                          </svg>
                        </Box>
                      );
                    })()}
                    
                    {/* Data summary below chart */}
                    <SimpleGrid cols={{ base: 1, xs: 3 }} mt="md">
                      {data.weightHistory.length > 0 && data.weightHistory[data.weightHistory.length - 1].weight > 0 && (
                        <Box ta="center">
                          <Text size="xs" c="dimmed">Último peso</Text>
                          <Text fw={600} c="yellow">{data.weightHistory[data.weightHistory.length - 1].weight} kg</Text>
                        </Box>
                      )}
                      {data.weightHistory.length > 0 && data.weightHistory[data.weightHistory.length - 1].body_fat > 0 && (
                        <Box ta="center">
                          <Text size="xs" c="dimmed">Última grasa</Text>
                          <Text fw={600} c="red">{data.weightHistory[data.weightHistory.length - 1].body_fat}%</Text>
                        </Box>
                      )}
                      {data.weightHistory.length > 0 && data.weightHistory[data.weightHistory.length - 1].muscle_mass > 0 && (
                        <Box ta="center">
                          <Text size="xs" c="dimmed">Último músculo</Text>
                          <Text fw={600} c="green">{data.weightHistory[data.weightHistory.length - 1].muscle_mass} kg</Text>
                        </Box>
                      )}
                    </SimpleGrid>
                  </>
                )}
              </Card>
            </Grid.Col>

            {/* Quick Stats */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="lg" withBorder h="100%">
                <Text fw={600} mb="lg">Estadísticas</Text>
                <Stack gap="md">
                  <Box>
                    <Text size="sm" c="dimmed">Total de mediciones</Text>
                    <Text size="xl" fw={700}>{measurements?.length || 0}</Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">Fotos de progreso</Text>
                    <Text size="xl" fw={700}>{photos.length}</Text>
                  </Box>
                  {data.weightHistory.length >= 2 && (
                    <Box>
                      <Text size="sm" c="dimmed">Cambio total de peso</Text>
                      <Badge 
                        size="lg"
                        color={(data.weightHistory[data.weightHistory.length - 1]?.weight - data.weightHistory[0]?.weight) <= 0 ? "green" : "red"}
                        variant="light"
                      >
                        {formatDecimal((data.weightHistory[data.weightHistory.length - 1]?.weight || 0) - (data.weightHistory[0]?.weight || 0), 1)} kg
                      </Badge>
                    </Box>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="measurements">
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="lg">
              <Text fw={600}>Medidas Corporales</Text>
              {measurements && measurements.length > 1 && (
                <Select
                  size="xs"
                  w={200}
                  label="Comparar con"
                  data={measurements.slice(1).map((m, i) => ({
                    value: String(i + 1),
                    label: m.measured_at 
                      ? new Date(m.measured_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                      : `Medición ${i + 2}`
                  }))}
                  value={String(selectedComparison)}
                  onChange={(v) => setSelectedComparison(Number(v) || 1)}
                />
              )}
            </Group>
            {measurements && measurements.length > 0 ? (
              <>
                <Text size="sm" c="dimmed" mb="md">
                  Última actualización: {measurements[0].measured_at 
                    ? new Date(measurements[0].measured_at).toLocaleDateString('es-ES')
                    : 'Sin fecha'}
                </Text>
                <ScrollArea type="auto">
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Zona</Table.Th>
                      <Table.Th ta="center">Actual</Table.Th>
                      <Table.Th ta="center">Comparación</Table.Th>
                      <Table.Th ta="right">Cambio</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    <MeasurementRow label="Pecho" {...data.measurements.chest} />
                    <MeasurementRow label="Cintura" {...data.measurements.waist} />
                    <MeasurementRow label="Cadera" {...data.measurements.hips} />
                    <MeasurementRow label="Brazos" {...data.measurements.arms} />
                    <MeasurementRow label="Muslos" {...data.measurements.thighs} />
                  </Table.Tbody>
                </Table>
                </ScrollArea>
              </>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No has registrado medidas corporales aún
              </Text>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Text fw={600} mb="lg">Historial Completo de Medidas ({measurements?.length || 0} registros)</Text>
            {measurements && measurements.length > 0 ? (
              <ScrollArea type="auto">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Peso</Table.Th>
                    <Table.Th>% Grasa</Table.Th>
                    <Table.Th>Músculo</Table.Th>
                    <Table.Th>Cambio</Table.Th>
                    <Table.Th>Notas</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {measurements.map((m, index) => {
                    const prev = measurements[index + 1];
                    const weightChange = prev ? (m.weight_kg || 0) - (prev.weight_kg || 0) : 0;
                    
                    return (
                      <Table.Tr key={m.id || index}>
                        <Table.Td>
                          <Text fw={500} size="sm">
                            {m.measured_at 
                              ? new Date(m.measured_at).toLocaleDateString('es-ES', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })
                              : 'Sin fecha'}
                          </Text>
                        </Table.Td>
                        <Table.Td>{m.weight_kg ? `${m.weight_kg} kg` : "-"}</Table.Td>
                        <Table.Td>{m.body_fat_percentage ? `${m.body_fat_percentage}%` : "-"}</Table.Td>
                        <Table.Td>{m.muscle_mass_kg ? `${m.muscle_mass_kg} kg` : "-"}</Table.Td>
                        <Table.Td>
                          {prev && weightChange !== 0 && (
                            <Badge
                              color={weightChange <= 0 ? "green" : "red"}
                              size="sm"
                              variant="light"
                            >
                              {weightChange > 0 ? "+" : ""}{formatDecimal(weightChange, 1)} kg
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed" lineClamp={1}>
                            {m.notes || "-"}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
              </ScrollArea>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No has registrado medidas aún. ¡Empieza ahora!
              </Text>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="photos">
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="lg">
              <Text fw={600}>Fotos de Evolución ({filteredPhotos.length} fotos)</Text>
              <Button 
                variant="light" 
                leftSection={<IconCamera size={16} />}
                onClick={openPhotoModal}
                size="sm"
              >
                Subir foto
              </Button>
            </Group>

            <SegmentedControl
              value={photoTypeFilter}
              onChange={setPhotoTypeFilter}
              data={[
                { value: "all", label: "Todas" },
                { value: "front", label: "Frontal" },
                { value: "back", label: "Espalda" },
                { value: "side", label: "Lateral" },
              ]}
              mb="md"
              size="sm"
            />

            {photosByDate.length > 0 ? (
              <Stack gap="xl">
                {photosByDate.map((group) => (
                  <Box key={group.dateKey}>
                    <Text fw={600} size="sm" c="dimmed" mb="sm" tt="capitalize">
                      {group.label}
                    </Text>
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
                      {group.photos.map((photo, index) => (
                        <Card
                          key={index}
                          padding="xs"
                          radius="md"
                          withBorder
                          style={{ cursor: "pointer", position: "relative" }}
                          onClick={() => handlePhotoClick(photo)}
                        >
                          <ActionIcon
                            variant="filled"
                            color="red"
                            size="sm"
                            radius="xl"
                            style={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDangerConfirm({
                                title: "Eliminar foto",
                                message: "¿Eliminar esta foto?",
                                onConfirm: () => deletePhotoMutation.mutate(photo.ref_url || photo.url),
                              });
                            }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                          <Card.Section>
                            <Image
                              src={photo.url}
                              height={180}
                              alt={`Foto ${photo.type}`}
                              fallbackSrc="https://placehold.co/200x180?text=Foto"
                            />
                          </Card.Section>
                          <Stack gap={2} mt="xs">
                            <Badge size="xs" variant="light" color="yellow">
                              {photo.type === "front" ? "Frontal" : 
                               photo.type === "back" ? "Espalda" : 
                               photo.type === "side" ? "Lateral" : photo.type}
                            </Badge>
                          </Stack>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </Box>
                ))}
              </Stack>
            ) : null}

            <Paper 
              h={120} 
              radius="md" 
              withBorder
              mt="lg"
              style={{ 
                background: "var(--mantine-color-yellow-light)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={openPhotoModal}
            >
              <ThemeIcon size="xl" color="yellow" variant="light" radius="xl">
                <IconPlus size={24} />
              </ThemeIcon>
              <Text size="sm" fw={500} mt="xs">Subir nueva foto</Text>
            </Paper>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="visual-evolution">
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Text fw={600} size="lg" mb="md">Evolución visual</Text>
            {photos.length > 0 ? (
              <Stack gap="xl">
                {[...photos]
                  .sort((a, b) => {
                    const da = a.measurement_date || a.uploaded_at || "";
                    const db = b.measurement_date || b.uploaded_at || "";
                    return db.localeCompare(da);
                  })
                  .map((photo, idx) => {
                    const dateStr = photo.measurement_date || photo.uploaded_at || "";
                    const dateLabel = dateStr
                      ? new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
                      : "Sin fecha";
                    const photoDate = dateStr.split("T")[0];
                    const matchingMeasurement = measurements?.find((m: any) => {
                      const mDate = (m.measured_at || m.created_at || "").split("T")[0];
                      return mDate === photoDate;
                    });
                    return (
                      <Paper key={idx} p="md" radius="md" withBorder>
                        <Group align="flex-start" wrap="wrap" gap="lg">
                          <Box style={{ flex: "0 0 auto", width: 200 }}>
                            <Image
                              src={photo.url}
                              alt={`Foto ${dateLabel}`}
                              radius="md"
                              h={240}
                              w={200}
                              fit="cover"
                              style={{ cursor: "pointer" }}
                              onClick={() => setEnlargedPhoto({ url: photo.url, type: photo.type, date: dateStr })}
                            />
                            <Text size="xs" c="dimmed" mt={4} ta="center">{dateLabel}</Text>
                            {photo.type && <Badge size="xs" variant="light" mt={4} style={{ display: "block", textAlign: "center" }}>{photo.type === "front" ? "Frontal" : photo.type === "side" ? "Lateral" : photo.type === "back" ? "Espalda" : photo.type}</Badge>}
                          </Box>
                          <Box style={{ flex: 1, minWidth: 200 }}>
                            <Text fw={500} mb="sm">Medidas - {dateLabel}</Text>
                            {matchingMeasurement ? (
                              <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                                {matchingMeasurement.weight_kg && <Box><Text size="xs" c="dimmed">Peso</Text><Text fw={600}>{matchingMeasurement.weight_kg} kg</Text></Box>}
                                {matchingMeasurement.body_fat_percentage && <Box><Text size="xs" c="dimmed">% Grasa</Text><Text fw={600}>{matchingMeasurement.body_fat_percentage}%</Text></Box>}
                                {matchingMeasurement.muscle_mass_kg && <Box><Text size="xs" c="dimmed">Masa muscular</Text><Text fw={600}>{matchingMeasurement.muscle_mass_kg} kg</Text></Box>}
                                {matchingMeasurement.measurements?.chest && <Box><Text size="xs" c="dimmed">Pecho</Text><Text fw={600}>{matchingMeasurement.measurements.chest} cm</Text></Box>}
                                {matchingMeasurement.measurements?.waist && <Box><Text size="xs" c="dimmed">Cintura</Text><Text fw={600}>{matchingMeasurement.measurements.waist} cm</Text></Box>}
                                {matchingMeasurement.measurements?.hips && <Box><Text size="xs" c="dimmed">Cadera</Text><Text fw={600}>{matchingMeasurement.measurements.hips} cm</Text></Box>}
                                {matchingMeasurement.measurements?.arms && <Box><Text size="xs" c="dimmed">Brazos</Text><Text fw={600}>{matchingMeasurement.measurements.arms} cm</Text></Box>}
                                {matchingMeasurement.measurements?.thighs && <Box><Text size="xs" c="dimmed">Muslos</Text><Text fw={600}>{matchingMeasurement.measurements.thighs} cm</Text></Box>}
                              </SimpleGrid>
                            ) : (
                              <Text size="sm" c="dimmed">No hay medidas registradas para esta fecha</Text>
                            )}
                          </Box>
                        </Group>
                      </Paper>
                    );
                  })}
              </Stack>
            ) : (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <ThemeIcon size="xl" color="gray" variant="light" radius="xl"><IconPhoto size={24} /></ThemeIcon>
                  <Text c="dimmed" size="sm">Sube fotos de progreso para ver tu evolución visual</Text>
                  <Button variant="light" leftSection={<IconCamera size={16} />} onClick={openPhotoModal}>Subir foto</Button>
                </Stack>
              </Center>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Modal para registrar medidas */}
      <LogMeasurementModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleLogMeasurement}
        isLoading={createMeasurementMutation.isPending}
        existingMeasurements={measurements}
      />

      {/* Modal para subir foto */}
      <UploadPhotoModal
        opened={photoModalOpened}
        onClose={closePhotoModal}
        onUpload={handleUploadPhoto}
        isLoading={uploadPhotoMutation.isPending}
      />

      {/* Modal para ampliar foto */}
      <Modal
        opened={enlargeOpened}
        onClose={closeEnlarge}
        size="xl"
        title={
          enlargedPhoto
            ? `Foto ${enlargedPhoto.type === "front" ? "Frontal" : enlargedPhoto.type === "back" ? "Espalda" : enlargedPhoto.type === "side" ? "Lateral" : enlargedPhoto.type}`
            : "Foto"
        }
        centered
      >
        {enlargedPhoto && (
          <Stack align="center" gap="md">
            <Image
              src={enlargedPhoto.url}
              alt={`Foto ${enlargedPhoto.type}`}
              radius="md"
              fit="contain"
              mah="70vh"
              fallbackSrc="https://placehold.co/600x800?text=Foto"
            />
            {enlargedPhoto.date && (
              <Text size="sm" c="dimmed">
                {new Date(enlargedPhoto.date).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            )}
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
