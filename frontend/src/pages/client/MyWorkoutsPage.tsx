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
  Paper,
  ThemeIcon,
  Tabs,
  ActionIcon,
  Center,
  Loader,
  Menu,
  Modal,
  NumberInput,
  Textarea,
  TextInput,
  ScrollArea,
  Select,
  Divider,
  Image,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { DateInput } from "@mantine/dates";
import { useState, useMemo } from "react";
import {
  IconArrowsExchange,
  IconBarbell,
  IconCalendarEvent,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconFilter,
  IconFlame,
  IconList,
  IconPlayerPlay,
  IconExchange,
  IconMoodEmpty,
  IconMoodSad,
  IconMoodSmile,
  IconSearch,
} from "@tabler/icons-react";
import { useMyWorkouts, useWorkoutHistory, useTodayWorkoutLogs, useClientExercises, useClientExerciseAlternatives, useUpdateProgramExercise, useLogWorkoutDetailed, useExerciseHistory, useSwapWorkoutDays } from "../../hooks/useClientPortal";
import { generateWorkoutProgramPDF } from "../../services/pdfGenerator";
import { useAuthStore } from "../../stores/auth";
import { FullPageDetail } from "../../components/common/FullPageDetail";
import { NativeBottomSheet } from "../../components/common/NativeBottomSheet";
import { DayCardMenu } from "../../components/common/DayCardMenu";
import { MasterDetailLayout } from "../../components/common/MasterDetailLayout";

