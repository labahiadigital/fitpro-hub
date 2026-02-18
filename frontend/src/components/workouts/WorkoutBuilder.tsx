import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Popover,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import {
  IconBarbell,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCopy,
  IconExchange,
  IconFlame,
  IconGripVertical,
  IconPlus,
  IconRepeat,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconStretching,
  IconTrash,
  IconWeight,
} from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useCallback, useMemo, useState } from "react";
import { useAlternativesCounts } from "../../hooks/useExercises";

// Standardized muscle groups and equipment - exported for reuse
// Values match the actual data in the exercises table
export const MUSCLE_GROUPS = [
  { value: "pecho", label: "Pecho" },
  { value: "espalda", label: "Espalda" },
  { value: "espalda baja", label: "Espalda baja (Lumbares)" },
  { value: "hombros", label: "Hombros (Deltoides)" },
  { value: "trapecio", label: "Trapecio" },
  { value: "bíceps", label: "Bíceps" },
  { value: "tríceps", label: "Tríceps" },
  { value: "antebrazo", label: "Antebrazo" },
  { value: "cuadriceps", label: "Cuádriceps" },
  { value: "isquiotibiales", label: "Isquiotibiales" },
  { value: "glúteos", label: "Glúteos" },
  { value: "gemelos", label: "Gemelos" },
  { value: "abductores", label: "Abductores" },
  { value: "aductores", label: "Aductores" },
  { value: "cadera", label: "Cadera" },
  { value: "core", label: "Core" },
  { value: "abdominales", label: "Abdominales" },
  { value: "oblicuos", label: "Oblicuos" },
  { value: "cardio", label: "Cardio" },
  { value: "cuerpo completo", label: "Cuerpo completo" },
];

export const EQUIPMENT_TYPES = [
  { value: "ninguno", label: "Sin equipo" },
  { value: "barra", label: "Barra" },
  { value: "mancuernas", label: "Mancuernas" },
  { value: "banco", label: "Banco" },
  { value: "rack", label: "Rack" },
  { value: "barra de dominadas", label: "Barra de dominadas" },
  { value: "máquina prensa", label: "Máquina prensa" },
  { value: "maquina", label: "Máquina" },
  { value: "poleas", label: "Poleas" },
  { value: "cinta", label: "Cinta" },
  { value: "eliptica", label: "Elíptica" },
  { value: "guiada", label: "Guiada (Multipower)" },
];

const DURATION_TYPE_OPTIONS = [
  { value: "reps", label: "Repeticiones" },
  { value: "seconds", label: "Segundos" },
  { value: "minutes", label: "Minutos" },
];

interface Exercise {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string[];
  image_url?: string;
  category?: string;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  rest_seconds: number;
  duration_type?: "reps" | "seconds" | "minutes";
  notes?: string;
  order: number;
  target_weight?: number;
  target_reps?: number;
}

interface WorkoutBlock {
  id: string;
  name: string;
  type: "warmup" | "main" | "cooldown" | "superset" | "circuit";
  exercises: WorkoutExercise[];
  rest_between_sets?: number;
  rounds?: number;
}

// Nueva estructura para días de la semana
export interface WorkoutDay {
  id: string;
  day: number;
  dayName: string;
  blocks: WorkoutBlock[];
  isRestDay: boolean;
  notes?: string;
}

// Props original (retrocompatible)
interface WorkoutBuilderProps {
  blocks: WorkoutBlock[];
  onChange: (blocks: WorkoutBlock[]) => void;
  availableExercises: Exercise[];
  exerciseFavorites?: string[];
  onToggleExerciseFavorite?: (exerciseId: string, isFavorite: boolean) => void;
  onCreateExercise?: (data: {
    name: string;
    category?: string;
    muscle_groups: string[];
    equipment: string[];
    difficulty: string;
    description?: string;
  }) => Promise<Exercise>;
  alternativesCounts?: Record<string, number>;
}

// Props con días de la semana
interface WorkoutBuilderWithDaysProps {
  days: WorkoutDay[];
  onChangeDays: (days: WorkoutDay[]) => void;
  availableExercises: Exercise[];
  /** Selected client for reference (name, goals, injuries) */
  selectedClient?: { first_name?: string; last_name?: string; goals?: string; health_data?: { injuries?: Array<{ name: string; notes?: string; status?: string }> } } | null;
  exerciseFavorites?: string[];
  onToggleExerciseFavorite?: (exerciseId: string, isFavorite: boolean) => void;
  onCreateExercise?: (data: {
    name: string;
    category?: string;
    muscle_groups: string[];
    equipment: string[];
    difficulty: string;
    description?: string;
  }) => Promise<Exercise>;
}

// Días iniciales por defecto
export const initialWorkoutDays: WorkoutDay[] = [
  { id: "day-1", day: 1, dayName: "Lunes", blocks: [], isRestDay: false, notes: "" },
  { id: "day-2", day: 2, dayName: "Martes", blocks: [], isRestDay: false, notes: "" },
  { id: "day-3", day: 3, dayName: "Miércoles", blocks: [], isRestDay: false, notes: "" },
  { id: "day-4", day: 4, dayName: "Jueves", blocks: [], isRestDay: false, notes: "" },
  { id: "day-5", day: 5, dayName: "Viernes", blocks: [], isRestDay: false, notes: "" },
  { id: "day-6", day: 6, dayName: "Sábado", blocks: [], isRestDay: true, notes: "" },
  { id: "day-7", day: 7, dayName: "Domingo", blocks: [], isRestDay: true, notes: "" },
];

