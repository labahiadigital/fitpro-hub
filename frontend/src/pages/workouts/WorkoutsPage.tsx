import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Drawer,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBarbell,
  IconCopy,
  IconEdit,
  IconEye,
  IconSearch,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { WorkoutBuilder } from "../../components/workouts/WorkoutBuilder";
import {
  useCreateExercise,
  useCreateWorkoutProgram,
  useExercises,
  useWorkoutPrograms,
} from "../../hooks/useWorkouts";

// Mock exercises data
const mockExercises = [
  {
    id: "1",
    name: "Press de Banca",
    muscle_groups: ["pecho", "tríceps"],
    equipment: ["barra", "banco"],
    image_url: "",
  },
  {
    id: "2",
    name: "Sentadilla",
    muscle_groups: ["cuádriceps", "glúteos"],
    equipment: ["barra"],
    image_url: "",
  },
  {
    id: "3",
    name: "Peso Muerto",
    muscle_groups: ["espalda", "isquiotibiales"],
    equipment: ["barra"],
    image_url: "",
  },
  {
    id: "4",
    name: "Dominadas",
    muscle_groups: ["espalda", "bíceps"],
    equipment: ["barra de dominadas"],
    image_url: "",
  },
  {
    id: "5",
    name: "Press Militar",
    muscle_groups: ["hombros", "tríceps"],
    equipment: ["barra"],
    image_url: "",
  },
  {
    id: "6",
    name: "Curl de Bíceps",
    muscle_groups: ["bíceps"],
    equipment: ["mancuernas"],
    image_url: "",
  },
  {
    id: "7",
    name: "Extensión de Tríceps",
    muscle_groups: ["tríceps"],
    equipment: ["mancuernas"],
    image_url: "",
  },
  {
    id: "8",
    name: "Zancadas",
    muscle_groups: ["cuádriceps", "glúteos"],
    equipment: ["mancuernas"],
    image_url: "",
  },
  {
    id: "9",
    name: "Plancha",
    muscle_groups: ["core"],
    equipment: ["ninguno"],
    image_url: "",
  },
  {
    id: "10",
    name: "Remo con Barra",
    muscle_groups: ["espalda", "bíceps"],
    equipment: ["barra"],
    image_url: "",
  },
];

