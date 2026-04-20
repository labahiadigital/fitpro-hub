import {
  Badge,
  Container,
  Image,
  Select,
  Tabs,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconBarbell,
  IconFlame,
  IconHeartbeat,
  IconStretching,
  IconTemplate,
  IconUsers,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openDangerConfirm } from "../../utils/confirmModal";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { useUpdateExercise, useDeleteExercise } from "../../hooks/useExercises";
import { useExerciseFavorites, useToggleExerciseFavorite } from "../../hooks/useFavorites";
import { notifications } from "@mantine/notifications";

import { TemplatesTab } from "./components/TemplatesTab";
import { ClientProgramsTab } from "./components/ClientProgramsTab";
import { ExercisesTab } from "./components/ExercisesTab";
import { CategoryExercisesTab } from "./components/CategoryExercisesTab";
import { ExerciseFormModal } from "./components/ExerciseFormModal";
import { ProgramBuilderSidebar } from "./components/ProgramBuilderSidebar";
import { ViewProgramModal } from "./components/ViewProgramModal";

const CATEGORY_TAB_CONFIGS = {
  warmup: { category: "calentamiento", placeholder: "Buscar ejercicios de calentamiento...", gradient: "rgba(255, 107, 0, 0.2)", icon: <IconFlame color="var(--mantine-color-orange-6)" size={28} />, color: "orange", emptyTitle: "No hay ejercicios de calentamiento", emptyDesc: "Añade ejercicios de calentamiento a tu biblioteca.", emptyLabel: "Añadir Calentamiento", emptyIcon: <IconFlame size={36} /> },
  stretching: { category: "estiramiento", placeholder: "Buscar estiramientos...", gradient: "rgba(34, 197, 94, 0.2)", icon: <IconStretching color="var(--mantine-color-green-6)" size={28} />, color: "green", emptyTitle: "No hay estiramientos", emptyDesc: "Añade ejercicios de estiramiento a tu biblioteca.", emptyLabel: "Añadir Estiramiento", emptyIcon: <IconStretching size={36} /> },
  cardio: { category: "cardio", placeholder: "Buscar ejercicios de cardio...", gradient: "rgba(239, 68, 68, 0.2)", icon: <IconHeartbeat color="var(--mantine-color-red-6)" size={28} />, color: "red", emptyTitle: "No hay ejercicios de cardio", emptyDesc: "Añade ejercicios aeróbicos y de cardio a tu biblioteca.", emptyLabel: "Añadir Cardio", emptyIcon: <IconHeartbeat size={36} /> },
} as const;

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