const CATEGORY_OPTIONS = [
  { value: "fuerza", label: "Fuerza" },
  { value: "cardio", label: "Cardio" },
  { value: "flexibilidad", label: "Flexibilidad" },
  { value: "core", label: "Core" },
  { value: "calentamiento", label: "Calentamiento" },
  { value: "estiramiento", label: "Estiramiento" },
];

const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

export function WorkoutBuilder({
  blocks,
  onChange,
  availableExercises,
  exerciseFavorites = [],
  onToggleExerciseFavorite,
  onCreateExercise,
  alternativesCounts,
}: WorkoutBuilderProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>(
    blocks.map((b) => b.id)
  );
  const [
    exerciseModalOpened,
    { open: openExerciseModal, close: closeExerciseModal },
  ] = useDisclosure(false);
  const [createExerciseModalOpened, { open: openCreateExerciseModal, close: closeCreateExerciseModal }] = useDisclosure(false);
  void openCreateExerciseModal; // Used in "Crear ejercicio" button when onCreateExercise is provided
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseFilter, setExerciseFilter] = useState<string>("all"); // "all" | "favorites" | category
  const [exerciseMuscleGroups, setExerciseMuscleGroups] = useState<string[]>([]);
  const [exerciseEquipment, setExerciseEquipment] = useState<string[]>([]);
  
  const createExerciseForm = useForm({
    initialValues: {
      name: "",
      category: "",
      muscle_groups: [] as string[],
      equipment: [] as string[],
      difficulty: "intermediate" as string,
      description: "",
    },
    validate: {
      name: (v: string) => (v.trim().length < 2 ? "Nombre requerido (mín. 2 caracteres)" : null),
    },
  });
  
  // Helper para verificar si un ejercicio es favorito
  const isExerciseFavorite = (exerciseId: string) => exerciseFavorites.includes(exerciseId);

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((prev) =>
      prev.includes(blockId)
        ? prev.filter((id) => id !== blockId)
        : [...prev, blockId]
    );
  };

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, type } = result;

      if (!destination) return;

      if (type === "block") {
        const newBlocks = Array.from(blocks);
        const [removed] = newBlocks.splice(source.index, 1);
        newBlocks.splice(destination.index, 0, removed);
        onChange(newBlocks);
        return;
      }

      if (type === "exercise") {
        const sourceBlockIndex = blocks.findIndex(
          (b) => b.id === source.droppableId
        );
        const destBlockIndex = blocks.findIndex(
          (b) => b.id === destination.droppableId
        );

        if (sourceBlockIndex === -1 || destBlockIndex === -1) return;

        const newBlocks = [...blocks];

        if (sourceBlockIndex === destBlockIndex) {
          const block = { ...newBlocks[sourceBlockIndex] };
          const exercises = Array.from(block.exercises);
          const [removed] = exercises.splice(source.index, 1);
          exercises.splice(destination.index, 0, removed);
          block.exercises = exercises.map((e, i) => ({ ...e, order: i }));
          newBlocks[sourceBlockIndex] = block;
        } else {
          const sourceBlock = { ...newBlocks[sourceBlockIndex] };
          const destBlock = { ...newBlocks[destBlockIndex] };
          const sourceExercises = Array.from(sourceBlock.exercises);
          const destExercises = Array.from(destBlock.exercises);
          const [removed] = sourceExercises.splice(source.index, 1);
          destExercises.splice(destination.index, 0, removed);
          sourceBlock.exercises = sourceExercises.map((e, i) => ({
            ...e,
            order: i,
          }));
          destBlock.exercises = destExercises.map((e, i) => ({
            ...e,
            order: i,
          }));
          newBlocks[sourceBlockIndex] = sourceBlock;
          newBlocks[destBlockIndex] = destBlock;
        }

        onChange(newBlocks);
      }
    },
    [blocks, onChange]
  );

  const addBlock = (type: WorkoutBlock["type"]) => {
    const newBlock: WorkoutBlock = {
      id: `block-${Date.now()}`,
      name:
        type === "warmup"
          ? "Calentamiento"
          : type === "main"
            ? "Parte Principal"
            : type === "cooldown"
              ? "Vuelta a la calma"
              : type === "superset"
                ? "Superserie"
                : "Circuito",
      type,
      exercises: [],
      rest_between_sets: 60,
      rounds: type === "circuit" ? 3 : undefined,
    };
    onChange([...blocks, newBlock]);
    setExpandedBlocks((prev) => [...prev, newBlock.id]);
  };

  const removeBlock = (blockId: string) => {
    onChange(blocks.filter((b) => b.id !== blockId));
  };

  const duplicateBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const newBlock: WorkoutBlock = {
      ...block,
      id: `block-${Date.now()}`,
      exercises: block.exercises.map((e) => ({
        ...e,
        id: `ex-${Date.now()}-${Math.random()}`,
      })),
    };
    const index = blocks.findIndex((b) => b.id === blockId);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onChange(newBlocks);
  };

  const updateBlock = useCallback((blockId: string, updates: Partial<WorkoutBlock>) => {
    onChange(blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)));
  }, [blocks, onChange]);

  const openAddExercise = (blockId: string) => {
    setSelectedBlockId(blockId);
    openExerciseModal();
  };

  const addExerciseToBlock = (exercise: Exercise) => {
    if (!selectedBlockId) return;
    const block = blocks.find((b) => b.id === selectedBlockId);
    if (!block) return;

    const newExercise: WorkoutExercise = {
      id: `ex-${Date.now()}`,
      exercise_id: exercise.id,
      exercise,
      sets: 3,
      reps: "10-12",
      rest_seconds: 60,
      duration_type: "reps",
      order: block.exercises.length,
    };

    updateBlock(selectedBlockId, {
      exercises: [...block.exercises, newExercise],
    });
    closeExerciseModal();
  };

  const handleCreateExercise = async () => {
    if (!onCreateExercise) return;
    const values = createExerciseForm.values;
    try {
      const newExercise = await onCreateExercise({
        name: values.name.trim(),
        category: values.category || undefined,
        muscle_groups: values.muscle_groups,
        equipment: values.equipment,
        difficulty: values.difficulty,
        description: values.description.trim() || undefined,
      });
      closeCreateExerciseModal();
      createExerciseForm.reset();
      addExerciseToBlock(newExercise);
    } catch {
      // Error handled by mutation
    }
  };

  const updateExercise = useCallback((
    blockId: string,
    exerciseId: string,
    updates: Partial<WorkoutExercise>
  ) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    updateBlock(blockId, {
      exercises: block.exercises.map((e) =>
        e.id === exerciseId ? { ...e, ...updates } : e
      ),
    });
  }, [blocks, updateBlock]);

  const updateExerciseDebounced = useDebouncedCallback(
    (blockId: string, exerciseId: string, updates: Partial<WorkoutExercise>) => {
      updateExercise(blockId, exerciseId, updates);
    },
    150
  );

  const removeExercise = (blockId: string, exerciseId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    updateBlock(blockId, {
      exercises: block.exercises.filter((e) => e.id !== exerciseId),
    });
  };

  const getBlockColor = (type: WorkoutBlock["type"]) => {
    switch (type) {
      case "warmup":
        return "orange";
      case "main":
        return "blue";
      case "cooldown":
        return "teal";
      case "superset":
        return "grape";
      case "circuit":
        return "pink";
      default:
        return "gray";
    }
  };

  // Obtener el tipo de bloque seleccionado para filtrar ejercicios
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
  const blockType = selectedBlock?.type || "main";

  const filteredExercises = useMemo(() => {
    const searchLower = exerciseSearch.toLowerCase();
    const defaultCategory = blockType === "warmup" ? "calentamiento"
                          : blockType === "cooldown" ? "estiramiento"
                          : null;

    const filtered = availableExercises.filter((e) => {
      const matchesSearch =
        e.name.toLowerCase().includes(searchLower) ||
        e.muscle_groups.some((m) => m.toLowerCase().includes(searchLower));

      const matchesMuscleGroups =
        exerciseMuscleGroups.length === 0 ||
        exerciseMuscleGroups.some((selected) =>
          e.muscle_groups.some((m) => m.toLowerCase().includes(selected.toLowerCase()))
        );

      const matchesEquipment =
        exerciseEquipment.length === 0 ||
        exerciseEquipment.some((selected) =>
          e.equipment.some((eq) => eq.toLowerCase().includes(selected.toLowerCase()))
        );

      const matchesFavorites = exerciseFilter === "favorites" ? isExerciseFavorite(e.id) : true;

      let matchesCategory = true;
      if (exerciseFilter === "all" || exerciseFilter === "favorites") {
        if (defaultCategory) {
          matchesCategory = e.category?.toLowerCase() === defaultCategory;
        }
      } else {
        matchesCategory = e.category?.toLowerCase() === exerciseFilter.toLowerCase();
      }

      return matchesSearch && matchesMuscleGroups && matchesEquipment && matchesFavorites && matchesCategory;
    });

    return filtered.sort((a, b) => {
      const aFav = isExerciseFavorite(a.id) ? 0 : 1;
      const bFav = isExerciseFavorite(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [availableExercises, exerciseSearch, exerciseMuscleGroups, exerciseEquipment, exerciseFilter, exerciseFavorites, blockType]);

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="blocks" type="block">
          {(provided) => (
            <Stack
              gap="md"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {blocks.map((block, index) => (
                <Draggable draggableId={block.id} index={index} key={block.id}>
                  {(provided, snapshot) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      radius="lg"
                      style={{
                        ...provided.draggableProps.style,
                        boxShadow: snapshot.isDragging
                          ? "0 8px 24px rgba(0,0,0,0.15)"
                          : undefined,
                      }}
                      withBorder
                    >
                      {/* Block Header */}
                      <Group
                        justify="space-between"
                        p="md"
                        style={{
                          backgroundColor: `var(--mantine-color-${getBlockColor(block.type)}-0)`,
                          borderBottom: expandedBlocks.includes(block.id)
                            ? "1px solid var(--mantine-color-gray-2)"
                            : undefined,
                          borderRadius: expandedBlocks.includes(block.id)
                            ? "16px 16px 0 0"
                            : "16px",
                        }}
                      >
                        <Group gap="sm">
                          <Box
                            {...provided.dragHandleProps}
                            style={{ cursor: "grab" }}
                          >
                            <IconGripVertical
                              color="var(--mantine-color-gray-5)"
                              size={18}
                            />
                          </Box>
                          <Badge
                            color={getBlockColor(block.type)}
                            size="sm"
                            variant="light"
                          >
                            {block.type === "warmup"
                              ? "Calentamiento"
                              : block.type === "main"
                                ? "Principal"
                                : block.type === "cooldown"
                                  ? "Vuelta calma"
                                  : block.type === "superset"
                                    ? "Superserie"
                                    : "Circuito"}
                          </Badge>
                          <TextInput
                            fw={600}
                            onChange={(e) =>
                              updateBlock(block.id, { name: e.target.value })
                            }
                            styles={{
                              input: { fontWeight: 600, fontSize: "1rem" },
                            }}
                            value={block.name}
                            variant="unstyled"
                          />
                        </Group>
                        <Group gap="xs">
                          <Text c="dimmed" size="xs">
                            {block.exercises.length} ejercicio
                            {block.exercises.length !== 1 ? "s" : ""}
                          </Text>
                          <ActionIcon
                            color="gray"
                            onClick={() => duplicateBlock(block.id)}
                            variant="subtle"
                          >
                            <IconCopy size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="red"
                            onClick={() => removeBlock(block.id)}
                            variant="subtle"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="gray"
                            onClick={() => toggleBlock(block.id)}
                            variant="subtle"
                          >
                            {expandedBlocks.includes(block.id) ? (
                              <IconChevronUp size={18} />
                            ) : (
                              <IconChevronDown size={18} />
                            )}
                          </ActionIcon>
                        </Group>
                      </Group>

                      {/* Block Content */}
                      <Collapse in={expandedBlocks.includes(block.id)}>
                        <Box p="md">
                          {/* Block Settings */}
                          {(block.type === "circuit" ||
                            block.type === "superset") && (
                            <Group gap="md" mb="md">
                              {block.type === "circuit" && (
                                <NumberInput
                                  label="Rondas"
                                  max={10}
                                  min={1}
                                  onChange={(v) =>
                                    updateBlock(block.id, { rounds: Number(v) })
                                  }
                                  size="xs"
                                  value={block.rounds}
                                  w={100}
                                />
                              )}
                              <NumberInput
                                label="Descanso entre series (seg)"
                                max={300}
                                min={0}
                                onChange={(v) =>
                                  updateBlock(block.id, {
                                    rest_between_sets: Number(v),
                                  })
                                }
                                size="xs"
                                step={15}
                                value={block.rest_between_sets}
                                w={180}
                              />
                            </Group>
                          )}

                          {/* Exercises */}
                          <Droppable droppableId={block.id} type="exercise">
                            {(provided) => (
                              <Stack
                                gap="sm"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                              >
                                {block.exercises.map((exercise, exIndex) => (
                                  <Draggable
                                    draggableId={exercise.id}
                                    index={exIndex}
                                    key={exercise.id}
                                  >
                                    {(provided, snapshot) => (
                                      <Card
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        padding="sm"
                                        radius="md"
                                        style={{
                                          ...provided.draggableProps.style,
                                          backgroundColor: snapshot.isDragging
                                            ? "var(--mantine-color-gray-0)"
                                            : undefined,
                                        }}
                                        withBorder
                                      >
                                        <Group
                                          justify="space-between"
                                          wrap="nowrap"
                                        >
                                          <Group
                                            gap="sm"
                                            style={{ flex: 1 }}
                                            wrap="nowrap"
                                          >
                                            <Box
                                              {...provided.dragHandleProps}
                                              style={{ cursor: "grab" }}
                                            >
                                              <IconGripVertical
                                                color="var(--mantine-color-gray-4)"
                                                size={16}
                                              />
                                            </Box>
                                            <ThemeIcon
                                              color={getBlockColor(block.type)}
                                              radius="md"
                                              size="md"
                                              variant="light"
                                            >
                                              <IconBarbell size={14} />
                                            </ThemeIcon>
                                            <Box
                                              style={{ flex: 1, minWidth: 0 }}
                                            >
                                              <Group gap={4} wrap="nowrap">
                                                <Text fw={500} size="sm" truncate>
                                                  {exercise.exercise.name}
                                                </Text>
                                                {alternativesCounts && alternativesCounts[exercise.exercise.id] && (
                                                  <Tooltip label={`${alternativesCounts[exercise.exercise.id]} alternativa(s) definida(s)`}>
                                                    <Badge size="xs" variant="light" color="green" leftSection={<IconExchange size={8} />} style={{ cursor: "default" }}>
                                                      {alternativesCounts[exercise.exercise.id]}
                                                    </Badge>
                                                  </Tooltip>
                                                )}
                                              </Group>
                                              <Group gap={4}>
                                                {exercise.exercise.muscle_groups
                                                  .slice(0, 2)
                                                  .map((m) => (
                                                    <Badge
                                                      color="gray"
                                                      key={m}
                                                      size="xs"
                                                      variant="outline"
                                                    >
                                                      {m}
                                                    </Badge>
                                                  ))}
                                              </Group>
                                            </Box>
                                          </Group>

                                          <Group gap="xs" wrap="wrap">
                                            <NumberInput
                                              leftSection={<IconWeight size={12} />}
                                              min={0}
                                              max={500}
                                              step={0.5}
                                              size="xs"
                                              value={exercise.target_weight ?? ""}
                                              onChange={(v) =>
                                                updateExerciseDebounced(
                                                  block.id,
                                                  exercise.id,
                                                  { target_weight: v ? Number(v) : undefined }
                                                )
                                              }
                                              placeholder="Objet. kg"
                                              w={75}
                                            />
                                            <NumberInput
                                              leftSection={<IconRepeat size={12} />}
                                              min={0}
                                              max={100}
                                              size="xs"
                                              value={exercise.target_reps ?? ""}
                                              onChange={(v) =>
                                                updateExerciseDebounced(
                                                  block.id,
                                                  exercise.id,
                                                  { target_reps: v ? Number(v) : undefined }
                                                )
                                              }
                                              placeholder="Objet. reps"
                                              w={75}
                                            />
                                            <NumberInput
                                              leftSection={
                                                <IconRepeat size={12} />
                                              }
                                              max={20}
                                              min={1}
                                              onChange={(v) =>
                                                updateExerciseDebounced(
                                                  block.id,
                                                  exercise.id,
                                                  { sets: Number(v) }
                                                )
                                              }
                                              size="xs"
                                              value={exercise.sets}
                                              w={60}
                                            />
                                            <Select
                                              data={DURATION_TYPE_OPTIONS}
                                              value={exercise.duration_type ?? "reps"}
                                              onChange={(v) =>
                                                updateExercise(
                                                  block.id,
                                                  exercise.id,
                                                  { duration_type: (v as "reps" | "seconds" | "minutes") ?? "reps" }
                                                )
                                              }
                                              size="xs"
                                              w={100}
                                            />
                                            <TextInput
                                              onChange={(e) =>
                                                updateExercise(
                                                  block.id,
                                                  exercise.id,
                                                  { reps: e.target.value }
                                                )
                                              }
                                              placeholder={
                                                (exercise.duration_type ?? "reps") === "reps"
                                                  ? "Reps"
                                                  : (exercise.duration_type ?? "reps") === "seconds"
                                                    ? "Seg"
                                                    : "Min"
                                              }
                                              size="xs"
                                              value={exercise.reps}
                                              w={70}
                                            />
                                            <NumberInput
                                              label="Descanso (seg)"
                                              leftSection={
                                                <IconClock size={12} />
                                              }
                                              max={300}
                                              min={0}
                                              onChange={(v) =>
                                                updateExerciseDebounced(
                                                  block.id,
                                                  exercise.id,
                                                  { rest_seconds: Number(v) }
                                                )
                                              }
                                              size="xs"
                                              step={15}
                                              value={exercise.rest_seconds}
                                              w={90}
                                            />
                                            <ActionIcon
                                              color="red"
                                              onClick={() =>
                                                removeExercise(
                                                  block.id,
                                                  exercise.id
                                                )
                                              }
                                              size="sm"
                                              variant="subtle"
                                            >
                                              <IconTrash size={14} />
                                            </ActionIcon>
                                          </Group>
                                        </Group>
                                      </Card>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </Stack>
                            )}
                          </Droppable>

                          <Button
                            fullWidth
                            leftSection={<IconPlus size={16} />}
                            mt="md"
                            onClick={() => openAddExercise(block.id)}
                            variant="light"
                          >
                            Añadir Ejercicio
                          </Button>
                        </Box>
                      </Collapse>
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Stack>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Block Buttons */}
      <Divider label="Añadir bloque" labelPosition="center" my="lg" />
      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm">
        <Button
          color="orange"
          leftSection={<IconPlus size={14} />}
          onClick={() => addBlock("warmup")}
          variant="light"
        >
          Calentamiento
        </Button>
        <Button
          color="blue"
          leftSection={<IconPlus size={14} />}
          onClick={() => addBlock("main")}
          variant="light"
        >
          Principal
        </Button>
        <Button
          color="grape"
          leftSection={<IconPlus size={14} />}
          onClick={() => addBlock("superset")}
          variant="light"
        >
          Superserie
        </Button>
        <Button
          color="pink"
          leftSection={<IconPlus size={14} />}
          onClick={() => addBlock("circuit")}
          variant="light"
        >
          Circuito
        </Button>
        <Button
          color="teal"
          leftSection={<IconPlus size={14} />}
          onClick={() => addBlock("cooldown")}
          variant="light"
        >
          Vuelta Calma
        </Button>
      </SimpleGrid>

      {/* Exercise Selection Modal */}
      <Modal
        onClose={() => {
          closeExerciseModal();
          setExerciseSearch("");
          setExerciseFilter("all");
          setExerciseMuscleGroups([]);
          setExerciseEquipment([]);
        }}
        opened={exerciseModalOpened}
        size="lg"
        title={
          blockType === "warmup" 
            ? "Seleccionar Calentamiento" 
            : blockType === "cooldown" 
              ? "Seleccionar Estiramiento" 
              : "Seleccionar Ejercicio"
        }
      >
        <Stack gap="sm">
          <TextInput
            leftSection={<IconSearch size={16} />}
            onChange={(e) => setExerciseSearch(e.target.value)}
            placeholder={
              blockType === "warmup" 
                ? "Buscar calentamientos..." 
                : blockType === "cooldown" 
                  ? "Buscar estiramientos..." 
                  : "Buscar ejercicios..."
            }
            value={exerciseSearch}
          />

          <Group gap="sm">
            <MultiSelect
              data={MUSCLE_GROUPS}
              placeholder="Grupo muscular"
              searchable
              clearable
              value={exerciseMuscleGroups}
              onChange={setExerciseMuscleGroups}
              w="100%"
            />
            <MultiSelect
              data={EQUIPMENT_TYPES}
              placeholder="Equipo"
              searchable
              clearable
              value={exerciseEquipment}
              onChange={setExerciseEquipment}
              w="100%"
            />
          </Group>
          
          <Tabs value={exerciseFilter} onChange={(v) => setExerciseFilter(v || "all")}>
            <Tabs.List style={{ flexWrap: "wrap" }}>
              <Tabs.Tab value="all" leftSection={<IconBarbell size={14} />}>
                Todos
              </Tabs.Tab>
              <Tabs.Tab value="favorites" leftSection={<IconStarFilled size={14} />}>
                Favoritos
              </Tabs.Tab>
              {/* Categorías según el tipo de bloque */}
              {blockType === "warmup" && (
                <Tabs.Tab value="calentamiento" leftSection={<IconFlame size={14} />}>
                  Calentamiento
                </Tabs.Tab>
              )}
              {blockType === "cooldown" && (
                <Tabs.Tab value="estiramiento" leftSection={<IconStretching size={14} />}>
                  Estiramiento
                </Tabs.Tab>
              )}
              {blockType !== "warmup" && blockType !== "cooldown" && (
                <>
                  <Tabs.Tab value="calentamiento" leftSection={<IconFlame size={14} />}>
                    Calentamiento
                  </Tabs.Tab>
                  <Tabs.Tab value="estiramiento" leftSection={<IconStretching size={14} />}>
                    Estiramiento
                  </Tabs.Tab>
                  <Tabs.Tab value="fuerza">Fuerza</Tabs.Tab>
                  <Tabs.Tab value="cardio">Cardio</Tabs.Tab>
                  <Tabs.Tab value="core">Core</Tabs.Tab>
                  <Tabs.Tab value="flexibilidad">Flexibilidad</Tabs.Tab>
                </>
              )}
            </Tabs.List>
          </Tabs>
        </Stack>
        
        <ScrollArea h={350} mt="md">
          <Stack gap="xs">
            {filteredExercises.map((exercise) => {
              const isFav = isExerciseFavorite(exercise.id);
              return (
                <Card
                  key={exercise.id}
                  padding="sm"
                  radius="md"
                  style={{ 
                    cursor: "pointer",
                    borderColor: isFav ? "var(--mantine-color-yellow-5)" : undefined,
                    backgroundColor: isFav ? "var(--mantine-color-yellow-0)" : undefined,
                  }}
                  withBorder
                >
                  <Group justify="space-between">
                    <Group gap="sm" style={{ flex: 1 }} onClick={() => addExerciseToBlock(exercise)}>
                      <ThemeIcon
                        color={blockType === "warmup" ? "orange" : blockType === "cooldown" ? "teal" : "blue"}
                        radius="md"
                        size="lg"
                        variant="light"
                      >
                        {blockType === "warmup" ? <IconFlame size={18} /> :
                         blockType === "cooldown" ? <IconStretching size={18} /> :
                         <IconBarbell size={18} />}
                      </ThemeIcon>
                      <Box>
                        <Group gap="xs">
                          {isFav && <IconStarFilled size={14} color="var(--mantine-color-yellow-6)" />}
                          <Text fw={500} size="sm">
                            {exercise.name}
                          </Text>
                        </Group>
                        <Group gap={4}>
                          {exercise.category && (
                            <Badge size="xs" variant="light" color="gray">
                              {exercise.category}
                            </Badge>
                          )}
                          {exercise.muscle_groups.slice(0, 3).map((m) => (
                            <Badge key={m} size="xs" variant="light">
                              {m}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    </Group>
                    <Group gap="xs">
                      {onToggleExerciseFavorite && (
                        <ActionIcon 
                          color="yellow" 
                          variant={isFav ? "filled" : "subtle"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleExerciseFavorite(exercise.id, isFav);
                          }}
                        >
                          {isFav ? <IconStarFilled size={14} /> : <IconStar size={14} />}
                        </ActionIcon>
                      )}
                      <ActionIcon color="primary" variant="subtle" onClick={() => addExerciseToBlock(exercise)}>
                        <IconCheck size={18} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Card>
              );
            })}
            {filteredExercises.length === 0 && (
              <Text c="dimmed" py="xl" ta="center">
                {blockType === "warmup" 
                  ? "No se encontraron ejercicios de calentamiento. Crea algunos en Entrenamientos > Calentamiento."
                  : blockType === "cooldown"
                    ? "No se encontraron estiramientos. Crea algunos en Entrenamientos > Estiramientos."
                    : exerciseFilter === "favorites"
                      ? "No tienes ejercicios favoritos. Marca algunos con la estrella."
                      : "No se encontraron ejercicios"
                }
              </Text>
            )}
          </Stack>
        </ScrollArea>

        {onCreateExercise && (
          <Button
            fullWidth
            mt="md"
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => openCreateExerciseModal()}
          >
            Crear ejercicio nuevo
          </Button>
        )}
      </Modal>

      {/* Create Exercise Sub-Modal */}
      <Modal
        opened={createExerciseModalOpened}
        onClose={() => { closeCreateExerciseModal(); createExerciseForm.reset(); }}
        title="Crear ejercicio"
        size="md"
      >
        <form onSubmit={createExerciseForm.onSubmit(handleCreateExercise)}>
          <Stack gap="sm">
            <TextInput
              label="Nombre"
              placeholder="Nombre del ejercicio"
              required
              {...createExerciseForm.getInputProps("name")}
            />
            <Select
              data={CATEGORY_OPTIONS}
              label="Categoría"
              placeholder="Selecciona"
              {...createExerciseForm.getInputProps("category")}
            />
            <MultiSelect
              data={MUSCLE_GROUPS}
              label="Grupos musculares"
              placeholder="Selecciona"
              searchable
              clearable
              {...createExerciseForm.getInputProps("muscle_groups")}
            />
            <MultiSelect
              data={EQUIPMENT_TYPES}
              label="Equipamiento"
              placeholder="Selecciona"
              searchable
              clearable
              {...createExerciseForm.getInputProps("equipment")}
            />
            <Select
              data={DIFFICULTY_OPTIONS}
              label="Dificultad"
              {...createExerciseForm.getInputProps("difficulty")}
            />
            <Textarea
              label="Descripción"
              placeholder="Descripción opcional"
              minRows={2}
              {...createExerciseForm.getInputProps("description")}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => { closeCreateExerciseModal(); createExerciseForm.reset(); }}>
                Cancelar
              </Button>
              <Button type="submit" color="green">
                Crear y añadir
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

// ============ NUEVO: WorkoutBuilder con días de la semana ============

const WEEK_DAYS = [
  { id: "day-1", dayName: "Lunes", value: "day-1" },
  { id: "day-2", dayName: "Martes", value: "day-2" },
  { id: "day-3", dayName: "Miércoles", value: "day-3" },
  { id: "day-4", dayName: "Jueves", value: "day-4" },
  { id: "day-5", dayName: "Viernes", value: "day-5" },
  { id: "day-6", dayName: "Sábado", value: "day-6" },
  { id: "day-7", dayName: "Domingo", value: "day-7" },
];

export function WorkoutBuilderWithDays({
  days,
  onChangeDays,
  availableExercises,
  selectedClient,
  exerciseFavorites = [],
  onToggleExerciseFavorite,
  onCreateExercise,
}: WorkoutBuilderWithDaysProps) {
  const [activeDay, setActiveDay] = useState<string>(days[0]?.id || "day-1");
  const [copyDaysPopoverOpened, setCopyDaysPopoverOpened] = useState(false);
  const [copyToDayIds, setCopyToDayIds] = useState<string[]>([]);
  const { data: alternativesCounts } = useAlternativesCounts();

  const currentDay = days.find((d) => d.id === activeDay);

  const handleBlocksChange = useCallback((newBlocks: WorkoutBlock[]) => {
    onChangeDays(
      days.map((d) =>
        d.id === activeDay ? { ...d, blocks: newBlocks } : d
      )
    );
  }, [days, activeDay, onChangeDays]);

  // Toggle día de descanso
  const toggleRestDay = (dayId: string) => {
    onChangeDays(
      days.map((d) =>
        d.id === dayId ? { ...d, isRestDay: !d.isRestDay, blocks: d.isRestDay ? [] : d.blocks } : d
      )
    );
  };

  // Copiar día actual a los días seleccionados
  const copyToSelectedDays = () => {
    if (!currentDay || copyToDayIds.length === 0) return;

    onChangeDays(
      days.map((d) =>
        d.id === activeDay || !copyToDayIds.includes(d.id)
          ? d
          : {
              ...d,
              blocks: currentDay.blocks.map((b) => ({
                ...b,
                id: `block-${Date.now()}-${Math.random()}`,
                exercises: b.exercises.map((e) => ({
                  ...e,
                  id: `ex-${Date.now()}-${Math.random()}`,
                })),
              })),
              isRestDay: false,
            }
      )
    );
    setCopyDaysPopoverOpened(false);
    setCopyToDayIds([]);
  };

  // Contar ejercicios del día
  const getDayExerciseCount = (day: WorkoutDay) => {
    if (day.isRestDay) return 0;
    return day.blocks.reduce((sum, b) => sum + b.exercises.length, 0);
  };

  return (
    <Box>
      {selectedClient && (
        <Box mb="md" p="sm" style={{ background: "var(--nv-surface-subtle)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
          <Group gap="sm">
            <Avatar size={36} radius="xl">{selectedClient.first_name?.[0] || "?"}</Avatar>
            <Box>
              <Text size="sm" fw={600}>{selectedClient.first_name} {selectedClient.last_name}</Text>
              <Text size="xs" c="dimmed">
                {selectedClient.goals || "Sin objetivos"}
              </Text>
              {selectedClient.health_data?.injuries?.length ? (
                <Group gap={4} mt={4}>
                  {selectedClient.health_data.injuries.map((inj: { name: string; notes?: string; status?: string }, idx: number) => (
                    <Badge key={idx} size="xs" color="orange" variant="light" title={inj.notes}>
                      {inj.name}{inj.status ? ` (${inj.status})` : ""}
                    </Badge>
                  ))}
                </Group>
              ) : null}
            </Box>
          </Group>
        </Box>
      )}

      {/* Resumen de la semana */}
      <Paper p="md" radius="lg" mb="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>Resumen Semanal</Text>
          <Popover
            opened={copyDaysPopoverOpened}
            onChange={setCopyDaysPopoverOpened}
            position="bottom-end"
          >
            <Popover.Target>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconCopy size={14} />}
                disabled={!currentDay || currentDay.blocks.length === 0}
                onClick={() => {
                  setCopyDaysPopoverOpened((o) => !o);
                  setCopyToDayIds(days.filter((d) => d.id !== activeDay).map((d) => d.id));
                }}
              >
                Copiar día a...
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="sm">
                <Text size="sm" fw={500}>Copiar a días:</Text>
                <Checkbox.Group value={copyToDayIds} onChange={setCopyToDayIds}>
                  <Stack gap="xs">
                    {WEEK_DAYS.filter((wd) => wd.id !== activeDay).map((wd) => (
                      <Checkbox key={wd.id} value={wd.id} label={wd.dayName} size="sm" />
                    ))}
                  </Stack>
                </Checkbox.Group>
                <Button size="xs" leftSection={<IconCopy size={12} />} onClick={copyToSelectedDays} disabled={copyToDayIds.length === 0}>
                  Copiar
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
        <SimpleGrid cols={7}>
          {days.map((day) => (
            <Paper
              key={day.id}
              p="xs"
              radius="md"
              withBorder
              style={{
                borderColor: day.id === activeDay ? "var(--mantine-color-blue-5)" : undefined,
                backgroundColor: day.isRestDay ? "var(--mantine-color-gray-0)" : undefined,
                cursor: "pointer",
              }}
              onClick={() => setActiveDay(day.id)}
            >
              <Text ta="center" size="xs" fw={600}>
                {day.dayName.slice(0, 3)}
              </Text>
              <Text ta="center" size="xs" c={day.isRestDay ? "dimmed" : "blue"}>
                {day.isRestDay ? "Descanso" : `${getDayExerciseCount(day)} ej.`}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Paper>

      {/* Tabs por día */}
      <Tabs value={activeDay} onChange={(v) => setActiveDay(v || days[0]?.id)}>
        <Tabs.List mb="md">
          {days.map((day) => (
            <Tabs.Tab
              key={day.id}
              value={day.id}
              color={day.isRestDay ? "gray" : "blue"}
              leftSection={
                day.isRestDay ? undefined : (
                  <Badge size="xs" variant="filled" color="blue">
                    {getDayExerciseCount(day)}
                  </Badge>
                )
              }
            >
              {day.dayName}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {currentDay && (
          <Tabs.Panel key={currentDay.id} value={currentDay.id}>
            <Group mb="md" justify="space-between">
              <Group gap="sm">
                <Button
                  variant={currentDay.isRestDay ? "filled" : "light"}
                  color={currentDay.isRestDay ? "gray" : "blue"}
                  size="xs"
                  onClick={() => toggleRestDay(currentDay.id)}
                >
                  {currentDay.isRestDay ? "Marcar como día de entrenamiento" : "Marcar como día de descanso"}
                </Button>
              </Group>
            </Group>

            {currentDay.isRestDay ? (
              <Paper p="xl" ta="center" radius="lg" withBorder>
                <Text c="dimmed" size="lg">🛌 Día de descanso</Text>
                <Text c="dimmed" size="sm" mt="xs">
                  Este día está marcado como descanso. Haz clic en el botón para añadir entrenamiento.
                </Text>
              </Paper>
            ) : (
              <WorkoutBuilder
                blocks={currentDay.blocks}
                onChange={handleBlocksChange}
                availableExercises={availableExercises}
                exerciseFavorites={exerciseFavorites}
                onToggleExerciseFavorite={onToggleExerciseFavorite}
                onCreateExercise={onCreateExercise}
                alternativesCounts={alternativesCounts}
              />
            )}
          </Tabs.Panel>
        )}
      </Tabs>
    </Box>
  );
}
