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
  IconHeartbeat,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconStretching,
  IconTemplate,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";
import { useClient, useClients } from "../../hooks/useClients";
import { PageHeader } from "../../components/common/PageHeader";
import { clientsApi } from "../../services/api";
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
import { useUpdateExercise, useDeleteExercise, useExerciseAlternatives, useAddExerciseAlternative, useRemoveExerciseAlternative } from "../../hooks/useExercises";
import { useExerciseFavorites, useToggleExerciseFavorite } from "../../hooks/useFavorites";
import { IconPlus, IconX, IconExchange } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

function ExerciseAlternativesSection({
  exerciseId,
  exerciseName,
  allExercises,
}: {
  exerciseId: string;
  exerciseName: string;
  allExercises: Array<{ id: string; name: string; muscle_groups?: string[]; category?: string }>;
}) {
  const { data: alternatives, isLoading } = useExerciseAlternatives(exerciseId);
  const addAlternative = useAddExerciseAlternative();
  const removeAlternative = useRemoveExerciseAlternative();
  const [search, setSearch] = useState("");

  const alternativeIds = new Set((alternatives || []).map((a) => a.alternative_exercise_id));
  const filtered = allExercises.filter(
    (e) =>
      e.id !== exerciseId &&
      !alternativeIds.has(e.id) &&
      e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box mt="xl" pt="md" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <Group gap="xs" mb="sm">
        <IconExchange size={16} />
        <Text fw={600} size="sm">Ejercicios alternativos para "{exerciseName}"</Text>
      </Group>
      <Text size="xs" c="dimmed" mb="sm">
        Define qué ejercicios puede usar el cliente como sustituto si la máquina no está disponible o tiene alguna lesión.
      </Text>

      {/* Lista de alternativas actuales */}
      {isLoading ? (
        <Text size="sm" c="dimmed">Cargando...</Text>
      ) : (alternatives || []).length > 0 ? (
        <Stack gap={4} mb="sm">
          {(alternatives || []).map((alt) => (
            <Group key={alt.id} justify="space-between" p="xs" style={{ borderRadius: 8, background: "var(--nv-surface-subtle)" }}>
              <Group gap="xs">
                <Badge size="xs" variant="light" color="blue">{alt.alternative_category || "—"}</Badge>
                <Text size="sm" fw={500}>{alt.alternative_name}</Text>
                {alt.alternative_muscle_groups?.slice(0, 2).map((m) => (
                  <Badge key={m} size="xs" variant="light" color="gray">{m}</Badge>
                ))}
              </Group>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => removeAlternative.mutate({ exerciseId, alternativeId: alt.id })}
              >
                <IconX size={12} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text size="xs" c="dimmed" mb="sm" ta="center" py="xs">
          Sin alternativas definidas. Añade ejercicios equivalentes para que el cliente pueda sustituir.
        </Text>
      )}

      {/* Buscador para añadir */}
      <TextInput
        size="xs"
        placeholder="Buscar ejercicio para añadir como alternativa..."
        leftSection={<IconSearch size={12} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        mb="xs"
      />
      {search.length > 1 && (
        <ScrollArea h={150}>
          <Stack gap={2}>
            {filtered.slice(0, 10).map((e) => (
              <Group
                key={e.id}
                justify="space-between"
                p={4}
                px="xs"
                style={{ borderRadius: 6, cursor: "pointer", background: "var(--nv-surface)" }}
                onClick={() => {
                  addAlternative.mutate(
                    { exerciseId, alternativeExerciseId: e.id },
                    {
                      onSuccess: () => {
                        notifications.show({ title: "Alternativa añadida", message: `${e.name} añadido como alternativa`, color: "green" });
                        setSearch("");
                      },
                    }
                  );
                }}
              >
                <Group gap="xs">
                  <Text size="xs" fw={500}>{e.name}</Text>
                  {e.muscle_groups?.slice(0, 2).map((m) => (
                    <Badge key={m} size="xs" variant="light" color="gray" styles={{ root: { fontSize: "8px", padding: "0 4px" } }}>{m}</Badge>
                  ))}
                </Group>
                <ActionIcon size="xs" variant="light" color="green">
                  <IconPlus size={10} />
                </ActionIcon>
              </Group>
            ))}
            {filtered.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="xs">No se encontraron ejercicios</Text>
            )}
          </Stack>
        </ScrollArea>
      )}
    </Box>
  );
}

export function WorkoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const editProgramId = searchParams.get("edit");
  const clientId = searchParams.get("clientId");
  const returnTo = searchParams.get("returnTo");
  
  // If editing for a specific client, get client info
  const { data: clientData } = useClient(clientId || "");
  // For client dropdown when creating/editing programs
  const { data: clientsData } = useClients({ page: 1, search: "", page_size: 100 });
  const clientOptions = (clientsData?.items || []).map((c: { id: string; first_name?: string; last_name?: string }) => ({
    value: c.id,
    label: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sin nombre",
  }));
  
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
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);

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
  
  // Favoritos de ejercicios
  const { data: exerciseFavorites = [] } = useExerciseFavorites();
  const toggleExerciseFavorite = useToggleExerciseFavorite();
  
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
    const planClientId = program.client_id || clientId || null;
    setSelectedClientId(planClientId);
    if (planClientId) {
      clientsApi.get(planClientId).then((res) => {
        setSelectedClient(res.data);
      }).catch(() => setSelectedClient(null));
    } else {
      setSelectedClient(null);
    }
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
      client_id: planClientId,
    });
    openBuilder();
  };
  
  const handleCloseBuilder = () => {
    closeBuilder();
    setSelectedClientId(null);
    setSelectedClient(null);
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
      difficulty: "intermediate" as "beginner" | "intermediate" | "advanced",
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
      difficulty: (exercise.difficulty || "intermediate") as "beginner" | "intermediate" | "advanced",
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
      client_id: null as string | null,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const loadClientData = useCallback(async (clientIdValue: string) => {
    try {
      const res = await clientsApi.get(clientIdValue);
      setSelectedClient(res.data);
      programForm.setFieldValue("client_id", clientIdValue);
    } catch {
      setSelectedClient(null);
    }
  }, [programForm]);

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
      const planClientId = program.client_id || clientId || null;
      setSelectedClientId(planClientId);
      if (planClientId) {
        clientsApi.get(planClientId).then((res) => {
          setSelectedClient(res.data);
        }).catch(() => setSelectedClient(null));
      } else {
        setSelectedClient(null);
      }
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
        client_id: planClientId,
      });
    } else {
      setEditingProgram(null);
      setWorkoutDays(initialWorkoutDays);
      programForm.reset();
      if (clientId) {
        setSelectedClientId(clientId);
        loadClientData(clientId);
      } else {
        setSelectedClientId(null);
        setSelectedClient(null);
      }
    }
    openBuilder();
  };

  const handleSaveProgram = async () => {
    const values = programForm.values;
    if (!values.name) return;

    const planClientId = selectedClientId || values.client_id || clientId || null;
    const programData = {
      ...values,
      client_id: planClientId || undefined,
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
              duration_type: ex.duration_type ?? "reps",
              notes: ex.notes,
              order: ex.order,
              target_weight: ex.target_weight,
              target_reps: ex.target_reps,
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
              duration_type: ex.duration_type ?? "reps",
              notes: ex.notes,
              order: ex.order,
              target_weight: ex.target_weight,
              target_reps: ex.target_reps,
            })) || [],
          }))
        ),
      },
      // When editing a client's plan (clientId exists) or assigning to client, don't save as template
      is_template: !planClientId,
    };

    try {
      if (editingProgram) {
        // Update existing program - keep original is_template status if editing client's plan
        const updateData = (clientId || planClientId)
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
            activeTab === "stretching" ? "Nuevo Estiramiento" :
            activeTab === "cardio" ? "Nuevo Cardio" : "Nuevo Programa",
          onClick:
            activeTab === "exercises"
              ? () => openNewExercise()
              : activeTab === "warmup"
                ? () => openNewExercise("calentamiento")
                : activeTab === "stretching"
                  ? () => openNewExercise("estiramiento")
                  : activeTab === "cardio"
                    ? () => openNewExercise("cardio")
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
          <Tabs.Tab leftSection={<IconHeartbeat size={14} />} value="cardio" style={{ fontWeight: 600, fontSize: "13px" }}>
            Cardio
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
                  {/* Estrella de favorito */}
                  <ActionIcon
                    size="xs"
                    variant={exerciseFavorites.includes(exercise.id) ? "filled" : "subtle"}
                    color="yellow"
                    style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExerciseFavorite.mutate({ exerciseId: exercise.id, isFavorite: exerciseFavorites.includes(exercise.id) });
                    }}
                  >
                    {exerciseFavorites.includes(exercise.id) ? <IconStarFilled size={12} /> : <IconStar size={12} />}
                  </ActionIcon>
                  
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
                  <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => openEditExercise(exercise)}>
                    {/* Estrella de favorito */}
                    <ActionIcon
                      size="xs"
                      variant={exerciseFavorites.includes(exercise.id) ? "filled" : "subtle"}
                      color="yellow"
                      style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExerciseFavorite.mutate({ exerciseId: exercise.id, isFavorite: exerciseFavorites.includes(exercise.id) });
                      }}
                    >
                      {exerciseFavorites.includes(exercise.id) ? <IconStarFilled size={12} /> : <IconStar size={12} />}
                    </ActionIcon>
                    
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
                  <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => openEditExercise(exercise)}>
                    {/* Estrella de favorito */}
                    <ActionIcon
                      size="xs"
                      variant={exerciseFavorites.includes(exercise.id) ? "filled" : "subtle"}
                      color="yellow"
                      style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExerciseFavorite.mutate({ exerciseId: exercise.id, isFavorite: exerciseFavorites.includes(exercise.id) });
                      }}
                    >
                      {exerciseFavorites.includes(exercise.id) ? <IconStarFilled size={12} /> : <IconStar size={12} />}
                    </ActionIcon>
                    
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

        <Tabs.Panel value="cardio">
          <TextInput
            leftSection={<IconSearch size={14} />}
            mb="md"
            onChange={(e) => setSearchExercise(e.target.value)}
            placeholder="Buscar ejercicios de cardio..."
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
              e.category?.toLowerCase() === "cardio" &&
              (e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
                e.muscle_groups?.some((m: string) =>
                  m.toLowerCase().includes(searchExercise.toLowerCase())
                ))
          ).length > 0 ? (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing="sm" className="stagger">
              {(exercises || [])
                .filter(
                  (e: any) =>
                    e.category?.toLowerCase() === "cardio" &&
                    (e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
                      e.muscle_groups?.some((m: string) =>
                        m.toLowerCase().includes(searchExercise.toLowerCase())
                      ))
                )
                .map((exercise: any) => (
                  <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => openEditExercise(exercise)}>
                    <ActionIcon
                      size="xs"
                      variant={exerciseFavorites.includes(exercise.id) ? "filled" : "subtle"}
                      color="yellow"
                      style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExerciseFavorite.mutate({ exerciseId: exercise.id, isFavorite: exerciseFavorites.includes(exercise.id) });
                      }}
                    >
                      {exerciseFavorites.includes(exercise.id) ? <IconStarFilled size={12} /> : <IconStar size={12} />}
                    </ActionIcon>
                    
                    <Box
                      h={80}
                      style={{
                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, var(--nv-surface-subtle) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconHeartbeat color="var(--mantine-color-red-6)" size={28} />
                    </Box>

                    <Box p="xs">
                      <Text fw={600} lineClamp={1} size="xs" style={{ color: "var(--nv-dark)" }}>
                        {exercise.name}
                      </Text>
                      <Group gap={4} mt={4} justify="space-between">
                        <Group gap={4}>
                          {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                            <Badge key={muscle} size="xs" variant="light" color="red" radius="md" styles={{ root: { padding: "1px 4px", fontSize: "9px" } }}>
                              {muscle}
                            </Badge>
                          ))}
                        </Group>
                        <ActionIcon size="xs" variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); openEditExercise(exercise); }}>
                          <IconEdit size={12} />
                        </ActionIcon>
                      </Group>
                    </Box>
                  </Box>
                ))}
            </SimpleGrid>
          ) : loadingExercises ? null : (
            <EmptyState
              actionLabel="Añadir Cardio"
              description="Añade ejercicios aeróbicos y de cardio a tu biblioteca."
              icon={<IconHeartbeat size={36} />}
              onAction={() => openNewExercise("cardio")}
              title="No hay ejercicios de cardio"
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

        {/* Sección de alternativas (solo al editar) */}
        {editingExercise && (
          <ExerciseAlternativesSection
            exerciseId={editingExercise.id}
            exerciseName={editingExercise.name}
            allExercises={exercises || []}
          />
        )}
      </Modal>

      {/* Fullscreen drawer para el constructor de programas */}
      <Drawer
        onClose={handleCloseBuilder}
        opened={builderOpened}
        position="right"
        size="100%"
        withCloseButton={false}
        styles={{
          content: { backgroundColor: "var(--nv-bg)", padding: 0 },
          header: { display: "none" },
          body: { padding: 0, height: "100vh", display: "flex", flexDirection: "column" },
        }}
      >
        {/* Custom header */}
        <Box
          px="lg"
          py="sm"
          style={{
            borderBottom: "1px solid var(--nv-border)",
            backgroundColor: "var(--nv-paper-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Group gap="md">
            <ActionIcon variant="subtle" color="gray" radius="xl" size="lg" onClick={handleCloseBuilder}>
              <IconX size={20} />
            </ActionIcon>
            <Box>
              <Text fw={700} size="lg" style={{ lineHeight: 1.2 }}>
                {editingProgram ? "Editar Programa" : "Nuevo Programa"}
              </Text>
              {clientId && clientData && (
                <Badge color="blue" size="sm" variant="light" mt={2}>
                  {clientData.first_name} {clientData.last_name}
                </Badge>
              )}
            </Box>
          </Group>
          <Group gap="sm">
            <Button onClick={closeBuilder} variant="default" radius="xl" size="sm">
              Cancelar
            </Button>
            <Button
              loading={createProgram.isPending || updateProgram.isPending}
              onClick={handleSaveProgram}
              radius="xl"
              size="sm"
              style={{ backgroundColor: "var(--nv-primary)" }}
            >
              {editingProgram ? "Guardar Cambios" : "Crear Programa"}
            </Button>
          </Group>
        </Box>

        {/* Two-column layout */}
        <Box style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left sidebar - Config */}
          <Box
            style={{
              width: 340,
              flexShrink: 0,
              borderRight: "1px solid var(--nv-border)",
              backgroundColor: "var(--nv-paper-bg)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ScrollArea style={{ flex: 1 }} offsetScrollbars p="md">
              <Stack gap="md">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.05em" }}>
                  Configuración
                </Text>

                <Select
                  label="Asignar a cliente"
                  placeholder="Buscar cliente..."
                  data={clientOptions}
                  searchable
                  clearable
                  radius="md"
                  size="sm"
                  leftSection={<IconUser size={14} />}
                  value={selectedClientId}
                  onChange={(value) => {
                    setSelectedClientId(value);
                    if (value) {
                      loadClientData(value);
                    } else {
                      setSelectedClient(null);
                      programForm.setFieldValue("client_id", null);
                    }
                  }}
                />

                <TextInput
                  label="Nombre del programa"
                  placeholder="Programa de Hipertrofia"
                  required
                  radius="md"
                  size="sm"
                  {...programForm.getInputProps("name")}
                />

                <Textarea
                  label="Descripción"
                  minRows={2}
                  placeholder="Describe el programa..."
                  radius="md"
                  size="sm"
                  {...programForm.getInputProps("description")}
                />

                <Group grow>
                  <NumberInput
                    label="Duración (sem.)"
                    max={52}
                    min={1}
                    radius="md"
                    size="sm"
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
                    size="sm"
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
                  size="sm"
                  {...programForm.getInputProps("tags")}
                />
              </Stack>
            </ScrollArea>
          </Box>

          {/* Right main area - Builder */}
          <Box style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <ScrollArea style={{ flex: 1 }} offsetScrollbars p="lg">
              <Box style={{ maxWidth: 960, margin: "0 auto" }}>
                <WorkoutBuilderWithDays
                  selectedClient={selectedClient}
                  days={workoutDays}
                  onChangeDays={setWorkoutDays}
                  availableExercises={exercises || []}
                  exerciseFavorites={exerciseFavorites}
                  onToggleExerciseFavorite={(exerciseId, isFavorite) =>
                    toggleExerciseFavorite.mutate({ exerciseId, isFavorite })
                  }
                  onCreateExercise={async (data: { name: string; category?: string; muscle_groups: string[]; equipment: string[]; difficulty: string; description?: string }) => {
                    const res = await createExercise.mutateAsync(data);
                    return res.data;
                  }}
                />
              </Box>
            </ScrollArea>
          </Box>
        </Box>
      </Drawer>
    </Container>
  );
}

export default WorkoutsPage;