function AllMyExercisesTab({ templateDays }: { templateDays: ProgramDay[] }) {
  const { data: allExercises } = useClientExercises({ limit: 500 });
  const [equipFilter, setEquipFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const programExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    templateDays.forEach((d) => {
      d.blocks?.forEach((b) => {
        b.exercises?.forEach((ex) => {
          const id = ex.exercise_id || ex.exercise?.id;
          if (id) ids.add(id);
        });
      });
    });
    return ids;
  }, [templateDays]);

  const exercisesInProgram = useMemo(() => {
    if (!allExercises) return [];
    return allExercises.filter((ex) => programExerciseIds.has(ex.id));
  }, [allExercises, programExerciseIds]);

  const equipmentOptions = useMemo(() => {
    const set = new Set<string>();
    exercisesInProgram.forEach((ex) => ex.equipment?.forEach((eq) => set.add(eq)));
    return Array.from(set).sort().map((e) => ({ value: e, label: e }));
  }, [exercisesInProgram]);

  const filtered = useMemo(() => {
    let list = exercisesInProgram;
    if (equipFilter) list = list.filter((ex) => ex.equipment?.includes(equipFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return list;
  }, [exercisesInProgram, equipFilter, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach((ex) => {
      const groups = ex.muscle_groups?.length ? ex.muscle_groups : ["Sin grupo"];
      groups.forEach((g) => {
        if (!map[g]) map[g] = [];
        map[g].push(ex);
      });
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const programSets = useMemo(() => {
    const map: Record<string, { sets: number; reps: string }> = {};
    templateDays.forEach((d) => {
      d.blocks?.forEach((b) => {
        b.exercises?.forEach((ex) => {
          const id = ex.exercise_id || ex.exercise?.id;
          if (id) map[id] = { sets: ex.sets || 3, reps: ex.reps || "—" };
        });
      });
    });
    return map;
  }, [templateDays]);

  return (
    <Stack gap="md">
      <Group gap="sm">
        <TextInput
          placeholder="Buscar ejercicio..."
          leftSection={<IconSearch size={14} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
          radius="md"
          style={{ flex: 1 }}
        />
        {equipmentOptions.length > 0 && (
          <Select
            placeholder="Filtrar por equipo"
            data={equipmentOptions}
            value={equipFilter}
            onChange={setEquipFilter}
            clearable
            size="sm"
            radius="md"
            leftSection={<IconFilter size={14} />}
            w={200}
          />
        )}
      </Group>

      <Text size="sm" c="dimmed">{filtered.length} ejercicios en tu programa</Text>

      {grouped.length > 0 ? (
        grouped.map(([group, exercises]) => (
          <Box key={group}>
            <Group gap="xs" mb="xs">
              <ThemeIcon variant="light" color="blue" size="md" radius="xl">
                <IconBarbell size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm" tt="capitalize">{group}</Text>
              <Badge variant="light" size="xs">{exercises.length}</Badge>
            </Group>
            <Stack gap={4}>
              {exercises.map((ex) => {
                const prog = programSets[ex.id];
                return (
                  <Paper key={ex.id} px="sm" py="xs" radius="sm" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                      <Box>
                        <Text size="sm" fw={500}>{ex.name}</Text>
                        <Group gap={4}>
                          {ex.equipment?.map((eq) => (
                            <Badge key={eq} variant="outline" size="xs" color="gray">{eq}</Badge>
                          ))}
                          {ex.category && <Badge variant="light" size="xs" color="teal">{ex.category}</Badge>}
                        </Group>
                      </Box>
                      {prog && (
                        <Badge variant="light" color="yellow" size="sm">
                          {prog.sets} × {prog.reps}
                        </Badge>
                      )}
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        ))
      ) : (
        <Paper p="lg" radius="md" ta="center">
          <Text c="dimmed">No hay ejercicios asignados</Text>
        </Paper>
      )}
    </Stack>
  );
}

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
  distance_km?: number;
  speed_kmh?: number;
  duration_minutes?: number;
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

function parseRepsFromString(reps?: string): number | undefined {
  if (!reps) return undefined;
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

const CARDIO_KEYWORDS = ["caminar", "correr", "trotar", "bicicleta", "elíptica", "nadar", "remo", "saltar", "cardio", "cinta", "andar"];

function isCardioExercise(name: string): boolean {
  const lower = name.toLowerCase();
  return CARDIO_KEYWORDS.some((kw) => lower.includes(kw));
}

function CompletionDot({ completed, onToggle }: { completed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: completed ? "var(--mantine-color-green-6)" : "var(--mantine-color-gray-1)",
        color: completed ? "#fff" : "var(--mantine-color-gray-5)",
        transition: "all 0.15s ease",
      }}
    >
      <IconCheck size={18} />
    </button>
  );
}

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
  const cardio = isCardioExercise(exercise.name);

  const updateSet = (index: number, updates: Partial<SetLog>) => {
    const newSets = [...setData];
    newSets[index] = { ...newSets[index], ...updates };
    onSetChange(newSets);
  };

  return (
    <Box style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }} pb="sm">
      <Group justify="space-between" mb={4} px={4}>
        <Text fw={700} size="sm">{exercise.name}</Text>
        {(exercise.target_weight != null || exercise.target_reps != null) && (
          <Badge variant="light" color="yellow" size="xs">
            Obj: {exercise.target_weight ?? "—"}kg x {exercise.target_reps ?? exercise.reps ?? "—"}
          </Badge>
        )}
      </Group>
      {lastSession && (
        <Box px={4} mb="xs">
          <Text size="xs" c="dimmed">
            Última: {((lastSession.exercise?.sets ?? []) as Array<{ weight_kg?: number; reps_completed?: number; duration_minutes?: number; distance_km?: number }>).map((s) =>
              cardio
                ? `${s.duration_minutes ?? "—"}min`
                : `${s.weight_kg ?? "—"}kg×${s.reps_completed ?? "—"}`
            ).join(" / ")}
          </Text>
        </Box>
      )}

      {/* Header row */}
      {!cardio && setData.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 36px", gap: 8, padding: "0 4px", marginBottom: 4 }}>
          <Text size="xs" c="dimmed" ta="center">Serie</Text>
          <Text size="xs" c="dimmed" ta="center">Peso (kg)</Text>
          <Text size="xs" c="dimmed" ta="center">Reps</Text>
          <span />
        </div>
      )}
      {cardio && setData.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr 36px", gap: 6, padding: "0 4px", marginBottom: 4 }}>
          <Text size="xs" c="dimmed" ta="center">#</Text>
          <Text size="xs" c="dimmed" ta="center">Min</Text>
          <Text size="xs" c="dimmed" ta="center">Km</Text>
          <Text size="xs" c="dimmed" ta="center">Km/h</Text>
          <span />
        </div>
      )}

      {setData.map((set, idx) =>
        cardio ? (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr 36px", gap: 6, alignItems: "center", padding: "6px 4px", borderBottom: idx < setData.length - 1 ? "1px solid var(--mantine-color-gray-1)" : "none" }}>
            <Text size="sm" fw={600} ta="center" c="dimmed">{idx + 1}</Text>
            <NumberInput
              placeholder="—"
              size="sm"
              value={set.duration_minutes ?? ""}
              onChange={(v) => updateSet(idx, { duration_minutes: v ? Number(v) : undefined })}
              min={0}
              max={600}
              hideControls
              decimalScale={0}
              styles={{ input: { textAlign: "center", fontWeight: 700, height: 44, borderRadius: 10, background: "var(--mantine-color-gray-0)", border: "none" } }}
            />
            <NumberInput
              placeholder="—"
              size="sm"
              value={set.distance_km ?? ""}
              onChange={(v) => updateSet(idx, { distance_km: v ? Number(v) : undefined })}
              min={0}
              max={100}
              hideControls
              decimalScale={2}
              styles={{ input: { textAlign: "center", fontWeight: 700, height: 44, borderRadius: 10, background: "var(--mantine-color-gray-0)", border: "none" } }}
            />
            <NumberInput
              placeholder="—"
              size="sm"
              value={set.speed_kmh ?? ""}
              onChange={(v) => updateSet(idx, { speed_kmh: v ? Number(v) : undefined })}
              min={0}
              max={50}
              hideControls
              decimalScale={1}
              styles={{ input: { textAlign: "center", fontWeight: 700, height: 44, borderRadius: 10, background: "var(--mantine-color-gray-0)", border: "none" } }}
            />
            <CompletionDot completed={set.completed} onToggle={() => updateSet(idx, { completed: !set.completed })} />
          </div>
        ) : (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 36px", gap: 8, alignItems: "center", padding: "6px 4px", borderBottom: idx < setData.length - 1 ? "1px solid var(--mantine-color-gray-1)" : "none" }}>
            <Text size="sm" fw={600} ta="center" c="dimmed">{idx + 1}</Text>
            <NumberInput
              placeholder="—"
              size="sm"
              value={set.weight_kg ?? ""}
              onChange={(v) => updateSet(idx, { weight_kg: v ? Number(v) : undefined })}
              min={0}
              max={500}
              hideControls
              styles={{ input: { textAlign: "center", fontWeight: 700, height: 44, borderRadius: 10, background: "var(--mantine-color-gray-0)", border: "none" } }}
            />
            <NumberInput
              placeholder="—"
              size="sm"
              value={set.reps_completed ?? ""}
              onChange={(v) => updateSet(idx, { reps_completed: v ? Number(v) : undefined })}
              min={0}
              max={200}
              hideControls
              styles={{ input: { textAlign: "center", fontWeight: 700, height: 44, borderRadius: 10, background: "var(--mantine-color-gray-0)", border: "none" } }}
            />
            <CompletionDot completed={set.completed} onToggle={() => updateSet(idx, { completed: !set.completed })} />
          </div>
        )
      )}
    </Box>
  );
}

function WorkoutSatisfactionSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const options = [
    { rating: 1, icon: IconMoodSad, label: "Mal", color: "red" },
    { rating: 2, icon: IconMoodEmpty, label: "Normal", color: "yellow" },
    { rating: 3, icon: IconMoodSmile, label: "Bien", color: "green" },
  ];
  return (
    <Box>
      <Text size="sm" fw={500} mb={4}>¿Cómo te ha ido el entrenamiento?</Text>
      <Group gap="xs">
        {options.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.rating;
          return (
            <Button
              key={opt.rating}
              variant={selected ? "filled" : "light"}
              color={opt.color}
              size="sm"
              leftSection={<Icon size={18} />}
              onClick={() => onChange(selected ? null : opt.rating)}
            >
              {opt.label}
            </Button>
          );
        })}
      </Group>
    </Box>
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
        distance_km?: number;
        speed_kmh?: number;
        duration_minutes?: number;
        completed?: boolean;
        notes?: string;
      }>;
      completed?: boolean;
      notes?: string;
    }>;
    duration_minutes?: number;
    perceived_effort?: number;
    satisfaction_rating?: number;
    notes?: string;
  }) => void;
  isLoading: boolean;
  workoutName: string;
  exercises: ExerciseForLog[];
  programId: string;
  dayIndex: number;
}) {
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetLog[]>>(() => {
    const initial: Record<string, SetLog[]> = {};
    exercises.forEach((e) => {
      const repsValue = e.target_reps ?? parseRepsFromString(e.reps);
      initial[e.exercise_id] = Array.from({ length: e.sets }, (_, i) => ({
        set_number: i + 1,
        weight_kg: e.target_weight ?? undefined,
        reps_completed: repsValue,
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
          distance_km: s.distance_km,
          speed_kmh: s.speed_kmh,
          duration_minutes: s.duration_minutes,
          completed: s.completed,
          notes: s.notes,
        })),
        completed: true,
      })),
      duration_minutes: form.values.duration_minutes,
      perceived_effort: form.values.perceived_effort,
      satisfaction_rating: satisfactionRating ?? undefined,
      notes: form.values.notes,
    });
    form.reset();
    setSatisfactionRating(null);
    setExerciseSets(() => {
      const initial: Record<string, SetLog[]> = {};
      exercises.forEach((e) => {
        const repsValue = e.target_reps ?? parseRepsFromString(e.reps);
        initial[e.exercise_id] = Array.from({ length: e.sets }, (_, i) => ({
          set_number: i + 1,
          weight_kg: e.target_weight ?? undefined,
          reps_completed: repsValue,
          completed: true,
        }));
      });
      return initial;
    });
  };

  const isMobileView = useMediaQuery("(max-width: 768px)");

  if (!opened) return null;

  const exerciseList = (
    <Stack gap="md" px="sm">
      {exercises.map((exercise) => (
        <ExerciseLogRow
          key={exercise.exercise_id}
          exercise={exercise}
          setData={exerciseSets[exercise.exercise_id] || []}
          onSetChange={(sets) => setExerciseSets((prev) => ({ ...prev, [exercise.exercise_id]: sets }))}
        />
      ))}
    </Stack>
  );

  const summaryPanel = (
    <Box px="md">
      <SimpleGrid cols={2} spacing="sm">
        <NumberInput
          label="Duración (min)"
          {...form.getInputProps("duration_minutes")}
          min={1}
          max={300}
          leftSection={<IconClock size={16} />}
          size="sm"
          styles={{ input: { height: 44, borderRadius: 10 } }}
        />
        <NumberInput
          label="Esfuerzo (1-10)"
          {...form.getInputProps("perceived_effort")}
          min={1}
          max={10}
          leftSection={<IconFlame size={16} />}
          size="sm"
          styles={{ input: { height: 44, borderRadius: 10 } }}
        />
      </SimpleGrid>

      <Textarea
        label="Notas (opcional)"
        placeholder="¿Cómo te sentiste?"
        {...form.getInputProps("notes")}
        minRows={2}
        mt="sm"
        size="sm"
        styles={{ input: { borderRadius: 10 } }}
      />

      <Box mt="md">
        <WorkoutSatisfactionSelector value={satisfactionRating} onChange={setSatisfactionRating} />
      </Box>
    </Box>
  );

  const submitButton = (
    <Button
      color="yellow"
      onClick={handleSubmit}
      loading={isLoading}
      leftSection={<IconCheck size={18} />}
      fullWidth
      size="lg"
      radius="xl"
      styles={{ root: { height: 48, fontWeight: 700 } }}
    >
      Completar Entrenamiento
    </Button>
  );

  if (!isMobileView) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="xs">
            <Text fw={700}>{workoutName}</Text>
            <Badge color="yellow" variant="light" size="sm">
              {exercises.length} ejercicios
            </Badge>
          </Group>
        }
        size="xl"
        radius="lg"
        centered
        styles={{
          body: { padding: 0 },
          header: { borderBottom: "1px solid var(--mantine-color-gray-2)", padding: "12px 20px" },
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", minHeight: 500, maxHeight: "70vh" }}>
          <ScrollArea style={{ borderRight: "1px solid var(--mantine-color-gray-2)" }} p="md">
            {exerciseList}
          </ScrollArea>
          <Box style={{ display: "flex", flexDirection: "column" }}>
            <ScrollArea style={{ flex: 1 }} p="md">
              {summaryPanel}
            </ScrollArea>
            <Box p="md" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
              {submitButton}
            </Box>
          </Box>
        </div>
      </Modal>
    );
  }

  return (
    <Box
      pos="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      style={{ zIndex: 300, background: "var(--mantine-color-gray-0)", display: "flex", flexDirection: "column" }}
    >
      <Box
        pos="sticky"
        top={0}
        style={{
          zIndex: 10,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          flexShrink: 0,
        }}
        px="md"
        py="sm"
      >
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ActionIcon variant="subtle" size="lg" onClick={onClose} radius="xl">
              <IconChevronRight size={22} style={{ transform: "rotate(180deg)" }} />
            </ActionIcon>
            <Box>
              <Text fw={700} size="sm" lineClamp={1}>{workoutName}</Text>
              <Text size="xs" c="dimmed">{exercises.length} ejercicios</Text>
            </Box>
          </Group>
          <Badge color="yellow" variant="light" size="sm">
            <IconFlame size={12} style={{ marginRight: 4 }} />
            {form.values.duration_minutes} min
          </Badge>
        </Group>
      </Box>

      <Box style={{ flex: 1, overflowY: "auto" }} px={0} py="sm">
        {exerciseList}
        <Box mt="lg">{summaryPanel}</Box>
      </Box>

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
        {submitButton}
      </Box>
    </Box>
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
    <NativeBottomSheet
      opened={opened}
      onClose={() => { onClose(); setShowAllExercises(false); setSelectedExerciseId(null); }}
      title="Sustituir ejercicio"
      subtitle={currentExerciseName}
      footer={
        <Button
          color="yellow"
          onClick={handleSwap}
          loading={updateMutation.isPending}
          disabled={!selectedExerciseId}
          leftSection={<IconExchange size={18} />}
          fullWidth
          size="lg"
          radius="xl"
          styles={{ root: { height: 48, fontWeight: 700 } }}
        >
          Sustituir
        </Button>
      }
    >
      <Stack gap="md">

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

      </Stack>
    </NativeBottomSheet>
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
      exercise_id?: string;
      exercise?: { id?: string; name?: string; image_url?: string; video_url?: string; description?: string; muscle_groups?: string[] };
      name?: string;
      sets?: number;
      reps?: string;
      rest_seconds?: number;
      notes?: string;
      video_url?: string;
    }>;
  }>;
  notes?: string;
}