export function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("programs");
  const [
    exerciseModalOpened,
    { open: openExerciseModal, close: closeExerciseModal },
  ] = useDisclosure(false);
  useDisclosure(false);
  const [builderOpened, { open: openBuilder, close: closeBuilder }] =
    useDisclosure(false);
  const [searchExercise, setSearchExercise] = useState("");
  const [workoutBlocks, setWorkoutBlocks] = useState<any[]>([]);
  const [editingProgram, setEditingProgram] = useState<any>(null);

  const { data: exercises = mockExercises, isLoading: loadingExercises } =
    useExercises({ search: searchExercise });
  const { data: programs, isLoading: loadingPrograms } =
    useWorkoutPrograms(true);
  const createExercise = useCreateExercise();
  const createProgram = useCreateWorkoutProgram();

  const exerciseForm = useForm({
    initialValues: {
      name: "",
      description: "",
      instructions: "",
      muscle_groups: [] as string[],
      equipment: [] as string[],
      difficulty: "intermediate",
      category: "",
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const programForm = useForm({
    initialValues: {
      name: "",
      description: "",
      duration_weeks: 4,
      difficulty: "intermediate",
      tags: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const handleCreateExercise = async (values: typeof exerciseForm.values) => {
    try {
      await createExercise.mutateAsync(values);
      closeExerciseModal();
      exerciseForm.reset();
    } catch {
      // Error handled by mutation
    }
  };

  const openProgramBuilder = (program?: any) => {
    if (program) {
      setEditingProgram(program);
      setWorkoutBlocks(program.template?.blocks || []);
      programForm.setValues({
        name: program.name,
        description: program.description || "",
        duration_weeks: program.duration_weeks,
        difficulty: program.difficulty,
        tags: program.tags || [],
      });
    } else {
      setEditingProgram(null);
      setWorkoutBlocks([]);
      programForm.reset();
    }
    openBuilder();
  };

  const handleSaveProgram = async () => {
    const values = programForm.values;
    if (!values.name) return;

    try {
      await createProgram.mutateAsync({
        ...values,
        template: {
          weeks: workoutBlocks.map((block) => ({
            days: block.days || [
              {
                exercises:
                  block.exercises?.map((ex: any) => ({
                    exercise_id: ex.exercise_id,
                    sets: ex.sets,
                    reps: ex.reps,
                    rest_seconds: ex.rest_seconds,
                    notes: ex.notes,
                  })) || [],
              },
            ],
          })),
        },
        is_template: true,
      });
      closeBuilder();
      programForm.reset();
      setWorkoutBlocks([]);
      setEditingProgram(null);
    } catch {
      // Error handled
    }
  };

  const muscleGroups = [
    { value: "pecho", label: "Pecho" },
    { value: "espalda", label: "Espalda" },
    { value: "hombros", label: "Hombros" },
    { value: "bíceps", label: "Bíceps" },
    { value: "tríceps", label: "Tríceps" },
    { value: "cuádriceps", label: "Cuádriceps" },
    { value: "isquiotibiales", label: "Isquiotibiales" },
    { value: "glúteos", label: "Glúteos" },
    { value: "core", label: "Core" },
    { value: "cardio", label: "Cardio" },
  ];

  const equipmentOptions = [
    { value: "ninguno", label: "Sin equipo" },
    { value: "mancuernas", label: "Mancuernas" },
    { value: "barra", label: "Barra" },
    { value: "kettlebell", label: "Kettlebell" },
    { value: "bandas", label: "Bandas elásticas" },
    { value: "máquina", label: "Máquina" },
    { value: "banco", label: "Banco" },
    { value: "barra de dominadas", label: "Barra de dominadas" },
  ];

  const filteredExercises = (exercises || mockExercises).filter(
    (e: any) =>
      e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
      e.muscle_groups?.some((m: string) =>
        m.toLowerCase().includes(searchExercise.toLowerCase())
      )
  );

  return (
    <Container py="xl" size="xl">
      <PageHeader
        action={{
          label:
            activeTab === "exercises" ? "Nuevo Ejercicio" : "Nuevo Programa",
          onClick:
            activeTab === "exercises"
              ? openExerciseModal
              : () => openProgramBuilder(),
        }}
        description="Gestiona ejercicios y programas de entrenamiento"
        title="Entrenamientos"
      />

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconTemplate size={14} />} value="programs">
            Programas
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconBarbell size={14} />} value="exercises">
            Biblioteca de Ejercicios
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="programs">
          {programs && programs.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {programs.map((program: any) => (
                <Card key={program.id} padding="lg" radius="lg" withBorder>
                  <Card.Section inheritPadding py="sm" withBorder>
                    <Group justify="space-between">
                      <Text fw={600}>{program.name}</Text>
                      <Badge color="primary" variant="light">
                        {program.duration_weeks} semanas
                      </Badge>
                    </Group>
                  </Card.Section>

                  <Text c="dimmed" lineClamp={2} mt="md" size="sm">
                    {program.description || "Sin descripción"}
                  </Text>

                  <Group gap="xs" mt="md">
                    <Badge size="sm" variant="outline">
                      {program.difficulty === "beginner"
                        ? "Principiante"
                        : program.difficulty === "intermediate"
                          ? "Intermedio"
                          : "Avanzado"}
                    </Badge>
                    {program.tags?.slice(0, 2).map((tag: string) => (
                      <Badge key={tag} size="sm" variant="light">
                        {tag}
                      </Badge>
                    ))}
                  </Group>

                  <Group gap="xs" mt="md">
                    <Button
                      flex={1}
                      leftSection={<IconEdit size={14} />}
                      onClick={() => openProgramBuilder(program)}
                      size="xs"
                      variant="light"
                    >
                      Editar
                    </Button>
                    <ActionIcon color="blue" variant="light">
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon color="gray" variant="light">
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon color="red" variant="light">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          ) : loadingPrograms ? null : (
            <EmptyState
              actionLabel="Crear Programa"
              description="Crea tu primer programa de entrenamiento para asignarlo a tus clientes."
              icon={<IconTemplate size={40} />}
              onAction={() => openProgramBuilder()}
              title="No hay programas"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="exercises">
          <TextInput
            leftSection={<IconSearch size={16} />}
            mb="lg"
            onChange={(e) => setSearchExercise(e.target.value)}
            placeholder="Buscar ejercicios..."
            value={searchExercise}
          />

          {filteredExercises.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {filteredExercises.map((exercise: any) => (
                <Card key={exercise.id} padding="sm" radius="md" withBorder>
                  <Card.Section>
                    <Box
                      h={120}
                      style={{
                        background:
                          "linear-gradient(135deg, var(--mantine-color-primary-1) 0%, var(--mantine-color-primary-2) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconBarbell
                        color="var(--mantine-color-primary-6)"
                        size={40}
                      />
                    </Box>
                  </Card.Section>

                  <Box mt="sm">
                    <Text fw={600} lineClamp={1} size="sm">
                      {exercise.name}
                    </Text>
                    <Group gap={4} mt="xs">
                      {exercise.muscle_groups
                        ?.slice(0, 2)
                        .map((muscle: string) => (
                          <Badge key={muscle} size="xs" variant="light">
                            {muscle}
                          </Badge>
                        ))}
                    </Group>
                  </Box>
                </Card>
              ))}
            </SimpleGrid>
          ) : loadingExercises ? null : (
            <EmptyState
              actionLabel="Añadir Ejercicio"
              description="Añade ejercicios a tu biblioteca para usarlos en tus programas."
              icon={<IconBarbell size={40} />}
              onAction={openExerciseModal}
              title="No hay ejercicios"
            />
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Modal para crear ejercicio */}
      <Modal
        onClose={closeExerciseModal}
        opened={exerciseModalOpened}
        size="lg"
        title="Nuevo Ejercicio"
      >
        <form onSubmit={exerciseForm.onSubmit(handleCreateExercise)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Press de Banca"
              required
              {...exerciseForm.getInputProps("name")}
            />

            <Textarea
              label="Descripción"
              minRows={2}
              placeholder="Breve descripción del ejercicio..."
              {...exerciseForm.getInputProps("description")}
            />

            <Textarea
              label="Instrucciones"
              minRows={3}
              placeholder="Pasos para realizar el ejercicio correctamente..."
              {...exerciseForm.getInputProps("instructions")}
            />

            <Group grow>
              <MultiSelect
                data={muscleGroups}
                label="Grupos musculares"
                placeholder="Selecciona"
                {...exerciseForm.getInputProps("muscle_groups")}
              />
              <MultiSelect
                data={equipmentOptions}
                label="Equipamiento"
                placeholder="Selecciona"
                {...exerciseForm.getInputProps("equipment")}
              />
            </Group>

            <Group grow>
              <Select
                data={[
                  { value: "beginner", label: "Principiante" },
                  { value: "intermediate", label: "Intermedio" },
                  { value: "advanced", label: "Avanzado" },
                ]}
                label="Dificultad"
                {...exerciseForm.getInputProps("difficulty")}
              />
              <Select
                data={[
                  { value: "fuerza", label: "Fuerza" },
                  { value: "cardio", label: "Cardio" },
                  { value: "flexibilidad", label: "Flexibilidad" },
                  { value: "core", label: "Core" },
                ]}
                label="Categoría"
                {...exerciseForm.getInputProps("category")}
              />
            </Group>

            <Group justify="flex-end" mt="md">
              <Button onClick={closeExerciseModal} variant="default">
                Cancelar
              </Button>
              <Button loading={createExercise.isPending} type="submit">
                Crear Ejercicio
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Drawer para el constructor de programas */}
      <Drawer
        onClose={closeBuilder}
        opened={builderOpened}
        position="right"
        size="xl"
        title={editingProgram ? "Editar Programa" : "Nuevo Programa"}
      >
        <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
          <Stack>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="sm">
                <TextInput
                  label="Nombre del programa"
                  placeholder="Programa de Hipertrofia"
                  required
                  {...programForm.getInputProps("name")}
                />

                <Textarea
                  label="Descripción"
                  minRows={2}
                  placeholder="Describe el programa..."
                  {...programForm.getInputProps("description")}
                />

                <Group grow>
                  <NumberInput
                    label="Duración (semanas)"
                    max={52}
                    min={1}
                    {...programForm.getInputProps("duration_weeks")}
                  />
                  <Select
                    data={[
                      { value: "beginner", label: "Principiante" },
                      { value: "intermediate", label: "Intermedio" },
                      { value: "advanced", label: "Avanzado" },
                    ]}
                    label="Dificultad"
                    {...programForm.getInputProps("difficulty")}
                  />
                </Group>

                <MultiSelect
                  data={[
                    { value: "hipertrofia", label: "Hipertrofia" },
                    { value: "fuerza", label: "Fuerza" },
                    { value: "pérdida de peso", label: "Pérdida de peso" },
                    { value: "tonificación", label: "Tonificación" },
                    { value: "resistencia", label: "Resistencia" },
                  ]}
                  label="Etiquetas"
                  placeholder="Añade etiquetas"
                  searchable
                  {...programForm.getInputProps("tags")}
                />
              </Stack>
            </Paper>

            <Divider
              label="Constructor de Entrenamiento"
              labelPosition="center"
            />

            <WorkoutBuilder
              availableExercises={mockExercises}
              blocks={workoutBlocks}
              onChange={setWorkoutBlocks}
            />
          </Stack>
        </ScrollArea>

        <Group
          justify="flex-end"
          mt="md"
          p="md"
          style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
        >
          <Button onClick={closeBuilder} variant="default">
            Cancelar
          </Button>
          <Button loading={createProgram.isPending} onClick={handleSaveProgram}>
            {editingProgram ? "Guardar Cambios" : "Crear Programa"}
          </Button>
        </Group>
      </Drawer>
    </Container>
  );
}

export default WorkoutsPage;
