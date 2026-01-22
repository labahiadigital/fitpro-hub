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
} from "@mantine/core";
import {
  IconCamera,
  IconChartLine,
  IconPlus,
  IconRuler,
  IconScale,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react";
import { useProgressSummary, useMeasurements } from "../../hooks/useClientPortal";

// Datos de ejemplo
const mockProgressData = {
  currentStats: {
    weight: 78,
    bodyFat: 18.5,
    muscleMass: 35.2,
  },
  startStats: {
    weight: 75,
    bodyFat: 20,
    muscleMass: 33.5,
  },
  targetStats: {
    weight: 85,
    bodyFat: 15,
    muscleMass: 40,
  },
  measurements: {
    chest: { current: 102, previous: 100 },
    waist: { current: 82, previous: 84 },
    hips: { current: 98, previous: 97 },
    arms: { current: 36, previous: 35 },
    thighs: { current: 58, previous: 57 },
  },
  weightHistory: [
    { date: "1 Ene", weight: 75 },
    { date: "8 Ene", weight: 75.5 },
    { date: "15 Ene", weight: 76.5 },
    { date: "22 Ene", weight: 78 },
  ],
  photos: [
    { date: "1 Ene 2026", type: "Frente" },
    { date: "1 Ene 2026", type: "Lateral" },
    { date: "15 Ene 2026", type: "Frente" },
  ],
  achievements: [
    { title: "Primera semana completada", date: "8 Ene 2026", icon: "🎯" },
    { title: "+1kg de músculo", date: "15 Ene 2026", icon: "💪" },
    { title: "10 entrenamientos", date: "20 Ene 2026", icon: "🏋️" },
  ],
};

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
  const progress = inverse 
    ? ((start - current) / (start - target)) * 100
    : ((current - start) / (target - start)) * 100;
  const change = current - start;
  const isPositive = inverse ? change < 0 : change > 0;

  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">{label}</Text>
        <Badge 
          color={isPositive ? "green" : "red"} 
          variant="light"
          leftSection={isPositive ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
        >
          {change > 0 ? "+" : ""}{change.toFixed(1)}{unit}
        </Badge>
      </Group>
      <Text size="xl" fw={700}>{current}{unit}</Text>
      <Group justify="space-between" mt="xs" mb={4}>
        <Text size="xs" c="dimmed">Inicio: {start}{unit}</Text>
        <Text size="xs" c="dimmed">Objetivo: {target}{unit}</Text>
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
        <Text>{current} cm</Text>
      </Table.Td>
      <Table.Td ta="center">
        <Text c="dimmed">{previous} cm</Text>
      </Table.Td>
      <Table.Td ta="right">
        <Badge 
          color={change > 0 ? "green" : change < 0 ? "red" : "gray"} 
          variant="light"
          size="sm"
        >
          {change > 0 ? "+" : ""}{change} cm
        </Badge>
      </Table.Td>
    </Table.Tr>
  );
}

export function MyProgressPage() {
  const { data: summary, isLoading: isLoadingSummary } = useProgressSummary();
  const { data: measurements, isLoading: isLoadingMeasurements } = useMeasurements(20);

  if (isLoadingSummary) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  // Use API data or fallback
  const data = {
    currentStats: summary?.current_stats || mockProgressData.currentStats,
    startStats: summary?.start_stats || mockProgressData.startStats,
    targetStats: summary?.target_stats || mockProgressData.targetStats,
    measurements: mockProgressData.measurements, // TODO: Parse from measurements array
    weightHistory: measurements?.map(m => ({
      date: new Date(m.measured_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      weight: m.weight_kg || 0,
    })) || mockProgressData.weightHistory,
    photos: mockProgressData.photos,
    achievements: mockProgressData.achievements,
  };

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mi Progreso</Title>
          <Text c="dimmed">Seguimiento de tu evolución física</Text>
        </Box>
        <Group>
          <Button variant="light" leftSection={<IconCamera size={16} />}>
            Subir foto
          </Button>
          <Button leftSection={<IconPlus size={16} />} color="yellow">
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
            {/* Weight Chart Placeholder */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card shadow="sm" padding="lg" radius="lg" withBorder>
                <Text fw={600} mb="lg">Evolución del Peso</Text>
                <Box 
                  h={200} 
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
                    <Text c="dimmed" size="sm">Gráfico de evolución</Text>
                  </Stack>
                </Box>
                <Group justify="space-around" mt="md">
                  {data.weightHistory.map((point, index) => (
                    <Box key={index} ta="center">
                      <Text size="lg" fw={700}>{point.weight}kg</Text>
                      <Text size="xs" c="dimmed">{point.date}</Text>
                    </Box>
                  ))}
                </Group>
              </Card>
            </Grid.Col>

            {/* Achievements */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="lg" withBorder h="100%">
                <Text fw={600} mb="lg">Logros Recientes</Text>
                <Stack gap="sm">
                  {data.achievements.map((achievement, index) => (
                    <Paper key={index} p="sm" radius="md" withBorder>
                      <Group>
                        <Text size="xl">{achievement.icon}</Text>
                        <Box>
                          <Text size="sm" fw={500}>{achievement.title}</Text>
                          <Text size="xs" c="dimmed">{achievement.date}</Text>
                        </Box>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="measurements">
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Text fw={600} mb="lg">Medidas Corporales</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Zona</Table.Th>
                  <Table.Th ta="center">Actual</Table.Th>
                  <Table.Th ta="center">Anterior</Table.Th>
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
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="photos">
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Text fw={600} mb="lg">Fotos de Evolución</Text>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
              {data.photos.map((photo, index) => (
                <Paper 
                  key={index} 
                  h={200} 
                  radius="md" 
                  withBorder
                  style={{ 
                    background: "var(--mantine-color-gray-light)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconCamera size={40} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed" mt="xs">{photo.type}</Text>
                  <Text size="xs" c="dimmed">{photo.date}</Text>
                </Paper>
              ))}
              <Paper 
                h={200} 
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
    </Box>
  );
}