function WeekDayDetail({
  schedule,
  weekDayName,
  onImageClick,
}: {
  schedule: { dayName?: string; exercises_list?: Array<{ name: string; sets: number; reps: string }>; blocks?: Array<{ id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { name?: string; image_url?: string; video_url?: string; description?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; video_url?: string }> }> };
  weekDayName: string;
  onImageClick: (url: string, name: string) => void;
}) {
  return (
    <>
      <Box px="md" mb="sm">
        <Text fw={700} size="lg">{schedule.dayName || weekDayName}</Text>
        <Group gap="md" mt={4}>
          <Group gap={4}>
            <IconClock size={14} />
            <Text size="xs" c="dimmed">~60 min</Text>
          </Group>
          <Group gap={4}>
            <IconBarbell size={14} />
            <Text size="xs" c="dimmed">{schedule.exercises_list?.length || 0} ejercicios</Text>
          </Group>
        </Group>
      </Box>

      {schedule.blocks?.map((block: { id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { name?: string; image_url?: string; video_url?: string; description?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; video_url?: string }> }, blockIndex: number) => (
        <Box key={block.id || blockIndex} mb="md">
          <Group gap="xs" px="md" mb="xs">
            <Badge
              color={block.type === "warmup" ? "orange" : block.type === "cooldown" ? "blue" : "yellow"}
              variant="light"
              size="sm"
            >
              {block.type === "warmup" ? "Calentamiento" : block.type === "cooldown" ? "Enfriamiento" : "Principal"}
            </Badge>
            <Text fw={600} size="sm">{block.name}</Text>
          </Group>

          {/* Edge-to-edge exercise rows */}
          {block.exercises?.map((exercise, exIndex) => {
            const exName = exercise.exercise?.name || exercise.name || "Ejercicio";
            const exImage2 = exercise.exercise?.image_url;
            return (
              <Box
                key={exIndex}
                px="md"
                py="sm"
                style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
              >
                <Group gap="sm" wrap="nowrap">
                  {exImage2 ? (
                    <Image src={exImage2} alt={exName} w={44} h={44} fit="cover" radius="lg" onClick={() => onImageClick(exImage2, exName)} style={{ cursor: "pointer", flexShrink: 0 }} />
                  ) : (
                    <ThemeIcon variant="light" color="gray" size={44} radius="lg" style={{ flexShrink: 0 }}>
                      <IconBarbell size={20} />
                    </ThemeIcon>
                  )}
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} size="sm" lineClamp={1}>{exName}</Text>
                    <Group gap={6} mt={2}>
                      <Badge variant="light" color="blue" size="xs">{exercise.sets || 3} x {exercise.reps || "10-12"}</Badge>
                      <Badge variant="light" color="gray" size="xs">{exercise.rest_seconds || 60}s</Badge>
                    </Group>
                    {exercise.notes && <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{exercise.notes}</Text>}
                  </Box>
                  {(exercise.video_url || exercise.exercise?.video_url) && (
                    <ActionIcon
                      component="a"
                      href={exercise.video_url || exercise.exercise?.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="light"
                      color="red"
                      size="lg"
                      radius="xl"
                      style={{ flexShrink: 0 }}
                    >
                      <IconPlayerPlay size={18} />
                    </ActionIcon>
                  )}
                </Group>
              </Box>
            );
          })}
        </Box>
      ))}
    </>
  );
}

