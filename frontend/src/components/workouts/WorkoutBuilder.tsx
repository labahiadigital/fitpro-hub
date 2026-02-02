import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBarbell,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCopy,
  IconFlame,
  IconGripVertical,
  IconPlus,
  IconRepeat,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconStretching,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useExerciseFavorites, useToggleExerciseFavorite } from "../../hooks/useFavorites";

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
  notes?: string;
  order: number;
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
}

// Props con días de la semana
interface WorkoutBuilderWithDaysProps {
  days: WorkoutDay[];
  onChangeDays: (days: WorkoutDay[]) => void;
  availableExercises: Exercise[];
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

export function WorkoutBuilder({
  blocks,
  onChange,
  availableExercises,
}: WorkoutBuilderProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>(
    blocks.map((b) => b.id)
  );
  const [
    exerciseModalOpened,
    { open: openExerciseModal, close: closeExerciseModal },
  ] = useDisclosure(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseFilter, setExerciseFilter] = useState<string>("all"); // "all" | "favorites"
  
  // Favoritos
  const { data: favorites = [] } = useExerciseFavorites();
  const toggleFavorite = useToggleExerciseFavorite();

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

  const updateBlock = (blockId: string, updates: Partial<WorkoutBlock>) => {
    onChange(blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)));
  };

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
      order: block.exercises.length,
    };

    updateBlock(selectedBlockId, {
      exercises: [...block.exercises, newExercise],
    });
    closeExerciseModal();
  };

  const updateExercise = (
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
  };

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

  const filteredExercises = availableExercises.filter((e) => {
    // Filtro por búsqueda
    const matchesSearch =
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.muscle_groups.some((m) =>
        m.toLowerCase().includes(exerciseSearch.toLowerCase())
      );
    
    // Filtro por favoritos
    const matchesFavorites = exerciseFilter === "all" || favorites.includes(e.id);
    
    // Filtro por categoría según tipo de bloque
    let matchesCategory = true;
    if (blockType === "warmup") {
      // Para calentamiento, mostrar ejercicios de calentamiento
      matchesCategory = e.category?.toLowerCase() === "calentamiento";
    } else if (blockType === "cooldown") {
      // Para vuelta calma, mostrar estiramientos
      matchesCategory = e.category?.toLowerCase() === "estiramiento";
    }
    // Para main, superset, circuit - mostrar todos (o los que no son calentamiento/estiramiento)
    
    return matchesSearch && matchesFavorites && matchesCategory;
  });

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
                                              <Text fw={500} size="sm" truncate>
                                                {exercise.exercise.name}
                                              </Text>
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

                                          <Group gap="xs" wrap="nowrap">
                                            <NumberInput
                                              leftSection={
                                                <IconRepeat size={12} />
                                              }
                                              max={20}
                                              min={1}
                                              onChange={(v) =>
                                                updateExercise(
                                                  block.id,
                                                  exercise.id,
                                                  { sets: Number(v) }
                                                )
                                              }
                                              size="xs"
                                              value={exercise.sets}
                                              w={60}
                                            />
                                            <TextInput
                                              onChange={(e) =>
                                                updateExercise(
                                                  block.id,
                                                  exercise.id,
                                                  { reps: e.target.value }
                                                )
                                              }
                                              placeholder="Reps"
                                              size="xs"
                                              value={exercise.reps}
                                              w={70}
                                            />
                                            <NumberInput
                                              leftSection={
                                                <IconClock size={12} />
                                              }
                                              max={300}
                                              min={0}
                                              onChange={(v) =>
                                                updateExercise(
                                                  block.id,
                                                  exercise.id,
                                                  { rest_seconds: Number(v) }
                                                )
                                              }
                                              size="xs"
                                              step={15}
                                              value={exercise.rest_seconds}
                                              w={70}
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
        onClose={() => { closeExerciseModal(); setExerciseSearch(""); setExerciseFilter("all"); }}
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
          
          <Tabs value={exerciseFilter} onChange={(v) => setExerciseFilter(v || "all")}>
            <Tabs.List>
              <Tabs.Tab value="all" leftSection={
                blockType === "warmup" ? <IconFlame size={14} /> :
                blockType === "cooldown" ? <IconStretching size={14} /> :
                <IconBarbell size={14} />
              }>
                Todos
              </Tabs.Tab>
              <Tabs.Tab value="favorites" leftSection={<IconStarFilled size={14} />}>
                Favoritos
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Stack>
        
        <ScrollArea h={350} mt="md">
          <Stack gap="xs">
            {filteredExercises.map((exercise) => {
              const isFavorite = favorites.includes(exercise.id);
              return (
                <Card
                  key={exercise.id}
                  padding="sm"
                  radius="md"
                  style={{ cursor: "pointer" }}
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
                        <Text fw={500} size="sm">
                          {exercise.name}
                        </Text>
                        <Group gap={4}>
                          {exercise.muscle_groups.slice(0, 3).map((m) => (
                            <Badge key={m} size="xs" variant="light">
                              {m}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    </Group>
                    <Group gap="xs">
                      <ActionIcon 
                        color="yellow" 
                        variant={isFavorite ? "filled" : "subtle"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite.mutate({ exerciseId: exercise.id, isFavorite });
                        }}
                      >
                        {isFavorite ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                      </ActionIcon>
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
      </Modal>
    </>
  );
}

// ============ NUEVO: WorkoutBuilder con días de la semana ============

export function WorkoutBuilderWithDays({
  days,
  onChangeDays,
  availableExercises,
}: WorkoutBuilderWithDaysProps) {
  const [activeDay, setActiveDay] = useState<string>(days[0]?.id || "day-1");

  const currentDay = days.find((d) => d.id === activeDay);

  // Handler para actualizar bloques del día actual
  const handleBlocksChange = (newBlocks: WorkoutBlock[]) => {
    onChangeDays(
      days.map((d) =>
        d.id === activeDay ? { ...d, blocks: newBlocks } : d
      )
    );
  };

  // Toggle día de descanso
  const toggleRestDay = (dayId: string) => {
    onChangeDays(
      days.map((d) =>
        d.id === dayId ? { ...d, isRestDay: !d.isRestDay, blocks: d.isRestDay ? [] : d.blocks } : d
      )
    );
  };

  // Copiar día actual a todos
  const copyToAllDays = () => {
    if (!currentDay) return;

    onChangeDays(
      days.map((d) =>
        d.id === activeDay
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
  };

  // Contar ejercicios del día
  const getDayExerciseCount = (day: WorkoutDay) => {
    if (day.isRestDay) return 0;
    return day.blocks.reduce((sum, b) => sum + b.exercises.length, 0);
  };

  return (
    <Box>
      {/* Resumen de la semana */}
      <Paper p="md" radius="lg" mb="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>Resumen Semanal</Text>
          <Button
            variant="light"
            size="xs"
            leftSection={<IconCopy size={14} />}
            onClick={copyToAllDays}
            disabled={!currentDay || currentDay.blocks.length === 0}
          >
            Copiar a todos los días
          </Button>
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

        {days.map((day) => (
          <Tabs.Panel key={day.id} value={day.id}>
            {/* Opciones del día */}
            <Group mb="md" justify="space-between">
              <Group gap="sm">
                <Button
                  variant={day.isRestDay ? "filled" : "light"}
                  color={day.isRestDay ? "gray" : "blue"}
                  size="xs"
                  onClick={() => toggleRestDay(day.id)}
                >
                  {day.isRestDay ? "Marcar como día de entrenamiento" : "Marcar como día de descanso"}
                </Button>
              </Group>
            </Group>

            {day.isRestDay ? (
              <Paper p="xl" ta="center" radius="lg" withBorder>
                <Text c="dimmed" size="lg">🛌 Día de descanso</Text>
                <Text c="dimmed" size="sm" mt="xs">
                  Este día está marcado como descanso. Haz clic en el botón para añadir entrenamiento.
                </Text>
              </Paper>
            ) : (
              <WorkoutBuilder
                blocks={day.blocks}
                onChange={handleBlocksChange}
                availableExercises={availableExercises}
              />
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Box>
  );
}
