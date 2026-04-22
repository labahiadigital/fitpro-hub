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
import { useNavigate } from "react-router-dom";
import {
  IconArrowsExchange,
  IconBarbell,
  IconCalendarEvent,
  IconCheck,
  IconChevronRight,
  IconEdit,
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
import { useMyWorkouts, useWorkoutHistory, useTodayWorkoutLogs, useClientExercises, useClientExerciseAlternatives, useUpdateProgramExercise, useLogWorkoutDetailed, useExerciseHistory, useSwapWorkoutDays, useMoveExercise, useSwapExercises } from "../../hooks/useClientPortal";
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

  const exercisesFromTemplate = useMemo(() => {
    const list: Array<{ id: string; name: string; muscle_groups: string[]; equipment: string[]; category?: string; image_url?: string; video_url?: string }> = [];
    const seen = new Set<string>();
    templateDays.forEach((d) => {
      d.blocks?.forEach((b) => {
        b.exercises?.forEach((ex) => {
          const id = ex.exercise_id || ex.exercise?.id || ex.name || "";
          if (id && !seen.has(id)) {
            seen.add(id);
            list.push({
              id,
              name: ex.exercise?.name || ex.name || "Ejercicio",
              muscle_groups: (ex as any).muscle_groups || (ex.exercise as any)?.muscle_groups || [],
              equipment: (ex as any).equipment || (ex.exercise as any)?.equipment || [],
              category: (ex as any).category || (ex.exercise as any)?.category,
              image_url: (ex.exercise as any)?.image_url,
              video_url: (ex as any).video_url || (ex.exercise as any)?.video_url,
            });
          }
        });
      });
    });
    return list;
  }, [templateDays]);

  const exercisesInProgram = useMemo(() => {
    if (!allExercises || allExercises.length === 0) return exercisesFromTemplate;
    const matched = allExercises.filter((ex) => programExerciseIds.has(ex.id));
    return matched.length > 0 ? matched : exercisesFromTemplate;
  }, [allExercises, programExerciseIds, exercisesFromTemplate]);

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
                    <Group wrap="nowrap" gap="sm">
                      {ex.image_url ? (
                        <Image
                          src={ex.image_url}
                          alt={ex.name}
                          w={56}
                          h={56}
                          radius="md"
                          fit="cover"
                          style={{ flexShrink: 0 }}
                        />
                      ) : (
                        <ThemeIcon variant="light" color="gray" size={56} radius="md" style={{ flexShrink: 0 }}>
                          <IconBarbell size={24} />
                        </ThemeIcon>
                      )}
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" wrap="nowrap" gap="xs">
                          <Text size="sm" fw={500} lineClamp={1}>{ex.name}</Text>
                          {prog && (
                            <Badge variant="light" color="yellow" size="sm" style={{ flexShrink: 0 }}>
                              {prog.sets} × {prog.reps}
                            </Badge>
                          )}
                        </Group>
                        <Group gap={4} mt={2}>
                          {ex.equipment?.map((eq) => (
                            <Badge key={eq} variant="outline" size="xs" color="gray">{eq}</Badge>
                          ))}
                          {ex.category && <Badge variant="light" size="xs" color="teal">{ex.category}</Badge>}
                          {ex.video_url && (
                            <Badge
                              component="a"
                              href={ex.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="light"
                              size="xs"
                              color="blue"
                              leftSection={<IconPlayerPlay size={10} />}
                              style={{ cursor: "pointer" }}
                            >
                              Ver vídeo
                            </Badge>
                          )}
                        </Group>
                      </Box>
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
  target_duration_minutes?: number;
  target_distance_km?: number;
  target_speed_kmh?: number;
  rest_seconds?: number;
  video_url?: string;
  prefillSets?: Array<{ weight_kg?: number; reps_completed?: number; completed?: boolean }>;
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
        <Group gap={4}>
          {exercise.rest_seconds != null && exercise.rest_seconds > 0 && (
            <Badge variant="light" color="gray" size="xs" leftSection={<IconClock size={10} />}>
              {exercise.rest_seconds >= 60 ? `${Math.floor(exercise.rest_seconds / 60)}:${String(exercise.rest_seconds % 60).padStart(2, "0")}` : `${exercise.rest_seconds}s`} descanso
            </Badge>
          )}
          {cardio && (exercise.target_duration_minutes != null || exercise.target_distance_km != null || exercise.target_speed_kmh != null) && (
            <Badge variant="light" color="yellow" size="xs">
              Obj:{exercise.target_duration_minutes != null ? ` ${exercise.target_duration_minutes}min` : ""}
              {exercise.target_distance_km != null ? ` · ${exercise.target_distance_km}km` : ""}
              {exercise.target_speed_kmh != null ? ` · ${exercise.target_speed_kmh}km/h` : ""}
            </Badge>
          )}
          {!cardio && (exercise.target_weight != null || exercise.target_reps != null) && (
            <Badge variant="light" color="yellow" size="xs">
              Obj: {exercise.target_weight ?? "—"}kg x {exercise.target_reps ?? exercise.reps ?? "—"}
            </Badge>
          )}
        </Group>
      </Group>
      {exercise.video_url && (
        <Box px={4} mb="xs">
          {exercise.video_url.includes("youtube.com") || exercise.video_url.includes("youtu.be") ? (
            <iframe
              src={exercise.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
              style={{ width: "100%", height: 180, borderRadius: 8, border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={exercise.name}
            />
          ) : (
            <video
              src={exercise.video_url}
              controls
              style={{ width: "100%", maxHeight: 180, borderRadius: 8 }}
            />
          )}
        </Box>
      )}
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
  logDate,
  existingLogData,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    program_id: string;
    day_index: number;
    log_date?: string;
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
  logDate?: Date;
  existingLogData?: Record<string, unknown> | null;
}) {
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetLog[]>>(() => {
    const initial: Record<string, SetLog[]> = {};
    const existingExercises = (existingLogData?.exercises || []) as Array<{
      exercise_id?: string;
      exercise_name?: string;
      sets?: Array<{
        set_number?: number;
        weight_kg?: number;
        reps_completed?: number;
        duration_seconds?: number;
        distance_km?: number;
        speed_kmh?: number;
        duration_minutes?: number;
        completed?: boolean;
      }>;
    }>;
    exercises.forEach((e) => {
      const defaultWeight = e.target_weight ?? undefined;
      const defaultReps = e.target_reps ?? parseRepsFromString(e.reps);
      // Cardio targets coming from the trainer's plan. These should prefill
      // the inputs so clients only tweak the values they actually change.
      const defaultDurationMin = e.target_duration_minutes ?? undefined;
      const defaultDistanceKm = e.target_distance_km ?? undefined;
      const defaultSpeedKmh = e.target_speed_kmh ?? undefined;
      const existingEx = existingExercises.find(
        (ee) => ee.exercise_id === e.exercise_id || ee.exercise_name === e.name
      );
      if (existingEx?.sets && existingEx.sets.length > 0) {
        initial[e.exercise_id] = existingEx.sets.map((s, i) => ({
          set_number: s.set_number ?? i + 1,
          weight_kg: s.weight_kg ?? defaultWeight,
          reps_completed: s.reps_completed ?? defaultReps,
          duration_seconds: s.duration_seconds,
          distance_km: s.distance_km ?? defaultDistanceKm,
          speed_kmh: s.speed_kmh ?? defaultSpeedKmh,
          duration_minutes: s.duration_minutes ?? defaultDurationMin,
          completed: s.completed ?? true,
        }));
        while (initial[e.exercise_id].length < e.sets) {
          initial[e.exercise_id].push({
            set_number: initial[e.exercise_id].length + 1,
            weight_kg: defaultWeight,
            reps_completed: defaultReps,
            duration_minutes: defaultDurationMin,
            distance_km: defaultDistanceKm,
            speed_kmh: defaultSpeedKmh,
            completed: true,
          });
        }
      } else if (e.prefillSets && e.prefillSets.length > 0) {
        initial[e.exercise_id] = e.prefillSets.map((s, i) => ({
          set_number: i + 1,
          weight_kg: s.weight_kg ?? defaultWeight,
          reps_completed: s.reps_completed ?? defaultReps,
          duration_minutes: defaultDurationMin,
          distance_km: defaultDistanceKm,
          speed_kmh: defaultSpeedKmh,
          completed: s.completed ?? true,
        }));
        while (initial[e.exercise_id].length < e.sets) {
          initial[e.exercise_id].push({
            set_number: initial[e.exercise_id].length + 1,
            weight_kg: defaultWeight,
            reps_completed: defaultReps,
            duration_minutes: defaultDurationMin,
            distance_km: defaultDistanceKm,
            speed_kmh: defaultSpeedKmh,
            completed: true,
          });
        }
      } else {
        initial[e.exercise_id] = Array.from({ length: e.sets }, (_, i) => ({
          set_number: i + 1,
          weight_kg: defaultWeight,
          reps_completed: defaultReps,
          duration_minutes: defaultDurationMin,
          distance_km: defaultDistanceKm,
          speed_kmh: defaultSpeedKmh,
          completed: true,
        }));
      }
    });
    return initial;
  });

  // Prefill total duration using the sum of cardio targets (if any). Falls
  // back to 60 min so resistance sessions keep a sensible default.
  const plannedDuration = (() => {
    const total = exercises.reduce((sum, e) => {
      if (e.target_duration_minutes && e.target_duration_minutes > 0) {
        const reps = Math.max(e.sets || 1, 1);
        return sum + e.target_duration_minutes * reps;
      }
      return sum;
    }, 0);
    return total > 0 ? total : 60;
  })();

  const form = useForm({
    initialValues: {
      duration_minutes: plannedDuration,
      perceived_effort: 5,
      notes: "",
    },
  });

  const handleSubmit = () => {
    onSubmit({
      program_id: programId,
      day_index: dayIndex,
      log_date: logDate ? `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, "0")}-${String(logDate.getDate()).padStart(2, "0")}` : undefined,
      exercises: exercises.map((e) => {
        const sets = (exerciseSets[e.exercise_id] || []).map((s) => ({
          set_number: s.set_number,
          weight_kg: s.weight_kg,
          reps_completed: s.reps_completed,
          duration_seconds: s.duration_seconds,
          distance_km: s.distance_km,
          speed_kmh: s.speed_kmh,
          duration_minutes: s.duration_minutes,
          completed: s.completed,
          notes: s.notes,
        }));
        const anySetCompleted = sets.some((s) => s.completed);
        return {
          exercise_id: e.exercise_id,
          exercise_name: e.name,
          sets,
          completed: anySetCompleted,
        };
      }),
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
      Registrar Entrenamiento
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
      exercise?: { id?: string; name?: string; alias?: string; image_url?: string; video_url?: string; description?: string; muscle_groups?: string[] };
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

// Tipo auxiliar con todos los campos que puede tener un ejercicio de la
// plantilla del entrenador (series, reps, descanso, objetivos de peso, etc.).
type PrescribedExercise = {
  sets?: number;
  reps?: string | number;
  rest_seconds?: number;
  duration_type?: string;
  target_weight?: number;
  target_reps?: number;
  target_duration_minutes?: number;
  target_distance_km?: number;
  target_speed_kmh?: number;
};

// Construye los badges/etiquetas que resumen la prescripción del entrenador
// para un ejercicio concreto. Muestra sólo las variables que realmente se
// han definido (series x reps, peso objetivo, distancia, duración, velocidad,
// descanso) en lugar de placeholders genéricos.
function getExercisePrescriptionChips(ex: PrescribedExercise): string[] {
  const chips: string[] = [];
  const isCardio =
    ex.duration_type === "cardio" ||
    ex.target_duration_minutes != null ||
    ex.target_distance_km != null ||
    ex.target_speed_kmh != null;

  // Series x reps (solo si se definieron)
  const hasSets = ex.sets != null && Number(ex.sets) > 0;
  const hasReps = ex.reps != null && String(ex.reps).trim() !== "";
  if (hasSets && hasReps) {
    chips.push(`${ex.sets} x ${ex.reps}`);
  } else if (hasSets) {
    chips.push(`${ex.sets} series`);
  } else if (hasReps) {
    chips.push(`${ex.reps} reps`);
  }

  // Peso objetivo para entrenos de fuerza
  if (!isCardio && ex.target_weight != null) {
    chips.push(`${ex.target_weight} kg`);
  }

  // Cardio: duración, distancia y velocidad
  if (isCardio) {
    if (ex.target_duration_minutes != null) chips.push(`${ex.target_duration_minutes} min`);
    if (ex.target_distance_km != null) chips.push(`${ex.target_distance_km} km`);
    if (ex.target_speed_kmh != null) chips.push(`${ex.target_speed_kmh} km/h`);
  }

  // Descanso
  if (ex.rest_seconds != null && ex.rest_seconds > 0) {
    chips.push(
      ex.rest_seconds >= 60
        ? `${Math.floor(ex.rest_seconds / 60)}:${String(ex.rest_seconds % 60).padStart(2, "0")} desc.`
        : `${ex.rest_seconds}s desc.`,
    );
  }

  return chips;
}

function WeekDayDetail({
  schedule,
  weekDayName,
  onImageClick,
  onSwapExercise,
  onSwapDay,
  isExecutedView = false,
}: {
  schedule: { dayName?: string; exercises_list?: Array<{ name: string; sets: number; reps: string }>; blocks?: Array<{ id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { name?: string; alias?: string; image_url?: string; video_url?: string; description?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; video_url?: string; duration_type?: string; target_weight?: number; target_reps?: number; target_duration_minutes?: number; target_distance_km?: number; target_speed_kmh?: number }> }> };
  weekDayName: string;
  onImageClick: (url: string, name: string) => void;
  onSwapExercise?: (blockIndex: number, exerciseIndex: number, exerciseName: string) => void;
  onSwapDay?: () => void;
  isExecutedView?: boolean;
}) {
  return (
    <>
      <Box px="md" mb="sm">
        <Group justify="space-between" align="flex-start">
          <Box>
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
          {isExecutedView && onSwapDay && (
            <Button variant="light" size="xs" leftSection={<IconArrowsExchange size={14} />} radius="md" color="teal" onClick={onSwapDay}>
              Intercambiar día
            </Button>
          )}
        </Group>
      </Box>

      {schedule.blocks?.map((block: { id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { name?: string; alias?: string; image_url?: string; video_url?: string; description?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; video_url?: string; duration_type?: string; target_weight?: number; target_reps?: number; target_duration_minutes?: number; target_distance_km?: number; target_speed_kmh?: number }> }, blockIndex: number) => (
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
            const baseExName = exercise.exercise?.name || exercise.name || "Ejercicio";
            const exAlias = exercise.exercise?.alias;
            const exName = exAlias ? `${baseExName} (${exAlias})` : baseExName;
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
                      {getExercisePrescriptionChips(exercise).map((chip, chipIdx) => (
                        <Badge
                          key={chipIdx}
                          variant="light"
                          color={chipIdx === 0 ? "blue" : "gray"}
                          size="xs"
                        >
                          {chip}
                        </Badge>
                      ))}
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
                    {isExecutedView && onSwapExercise && (
                      <ActionIcon
                        variant="light"
                        color="teal"
                        size="lg"
                        radius="xl"
                        onClick={() => onSwapExercise(blockIndex, exIndex, exName)}
                      >
                        <IconArrowsExchange size={18} />
                      </ActionIcon>
                    )}
                  </Group>
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
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: workouts, isLoading: isLoadingWorkouts } = useMyWorkouts({ activeOnly: true });
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
  const [selectedWeekOverride, setSelectedWeekOverride] = useState<string | null>(null);
  const swapWorkoutDaysMutation = useSwapWorkoutDays();
  const moveExerciseMutation = useMoveExercise();
  const swapExercisesMutation = useSwapExercises();
  const [swapTarget, setSwapTarget] = useState<{
    programId: string;
    dayIndex: number;
    blockIndex: number;
    exerciseIndex: number;
    currentExerciseName: string;
    currentExerciseId?: string;
  } | null>(null);
  const [exerciseSwapState, setExerciseSwapState] = useState<{
    sourceBlockIndex: number;
    sourceExerciseIndex: number;
    exerciseName: string;
    step: "day" | "exercise";
    targetDay?: number;
  } | null>(null);
  const [daySwapSourceDay, setDaySwapSourceDay] = useState<number | null>(null);
  const [singleExerciseModalOpened, { open: openSingleExerciseModal, close: closeSingleExerciseModal }] = useDisclosure(false);
  const [singleExercise, setSingleExercise] = useState<ExerciseForLog | null>(null);

  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const activeProgram = useMemo(() => {
    if (!workouts || workouts.length === 0) return undefined;
    const todayStr = toLocalDateStr(new Date());
    const activeOnes = workouts.filter((p) => p.is_active);
    if (activeOnes.length === 0) return undefined;
    const inWindow = activeOnes.find((p) => {
      if (p.start_date && todayStr < p.start_date) return false;
      if (p.end_date && todayStr > p.end_date) return false;
      return true;
    });
    return inWindow || activeOnes[0];
  }, [workouts]);

  const todayJsDay = new Date().getDay();
  const dayMapping = [7, 1, 2, 3, 4, 5, 6];
  const todayDayNum = dayMapping[todayJsDay];

  const executedTemplateSrc = activeProgram?.executed_template || activeProgram?.template;
  const originalTemplateSrc = activeProgram?.template;

  const allProgramWeeks = useMemo(() => {
    const src = programViewMode === "original" ? originalTemplateSrc : executedTemplateSrc;
    if (!src?.weeks || src.weeks.length === 0) return [];
    return src.weeks.map((w: any) => ({ value: String(w.week), label: `Semana ${w.week}` }));
  }, [executedTemplateSrc, originalTemplateSrc, programViewMode]);

  const currentAutoWeek = useMemo(() => {
    const src = executedTemplateSrc;
    if (!src?.weeks || src.weeks.length === 0) return 1;
    const durationWeeks = activeProgram?.duration_weeks || src.weeks.length;
    if (!durationWeeks || durationWeeks <= 1) return 1;
    const startDateStr = activeProgram?.start_date;
    const startDate = startDateStr ? new Date(startDateStr) : new Date(activeProgram?.created_at || Date.now());
    if (isNaN(startDate.getTime())) return 1;
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (Math.floor(Math.max(0, daysDiff) / 7) % durationWeeks) + 1;
  }, [executedTemplateSrc, activeProgram]);

  const activeWeekNum = selectedWeekOverride ? parseInt(selectedWeekOverride, 10) : currentAutoWeek;

  const programDateRange = useMemo(() => {
    if (!activeProgram?.start_date) return null;
    const start = new Date(activeProgram.start_date);
    const end = activeProgram.end_date ? new Date(activeProgram.end_date) : null;
    if (isNaN(start.getTime())) return null;
    return {
      start,
      end: end && !isNaN(end.getTime()) ? end : null,
      startStr: start.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      endStr: end && !isNaN(end.getTime()) ? end.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : null,
    };
  }, [activeProgram]);

  const weekDateRange = useMemo(() => {
    if (!programDateRange?.start) return null;
    const weekStart = new Date(programDateRange.start);
    weekStart.setDate(weekStart.getDate() + (activeWeekNum - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const cap = programDateRange.end;
    const effectiveEnd = cap && weekEnd > cap ? cap : weekEnd;
    return {
      start: weekStart,
      end: effectiveEnd,
      startStr: weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      endStr: effectiveEnd.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    };
  }, [programDateRange, activeWeekNum]);

  const getDayDate = (dayIndex: number): string | null => {
    if (!weekDateRange?.start) return null;
    const d = new Date(weekDateRange.start);
    d.setDate(d.getDate() + dayIndex);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const isDayInProgramRange = (dayIndex: number): boolean => {
    if (!weekDateRange?.start || !programDateRange) return true;
    const d = new Date(weekDateRange.start);
    d.setDate(d.getDate() + dayIndex);
    const dStr = toLocalDateStr(d);
    const startStr = toLocalDateStr(programDateRange.start);
    if (dStr < startStr) return false;
    if (programDateRange.end) {
      const endStr = toLocalDateStr(programDateRange.end);
      if (dStr > endStr) return false;
    }
    return true;
  };

  const isSelectedDateInRange = useMemo(() => {
    if (!programDateRange) return true;
    const selStr = toLocalDateStr(selectedDate);
    const startStr = toLocalDateStr(programDateRange.start);
    if (selStr < startStr) return false;
    if (programDateRange.end) {
      const endStr = toLocalDateStr(programDateRange.end);
      if (selStr > endStr) return false;
    }
    return true;
  }, [selectedDate, programDateRange]);

  if (isLoadingWorkouts) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  const extractDaysForWeek = (src: any, weekOverride?: number): ProgramDay[] => {
    if (!src) return [];
    if (src.weeks && src.weeks.length > 0) {
      const weekNum = weekOverride || currentAutoWeek;
      const wk = src.weeks.find((w: any) => w.week === weekNum);
      return wk?.days || src.weeks[0]?.days || [];
    }
    return src.days || [];
  };

  const weekOverrideNum = selectedWeekOverride ? parseInt(selectedWeekOverride, 10) : undefined;
  const executedTemplateDays: ProgramDay[] = extractDaysForWeek(executedTemplateSrc, weekOverrideNum);
  const originalTemplateDays: ProgramDay[] = extractDaysForWeek(originalTemplateSrc, weekOverrideNum);

  // Obtener días del template (nueva estructura) o usar retrocompatibilidad
  const templateDays: ProgramDay[] = executedTemplateDays;
  const legacyBlocks: ProgramDay["blocks"] = (executedTemplateSrc?.blocks || []) as ProgramDay["blocks"];
  
  // Obtener el entrenamiento de hoy
  const todayWorkoutDay = templateDays.find((d: ProgramDay) => d.day === todayDayNum);
  const todayBlocks = todayWorkoutDay?.blocks || (todayDayNum === 1 ? legacyBlocks : []);
  const isTodayRestDay = todayWorkoutDay?.isRestDay ?? false;
  
  // Flatten all exercises from today's blocks (with exercise_id for history/targets)
  const allExercises: ExerciseForLog[] = todayBlocks.flatMap((block: { exercises?: Array<{ exercise_id?: string; exercise?: { id?: string; name?: string; alias?: string; image_url?: string; video_url?: string; description?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; video_url?: string; target_weight?: number; target_reps?: number; target_duration_minutes?: number; target_distance_km?: number; target_speed_kmh?: number }> }) =>
    (block.exercises || []).map(ex => ({
      exercise_id: ex.exercise_id || ex.exercise?.id || "",
      name: ex.exercise?.name || ex.name || "Ejercicio",
      sets: ex.sets || 3,
      reps: ex.reps || "10-12",
      target_weight: ex.target_weight,
      target_reps: ex.target_reps,
      target_duration_minutes: ex.target_duration_minutes,
      target_distance_km: ex.target_distance_km,
      target_speed_kmh: ex.target_speed_kmh,
      rest_seconds: ex.rest_seconds,
      video_url: ex.video_url || ex.exercise?.video_url,
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
    log_date?: string;
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

  const handleOpenSingleExercise = (exercise: ExerciseForLog) => {
    setSingleExercise(exercise);
    openSingleExerciseModal();
  };

  const handleLogSingleExercise = async (logData: {
    program_id: string;
    day_index: number;
    log_date?: string;
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
    const existingLogData = todayLogs?.logs?.[0]?.log as Record<string, unknown> | undefined;
    const existingExercises = ((existingLogData?.exercises || []) as Array<{
      exercise_id?: string;
      exercise_name?: string;
      sets?: Array<Record<string, unknown>>;
      completed?: boolean;
    }>);

    const newExercise = logData.exercises[0];
    const mergedExercises = allExercises.map((ae) => {
      if (ae.exercise_id === newExercise?.exercise_id) {
        return newExercise;
      }
      const existing = existingExercises.find(
        (ee) => ee.exercise_id === ae.exercise_id || ee.exercise_name === ae.name
      );
      if (existing) {
        return existing;
      }
      return {
        exercise_id: ae.exercise_id,
        exercise_name: ae.name,
        sets: [],
        completed: false,
      };
    });

    await logWorkoutMutation.mutateAsync({
      ...logData,
      exercises: mergedExercises as typeof logData.exercises,
      duration_minutes: logData.duration_minutes || (existingLogData?.duration_minutes as number) || undefined,
      perceived_effort: logData.perceived_effort || (existingLogData?.perceived_effort as number) || undefined,
      satisfaction_rating: logData.satisfaction_rating || (existingLogData?.satisfaction_rating as number) || undefined,
    });
    closeSingleExerciseModal();
    setSingleExercise(null);
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

  const selectedDateStr = toLocalDateStr(selectedDate);
  const isToday = selectedDateStr === toLocalDateStr(new Date());

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
                const programForPdf = {
                  id: activeProgram?.id || "",
                  name: activeProgram?.name || "Programa",
                  description: activeProgram?.description,
                  duration_weeks: activeProgram?.duration_weeks,
                  difficulty: activeProgram?.difficulty,
                  days: (activeProgram?.template as any)?.days || [],
                };
                await generateWorkoutProgramPDF(programForPdf as any, {
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

      

      {data.assignedProgram?.id && isMobile && (
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
                minDate={programDateRange?.start || undefined}
                maxDate={programDateRange?.end && programDateRange.end < new Date() ? programDateRange.end : new Date()}
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

          {!activeProgram && (
            <Box ta="center" py="xl">
              <Text size="xl" mb="sm">📋</Text>
              <Text fw={600} size="lg">No tienes ningún programa de entrenamiento activo</Text>
              <Text c="dimmed" size="sm" mt="xs">Tu entrenador te asignará un programa cuando esté listo.</Text>
            </Box>
          )}

          {!isSelectedDateInRange && data.assignedProgram?.id && (
            <Box ta="center" py="xl">
              <Text size="xl" mb="sm">📅</Text>
              <Text fw={700} size="lg">Fecha fuera del programa</Text>
              <Text c="dimmed" size="sm" mt="xs">
                Tu programa va del {programDateRange?.startStr} al {programDateRange?.endStr || "—"}.
                Selecciona una fecha dentro de ese rango.
              </Text>
            </Box>
          )}

          {isSelectedDateInRange && data.isTodayRestDay && (
            <Box ta="center" py="xl">
              <Text size="xl" mb="sm">🛌</Text>
              <Text fw={700} size="lg">Hoy es día de descanso</Text>
              <Text c="dimmed" size="sm" mt="xs">
                Tu cuerpo necesita recuperarse. ¡Aprovecha para descansar!
              </Text>
            </Box>
          )}
          
          {isSelectedDateInRange && !data.isTodayRestDay && data.todayWorkout && (
            <Box>
              {/* Button at top - between date and day name */}
              <Box px="md" mb="md">
                {data.isTodayCompleted ? (
                  <Group justify="space-between">
                    <Button
                      leftSection={<IconCheck size={18} />}
                      color="green"
                      variant="light"
                      fullWidth
                      size="lg"
                      radius="xl"
                      disabled
                      styles={{ root: { height: 48, flex: 1 } }}
                    >
                      Entrenamiento Completado
                    </Button>
                    <Menu shadow="md" width={180} position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" size="lg">
                          <IconBarbell size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconPlayerPlay size={14} />} onClick={openModal}>
                          Editar registro
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
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
                  <Text size="xs" c="dimmed" fw={500}>
                    {(() => {
                      const todayLogData = todayLogs?.logs?.[0]?.log as Record<string, unknown> | undefined;
                      const logExercises = (todayLogData?.exercises || []) as Array<{ completed?: boolean }>;
                      const completedCount = logExercises.filter(e => e.completed).length;
                      const totalCount = allExercises.length;
                      return `${completedCount}/${totalCount} ejercicios completados`;
                    })()}
                  </Text>
                </Group>
              </Box>

              {/* Edge-to-edge exercise list */}
              {data.todayWorkout.blocks?.map((block: { id?: string; name: string; type?: string; exercises?: Array<{ exercise?: { id?: string; name?: string; alias?: string; image_url?: string; video_url?: string; description?: string }; exercise_id?: string; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string; video_url?: string; duration_type?: string; target_weight?: number; target_reps?: number; target_duration_minutes?: number; target_distance_km?: number; target_speed_kmh?: number }> }, blockIndex: number) => (
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
                    const baseExName2 = exercise.exercise?.name || exercise.name || "Ejercicio";
                    const exAlias2 = exercise.exercise?.alias;
                    const exName = exAlias2 ? `${baseExName2} (${exAlias2})` : baseExName2;
                    const exImage = exercise.exercise?.image_url;
                    const videoUrl = exercise.video_url || exercise.exercise?.video_url;
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
                              {getExercisePrescriptionChips(exercise).map((chip, chipIdx) => {
                                const looksLikeWeight = /kg$/i.test(chip);
                                const looksLikeRest = /desc\./i.test(chip);
                                const color = looksLikeWeight ? "yellow" : looksLikeRest ? "gray" : chipIdx === 0 ? "blue" : "gray";
                                return (
                                  <Badge
                                    key={chipIdx}
                                    variant="light"
                                    color={color}
                                    size="xs"
                                    leftSection={looksLikeRest ? <IconClock size={10} /> : undefined}
                                  >
                                    {chip}
                                  </Badge>
                                );
                              })}
                            </Group>
                            {exercise.notes && <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{exercise.notes}</Text>}
                          </Box>
                          <Stack gap={4} style={{ flexShrink: 0 }} align="flex-end">
                            {(() => {
                              const todayLogData = todayLogs?.logs?.[0]?.log as Record<string, unknown> | undefined;
                              const logExercises = (todayLogData?.exercises || []) as Array<{ exercise_id?: string; exercise_name?: string; completed?: boolean; sets?: Array<{ completed?: boolean }> }>;
                              const logEx = logExercises.find(le => le.exercise_id === (exercise.exercise_id || exercise.exercise?.id) || le.exercise_name === exName);
                              if (!logEx) return null;
                              const completedSets = (logEx.sets || []).filter(s => s.completed).length;
                              const totalSets = logEx.sets?.length || 0;
                              if (completedSets === 0) return null;
                              return completedSets >= totalSets ? (
                                <Badge color="green" variant="filled" size="xs" leftSection={<IconCheck size={8} />}>Completado</Badge>
                              ) : (
                                <Badge color="yellow" variant="light" size="xs">{completedSets}/{totalSets} series</Badge>
                              );
                            })()}
                            <Group gap={4}>
                              {(() => {
                                const ld = todayLogs?.logs?.[0]?.log as Record<string, unknown> | undefined;
                                const les = (ld?.exercises || []) as Array<{ exercise_id?: string; exercise_name?: string; sets?: Array<{ weight_kg?: number; reps_completed?: number; completed?: boolean }> }>;
                                const existing = les.find(le => le.exercise_id === (exercise.exercise_id || exercise.exercise?.id) || le.exercise_name === exName);
                                const isLogged = existing && (existing.sets || []).some(s => s.completed);
                                return (
                                  <Button
                                    variant="subtle"
                                    color={isLogged ? "blue" : "green"}
                                    size="xs"
                                    radius="xl"
                                    leftSection={isLogged ? <IconEdit size={12} /> : undefined}
                                    onClick={() => handleOpenSingleExercise({
                                      exercise_id: exercise.exercise_id || exercise.exercise?.id || "",
                                      name: exName,
                                      sets: exercise.sets || 3,
                                      reps: exercise.reps || "10-12",
                                      target_weight: exercise.target_weight,
                                      target_reps: exercise.target_reps,
                                      target_duration_minutes: exercise.target_duration_minutes,
                                      target_distance_km: exercise.target_distance_km,
                                      target_speed_kmh: exercise.target_speed_kmh,
                                      rest_seconds: exercise.rest_seconds,
                                      video_url: videoUrl,
                                      ...(isLogged && existing?.sets ? { prefillSets: existing.sets } : {}),
                                    })}
                                  >
                                    {isLogged ? "Editar" : "Registrar"}
                                  </Button>
                                );
                              })()}
                              <Button
                                variant="subtle"
                                color="yellow"
                                size="xs"
                                radius="xl"
                                onClick={handleOpenSwap(
                                  data.assignedProgram!.id,
                                  todayDayIndex >= 0 ? todayDayIndex : 0,
                                  blockIndex,
                                  exIndex,
                                  exName,
                                  exercise.exercise?.id || exercise.exercise_id
                                )}
                              >
                                Sustituir
                              </Button>
                            </Group>
                          </Stack>
                        </Group>
                        {videoUrl && (
                          <Box mt="xs" px={4}>
                            {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                              <iframe
                                src={videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/").split("&")[0]}
                                style={{ width: "100%", height: 180, borderRadius: 8, border: "none" }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={exName}
                              />
                            ) : (
                              <video
                                src={videoUrl}
                                controls
                                preload="metadata"
                                style={{ width: "100%", maxHeight: 180, borderRadius: 8 }}
                              />
                            )}
                          </Box>
                        )}
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

              {/* Bottom spacing */}
              <Box px="md" mt="lg" mb="md" />
            </Box>
          )}
          
          {isSelectedDateInRange && !data.isTodayRestDay && !data.todayWorkout && data.assignedProgram?.id && (
            <Stack align="center" gap="sm" py="xl">
              <Text size="2xl">🛌</Text>
              <Text fw={600} size="lg">No hay entrenamiento asignado para hoy</Text>
              <Text c="dimmed" size="sm" ta="center" maw={420}>
                Aprovecha para descansar o revisar tu semana. Si aún tienes energía, puedes registrar un entrenamiento libre.
              </Text>
              <Group gap="xs" mt="xs">
                <Button
                  size="xs"
                  variant="light"
                  radius="xl"
                  onClick={() => setActiveTab("week")}
                >
                  Ver programa semanal
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  radius="xl"
                  onClick={() => navigate("/my-progress")}
                >
                  Registrar progreso
                </Button>
              </Group>
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="week">
          {!activeProgram ? (
            <Box ta="center" py="xl">
              <Text size="xl" mb="sm">📋</Text>
              <Text fw={600} size="lg">No tienes ningún programa de entrenamiento activo</Text>
              <Text c="dimmed" size="sm" mt="xs">Tu entrenador te asignará un programa cuando esté listo.</Text>
            </Box>
          ) : (
          <>
          <Stack gap="xs" mb="md">
            <Group gap="sm" wrap="wrap">
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
              {programDateRange && (
                <Badge variant="light" color="gray" size="sm">
                  {programDateRange.startStr}{programDateRange.endStr ? ` – ${programDateRange.endStr}` : ""}
                </Badge>
              )}
            </Group>
            {allProgramWeeks.length > 1 && (
              <Group gap="sm" wrap="wrap">
                <Select
                  value={selectedWeekOverride || String(currentAutoWeek)}
                  onChange={(v) => setSelectedWeekOverride(v)}
                  data={allProgramWeeks}
                  size="xs"
                  radius="md"
                  w={150}
                  allowDeselect={false}
                />
                {weekDateRange && (
                  <Badge variant="light" color="blue" size="sm">
                    {weekDateRange.startStr} – {weekDateRange.endStr}
                  </Badge>
                )}
              </Group>
            )}
          </Stack>
          <MasterDetailLayout
            hasSelection={selectedDayIndex !== null && !displaySchedule[selectedDayIndex]?.isRestDay}
            emptyMessage="Selecciona un día de entrenamiento para ver los ejercicios"
            master={
              <>
                {displaySchedule.map((day, index) => {
                  const dayNum = index + 1;
                  const isToday = dayNum === todayDayNum;
                  const exCount = day.exercises_list?.length || 0;
                  const dayDate = getDayDate(index);
                  const inRange = isDayInProgramRange(index);
                  return (
                    <DayCardMenu
                      key={index}
                      dayName={dayDate ? `${weekDays[index]} · ${dayDate}` : weekDays[index]}
                      isToday={isToday && inRange}
                      isSelected={selectedDayIndex === index}
                      isRestDay={day.isRestDay || !inRange}
                      onClick={() => inRange && setSelectedDayIndex(index)}
                      badge={
                        <>
                          {!inRange && (
                            <Badge color="gray" variant="light" size="xs">
                              Fuera del programa
                            </Badge>
                          )}
                          {inRange && day.completed && (
                            <Badge color="green" variant="light" size="xs" leftSection={<IconCheck size={10} />}>
                              Completado
                            </Badge>
                          )}
                          {inRange && programViewMode !== "original" && !day.isRestDay && activeProgram && (
                            <Menu shadow="md" position="bottom-end" withinPortal>
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray" size="xs" onClick={(e) => e.stopPropagation()}>
                                  <IconArrowsExchange size={12} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Label>Intercambiar día con</Menu.Label>
                                {weekDays.map((label, idx) => {
                                  if (!isDayInProgramRange(idx)) return null;
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
                          {!inRange ? "Sin programa" : day.isRestDay ? "Descanso" : `${day.type} - ${exCount} ejercicios`}
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
                      isExecutedView={programViewMode === "executed"}
                      onSwapExercise={(bi, ei, name) => setExerciseSwapState({ sourceBlockIndex: bi, sourceExerciseIndex: ei, exerciseName: name, step: "day" })}
                      onSwapDay={() => setDaySwapSourceDay(selectedDayIndex + 1)}
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
                  isExecutedView={programViewMode === "executed"}
                  onSwapExercise={(bi, ei, name) => setExerciseSwapState({ sourceBlockIndex: bi, sourceExerciseIndex: ei, exerciseName: name, step: "day" })}
                  onSwapDay={() => setDaySwapSourceDay(selectedDayIndex + 1)}
                />
              ) : null
            }
          />
          </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Stack gap="sm">
            {(data.history || []).length > 0 ? (
              (data.history || []).map((workout, index) => {
                const logData = (history || [])[index]?.log as Record<string, unknown> | undefined;
                const exercises = (logData?.exercises || []) as Array<{
                  exercise_name?: string;
                  exercise_id?: string;
                  sets?: Array<{ weight_kg?: number; reps_completed?: number; duration_minutes?: number; distance_km?: number; completed?: boolean }>;
                }>;
                const satisfaction = logData?.satisfaction_rating as number | undefined;
                const effort = logData?.perceived_effort as number | undefined;
                const durationMin = logData?.duration_minutes as number | undefined;

                const programDay = templateDays.find((d: ProgramDay) => {
                  const dayIdx = logData?.day_index as number | undefined;
                  return dayIdx !== undefined && d.day === dayIdx + 1;
                });
                const programExercises = programDay?.blocks?.flatMap((b: { exercises?: Array<{ exercise?: { name?: string }; sets?: number; reps?: string; target_weight?: number; target_reps?: number }> }) =>
                  (b.exercises || []).map(ex => ({ name: ex.exercise?.name || "", sets: ex.sets || 3, reps: ex.reps || "", target_weight: ex.target_weight, target_reps: ex.target_reps }))
                ) || [];

                let totalVolumeActual = 0;
                let totalVolumePlanned = 0;
                let totalDistanceActual = 0;
                let totalDistancePlanned = 0;

                exercises.forEach(ex => {
                  (ex.sets || []).forEach(s => {
                    totalVolumeActual += (s.weight_kg || 0) * (s.reps_completed || 0);
                    totalDistanceActual += (s.distance_km || 0);
                  });
                });

                programExercises.forEach(pe => {
                  const reps = parseInt(pe.reps) || 10;
                  totalVolumePlanned += (pe.target_weight || 0) * reps * (pe.sets || 3);
                });

                const MET_STRENGTH = 5;
                const MET_CARDIO = 7;
                const bodyWeightKg = 70;
                const hasCardio = totalDistanceActual > 0;
                const avgMet = hasCardio ? MET_CARDIO : MET_STRENGTH;
                const estCalories = Math.round(avgMet * bodyWeightKg * ((durationMin || 60) / 60));
                const projCalories = Math.round(avgMet * bodyWeightKg * ((durationMin || 60) / 60));

                return (
                  <Card key={index} shadow="sm" padding="md" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Box>
                        <Text fw={600}>{workout.name}</Text>
                        <Text size="sm" c="dimmed">{workout.date}</Text>
                      </Box>
                      <Group gap="xs">
                        <Badge variant="light" color="gray" size="sm" leftSection={<IconClock size={10} />}>{workout.duration}</Badge>
                        {effort != null && <Badge variant="light" color="orange" size="sm" leftSection={<IconFlame size={10} />}>Esfuerzo: {effort}/10</Badge>}
                        {satisfaction != null && <Text size="sm">{satisfaction === 1 ? "😞" : satisfaction === 2 ? "😐" : "😊"}</Text>}
                      </Group>
                    </Group>

                    <Group gap="xs" mb="xs">
                      {totalVolumeActual > 0 && (
                        <Badge variant="light" color="violet" size="sm">
                          Vol: {totalVolumeActual.toLocaleString()}kg
                          {totalVolumePlanned > 0 && ` / ${totalVolumePlanned.toLocaleString()}kg plan`}
                        </Badge>
                      )}
                      {totalDistanceActual > 0 && (
                        <Badge variant="light" color="cyan" size="sm">
                          Dist: {totalDistanceActual.toFixed(1)}km
                          {totalDistancePlanned > 0 && ` / ${totalDistancePlanned.toFixed(1)}km plan`}
                        </Badge>
                      )}
                      <Badge variant="light" color="red" size="sm" leftSection={<IconFlame size={10} />}>
                        ~{estCalories} kcal est.{projCalories !== estCalories ? ` / ~${projCalories} proy.` : ""}
                      </Badge>
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

      {/* Modal para registrar entrenamiento completo */}
      <LogWorkoutModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleLogWorkout}
        isLoading={logWorkoutMutation.isPending}
        workoutName={data.todayWorkout?.name || "Entrenamiento"}
        exercises={allExercises}
        programId={data.assignedProgram?.id || ""}
        dayIndex={todayDayIndex >= 0 ? todayDayIndex : 0}
        logDate={selectedDate}
        existingLogData={todayLogs?.logs?.[0]?.log as Record<string, unknown> | undefined}
      />

      {/* Modal para registrar ejercicio individual */}
      {singleExercise && (
        <LogWorkoutModal
          opened={singleExerciseModalOpened}
          onClose={() => { closeSingleExerciseModal(); setSingleExercise(null); }}
          onSubmit={handleLogSingleExercise}
          isLoading={logWorkoutMutation.isPending}
          workoutName={singleExercise.name}
          exercises={[singleExercise]}
          programId={data.assignedProgram?.id || ""}
          dayIndex={todayDayIndex >= 0 ? todayDayIndex : 0}
          logDate={selectedDate}
        />
      )}

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

      {/* Exercise swap - select target day */}
      <Modal
        opened={exerciseSwapState?.step === "day"}
        onClose={() => setExerciseSwapState(null)}
        title={`Mover "${exerciseSwapState?.exerciseName}" a otro día`}
        size="sm"
      >
        <Stack gap="xs">
          {weekDays.map((dayLabel, i) => {
            const dayNum = i + 1;
            const currentDayNum = selectedDayIndex != null ? selectedDayIndex + 1 : 0;
            if (dayNum === currentDayNum) return null;
            return (
              <Button
                key={dayNum}
                variant="outline"
                fullWidth
                justify="start"
                onClick={() => setExerciseSwapState(prev => prev ? { ...prev, step: "exercise", targetDay: dayNum } : null)}
              >
                {dayLabel}
              </Button>
            );
          })}
        </Stack>
      </Modal>

      {/* Exercise swap - select target exercise */}
      <Modal
        opened={exerciseSwapState?.step === "exercise" && exerciseSwapState?.targetDay != null}
        onClose={() => setExerciseSwapState(null)}
        title="Selecciona el ejercicio a intercambiar"
        size="sm"
      >
        {(() => {
          if (!exerciseSwapState || exerciseSwapState.targetDay == null || !activeProgram) return null;
          const targetDayData = executedTemplateDays.find((d: ProgramDay) => d.day === exerciseSwapState.targetDay);
          const targetExercises: Array<{ name: string; blockIndex: number; exerciseIndex: number }> = [];
          targetDayData?.blocks?.forEach((block, bi) => {
            block.exercises?.forEach((ex, ei) => {
              targetExercises.push({ name: ex.exercise?.name || ex.name || "Ejercicio", blockIndex: bi, exerciseIndex: ei });
            });
          });
          const currentDayNum = selectedDayIndex != null ? selectedDayIndex + 1 : 1;
          const targetDayLabel = weekDays[(exerciseSwapState.targetDay - 1) % 7] || `Día ${exerciseSwapState.targetDay}`;

          return (
            <Stack gap="xs">
              <Button
                variant="filled"
                color="red"
                fullWidth
                justify="start"
                onClick={() => {
                  moveExerciseMutation.mutate({
                    program_id: activeProgram.id,
                    source_day: currentDayNum,
                    source_block_index: exerciseSwapState.sourceBlockIndex,
                    source_exercise_index: exerciseSwapState.sourceExerciseIndex,
                    target_day: exerciseSwapState.targetDay!,
                  });
                  setExerciseSwapState(null);
                }}
              >
                Mover sin intercambiar
              </Button>
              {targetExercises.length > 0 ? (
                <>
                  <Text size="sm" c="dimmed" mb="xs">Ejercicios de {targetDayLabel}:</Text>
                  {targetExercises.map((tex, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      fullWidth
                      justify="start"
                      onClick={() => {
                        swapExercisesMutation.mutate({
                          program_id: activeProgram.id,
                          source_day: currentDayNum,
                          source_block_index: exerciseSwapState.sourceBlockIndex,
                          source_exercise_index: exerciseSwapState.sourceExerciseIndex,
                          target_day: exerciseSwapState.targetDay!,
                          target_block_index: tex.blockIndex,
                          target_exercise_index: tex.exerciseIndex,
                        });
                        setExerciseSwapState(null);
                      }}
                    >
                      {tex.name}
                    </Button>
                  ))}
                </>
              ) : (
                <Text c="dimmed" ta="center" py="md">No hay ejercicios en {targetDayLabel}</Text>
              )}
            </Stack>
          );
        })()}
      </Modal>

      {/* Day swap - select target day */}
      <Modal
        opened={daySwapSourceDay != null}
        onClose={() => setDaySwapSourceDay(null)}
        title="Intercambiar día con"
        size="sm"
      >
        <Stack gap="xs">
          {weekDays.map((dayLabel, i) => {
            const dayNum = i + 1;
            if (dayNum === daySwapSourceDay) return null;
            return (
              <Button
                key={dayNum}
                variant="light"
                fullWidth
                justify="start"
                leftSection={<IconArrowsExchange size={14} />}
                onClick={() => {
                  if (activeProgram && daySwapSourceDay != null) {
                    swapWorkoutDaysMutation.mutate({ programId: activeProgram.id, sourceDay: daySwapSourceDay, targetDay: dayNum });
                  }
                  setDaySwapSourceDay(null);
                }}
              >
                {dayLabel}
              </Button>
            );
          })}
        </Stack>
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
