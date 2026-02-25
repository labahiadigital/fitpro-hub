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
  TextInput,
  ScrollArea,
  Divider,
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
  IconExchange,
  IconSearch,
} from "@tabler/icons-react";
import { useMyWorkouts, useWorkoutHistory, useTodayWorkoutLogs, useClientExercises, useClientExerciseAlternatives, useUpdateProgramExercise, useLogWorkoutDetailed, useExerciseHistory } from "../../hooks/useClientPortal";

// No mock data - all data comes from backend

interface ExerciseForLog {
  exercise_id: string;
  name: string;
  sets: number;
  reps: string;
  target_weight?: number;
  target_reps?: number;
}

interface SetLog {
  set_number: number;
  weight_kg?: number;
  reps_completed?: number;
  duration_seconds?: number;
  completed: boolean;
  notes?: string;
}

interface Achievement {
  exercise_name: string;
  target_weight?: number;
  target_reps?: number;
  actual_weight?: number;
  actual_reps?: number;
  exceeded: boolean;
}

function checkAchievements(
  exercises: Array<{
    exercise_id: string;
    exercise_name: string;
    sets?: Array<{ set_number?: number; weight_kg?: number; reps_completed?: number }>;
  }>,
  programExercises: Array<{ exercise_id: string; target_weight?: number; target_reps?: number }>
): Achievement[] {
  const achievements: Achievement[] = [];

  exercises.forEach((ex) => {
    const target = programExercises.find((pe) => pe.exercise_id === ex.exercise_id);
    if (!target) return;

    const bestSet = ex.sets?.reduce((best: { weight_kg?: number; reps_completed?: number } | null, set) => {
      if (!best) return set;
      if ((set.weight_kg || 0) > (best.weight_kg || 0)) return set;
      if (
        (set.weight_kg || 0) === (best.weight_kg || 0) &&
        (set.reps_completed || 0) > (best.reps_completed || 0)
      )
        return set;
      return best;
    }, null);

    if (!bestSet) return;

    const hitWeight = target.target_weight != null && (bestSet.weight_kg ?? 0) >= target.target_weight;
    const hitReps = target.target_reps != null && (bestSet.reps_completed ?? 0) >= target.target_reps;
    const exceeded =
      (target.target_weight != null && (bestSet.weight_kg ?? 0) > target.target_weight) ||
      (target.target_reps != null && (bestSet.reps_completed ?? 0) > target.target_reps);

    if (hitWeight || hitReps) {
      achievements.push({
        exercise_name: ex.exercise_name,
        target_weight: target.target_weight,
        target_reps: target.target_reps,
        actual_weight: bestSet.weight_kg,
        actual_reps: bestSet.reps_completed,
        exceeded,
      });
    }
  });

  return achievements;
}

