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
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconCamera,
  IconChartLine,
  IconPlus,
  IconRuler,
  IconScale,
  IconTrendingUp,
  IconTrendingDown,
  IconUpload,
} from "@tabler/icons-react";
import { useState, useMemo } from "react";
import { useProgressSummary, useMeasurements, useCreateMeasurement, useUploadProgressPhoto, useProgressPhotos } from "../../hooks/useClientPortal";

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
            {change > 0 ? "+" : ""}{change.toFixed(1)}{unit}
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
}) {
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

  const handleSubmit = () => {
    const measurements: Record<string, number> = {};
    if (form.values.chest) measurements.chest = form.values.chest;
    if (form.values.waist) measurements.waist = form.values.waist;
    if (form.values.hips) measurements.hips = form.values.hips;
    if (form.values.arms) measurements.arms = form.values.arms;
    if (form.values.thighs) measurements.thighs = form.values.thighs;

    onSubmit({
      measured_at: new Date().toISOString(),
      weight_kg: form.values.weight_kg,
      body_fat_percentage: form.values.body_fat_percentage,
      muscle_mass_kg: form.values.muscle_mass_kg,
      measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
      notes: form.values.notes || undefined,
    });

    form.reset();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Registrar Medidas"
      size="lg"
    >
      <Stack gap="md">
        <Text fw={500} size="sm">
          Datos Corporales
        </Text>
        <SimpleGrid cols={3}>
          <NumberInput
            label="Peso (kg)"
            placeholder="78.5"
            {...form.getInputProps("weight_kg")}
            min={30}
            max={300}
            decimalScale={1}
            leftSection={<IconScale size={16} />}
          />
          <NumberInput
            label="% Grasa Corporal"
            placeholder="18.5"
            {...form.getInputProps("body_fat_percentage")}
            min={3}
            max={50}
            decimalScale={1}
          />
          <NumberInput
            label="Masa Muscular (kg)"
            placeholder="35.2"
            {...form.getInputProps("muscle_mass_kg")}
            min={10}
            max={100}
            decimalScale={1}
          />
        </SimpleGrid>

        <Text fw={500} size="sm" mt="md">
          Medidas Corporales (cm)
        </Text>
        <SimpleGrid cols={5}>
          <NumberInput
            label="Pecho"
            placeholder="102"
            {...form.getInputProps("chest")}
            min={50}
            max={200}
          />
          <NumberInput
            label="Cintura"
            placeholder="82"
            {...form.getInputProps("waist")}
            min={40}
            max={200}
          />
          <NumberInput
            label="Cadera"
            placeholder="98"
            {...form.getInputProps("hips")}
            min={50}
            max={200}
          />
          <NumberInput
            label="Brazos"
            placeholder="36"
            {...form.getInputProps("arms")}
            min={15}
            max={60}
          />
          <NumberInput
            label="Muslos"
            placeholder="58"
            {...form.getInputProps("thighs")}
            min={30}
            max={100}
          />
        </SimpleGrid>

        <Textarea
          label="Notas (opcional)"
          placeholder="¿Cómo te sientes? ¿Algún comentario sobre tu progreso?"
          {...form.getInputProps("notes")}
          minRows={2}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="yellow"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!form.values.weight_kg && !form.values.body_fat_percentage && !form.values.muscle_mass_kg}
          >
            Guardar Medidas
          </Button>
        </Group>
      </Stack>
    </Modal>
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
  onUpload: (file: File, type: string, notes?: string) => void;
  isLoading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [photoType, setPhotoType] = useState<string>("front");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

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
    onUpload(file, photoType, notes || undefined);
    setFile(null);
    setPreview(null);
    setNotes("");
    setPhotoType("front");
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Subir Foto de Progreso"
      size="md"
    >
      <Stack gap="md">
        <Select
          label="Tipo de foto"
          data={[
            { value: "front", label: "Frontal" },
            { value: "back", label: "Espalda" },
            { value: "side", label: "Lateral" },
          ]}
          value={photoType}
          onChange={(v) => setPhotoType(v || "front")}
        />

        <Box>
          <Text size="sm" fw={500} mb="xs">Seleccionar imagen</Text>
          <FileButton onChange={handleFileSelect} accept="image/png,image/jpeg,image/webp">
            {(props) => (
              <Button 
                {...props} 
                variant="light" 
                leftSection={<IconUpload size={16} />}
                fullWidth
              >
                {file ? file.name : "Seleccionar archivo"}
              </Button>
            )}
          </FileButton>
        </Box>

        {preview && (
          <Box>
            <Text size="sm" c="dimmed" mb="xs">Vista previa:</Text>
            <Image
              src={preview}
              alt="Vista previa"
              radius="md"
              h={200}
              fit="contain"
            />
          </Box>
        )}

        <Textarea
          label="Notas (opcional)"
          placeholder="Añade notas sobre esta foto..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={2}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="yellow"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!file}
            leftSection={<IconCamera size={16} />}
          >
            Subir Foto
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function MyProgressPage() {
  const { data: summary, isLoading: isLoadingSummary } = useProgressSummary();
  const { data: measurements } = useMeasurements(50);
  const { data: photos = [] } = useProgressPhotos(50);
  const createMeasurementMutation = useCreateMeasurement();
  const uploadPhotoMutation = useUploadProgressPhoto();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [photoModalOpened, { open: openPhotoModal, close: closePhotoModal }] = useDisclosure(false);
  const [selectedComparison, setSelectedComparison] = useState<number>(1); // Index of measurement to compare with

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

  const handleUploadPhoto = async (file: File, type: string, notes?: string) => {
    try {
      await uploadPhotoMutation.mutateAsync({ file, type, notes });
      closePhotoModal();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Box p="xl">
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

      <Tabs defaultValue="overview" variant="pills">
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
        </Tabs.List>

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
                              {maxWeight.toFixed(0)}
                            </text>
                            <text x={padding.left - 10} y={height - padding.bottom} textAnchor="end" fontSize="10" fill="#fab005">
                              {minWeight.toFixed(0)}
                            </text>
                          </svg>
                        </Box>
                      );
                    })()}
                    
                    {/* Data summary below chart */}
                    <SimpleGrid cols={3} mt="md">
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
                        {((data.weightHistory[data.weightHistory.length - 1]?.weight || 0) - (data.weightHistory[0]?.weight || 0)).toFixed(1)} kg
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
                              {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
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
              <Text fw={600}>Fotos de Evolución ({photos.length} fotos)</Text>
              <Button 
                variant="light" 
                leftSection={<IconCamera size={16} />}
                onClick={openPhotoModal}
                size="sm"
              >
                Subir foto
              </Button>
            </Group>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
              {photos.map((photo, index) => (
                <Card key={index} padding="xs" radius="md" withBorder>
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
                    <Text size="xs" c="dimmed">
                      {photo.measurement_date 
                        ? new Date(photo.measurement_date).toLocaleDateString("es-ES")
                        : photo.uploaded_at 
                          ? new Date(photo.uploaded_at).toLocaleDateString("es-ES")
                          : "Sin fecha"}
                    </Text>
                  </Stack>
                </Card>
              ))}
              <Paper 
                h={220} 
                radius="md" 
                withBorder
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
            </SimpleGrid>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Modal para registrar medidas */}
      <LogMeasurementModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleLogMeasurement}
        isLoading={createMeasurementMutation.isPending}
      />

      {/* Modal para subir foto */}
      <UploadPhotoModal
        opened={photoModalOpened}
        onClose={closePhotoModal}
        onUpload={handleUploadPhoto}
        isLoading={uploadPhotoMutation.isPending}
      />
    </Box>
  );
}