export function MyWorkoutsPage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isMdUp = useMediaQuery("(min-width: 1024px)");
  const [activeTab, setActiveTab] = useState<string | null>("today");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: workouts, isLoading: isLoadingWorkouts } = useMyWorkouts();
  const { data: history } = useWorkoutHistory(10);
  const { data: todayLogs } = useTodayWorkoutLogs();
  const logWorkoutMutation = useLogWorkoutDetailed();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [resultsModalOpened, { open: openResultsModal, close: closeResultsModal }] = useDisclosure(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [swapModalOpened, { open: openSwapModal, close: closeSwapModal }] = useDisclosure(false);
  const [enlargedImage, setEnlargedImage] = useState<{url: string, name: string} | null>(null);
  const [programViewMode, setProgramViewMode] = useState<string>("executed");
  const swapWorkoutDaysMutation = useSwapWorkoutDays();
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
  
  const executedTemplateSrc = (activeProgram as any)?.executed_template || activeProgram?.template;
  const originalTemplateSrc = activeProgram?.template;

  const executedTemplateDays: ProgramDay[] = executedTemplateSrc?.days || [];
  const originalTemplateDays: ProgramDay[] = originalTemplateSrc?.days || [];

  // Obtener días del template (nueva estructura) o usar retrocompatibilidad
  const templateDays: ProgramDay[] = executedTemplateDays;
  const legacyBlocks: ProgramDay["blocks"] = (executedTemplateSrc?.blocks || []) as ProgramDay["blocks"];
  
  // Obtener el entrenamiento de hoy
  const todayWorkoutDay = templateDays.find((d: ProgramDay) => d.day === todayDayNum);
  const todayBlocks = todayWorkoutDay?.blocks || (todayDayNum === 1 ? legacyBlocks : []);
  const isTodayRestDay = todayWorkoutDay?.isRestDay ?? false;
  
  // Flatten all exercises from today's blocks (with exercise_id for history/targets)
  const allExercises: ExerciseForLog[] = todayBlocks.flatMap((block: { exercises?: Array<{ exercise_id?: string; exercise?: { id?: string; name?: string; image_url?: string; video_url?: string; description?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; video_url?: string; target_weight?: number; target_reps?: number }> }) => 
    (block.exercises || []).map(ex => ({
      exercise_id: ex.exercise_id || ex.exercise?.id || "",
      name: ex.exercise?.name || ex.name || "Ejercicio",
      sets: ex.sets || 3,
      reps: ex.reps || "10-12",
      target_weight: ex.target_weight,
      target_reps: ex.target_reps,
    }))
  );
  
  const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const buildScheduleFromDays = (days: ProgramDay[], fallbackBlocks: ProgramDay["blocks"]) => {
    return weekDays.map((dayName, index) => {
      const dayNum = index + 1;
      const dayData = days.find((d: ProgramDay) => d.day === dayNum);
      if (dayData) {
        const exerciseCount = dayData.blocks?.reduce((sum: number, b) => sum + (b.exercises?.length || 0), 0) || 0;
        const exercises = dayData.blocks?.flatMap((block) =>
          (block.exercises || []).map(ex => ({
            name: ex.exercise?.name || ex.name || "Ejercicio",
            sets: ex.sets || 3,
            reps: ex.reps || "10-12",
            weight: ex.rest_seconds ? `${ex.rest_seconds}s descanso` : "",
            notes: ex.notes,
          }))
        ) || [];
        return { day: dayName, dayName: dayData.dayName || dayName, dayNum, type: dayData.isRestDay ? "Descanso" : `${exerciseCount} ejercicios`, completed: false, isRestDay: dayData.isRestDay, blocks: dayData.blocks, exercises_list: exercises };
      }
      if (index === 0 && fallbackBlocks.length > 0) {
        const exercises = fallbackBlocks.flatMap((block) =>
          (block.exercises || []).map(ex => ({ name: ex.exercise?.name || ex.name || "Ejercicio", sets: ex.sets || 3, reps: ex.reps || "10-12", weight: ex.rest_seconds ? `${ex.rest_seconds}s descanso` : "", notes: ex.notes }))
        );
        return { day: dayName, dayName, dayNum, type: `${fallbackBlocks.reduce((sum, b) => sum + (b.exercises?.length || 0), 0)} ejercicios`, completed: false, isRestDay: false, blocks: fallbackBlocks, exercises_list: exercises };
      }
      return { day: dayName, dayName, dayNum, type: "Sin asignar", completed: false, isRestDay: true, blocks: [] as ProgramDay["blocks"], exercises_list: [] as Array<{ name: string; sets: number; reps: string }> };
    });
  };

  const weekSchedule = buildScheduleFromDays(executedTemplateDays, legacyBlocks);
  const originalLegacyBlocks = (originalTemplateSrc?.blocks || []) as ProgramDay["blocks"];
  const weekScheduleOriginal = buildScheduleFromDays(originalTemplateDays, originalLegacyBlocks);

  const displaySchedule = programViewMode === "original" ? weekScheduleOriginal : weekSchedule;

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
    history: history?.map(h => {
      const d = new Date(h.created_at);
      return {
        date: !isNaN(d.getTime()) ? d.toLocaleDateString('es-ES') : "Sin fecha",
        name: (h.log as Record<string, unknown>)?.workout_name as string || "Entrenamiento",
        duration: `${(h.log as Record<string, unknown>)?.duration_minutes || 60} min`,
        calories: (h.log as Record<string, unknown>)?.calories_burned as number || 0,
      };
    }) || [],
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
    satisfaction_rating?: number;
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

  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const isToday = selectedDateStr === new Date().toISOString().split("T")[0];

  return (
    <Box p="xl" maw={1280} mx="auto">
      <Box mb="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2}>Mis Entrenamientos</Title>
            <Text c="dimmed">Tu programa personalizado y progreso</Text>
          </Box>
          {data.assignedProgram?.id && (
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              size="sm"
              onClick={async () => {
                const ws = useAuthStore.getState().currentWorkspace;
                await generateWorkoutProgramPDF(data.assignedProgram as any, {
                  workspaceName: (ws as any)?.name || "Trackfiz",
                  branding: (ws as any)?.branding,
                  workspaceLogo: (ws as any)?.logo_url,
                });
              }}
            >
              Descargar entrenamiento
            </Button>
          )}
        </Group>
      </Box>

      {!data.assignedProgram?.id && (
        <Paper p="md" radius="lg" mb="xl" style={{ background: "var(--mantine-color-gray-light)" }}>
          <Text ta="center" c="dimmed">
            No tienes un programa de entrenamiento asignado. Contacta con tu entrenador.
          </Text>
        </Paper>
      )}

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "today", label: "Registrar entrenamiento" },
            { value: "week", label: "Tu programa" },
            { value: "history", label: "Historial" },
            { value: "exercises", label: "Todos mis ejercicios" },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
        {!isMobile && (
        <Tabs.List mb="lg">
          <Tabs.Tab value="today" leftSection={<IconBarbell size={16} />}>
            Registrar entrenamiento
          </Tabs.Tab>
          <Tabs.Tab value="week" leftSection={<IconCalendarEvent size={16} />}>
            Tu programa
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconClock size={16} />}>
            Historial
          </Tabs.Tab>
          <Tabs.Tab value="exercises" leftSection={<IconList size={16} />}>
            Todos mis ejercicios
          </Tabs.Tab>
        </Tabs.List>
        )}

        <Tabs.Panel value="today">
          <Card shadow="sm" padding="md" radius="lg" withBorder mb="lg">
            <Group gap="md" align="flex-end">
              <DateInput
                label="Fecha de registro"
                value={selectedDate}
                onChange={(d) => d && setSelectedDate(new Date(d))}
                maxDate={new Date()}
                locale="es"
                valueFormat="DD/MM/YYYY"
                style={{ flex: 1, maxWidth: 220 }}
              />
              {!isToday && (
                <Button variant="subtle" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Volver a hoy
                </Button>
              )}
              <Text size="sm" c="dimmed">
                {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </Text>
            </Group>
          </Card>

          {data.isTodayRestDay && (
            <Box ta="center" py="xl">
              <Text size="xl" mb="sm">🛌</Text>
              <Text fw={700} size="lg">Hoy es día de descanso</Text>
              <Text c="dimmed" size="sm" mt="xs">
                Tu cuerpo necesita recuperarse. ¡Aprovecha para descansar!
              </Text>
            </Box>
          )}
          
          {!data.isTodayRestDay && data.todayWorkout && (
            <Box>
              {/* Workout header */}
              <Box px="md" mb="md">
                <Group gap="xs" mb={4}>
                  <Text fw={700} size="lg">{data.todayWorkout.name}</Text>
                  {data.isTodayCompleted && (
                    <Badge color="green" variant="filled" size="sm" leftSection={<IconCheck size={10} />}>
                      Completado
                    </Badge>
                  )}
                </Group>
                <Group gap="md">
                  <Group gap={4}>
                    <IconClock size={14} />
                    <Text size="xs" c="dimmed">{data.todayWorkout.duration}</Text>
                  </Group>
                  <Group gap={4}>
                    <IconBarbell size={14} />
                    <Text size="xs" c="dimmed">{data.todayWorkout.exercises || data.todayWorkout.exercises_list?.length} ejercicios</Text>
                  </Group>
                </Group>
              </Box>

              {/* Edge-to-edge exercise list */}
              {data.todayWorkout.blocks?.map((block: { id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { id?: string; name?: string; image_url?: string; video_url?: string; description?: string }; exercise_id?: string; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; video_url?: string; duration_type?: string; target_weight?: number; target_reps?: number }> }, blockIndex: number) => (
                <Box key={block.id || blockIndex} mb="md">
                  <Group gap="xs" px="md" mb="xs">
                    <Badge 
                      color={block.type === 'warmup' ? 'orange' : block.type === 'cooldown' ? 'blue' : 'yellow'} 
                      variant="light"
                      size="sm"
                    >
                      {block.type === 'warmup' ? 'Calentamiento' : block.type === 'cooldown' ? 'Enfriamiento' : 'Principal'}
                    </Badge>
                    <Text fw={600} size="sm">{block.name}</Text>
                    <Text size="xs" c="dimmed">{block.exercises?.length || 0} ej.</Text>
                  </Group>

                  {block.exercises?.map((exercise, exIndex) => {
                    const exName = exercise.exercise?.name || exercise.name || "Ejercicio";
                    const exImage = exercise.exercise?.image_url;
                    return (
                      <Box
                        key={exIndex}
                        px="md"
                        py="sm"
                        style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
                      >
                        <Group gap="sm" wrap="nowrap" align="center">
                          {exImage ? (
                            <Image src={exImage} alt={exName} w={44} h={44} fit="cover" radius="lg" onClick={() => setEnlargedImage({url: exImage, name: exName})} style={{ cursor: "pointer", flexShrink: 0 }} />
                          ) : (
                            <ThemeIcon variant="light" color="gray" size={44} radius="lg" style={{ flexShrink: 0 }}>
                              <IconBarbell size={20} />
                            </ThemeIcon>
                          )}
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text fw={600} size="sm" lineClamp={1}>{exName}</Text>
                            <Group gap={6} mt={2} wrap="wrap">
                              <Badge variant="light" color="blue" size="xs">
                                {exercise.sets || 3} x {exercise.reps || "10-12"}
                                {exercise.duration_type === "seconds" ? " seg" : exercise.duration_type === "minutes" ? " min" : ""}
                              </Badge>
                              {exercise.target_weight && (
                                <Badge variant="light" color="yellow" size="xs">{exercise.target_weight}kg</Badge>
                              )}
                              {exercise.rest_seconds && (
                                <Badge variant="light" color="gray" size="xs">{exercise.rest_seconds}s</Badge>
                              )}
                            </Group>
                            {exercise.notes && <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{exercise.notes}</Text>}
                          </Box>
                          <Group gap={4} style={{ flexShrink: 0 }}>
                            {(exercise.video_url || exercise.exercise?.video_url) && (
                              <ActionIcon
                                component="a"
                                href={exercise.video_url || exercise.exercise?.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="light"
                                color="red"
                                size="lg"
                                radius="xl"
                              >
                                <IconPlayerPlay size={18} />
                              </ActionIcon>
                            )}
                            <ActionIcon
                              variant="subtle"
                              color="yellow"
                              size="lg"
                              radius="xl"
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
                              <IconExchange size={18} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Box>
                    );
                  })}
                </Box>
              ))}
              
              {/* Fallback: flat exercise list */}
              {(!data.todayWorkout.blocks || data.todayWorkout.blocks.length === 0) && data.todayWorkout.exercises_list?.length > 0 && (
                <>
                  {data.todayWorkout.exercises_list.map((exercise: { name: string; sets: number; reps: string; weight?: string; completed?: boolean }, index: number) => (
                    <Box
                      key={index}
                      px="md"
                      py="sm"
                      style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
                    >
                      <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon variant="light" color={exercise.completed ? "green" : "gray"} size={44} radius="lg" style={{ flexShrink: 0 }}>
                          {exercise.completed ? <IconCheck size={20} /> : <IconBarbell size={20} />}
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} size="sm" lineClamp={1}>{exercise.name}</Text>
                          <Group gap={6} mt={2}>
                            <Badge variant="light" color="blue" size="xs">{exercise.sets}x{exercise.reps}</Badge>
                            {exercise.weight && <Badge variant="light" color="gray" size="xs">{exercise.weight}</Badge>}
                          </Group>
                        </Box>
                      </Group>
                    </Box>
                  ))}
                </>
              )}

              {/* CTA Button - prominent, fat-finger friendly */}
              <Box px="md" mt="lg" mb="md">
                {data.isTodayCompleted ? (
                  <Button 
                    leftSection={<IconCheck size={18} />} 
                    color="green"
                    variant="light"
                    fullWidth
                    size="lg"
                    radius="xl"
                    disabled
                    styles={{ root: { height: 48 } }}
                  >
                    Entrenamiento Completado
                  </Button>
                ) : (
                  <Button 
                    leftSection={<IconPlayerPlay size={18} />} 
                    color="yellow"
                    onClick={openModal}
                    disabled={!data.assignedProgram?.id}
                    fullWidth
                    size="lg"
                    radius="xl"
                    styles={{ root: { height: 48, fontWeight: 700 } }}
                  >
                    Iniciar Entrenamiento
                  </Button>
                )}
              </Box>
            </Box>
          )}
          
          {!data.isTodayRestDay && !data.todayWorkout && data.assignedProgram?.id && (
            <Box ta="center" py="xl">
              <Text c="dimmed">No hay entrenamiento asignado para hoy.</Text>
            </Box>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="week">
          <Group justify="space-between" mb="md">
            <Select
              value={programViewMode}
              onChange={(v) => setProgramViewMode(v || "executed")}
              data={[
                { value: "executed", label: "Programa ejecutado" },
                { value: "original", label: "Programa asignado" },
              ]}
              size="xs"
              radius="md"
              w={200}
            />
          </Group>
          <MasterDetailLayout
            hasSelection={selectedDayIndex !== null && !displaySchedule[selectedDayIndex]?.isRestDay}
            emptyMessage="Selecciona un día de entrenamiento para ver los ejercicios"
            master={
              <>
                {displaySchedule.map((day, index) => {
                  const dayNum = index + 1;
                  const isToday = dayNum === todayDayNum;
                  const exCount = day.exercises_list?.length || 0;
                  return (
                    <DayCardMenu
                      key={index}
                      dayName={weekDays[index]}
                      isToday={isToday}
                      isSelected={selectedDayIndex === index}
                      isRestDay={day.isRestDay}
                      onClick={() => setSelectedDayIndex(index)}
                      badge={
                        <>
                          {day.completed && (
                            <Badge color="green" variant="light" size="xs" leftSection={<IconCheck size={10} />}>
                              Completado
                            </Badge>
                          )}
                          {programViewMode !== "original" && !day.isRestDay && activeProgram && (
                            <Menu shadow="md" position="bottom-end" withinPortal>
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray" size="xs" onClick={(e) => e.stopPropagation()}>
                                  <IconArrowsExchange size={12} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Label>Intercambiar día con</Menu.Label>
                                {weekDays.map((label, idx) => {
                                  const targetDayNum = idx + 1;
                                  if (targetDayNum === dayNum) return null;
                                  return (
                                    <Menu.Item
                                      key={idx}
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        swapWorkoutDaysMutation.mutate({ programId: activeProgram.id, sourceDay: dayNum, targetDay: targetDayNum });
                                      }}
                                    >
                                      {label}
                                    </Menu.Item>
                                  );
                                })}
                              </Menu.Dropdown>
                            </Menu>
                          )}
                        </>
                      }
                      summary={
                        <Text size="xs" c="dimmed">
                          {day.isRestDay ? "Descanso" : `${day.type} - ${exCount} ejercicios`}
                        </Text>
                      }
                    />
                  );
                })}

                {/* FullPageDetail for mobile only */}
                {!isMdUp && selectedDayIndex !== null && displaySchedule[selectedDayIndex] && !displaySchedule[selectedDayIndex].isRestDay && (
                  <FullPageDetail
                    opened={true}
                    onClose={() => setSelectedDayIndex(null)}
                    title={displaySchedule[selectedDayIndex].dayName || weekDays[selectedDayIndex]}
                    subtitle={`${displaySchedule[selectedDayIndex].exercises_list?.length || 0} ejercicios`}
                  >
                    <WeekDayDetail
                      schedule={displaySchedule[selectedDayIndex]}
                      weekDayName={weekDays[selectedDayIndex]}
                      onImageClick={(url, name) => setEnlargedImage({ url, name })}
                    />
                  </FullPageDetail>
                )}
              </>
            }
            detail={
              selectedDayIndex !== null && displaySchedule[selectedDayIndex] && !displaySchedule[selectedDayIndex].isRestDay ? (
                <WeekDayDetail
                  schedule={displaySchedule[selectedDayIndex]}
                  weekDayName={displaySchedule[selectedDayIndex].dayName || weekDays[selectedDayIndex]}
                  onImageClick={(url, name) => setEnlargedImage({ url, name })}
                />
              ) : null
            }
          />
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Stack gap="sm">
            {data.history.length > 0 ? (
              data.history.map((workout, index) => {
                const logData = (history || [])[index]?.log as Record<string, unknown> | undefined;
                const exercises = (logData?.exercises || []) as Array<{
                  exercise_name?: string;
                  exercise_id?: string;
                  sets?: Array<{ weight_kg?: number; reps_completed?: number; duration_minutes?: number; distance_km?: number; completed?: boolean }>;
                }>;
                const satisfaction = logData?.satisfaction_rating as number | undefined;
                const effort = logData?.perceived_effort as number | undefined;

                const programDay = templateDays.find((d: ProgramDay) => {
                  const dayIdx = logData?.day_index as number | undefined;
                  return dayIdx !== undefined && d.day === dayIdx + 1;
                });
                const programExercises = programDay?.blocks?.flatMap((b: { exercises?: Array<{ exercise?: { name?: string }; sets?: number; reps?: string; target_weight?: number; target_reps?: number }> }) =>
                  (b.exercises || []).map(ex => ({ name: ex.exercise?.name || "", sets: ex.sets || 3, reps: ex.reps || "", target_weight: ex.target_weight, target_reps: ex.target_reps }))
                ) || [];

                return (
                  <Card key={index} shadow="sm" padding="md" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Box>
                        <Text fw={600}>{workout.name}</Text>
                        <Text size="sm" c="dimmed">{workout.date}</Text>
                      </Box>
                      <Group gap="xs">
                        <Badge variant="light" color="gray" size="sm" leftSection={<IconClock size={10} />}>{workout.duration}</Badge>
                        {effort && <Badge variant="light" color="orange" size="sm" leftSection={<IconFlame size={10} />}>Esfuerzo: {effort}/10</Badge>}
                        {satisfaction && <Text size="sm">{satisfaction === 1 ? "😞" : satisfaction === 2 ? "😐" : "😊"}</Text>}
                      </Group>
                    </Group>

                    {exercises.length > 0 && (
                      <Stack gap="xs" mt="xs">
                        {exercises.map((ex, exIdx) => {
                          const programEx = programExercises.find((pe: { name: string }) => pe.name === ex.exercise_name);
                          const bestSet = (ex.sets || []).reduce<{ weight_kg?: number; reps_completed?: number } | null>((best, s) => {
                            if (!best) return s;
                            if ((s.weight_kg || 0) > (best.weight_kg || 0)) return s;
                            return best;
                          }, null);
                          const diffWeight = programEx?.target_weight && bestSet?.weight_kg != null
                            ? bestSet.weight_kg - programEx.target_weight
                            : null;

                          return (
                            <Box key={exIdx} px="sm" py="xs" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
                              <Group justify="space-between" wrap="nowrap">
                                <Text size="sm" fw={500}>{ex.exercise_name}</Text>
                                <Group gap={4}>
                                  {(ex.sets || []).map((s, si) => (
                                    <Badge key={si} size="xs" variant={s.completed ? "light" : "outline"} color={s.completed ? "green" : "gray"}>
                                      {s.weight_kg ?? "—"}kg×{s.reps_completed ?? "—"}
                                    </Badge>
                                  ))}
                                </Group>
                              </Group>
                              {diffWeight !== null && Math.abs(diffWeight) >= 0.5 && (
                                <Group gap={4} mt={2}>
                                  <Badge size="xs" variant="light" color={diffWeight > 0 ? "green" : "red"}>
                                    {diffWeight > 0 ? "+" : ""}{diffWeight}kg vs plan
                                  </Badge>
                                </Group>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Card>
                );
              })
            ) : (
              <Paper p="lg" radius="md" ta="center">
                <Text c="dimmed">No hay entrenamientos registrados aún</Text>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="exercises">
          <AllMyExercisesTab templateDays={originalTemplateDays} />
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

      {/* Image Enlargement Modal */}
      <Modal opened={!!enlargedImage} onClose={() => setEnlargedImage(null)} size="lg" title={enlargedImage?.name} centered>
        {enlargedImage && <Image src={enlargedImage.url} alt={enlargedImage.name} fit="contain" mah={500} />}
      </Modal>

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
