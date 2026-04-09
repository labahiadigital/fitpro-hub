import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  HoverCard,
  Image,
  MultiSelect,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Skeleton,
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
  IconUsers,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { EmptyState } from "../../components/common/EmptyState";
import { useClient, useClients } from "../../hooks/useClients";
import { PageHeader } from "../../components/common/PageHeader";
import { clientsApi } from "../../services/api";
import { BottomSheet } from "../../components/common/BottomSheet";
import { PlanEditorLayout } from "../../components/common/PlanEditorLayout";
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
  
  const [activeTab, setActiveTab] = useState<string | null>("templates");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [
    exerciseModalOpened,
    { open: openExerciseModal, close: closeExerciseModal },
  ] = useDisclosure(false);
  const [builderOpened, { open: openBuilder, close: closeBuilder }] =
    useDisclosure(false);
  const [searchExercise, setSearchExercise] = useState("");
  const [exerciseSourceFilter, setExerciseSourceFilter] = useState("all");
  const [workoutWeeks, setWorkoutWeeks] = useState<{ week: number; days: WorkoutDay[] }[]>([{ week: 1, days: [...initialWorkoutDays] }]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const workoutDays = useMemo(() => {
    const wk = workoutWeeks.find((w) => w.week === currentWeek);
    return wk ? wk.days : initialWorkoutDays;
  }, [workoutWeeks, currentWeek]);
  const setWorkoutDays = useCallback((days: WorkoutDay[]) => {
    setWorkoutWeeks((prev) => prev.map((w) => w.week === currentWeek ? { ...w, days } : w));
  }, [currentWeek]);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isTemplateModeOn, setIsTemplateModeOn] = useState(false);
  const [viewingProgram, setViewingProgram] = useState<any>(null);
  const [viewProgramOpened, { open: openViewProgram, close: closeViewProgram }] = useDisclosure(false);

  const { data: exercises = [], isLoading: loadingExercises } =
    useExercises({ search: searchExercise });

  // Favoritos de ejercicios (must be before sourceFilteredExercises)
  const { data: exerciseFavorites = [] } = useExerciseFavorites();
  const toggleExerciseFavorite = useToggleExerciseFavorite();

  const sourceFilteredExercises = useMemo(() => {
    if (exerciseSourceFilter === "favorites") return exercises.filter((e: any) => exerciseFavorites.includes(e.id));
    if (exerciseSourceFilter === "system") return exercises.filter((e: any) => e.is_global);
    if (exerciseSourceFilter === "custom") return exercises.filter((e: any) => !e.is_global);
    return exercises;
  }, [exercises, exerciseSourceFilter, exerciseFavorites]);

  const exerciseCounts = useMemo(() => {
    const all = exercises || [];
    return {
      fuerza: all.filter((e: any) => !e.category || e.category === "fuerza").length,
      calentamiento: all.filter((e: any) => e.category?.toLowerCase() === "calentamiento").length,
      estiramiento: all.filter((e: any) => e.category?.toLowerCase() === "estiramiento").length,
      cardio: all.filter((e: any) => e.category?.toLowerCase() === "cardio").length,
    };
  }, [exercises]);

  const sortFavoritesFirst = useCallback(
    (list: any[]) => {
      const favSet = new Set(exerciseFavorites);
      return [...list].sort((a, b) => {
        const aFav = favSet.has(a.id) ? 0 : 1;
        const bFav = favSet.has(b.id) ? 0 : 1;
        return aFav - bFav || a.name.localeCompare(b.name);
      });
    },
    [exerciseFavorites],
  );

  const getFilteredByCategory = useCallback(
    (category: string) => {
      const base = (sourceFilteredExercises || []).filter(
        (e: any) =>
          e.category?.toLowerCase() === category &&
          (e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
            e.muscle_groups?.some((m: string) =>
              m.toLowerCase().includes(searchExercise.toLowerCase())
            ))
      );
      return sortFavoritesFirst(base);
    },
    [sourceFilteredExercises, searchExercise, sortFavoritesFirst],
  );

  const { data: programs, isLoading: loadingPrograms } =
    useWorkoutPrograms();
  // Also fetch the specific program if editing a client's program
  const { data: specificClientProgram } = useWorkoutProgram(editProgramId && clientId ? editProgramId : "");

  const clientsMap = useMemo(() => {
    const map = new Map<string, string>();
    (clientsData?.items || []).forEach((c: { id: string; first_name?: string; last_name?: string }) => {
      map.set(c.id, `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sin nombre");
    });
    return map;
  }, [clientsData]);

  const templates = useMemo(() => (programs || []).filter((p: any) => p.is_template), [programs]);
  const clientPrograms = useMemo(() => (programs || []).filter((p: any) => !p.is_template), [programs]);
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const deleteExercise = useDeleteExercise();
  const createProgram = useCreateWorkoutProgram();
  const updateProgram = useUpdateWorkoutProgram();
  const deleteProgram = useDeleteWorkoutProgram();
  
  // Estado para editar ejercicios
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [enlargedImage, setEnlargedImage] = useState<{url: string, name: string} | null>(null);
  
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
  
  const loadTemplateIntoWeeks = (program: any) => {
    const tmpl = program.template;
    const numWeeks = program.duration_weeks || 1;
    if (tmpl?.weeks && Array.isArray(tmpl.weeks) && tmpl.weeks.length > 0) {
      const weeks = tmpl.weeks.map((w: any, idx: number) => ({
        week: w.week || idx + 1,
        days: w.days || [...initialWorkoutDays],
      }));
      while (weeks.length < numWeeks) {
        weeks.push({ week: weeks.length + 1, days: initialWorkoutDays.map((d) => ({ ...d, id: `day-${weeks.length + 1}-${d.id}` })) });
      }
      setWorkoutWeeks(weeks.slice(0, numWeeks));
    } else if (tmpl?.days) {
      const firstWeek = { week: 1, days: tmpl.days };
      const weeks = [firstWeek];
      for (let i = 1; i < numWeeks; i++) {
        weeks.push({ week: i + 1, days: initialWorkoutDays.map((d) => ({ ...d, id: `day-${i + 1}-${d.id}` })) });
      }
      setWorkoutWeeks(weeks);
    } else if (tmpl?.blocks) {
      const newDays = initialWorkoutDays.map((d, i) =>
        i === 0 ? { ...d, blocks: tmpl.blocks, isRestDay: false } : { ...d }
      );
      const weeks = [{ week: 1, days: newDays }];
      for (let i = 1; i < numWeeks; i++) {
        weeks.push({ week: i + 1, days: initialWorkoutDays.map((d) => ({ ...d, id: `day-${i + 1}-${d.id}` })) });
      }
      setWorkoutWeeks(weeks);
    } else {
      const weeks = [];
      for (let i = 0; i < numWeeks; i++) {
        weeks.push({ week: i + 1, days: initialWorkoutDays.map((d) => ({ ...d, id: `day-${i + 1}-${d.id}` })) });
      }
      setWorkoutWeeks(weeks);
    }
  };

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
    loadTemplateIntoWeeks(program);
    programForm.setValues({
      name: program.name,
      description: program.description || "",
      duration_weeks: program.duration_weeks || 1,
      difficulty: program.difficulty,
      tags: program.tags || [],
      client_id: planClientId,
      start_date: program.start_date || "",
      end_date: program.end_date || "",
    });
    setCurrentWeek(1);
    openBuilder();
  };
  
  const handleCloseBuilder = () => {
    closeBuilder();
    setSelectedClientId(null);
    setSelectedClient(null);
    setIsTemplateModeOn(true);
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
      start_date: "",
      end_date: "",
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const handleToggleExerciseFavorite = useCallback((exerciseId: string, isFavorite: boolean) => {
    toggleExerciseFavorite.mutate({ exerciseId, isFavorite });
  }, [toggleExerciseFavorite]);

  const handleCreateExerciseFromBuilder = useCallback(async (data: { name: string; category?: string; muscle_groups: string[]; equipment: string[]; difficulty: string; description?: string }) => {
    const res = await createExercise.mutateAsync(data);
    return res.data;
  }, [createExercise]);

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
      loadTemplateIntoWeeks(program);
      programForm.setValues({
        name: program.name,
        description: program.description || "",
        duration_weeks: program.duration_weeks || 1,
        difficulty: program.difficulty,
        tags: program.tags || [],
        client_id: planClientId,
        start_date: program.start_date || "",
        end_date: program.end_date || "",
      });
      setCurrentWeek(1);
    } else {
      setEditingProgram(null);
      setWorkoutWeeks([{ week: 1, days: [...initialWorkoutDays] }]);
      setCurrentWeek(1);
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

  const canSaveProgram = !!(selectedClientId || programForm.values.client_id || clientId || isTemplateModeOn);

  const handleSaveProgram = async () => {
    const values = programForm.values;
    if (!values.name || !canSaveProgram) return;

    const planClientId = selectedClientId || values.client_id || clientId || null;

    const serializeDays = (days: WorkoutDay[]) =>
      days.map((day) => ({
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
      }));

    const templatePayload = {
      weeks: workoutWeeks.map((w) => ({
        week: w.week,
        days: serializeDays(w.days),
      })),
      days: serializeDays(workoutDays),
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
    };

    try {
      const cleanDates = {
        start_date: values.start_date || undefined,
        end_date: values.end_date || undefined,
      };

      if (editingProgram) {
        await updateProgram.mutateAsync({
          id: editingProgram.id,
          data: {
            ...values,
            ...cleanDates,
            client_id: planClientId || undefined,
            template: templatePayload,
            is_template: editingProgram.is_template ?? !planClientId,
          },
        });
      } else {
        if (planClientId) {
          await createProgram.mutateAsync({
            ...values,
            ...cleanDates,
            client_id: planClientId,
            template: templatePayload,
            is_template: false,
          });
        }
        if (isTemplateModeOn) {
          const templateName = planClientId ? `${values.name} (Plantilla)` : values.name;
          await createProgram.mutateAsync({
            ...values,
            client_id: undefined,
            template: templatePayload,
            is_template: true,
            name: templateName,
            start_date: undefined,
            end_date: undefined,
          });
          if (planClientId) {
            notifications.show({
              title: "Plantilla creada",
              message: "Se guardó también como plantilla reutilizable",
              color: "teal",
              icon: <IconTemplate size={16} />,
            });
          }
        }
      }

      handleCloseBuilder();
      programForm.reset();
      setWorkoutWeeks([{ week: 1, days: [...initialWorkoutDays] }]);
      setCurrentWeek(1);
      setEditingProgram(null);
      
      if (clientId || returnTo) {
        goBack();
      }
    } catch {
      // Error handled
    }
  };

  const handleDuplicateProgram = async (program: any) => {
    try {
      const duplicateData = {
        name: `Copia de ${program.name}`,
        description: program.description || "",
        duration_weeks: program.duration_weeks || 4,
        difficulty: program.difficulty || "intermediate",
        tags: program.tags || [],
        template: program.template || {},
        is_template: true,
      };
      await createProgram.mutateAsync(duplicateData);
    } catch {
      // Error handled by react-query
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

  const filteredExercises = useMemo(() => {
    const base = (sourceFilteredExercises || []).filter(
      (e: any) =>
        e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
        e.muscle_groups?.some((m: string) =>
          m.toLowerCase().includes(searchExercise.toLowerCase())
        )
    );
    return sortFavoritesFirst(base);
  }, [sourceFilteredExercises, searchExercise, sortFavoritesFirst]);

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

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "templates", label: "Plantillas" },
            { value: "client-programs", label: "Programas de Clientes" },
            { value: "exercises", label: "Ejercicios" },
            { value: "warmup", label: "Calentamiento" },
            { value: "stretching", label: "Estiramientos" },
            { value: "cardio", label: "Cardio" },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs onChange={setActiveTab} value={activeTab}>
        {!isMobile && (
          <Tabs.List mb="md" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <Tabs.Tab leftSection={<IconTemplate size={14} />} value="templates" style={{ fontWeight: 600, fontSize: "13px" }}>
              Plantillas{" "}
              {templates.length > 0 && (
                <Badge ml="xs" size="xs" radius="md" variant="light">{templates.length}</Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconUsers size={14} />} value="client-programs" style={{ fontWeight: 600, fontSize: "13px" }}>
              Programas de Clientes{" "}
              {clientPrograms.length > 0 && (
                <Badge ml="xs" size="xs" radius="md" variant="light">{clientPrograms.length}</Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconBarbell size={14} />} value="exercises" style={{ fontWeight: 600, fontSize: "13px" }}>
              Ejercicios{" "}
              {exerciseCounts.fuerza > 0 && (
                <Badge ml="xs" size="xs" radius="md" variant="light">{exerciseCounts.fuerza}</Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconFlame size={14} />} value="warmup" style={{ fontWeight: 600, fontSize: "13px" }}>
              Calentamiento{" "}
              {exerciseCounts.calentamiento > 0 && (
                <Badge ml="xs" size="xs" radius="md" variant="light">{exerciseCounts.calentamiento}</Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconStretching size={14} />} value="stretching" style={{ fontWeight: 600, fontSize: "13px" }}>
              Estiramientos{" "}
              {exerciseCounts.estiramiento > 0 && (
                <Badge ml="xs" size="xs" radius="md" variant="light">{exerciseCounts.estiramiento}</Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconHeartbeat size={14} />} value="cardio" style={{ fontWeight: 600, fontSize: "13px" }}>
              Cardio{" "}
              {exerciseCounts.cardio > 0 && (
                <Badge ml="xs" size="xs" radius="md" variant="light">{exerciseCounts.cardio}</Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>
        )}

        <Tabs.Panel value="templates">
          {templates.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
              {templates.map((program: any) => (
                <Box key={program.id} className="nv-card" p="md">
                  <Group justify="space-between" mb="sm">
                    <Text fw={600} size="sm" style={{ color: "var(--nv-dark)" }} lineClamp={1}>{program.name}</Text>
                    <Badge color="teal" variant="light" radius="md" size="xs">Plantilla</Badge>
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
                    {program.duration_weeks && (
                      <Badge size="xs" variant="light" color="blue" radius="md">{program.duration_weeks}sem</Badge>
                    )}
                  </Group>

                  <Divider my="sm" style={{ borderColor: "var(--border-subtle)" }} />

                  <Group gap={6}>
                    <Button flex={1} leftSection={<IconEdit size={12} />} onClick={() => openProgramBuilder(program)} size="xs" variant="light" radius="md" styles={{ root: { height: 28 } }}>
                      Editar
                    </Button>
                    <ActionIcon color="blue" variant="light" radius="md" size="sm" onClick={() => { setViewingProgram(program); openViewProgram(); }}>
                      <IconEye size={14} />
                    </ActionIcon>
                    <ActionIcon color="gray" variant="light" radius="md" size="sm" onClick={() => handleDuplicateProgram(program)} loading={createProgram.isPending} title="Duplicar programa">
                      <IconCopy size={14} />
                    </ActionIcon>
                    <ActionIcon color="red" variant="light" radius="md" size="sm" onClick={() => handleDeleteProgram(program.id)} loading={deleteProgram.isPending}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Box>
              ))}
            </SimpleGrid>
          ) : loadingPrograms ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={160} radius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              actionLabel="Crear Programa"
              description="Crea tu primer programa de entrenamiento para asignarlo a tus clientes."
              icon={<IconTemplate size={36} />}
              onAction={() => openProgramBuilder()}
              title="No hay plantillas"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="client-programs">
          {clientPrograms.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
              {clientPrograms.map((program: any) => {
                const endDate = program.end_date ? new Date(program.end_date) : null;
                const isExpired = endDate && endDate < new Date();
                const showActive = (program.is_active ?? false) && !isExpired;
                return (
                <Box key={program.id} className="nv-card" p="md">
                  <Group justify="space-between" mb="sm">
                    <Text fw={600} size="sm" style={{ color: "var(--nv-dark)" }} lineClamp={1}>{program.name}</Text>
                    <Group gap={4}>
                      <Badge color={showActive ? "green" : "gray"} variant="filled" radius="md" size="xs">
                        {showActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge color="blue" variant="light" radius="md" size="xs">
                        {program.duration_weeks}sem
                      </Badge>
                    </Group>
                  </Group>

                  <Text c="dimmed" lineClamp={2} size="xs">
                    {program.description || "Sin descripción"}
                  </Text>

                  {program.client_id && (
                    <Badge color="blue" mt="xs" size="xs" variant="outline" radius="md">
                      {clientsMap.get(program.client_id) || "Cliente"}
                    </Badge>
                  )}

                  {(program.start_date || program.end_date) && (
                    <Group gap="xs" mt="xs">
                      {program.start_date && (
                        <Text size="xs" c="dimmed">
                          Inicio: {new Date(program.start_date).toLocaleDateString('es-ES')}
                        </Text>
                      )}
                      {program.end_date && (
                        <Text size="xs" c="dimmed">
                          Fin: {new Date(program.end_date).toLocaleDateString('es-ES')}
                        </Text>
                      )}
                    </Group>
                  )}

                  <Group gap={4} mt="sm">
                    <Badge size="xs" variant="outline" radius="md">
                      {program.difficulty === "beginner"
                        ? "Principiante"
                        : program.difficulty === "intermediate"
                          ? "Intermedio"
                          : "Avanzado"}
                    </Badge>
                  </Group>

                  <Divider my="sm" style={{ borderColor: "var(--border-subtle)" }} />

                  <Group gap={6}>
                    <Button flex={1} leftSection={<IconEdit size={12} />} onClick={() => openProgramBuilder(program)} size="xs" variant="light" radius="md" styles={{ root: { height: 28 } }}>
                      Editar
                    </Button>
                    <ActionIcon color="blue" variant="light" radius="md" size="sm" onClick={() => { setViewingProgram(program); openViewProgram(); }}>
                      <IconEye size={14} />
                    </ActionIcon>
                    <ActionIcon color="gray" variant="light" radius="md" size="sm" onClick={() => handleDuplicateProgram(program)} loading={createProgram.isPending} title="Duplicar programa">
                      <IconCopy size={14} />
                    </ActionIcon>
                    <ActionIcon color="red" variant="light" radius="md" size="sm" onClick={() => handleDeleteProgram(program.id)} loading={deleteProgram.isPending}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Box>
                );
              })}
            </SimpleGrid>
          ) : loadingPrograms ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={160} radius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              actionLabel="Crear Programa"
              description="Asigna un programa a un cliente para verlo aquí."
              icon={<IconUsers size={36} />}
              onAction={() => openProgramBuilder()}
              title="No hay programas de clientes"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="exercises">
          <Group gap="sm" mb="md">
            <TextInput
              leftSection={<IconSearch size={14} />}
              onChange={(e) => setSearchExercise(e.target.value)}
              placeholder="Buscar ejercicios..."
              value={searchExercise}
              radius="md"
              size="sm"
              style={{ flex: 1 }}
              styles={{
                input: {
                  backgroundColor: "var(--nv-surface)",
                  border: "1px solid var(--border-subtle)",
                }
              }}
            />
            <SegmentedControl
              value={exerciseSourceFilter}
              onChange={setExerciseSourceFilter}
              size="xs"
              radius="md"
              data={[
                { label: "Todos", value: "all" },
                { label: "⭐ Favoritos", value: "favorites" },
                { label: "Sistema", value: "system" },
                { label: "Propios", value: "custom" },
              ]}
            />
          </Group>

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
                  
                  {exercise.image_url ? (
                    <HoverCard width={320} shadow="lg" openDelay={300} position="right">
                      <HoverCard.Target>
                        <Box h={80} style={{ background: "var(--nv-surface-subtle)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          <Image
                            src={exercise.image_url}
                            alt={exercise.name}
                            h={80}
                            w="100%"
                            fit="contain"
                            fallbackSrc={undefined}
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEnlargedImage({url: exercise.image_url, name: exercise.name}); }}
                            style={{cursor: 'pointer'}}
                          />
                        </Box>
                      </HoverCard.Target>
                      <HoverCard.Dropdown p={0} style={{ overflow: "hidden", borderRadius: 12 }}>
                        <Image src={exercise.image_url} alt={exercise.name} fit="contain" h={280} />
                        <Box p="xs">
                          <Text fw={600} size="sm">{exercise.name}</Text>
                          {exercise.muscle_groups?.length > 0 && (
                            <Group gap={4} mt={4}>
                              {exercise.muscle_groups.map((m: string) => (
                                <Badge key={m} size="xs" variant="light">{m}</Badge>
                              ))}
                            </Group>
                          )}
                        </Box>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  ) : (
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
                  )}

                  <Box p="xs">
                    <Group gap={4} wrap="nowrap">
                      <Text fw={600} lineClamp={1} size="xs" style={{ color: "var(--nv-dark)" }}>
                        {exercise.name}
                      </Text>
                      {exercise.is_global && <Badge color="gray" variant="light" size="xs" styles={{ root: { padding: "1px 4px", fontSize: "8px", flexShrink: 0 } }}>S</Badge>}
                    </Group>
                    <Group gap={4} mt={4} justify="space-between">
                      <Group gap={4}>
                        {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                          <Badge key={muscle} size="xs" variant="light" radius="md" styles={{ root: { padding: "1px 4px", fontSize: "9px" } }}>
                            {muscle}
                          </Badge>
                        ))}
                      </Group>
                      {!exercise.is_global && (
                        <ActionIcon size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); openEditExercise(exercise); }}>
                          <IconEdit size={12} />
                        </ActionIcon>
                      )}
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

        {(["warmup", "stretching", "cardio"] as const).map((tab) => {
          const cfg = {
            warmup: { category: "calentamiento", placeholder: "Buscar ejercicios de calentamiento...", gradient: "rgba(255, 107, 0, 0.2)", icon: <IconFlame color="var(--mantine-color-orange-6)" size={28} />, color: "orange", emptyTitle: "No hay ejercicios de calentamiento", emptyDesc: "Añade ejercicios de calentamiento a tu biblioteca.", emptyLabel: "Añadir Calentamiento", emptyIcon: <IconFlame size={36} /> },
            stretching: { category: "estiramiento", placeholder: "Buscar estiramientos...", gradient: "rgba(34, 197, 94, 0.2)", icon: <IconStretching color="var(--mantine-color-green-6)" size={28} />, color: "green", emptyTitle: "No hay estiramientos", emptyDesc: "Añade ejercicios de estiramiento a tu biblioteca.", emptyLabel: "Añadir Estiramiento", emptyIcon: <IconStretching size={36} /> },
            cardio: { category: "cardio", placeholder: "Buscar ejercicios de cardio...", gradient: "rgba(239, 68, 68, 0.2)", icon: <IconHeartbeat color="var(--mantine-color-red-6)" size={28} />, color: "red", emptyTitle: "No hay ejercicios de cardio", emptyDesc: "Añade ejercicios aeróbicos y de cardio a tu biblioteca.", emptyLabel: "Añadir Cardio", emptyIcon: <IconHeartbeat size={36} /> },
          }[tab];
          const items = getFilteredByCategory(cfg.category);
          return (
            <Tabs.Panel value={tab} key={tab}>
              <Group gap="sm" mb="md">
                <TextInput
                  leftSection={<IconSearch size={14} />}
                  onChange={(e) => setSearchExercise(e.target.value)}
                  placeholder={cfg.placeholder}
                  value={searchExercise}
                  radius="md"
                  size="sm"
                  style={{ flex: 1 }}
                  styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
                />
                <SegmentedControl
                  value={exerciseSourceFilter}
                  onChange={setExerciseSourceFilter}
                  size="xs"
                  radius="md"
                  data={[
                    { label: "Todos", value: "all" },
                    { label: "⭐ Favoritos", value: "favorites" },
                    { label: "Sistema", value: "system" },
                    { label: "Propios", value: "custom" },
                  ]}
                />
              </Group>

              {items.length > 0 ? (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing="sm" className="stagger">
                  {items.map((exercise: any) => (
                    <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => openEditExercise(exercise)}>
                      <ActionIcon
                        size="xs"
                        variant={exerciseFavorites.includes(exercise.id) ? "filled" : "subtle"}
                        color="yellow"
                        style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
                        onClick={(e) => { e.stopPropagation(); toggleExerciseFavorite.mutate({ exerciseId: exercise.id, isFavorite: exerciseFavorites.includes(exercise.id) }); }}
                      >
                        {exerciseFavorites.includes(exercise.id) ? <IconStarFilled size={12} /> : <IconStar size={12} />}
                      </ActionIcon>
                      {exercise.image_url ? (
                        <HoverCard width={320} shadow="lg" openDelay={300} position="right">
                          <HoverCard.Target>
                            <Box h={80} style={{ background: "var(--nv-surface-subtle)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                              <Image src={exercise.image_url} alt={exercise.name} h={80} w="100%" fit="contain" fallbackSrc={undefined} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEnlargedImage({ url: exercise.image_url, name: exercise.name }); }} style={{ cursor: "pointer" }} />
                            </Box>
                          </HoverCard.Target>
                          <HoverCard.Dropdown p={0} style={{ overflow: "hidden", borderRadius: 12 }}>
                            <Image src={exercise.image_url} alt={exercise.name} fit="contain" h={280} />
                            <Box p="xs"><Text fw={600} size="sm">{exercise.name}</Text></Box>
                          </HoverCard.Dropdown>
                        </HoverCard>
                      ) : (
                        <Box h={80} style={{ background: `linear-gradient(135deg, ${cfg.gradient} 0%, var(--nv-surface-subtle) 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {cfg.icon}
                        </Box>
                      )}
                      <Box p="xs">
                        <Group gap={4} wrap="nowrap">
                          <Text fw={600} lineClamp={1} size="xs" style={{ color: "var(--nv-dark)" }}>{exercise.name}</Text>
                          {exercise.is_global && <Badge color="gray" variant="light" size="xs" styles={{ root: { padding: "1px 4px", fontSize: "8px", flexShrink: 0 } }}>S</Badge>}
                        </Group>
                        <Group gap={4} mt={4} justify="space-between">
                          <Group gap={4}>
                            {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                              <Badge key={muscle} size="xs" variant="light" color={cfg.color} radius="md" styles={{ root: { padding: "1px 4px", fontSize: "9px" } }}>{muscle}</Badge>
                            ))}
                          </Group>
                          {!exercise.is_global && (
                            <ActionIcon size="xs" variant="subtle" color={cfg.color} onClick={(e) => { e.stopPropagation(); openEditExercise(exercise); }}>
                              <IconEdit size={12} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Box>
                    </Box>
                  ))}
                </SimpleGrid>
              ) : loadingExercises ? null : (
                <EmptyState
                  actionLabel={cfg.emptyLabel}
                  description={cfg.emptyDesc}
                  icon={cfg.emptyIcon}
                  onAction={() => openNewExercise(cfg.category)}
                  title={cfg.emptyTitle}
                />
              )}
            </Tabs.Panel>
          );
        })}
      </Tabs>

      {/* Modal para crear/editar ejercicio */}
      <BottomSheet
        onClose={() => { closeExerciseModal(); setEditingExercise(null); exerciseForm.reset(); }}
        opened={exerciseModalOpened}
        desktopSize="lg"
        title={editingExercise?.is_global ? "Detalle del Ejercicio (Sistema)" : editingExercise ? "Editar Ejercicio" : "Nuevo Ejercicio"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        {editingExercise?.image_url && (
          <Image
            src={editingExercise.image_url}
            alt={editingExercise.name}
            h={200}
            fit="cover"
            radius="md"
            mb="md"
          />
        )}
        {editingExercise?.is_global && (
          <Badge color="gray" variant="light" size="sm" mb="sm">Dato del sistema — solo lectura</Badge>
        )}
        <form onSubmit={exerciseForm.onSubmit(handleCreateExercise)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Press de Banca"
              required
              disabled={editingExercise?.is_global}
              {...exerciseForm.getInputProps("name")}
            />

            <Textarea
              label="Descripción"
              minRows={2}
              placeholder="Breve descripción del ejercicio..."
              disabled={editingExercise?.is_global}
              {...exerciseForm.getInputProps("description")}
            />

            <Textarea
              label="Instrucciones"
              minRows={3}
              placeholder="Pasos para realizar el ejercicio correctamente..."
              disabled={editingExercise?.is_global}
              {...exerciseForm.getInputProps("instructions")}
            />

            <Group grow>
              <MultiSelect
                data={muscleGroups}
                label="Grupos musculares"
                placeholder="Selecciona"
                disabled={editingExercise?.is_global}
                {...exerciseForm.getInputProps("muscle_groups")}
              />
              <MultiSelect
                data={equipmentOptions}
                label="Equipamiento"
                placeholder="Selecciona"
                disabled={editingExercise?.is_global}
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
                disabled={editingExercise?.is_global}
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
                disabled={editingExercise?.is_global}
                {...exerciseForm.getInputProps("category")}
              />
            </Group>

            {!editingExercise?.is_global && (
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
            )}
            {editingExercise?.is_global && (
              <Group justify="flex-end" mt="md">
                <Button onClick={() => { closeExerciseModal(); setEditingExercise(null); exerciseForm.reset(); }} variant="default">
                  Cerrar
                </Button>
              </Group>
            )}
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
      </BottomSheet>

      {/* Fullscreen drawer para el constructor de programas */}
      <PlanEditorLayout
        opened={builderOpened}
        onClose={handleCloseBuilder}
        title={editingProgram ? "Editar Programa" : "Nuevo Programa"}
        clientBadge={clientId && clientData ? `${clientData.first_name} ${clientData.last_name}` : undefined}
        badgeColor="blue"
        isSaving={createProgram.isPending || updateProgram.isPending}
        onSave={handleSaveProgram}
        saveDisabled={!canSaveProgram || !programForm.values.name}
        saveLabel={editingProgram ? "Guardar Cambios" : "Crear Programa"}
        sidebarContent={
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

            <Switch
              label="Crear como plantilla"
              description={selectedClientId || clientId
                ? "Guarda una copia reutilizable además del programa del cliente"
                : "Guarda como plantilla reutilizable"}
              checked={isTemplateModeOn}
              onChange={(e) => setIsTemplateModeOn(e.currentTarget.checked)}
              size="sm"
              color="teal"
            />

            {!canSaveProgram && (
              <Text size="xs" c="red">Asigna un cliente o marca &quot;Crear como plantilla&quot; para poder guardar</Text>
            )}

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
                label="Programación (semanal)"
                max={52}
                min={1}
                radius="md"
                size="sm"
                {...programForm.getInputProps("duration_weeks")}
                onChange={(v) => {
                  const weeks = Number(v) || 1;
                  programForm.setFieldValue("duration_weeks", weeks);
                  setWorkoutWeeks((prev) => {
                    if (weeks > prev.length) {
                      const newWeeks = [...prev];
                      for (let i = prev.length; i < weeks; i++) {
                        newWeeks.push({ week: i + 1, days: initialWorkoutDays.map((d) => ({ ...d, id: `day-${i + 1}-${d.id}` })) });
                      }
                      return newWeeks;
                    }
                    return prev.slice(0, weeks);
                  });
                  if (currentWeek > weeks) setCurrentWeek(weeks);
                }}
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

            {(selectedClientId || clientId) && (
              <Group grow>
                <TextInput
                  label="Fecha de inicio"
                  type="date"
                  radius="md"
                  size="sm"
                  {...programForm.getInputProps("start_date")}
                />
                <TextInput
                  label="Fecha de fin (opcional)"
                  description="Si no se indica, las semanas se repiten indefinidamente"
                  type="date"
                  radius="md"
                  size="sm"
                  {...programForm.getInputProps("end_date")}
                />
              </Group>
            )}
          </Stack>
        }
        mainContent={
          <WorkoutBuilderWithDays
            selectedClient={selectedClient}
            days={workoutDays}
            onChangeDays={setWorkoutDays}
            availableExercises={exercises || []}
            exerciseFavorites={exerciseFavorites}
            onToggleExerciseFavorite={handleToggleExerciseFavorite}
            onCreateExercise={handleCreateExerciseFromBuilder}
            totalWeeks={programForm.values.duration_weeks}
            currentWeek={currentWeek}
            onWeekChange={setCurrentWeek}
            onCopyWeek={(from, to) => {
              setWorkoutWeeks((prev) => {
                const srcWeek = prev.find((w) => w.week === from);
                if (!srcWeek) return prev;
                const now = Date.now();
                const copiedDays = srcWeek.days.map((d, di) => ({
                  ...d,
                  id: `day-${to}-${d.day || d.id}`,
                  blocks: d.blocks.map((b, bi) => ({
                    ...b,
                    id: `block-${now}-${di}-${bi}`,
                    exercises: b.exercises.map((e, ei) => ({
                      ...e,
                      id: `ex-${now}-${di}-${bi}-${ei}`,
                    })),
                  })),
                }));
                return prev.map((w) => w.week === to ? { ...w, days: copiedDays } : w);
              });
              setCurrentWeek(to);
              notifications.show({ title: "Semana copiada", message: `Semana ${from} copiada a Semana ${to}`, color: "green" });
            }}
          />
        }
      />

      {/* Image Enlargement Modal */}
      <BottomSheet opened={!!enlargedImage} onClose={() => setEnlargedImage(null)} desktopSize="lg" title={enlargedImage?.name} centered>
        {enlargedImage && <Image src={enlargedImage.url} alt={enlargedImage.name} fit="contain" mah={500} />}
      </BottomSheet>

      {/* View Program Detail Modal */}
      <BottomSheet
        opened={viewProgramOpened}
        onClose={closeViewProgram}
        title={viewingProgram?.name || "Programa de Entrenamiento"}
        desktopSize="lg"
      >
        {viewingProgram && (
          <Stack gap="md">
            {viewingProgram.description && (
              <Text size="sm" c="dimmed">{viewingProgram.description}</Text>
            )}
            <Group gap="md" wrap="wrap">
              {viewingProgram.duration_weeks && (
                <Badge variant="light" color="blue">{viewingProgram.duration_weeks} semanas</Badge>
              )}
              {viewingProgram.difficulty && (
                <Badge variant="light" color="gray">
                  {viewingProgram.difficulty === "beginner" ? "Principiante" : viewingProgram.difficulty === "intermediate" ? "Intermedio" : "Avanzado"}
                </Badge>
              )}
              {viewingProgram.client_id && (
                <Badge variant="outline" color="blue">{clientsMap.get(viewingProgram.client_id) || "Cliente"}</Badge>
              )}
              {viewingProgram.start_date && (
                <Text size="xs" c="dimmed">Inicio: {new Date(viewingProgram.start_date).toLocaleDateString('es-ES')}</Text>
              )}
              {viewingProgram.end_date && (
                <Text size="xs" c="dimmed">Fin: {new Date(viewingProgram.end_date).toLocaleDateString('es-ES')}</Text>
              )}
            </Group>

            <Divider my="sm" label="Ejercicios" labelPosition="center" />

            {(() => {
              const tmpl = viewingProgram.template as any;
              const weeksList = tmpl?.weeks as Array<{ week: number; days: Array<{ dayName?: string; isRestDay?: boolean; blocks?: Array<{ name: string; type?: string; exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }> }> }> | undefined;
              const daysList = tmpl?.days as Array<{ dayName?: string; isRestDay?: boolean; blocks?: Array<{ name: string; type?: string; exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }> }> | undefined;
              const allWeeks = weeksList && weeksList.length > 0
                ? weeksList
                : daysList && daysList.length > 0
                  ? [{ week: 1, days: daysList }]
                  : [];

              if (allWeeks.length === 0) {
                return <Text c="dimmed" ta="center" py="md">No hay ejercicios definidos</Text>;
              }

              return allWeeks.map((wk) => (
                <Box key={wk.week}>
                  {allWeeks.length > 1 && (
                    <Text fw={700} mb="xs">Semana {wk.week}</Text>
                  )}
                  <Stack gap="xs">
                    {wk.days.map((day, dayIdx) => (
                      <Box key={dayIdx} p="sm" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
                        <Group gap="xs" mb="xs">
                          <Text fw={600} size="sm">{day.dayName || `Día ${dayIdx + 1}`}</Text>
                          {day.isRestDay && <Badge variant="light" color="orange" size="xs">Descanso</Badge>}
                        </Group>
                        {!day.isRestDay && day.blocks?.map((block, bi) => (
                          <Box key={bi} ml="sm" mb="xs">
                            <Text size="xs" fw={600} c="dimmed" mb={2}>
                              {block.type === "warmup" ? "Calentamiento" : block.type === "cooldown" ? "Enfriamiento" : "Principal"}: {block.name}
                            </Text>
                            {block.exercises?.map((ex, ei) => (
                              <Group key={ei} gap="xs" ml="sm">
                                <Text size="xs">• {ex.exercise?.name || ex.name || "Ejercicio"}</Text>
                                <Badge size="xs" variant="light" color="blue">{ex.sets || 3}x{ex.reps || "10-12"}</Badge>
                                {ex.rest_seconds && <Badge size="xs" variant="light" color="gray">{ex.rest_seconds}s</Badge>}
                              </Group>
                            ))}
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ));
            })()}

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={closeViewProgram}>Cerrar</Button>
              <Button
                leftSection={<IconEdit size={16} />}
                onClick={() => {
                  closeViewProgram();
                  openProgramBuilder(viewingProgram);
                }}
              >
                Editar programa
              </Button>
            </Group>
          </Stack>
        )}
      </BottomSheet>
    </Container>
  );
}

export default WorkoutsPage;