// Row component for each exercise - fetches and shows last session + per-set inputs
function ExerciseLogRow({
  exercise,
  setData,
  onSetChange,
}: {
  exercise: ExerciseForLog;
  setData: SetLog[];
  onSetChange: (sets: SetLog[]) => void;
}) {
  const { data: history } = useExerciseHistory(exercise.exercise_id, 1);
  const lastSession = history?.[0];

  const updateSet = (index: number, updates: Partial<SetLog>) => {
    const newSets = [...setData];
    newSets[index] = { ...newSets[index], ...updates };
    onSetChange(newSets);
  };

  return (
    <Paper key={exercise.exercise_id} p="sm" withBorder radius="md">
      <Text fw={600} size="sm" mb="xs">{exercise.name}</Text>
      {lastSession && (
        <Box p="xs" mb="sm" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
          <Text size="xs" c="dimmed" fw={600}>
            Última vez ({lastSession.date ? new Date(lastSession.date).toLocaleDateString("es-ES") : "—"}):
          </Text>
          {((lastSession.exercise?.sets ?? []) as Array<{ set_number?: number; weight_kg?: number; reps_completed?: number; duration_seconds?: number }>).map((set, i) => (
            <Text key={i} size="xs" c="dimmed">
              Serie {set.set_number ?? i + 1}: {set.weight_kg != null ? `${set.weight_kg}kg` : "—"} x {set.reps_completed != null ? `${set.reps_completed} reps` : set.duration_seconds != null ? `${set.duration_seconds}s` : "—"}
            </Text>
          ))}
        </Box>
      )}
      <Stack gap="xs">
        {setData.map((set, idx) => (
          <Group key={idx} gap="sm" wrap="nowrap">
            <Text size="xs" w={60}>Serie {idx + 1}:</Text>
            {(exercise.target_weight != null || exercise.target_reps != null) && (
              <Text size="xs" c="dimmed">Objetivo: {exercise.target_weight ?? "—"}kg x {exercise.target_reps ?? exercise.reps ?? "—"}</Text>
            )}
            <NumberInput
              placeholder="kg"
              size="xs"
              value={set.weight_kg ?? ""}
              onChange={(v) => updateSet(idx, { weight_kg: v ? Number(v) : undefined })}
              min={0}
              max={500}
              w={70}
            />
            <NumberInput
              placeholder="reps."
              size="xs"
              value={set.reps_completed ?? ""}
              onChange={(v) => updateSet(idx, { reps_completed: v ? Number(v) : undefined })}
              min={0}
              max={200}
              w={70}
            />
            <Checkbox
              label="Hecho"
              checked={set.completed}
              onChange={(e) => updateSet(idx, { completed: e.currentTarget.checked })}
              size="xs"
            />
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

// Modal para registrar entrenamiento completado (detailed)
function LogWorkoutModal({
  opened,
  onClose,
  onSubmit,
  isLoading,
  workoutName,
  exercises,
  programId,
  dayIndex,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    program_id: string;
    day_index: number;
    exercises: Array<{
      exercise_id: string;
      exercise_name: string;
      sets: Array<{
        set_number: number;
        weight_kg?: number;
        reps_completed?: number;
        duration_seconds?: number;
        completed?: boolean;
        notes?: string;
      }>;
      completed?: boolean;
      notes?: string;
    }>;
    duration_minutes?: number;
    perceived_effort?: number;
    notes?: string;
  }) => void;
  isLoading: boolean;
  workoutName: string;
  exercises: ExerciseForLog[];
  programId: string;
  dayIndex: number;
}) {
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetLog[]>>(() => {
    const initial: Record<string, SetLog[]> = {};
    exercises.forEach((e) => {
      initial[e.exercise_id] = Array.from({ length: e.sets }, (_, i) => ({
        set_number: i + 1,
        completed: true,
      }));
    });
    return initial;
  });

  const form = useForm({
    initialValues: {
      duration_minutes: 60,
      perceived_effort: 5,
      notes: "",
    },
  });

  const handleSubmit = () => {
    onSubmit({
      program_id: programId,
      day_index: dayIndex,
      exercises: exercises.map((e) => ({
        exercise_id: e.exercise_id,
        exercise_name: e.name,
        sets: (exerciseSets[e.exercise_id] || []).map((s) => ({
          set_number: s.set_number,
          weight_kg: s.weight_kg,
          reps_completed: s.reps_completed,
          duration_seconds: s.duration_seconds,
          completed: s.completed,
          notes: s.notes,
        })),
        completed: true,
      })),
      duration_minutes: form.values.duration_minutes,
      perceived_effort: form.values.perceived_effort,
      notes: form.values.notes,
    });
    form.reset();
    setExerciseSets(() => {
      const initial: Record<string, SetLog[]> = {};
      exercises.forEach((e) => {
        initial[e.exercise_id] = Array.from({ length: e.sets }, (_, i) => ({
          set_number: i + 1,
          completed: true,
        }));
      });
      return initial;
    });
  };

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
            {exercises.length} ejercicios • Registra peso y repeticiones por serie
          </Text>
        </Paper>

        <Text fw={500} size="sm">Ejercicios</Text>
        <ScrollArea h={320}>
          <Stack gap="sm">
            {exercises.map((exercise) => (
              <ExerciseLogRow
                key={exercise.exercise_id}
                exercise={exercise}
                setData={exerciseSets[exercise.exercise_id] || []}
                onSetChange={(sets) => setExerciseSets((prev) => ({ ...prev, [exercise.exercise_id]: sets }))}
              />
            ))}
          </Stack>
        </ScrollArea>

        <SimpleGrid cols={2}>
          <NumberInput
            label="Duración (minutos)"
            {...form.getInputProps("duration_minutes")}
            min={1}
            max={300}
            leftSection={<IconClock size={16} />}
          />
          <NumberInput
            label="Esfuerzo percibido (1-10)"
            {...form.getInputProps("perceived_effort")}
            min={1}
            max={10}
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

// Modal para sustituir ejercicio
interface SwapExerciseModalProps {
  opened: boolean;
  onClose: () => void;
  programId: string;
  dayIndex: number;
  blockIndex: number;
  exerciseIndex: number;
  currentExerciseName: string;
  currentExerciseId?: string;
  onSuccess: () => void;
}

function SwapExerciseModal({
  opened,
  onClose,
  programId,
  dayIndex,
  blockIndex,
  exerciseIndex,
  currentExerciseName,
  currentExerciseId,
  onSuccess,
}: SwapExerciseModalProps) {
  const [search, setSearch] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const form = useForm({
    initialValues: { reason: "" },
  });

  const { data: alternatives, isLoading: isLoadingAlternatives } = useClientExerciseAlternatives(
    opened ? currentExerciseId : undefined
  );
  const { data: exercises, isLoading: isLoadingExercises } = useClientExercises({
    search: search || undefined,
    limit: 100,
  });
  const updateMutation = useUpdateProgramExercise();

  const hasAlternatives = (alternatives || []).length > 0;

  const handleSwap = async () => {
    if (!selectedExerciseId) return;
    await updateMutation.mutateAsync({
      programId,
      day_index: dayIndex,
      block_index: blockIndex,
      exercise_index: exerciseIndex,
      new_exercise_id: selectedExerciseId,
      reason: form.values.reason || undefined,
    });
    form.reset();
    setSelectedExerciseId(null);
    setShowAllExercises(false);
    onSuccess();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={() => { onClose(); setShowAllExercises(false); setSelectedExerciseId(null); }}
      title="Sustituir ejercicio"
      size="lg"
    >
      <Stack gap="md">
        <Paper p="sm" radius="md" withBorder>
          <Text size="sm" c="dimmed">Sustituyendo:</Text>
          <Text fw={600}>{currentExerciseName}</Text>
        </Paper>

        {/* Alternativas predefinidas por el entrenador */}
        {isLoadingAlternatives ? (
          <Center py="sm"><Loader size="xs" /></Center>
        ) : hasAlternatives ? (
          <Box>
            <Group gap="xs" mb="xs">
              <IconExchange size={14} color="var(--mantine-color-green-6)" />
              <Text fw={600} size="sm" c="green.7">Alternativas recomendadas por tu entrenador</Text>
            </Group>
            <Stack gap="xs">
              {(alternatives || []).map((alt) => (
                <Paper
                  key={alt.id}
                  p="sm"
                  radius="md"
                  withBorder
                  style={{
                    cursor: "pointer",
                    backgroundColor: selectedExerciseId === alt.id ? "var(--mantine-color-green-light)" : undefined,
                    borderColor: selectedExerciseId === alt.id ? "var(--mantine-color-green-4)" : undefined,
                  }}
                  onClick={() => setSelectedExerciseId(alt.id)}
                >
                  <Group justify="space-between">
                    <Group gap="xs">
                      <ThemeIcon variant="light" color="green" size="sm" radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                      <Text fw={500}>{alt.name}</Text>
                    </Group>
                    <Group gap="xs">
                      {alt.muscle_groups?.slice(0, 2).map((m) => (
                        <Badge key={m} variant="light" size="xs" color="gray">{m}</Badge>
                      ))}
                      {alt.category && (
                        <Badge variant="light" size="xs">{alt.category}</Badge>
                      )}
                    </Group>
                  </Group>
                  {alt.notes && (
                    <Text size="xs" c="dimmed" mt={4}>{alt.notes}</Text>
                  )}
                </Paper>
              ))}
            </Stack>

            <Button
              variant="subtle"
              size="xs"
              mt="sm"
              onClick={() => setShowAllExercises(!showAllExercises)}
              fullWidth
            >
              {showAllExercises ? "Ocultar todos los ejercicios" : "Buscar en todos los ejercicios"}
            </Button>
          </Box>
        ) : null}

        {/* Búsqueda general - siempre visible si no hay alternativas, toggle si hay */}
        {(!hasAlternatives || showAllExercises) && (
          <>
            {hasAlternatives && (
              <Divider label="Todos los ejercicios" labelPosition="center" />
            )}
            <TextInput
              placeholder="Buscar ejercicio..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />

            <Text fw={500} size="sm">Elige el nuevo ejercicio:</Text>
            <ScrollArea h={220}>
              {isLoadingExercises ? (
                <Center py="xl">
                  <Loader size="sm" />
                </Center>
              ) : (
                <Stack gap="xs">
                  {exercises?.map((ex) => (
                    <Paper
                      key={ex.id}
                      p="sm"
                      radius="md"
                      withBorder
                      style={{
                        cursor: "pointer",
                        backgroundColor: selectedExerciseId === ex.id ? "var(--mantine-color-yellow-light)" : undefined,
                      }}
                      onClick={() => setSelectedExerciseId(ex.id)}
                    >
                      <Group justify="space-between">
                        <Text fw={500}>{ex.name}</Text>
                        <Group gap="xs">
                          {ex.category && (
                            <Badge variant="light" size="sm">{ex.category}</Badge>
                          )}
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                  {exercises?.length === 0 && (
                    <Text size="sm" c="dimmed" ta="center" py="md">No se encontraron ejercicios</Text>
                  )}
                </Stack>
              )}
            </ScrollArea>
          </>
        )}

        <Textarea
          label="Motivo del cambio (opcional)"
          placeholder="Ej: Lesión, máquina no disponible..."
          {...form.getInputProps("reason")}
          minRows={2}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="yellow"
            onClick={handleSwap}
            loading={updateMutation.isPending}
            disabled={!selectedExerciseId}
            leftSection={<IconExchange size={16} />}
          >
            Sustituir
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
  const { data: todayLogs } = useTodayWorkoutLogs();
  const logWorkoutMutation = useLogWorkoutDetailed();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [resultsModalOpened, { open: openResultsModal, close: closeResultsModal }] = useDisclosure(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [swapModalOpened, { open: openSwapModal, close: closeSwapModal }] = useDisclosure(false);
  const [swapTarget, setSwapTarget] = useState<{
    programId: string;
    dayIndex: number;
    blockIndex: number;
    exerciseIndex: number;
    currentExerciseName: string;
    currentExerciseId?: string;
  } | null>(null);

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
  
  // Flatten all exercises from today's blocks (with exercise_id for history/targets)
  const allExercises: ExerciseForLog[] = todayBlocks.flatMap((block: { exercises?: Array<{ exercise_id?: string; exercise?: { id?: string; name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; target_weight?: number; target_reps?: number }> }) => 
    (block.exercises || []).map(ex => ({
      exercise_id: ex.exercise_id || ex.exercise?.id || "",
      name: ex.exercise?.name || ex.name || "Ejercicio",
      sets: ex.sets || 3,
      reps: ex.reps || "10-12",
      target_weight: ex.target_weight,
      target_reps: ex.target_reps,
    }))
  );
  
  // Create week schedule from days template
  const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const weekSchedule = weekDays.map((dayName, index) => {
    const dayNum = index + 1;
    const dayData = templateDays.find((d: ProgramDay) => d.day === dayNum);
    
    if (dayData) {
      const exerciseCount = dayData.blocks?.reduce((sum: number, b: { exercises?: Array<unknown> }) => sum + (b.exercises?.length || 0), 0) || 0;
      const exercises = dayData.blocks?.flatMap((block: { exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }) => 
        (block.exercises || []).map(ex => ({
          name: ex.exercise?.name || ex.name || "Ejercicio",
          sets: ex.sets || 3,
          reps: ex.reps || "10-12",
          weight: ex.rest_seconds ? `${ex.rest_seconds}s descanso` : "",
          notes: ex.notes,
        }))
      ) || [];
      return {
        day: dayName,
        dayName: dayData.dayName || dayName,
        type: dayData.isRestDay ? "Descanso" : `${exerciseCount} ejercicios`,
        completed: false,
        isRestDay: dayData.isRestDay,
        blocks: dayData.blocks,
        exercises_list: exercises,
      };
    }
    
    // Retrocompatibilidad: solo mostrar bloques en el primer día
    if (index === 0 && legacyBlocks.length > 0) {
      const exercises = legacyBlocks.flatMap((block: { exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }) => 
        (block.exercises || []).map(ex => ({
          name: ex.exercise?.name || ex.name || "Ejercicio",
          sets: ex.sets || 3,
          reps: ex.reps || "10-12",
          weight: ex.rest_seconds ? `${ex.rest_seconds}s descanso` : "",
          notes: ex.notes,
        }))
      );
      return {
        day: dayName,
        dayName: dayName,
        type: `${legacyBlocks.reduce((sum: number, b: { exercises?: Array<unknown> }) => sum + (b.exercises?.length || 0), 0)} ejercicios`,
        completed: false,
        isRestDay: false,
        blocks: legacyBlocks,
        exercises_list: exercises,
      };
    }
    
    return {
      day: dayName,
      dayName: dayName,
      type: "Sin asignar",
      completed: false,
      isRestDay: true,
      blocks: [],
      exercises_list: [],
    };
  });

  // Check if today's workout has already been completed
  const isTodayCompleted = activeProgram && todayLogs?.completed_program_ids?.includes(activeProgram.id);

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
      completed: isTodayCompleted || false,
      exercises_list: allExercises,
      blocks: todayBlocks,
    } : null,
    isTodayRestDay,
    isTodayCompleted: isTodayCompleted || false,
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
    day_index: number;
    exercises: Array<{
      exercise_id: string;
      exercise_name: string;
      sets: Array<{
        set_number: number;
        weight_kg?: number;
        reps_completed?: number;
        duration_seconds?: number;
        completed?: boolean;
        notes?: string;
      }>;
      completed?: boolean;
      notes?: string;
    }>;
    duration_minutes?: number;
    perceived_effort?: number;
    notes?: string;
  }) => {
    await logWorkoutMutation.mutateAsync(logData);
    closeModal();

    const result = checkAchievements(logData.exercises, allExercises);
    setAchievements(result);
    openResultsModal();
  };

  const handleOpenSwap = (
    programId: string,
    dayIndex: number,
    blockIndex: number,
    exerciseIndex: number,
    currentExerciseName: string,
    currentExerciseId?: string
  ) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwapTarget({
      programId,
      dayIndex,
      blockIndex,
      exerciseIndex,
      currentExerciseName,
      currentExerciseId,
    });
    openSwapModal();
  };

  const todayDayIndex = templateDays.findIndex((d: ProgramDay) => d.day === todayDayNum);

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
                  <Group gap="xs">
                    <Title order={4}>{data.todayWorkout.name}</Title>
                    {data.isTodayCompleted && (
                      <Badge color="green" variant="filled" leftSection={<IconCheck size={12} />}>
                        Completado
                      </Badge>
                    )}
                  </Group>
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
                {data.isTodayCompleted ? (
                  <Button 
                    leftSection={<IconCheck size={16} />} 
                    color="green"
                    variant="light"
                    disabled
                  >
                    Completado Hoy
                  </Button>
                ) : (
                  <Button 
                    leftSection={<IconPlayerPlay size={16} />} 
                    color="yellow"
                    onClick={openModal}
                    disabled={!data.assignedProgram?.id}
                  >
                    Iniciar Entrenamiento
                  </Button>
                )}
              </Group>

              {/* Show blocks with exercises */}
              {data.todayWorkout.blocks?.map((block: { id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { id?: string; name?: string }; exercise_id?: string; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; duration_type?: string; target_weight?: number; target_reps?: number }> }, blockIndex: number) => (
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
                                <ActionIcon
                                  variant="subtle"
                                  color="yellow"
                                  size="sm"
                                  title="Sustituir ejercicio"
                                  onClick={handleOpenSwap(
                                    data.assignedProgram!.id,
                                    todayDayIndex >= 0 ? todayDayIndex : 0,
                                    blockIndex,
                                    exIndex,
                                    exName,
                                    exercise.exercise?.id || exercise.exercise_id
                                  )}
                                >
                                  <IconExchange size={16} />
                                </ActionIcon>
                                <Badge variant="light" color="blue">
                                  {exercise.sets || 3} x {exercise.reps || "10-12"}
                                  {exercise.duration_type === "seconds" ? " seg" : exercise.duration_type === "minutes" ? " min" : ""}
                                </Badge>
                                {exercise.target_weight && (
                                  <Badge variant="light" color="yellow">{exercise.target_weight}kg</Badge>
                                )}
                                {exercise.rest_seconds && (
                                  <Badge variant="light" color="gray">{exercise.rest_seconds}s desc.</Badge>
                                )}
                              </Group>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
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
                                  <Text size="sm" fw={500}>
                                    {exercise.duration_type === "seconds" ? "Segundos" : exercise.duration_type === "minutes" ? "Minutos" : "Repeticiones"}
                                  </Text>
                                </Group>
                                <Text size="lg" fw={700}>
                                  {exercise.reps || "10-12"}
                                  {exercise.duration_type === "seconds" ? " seg" : exercise.duration_type === "minutes" ? " min" : ""}
                                </Text>
                              </Paper>
                              <Paper p="sm" radius="md" withBorder>
                                <Group gap={4}>
                                  <IconClock size={14} />
                                  <Text size="sm" fw={500}>Descanso</Text>
                                </Group>
                                <Text size="lg" fw={700}>{exercise.rest_seconds || 60}s</Text>
                              </Paper>
                              {exercise.target_weight && (
                                <Paper p="sm" radius="md" withBorder style={{ border: "1px solid var(--mantine-color-yellow-3)" }}>
                                  <Group gap={4}>
                                    <IconBarbell size={14} color="var(--mantine-color-yellow-6)" />
                                    <Text size="sm" fw={500} c="yellow.7">Objetivo</Text>
                                  </Group>
                                  <Text size="lg" fw={700}>
                                    {exercise.target_weight}kg
                                    {exercise.target_reps ? ` x ${exercise.target_reps}` : ""}
                                  </Text>
                                </Paper>
                              )}
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
          <Stack gap="lg">
            {/* Week day cards */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              {data.weekSchedule.map((day, index) => {
                const isToday = index + 1 === todayDayNum;
                const isSelected = selectedDayIndex === index;
                return (
                  <Card 
                    key={index} 
                    shadow="sm" 
                    padding="md" 
                    radius="md" 
                    withBorder
                    style={{
                      borderColor: isSelected ? "var(--mantine-color-blue-5)" : isToday ? "var(--mantine-color-yellow-5)" : undefined,
                      backgroundColor: isSelected ? "var(--mantine-color-blue-0)" : isToday ? "var(--mantine-color-yellow-0)" : undefined,
                      cursor: day.isRestDay ? "default" : "pointer",
                    }}
                    onClick={() => !day.isRestDay && setSelectedDayIndex(isSelected ? null : index)}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Text fw={600}>{day.day}</Text>
                        {isToday && <Badge size="xs" color="yellow">Hoy</Badge>}
                        {isSelected && <Badge size="xs" color="blue">Seleccionado</Badge>}
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
                    {!day.isRestDay && (
                      <Text size="xs" c="dimmed" mt="xs">
                        Haz clic para ver detalles
                      </Text>
                    )}
                  </Card>
                );
              })}
            </SimpleGrid>

            {/* Selected day detail */}
            {selectedDayIndex !== null && data.weekSchedule[selectedDayIndex] && !data.weekSchedule[selectedDayIndex].isRestDay && (
              <Card shadow="sm" padding="lg" radius="lg" withBorder>
                <Group justify="space-between" mb="lg">
                  <Box>
                    <Title order={4}>{data.weekSchedule[selectedDayIndex].dayName || data.weekSchedule[selectedDayIndex].day}</Title>
                    <Group gap="md" mt="xs">
                      <Group gap={4}>
                        <IconClock size={14} />
                        <Text size="sm" c="dimmed">60 min</Text>
                      </Group>
                      <Group gap={4}>
                        <IconBarbell size={14} />
                        <Text size="sm" c="dimmed">{data.weekSchedule[selectedDayIndex].exercises_list?.length || 0} ejercicios</Text>
                      </Group>
                    </Group>
                  </Box>
                  <Button 
                    variant="light" 
                    color="gray"
                    size="sm"
                    onClick={() => setSelectedDayIndex(null)}
                  >
                    Cerrar
                  </Button>
                </Group>

                {/* Show blocks with exercises */}
                {data.weekSchedule[selectedDayIndex].blocks?.map((block: { id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }, blockIndex: number) => (
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
              </Card>
            )}
          </Stack>
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
        exercises={allExercises}
        programId={data.assignedProgram?.id || ""}
        dayIndex={todayDayIndex >= 0 ? todayDayIndex : 0}
      />

      {/* Modal para sustituir ejercicio */}
      {swapTarget && (
        <SwapExerciseModal
          opened={swapModalOpened}
          onClose={() => {
            closeSwapModal();
            setSwapTarget(null);
          }}
          programId={swapTarget.programId}
          dayIndex={swapTarget.dayIndex}
          blockIndex={swapTarget.blockIndex}
          exerciseIndex={swapTarget.exerciseIndex}
          currentExerciseName={swapTarget.currentExerciseName}
          currentExerciseId={swapTarget.currentExerciseId}
          onSuccess={() => setSwapTarget(null)}
        />
      )}

      {/* Modal de resultados tras registrar entrenamiento */}
      <Modal
        opened={resultsModalOpened}
        onClose={closeResultsModal}
        title=""
        size="md"
        radius="lg"
        centered
        withCloseButton={false}
      >
        <Stack align="center" gap="lg" py="lg">
          {achievements.length > 0 ? (
            <>
              {/* Celebration */}
              <Box style={{ fontSize: 64 }}>🎉</Box>
              <Title order={2} ta="center" style={{ color: "var(--nv-accent)" }}>
                ¡Enhorabuena!
              </Title>
              <Text ta="center" c="dimmed">
                Has alcanzado {achievements.length} objetivo
                {achievements.length > 1 ? "s" : ""} de tu entrenador
              </Text>
              {achievements.some((a) => a.exceeded) && (
                <Text size="lg" ta="center">
                  🏆 ¡Nuevo récord personal!
                </Text>
              )}
              <Stack gap="sm" w="100%">
                {achievements.map((a, i) => (
                  <Box
                    key={i}
                    p="md"
                    style={{
                      background: a.exceeded ? "rgba(16, 185, 129, 0.1)" : "rgba(231, 226, 71, 0.1)",
                      borderRadius: 12,
                      border: `1px solid ${a.exceeded ? "rgba(16, 185, 129, 0.3)" : "rgba(231, 226, 71, 0.3)"}`,
                    }}
                  >
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600} size="sm">
                          {a.exercise_name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Objetivo: {a.target_weight ? `${a.target_weight}kg` : ""}
                          {a.target_weight != null && a.target_reps != null ? " x " : ""}
                          {a.target_reps != null ? `${a.target_reps} reps` : ""}
                        </Text>
                      </Box>
                      <Box ta="right">
                        <Text
                          fw={700}
                          size="sm"
                          style={{ color: a.exceeded ? "var(--nv-success)" : "var(--nv-accent)" }}
                        >
                          {a.actual_weight != null ? `${a.actual_weight}kg` : ""}
                          {a.actual_weight != null && a.actual_reps != null ? " x " : ""}
                          {a.actual_reps != null ? `${a.actual_reps} reps` : ""}
                        </Text>
                        {a.exceeded && (
                          <Badge size="xs" color="green" variant="light">
                            Superado
                          </Badge>
                        )}
                      </Box>
                    </Group>
                  </Box>
                ))}
              </Stack>
            </>
          ) : (
            <>
              <Box style={{ fontSize: 48 }}>💪</Box>
              <Title order={3} ta="center">
                ¡Buen trabajo!
              </Title>
              <Text ta="center" c="dimmed">
                Has completado tu entrenamiento. ¡Sigue así!
              </Text>
            </>
          )}

          <Button
            onClick={closeResultsModal}
            radius="xl"
            fullWidth
            styles={{
              root: {
                background: "var(--nv-accent)",
                color: "var(--nv-dark)",
                fontWeight: 700,
              },
            }}
          >
            Continuar
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
