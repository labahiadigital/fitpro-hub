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
  ActionIcon,
  Accordion,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconBarbell,
  IconCalendarEvent,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconFlame,
  IconPlayerPlay,
  IconRepeat,
  IconWeight,
} from "@tabler/icons-react";
import { useMyWorkouts, useWorkoutHistory } from "../../hooks/useClientPortal";

// Datos de ejemplo (fallback cuando no hay datos del backend)
const mockWorkoutData = {
  todayWorkout: {
    name: "Fuerza - Tren Superior",
    duration: "60 min",
    exercises: 8,
    completed: false,
    exercises_list: [
      { name: "Press de Banca", sets: 4, reps: "8-10", weight: "60kg", completed: false },
      { name: "Dominadas", sets: 4, reps: "8-10", weight: "Peso corporal", completed: false },
      { name: "Press Militar", sets: 3, reps: "10-12", weight: "35kg", completed: false },
      { name: "Remo con Barra", sets: 4, reps: "8-10", weight: "50kg", completed: false },
      { name: "Curl de Bíceps", sets: 3, reps: "12-15", weight: "15kg", completed: false },
      { name: "Extensión de Tríceps", sets: 3, reps: "12-15", weight: "12kg", completed: false },
      { name: "Elevaciones Laterales", sets: 3, reps: "15", weight: "8kg", completed: false },
      { name: "Plancha", sets: 3, reps: "45 seg", weight: "-", completed: false },
    ],
  },
  assignedProgram: {
    name: "Plan Hipertrofia Cliente Prueba",
    duration: "4 semanas",
    difficulty: "Intermedio",
    progress: 35,
    currentWeek: 2,
    totalWeeks: 4,
  },
  weekSchedule: [
    { day: "Lunes", type: "Fuerza - Tren Superior", completed: true },
    { day: "Martes", type: "Descanso", completed: true },
    { day: "Miércoles", type: "Fuerza - Tren Inferior", completed: true },
    { day: "Jueves", type: "Descanso", completed: true },
    { day: "Viernes", type: "Full Body + Cardio", completed: false },
    { day: "Sábado", type: "Cardio HIIT", completed: false },
    { day: "Domingo", type: "Descanso Activo", completed: false },
  ],
  history: [
    { date: "20 Ene 2026", name: "Fuerza - Tren Inferior", duration: "55 min", calories: 420 },
    { date: "18 Ene 2026", name: "Fuerza - Tren Superior", duration: "62 min", calories: 380 },
    { date: "16 Ene 2026", name: "Cardio HIIT", duration: "40 min", calories: 520 },
  ],
};

