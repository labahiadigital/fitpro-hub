import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
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
  IconFlame,
  IconSearch,
  IconStretching,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";
import { useClient } from "../../hooks/useClients";
import { PageHeader } from "../../components/common/PageHeader";
import { WorkoutBuilderWithDays, initialWorkoutDays, type WorkoutDay } from "../../components/workouts/WorkoutBuilder";
import {
  useCreateExercise,
  useCreateWorkoutProgram,
  useDeleteWorkoutProgram,
  useExercises,
  useUpdateWorkoutProgram,
  useWorkoutPrograms,
  useWorkoutProgram,
} from "../../hooks/useWorkouts";
import { useUpdateExercise, useDeleteExercise } from "../../hooks/useExercises";

// Exercises are fetched from the API via useExercises hook

export function WorkoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const editProgramId = searchParams.get("edit");
  const clientId = searchParams.get("clientId");
  const returnTo = searchParams.get("returnTo");
  
  // If editing for a specific client, get client info
  const { data: clientData } = useClient(clientId || "");
  
  // Función para volver a la página de origen
  const goBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
    } else if (clientId) {
      navigate(`/clients/${clientId}`);
    }
  }, [navigate, returnTo, clientId]);
  
  const [activeTab, setActiveTab] = useState<string | null>("programs");
  const [
    exerciseModalOpened,
    { open: openExerciseModal, close: closeExerciseModal },
  ] = useDisclosure(false);
  useDisclosure(false);
  const [builderOpened, { open: openBuilder, close: closeBuilder }] =
    useDisclosure(false);
  const [searchExercise, setSearchExercise] = useState("");
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(initialWorkoutDays);
  const [editingProgram, setEditingProgram] = useState<any>(null);

  const { data: exercises = [], isLoading: loadingExercises } =
    useExercises({ search: searchExercise });
  // When editing a client's program, we need to fetch all programs (not just templates)
  const { data: programs, isLoading: loadingPrograms } =
    useWorkoutPrograms(clientId ? undefined : true);
  // Also fetch the specific program if editing a client's program
  const { data: specificClientProgram } = useWorkoutProgram(editProgramId && clientId ? editProgramId : "");
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const deleteExercise = useDeleteExercise();
  const createProgram = useCreateWorkoutProgram();
  const updateProgram = useUpdateWorkoutProgram();
  const deleteProgram = useDeleteWorkoutProgram();
  
  // Estado para editar ejercicios
  const [editingExercise, setEditingExercise] = useState<any>(null);
  
  // Auto-open builder when edit param is in URL
  useEffect(() => {
    if (editProgramId && !builderOpened) {
      // First try to find in the programs list
      let program = programs?.find((p: any) => p.id === editProgramId);
      
      // If not found and we have a specific client program loaded, use that
      if (!program && specificClientProgram) {
        program = specificClientProgram;
      }
      
      if (program) {
        openProgramBuilderFromUrl(program);
      }
    }
  }, [editProgramId, programs, specificClientProgram, builderOpened]);
  
  const openProgramBuilderFromUrl = (program: any) => {
    setEditingProgram(program);
    if (program.template?.days) {
      setWorkoutDays(program.template.days);
    } else if (program.template?.blocks) {
      const newDays = initialWorkoutDays.map((d, i) => 
        i === 0 
          ? { ...d, blocks: program.template.blocks, isRestDay: false }
          : { ...d }
      );
      setWorkoutDays(newDays);
    } else {
      setWorkoutDays(initialWorkoutDays);
    }
    programForm.setValues({
      name: program.name,
      description: program.description || "",
      duration_weeks: program.duration_weeks,
      difficulty: program.difficulty,
      tags: program.tags || [],
    });
    openBuilder();
  };
  
  const handleCloseBuilder = () => {
    closeBuilder();
    // Clear URL params when closing
    if (editProgramId || clientId) {
      setSearchParams({});
    }
    // If coming from client page, go back
    if (returnTo || clientId) {
      goBack();
    }
  };

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
  
  // Función para abrir modal de edición de ejercicio
  const openEditExercise = (exercise: any) => {
    setEditingExercise(exercise);
    exerciseForm.setValues({
      name: exercise.name || "",
      description: exercise.description || "",
      instructions: exercise.instructions || "",
      muscle_groups: exercise.muscle_groups || [],
      equipment: exercise.equipment || [],
      difficulty: exercise.difficulty || "intermediate",
      category: exercise.category || "",
    });
    openExerciseModal();
  };
  
  // Función para abrir modal de nuevo ejercicio con categoría preseleccionada
  const openNewExercise = (category?: string) => {
    setEditingExercise(null);
    exerciseForm.reset();
    if (category) {
      exerciseForm.setFieldValue("category", category);
    }
    openExerciseModal();
  };

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
      if (editingExercise) {
        await updateExercise.mutateAsync({ id: editingExercise.id, data: values });
      } else {
        await createExercise.mutateAsync(values);
      }
      closeExerciseModal();
      exerciseForm.reset();
      setEditingExercise(null);
    } catch {
      // Error handled by mutation
    }
  };
  
  const handleDeleteExercise = async (exerciseId: string) => {
    try {
      await deleteExercise.mutateAsync(exerciseId);
    } catch {
      // Error handled by mutation
    }
  };

  const openProgramBuilder = (program?: any) => {
    if (program) {
      setEditingProgram(program);
      // Cargar días desde el template si existen, si no usar los bloques antiguos en el día 1
      if (program.template?.days) {
        setWorkoutDays(program.template.days);
      } else if (program.template?.blocks) {
        // Retrocompatibilidad: poner bloques antiguos en el lunes
        const newDays = initialWorkoutDays.map((d, i) => 
          i === 0 
            ? { ...d, blocks: program.template.blocks, isRestDay: false }
            : { ...d }
        );
        setWorkoutDays(newDays);
      } else {
        setWorkoutDays(initialWorkoutDays);
      }
      programForm.setValues({
        name: program.name,
        description: program.description || "",
        duration_weeks: program.duration_weeks,
        difficulty: program.difficulty,
        tags: program.tags || [],
      });
    } else {
      setEditingProgram(null);
      setWorkoutDays(initialWorkoutDays);
      programForm.reset();
    }
    openBuilder();
  };

  const handleSaveProgram = async () => {
    const values = programForm.values;
    if (!values.name) return;

    const programData = {
      ...values,
      template: {
        // Nueva estructura con días
        days: workoutDays.map((day) => ({
          id: day.id,
          day: day.day,
          dayName: day.dayName,
          isRestDay: day.isRestDay,
          notes: day.notes,
          blocks: day.blocks.map((block) => ({
            id: block.id,
            name: block.name,
            type: block.type,
            rest_between_sets: block.rest_between_sets,
            rounds: block.rounds,
            exercises: block.exercises?.map((ex: any) => ({
              id: ex.id,
              exercise_id: ex.exercise_id || ex.exercise?.id,
              exercise: ex.exercise,
              sets: ex.sets,
              reps: ex.reps,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes,
              order: ex.order,
            })) || [],
          })),
        })),
        // Retrocompatibilidad: también guardar bloques planos (todos los bloques de todos los días)
        blocks: workoutDays.flatMap((day) =>
          day.blocks.map((block) => ({
            id: block.id,
            name: block.name,
            type: block.type,
            rest_between_sets: block.rest_between_sets,
            rounds: block.rounds,
            exercises: block.exercises?.map((ex: any) => ({
              id: ex.id,
              exercise_id: ex.exercise_id || ex.exercise?.id,
              exercise: ex.exercise,
              sets: ex.sets,
              reps: ex.reps,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes,
              order: ex.order,
            })) || [],
          }))
        ),
      },
      // When editing a client's plan (clientId exists), don't save as template
      is_template: !clientId,
    };

    try {
      if (editingProgram) {
        // Update existing program - keep original is_template status if editing client's plan
        const updateData = clientId 
          ? { ...programData, is_template: editingProgram.is_template ?? false }
          : programData;
        await updateProgram.mutateAsync({
          id: editingProgram.id,
          data: updateData,
        });
      } else {
        // Create new program
        await createProgram.mutateAsync(programData);
      }
      handleCloseBuilder();
      programForm.reset();
      setWorkoutDays(initialWorkoutDays);
      setEditingProgram(null);
      
      // If editing for a specific client, redirect back
      if (clientId || returnTo) {
        goBack();
      }
    } catch {
      // Error handled
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este programa?")) {
      try {
        await deleteProgram.mutateAsync(programId);
      } catch {
        // Error handled
      }
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

  const filteredExercises = (exercises || []).filter(
    (e: any) =>
      e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
      e.muscle_groups?.some((m: string) =>
        m.toLowerCase().includes(searchExercise.toLowerCase())
      )
  );

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label:
            activeTab === "exercises" ? "Nuevo Ejercicio" : 
            activeTab === "warmup" ? "Nuevo Calentamiento" :
            activeTab === "stretching" ? "Nuevo Estiramiento" : "Nuevo Programa",
          onClick:
            activeTab === "exercises"
              ? () => openNewExercise()
              : activeTab === "warmup"
                ? () => openNewExercise("calentamiento")
                : activeTab === "stretching"
                  ? () => openNewExercise("estiramiento")
                  : () => openProgramBuilder(),
        }}
        description="Gestiona ejercicios y programas de entrenamiento"
        title="Entrenamientos"
      />

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="md" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Tabs.Tab leftSection={<IconTemplate size={14} />} value="programs" style={{ fontWeight: 600, fontSize: "13px" }}>
            Programas
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconBarbell size={14} />} value="exercises" style={{ fontWeight: 600, fontSize: "13px" }}>
            Ejercicios
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconFlame size={14} />} value="warmup" style={{ fontWeight: 600, fontSize: "13px" }}>
            Calentamiento
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconStretching size={14} />} value="stretching" style={{ fontWeight: 600, fontSize: "13px" }}>
            Estiramientos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="programs">
          {programs && programs.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
              {programs.map((program: any) => (
                <Box key={program.id} className="nv-card" p="md">
                  <Group justify="space-between" mb="sm">
                    <Text fw={600} size="sm" style={{ color: "var(--nv-dark)" }} lineClamp={1}>{program.name}</Text>
                    <Badge color="blue" variant="light" radius="md" size="xs">
                      {program.duration_weeks}sem
                    </Badge>
                  </Group>

                  <Text c="dimmed" lineClamp={2} size="xs">
                    {program.description || "Sin descripción"}
                  </Text>

                  <Group gap={4} mt="sm">
                    <Badge size="xs" variant="outline" radius="md">
                      {program.difficulty === "beginner"
                        ? "Principiante"
                        : program.difficulty === "intermediate"
                          ? "Intermedio"
                          : "Avanzado"}
                    </Badge>
                    {program.tags?.slice(0, 1).map((tag: string) => (
                      <Badge key={tag} size="xs" variant="light" radius="md">
                        {tag}
                      </Badge>
                    ))}
                  </Group>

                  <Divider my="sm" style={{ borderColor: "var(--border-subtle)" }} />

                  <Group gap={6}>
                    <Button
                      flex={1}
                      leftSection={<IconEdit size={12} />}
                      onClick={() => openProgramBuilder(program)}
                      size="xs"
                      variant="light"
                      radius="md"
                      styles={{ root: { height: 28 } }}
                    >
                      Editar
                    </Button>
                    <ActionIcon color="blue" variant="light" radius="md" size="sm">
                      <IconEye size={14} />
                    </ActionIcon>
                    <ActionIcon color="gray" variant="light" radius="md" size="sm">
                      <IconCopy size={14} />
                    </ActionIcon>
                    <ActionIcon 
                      color="red" 
                      variant="light" 
                      radius="md" 
                      size="sm"
                      onClick={() => handleDeleteProgram(program.id)}
                      loading={deleteProgram.isPending}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Box>
              ))}
            </SimpleGrid>
          ) : loadingPrograms ? null : (
            <EmptyState
              actionLabel="Crear Programa"
              description="Crea tu primer programa de entrenamiento para asignarlo a tus clientes."
              icon={<IconTemplate size={36} />}
              onAction={() => openProgramBuilder()}
              title="No hay programas"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="exercises">
          <TextInput
            leftSection={<IconSearch size={14} />}
            mb="md"
            onChange={(e) => setSearchExercise(e.target.value)}
            placeholder="Buscar ejercicios..."
            value={searchExercise}
            radius="md"
            size="sm"
            styles={{
              input: {
                backgroundColor: "var(--nv-surface)",
                border: "1px solid var(--border-subtle)",
              }
            }}
          />

          {filteredExercises.length > 0 ? (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing="sm" className="stagger">
              {filteredExercises.map((exercise: any) => (
                <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => openEditExercise(exercise)}>
                  <Box
                    h={80}
                    style={{
                      background: "linear-gradient(135deg, var(--nv-primary-glow) 0%, var(--nv-surface-subtle) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconBarbell color="var(--nv-primary)" size={28} />
                  </Box>

                  <Box p="xs">
                    <Text fw={600} lineClamp={1} size="xs" style={{ color: "var(--nv-dark)" }}>
                      {exercise.name}
                    </Text>
                    <Group gap={4} mt={4} justify="space-between">
                      <Group gap={4}>
                        {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                          <Badge key={muscle} size="xs" variant="light" radius="md" styles={{ root: { padding: "1px 4px", fontSize: "9px" } }}>
                            {muscle}
                          </Badge>
                        ))}
                      </Group>
                      <ActionIcon size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); openEditExercise(exercise); }}>
                        <IconEdit size={12} />
                      </ActionIcon>
                    </Group>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          ) : loadingExercises ? null : (
            <EmptyState
              actionLabel="Añadir Ejercicio"
              description="Añade ejercicios a tu biblioteca para usarlos en tus programas."
              icon={<IconBarbell size={36} />}
              onAction={() => openNewExercise()}
              title="No hay ejercicios"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="warmup">
          <TextInput
            leftSection={<IconSearch size={14} />}
            mb="md"
            onChange={(e) => setSearchExercise(e.target.value)}
            placeholder="Buscar ejercicios de calentamiento..."
            value={searchExercise}
            radius="md"
            size="sm"
            styles={{
              input: {
                backgroundColor: "var(--nv-surface)",
                border: "1px solid var(--border-subtle)",
              }
            }}
          />

          {(exercises || []).filter(
            (e: any) =>
              e.category?.toLowerCase() === "calentamiento" &&
              (e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
                e.muscle_groups?.some((m: string) =>
                  m.toLowerCase().includes(searchExercise.toLowerCase())
                ))
          ).length > 0 ? (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing="sm" className="stagger">
              {(exercises || [])
                .filter(
                  (e: any) =>
                    e.category?.toLowerCase() === "calentamiento" &&
                    (e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
                      e.muscle_groups?.some((m: string) =>
                        m.toLowerCase().includes(searchExercise.toLowerCase())
                      ))
                )
                .map((exercise: any) => (
                  <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => openEditExercise(exercise)}>
                    <Box
                      h={80}
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 107, 0, 0.2) 0%, var(--nv-surface-subtle) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconFlame color="var(--mantine-color-orange-6)" size={28} />
                    </Box>

                    <Box p="xs">
                      <Text fw={600} lineClamp={1} size="xs" style={{ color: "var(--nv-dark)" }}>
                        {exercise.name}
                      </Text>
                      <Group gap={4} mt={4} justify="space-between">
                        <Group gap={4}>
                          {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                            <Badge key={muscle} size="xs" variant="light" color="orange" radius="md" styles={{ root: { padding: "1px 4px", fontSize: "9px" } }}>
                              {muscle}
                            </Badge>
                          ))}
                        </Group>
                        <ActionIcon size="xs" variant="subtle" color="orange" onClick={(e) => { e.stopPropagation(); openEditExercise(exercise); }}>
                          <IconEdit size={12} />
                        </ActionIcon>
                      </Group>
                    </Box>
                  </Box>
                ))}
            </SimpleGrid>
          ) : loadingExercises ? null : (
            <EmptyState
              actionLabel="Añadir Calentamiento"
              description="Añade ejercicios de calentamiento a tu biblioteca."
              icon={<IconFlame size={36} />}
              onAction={() => openNewExercise("calentamiento")}
              title="No hay ejercicios de calentamiento"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="stretching">
          <TextInput
            leftSection={<IconSearch size={14} />}
            mb="md"
            onChange={(e) => setSearchExercise(e.target.value)}
            placeholder="Buscar estiramientos..."
            value={searchExercise}
            radius="md"
            size="sm"
            styles={{
              input: {
                backgroundColor: "var(--nv-surface)",
                border: "1px solid var(--border-subtle)",
              }
            }}
          />

          {(exercises || []).filter(
            (e: any) =>
              e.category?.toLowerCase() === "estiramiento" &&
              (e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
                e.muscle_groups?.some((m: string) =>
                  m.toLowerCase().includes(searchExercise.toLowerCase())
                ))
          ).length > 0 ? (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing="sm" className="stagger">
              {(exercises || [])
                .filter(
                  (e: any) =>
                    e.category?.toLowerCase() === "estiramiento" &&
                    (e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
                      e.muscle_groups?.some((m: string) =>
                        m.toLowerCase().includes(searchExercise.toLowerCase())
                      ))
                )
                .map((exercise: any) => (
                  <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => openEditExercise(exercise)}>
                    <Box
                      h={80}
                      style={{
                        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, var(--nv-surface-subtle) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconStretching color="var(--mantine-color-green-6)" size={28} />
                    </Box>

                    <Box p="xs">
                      <Text fw={600} lineClamp={1} size="xs" style={{ color: "var(--nv-dark)" }}>
                        {exercise.name}
                      </Text>
                      <Group gap={4} mt={4} justify="space-between">
                        <Group gap={4}>
                          {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                            <Badge key={muscle} size="xs" variant="light" color="green" radius="md" styles={{ root: { padding: "1px 4px", fontSize: "9px" } }}>
                              {muscle}
                            </Badge>
                          ))}
                        </Group>
                        <ActionIcon size="xs" variant="subtle" color="green" onClick={(e) => { e.stopPropagation(); openEditExercise(exercise); }}>
                          <IconEdit size={12} />
                        </ActionIcon>
                      </Group>
                    </Box>
                  </Box>
                ))}
            </SimpleGrid>
          ) : loadingExercises ? null : (
            <EmptyState
              actionLabel="Añadir Estiramiento"
              description="Añade ejercicios de estiramiento a tu biblioteca."
              icon={<IconStretching size={36} />}
              onAction={() => openNewExercise("estiramiento")}
              title="No hay estiramientos"
            />
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Modal para crear/editar ejercicio */}
      <Modal
        onClose={() => { closeExerciseModal(); setEditingExercise(null); exerciseForm.reset(); }}
        opened={exerciseModalOpened}
        size="lg"
        title={editingExercise ? "Editar Ejercicio" : "Nuevo Ejercicio"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
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
                  { value: "calentamiento", label: "Calentamiento" },
                  { value: "estiramiento", label: "Estiramiento" },
                ]}
                label="Categoría"
                {...exerciseForm.getInputProps("category")}
              />
            </Group>

            <Group justify="flex-end" mt="md">
              {editingExercise && (
                <Button 
                  color="red" 
                  variant="subtle" 
                  onClick={() => {
                    handleDeleteExercise(editingExercise.id);
                    closeExerciseModal();
                    setEditingExercise(null);
                    exerciseForm.reset();
                  }}
                  loading={deleteExercise.isPending}
                >
                  Eliminar
                </Button>
              )}
              <Box style={{ flex: 1 }} />
              <Button onClick={() => { closeExerciseModal(); setEditingExercise(null); exerciseForm.reset(); }} variant="default">
                Cancelar
              </Button>
              <Button loading={createExercise.isPending || updateExercise.isPending} type="submit">
                {editingExercise ? "Guardar Cambios" : "Crear Ejercicio"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Drawer para el constructor de programas */}
      <Drawer
        onClose={handleCloseBuilder}
        opened={builderOpened}
        position="right"
        size="xl"
        title={
          clientId && clientData ? (
            <Box>
              <Text fw={600}>Editar Programa de {clientData.first_name} {clientData.last_name}</Text>
              <Badge color="blue" size="sm" variant="light">Plan individual del cliente</Badge>
            </Box>
          ) : editingProgram ? "Editar Programa" : "Nuevo Programa"
        }
        styles={{ 
          content: { backgroundColor: "var(--nv-paper-bg)" }, 
          header: { backgroundColor: "var(--nv-paper-bg)", borderBottom: "1px solid var(--nv-border)" }
        }}
      >
        <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
          <Stack>
            <Box className="nv-card" p="md">
              <Stack gap="sm">
                <TextInput
                  label="Nombre del programa"
                  placeholder="Programa de Hipertrofia"
                  required
                  radius="md"
                  {...programForm.getInputProps("name")}
                />

                <Textarea
                  label="Descripción"
                  minRows={2}
                  placeholder="Describe el programa..."
                  radius="md"
                  {...programForm.getInputProps("description")}
                />

                <Group grow>
                  <NumberInput
                    label="Duración (semanas)"
                    max={52}
                    min={1}
                    radius="md"
                    {...programForm.getInputProps("duration_weeks")}
                  />
                  <Select
                    data={[
                      { value: "beginner", label: "Principiante" },
                      { value: "intermediate", label: "Intermedio" },
                      { value: "advanced", label: "Avanzado" },
                    ]}
                    label="Dificultad"
                    radius="md"
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
                  radius="md"
                  {...programForm.getInputProps("tags")}
                />
              </Stack>
            </Box>

            <Divider
              label="Constructor de Entrenamiento por Día"
              labelPosition="center"
              style={{ borderColor: "var(--nv-border)" }}
            />

            <WorkoutBuilderWithDays
              days={workoutDays}
              onChangeDays={setWorkoutDays}
              availableExercises={exercises || []}
            />
          </Stack>
        </ScrollArea>

        <Group
          justify="flex-end"
          mt="md"
          p="md"
          style={{ borderTop: "1px solid var(--nv-border)" }}
        >
          <Button onClick={closeBuilder} variant="default" radius="xl">
            Cancelar
          </Button>
          <Button 
            loading={createProgram.isPending || updateProgram.isPending} 
            onClick={handleSaveProgram}
            radius="xl"
            style={{ backgroundColor: "var(--nv-primary)" }}
          >
            {editingProgram ? "Guardar Cambios" : "Crear Programa"}
          </Button>
        </Group>
      </Drawer>
    </Container>
  );
}

export default WorkoutsPage;
