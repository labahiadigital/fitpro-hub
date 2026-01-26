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
  Modal,
  NumberInput,
  Textarea,
  Checkbox,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { useState } from "react";
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
import { useMyWorkouts, useWorkoutHistory, useLogWorkout } from "../../hooks/useClientPortal";

// No mock data - all data comes from backend

interface ExerciseLog {
  name: string;
  completed: boolean;
  sets_completed: number;
  notes?: string;
}

// Modal para registrar entrenamiento completado
function LogWorkoutModal({
  opened,
  onClose,
  onSubmit,
  isLoading,
  workoutName,
  exercises,
  programId,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    program_id: string;
    log: {
      workout_name: string;
      duration_minutes: number;
      calories_burned: number;
      exercises: ExerciseLog[];
      notes: string;
      completed_at: string;
    };
  }) => void;
  isLoading: boolean;
  workoutName: string;
  exercises: Array<{ name: string; sets: number; reps: string; weight?: string }>;
  programId: string;
}) {
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>(
    exercises.map((e) => ({
      name: e.name,
      completed: false,
      sets_completed: e.sets,
    }))
  );

  const form = useForm({
    initialValues: {
      duration_minutes: 60,
      calories_burned: 300,
      notes: "",
    },
  });

  const toggleExercise = (index: number) => {
    const newLogs = [...exerciseLogs];
    newLogs[index] = { ...newLogs[index], completed: !newLogs[index].completed };
    setExerciseLogs(newLogs);
  };

  const handleSubmit = () => {
    onSubmit({
      program_id: programId,
      log: {
        workout_name: workoutName,
        duration_minutes: form.values.duration_minutes,
        calories_burned: form.values.calories_burned,
        exercises: exerciseLogs,
        notes: form.values.notes,
        completed_at: new Date().toISOString(),
      },
    });
    form.reset();
    setExerciseLogs(
      exercises.map((e) => ({
        name: e.name,
        completed: false,
        sets_completed: e.sets,
      }))
    );
  };

  const completedCount = exerciseLogs.filter((e) => e.completed).length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Registrar Entrenamiento"
      size="lg"
    >
      <Stack gap="md">
        <Paper p="md" radius="md" style={{ background: "var(--mantine-color-yellow-light)" }}>
          <Text fw={600}>{workoutName}</Text>
          <Text size="sm" c="dimmed">
            {completedCount}/{exercises.length} ejercicios completados
          </Text>
        </Paper>

        <Text fw={500} size="sm">
          Ejercicios
        </Text>
        <Stack gap="xs">
          {exerciseLogs.map((exercise, index) => (
            <Paper key={index} p="sm" withBorder radius="md">
              <Checkbox
                label={
                  <Group gap="sm">
                    <Text fw={500}>{exercise.name}</Text>
                    <Badge variant="light" color="blue" size="sm">
                      {exercises[index].sets}x{exercises[index].reps}
                    </Badge>
                  </Group>
                }
                checked={exercise.completed}
                onChange={() => toggleExercise(index)}
                color="green"
              />
            </Paper>
          ))}
        </Stack>

        <SimpleGrid cols={2}>
          <NumberInput
            label="Duración (minutos)"
            {...form.getInputProps("duration_minutes")}
            min={1}
            max={300}
            leftSection={<IconClock size={16} />}
          />
          <NumberInput
            label="Calorías quemadas"
            {...form.getInputProps("calories_burned")}
            min={0}
            max={2000}
            leftSection={<IconFlame size={16} />}
          />
        </SimpleGrid>

        <Textarea
          label="Notas (opcional)"
          placeholder="¿Cómo te sentiste? ¿Aumentaste peso? ¿Algo que destacar?"
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
            leftSection={<IconCheck size={16} />}
          >
            Completar Entrenamiento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Interface para días del programa
interface ProgramDay {
  id: string;
  day: number;
  dayName: string;
  isRestDay: boolean;
  blocks: Array<{
    id?: string;
    name: string;
    type?: string;
    exercises?: Array<{
      exercise?: { name?: string };
      name?: string;
      sets?: number;
      reps?: string;
      rest_seconds?: number;
      notes?: string;
    }>;
  }>;
  notes?: string;
}

export function MyWorkoutsPage() {
  const { data: workouts, isLoading: isLoadingWorkouts } = useMyWorkouts();
  const { data: history } = useWorkoutHistory(10);
  const logWorkoutMutation = useLogWorkout();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  if (isLoadingWorkouts) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  // Get first assigned program as active
  const activeProgram = workouts?.[0];
  
  // Obtener el día de la semana actual (1=Lunes, 7=Domingo)
  const todayJsDay = new Date().getDay(); // 0=Domingo, 1=Lunes, etc.
  const dayMapping = [7, 1, 2, 3, 4, 5, 6]; // Mapear: Domingo=7, Lunes=1, etc.
  const todayDayNum = dayMapping[todayJsDay];
  
  // Obtener días del template (nueva estructura) o usar retrocompatibilidad
  const templateDays: ProgramDay[] = activeProgram?.template?.days || [];
  const legacyBlocks = activeProgram?.template?.blocks || [];
  
  // Obtener el entrenamiento de hoy
  const todayWorkoutDay = templateDays.find((d: ProgramDay) => d.day === todayDayNum);
  const todayBlocks = todayWorkoutDay?.blocks || (todayDayNum === 1 ? legacyBlocks : []);
  const isTodayRestDay = todayWorkoutDay?.isRestDay ?? false;
  
  // Flatten all exercises from today's blocks
  const allExercises = todayBlocks.flatMap((block: { exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }) => 
    (block.exercises || []).map(ex => ({
      name: ex.exercise?.name || ex.name || "Ejercicio",
      sets: ex.sets || 3,
      reps: ex.reps || "10-12",
      weight: ex.rest_seconds ? `${ex.rest_seconds}s descanso` : "",
      notes: ex.notes,
    }))
  );
  
  // Create week schedule from days template
  const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const weekSchedule = weekDays.map((dayName, index) => {
    const dayNum = index + 1;
    const dayData = templateDays.find((d: ProgramDay) => d.day === dayNum);
    
    if (dayData) {
      const exerciseCount = dayData.blocks?.reduce((sum: number, b: { exercises?: Array<unknown> }) => sum + (b.exercises?.length || 0), 0) || 0;
      return {
        day: dayName,
        type: dayData.isRestDay ? "Descanso" : `${exerciseCount} ejercicios`,
        completed: false,
        isRestDay: dayData.isRestDay,
        blocks: dayData.blocks,
      };
    }
    
    // Retrocompatibilidad: solo mostrar bloques en el primer día
    if (index === 0 && legacyBlocks.length > 0) {
      return {
        day: dayName,
        type: `${legacyBlocks.reduce((sum: number, b: { exercises?: Array<unknown> }) => sum + (b.exercises?.length || 0), 0)} ejercicios`,
        completed: false,
        isRestDay: false,
        blocks: legacyBlocks,
      };
    }
    
    return {
      day: dayName,
      type: "Sin asignar",
      completed: false,
      isRestDay: true,
      blocks: [],
    };
  });

  // Use only API data - no mocks
  const data = {
    assignedProgram: activeProgram ? {
      id: activeProgram.id,
      name: activeProgram.name,
      duration: `${activeProgram.duration_weeks || 4} semanas`,
      difficulty: activeProgram.difficulty || "intermediate",
      progress: 0, // TODO: Calculate from logs
      currentWeek: 1,
      totalWeeks: activeProgram.duration_weeks || 4,
    } : null,
    todayWorkout: !isTodayRestDay && todayBlocks.length > 0 ? {
      name: todayWorkoutDay?.dayName || activeProgram?.name || "Entrenamiento",
      duration: "60 min",
      exercises: allExercises.length,
      completed: false,
      exercises_list: allExercises,
      blocks: todayBlocks,
    } : null,
    isTodayRestDay,
    weekSchedule,
    history: history?.map(h => ({
      date: new Date(h.created_at).toLocaleDateString('es-ES'),
      name: (h.log as Record<string, unknown>)?.workout_name as string || "Entrenamiento",
      duration: `${(h.log as Record<string, unknown>)?.duration_minutes || 60} min`,
      calories: (h.log as Record<string, unknown>)?.calories_burned as number || 0,
    })) || [],
  };

  const handleLogWorkout = async (logData: {
    program_id: string;
    log: Record<string, unknown>;
  }) => {
    await logWorkoutMutation.mutateAsync(logData);
    closeModal();
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
      {data.assignedProgram && data.assignedProgram.id && (
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

      {!data.assignedProgram?.id && (
        <Paper p="md" radius="lg" mb="xl" style={{ background: "var(--mantine-color-gray-light)" }}>
          <Text ta="center" c="dimmed">
            No tienes un programa de entrenamiento asignado. Contacta con tu entrenador.
          </Text>
        </Paper>
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
          {data.isTodayRestDay && (
            <Paper p="xl" ta="center" radius="lg" withBorder>
              <Text size="xl" mb="sm">🛌</Text>
              <Text fw={600} size="lg">Hoy es día de descanso</Text>
              <Text c="dimmed" mt="xs">
                Tu cuerpo necesita recuperarse. ¡Aprovecha para descansar!
              </Text>
            </Paper>
          )}
          
          {!data.isTodayRestDay && data.todayWorkout && (
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
                      <Text size="sm" c="dimmed">{data.todayWorkout.exercises || data.todayWorkout.exercises_list?.length} ejercicios</Text>
                    </Group>
                  </Group>
                </Box>
                <Button 
                  leftSection={<IconPlayerPlay size={16} />} 
                  color="yellow"
                  onClick={openModal}
                  disabled={!data.assignedProgram?.id}
                >
                  Iniciar Entrenamiento
                </Button>
              </Group>

              {/* Show blocks with exercises */}
              {data.todayWorkout.blocks?.map((block: { id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }, blockIndex: number) => (
                <Box key={block.id || blockIndex} mb="lg">
                  <Group gap="xs" mb="sm">
                    <Badge 
                      color={block.type === 'warmup' ? 'orange' : block.type === 'cooldown' ? 'blue' : 'yellow'} 
                      variant="light"
                    >
                      {block.type === 'warmup' ? 'Calentamiento' : block.type === 'cooldown' ? 'Enfriamiento' : 'Principal'}
                    </Badge>
                    <Text fw={600}>{block.name}</Text>
                    <Text size="sm" c="dimmed">{block.exercises?.length || 0} ejercicios</Text>
                  </Group>
                  <Accordion variant="separated">
                    {block.exercises?.map((exercise, exIndex) => {
                      const exName = exercise.exercise?.name || exercise.name || "Ejercicio";
                      return (
                        <Accordion.Item key={exIndex} value={`${blockIndex}-${exIndex}`}>
                          <Accordion.Control>
                            <Group justify="space-between" pr="md">
                              <Group>
                                <ThemeIcon variant="light" color="gray" size="sm">
                                  <IconBarbell size={14} />
                                </ThemeIcon>
                                <Text fw={500}>{exName}</Text>
                              </Group>
                              <Group gap="xs">
                                <Badge variant="light" color="blue">{exercise.sets || 3} x {exercise.reps || "10-12"}</Badge>
                                {exercise.rest_seconds && (
                                  <Badge variant="light" color="gray">{exercise.rest_seconds}s</Badge>
                                )}
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
                                <Text size="lg" fw={700}>{exercise.sets || 3}</Text>
                              </Paper>
                              <Paper p="sm" radius="md" withBorder>
                                <Group gap={4}>
                                  <IconBarbell size={14} />
                                  <Text size="sm" fw={500}>Repeticiones</Text>
                                </Group>
                                <Text size="lg" fw={700}>{exercise.reps || "10-12"}</Text>
                              </Paper>
                              <Paper p="sm" radius="md" withBorder>
                                <Group gap={4}>
                                  <IconClock size={14} />
                                  <Text size="sm" fw={500}>Descanso</Text>
                                </Group>
                                <Text size="lg" fw={700}>{exercise.rest_seconds || 60}s</Text>
                              </Paper>
                            </SimpleGrid>
                            {exercise.notes && (
                              <Text size="sm" c="dimmed" mt="sm">
                                <strong>Notas:</strong> {exercise.notes}
                              </Text>
                            )}
                          </Accordion.Panel>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion>
                </Box>
              ))}
              
              {/* Fallback: show flat exercise list if no blocks */}
              {(!data.todayWorkout.blocks || data.todayWorkout.blocks.length === 0) && data.todayWorkout.exercises_list?.length > 0 && (
                <Accordion variant="separated">
                  {data.todayWorkout.exercises_list.map((exercise: { name: string; sets: number; reps: string; weight?: string; completed?: boolean }, index: number) => (
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
              )}
            </Card>
          )}
          
          {!data.isTodayRestDay && !data.todayWorkout && data.assignedProgram?.id && (
            <Paper p="xl" ta="center" radius="lg" withBorder>
              <Text c="dimmed">No hay entrenamiento asignado para hoy.</Text>
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="week">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            {data.weekSchedule.map((day, index) => {
              const isToday = index + 1 === todayDayNum;
              return (
                <Card 
                  key={index} 
                  shadow="sm" 
                  padding="md" 
                  radius="md" 
                  withBorder
                  style={{
                    borderColor: isToday ? "var(--mantine-color-yellow-5)" : undefined,
                    backgroundColor: isToday ? "var(--mantine-color-yellow-0)" : undefined,
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <Text fw={600}>{day.day}</Text>
                      {isToday && <Badge size="xs" color="yellow">Hoy</Badge>}
                    </Group>
                    {day.completed && (
                      <ThemeIcon color="green" size="sm" radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    )}
                  </Group>
                  <Text size="sm" c={day.isRestDay ? "dimmed" : undefined} fw={day.isRestDay ? 400 : 500}>
                    {day.isRestDay ? "🛌 Descanso" : `💪 ${day.type}`}
                  </Text>
                </Card>
              );
            })}
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Stack gap="sm">
            {data.history.length > 0 ? (
              data.history.map((workout, index) => (
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
              ))
            ) : (
              <Paper p="lg" radius="md" ta="center">
                <Text c="dimmed">No hay entrenamientos registrados aún</Text>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal para registrar entrenamiento */}
      <LogWorkoutModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleLogWorkout}
        isLoading={logWorkoutMutation.isPending}
        workoutName={data.todayWorkout?.name || "Entrenamiento"}
        exercises={data.todayWorkout?.exercises_list || []}
        programId={data.assignedProgram?.id || ""}
      />
    </Box>
  );
}