export function MyWorkoutsPage() {
  const { data: workouts, isLoading: isLoadingWorkouts } = useMyWorkouts();
  const { data: history, isLoading: isLoadingHistory } = useWorkoutHistory(10);

  if (isLoadingWorkouts) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  // Get first assigned program as active
  const activeProgram = workouts?.[0];
  
  // Use data from API or fallback to mock
  const data = {
    assignedProgram: activeProgram ? {
      name: activeProgram.name,
      duration: `${activeProgram.duration_weeks || 4} semanas`,
      difficulty: activeProgram.difficulty || "Intermedio",
      progress: 0, // TODO: Calculate from logs
      currentWeek: 1,
      totalWeeks: activeProgram.duration_weeks || 4,
    } : null,
    todayWorkout: activeProgram?.template?.weeks?.[0]?.days?.[0] ? {
      name: activeProgram.template.weeks[0].days[0].day || "Entrenamiento",
      exercises_list: activeProgram.template.weeks[0].days[0].exercises || [],
    } : mockWorkoutData.todayWorkout,
    weekSchedule: mockWorkoutData.weekSchedule,
    history: history?.map(h => ({
      date: new Date(h.created_at).toLocaleDateString('es-ES'),
      name: "Entrenamiento",
      duration: `${h.log?.duration_minutes || 60} min`,
      calories: h.log?.calories_burned || 0,
    })) || mockWorkoutData.history,
  };

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mis Entrenamientos</Title>
          <Text c="dimmed">Tu programa personalizado y progreso</Text>
        </Box>
      </Group>

      {/* Active Program */}
      {data.assignedProgram && (
        <Card shadow="sm" padding="lg" radius="lg" withBorder mb="xl">
          <Group justify="space-between" mb="md">
            <Box>
              <Badge color="yellow" variant="light" mb="xs">PROGRAMA ACTIVO</Badge>
              <Title order={4}>{data.assignedProgram.name}</Title>
              <Text size="sm" c="dimmed">
                {data.assignedProgram.duration} • {data.assignedProgram.difficulty}
              </Text>
            </Box>
            <Box ta="right">
              <Text size="sm" c="dimmed">Semana</Text>
              <Text size="xl" fw={700}>{data.assignedProgram.currentWeek}/{data.assignedProgram.totalWeeks}</Text>
            </Box>
          </Group>
          <Progress value={data.assignedProgram.progress} size="lg" radius="xl" color="yellow" />
          <Text size="xs" c="dimmed" mt="xs">{data.assignedProgram.progress}% completado</Text>
        </Card>
      )}

      <Tabs defaultValue="today" variant="pills">
        <Tabs.List mb="lg">
          <Tabs.Tab value="today" leftSection={<IconBarbell size={16} />}>
            Hoy
          </Tabs.Tab>
          <Tabs.Tab value="week" leftSection={<IconCalendarEvent size={16} />}>
            Esta Semana
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconClock size={16} />}>
            Historial
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="today">
          {data.todayWorkout && (
            <Card shadow="sm" padding="lg" radius="lg" withBorder>
              <Group justify="space-between" mb="lg">
                <Box>
                  <Title order={4}>{data.todayWorkout.name}</Title>
                  <Group gap="md" mt="xs">
                    <Group gap={4}>
                      <IconClock size={14} />
                      <Text size="sm" c="dimmed">{data.todayWorkout.duration}</Text>
                    </Group>
                    <Group gap={4}>
                      <IconBarbell size={14} />
                      <Text size="sm" c="dimmed">{data.todayWorkout.exercises} ejercicios</Text>
                    </Group>
                  </Group>
                </Box>
                <Button leftSection={<IconPlayerPlay size={16} />} color="yellow">
                  Iniciar Entrenamiento
                </Button>
              </Group>

              <Accordion variant="separated">
                {data.todayWorkout.exercises_list.map((exercise, index) => (
                  <Accordion.Item key={index} value={exercise.name}>
                    <Accordion.Control>
                      <Group justify="space-between" pr="md">
                        <Group>
                          <ThemeIcon variant="light" color={exercise.completed ? "green" : "gray"} size="sm">
                            {exercise.completed ? <IconCheck size={14} /> : <IconBarbell size={14} />}
                          </ThemeIcon>
                          <Text fw={500}>{exercise.name}</Text>
                        </Group>
                        <Group gap="xs">
                          <Badge variant="light" color="blue">{exercise.sets}x{exercise.reps}</Badge>
                          <Badge variant="light" color="gray">{exercise.weight}</Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <SimpleGrid cols={3} spacing="md">
                        <Paper p="sm" radius="md" withBorder>
                          <Group gap={4}>
                            <IconRepeat size={14} />
                            <Text size="sm" fw={500}>Series</Text>
                          </Group>
                          <Text size="lg" fw={700}>{exercise.sets}</Text>
                        </Paper>
                        <Paper p="sm" radius="md" withBorder>
                          <Group gap={4}>
                            <IconBarbell size={14} />
                            <Text size="sm" fw={500}>Repeticiones</Text>
                          </Group>
                          <Text size="lg" fw={700}>{exercise.reps}</Text>
                        </Paper>
                        <Paper p="sm" radius="md" withBorder>
                          <Group gap={4}>
                            <IconWeight size={14} />
                            <Text size="sm" fw={500}>Peso</Text>
                          </Group>
                          <Text size="lg" fw={700}>{exercise.weight}</Text>
                        </Paper>
                      </SimpleGrid>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Card>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="week">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            {data.weekSchedule.map((day, index) => (
              <Card key={index} shadow="sm" padding="md" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>{day.day}</Text>
                  {day.completed && (
                    <ThemeIcon color="green" size="sm" radius="xl">
                      <IconCheck size={12} />
                    </ThemeIcon>
                  )}
                </Group>
                <Text size="sm" c={day.type === "Descanso" || day.type === "Descanso Activo" ? "dimmed" : undefined}>
                  {day.type}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Stack gap="sm">
            {data.history.map((workout, index) => (
              <Card key={index} shadow="sm" padding="md" radius="md" withBorder>
                <Group justify="space-between">
                  <Box>
                    <Text fw={600}>{workout.name}</Text>
                    <Text size="sm" c="dimmed">{workout.date}</Text>
                  </Box>
                  <Group gap="md">
                    <Group gap={4}>
                      <IconClock size={14} />
                      <Text size="sm">{workout.duration}</Text>
                    </Group>
                    <Group gap={4}>
                      <IconFlame size={14} color="orange" />
                      <Text size="sm">{workout.calories} kcal</Text>
                    </Group>
                    <ActionIcon variant="light">
                      <IconChevronRight size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