export function WorkoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const editProgramId = searchParams.get("edit");
  const clientId = searchParams.get("clientId");
  const returnTo = searchParams.get("returnTo");

  const { data: clientData } = useClient(clientId || "");

  const goBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
    } else if (clientId) {
      navigate(`/clients/${clientId}`);
    }
  }, [navigate, returnTo, clientId]);

  const [activeTab, setActiveTab] = useState<string | null>("templates");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false);
  const [builderOpened, { open: openBuilder, close: closeBuilder }] = useDisclosure(false);
  const [searchExercise, setSearchExercise] = useState("");
  const [exerciseSourceFilter, setExerciseSourceFilter] = useState("all");
  const [muscleGroupFilter, setMuscleGroupFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [workoutWeeks, setWorkoutWeeks] = useState<{ week: number; days: WorkoutDay[] }[]>([{ week: 1, days: [...initialWorkoutDays] }]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const currentWeekRef = useRef(currentWeek);
  currentWeekRef.current = currentWeek;
  const workoutDays = useMemo(() => {
    const wk = workoutWeeks.find((w) => w.week === currentWeek);
    return wk ? wk.days : initialWorkoutDays;
  }, [workoutWeeks, currentWeek]);
  const setWorkoutDays = useCallback((days: WorkoutDay[]) => {
    setWorkoutWeeks((prev) => prev.map((w) => w.week === currentWeekRef.current ? { ...w, days } : w));
  }, []);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isTemplateModeOn, setIsTemplateModeOn] = useState(false);
  const [viewingProgram, setViewingProgram] = useState<any>(null);
  const [viewProgramOpened, { open: openViewProgram, close: closeViewProgram }] = useDisclosure(false);

  // Client picker inside the builder sidebar. We only need it once the
  // trainer actually opens the builder — saves a ~1.5 s `/clients?page_size=100`
  // round-trip on every mount of /workouts.
  const { data: clientsData } = useClients(
    { page: 1, search: "", page_size: 100 },
    { enabled: builderOpened, staleTime: 5 * 60 * 1000 },
  );
  const clientOptions = (clientsData?.items || []).map((c: { id: string; first_name?: string; last_name?: string }) => ({
    value: c.id,
    label: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sin nombre",
  }));

  const { data: exercises = [], isLoading: loadingExercises } = useExercises({ search: searchExercise });

  const { data: exerciseFavorites = [] } = useExerciseFavorites();
  const toggleExerciseFavorite = useToggleExerciseFavorite();
  const favoritesSet = useMemo(() => new Set<string>(exerciseFavorites as string[]), [exerciseFavorites]);

  const sourceFilteredExercises = useMemo(() => {
    if (exerciseSourceFilter === "favorites") return exercises.filter((e: any) => favoritesSet.has(e.id));
    if (exerciseSourceFilter === "system") return exercises.filter((e: any) => e.is_global);
    if (exerciseSourceFilter === "custom") return exercises.filter((e: any) => !e.is_global);
    return exercises;
  }, [exercises, exerciseSourceFilter, favoritesSet]);

  const exerciseCounts = useMemo(() => {
    const counts = { fuerza: 0, calentamiento: 0, estiramiento: 0, cardio: 0 };
    for (const e of exercises || []) {
      const cat = e.category?.toLowerCase();
      if (!cat || cat === "fuerza") counts.fuerza++;
      else if (cat === "calentamiento") counts.calentamiento++;
      else if (cat === "estiramiento") counts.estiramiento++;
      else if (cat === "cardio") counts.cardio++;
    }
    return counts;
  }, [exercises]);

  const sortFavoritesFirst = useCallback(
    (list: any[]) => {
      return [...list].sort((a, b) => {
        const aFav = favoritesSet.has(a.id) ? 0 : 1;
        const bFav = favoritesSet.has(b.id) ? 0 : 1;
        return aFav - bFav || a.name.localeCompare(b.name);
      });
    },
    [favoritesSet],
  );

  const getFilteredByCategory = useCallback(
    (category: string) => {
      const base = (sourceFilteredExercises || []).filter(
        (e: any) => {
          const matchesCategory = e.category?.toLowerCase() === category;
          const matchesSearch = e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
            e.muscle_groups?.some((m: string) => m.toLowerCase().includes(searchExercise.toLowerCase()));
          const matchesMuscle = !muscleGroupFilter || e.muscle_groups?.some((m: string) => m.toLowerCase() === muscleGroupFilter.toLowerCase());
          const matchesEquip = !equipmentFilter || e.equipment?.some((eq: string) => eq.toLowerCase() === equipmentFilter.toLowerCase());
          return matchesCategory && matchesSearch && matchesMuscle && matchesEquip;
        }
      );
      return sortFavoritesFirst(base);
    },
    [sourceFilteredExercises, searchExercise, sortFavoritesFirst],
  );

  const { data: programs, isLoading: loadingPrograms } = useWorkoutPrograms();
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

  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (editProgramId && !builderOpened) {
      let program = programs?.find((p: any) => p.id === editProgramId);
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
      review_interval_days: program.review_interval_days || null,
    });
    setCurrentWeek(1);
    openBuilder();
  };

  const handleCloseBuilder = () => {
    closeBuilder();
    setSelectedClientId(null);
    setSelectedClient(null);
    setIsTemplateModeOn(true);
    if (editProgramId || clientId) {
      setSearchParams({});
    }
    if (returnTo || clientId) {
      goBack();
    }
  };

  const exerciseForm = useForm({
    initialValues: {
      name: "",
      alias: "",
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

  const openEditExercise = (exercise: any) => {
    setEditingExercise(exercise);
    exerciseForm.setValues({
      name: exercise.name || "",
      alias: exercise.alias || "",
      description: exercise.description || "",
      instructions: exercise.instructions || "",
      muscle_groups: exercise.muscle_groups || [],
      equipment: exercise.equipment || [],
      difficulty: (exercise.difficulty || "intermediate") as "beginner" | "intermediate" | "advanced",
      category: exercise.category || "",
    });
    openExerciseModal();
  };

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
      review_interval_days: null as number | null,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const handleToggleExerciseFavorite = useCallback((exerciseId: string, isFavorite: boolean) => {
    toggleExerciseFavorite.mutate({ exerciseId, isFavorite });
  }, [toggleExerciseFavorite]);

  const handleCreateExerciseFromBuilder = useCallback(async (data: { name: string; category?: string; muscle_groups: string[]; equipment: string[]; difficulty: string; description?: string; image_url?: string; video_url?: string }) => {
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

  const handleCloneExercise = async (exercise: any) => {
    try {
      const cloneData = {
        name: exercise.name,
        alias: exercise.alias || "",
        description: exercise.description || "",
        instructions: exercise.instructions || "",
        muscle_groups: exercise.muscle_groups || [],
        equipment: exercise.equipment || [],
        difficulty: exercise.difficulty || "intermediate",
        category: exercise.category || "fuerza",
      };
      const res = await createExercise.mutateAsync(cloneData);
      closeExerciseModal();
      const newExercise = res.data;
      setEditingExercise(newExercise);
      exerciseForm.setValues({
        name: newExercise.name || cloneData.name,
        alias: newExercise.alias || cloneData.alias,
        description: newExercise.description || cloneData.description,
        instructions: newExercise.instructions || cloneData.instructions,
        muscle_groups: newExercise.muscle_groups || cloneData.muscle_groups,
        equipment: newExercise.equipment || cloneData.equipment,
        difficulty: newExercise.difficulty || cloneData.difficulty,
        category: newExercise.category || cloneData.category,
      });
      openExerciseModal();
      notifications.show({ title: "Copia creada", message: `"${cloneData.name}" se ha clonado como ejercicio propio`, color: "green" });
    } catch {
      notifications.show({ title: "Error", message: "No se pudo clonar el ejercicio", color: "red" });
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
        review_interval_days: program.review_interval_days || null,
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

  // Al editar una plantilla ya existente, el guardado es de plantilla por
  // defecto: no hace falta toggle ni cliente asignado.
  const isEditingTemplate = !!(editingProgram && editingProgram.is_template);
  const canSaveProgram = !!(
    selectedClientId ||
    programForm.values.client_id ||
    clientId ||
    isTemplateModeOn ||
    isEditingTemplate
  );
  // Cuando editamos un programa YA asignado a un cliente (no una plantilla),
  // el flujo para crear una plantilla reutilizable es un botón explícito en vez
  // del Switch: evita el patrón confuso de "marca el switch y guarda el plan".
  const isEditingClientProgram = !!(
    editingProgram && editingProgram.client_id && !editingProgram.is_template
  );

  const serializeWorkoutDays = (days: WorkoutDay[]) =>
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
          target_duration_minutes: ex.target_duration_minutes,
          target_distance_km: ex.target_distance_km,
          target_speed_kmh: ex.target_speed_kmh,
        })) || [],
      })),
    }));

  const buildTemplatePayload = () => ({
    weeks: workoutWeeks.map((w) => ({
      week: w.week,
      days: serializeWorkoutDays(w.days),
    })),
    days: serializeWorkoutDays(workoutDays),
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
          target_duration_minutes: ex.target_duration_minutes,
          target_distance_km: ex.target_distance_km,
          target_speed_kmh: ex.target_speed_kmh,
        })) || [],
      }))
    ),
  });

  const handleSaveAsTemplateFromEdit = async () => {
    const values = programForm.values;
    if (!values.name) return;
    try {
      await createProgram.mutateAsync({
        name: `${values.name} (Plantilla)`,
        description: values.description,
        duration_weeks: values.duration_weeks,
        difficulty: values.difficulty,
        tags: values.tags,
        template: buildTemplatePayload(),
        client_id: undefined,
        is_template: true,
        start_date: undefined,
        end_date: undefined,
      } as any);
      notifications.show({
        title: "Plantilla creada",
        message: "Se guardó una copia reutilizable del programa",
        color: "teal",
        icon: <IconTemplate size={16} />,
      });
    } catch {
      // El mutation ya muestra el error
    }
  };

  const handleSaveProgram = async () => {
    const values = programForm.values;
    if (!values.name || !canSaveProgram) return;

    const planClientId = selectedClientId || values.client_id || clientId || null;
    const templatePayload = buildTemplatePayload();

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

  const handleDeleteProgram = (programId: string) => {
    openDangerConfirm({
      title: "Eliminar programa",
      message: "¿Estás seguro de que quieres eliminar este programa?",
      onConfirm: async () => { try { await deleteProgram.mutateAsync(programId); } catch { /* handled */ } },
    });
  };

  const filteredExercises = useMemo(() => {
    const base = (sourceFilteredExercises || []).filter(
      (e: any) => {
        const matchesSearch = e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
          e.muscle_groups?.some((m: string) => m.toLowerCase().includes(searchExercise.toLowerCase()));
        const matchesMuscle = !muscleGroupFilter || e.muscle_groups?.some((m: string) => m.toLowerCase() === muscleGroupFilter.toLowerCase());
        const matchesEquip = !equipmentFilter || e.equipment?.some((eq: string) => eq.toLowerCase() === equipmentFilter.toLowerCase());
        return matchesSearch && matchesMuscle && matchesEquip;
      }
    );
    return sortFavoritesFirst(base);
  }, [sourceFilteredExercises, searchExercise, muscleGroupFilter, equipmentFilter, sortFavoritesFirst]);

  const handleCloseExerciseModal = () => {
    closeExerciseModal();
    setEditingExercise(null);
    exerciseForm.reset();
  };

  const handleClientChange = (value: string | null) => {
    setSelectedClientId(value);
    if (value) {
      loadClientData(value);
    } else {
      setSelectedClient(null);
      programForm.setFieldValue("client_id", null);
    }
  };

  const handleDurationChange = (weeks: number) => {
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
  };

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
          <Tabs.List mb="md" style={{ borderBottom: "1px solid var(--border-subtle)", flexWrap: "nowrap" }}>
            {([
              { value: "templates", icon: <IconTemplate size={14} />, label: "Plantillas", count: templates.length },
              { value: "client-programs", icon: <IconUsers size={14} />, label: "Programas de Clientes", count: clientPrograms.length },
              { value: "exercises", icon: <IconBarbell size={14} />, label: "Ejercicios", count: exerciseCounts.fuerza },
              { value: "warmup", icon: <IconFlame size={14} />, label: "Calentamiento", count: exerciseCounts.calentamiento },
              { value: "stretching", icon: <IconStretching size={14} />, label: "Estiramientos", count: exerciseCounts.estiramiento },
              { value: "cardio", icon: <IconHeartbeat size={14} />, label: "Cardio", count: exerciseCounts.cardio },
            ] as const).map((t) => (
              <Tabs.Tab key={t.value} leftSection={t.icon} value={t.value} style={{ fontWeight: 600, fontSize: "13px", flexDirection: "column", gap: 2, alignItems: "center", minWidth: 0 }}>
                {t.count > 0 && <Badge size="xs" radius="md" variant="light">{t.count}</Badge>}
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</span>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        )}

        <Tabs.Panel value="templates">
          <TemplatesTab
            templates={templates}
            loadingPrograms={loadingPrograms}
            onEdit={openProgramBuilder}
            onView={(p) => { setViewingProgram(p); openViewProgram(); }}
            onDuplicate={handleDuplicateProgram}
            onDelete={handleDeleteProgram}
            createPending={createProgram.isPending}
            deletePending={deleteProgram.isPending}
          />
        </Tabs.Panel>

        <Tabs.Panel value="client-programs">
          <ClientProgramsTab
            clientPrograms={clientPrograms}
            loadingPrograms={loadingPrograms}
            clientsMap={clientsMap}
            onEdit={openProgramBuilder}
            onView={(p) => { setViewingProgram(p); openViewProgram(); }}
            onDuplicate={handleDuplicateProgram}
            onDelete={handleDeleteProgram}
            createPending={createProgram.isPending}
            deletePending={deleteProgram.isPending}
          />
        </Tabs.Panel>

        <Tabs.Panel value="exercises">
          <ExercisesTab
            filteredExercises={filteredExercises}
            loadingExercises={loadingExercises}
            favoritesSet={favoritesSet}
            searchExercise={searchExercise}
            exerciseSourceFilter={exerciseSourceFilter}
            muscleGroupFilter={muscleGroupFilter}
            equipmentFilter={equipmentFilter}
            muscleGroups={muscleGroups}
            equipmentOptions={equipmentOptions}
            onSearchChange={setSearchExercise}
            onSourceFilterChange={setExerciseSourceFilter}
            onMuscleGroupFilterChange={(v) => setMuscleGroupFilter(v || "")}
            onEquipmentFilterChange={(v) => setEquipmentFilter(v || "")}
            onEditExercise={openEditExercise}
            onNewExercise={openNewExercise}
            onToggleFavorite={handleToggleExerciseFavorite}
            onEnlargeImage={setEnlargedImage}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </Tabs.Panel>

        {(["warmup", "stretching", "cardio"] as const).map((tab) => {
          const cfg = CATEGORY_TAB_CONFIGS[tab];
          const items = getFilteredByCategory(cfg.category);
          return (
            <Tabs.Panel value={tab} key={tab}>
              <CategoryExercisesTab
                config={cfg}
                items={items}
                loadingExercises={loadingExercises}
                favoritesSet={favoritesSet}
                searchExercise={searchExercise}
                exerciseSourceFilter={exerciseSourceFilter}
                muscleGroupFilter={muscleGroupFilter}
                equipmentFilter={equipmentFilter}
                muscleGroups={muscleGroups}
                equipmentOptions={equipmentOptions}
                onSearchChange={setSearchExercise}
                onSourceFilterChange={setExerciseSourceFilter}
                onMuscleGroupFilterChange={(v) => setMuscleGroupFilter(v || "")}
                onEquipmentFilterChange={(v) => setEquipmentFilter(v || "")}
                onEditExercise={openEditExercise}
                onNewExercise={openNewExercise}
                onToggleFavorite={handleToggleExerciseFavorite}
                onEnlargeImage={setEnlargedImage}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </Tabs.Panel>
          );
        })}
      </Tabs>

      <ExerciseFormModal
        opened={exerciseModalOpened}
        onClose={handleCloseExerciseModal}
        exerciseForm={exerciseForm}
        editingExercise={editingExercise}
        exercises={exercises}
        muscleGroups={muscleGroups}
        equipmentOptions={equipmentOptions}
        onSubmit={handleCreateExercise}
        onDelete={handleDeleteExercise}
        onCloneAsOwn={handleCloneExercise}
        createPending={createExercise.isPending}
        updatePending={updateExercise.isPending}
        deletePending={deleteExercise.isPending}
      />

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
          <ProgramBuilderSidebar
            programForm={programForm}
            clientOptions={clientOptions}
            selectedClientId={selectedClientId}
            isTemplateModeOn={isTemplateModeOn}
            clientId={clientId}
            canSaveProgram={canSaveProgram}
            isEditingTemplate={isEditingTemplate}
            isEditingClientProgram={isEditingClientProgram}
            isSavingTemplate={createProgram.isPending}
            onClientChange={handleClientChange}
            onTemplateModeChange={setIsTemplateModeOn}
            onDurationChange={handleDurationChange}
            onSaveAsTemplate={handleSaveAsTemplateFromEdit}
          />
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
            startDate={programForm.values.start_date}
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

      <BottomSheet opened={!!enlargedImage} onClose={() => setEnlargedImage(null)} desktopSize="lg" title={enlargedImage?.name} centered>
        {enlargedImage && <Image src={enlargedImage.url} alt={enlargedImage.name} fit="contain" mah={500} />}
      </BottomSheet>

      <ViewProgramModal
        opened={viewProgramOpened}
        program={viewingProgram}
        clientsMap={clientsMap}
        onClose={closeViewProgram}
        onEdit={openProgramBuilder}
      />
    </Container>
  );
}

export default WorkoutsPage;
