import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  HoverCard,
  Image,
  Modal,
  MultiSelect,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBarbell,
  IconFilter,
  IconHeart,
  IconHeartFilled,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { BottomSheet } from "../common/BottomSheet";

interface Exercise {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  muscleGroups: string[];
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  isFavorite: boolean;
  isGlobal: boolean;
}

interface ExerciseLibraryProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  exercises: Exercise[];
  onToggleFavorite: (exerciseId: string) => void;
}

const muscleGroupOptions = [
  { value: "chest", label: "Pecho" },
  { value: "back", label: "Espalda" },
  { value: "shoulders", label: "Hombros" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "legs", label: "Piernas" },
  { value: "glutes", label: "Glúteos" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Cuerpo Completo" },
];

const equipmentOptions = [
  { value: "none", label: "Sin equipo" },
  { value: "dumbbells", label: "Mancuernas" },
  { value: "barbell", label: "Barra" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "resistance_bands", label: "Bandas elásticas" },
  { value: "cable", label: "Poleas" },
  { value: "machine", label: "Máquina" },
  { value: "bench", label: "Banco" },
  { value: "pull_up_bar", label: "Barra de dominadas" },
];

const difficultyColors: Record<string, string> = {
  beginner: "green",
  intermediate: "yellow",
  advanced: "red",
};

const difficultyLabels: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export function ExerciseLibrary({
  opened,
  onClose,
  onSelect,
  exercises,
  onToggleFavorite,
}: ExerciseLibraryProps) {
  const [search, setSearch] = useState("");
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string | null>("all");
  const [videoModalExercise, setVideoModalExercise] = useState<Exercise | null>(
    null
  );
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      exercise.name.toLowerCase().includes(search.toLowerCase()) ||
      exercise.description.toLowerCase().includes(search.toLowerCase());
    const matchesMuscles =
      selectedMuscles.length === 0 ||
      selectedMuscles.some((m) => exercise.muscleGroups.includes(m));
    const matchesEquipment =
      selectedEquipment.length === 0 ||
      selectedEquipment.some((e) => exercise.equipment.includes(e));
    const matchesDifficulty =
      !selectedDifficulty || exercise.difficulty === selectedDifficulty;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "favorites" && exercise.isFavorite) ||
      (activeTab === "custom" && !exercise.isGlobal);

    return (
      matchesSearch &&
      matchesMuscles &&
      matchesEquipment &&
      matchesDifficulty &&
      matchesTab
    );
  });

  return (
    <>
      <BottomSheet
        onClose={onClose}
        opened={opened}
        size="xl"
        styles={{ body: { padding: 0 } }}
        title="Biblioteca de Ejercicios"
      >
        <Stack gap={0}>
          {/* Search and Filters */}
          <Stack
            gap="sm"
            p="md"
            style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
          >
            <TextInput
              leftSection={<IconSearch size={16} />}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicios..."
              value={search}
            />
            <Group gap="sm">
              <MultiSelect
                clearable
                data={muscleGroupOptions}
                leftSection={<IconFilter size={14} />}
                onChange={setSelectedMuscles}
                placeholder="Músculos"
                size="xs"
                value={selectedMuscles}
                w={180}
              />
              <MultiSelect
                clearable
                data={equipmentOptions}
                onChange={setSelectedEquipment}
                placeholder="Equipamiento"
                size="xs"
                value={selectedEquipment}
                w={180}
              />
              <Select
                clearable
                data={[
                  { value: "beginner", label: "Principiante" },
                  { value: "intermediate", label: "Intermedio" },
                  { value: "advanced", label: "Avanzado" },
                ]}
                onChange={setSelectedDifficulty}
                placeholder="Dificultad"
                size="xs"
                value={selectedDifficulty}
                w={140}
              />
            </Group>
          </Stack>

          {/* Tabs */}
          <Tabs onChange={setActiveTab} value={activeTab}>
            <Tabs.List px="md">
              <Tabs.Tab value="all">Todos ({exercises.length})</Tabs.Tab>
              <Tabs.Tab value="favorites">
                Favoritos ({exercises.filter((e) => e.isFavorite).length})
              </Tabs.Tab>
              <Tabs.Tab value="custom">
                Personalizados ({exercises.filter((e) => !e.isGlobal).length})
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {/* Exercise Grid */}
          <ScrollArea h={400} p="md">
            {filteredExercises.length === 0 ? (
              <Text c="dimmed" py="xl" ta="center">
                No se encontraron ejercicios
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {filteredExercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    onClick={() => onSelect(exercise)}
                    padding="sm"
                    radius="md"
                    style={{ cursor: "pointer" }}
                    withBorder
                  >
                    <Card.Section>
                      <div
                        style={{
                          position: "relative",
                          height: 120,
                          background: "var(--mantine-color-gray-1)",
                        }}
                      >
                        {exercise.thumbnailUrl ? (
                          <HoverCard width={320} shadow="lg" position="right" withArrow openDelay={200} closeDelay={100}>
                            <HoverCard.Target>
                              <Box
                                style={{ cursor: "zoom-in", height: 120 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewExercise(exercise);
                                }}
                              >
                                <Image
                                  alt={exercise.name}
                                  height={120}
                                  src={exercise.thumbnailUrl}
                                />
                              </Box>
                            </HoverCard.Target>
                            <HoverCard.Dropdown p={0} style={{ overflow: "hidden", borderRadius: 12 }}>
                              <Image
                                alt={exercise.name}
                                src={exercise.thumbnailUrl}
                                height={240}
                                fit="cover"
                              />
                              <Box p="xs">
                                <Text fw={600} size="sm">{exercise.name}</Text>
                                {exercise.muscleGroups.length > 0 && (
                                  <Group gap={4} mt={4}>
                                    {exercise.muscleGroups.map((m) => (
                                      <Badge key={m} size="xs" variant="outline">
                                        {muscleGroupOptions.find((o) => o.value === m)?.label || m}
                                      </Badge>
                                    ))}
                                  </Group>
                                )}
                              </Box>
                            </HoverCard.Dropdown>
                          </HoverCard>
                        ) : (
                          <div
                            style={{
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ThemeIcon color="gray" size="xl" variant="light">
                              <IconBarbell size={24} />
                            </ThemeIcon>
                          </div>
                        )}
                        {exercise.videoUrl && (
                          <ActionIcon
                            color="dark"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVideoModalExercise(exercise);
                            }}
                            radius="xl"
                            size="md"
                            style={{
                              position: "absolute",
                              bottom: 8,
                              right: 8,
                            }}
                            variant="filled"
                          >
                            <IconPlayerPlay size={14} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          color={exercise.isFavorite ? "red" : "gray"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(exercise.id);
                          }}
                          size="sm"
                          style={{ position: "absolute", top: 8, right: 8 }}
                          variant="subtle"
                        >
                          {exercise.isFavorite ? (
                            <IconHeartFilled size={16} />
                          ) : (
                            <IconHeart size={16} />
                          )}
                        </ActionIcon>
                      </div>
                    </Card.Section>

                    {/* Content */}
                    <Stack gap={4} mt="sm">
                      <Group gap={4} justify="space-between">
                        <Text fw={600} lineClamp={1} size="sm">
                          {exercise.name}
                        </Text>
                        <Badge
                          color={difficultyColors[exercise.difficulty]}
                          size="xs"
                        >
                          {difficultyLabels[exercise.difficulty]}
                        </Badge>
                      </Group>
                      <Group gap={4}>
                        {exercise.muscleGroups.slice(0, 2).map((muscle) => (
                          <Badge key={muscle} size="xs" variant="outline">
                            {muscleGroupOptions.find((m) => m.value === muscle)
                              ?.label || muscle}
                          </Badge>
                        ))}
                        {exercise.muscleGroups.length > 2 && (
                          <Badge color="gray" size="xs" variant="outline">
                            +{exercise.muscleGroups.length - 2}
                          </Badge>
                        )}
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </ScrollArea>

          {/* Footer */}
          <Group
            justify="space-between"
            p="md"
            style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
          >
            <Text c="dimmed" size="sm">
              {filteredExercises.length} ejercicios encontrados
            </Text>
            <Button leftSection={<IconPlus size={16} />} variant="light">
              Crear Ejercicio
            </Button>
          </Group>
        </Stack>
      </BottomSheet>

      {/* Video Modal */}
      <BottomSheet
        onClose={() => setVideoModalExercise(null)}
        opened={!!videoModalExercise}
        size="lg"
        title={videoModalExercise?.name}
      >
        {videoModalExercise && (
          <Stack>
            {videoModalExercise.videoUrl && (
              <video
                controls
                src={videoModalExercise.videoUrl}
                style={{ width: "100%", borderRadius: 8 }}
              />
            )}
            <Text size="sm">{videoModalExercise.description}</Text>
            {videoModalExercise.instructions.length > 0 && (
              <>
                <Text fw={600} size="sm">
                  Instrucciones:
                </Text>
                <Stack gap={4}>
                  {videoModalExercise.instructions.map((instruction, i) => (
                    <Text c="dimmed" key={i} size="sm">
                      {i + 1}. {instruction}
                    </Text>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        )}
      </BottomSheet>

      {/* Image Preview Modal */}
      <Modal
        opened={!!previewExercise}
        onClose={() => setPreviewExercise(null)}
        size="lg"
        padding={0}
        withCloseButton={false}
        centered
        radius="lg"
        styles={{ body: { padding: 0 }, content: { overflow: "hidden" } }}
      >
        {previewExercise && (
          <Box pos="relative">
            <Image
              alt={previewExercise.name}
              src={previewExercise.thumbnailUrl}
              fit="contain"
              mah="70vh"
              style={{ background: "#000" }}
            />
            <ActionIcon
              variant="filled"
              color="dark"
              radius="xl"
              size="lg"
              onClick={() => setPreviewExercise(null)}
              style={{ position: "absolute", top: 12, right: 12 }}
            >
              <IconX size={18} />
            </ActionIcon>
            <Box p="md">
              <Text fw={700} size="lg">{previewExercise.name}</Text>
              <Group gap={6} mt={4}>
                <Badge color={difficultyColors[previewExercise.difficulty]} size="sm">
                  {difficultyLabels[previewExercise.difficulty]}
                </Badge>
                {previewExercise.muscleGroups.map((m) => (
                  <Badge key={m} size="sm" variant="outline">
                    {muscleGroupOptions.find((o) => o.value === m)?.label || m}
                  </Badge>
                ))}
              </Group>
              {previewExercise.description && (
                <Text size="sm" c="dimmed" mt="xs">{previewExercise.description}</Text>
              )}
            </Box>
          </Box>
        )}
      </Modal>
    </>
  );
}
