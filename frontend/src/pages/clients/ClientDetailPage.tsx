import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Image,
  Menu,
  Modal,
  MultiSelect,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  ThemeIcon,
  Timeline,
  Card,
  FileButton,
  Center,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import {
  IconAlertTriangle,
  IconBarbell,
  IconCalendarEvent,
  IconCamera,
  IconClipboard,
  IconCreditCard,
  IconDotsVertical,
  IconDownload,
  IconEdit,
  IconFile,
  IconFileText,
  IconHistory,
  IconMail,
  IconMessage,
  IconMessageOff,
  IconPhone,
  IconPhoto,
  IconPill,
  IconPlus,
  IconSalad,
  IconTrash,
  IconTrendingUp,
  IconUser,
  IconUpload,
  IconTarget,
  IconActivity,
  IconHeart,
  IconScale,
} from "@tabler/icons-react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { useClient, useUpdateClient, useDeleteClient, useClientMeasurements, useClientPhotos, useClientProgressSummary, useClientWorkoutLogs, useClientNutritionLogs } from "../../hooks/useClients";
import { 
  useClientMealPlans,
  useWorkoutProgramTemplates,
  useMealPlanTemplates,
  useAssignWorkoutProgram,
  useAssignMealPlan,
  useSupabaseMealPlan,
  useClientWorkoutAssignments,
  useDeleteAssignedProgram,
  useDeleteAssignedMealPlan,
} from "../../hooks/useSupabaseData";
// AllergenList removed - using inline badges now
import { MealPlanDetailView } from "../../components/nutrition/MealPlanDetailView";
import { generateMealPlanPDF } from "../../services/pdfGenerator";
import { useAuthStore } from "../../stores/auth";
import { IconArrowLeft, IconEye } from "@tabler/icons-react";

// Lista de alérgenos comunes
const COMMON_ALLERGENS = [
  { value: "gluten", label: "Gluten" },
  { value: "lactosa", label: "Lactosa" },
  { value: "huevo", label: "Huevo" },
  { value: "pescado", label: "Pescado" },
  { value: "mariscos", label: "Mariscos" },
  { value: "frutos_secos", label: "Frutos secos" },
  { value: "cacahuete", label: "Cacahuete" },
  { value: "soja", label: "Soja" },
  { value: "apio", label: "Apio" },
  { value: "mostaza", label: "Mostaza" },
  { value: "sesamo", label: "Sésamo" },
  { value: "sulfitos", label: "Sulfitos" },
  { value: "moluscos", label: "Moluscos" },
  { value: "altramuces", label: "Altramuces" },
];

// Lista de intolerancias comunes
const COMMON_INTOLERANCES = [
  { value: "fructosa", label: "Fructosa" },
  { value: "sorbitol", label: "Sorbitol" },
  { value: "histamina", label: "Histamina" },
  { value: "fodmap", label: "FODMAP" },
  { value: "cafeina", label: "Cafeína" },
  { value: "alcohol", label: "Alcohol" },
];

// KPI Card Component - Compact version
function StatCard({ icon, label, value, color, trend }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Box className="nv-card-compact" p="md">
      <Group gap="xs" mb={4}>
        <Text className="text-label" style={{ fontSize: "10px" }}>{label}</Text>
        {trend && (
          <Badge 
            size="xs" 
            variant="light"
            color={trend.positive ? "green" : "red"}
            radius="xl"
            style={{ padding: "2px 6px" }}
          >
            {trend.positive ? "+" : ""}{trend.value}%
          </Badge>
        )}
      </Group>
      <Group justify="space-between" align="center" gap="xs">
        <Text 
          className="text-display" 
          style={{ fontSize: "1.25rem", color, lineHeight: 1 }}
        >
          {value}
        </Text>
        <ThemeIcon 
          size={32} 
          radius="md" 
          variant="light"
          style={{ 
            backgroundColor: `${color}12`,
            color: color
          }}
        >
          {icon}
        </ThemeIcon>
      </Group>
    </Box>
  );
}

// Info Row Component
function InfoRow({ label, value, icon }: { label: string; value: string | React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Group justify="space-between" py="sm" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <Group gap="sm">
        {icon && <Box style={{ color: "var(--nv-slate-light)" }}>{icon}</Box>}
        <Text size="sm" c="dimmed">{label}</Text>
      </Group>
      <Text size="sm" fw={600} style={{ color: "var(--nv-dark)" }}>{value}</Text>
    </Group>
  );
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  
  const { data: fetchedClient, isLoading } = useClient(id || "");
  const { data: clientMealPlans } = useClientMealPlans(id || "");
  const { data: clientWorkoutPrograms = [] } = useClientWorkoutAssignments(id || "");
  const { data: clientMeasurements = [] } = useClientMeasurements(id || "");
  const { data: clientPhotos = [] } = useClientPhotos(id || "");
  const { data: clientProgressSummary } = useClientProgressSummary(id || "");
  const { data: clientWorkoutLogs = [] } = useClientWorkoutLogs(id || "");
  const { data: clientNutritionLogs } = useClientNutritionLogs(id || "", 30);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  
  // Modal de alergias e intolerancias
  const [allergyModalOpened, { open: openAllergyModal, close: closeAllergyModal }] = useDisclosure(false);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  
  // Modal de editar cliente
  const [editClientModalOpened, { open: openEditClientModal, close: closeEditClientModal }] = useDisclosure(false);
  
  // Modal de información personal
  const [editInfoModalOpened, { open: openEditInfoModal, close: closeEditInfoModal }] = useDisclosure(false);
  
  // Modal de confirmación de eliminar
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [assignProgramModalOpened, { open: openAssignProgramModal, close: closeAssignProgramModal }] = useDisclosure(false);
  const [assignMealPlanModalOpened, { open: openAssignMealPlanModal, close: closeAssignMealPlanModal }] = useDisclosure(false);
  
  // Hooks para obtener templates
  const { data: workoutTemplates = [] } = useWorkoutProgramTemplates();
  const { data: mealPlanTemplates = [] } = useMealPlanTemplates();
  
  // Hooks para asignaciones
  const assignWorkoutProgram = useAssignWorkoutProgram();
  const assignMealPlan = useAssignMealPlan();
  
  // Hooks para eliminar asignaciones
  const deleteAssignedProgram = useDeleteAssignedProgram();
  const deleteAssignedMealPlan = useDeleteAssignedMealPlan();
  
  // Estado para eliminar programa/plan
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);
  const [deletingMealPlanId, setDeletingMealPlanId] = useState<string | null>(null);
  const [deleteConfirmModalOpened, { open: openDeleteConfirmModal, close: closeDeleteConfirmModal }] = useDisclosure(false);
  
  // Estados para los formularios de asignación
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedMealPlanForAssign, setSelectedMealPlanForAssign] = useState<string | null>(null);
  const [assignStartDate, setAssignStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignEndDate, setAssignEndDate] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");
  
  // Estado para ver plan nutricional detallado
  const [viewingMealPlanId, setViewingMealPlanId] = useState<string | null>(null);
  const { data: viewingMealPlan } = useSupabaseMealPlan(viewingMealPlanId || "");
  
  // Estado para ver programa de entrenamiento detallado
  const [selectedProgramForView, setSelectedProgramForView] = useState<{ id: string; name: string; description?: string; duration_weeks?: number; difficulty?: string; template?: { blocks?: Array<{ name: string; type?: string; exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }> } } | null>(null);
  const [viewProgramModalOpened, { open: openViewProgramModal, close: closeViewProgramModal }] = useDisclosure(false);

  // Use real client data from API - with default empty object to prevent hook errors
  const client = fetchedClient || {
    id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    goals: "",
    birth_date: "",
    gender: "",
    height_cm: 0,
    weight_kg: 0,
    internal_notes: "",
    health_data: {},
  };
  
  // Documents and other data should come from API
  const documents: { id: string; name: string; type: string; direction: string; created_at: string; is_read: boolean }[] = [];
  
  // Transform clientPhotos from API to the format expected by the UI
  const progressPhotos = (clientPhotos || []).map((photo, index) => ({
    id: `photo-${index}`,
    photo_url: photo.url,
    photo_type: photo.type || "front",
    photo_date: photo.measurement_date || photo.uploaded_at || new Date().toISOString(),
    weight_kg: "",
  }));
  
  // Meal plans from Supabase
  const mealPlans = (clientMealPlans || []).map((plan: { 
    id: string; 
    name: string; 
    target_calories?: number; 
    target_protein?: number;
    target_carbs?: number;
    target_fat?: number;
    is_template?: string | boolean; 
    created_at: string 
  }) => ({
    id: plan.id,
    name: plan.name,
    target_calories: plan.target_calories || 2000,
    target_protein: plan.target_protein || 0,
    target_carbs: plan.target_carbs || 0,
    target_fat: plan.target_fat || 0,
    status: plan.is_template === false || plan.is_template === "N" ? "active" : "inactive",
    created_at: plan.created_at,
  }));

  const supplements: { id: string; name: string; dosage: string; frequency: string }[] = [];

  // ===== CÁLCULOS NUTRICIONALES BASADOS EN EL CLIENTE =====
  const ACTIVITY_MULTIPLIERS: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const ACTIVITY_LABELS: Record<string, string> = {
    sedentary: "Sedentario",
    light: "Ligero",
    moderate: "Activo",
    active: "Muy Activo",
    very_active: "Extremadamente Activo",
  };

  const GOAL_LABELS: Record<string, string> = {
    fat_loss: "Pérdida de Grasa",
    maintenance: "Mantenimiento",
    muscle_gain: "Ganancia Muscular",
  };

  // Calcular edad del cliente
  const clientAge = client.birth_date 
    ? Math.floor((Date.now() - new Date(client.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 30;

  // Obtener datos de health_data o valores por defecto
  const activityLevel = (client as any).health_data?.activity_level || "moderate";
  const goalType = (client as any).health_data?.goal_type || "maintenance";

  // Calcular BMR (Mifflin-St Jeor)
  const clientBMR = (() => {
    const weight = parseFloat(String(client.weight_kg)) || 70;
    const height = parseFloat(String(client.height_cm)) || 170;
    const age = clientAge;
    const gender = client.gender;
    
    if (gender === "female") {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
    return 10 * weight + 6.25 * height - 5 * age + 5;
  })();

  // Calcular TDEE
  const clientTDEE = Math.round(clientBMR * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55));

  // Calcular objetivos según tipo de objetivo
  const nutritionalTargets = (() => {
    const weight = parseFloat(String(client.weight_kg)) || 70;
    let targetCalories = clientTDEE;
    
    if (goalType === "fat_loss") {
      targetCalories = Math.round(clientTDEE * 0.8); // -20%
    } else if (goalType === "muscle_gain") {
      targetCalories = Math.round(clientTDEE * 1.15); // +15%
    }
    
    // Proteínas: 2.0-2.2g/kg según objetivo
    const proteinMultiplier = goalType === "maintenance" ? 1.8 : 2.2;
    const targetProtein = Math.round(weight * proteinMultiplier);
    
    // Grasas: 25-30% de calorías
    const fatCalories = targetCalories * 0.28;
    const targetFat = Math.round(fatCalories / 9);
    
    // Carbohidratos: resto de calorías
    const proteinCalories = targetProtein * 4;
    const remainingCalories = targetCalories - proteinCalories - fatCalories;
    const targetCarbs = Math.round(remainingCalories / 4);
    
    return {
      calories: targetCalories,
      protein: targetProtein,
      carbs: targetCarbs,
      fat: targetFat,
      bmr: Math.round(clientBMR),
      tdee: clientTDEE,
    };
  })();
  
  // Formulario de edición de cliente
  const editClientForm = useForm({
    initialValues: {
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      email: client.email || "",
      phone: client.phone || "",
      goals: client.goals || "",
    },
  });
  
  // Formulario de información personal
  const editInfoForm = useForm({
    initialValues: {
      birth_date: client.birth_date || "",
      gender: client.gender || "",
      height_cm: client.height_cm || 0,
      weight_kg: client.weight_kg || 0,
      internal_notes: client.internal_notes || "",
    },
  });
  
  // Verificar si es cliente demo
  const isDemoClient = id?.startsWith("demo-client-") || false;
  
  // If loading, show loader
  if (isLoading) {
    return (
      <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  // If no client found, show error
  if (!fetchedClient) {
    return (
      <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
        <Text c="dimmed" ta="center">Cliente no encontrado</Text>
      </Container>
    );
  }
  
  // Handler para editar cliente
  const handleEditClient = async (values: typeof editClientForm.values) => {
    if (!id) return;
    
    if (isDemoClient) {
      notifications.show({
        title: "Modo Demo",
        message: "En modo demo, los cambios no se guardan permanentemente",
        color: "yellow",
      });
      closeEditClientModal();
      return;
    }
    
    try {
      await updateClient.mutateAsync({ id, data: values });
      notifications.show({
        title: "Cliente actualizado",
        message: "Los datos del cliente se han actualizado correctamente",
        color: "green",
      });
      closeEditClientModal();
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };
  
  // Handler para editar información personal
  const handleEditInfo = async (values: typeof editInfoForm.values) => {
    if (!id) return;
    
    if (isDemoClient) {
      notifications.show({
        title: "Modo Demo",
        message: "En modo demo, los cambios no se guardan permanentemente",
        color: "yellow",
      });
      closeEditInfoModal();
      return;
    }
    
    try {
      // Convert string/null fields to number/undefined for API
      const data = {
        ...values,
        height_cm: values.height_cm ? Number(values.height_cm) : undefined,
        weight_kg: values.weight_kg ? Number(values.weight_kg) : undefined,
      };
      await updateClient.mutateAsync({ id, data });
      notifications.show({
        title: "Información actualizada",
        message: "La información personal se ha actualizado correctamente",
        color: "green",
      });
      closeEditInfoModal();
    } catch (error) {
      console.error("Error updating info:", error);
    }
  };
  
  // Handler para eliminar cliente
  const handleDeleteClient = async () => {
    if (!id) return;
    
    if (isDemoClient) {
      notifications.show({
        title: "Modo Demo",
        message: "En modo demo, no se pueden eliminar clientes",
        color: "yellow",
      });
      closeDeleteModal();
      return;
    }
    
    try {
      await deleteClient.mutateAsync(id);
      notifications.show({
        title: "Cliente eliminado",
        message: "El cliente ha sido eliminado correctamente",
        color: "green",
      });
      navigate("/clients");
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };
  
  // Handler para toggle de chat
  const handleToggleChat = async () => {
    if (!id) return;
    
    if (isDemoClient) {
      notifications.show({
        title: "Modo Demo",
        message: "En modo demo, los cambios no se guardan permanentemente",
        color: "yellow",
      });
      return;
    }
    
    try {
      await updateClient.mutateAsync({ 
        id, 
        data: { chat_enabled: !client.chat_enabled } 
      });
      notifications.show({
        title: "Chat actualizado",
        message: client.chat_enabled ? "Chat deshabilitado" : "Chat habilitado",
        color: "green",
      });
    } catch (error) {
      console.error("Error toggling chat:", error);
    }
  };
  
  // Handler para abrir modal de edición de cliente
  const handleOpenEditClientModal = () => {
    editClientForm.setValues({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      email: client.email || "",
      phone: client.phone || "",
      goals: client.goals || "",
    });
    openEditClientModal();
  };
  
  // Handler para abrir modal de información personal
  const handleOpenEditInfoModal = () => {
    editInfoForm.setValues({
      birth_date: client.birth_date || "",
      gender: client.gender || "",
      height_cm: client.height_cm || 0,
      weight_kg: client.weight_kg || 0,
      internal_notes: client.internal_notes || "",
    });
    openEditInfoModal();
  };
  
  // Handler para mensaje
  const handleSendMessage = () => {
    navigate(`/chat?client=${id}`);
  };
  
  // Handler para nueva sesión
  const handleNewSession = () => {
    navigate(`/calendar?new=true&client=${id}`);
  };
  
  // Handler para asignar programa
  const handleAssignProgram = () => {
    setSelectedProgram(null);
    setAssignStartDate(new Date().toISOString().split('T')[0]);
    setAssignEndDate("");
    setAssignNotes("");
    openAssignProgramModal();
  };
  
  // Handler para asignar plan nutricional
  const handleAssignNutritionPlan = () => {
    setSelectedMealPlanForAssign(null);
    setAssignStartDate(new Date().toISOString().split('T')[0]);
    setAssignEndDate("");
    setAssignNotes("");
    openAssignMealPlanModal();
  };
  
  // Handler para confirmar asignación de programa
  const handleConfirmAssignProgram = async () => {
    if (!id || !selectedProgram || !assignStartDate) {
      notifications.show({
        title: "Error",
        message: "Selecciona un programa y fecha de inicio",
        color: "red",
      });
      return;
    }
    
    if (isDemoClient) {
      notifications.show({
        title: "Modo Demo",
        message: "En modo demo, las asignaciones no se guardan permanentemente",
        color: "yellow",
      });
      closeAssignProgramModal();
      return;
    }
    
    try {
      await assignWorkoutProgram.mutateAsync({
        clientId: id,
        programId: selectedProgram,
        startDate: assignStartDate,
        endDate: assignEndDate || undefined,
        notes: assignNotes || undefined,
      });
      notifications.show({
        title: "Programa asignado",
        message: "El programa de entrenamiento ha sido asignado correctamente",
        color: "green",
      });
      closeAssignProgramModal();
    } catch (error) {
      console.error("Error assigning program:", error);
      notifications.show({
        title: "Error",
        message: "No se pudo asignar el programa",
        color: "red",
      });
    }
  };
  
  // Handler para confirmar asignación de plan nutricional
  const handleConfirmAssignMealPlan = async () => {
    if (!id || !selectedMealPlanForAssign || !assignStartDate) {
      notifications.show({
        title: "Error",
        message: "Selecciona un plan nutricional y fecha de inicio",
        color: "red",
      });
      return;
    }
    
    if (isDemoClient) {
      notifications.show({
        title: "Modo Demo",
        message: "En modo demo, las asignaciones no se guardan permanentemente",
        color: "yellow",
      });
      closeAssignMealPlanModal();
      return;
    }
    
    try {
      await assignMealPlan.mutateAsync({
        clientId: id,
        mealPlanId: selectedMealPlanForAssign,
        startDate: assignStartDate,
        endDate: assignEndDate || undefined,
        notes: assignNotes || undefined,
      });
      notifications.show({
        title: "Plan asignado",
        message: "El plan nutricional ha sido asignado correctamente",
        color: "green",
      });
      closeAssignMealPlanModal();
    } catch (error) {
      console.error("Error assigning meal plan:", error);
      notifications.show({
        title: "Error",
        message: "No se pudo asignar el plan nutricional",
        color: "red",
      });
    }
  };
  
  // Handler para abrir modal de confirmación de eliminar programa
  const handleDeleteProgram = (programId: string) => {
    setDeletingProgramId(programId);
    setDeletingMealPlanId(null);
    openDeleteConfirmModal();
  };
  
  // Handler para abrir modal de confirmación de eliminar plan nutricional
  const handleDeleteMealPlan = (planId: string) => {
    setDeletingMealPlanId(planId);
    setDeletingProgramId(null);
    openDeleteConfirmModal();
  };
  
  // Handler para confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!id) return;
    
    try {
      if (deletingProgramId) {
        await deleteAssignedProgram.mutateAsync({
          programId: deletingProgramId,
          clientId: id,
        });
        notifications.show({
          title: "Programa eliminado",
          message: "El programa de entrenamiento ha sido eliminado correctamente",
          color: "green",
        });
      } else if (deletingMealPlanId) {
        await deleteAssignedMealPlan.mutateAsync({
          planId: deletingMealPlanId,
          clientId: id,
        });
        notifications.show({
          title: "Plan eliminado",
          message: "El plan nutricional ha sido eliminado correctamente",
          color: "green",
        });
      }
      closeDeleteConfirmModal();
      setDeletingProgramId(null);
      setDeletingMealPlanId(null);
    } catch (error) {
      console.error("Error deleting:", error);
      notifications.show({
        title: "Error",
        message: deletingProgramId 
          ? "No se pudo eliminar el programa" 
          : "No se pudo eliminar el plan nutricional",
        color: "red",
      });
    }
  };
  
  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  // Calculate stats from client data
  const calculateDaysAsClient = () => {
    if (!client?.created_at) return 0;
    const created = new Date(client.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const stats = {
    total_sessions: 0, // TODO: Get from bookings API when endpoint available
    sessions_this_month: 0, // TODO: Get from bookings API when endpoint available  
    adherence: 0, // TODO: Calculate from completed vs scheduled sessions
    mrr: 0, // TODO: Get from subscriptions API when endpoint available
    lifetime_value: 0, // TODO: Get from payments API when endpoint available
    days_as_client: calculateDaysAsClient(),
  };

  // TODO: Conectar a endpoints de actividades y sesiones cuando estén disponibles
  const activities: { id: string; type: string; title: string; description: string; date: string }[] = [];
  const sessions: { id: string; date: string; time: string; type: string; status: string; notes: string }[] = [];
  
  // Medidas del cliente (conectado al backend)
  const measurements = clientMeasurements.map(m => ({
    id: m.id,
    date: m.measured_at || m.created_at,
    weight: m.weight_kg || 0,
    body_fat: m.body_fat_percentage || 0,
    muscle_mass: m.muscle_mass_kg || 0,
    measurements: m.measurements || {},
    photos: m.photos || [],
    notes: m.notes,
  }));

  const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      session: <IconCalendarEvent size={14} />,
      payment: <IconCreditCard size={14} />,
      message: <IconMessage size={14} />,
      workout: <IconBarbell size={14} />,
      form: <IconClipboard size={14} />,
    };
    return icons[type] || <IconHistory size={14} />;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      session: "var(--nv-primary)",
      payment: "var(--nv-success)",
      message: "#8B5CF6",
      workout: "var(--nv-warning)",
      form: "#06B6D4",
    };
    return colors[type] || "var(--nv-slate)";
  };

  // Handlers para el modal de alergias
  const handleOpenAllergyModal = () => {
    // Lee de health_data.allergens (la clave correcta del modelo)
    const healthData = (client as { health_data?: { allergens?: string[]; intolerances?: string[] } }).health_data || {};
    setSelectedAllergies(healthData.allergens || []);
    setSelectedIntolerances(healthData.intolerances || []);
    openAllergyModal();
  };

  const handleSaveAllergies = async () => {
    if (!id) return;
    
    // Para clientes demo, solo actualizamos el estado local (no hay backend real)
    if (id.startsWith("demo-client-")) {
      // Simulamos el guardado actualizando el cliente mock
      notifications.show({
        title: "Modo Demo",
        message: "En modo demo, los cambios no se guardan permanentemente",
        color: "yellow",
      });
      closeAllergyModal();
      return;
    }
    
    try {
      await updateClient.mutateAsync({
        id,
        data: {
          health_data: {
            ...((client as { health_data?: object }).health_data || {}),
            allergens: selectedAllergies,  // Cambiado de 'allergies' a 'allergens'
            intolerances: selectedIntolerances,
          },
        },
      });
      notifications.show({
        title: "Guardado",
        message: "Alergias e intolerancias actualizadas correctamente",
        color: "green",
      });
      closeAllergyModal();
    } catch (error) {
      console.error("Error saving allergies:", error);
      notifications.show({
        title: "Error",
        message: "No se pudieron guardar las alergias",
        color: "red",
      });
    }
  };

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        breadcrumbs={[
          { label: "Clientes", href: "/clients" },
          { label: `${client.first_name} ${client.last_name}` },
        ]}
        title=""
      />

      {/* Header del cliente - Premium Design */}
      <Box className="nv-card" p="xl" mb="xl">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <Group gap="xl" wrap="nowrap">
            <Box style={{ position: "relative" }}>
              <Avatar 
                size={100} 
                radius="xl" 
                src={client.avatar_url}
                styles={{
                  root: {
                    border: "4px solid var(--nv-surface)",
                    boxShadow: "var(--shadow-lg)"
                  }
                }}
              >
                <Text size="xl" fw={700}>
                  {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                </Text>
              </Avatar>
              <Box
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 4,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: client.is_active ? "var(--nv-success)" : "var(--nv-slate)",
                  border: "3px solid var(--nv-surface)",
                }}
              />
            </Box>
            
            <Box>
              <Group gap="sm" mb="xs">
                <Text 
                  style={{ 
                    fontSize: "1.75rem", 
                    fontWeight: 800, 
                    letterSpacing: "-0.02em",
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "var(--nv-dark)"
                  }}
                >
                  {client.first_name} {client.last_name}
                </Text>
                {client.tags.map((tag: { name: string; color: string }, index: number) => (
                  <Badge
                    key={index}
                    size="md"
                    variant="light"
                    radius="xl"
                    styles={{
                      root: {
                        backgroundColor: `${tag.color}15`,
                        color: tag.color,
                        border: `1px solid ${tag.color}30`,
                        fontWeight: 600
                      }
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </Group>
              
              <Group gap="xl" mt="md">
                <Group gap="xs">
                  <IconMail size={16} color="var(--nv-slate)" />
                  <Text size="sm" c="dimmed">{client.email}</Text>
                </Group>
                <Group gap="xs">
                  <IconPhone size={16} color="var(--nv-slate)" />
                  <Text size="sm" c="dimmed">{client.phone}</Text>
                </Group>
                <Group gap="xs">
                  <IconCalendarEvent size={16} color="var(--nv-slate)" />
                  <Text size="sm" c="dimmed">
                    Cliente desde {new Date(client.created_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  </Text>
                </Group>
              </Group>
            </Box>
          </Group>

          <Group gap="sm">
            <Button 
              leftSection={<IconMessage size={18} />} 
              variant="default"
              radius="xl"
              onClick={handleSendMessage}
              styles={{
                root: {
                  borderColor: "var(--border-medium)",
                  fontWeight: 600
                }
              }}
            >
              Mensaje
            </Button>
            <Button 
              leftSection={<IconCalendarEvent size={18} />}
              radius="xl"
              onClick={handleNewSession}
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                  "&:hover": {
                    background: "var(--nv-accent-hover)"
                  }
                }
              }}
            >
              Nueva Sesión
            </Button>
            <Menu position="bottom-end" withArrow shadow="lg">
              <Menu.Target>
                <ActionIcon size="lg" variant="default" radius="xl">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={16} />} onClick={handleOpenEditClientModal}>
                  Editar cliente
                </Menu.Item>
                <Menu.Item leftSection={<IconBarbell size={16} />} onClick={handleAssignProgram}>
                  Asignar programa
                </Menu.Item>
                <Menu.Item leftSection={<IconSalad size={16} />} onClick={handleAssignNutritionPlan}>
                  Asignar plan nutricional
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={openDeleteModal}>
                  Eliminar cliente
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      {/* KPIs del cliente */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6, xl: 8 }} mb="xl" spacing="md" className="stagger">
        <StatCard 
          icon={<IconCalendarEvent size={24} />} 
          label="Sesiones Totales" 
          value={stats.total_sessions || "-"}
          color="var(--nv-primary)"
        />
        <StatCard 
          icon={<IconActivity size={24} />} 
          label="Este Mes" 
          value={stats.sessions_this_month || "-"}
          color="var(--nv-success)"
        />
        <StatCard 
          icon={<IconTarget size={24} />} 
          label="Adherencia" 
          value={stats.adherence > 0 ? `${stats.adherence}%` : "-"}
          color="var(--nv-success)"
        />
        <StatCard 
          icon={<IconCreditCard size={24} />} 
          label="MRR" 
          value={stats.mrr > 0 ? `€${stats.mrr}` : "-"}
          color="var(--nv-warning)"
        />
        <StatCard 
          icon={<IconHeart size={24} />} 
          label="LTV" 
          value={stats.lifetime_value > 0 ? `€${stats.lifetime_value}` : "-"}
          color="#8B5CF6"
        />
        <StatCard 
          icon={<IconHistory size={24} />} 
          label="Días como cliente" 
          value={stats.days_as_client}
          color="var(--nv-slate)"
        />
      </SimpleGrid>

      {/* Tabs con información detallada */}
      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="xl">
          <Tabs.Tab leftSection={<IconUser size={16} />} value="overview">Resumen</Tabs.Tab>
          <Tabs.Tab leftSection={<IconHeart size={16} />} value="health">Salud</Tabs.Tab>
          <Tabs.Tab leftSection={<IconSalad size={16} />} value="nutrition">Nutrición</Tabs.Tab>
          <Tabs.Tab leftSection={<IconFileText size={16} />} value="documents">Documentos</Tabs.Tab>
          <Tabs.Tab leftSection={<IconPhoto size={16} />} value="photos">Fotos</Tabs.Tab>
          <Tabs.Tab leftSection={<IconCalendarEvent size={16} />} value="sessions">Sesiones</Tabs.Tab>
          <Tabs.Tab leftSection={<IconTrendingUp size={16} />} value="progress">Progreso</Tabs.Tab>
          <Tabs.Tab leftSection={<IconBarbell size={16} />} value="programs">Programas</Tabs.Tab>
          <Tabs.Tab leftSection={<IconCreditCard size={16} />} value="payments">Pagos</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
            {/* Información personal */}
            <Box className="nv-card" p="xl">
              <Group justify="space-between" mb="lg">
                <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Información Personal
                </Text>
                <ActionIcon variant="subtle" color="gray" radius="xl" onClick={handleOpenEditInfoModal}>
                  <IconEdit size={18} />
                </ActionIcon>
              </Group>

              <Stack gap={0}>
                <InfoRow label="Fecha de nacimiento" value={new Date(client.birth_date).toLocaleDateString("es-ES")} />
                <InfoRow label="Género" value={client.gender === "female" ? "Femenino" : "Masculino"} />
                <InfoRow label="Altura" value={`${client.height_cm} cm`} icon={<IconScale size={14} />} />
                <InfoRow label="Peso actual" value={`${client.weight_kg} kg`} icon={<IconScale size={14} />} />
              </Stack>

              <Divider my="lg" />

              <Box>
                <Text size="sm" c="dimmed" mb="xs">Objetivos</Text>
                <Text size="sm" fw={500}>{client.goals}</Text>
              </Box>

              {client.internal_notes && (
                <Box mt="md" p="md" style={{ backgroundColor: "var(--nv-warning-bg)", borderRadius: "var(--radius-md)" }}>
                  <Group gap="xs" mb="xs">
                    <IconAlertTriangle size={16} color="var(--nv-warning)" />
                    <Text size="sm" fw={600} style={{ color: "var(--nv-warning)" }}>Notas internas</Text>
                  </Group>
                  <Text size="sm">{client.internal_notes}</Text>
                </Box>
              )}
            </Box>

            {/* Actividad reciente */}
            <Box className="nv-card" p="xl">
              <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Actividad Reciente
              </Text>

              <Timeline active={activities.length} bulletSize={28} lineWidth={2}>
                {activities.map((activity) => (
                  <Timeline.Item
                    bullet={
                      <ThemeIcon
                        size={28}
                        radius="xl"
                        variant="light"
                        style={{ 
                          backgroundColor: `${getActivityColor(activity.type)}15`,
                          color: getActivityColor(activity.type)
                        }}
                      >
                        {getActivityIcon(activity.type)}
                      </ThemeIcon>
                    }
                    key={activity.id}
                    title={<Text fw={600} size="sm">{activity.title}</Text>}
                  >
                    <Text c="dimmed" size="xs">{activity.description}</Text>
                    <Text c="dimmed" mt={4} size="xs">
                      {new Date(activity.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Box>

            {/* Alergias e Intolerancias - Resumen simplificado */}
            <Box className="nv-card" p="xl">
              <Group justify="space-between" mb="lg">
                <Group gap="xs">
                  <IconAlertTriangle size={20} color="var(--nv-error)" />
                  <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Alergias e Intolerancias
                  </Text>
                </Group>
                <ActionIcon 
                  variant="subtle" 
                  color="gray" 
                  radius="xl"
                  onClick={handleOpenAllergyModal}
                >
                  <IconEdit size={18} />
                </ActionIcon>
              </Group>

              {(() => {
                // Combinar alergias de ambas fuentes (allergens del modal y allergies del onboarding)
                const allergens = (client as any).health_data?.allergens || [];
                const allergiesOnboarding = (client as any).health_data?.allergies || [];
                const allAllergies = [...new Set([...allergens, ...allergiesOnboarding])];
                const intolerances = (client as any).health_data?.intolerances || [];
                const injuries = (client as any).health_data?.injuries || client.injuries || [];
                
                const hasData = allAllergies.length > 0 || intolerances.length > 0 || injuries.length > 0;
                
                if (!hasData) {
                  return <Text c="dimmed" size="sm">Sin alergias ni intolerancias registradas</Text>;
                }
                
                return (
                  <Stack gap="md">
                    {allAllergies.length > 0 && (
                      <Box>
                        <Text size="sm" c="dimmed" mb="xs">Alergias</Text>
                        <Group gap="xs">
                          {allAllergies.map((allergy: string, idx: number) => (
                            <Badge key={idx} color="red" variant="light" size="md">
                              {allergy}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    )}
                    {intolerances.length > 0 && (
                      <Box>
                        <Text size="sm" c="dimmed" mb="xs">Intolerancias</Text>
                        <Group gap="xs">
                          {intolerances.map((intolerance: string, idx: number) => (
                            <Badge key={idx} color="orange" variant="light" size="md">
                              {intolerance}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    )}
                    {injuries.length > 0 && (
                      <Box>
                        <Divider my="md" />
                        <Text size="sm" c="dimmed" mb="xs">Lesiones</Text>
                        <Group gap="xs">
                          {injuries.map((injury: any, idx: number) => (
                            <Badge 
                              key={idx} 
                              color="yellow" 
                              variant="light"
                              size="md"
                            >
                              {typeof injury === 'string' ? injury : injury.name || injury}
                              {injury.status === 'active' && ' (activa)'}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    )}
                  </Stack>
                );
              })()}
            </Box>

            {/* Configuración de Chat */}
            <Box className="nv-card" p="xl">
              <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Configuración de Chat
              </Text>

              <Group justify="space-between">
                <Group gap="sm">
                  {client.chat_enabled ? (
                    <ThemeIcon size={40} radius="xl" variant="light" color="green">
                      <IconMessage size={20} />
                    </ThemeIcon>
                  ) : (
                    <ThemeIcon size={40} radius="xl" variant="light" color="gray">
                      <IconMessageOff size={20} />
                    </ThemeIcon>
                  )}
                  <Box>
                    <Text size="sm" fw={600}>Chat habilitado</Text>
                    <Text c="dimmed" size="xs">
                      {client.chat_enabled 
                        ? "El cliente puede enviar y recibir mensajes"
                        : "El chat está deshabilitado"}
                    </Text>
                  </Box>
                </Group>
                <Switch
                  checked={client.chat_enabled}
                  onChange={handleToggleChat}
                  color="green"
                  size="lg"
                />
              </Group>
            </Box>
          </SimpleGrid>
        </Tabs.Panel>

        {/* Salud */}
        <Tabs.Panel value="health">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {/* Alergias e Intolerancias */}
            <Box className="nv-card" p="xl">
              <Group justify="space-between" mb="lg">
                <Group gap="xs">
                  <IconAlertTriangle size={20} color="var(--nv-error)" />
                  <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Alergias e Intolerancias
                  </Text>
                </Group>
                <ActionIcon 
                  variant="subtle" 
                  color="gray" 
                  radius="xl"
                  onClick={handleOpenAllergyModal}
                >
                  <IconEdit size={18} />
                </ActionIcon>
              </Group>

              {(() => {
                const allergens = (client as any).health_data?.allergens || [];
                const allergiesOnboarding = (client as any).health_data?.allergies || [];
                const allAllergies = [...new Set([...allergens, ...allergiesOnboarding])];
                const intolerances = (client as any).health_data?.intolerances || [];
                
                const hasData = allAllergies.length > 0 || intolerances.length > 0;
                
                if (!hasData) {
                  return <Text c="dimmed" size="sm">Sin alergias ni intolerancias registradas</Text>;
                }
                
                return (
                  <Stack gap="md">
                    {allAllergies.length > 0 && (
                      <Box>
                        <Text size="sm" c="dimmed" mb="xs">Alergias</Text>
                        <Group gap="xs">
                          {allAllergies.map((allergy: string, idx: number) => (
                            <Badge key={idx} color="red" variant="light" size="lg">
                              {allergy}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    )}
                    {intolerances.length > 0 && (
                      <Box>
                        <Text size="sm" c="dimmed" mb="xs">Intolerancias</Text>
                        <Group gap="xs">
                          {intolerances.map((intolerance: string, idx: number) => (
                            <Badge key={idx} color="orange" variant="light" size="lg">
                              {intolerance}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    )}
                  </Stack>
                );
              })()}
            </Box>

            {/* Lesiones */}
            <Box className="nv-card" p="xl">
              <Group gap="xs" mb="lg">
                <IconAlertTriangle size={20} color="var(--nv-warning)" />
                <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Lesiones
                </Text>
              </Group>

              {(() => {
                const injuries = (client as any).health_data?.injuries || client.injuries || [];
                
                if (injuries.length === 0) {
                  return <Text c="dimmed" size="sm">Sin lesiones registradas</Text>;
                }
                
                return (
                  <Stack gap="xs">
                    {injuries.map((injury: any, idx: number) => (
                      <Badge 
                        key={idx} 
                        color="yellow" 
                        variant="light"
                        size="lg"
                      >
                        {typeof injury === 'string' ? injury : injury.name || injury}
                        {injury.status === 'active' && ' (activa)'}
                      </Badge>
                    ))}
                  </Stack>
                );
              })()}
            </Box>

            {/* Nivel de Actividad y Objetivos */}
            <Box className="nv-card" p="xl">
              <Group gap="xs" mb="lg">
                <IconActivity size={20} color="var(--nv-primary)" />
                <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Nivel de Actividad y Objetivos
                </Text>
              </Group>

              {(() => {
                const healthData = (client as any).health_data || {};
                
                // Traducciones
                const activityLevelMap: Record<string, string> = {
                  'sedentary': 'Sedentario',
                  'light': 'Ligero',
                  'moderate': 'Moderado',
                  'active': 'Activo',
                  'very_active': 'Muy activo',
                };
                
                const fitnessGoalMap: Record<string, string> = {
                  'lose_weight': 'Perder peso',
                  'gain_muscle': 'Ganar músculo',
                  'maintain': 'Mantener',
                  'improve_health': 'Mejorar salud',
                  'improve_endurance': 'Mejorar resistencia',
                  'gain_strength': 'Ganar fuerza',
                  'flexibility': 'Flexibilidad',
                  'general_fitness': 'Fitness general',
                };
                
                const secondaryGoalMap: Record<string, string> = {
                  'strength': 'Fuerza',
                  'endurance': 'Resistencia',
                  'flexibility': 'Flexibilidad',
                  'posture': 'Postura',
                  'balance': 'Equilibrio',
                  'mobility': 'Movilidad',
                  'stress_relief': 'Reducir estrés',
                  'energy': 'Más energía',
                };
                
                const hasData = healthData.activity_level || healthData.fitness_goal || 
                               healthData.training_days_per_week || healthData.target_weight ||
                               healthData.secondary_goals?.length > 0;
                
                if (!hasData) {
                  return <Text c="dimmed" size="sm">Sin información de actividad registrada</Text>;
                }
                
                return (
                  <Stack gap="md">
                    <SimpleGrid cols={2} spacing="md">
                      {healthData.activity_level && (
                        <Box>
                          <Text size="xs" c="dimmed">Nivel de actividad</Text>
                          <Badge color="blue" variant="light" size="lg">
                            {activityLevelMap[healthData.activity_level] || healthData.activity_level}
                          </Badge>
                        </Box>
                      )}
                      {healthData.fitness_goal && (
                        <Box>
                          <Text size="xs" c="dimmed">Objetivo principal</Text>
                          <Badge color="green" variant="light" size="lg">
                            {fitnessGoalMap[healthData.fitness_goal] || healthData.fitness_goal}
                          </Badge>
                        </Box>
                      )}
                      {healthData.training_days_per_week && (
                        <Box>
                          <Text size="xs" c="dimmed">Días de entrenamiento/semana</Text>
                          <Badge color="yellow" variant="light" size="lg">
                            {healthData.training_days_per_week} días
                          </Badge>
                        </Box>
                      )}
                      {healthData.target_weight && (
                        <Box>
                          <Text size="xs" c="dimmed">Peso objetivo</Text>
                          <Badge color="cyan" variant="light" size="lg">
                            {healthData.target_weight} kg
                          </Badge>
                        </Box>
                      )}
                    </SimpleGrid>
                    
                    {healthData.secondary_goals?.length > 0 && (
                      <Box>
                        <Text size="sm" c="dimmed" mb="xs">Objetivos secundarios</Text>
                        <Group gap="xs">
                          {healthData.secondary_goals.map((goal: string, idx: number) => (
                            <Badge key={idx} color="teal" variant="light" size="md">
                              {secondaryGoalMap[goal] || goal}
                            </Badge>
                          ))}
                        </Group>
                      </Box>
                    )}
                  </Stack>
                );
              })()}
            </Box>

            {/* Cuestionario PAR-Q */}
            <Box className="nv-card" p="xl">
              <Group gap="xs" mb="lg">
                <IconClipboard size={20} color="var(--nv-primary)" />
                <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Cuestionario PAR-Q
                </Text>
                {(client as any).health_data?.parq_risk && (
                  <Badge color="red" variant="filled" size="sm">⚠ Riesgo identificado</Badge>
                )}
              </Group>

              {(() => {
                const parqResponses = (client as any).health_data?.parq_responses;
                
                if (!parqResponses) {
                  return <Text c="dimmed" size="sm">Sin cuestionario PAR-Q completado</Text>;
                }
                
                const hasRisks = parqResponses.heartCondition || parqResponses.chestPain || 
                                parqResponses.dizziness || parqResponses.boneJoint || 
                                parqResponses.bloodPressure || parqResponses.otherReason;
                
                return (
                  <Stack gap="xs">
                    {parqResponses.heartCondition && (
                      <Text size="sm" c="orange">✓ Condición cardíaca reportada</Text>
                    )}
                    {parqResponses.chestPain && (
                      <Text size="sm" c="orange">✓ Dolor en el pecho al hacer actividad física</Text>
                    )}
                    {parqResponses.dizziness && (
                      <Text size="sm" c="orange">✓ Mareos o pérdida de conocimiento</Text>
                    )}
                    {parqResponses.boneJoint && (
                      <>
                        <Text size="sm" c="orange">✓ Problemas óseos o articulares</Text>
                        {parqResponses.boneJointDetails && (
                          <Text size="xs" c="dimmed" ml="md">
                            Detalle: {parqResponses.boneJointDetails}
                          </Text>
                        )}
                      </>
                    )}
                    {parqResponses.bloodPressure && (
                      <Text size="sm" c="orange">✓ Medicamentos para presión arterial/corazón</Text>
                    )}
                    {parqResponses.otherReason && (
                      <>
                        <Text size="sm" c="orange">✓ Otra razón para no hacer ejercicio</Text>
                        {parqResponses.otherReasonDetails && (
                          <Text size="xs" c="dimmed" ml="md">
                            Detalle: {parqResponses.otherReasonDetails}
                          </Text>
                        )}
                      </>
                    )}
                    {!hasRisks && (
                      <Text size="sm" c="green">✓ Sin riesgos identificados en PAR-Q</Text>
                    )}
                  </Stack>
                );
              })()}
            </Box>

            {/* Condiciones Médicas y Medicaciones */}
            <Box className="nv-card" p="xl">
              <Group gap="xs" mb="lg">
                <IconPill size={20} color="var(--mantine-color-grape-5)" />
                <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Información Médica
                </Text>
              </Group>

              {(() => {
                const healthData = (client as any).health_data || {};
                const hasData = healthData.medical_conditions || healthData.medications;
                
                if (!hasData) {
                  return <Text c="dimmed" size="sm">Sin información médica registrada</Text>;
                }
                
                return (
                  <Stack gap="md">
                    {healthData.medical_conditions && (
                      <Box>
                        <Text size="sm" c="dimmed" mb="xs">Condiciones médicas</Text>
                        <Text size="sm">{healthData.medical_conditions}</Text>
                      </Box>
                    )}
                    {healthData.medications && (
                      <Box>
                        <Text size="sm" c="dimmed" mb="xs">Medicaciones actuales</Text>
                        <Text size="sm">{healthData.medications}</Text>
                      </Box>
                    )}
                  </Stack>
                );
              })()}
            </Box>
          </SimpleGrid>
        </Tabs.Panel>

        {/* Nutrición */}
        <Tabs.Panel value="nutrition">
          {/* Si hay un plan seleccionado para ver, mostrar la vista detallada */}
          {viewingMealPlanId && viewingMealPlan ? (
            <Box>
              {/* Botón para volver */}
              <Button 
                variant="subtle" 
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => setViewingMealPlanId(null)}
                mb="lg"
                radius="xl"
              >
                Volver a la lista
              </Button>
              
              {/* Vista detallada del plan nutricional */}
              <MealPlanDetailView
                mealPlan={{
                  id: viewingMealPlan.id,
                  name: viewingMealPlan.name,
                  description: viewingMealPlan.description,
                  target_calories: viewingMealPlan.target_calories,
                  target_protein: viewingMealPlan.target_protein,
                  target_carbs: viewingMealPlan.target_carbs,
                  target_fat: viewingMealPlan.target_fat,
                  plan: viewingMealPlan.plan || { days: [] },
                  supplements: viewingMealPlan.supplements || [],
                  notes: viewingMealPlan.notes,
                  nutritional_advice: viewingMealPlan.nutritional_advice,
                  equivalences: viewingMealPlan.equivalences,
                }}
                client={{
                  id: client.id,
                  first_name: client.first_name,
                  last_name: client.last_name,
                  gender: (client.gender as "male" | "female") || "male",
                  age: clientAge,
                  weight_kg: client.weight_kg || 70,
                  height_cm: client.height_cm || 170,
                  activity_level: activityLevel as any,
                  body_tendency: "normal",
                  goal_type: goalType as any,
                  allergies: (client as any).health_data?.allergens || [],
                  intolerances: (client as any).health_data?.intolerances || [],
                }}
                onEdit={() => navigate(`/nutrition?edit=${viewingMealPlanId}&clientId=${id}`)}
                onExportPDF={() => {
                  if (viewingMealPlan) {
                    notifications.show({
                      id: "pdf-export",
                      title: "Generando PDF",
                      message: "Por favor espera mientras se genera el documento...",
                      loading: true,
                      autoClose: false,
                    });
                    try {
                      generateMealPlanPDF(
                        {
                          id: viewingMealPlan.id,
                          name: viewingMealPlan.name,
                          description: viewingMealPlan.description,
                          target_calories: viewingMealPlan.target_calories || 2000,
                          target_protein: viewingMealPlan.target_protein || 150,
                          target_carbs: viewingMealPlan.target_carbs || 200,
                          target_fat: viewingMealPlan.target_fat || 70,
                          plan: viewingMealPlan.plan || { days: [] },
                          supplements: viewingMealPlan.supplements || [],
                          notes: viewingMealPlan.notes,
                          nutritional_advice: viewingMealPlan.nutritional_advice,
                        },
                        {
                          workspaceName: currentWorkspace?.name || "Trackfiz",
                          trainerName: user?.full_name || "Entrenador",
                          client: {
                            first_name: client.first_name,
                            last_name: client.last_name,
                            weight_kg: client.weight_kg,
                            height_cm: client.height_cm,
                            allergies: (client as any).health_data?.allergens || [],
                            intolerances: (client as any).health_data?.intolerances || [],
                            goals: client.goals,
                          },
                        }
                      );
                      notifications.update({
                        id: "pdf-export",
                        title: "PDF Generado",
                        message: "El documento se ha descargado correctamente",
                        color: "green",
                        loading: false,
                        autoClose: 3000,
                      });
                    } catch (error) {
                      console.error("Error generating PDF:", error);
                      notifications.update({
                        id: "pdf-export",
                        title: "Error",
                        message: "No se pudo generar el PDF",
                        color: "red",
                        loading: false,
                        autoClose: 5000,
                      });
                    }
                  }
                }}
              />
            </Box>
          ) : (
            <>
              {/* Tarjeta principal de Objetivos Nutricionales del Cliente */}
              <Box className="nv-card" p="xl" mb="xl" style={{ background: "linear-gradient(135deg, var(--nv-accent) 0%, #10B981 100%)" }}>
                <Group justify="space-between" align="flex-start" mb="lg">
                  <Box>
                    <Text size="xs" tt="uppercase" fw={700} style={{ letterSpacing: "0.1em", color: "rgba(0,0,0,0.6)" }}>
                      Objetivos Nutricionales Calculados
                    </Text>
                    <Text fw={700} size="xl" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--nv-dark)" }}>
                      {client.first_name} {client.last_name}
                    </Text>
                  </Box>
                  <Badge 
                    size="lg" 
                    radius="xl"
                    style={{ 
                      background: goalType === "fat_loss" ? "#EF4444" : goalType === "muscle_gain" ? "#22C55E" : "#3B82F6",
                      color: "white",
                      fontWeight: 700
                    }}
                  >
                    {GOAL_LABELS[goalType] || "Mantenimiento"}
                  </Badge>
                </Group>

                <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md" mb="lg">
                  <Box ta="center" p="md" style={{ background: "rgba(255,255,255,0.9)", borderRadius: "var(--radius-md)" }}>
                    <Text size="xs" c="dimmed" mb={4}>Peso</Text>
                    <Text fw={700} size="lg">{client.weight_kg || "—"} kg</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "rgba(255,255,255,0.9)", borderRadius: "var(--radius-md)" }}>
                    <Text size="xs" c="dimmed" mb={4}>Altura</Text>
                    <Text fw={700} size="lg">{client.height_cm || "—"} cm</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "rgba(255,255,255,0.9)", borderRadius: "var(--radius-md)" }}>
                    <Text size="xs" c="dimmed" mb={4}>Edad</Text>
                    <Text fw={700} size="lg">{clientAge} años</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "rgba(255,255,255,0.9)", borderRadius: "var(--radius-md)" }}>
                    <Text size="xs" c="dimmed" mb={4}>Actividad</Text>
                    <Text fw={700} size="sm">{ACTIVITY_LABELS[activityLevel] || "Activo"}</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "rgba(255,255,255,0.9)", borderRadius: "var(--radius-md)" }}>
                    <Text size="xs" c="dimmed" mb={4}>BMR</Text>
                    <Text fw={700} size="lg">{nutritionalTargets.bmr} kcal</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "rgba(255,255,255,0.9)", borderRadius: "var(--radius-md)" }}>
                    <Text size="xs" c="dimmed" mb={4}>TDEE</Text>
                    <Text fw={700} size="lg">{nutritionalTargets.tdee} kcal</Text>
                  </Box>
                </SimpleGrid>

                {/* Macros Objetivo - del Plan Asignado o Calculados */}
                <Box p="lg" style={{ background: "rgba(255,255,255,0.95)", borderRadius: "var(--radius-lg)" }}>
                  <Text fw={700} size="sm" mb="md" style={{ color: "var(--nv-dark)" }}>
                    🎯 Objetivos Diarios {mealPlans.length > 0 ? `(${mealPlans[0].name})` : "(Calculados automáticamente)"}
                  </Text>
                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
                    <Box ta="center">
                      <Text size="2rem" fw={700} style={{ color: "#3B82F6", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {mealPlans.length > 0 && mealPlans[0].target_calories ? mealPlans[0].target_calories : nutritionalTargets.calories}
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Calorías</Text>
                      {mealPlans.length > 0 && mealPlans[0].target_calories && mealPlans[0].target_calories !== nutritionalTargets.calories && (
                        <Text size="xs" c="gray.5" mt={2}>
                          (Recom: {nutritionalTargets.calories})
                        </Text>
                      )}
                    </Box>
                    <Box ta="center">
                      <Text size="2rem" fw={700} style={{ color: "#22C55E", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {mealPlans.length > 0 && mealPlans[0].target_protein ? mealPlans[0].target_protein : nutritionalTargets.protein}g
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Proteínas</Text>
                      {mealPlans.length > 0 && mealPlans[0].target_protein && mealPlans[0].target_protein !== nutritionalTargets.protein && (
                        <Text size="xs" c="gray.5" mt={2}>
                          (Recom: {nutritionalTargets.protein}g)
                        </Text>
                      )}
                    </Box>
                    <Box ta="center">
                      <Text size="2rem" fw={700} style={{ color: "#F59E0B", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {mealPlans.length > 0 && mealPlans[0].target_carbs ? mealPlans[0].target_carbs : nutritionalTargets.carbs}g
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Carbohidratos</Text>
                      {mealPlans.length > 0 && mealPlans[0].target_carbs && mealPlans[0].target_carbs !== nutritionalTargets.carbs && (
                        <Text size="xs" c="gray.5" mt={2}>
                          (Recom: {nutritionalTargets.carbs}g)
                        </Text>
                      )}
                    </Box>
                    <Box ta="center">
                      <Text size="2rem" fw={700} style={{ color: "#8B5CF6", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {mealPlans.length > 0 && mealPlans[0].target_fat ? mealPlans[0].target_fat : nutritionalTargets.fat}g
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Grasas</Text>
                      {mealPlans.length > 0 && mealPlans[0].target_fat && mealPlans[0].target_fat !== nutritionalTargets.fat && (
                        <Text size="xs" c="gray.5" mt={2}>
                          (Recom: {nutritionalTargets.fat}g)
                        </Text>
                      )}
                    </Box>
                  </SimpleGrid>
                </Box>

                {/* Alergias e intolerancias */}
                {((client as any).health_data?.allergens?.length > 0 || (client as any).health_data?.intolerances?.length > 0) && (
                  <Box mt="md" p="md" style={{ background: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                    <Group gap="xs" mb="xs">
                      <IconAlertTriangle size={16} color="#EF4444" />
                      <Text size="sm" fw={600} style={{ color: "#EF4444" }}>Alergias e Intolerancias</Text>
                    </Group>
                    <Group gap="xs">
                      {[
                        ...((client as any).health_data?.allergens || []),
                        ...((client as any).health_data?.intolerances || [])
                      ].map((item: string, idx: number) => (
                        <Badge key={idx} color="red" variant="light" size="sm">{item}</Badge>
                      ))}
                    </Group>
                  </Box>
                )}
              </Box>

              <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
                <Box className="nv-card" p="xl">
                  <Group justify="space-between" mb="lg">
                    <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Planes Nutricionales
                    </Text>
                    <Button 
                      size="sm" 
                      leftSection={<IconPlus size={16} />}
                      radius="xl"
                      onClick={handleAssignNutritionPlan}
                      styles={{
                        root: {
                          background: "var(--nv-accent)",
                          color: "var(--nv-dark)",
                          fontWeight: 600,
                          "&:hover": { background: "var(--nv-accent-hover)" }
                        }
                      }}
                    >
                      Asignar Plan
                    </Button>
                  </Group>

                  <Stack gap="sm">
                    {mealPlans.map((plan: { id: string; name: string; target_calories: number; status: string; created_at: string }) => (
                      <Card key={plan.id} padding="lg" radius="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Group gap="sm" mb="xs">
                              <ThemeIcon size="lg" radius="xl" variant="light" color="green">
                                <IconSalad size={18} />
                              </ThemeIcon>
                              <Text fw={600} size="md">{plan.name}</Text>
                            </Group>
                            <Group gap="md">
                              <Badge variant="light" color="green" size="sm">
                                {plan.target_calories} kcal/día
                              </Badge>
                              <Badge 
                                variant="light"
                                color={plan.status === "active" ? "green" : "gray"}
                                size="sm"
                              >
                                {plan.status === "active" ? "Activo" : "Inactivo"}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                Asignado: {new Date(plan.created_at).toLocaleDateString('es-ES')}
                              </Text>
                            </Group>
                          </Box>
                          <Menu position="bottom-end" withArrow shadow="md">
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray" size="lg">
                                <IconDotsVertical size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item 
                                leftSection={<IconEye size={16} />}
                                onClick={() => setViewingMealPlanId(plan.id)}
                              >
                                Ver detalles
                              </Menu.Item>
                              <Menu.Item 
                                leftSection={<IconEdit size={16} />}
                                onClick={() => navigate(`/nutrition?edit=${plan.id}&clientId=${id}`)}
                              >
                                Editar plan
                              </Menu.Item>
                              <Menu.Item 
                                leftSection={<IconDownload size={16} />}
                                onClick={() => {/* TODO: Export PDF */}}
                              >
                                Descargar PDF
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item 
                                color="red"
                                leftSection={<IconTrash size={16} />}
                                onClick={() => handleDeleteMealPlan(plan.id)}
                              >
                                Eliminar asignación
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </Card>
                    ))}
                    
                    {mealPlans.length === 0 && (
                      <Text size="sm" c="dimmed" ta="center" py="xl">
                        No hay planes nutricionales asignados.
                        <br />
                        Haz clic en "Asignar Plan" para añadir uno.
                      </Text>
                    )}
                  </Stack>
                </Box>

                <Box className="nv-card" p="xl">
                  <Group justify="space-between" mb="lg">
                    <Group gap="xs">
                      <IconPill size={20} color="var(--nv-success)" />
                      <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Suplementos
                      </Text>
                    </Group>
                    <Button 
                      size="sm" 
                      variant="light" 
                      leftSection={<IconPlus size={16} />}
                      radius="xl"
                    >
                      Añadir
                    </Button>
                  </Group>

                  <Stack gap="sm">
                    {supplements.map((supp) => (
                      <Box 
                        key={supp.id} 
                        p="md" 
                        style={{ 
                          border: "1px solid var(--border-subtle)", 
                          borderRadius: "var(--radius-md)" 
                        }}
                      >
                        <Group justify="space-between">
                          <Box>
                            <Text fw={600} size="sm">{supp.name}</Text>
                            <Text c="dimmed" size="xs">{supp.dosage}</Text>
                          </Box>
                          <Badge size="sm" variant="light" radius="xl" color="blue">
                            {supp.frequency}
                          </Badge>
                        </Group>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </SimpleGrid>
            </>
          )}
        </Tabs.Panel>

        {/* Documentos */}
        <Tabs.Panel value="documents">
          <Box className="nv-card" p="xl">
            <Group justify="space-between" mb="lg">
              <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Documentos
              </Text>
              <FileButton onChange={() => {}} accept="application/pdf,image/*">
                {(props) => (
                  <Button 
                    {...props} 
                    size="sm" 
                    leftSection={<IconUpload size={16} />}
                    radius="xl"
                    styles={{
                      root: {
                        background: "var(--nv-accent)",
                        color: "var(--nv-dark)",
                        fontWeight: 600,
                        "&:hover": { background: "var(--nv-accent-hover)" }
                      }
                    }}
                  >
                    Subir Documento
                  </Button>
                )}
              </FileButton>
            </Group>

            <Table
              verticalSpacing="md"
              styles={{
                th: { 
                  fontWeight: 700, 
                  fontSize: 11, 
                  letterSpacing: "0.08em", 
                  textTransform: "uppercase",
                  color: "var(--nv-slate)"
                }
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Documento</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Dirección</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {documents.map((doc) => (
                  <Table.Tr key={doc.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <ThemeIcon size="sm" variant="light" radius="xl" color="blue">
                          <IconFile size={12} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>{doc.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" radius="xl">
                        {doc.type === "diet_plan" ? "Plan Nutricional" :
                         doc.type === "contract" ? "Contrato" : "Médico"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        size="sm" 
                        variant="light"
                        radius="xl"
                        color={doc.direction === "outbound" ? "blue" : "green"}
                      >
                        {doc.direction === "outbound" ? "Enviado" : "Recibido"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        size="sm" 
                        variant="light"
                        radius="xl"
                        color={doc.is_read ? "green" : "orange"}
                      >
                        {doc.is_read ? "Leído" : "No leído"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" radius="xl">
                          <IconDownload size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" radius="xl">
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>

        {/* Fotos */}
        <Tabs.Panel value="photos">
          <Box className="nv-card" p="xl">
            <Group justify="space-between" mb="lg">
              <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Fotos de Evolución
              </Text>
              <FileButton onChange={() => {}} accept="image/*" multiple>
                {(props) => (
                  <Button 
                    {...props} 
                    size="sm" 
                    leftSection={<IconCamera size={16} />}
                    radius="xl"
                    styles={{
                      root: {
                        background: "var(--nv-accent)",
                        color: "var(--nv-dark)",
                        fontWeight: 600,
                        "&:hover": { background: "var(--nv-accent-hover)" }
                      }
                    }}
                  >
                    Subir Fotos
                  </Button>
                )}
              </FileButton>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }} spacing="md">
              {progressPhotos.map((photo) => (
                <Card key={photo.id} padding="xs" radius="lg" withBorder>
                  <Card.Section>
                    <Image
                      src={photo.photo_url}
                      height={200}
                      alt="Foto de progreso"
                      fallbackSrc="https://placehold.co/300x200?text=Foto"
                    />
                  </Card.Section>
                  <Group justify="space-between" mt="sm">
                    <Box>
                      <Badge size="xs" variant="light" radius="xl">
                        {photo.photo_type === "front" ? "Frontal" : "Lateral"}
                      </Badge>
                      <Text size="xs" c="dimmed" mt={2}>
                        {new Date(photo.photo_date).toLocaleDateString("es-ES")}
                      </Text>
                    </Box>
                    {photo.weight_kg && (
                      <Text size="xs" fw={600}>{photo.weight_kg} kg</Text>
                    )}
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        </Tabs.Panel>

        {/* Sesiones */}
        <Tabs.Panel value="sessions">
          <Box className="nv-card" style={{ overflow: "hidden" }}>
            <Table verticalSpacing="md" horizontalSpacing="lg">
              <Table.Thead style={{ backgroundColor: "var(--nv-surface-subtle)" }}>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Hora</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Notas</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sessions.map((session) => (
                  <Table.Tr key={session.id}>
                    <Table.Td>
                      <Text fw={600} size="sm">
                        {new Date(session.date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{session.time}</Text></Table.Td>
                    <Table.Td><Text size="sm">{session.type}</Text></Table.Td>
                    <Table.Td>
                      <Badge
                        color={session.status === "completed" ? "green" : "blue"}
                        size="sm"
                        variant="light"
                        radius="xl"
                      >
                        {session.status === "completed" ? "Completada" : "Confirmada"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">{session.notes || "—"}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>

        {/* Progreso */}
        <Tabs.Panel value="progress">
          <Stack gap="lg">
            {/* Resumen de progreso */}
            {clientProgressSummary && (
              <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
                <Box className="nv-card" p="lg">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">Peso Actual</Text>
                    <ThemeIcon size="sm" variant="light" color="blue">
                      <IconScale size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text fw={700} size="xl">{clientProgressSummary.current_stats.weight || 0} kg</Text>
                  {clientProgressSummary.start_stats.weight > 0 && (
                    <Text size="xs" c="dimmed">
                      Inicio: {clientProgressSummary.start_stats.weight} kg
                      {clientProgressSummary.target_stats.weight && ` → Objetivo: ${clientProgressSummary.target_stats.weight} kg`}
                    </Text>
                  )}
                </Box>
                <Box className="nv-card" p="lg">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">% Grasa Corporal</Text>
                    <ThemeIcon size="sm" variant="light" color="orange">
                      <IconActivity size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text fw={700} size="xl">{clientProgressSummary.current_stats.body_fat || 0}%</Text>
                  {clientProgressSummary.start_stats.body_fat && (
                    <Text size="xs" c="dimmed">
                      Inicio: {clientProgressSummary.start_stats.body_fat}%
                    </Text>
                  )}
                </Box>
                <Box className="nv-card" p="lg">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">Masa Muscular</Text>
                    <ThemeIcon size="sm" variant="light" color="green">
                      <IconBarbell size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text fw={700} size="xl">{clientProgressSummary.current_stats.muscle_mass || 0} kg</Text>
                  {clientProgressSummary.start_stats.muscle_mass && (
                    <Text size="xs" c="dimmed">
                      Inicio: {clientProgressSummary.start_stats.muscle_mass} kg
                    </Text>
                  )}
                </Box>
              </SimpleGrid>
            )}

            {/* Tabla de medidas */}
            <Box className="nv-card" p="xl">
              <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Evolución de Medidas ({measurements.length} registros)
              </Text>
              {measurements.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  El cliente no ha registrado medidas aún
                </Text>
              ) : (
                <Table verticalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Fecha</Table.Th>
                      <Table.Th>Peso (kg)</Table.Th>
                      <Table.Th>% Grasa</Table.Th>
                      <Table.Th>Masa Muscular (kg)</Table.Th>
                      <Table.Th>Medidas</Table.Th>
                      <Table.Th>Variación</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {measurements.map((m, index) => {
                      const prevMeasurement = measurements[index + 1];
                      const weightChange = prevMeasurement ? m.weight - prevMeasurement.weight : 0;
                      const bodyFatChange = prevMeasurement ? m.body_fat - prevMeasurement.body_fat : 0;
                      const muscleChange = prevMeasurement ? m.muscle_mass - prevMeasurement.muscle_mass : 0;
                      
                      return (
                        <Table.Tr key={m.id || index}>
                          <Table.Td>
                            <Text fw={600} size="sm">
                              {new Date(m.date).toLocaleDateString("es-ES", { 
                                day: "numeric",
                                month: "short", 
                                year: "numeric" 
                              })}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{m.weight > 0 ? `${m.weight} kg` : "-"}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{m.body_fat > 0 ? `${m.body_fat}%` : "-"}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{m.muscle_mass > 0 ? `${m.muscle_mass} kg` : "-"}</Text>
                          </Table.Td>
                          <Table.Td>
                            {m.measurements && Object.keys(m.measurements).length > 0 ? (
                              <Group gap={4}>
                                {m.measurements.chest && <Badge size="xs" variant="light">P: {m.measurements.chest}</Badge>}
                                {m.measurements.waist && <Badge size="xs" variant="light">C: {m.measurements.waist}</Badge>}
                                {m.measurements.hips && <Badge size="xs" variant="light">Ca: {m.measurements.hips}</Badge>}
                              </Group>
                            ) : (
                              <Text size="sm" c="dimmed">-</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {prevMeasurement && (
                              <Stack gap={2}>
                                {weightChange !== 0 && (
                                  <Badge
                                    color={weightChange <= 0 ? "green" : "red"}
                                    size="xs"
                                    variant="light"
                                  >
                                    {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
                                  </Badge>
                                )}
                                {bodyFatChange !== 0 && m.body_fat > 0 && (
                                  <Badge
                                    color={bodyFatChange <= 0 ? "green" : "orange"}
                                    size="xs"
                                    variant="light"
                                  >
                                    {bodyFatChange > 0 ? "+" : ""}{bodyFatChange.toFixed(1)}% grasa
                                  </Badge>
                                )}
                                {muscleChange !== 0 && m.muscle_mass > 0 && (
                                  <Badge
                                    color={muscleChange >= 0 ? "blue" : "red"}
                                    size="xs"
                                    variant="light"
                                  >
                                    {muscleChange > 0 ? "+" : ""}{muscleChange.toFixed(1)} kg músculo
                                  </Badge>
                                )}
                              </Stack>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Box>

            {/* Registro de Entrenamientos */}
            <Box className="nv-card" p="xl">
              <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Registro de Entrenamientos ({clientWorkoutLogs.length} sesiones)
              </Text>
              {clientWorkoutLogs.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  El cliente no ha registrado entrenamientos aún
                </Text>
              ) : (
                <Stack gap="sm">
                  {clientWorkoutLogs.slice(0, 10).map((log, index) => (
                    <Card key={log.id || index} padding="md" radius="md" withBorder>
                      <Group justify="space-between">
                        <Group>
                          <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                            <IconBarbell size={18} />
                          </ThemeIcon>
                          <Box>
                            <Text fw={600} size="sm">
                              {log.log?.workout_name || "Entrenamiento"}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {new Date(log.created_at).toLocaleDateString("es-ES", {
                                weekday: "long",
                                day: "numeric",
                                month: "short",
                              })}
                            </Text>
                          </Box>
                        </Group>
                        <Group gap="md">
                          {log.log?.duration_minutes && (
                            <Badge variant="light" color="blue" size="sm">
                              {log.log.duration_minutes} min
                            </Badge>
                          )}
                          {log.log?.calories_burned && (
                            <Badge variant="light" color="orange" size="sm">
                              {log.log.calories_burned} kcal
                            </Badge>
                          )}
                          {log.log?.exercises && (
                            <Badge variant="light" color="green" size="sm">
                              {log.log.exercises.filter((e: { completed?: boolean }) => e.completed).length}/{log.log.exercises.length} ejercicios
                            </Badge>
                          )}
                        </Group>
                      </Group>
                      {log.log?.notes && (
                        <Text size="xs" c="dimmed" mt="xs" fs="italic">
                          "{log.log.notes}"
                        </Text>
                      )}
                    </Card>
                  ))}
                  {clientWorkoutLogs.length > 10 && (
                    <Text size="sm" c="dimmed" ta="center">
                      Mostrando 10 de {clientWorkoutLogs.length} registros
                    </Text>
                  )}
                </Stack>
              )}
            </Box>

            {/* Registro de Nutrición */}
            <Box className="nv-card" p="xl">
              <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Registro de Nutrición ({clientNutritionLogs?.summary?.total_days || 0} días)
              </Text>
              {!clientNutritionLogs?.logs?.length ? (
                <Text c="dimmed" ta="center" py="xl">
                  El cliente no ha registrado comidas aún
                </Text>
              ) : (
                <>
                  {/* Resumen */}
                  <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
                    <Box ta="center" p="md" style={{ background: "var(--mantine-color-yellow-light)", borderRadius: "var(--mantine-radius-md)" }}>
                      <Text size="xl" fw={700}>{clientNutritionLogs.summary.avg_calories}</Text>
                      <Text size="xs" c="dimmed">Promedio kcal/día</Text>
                    </Box>
                    <Box ta="center" p="md" style={{ background: "var(--mantine-color-blue-light)", borderRadius: "var(--mantine-radius-md)" }}>
                      <Text size="xl" fw={700}>{clientNutritionLogs.targets.calories}</Text>
                      <Text size="xs" c="dimmed">Objetivo kcal/día</Text>
                    </Box>
                    <Box ta="center" p="md" style={{ background: "var(--mantine-color-green-light)", borderRadius: "var(--mantine-radius-md)" }}>
                      <Text size="xl" fw={700}>{clientNutritionLogs.targets.protein}g</Text>
                      <Text size="xs" c="dimmed">Objetivo proteína</Text>
                    </Box>
                    <Box ta="center" p="md" style={{ background: "var(--mantine-color-grape-light)", borderRadius: "var(--mantine-radius-md)" }}>
                      <Text size="xl" fw={700}>{clientNutritionLogs.summary.total_days}</Text>
                      <Text size="xs" c="dimmed">Días registrados</Text>
                    </Box>
                  </SimpleGrid>
                  
                  {/* Lista de días */}
                  <Stack gap="sm">
                    {clientNutritionLogs.logs.slice(0, 7).map((day, index) => {
                      const percentage = clientNutritionLogs.targets.calories > 0 
                        ? Math.round((day.totals.calories / clientNutritionLogs.targets.calories) * 100)
                        : 0;
                      return (
                        <Card key={day.date || index} padding="md" radius="md" withBorder>
                          <Group justify="space-between">
                            <Group>
                              <ThemeIcon size="lg" radius="xl" variant="light" color="yellow">
                                <IconSalad size={18} />
                              </ThemeIcon>
                              <Box>
                                <Text fw={600} size="sm" tt="capitalize">
                                  {new Date(day.date).toLocaleDateString("es-ES", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {day.meals.length} comidas registradas
                                </Text>
                              </Box>
                            </Group>
                            <Group gap="md">
                              <Badge 
                                variant="light" 
                                color={percentage >= 90 ? "green" : percentage >= 70 ? "yellow" : "orange"} 
                                size="lg"
                              >
                                {day.totals.calories} kcal ({percentage}%)
                              </Badge>
                              <Group gap={4}>
                                <Badge variant="outline" color="red" size="xs">P: {Math.round(day.totals.protein)}g</Badge>
                                <Badge variant="outline" color="blue" size="xs">C: {Math.round(day.totals.carbs)}g</Badge>
                                <Badge variant="outline" color="grape" size="xs">G: {Math.round(day.totals.fat)}g</Badge>
                              </Group>
                            </Group>
                          </Group>
                        </Card>
                      );
                    })}
                    {clientNutritionLogs.logs.length > 7 && (
                      <Text size="sm" c="dimmed" ta="center">
                        Mostrando 7 de {clientNutritionLogs.logs.length} días registrados
                      </Text>
                    )}
                  </Stack>
                </>
              )}
            </Box>

            {/* Fotos de progreso */}
            <Box className="nv-card" p="xl">
              <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Fotos de Progreso ({clientPhotos.length} fotos)
              </Text>
              {clientPhotos.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  El cliente no ha subido fotos de progreso aún
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                  {clientPhotos.map((photo, index) => (
                    <Card key={index} padding="xs" radius="md" withBorder>
                      <Card.Section>
                        <Image
                          src={photo.url}
                          height={180}
                          alt={`Foto ${photo.type}`}
                          fallbackSrc="https://placehold.co/200x180?text=Foto"
                        />
                      </Card.Section>
                      <Stack gap={2} mt="xs">
                        <Badge size="xs" variant="light" color="blue">
                          {photo.type === "front" ? "Frontal" : 
                           photo.type === "back" ? "Espalda" : 
                           photo.type === "side" ? "Lateral" : photo.type}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {photo.measurement_date 
                            ? new Date(photo.measurement_date).toLocaleDateString("es-ES")
                            : photo.uploaded_at 
                              ? new Date(photo.uploaded_at).toLocaleDateString("es-ES")
                              : "Sin fecha"}
                        </Text>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </Box>
          </Stack>
        </Tabs.Panel>

        {/* Programas */}
        <Tabs.Panel value="programs">
          {clientWorkoutPrograms.length > 0 ? (
            <Box className="nv-card" p="xl">
              <Group justify="space-between" mb="lg">
                <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Programas de Entrenamiento
                </Text>
                <Button 
                  leftSection={<IconPlus size={18} />}
                  radius="xl"
                  onClick={handleAssignProgram}
                  size="sm"
                  styles={{
                    root: {
                      background: "var(--nv-accent)",
                      color: "var(--nv-dark)",
                      fontWeight: 700,
                    }
                  }}
                >
                  Asignar Programa
                </Button>
              </Group>
              <Stack gap="md">
                {clientWorkoutPrograms.map((program: { id: string; name: string; description?: string; duration_weeks?: number; difficulty?: string; created_at: string }) => (
                  <Card key={program.id} padding="lg" radius="md" withBorder>
                    <Group justify="space-between" align="flex-start">
                      <Box>
                        <Group gap="sm" mb="xs">
                          <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                            <IconBarbell size={18} />
                          </ThemeIcon>
                          <Text fw={600} size="md">{program.name}</Text>
                        </Group>
                        {program.description && (
                          <Text size="sm" c="dimmed" mb="sm">{program.description}</Text>
                        )}
                        <Group gap="md">
                          {program.duration_weeks && (
                            <Badge variant="light" color="blue" size="sm">
                              {program.duration_weeks} semanas
                            </Badge>
                          )}
                          {program.difficulty && (
                            <Badge variant="light" color="gray" size="sm">
                              {program.difficulty}
                            </Badge>
                          )}
                          <Text size="xs" c="dimmed">
                            Asignado: {new Date(program.created_at).toLocaleDateString('es-ES')}
                          </Text>
                        </Group>
                      </Box>
                      <Menu position="bottom-end" withArrow shadow="md">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" size="lg">
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item 
                            leftSection={<IconEye size={16} />}
                            onClick={() => {
                              setSelectedProgramForView(program);
                              openViewProgramModal();
                            }}
                          >
                            Ver detalles
                          </Menu.Item>
                          <Menu.Item 
                            leftSection={<IconEdit size={16} />}
                            onClick={() => {
                              navigate(`/workouts?edit=${program.id}&clientId=${id}`);
                            }}
                          >
                            Editar programa
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item 
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={() => handleDeleteProgram(program.id)}
                          >
                            Eliminar asignación
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Box>
          ) : (
            <Box className="nv-card" p={60} ta="center">
              <ThemeIcon size={80} radius="xl" variant="light" color="gray" mb="lg">
                <IconBarbell size={40} />
              </ThemeIcon>
              <Text fw={700} size="lg" mb="xs">Sin programas asignados</Text>
              <Text c="dimmed" mb="lg" maw={400} mx="auto">
                Asigna un programa de entrenamiento para este cliente
              </Text>
              <Button 
                leftSection={<IconPlus size={18} />}
                radius="xl"
                onClick={handleAssignProgram}
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": { background: "var(--nv-accent-hover)" }
                  }
                }}
              >
                Asignar Programa
              </Button>
            </Box>
          )}
        </Tabs.Panel>

        {/* Pagos */}
        <Tabs.Panel value="payments">
          <Box className="nv-card" p="xl">
            <Group justify="space-between" mb="lg">
              <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Historial de Pagos
              </Text>
              <Badge size="lg" variant="light" radius="xl" color="green">
                Plan Premium - €149/mes
              </Badge>
            </Group>

            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Concepto</Table.Th>
                  <Table.Th>Importe</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Text size="sm">01/01/2024</Text></Table.Td>
                  <Table.Td><Text size="sm">Plan Premium - Enero 2024</Text></Table.Td>
                  <Table.Td><Text fw={600} size="sm">€149.00</Text></Table.Td>
                  <Table.Td>
                    <Badge color="green" size="sm" variant="light" radius="xl">Pagado</Badge>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text size="sm">01/12/2023</Text></Table.Td>
                  <Table.Td><Text size="sm">Plan Premium - Diciembre 2023</Text></Table.Td>
                  <Table.Td><Text fw={600} size="sm">€149.00</Text></Table.Td>
                  <Table.Td>
                    <Badge color="green" size="sm" variant="light" radius="xl">Pagado</Badge>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>
      </Tabs>

      <style>{`
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-medium);
        }
      `}</style>

      {/* Modal para editar alergias e intolerancias */}
      <Modal
        opened={allergyModalOpened}
        onClose={closeAllergyModal}
        title="Editar Alergias e Intolerancias"
        size="lg"
        radius="lg"
        centered
      >
        <Stack gap="lg">
          <MultiSelect
            label="Alergias"
            placeholder="Selecciona las alergias del cliente"
            data={COMMON_ALLERGENS}
            value={selectedAllergies}
            onChange={setSelectedAllergies}
            searchable
            clearable
            radius="md"
          />
          
          <MultiSelect
            label="Intolerancias"
            placeholder="Selecciona las intolerancias del cliente"
            data={COMMON_INTOLERANCES}
            value={selectedIntolerances}
            onChange={setSelectedIntolerances}
            searchable
            clearable
            radius="md"
          />

          <Group justify="flex-end" mt="md">
            <Button 
              variant="default" 
              onClick={closeAllergyModal}
              radius="xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAllergies}
              loading={updateClient.isPending}
              radius="xl"
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                  "&:hover": { background: "var(--nv-accent-hover)" }
                }
              }}
            >
              Guardar Cambios
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal para editar cliente */}
      <Modal
        opened={editClientModalOpened}
        onClose={closeEditClientModal}
        title="Editar Cliente"
        size="lg"
        radius="lg"
        centered
      >
        <form onSubmit={editClientForm.onSubmit(handleEditClient)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Nombre"
                placeholder="Juan"
                required
                radius="md"
                {...editClientForm.getInputProps("first_name")}
              />
              <TextInput
                label="Apellido"
                placeholder="García"
                required
                radius="md"
                {...editClientForm.getInputProps("last_name")}
              />
            </Group>
            <TextInput
              label="Email"
              placeholder="juan@email.com"
              required
              radius="md"
              {...editClientForm.getInputProps("email")}
            />
            <TextInput
              label="Teléfono"
              placeholder="+34 600 000 000"
              radius="md"
              {...editClientForm.getInputProps("phone")}
            />
            <Textarea
              label="Objetivos"
              placeholder="Describe los objetivos del cliente..."
              minRows={3}
              radius="md"
              {...editClientForm.getInputProps("goals")}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeEditClientModal} radius="xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={updateClient.isPending}
                radius="xl"
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": { background: "var(--nv-accent-hover)" }
                  }
                }}
              >
                Guardar Cambios
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal para editar información personal */}
      <Modal
        opened={editInfoModalOpened}
        onClose={closeEditInfoModal}
        title="Editar Información Personal"
        size="lg"
        radius="lg"
        centered
      >
        <form onSubmit={editInfoForm.onSubmit(handleEditInfo)}>
          <Stack gap="md">
            <TextInput
              label="Fecha de nacimiento"
              type="date"
              radius="md"
              {...editInfoForm.getInputProps("birth_date")}
            />
            <Select
              label="Género"
              placeholder="Selecciona el género"
              data={[
                { value: "male", label: "Masculino" },
                { value: "female", label: "Femenino" },
                { value: "other", label: "Otro" },
              ]}
              radius="md"
              {...editInfoForm.getInputProps("gender")}
            />
            <Group grow>
              <NumberInput
                label="Altura (cm)"
                placeholder="165"
                min={100}
                max={250}
                radius="md"
                {...editInfoForm.getInputProps("height_cm")}
              />
              <NumberInput
                label="Peso (kg)"
                placeholder="65"
                min={30}
                max={300}
                decimalScale={1}
                radius="md"
                {...editInfoForm.getInputProps("weight_kg")}
              />
            </Group>
            <Textarea
              label="Notas internas"
              placeholder="Notas visibles solo para el entrenador..."
              minRows={3}
              radius="md"
              {...editInfoForm.getInputProps("internal_notes")}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeEditInfoModal} radius="xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={updateClient.isPending}
                radius="xl"
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": { background: "var(--nv-accent-hover)" }
                  }
                }}
              >
                Guardar Cambios
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal de confirmación para eliminar cliente */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Eliminar Cliente"
        size="sm"
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            ¿Estás seguro de que quieres eliminar a <strong>{client.first_name} {client.last_name}</strong>? 
            Esta acción no se puede deshacer.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDeleteModal} radius="xl">
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={handleDeleteClient}
              loading={deleteClient.isPending}
              radius="xl"
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal para asignar programa de entrenamiento */}
      <Modal
        opened={assignProgramModalOpened}
        onClose={closeAssignProgramModal}
        title="Asignar Programa de Entrenamiento"
        size="md"
        radius="lg"
      >
        <Stack gap="md">
          <Select
            label="Programa de entrenamiento"
            placeholder="Selecciona un programa"
            data={workoutTemplates.map((p: { id: string; name: string; duration_weeks?: number; difficulty?: string }) => ({
              value: p.id,
              label: `${p.name} (${p.duration_weeks || 0} semanas - ${p.difficulty || 'N/A'})`,
            }))}
            value={selectedProgram}
            onChange={setSelectedProgram}
            searchable
            required
          />
          
          <TextInput
            label="Fecha de inicio"
            type="date"
            value={assignStartDate}
            onChange={(e) => setAssignStartDate(e.currentTarget.value)}
            required
          />
          
          <TextInput
            label="Fecha de fin (opcional)"
            type="date"
            value={assignEndDate}
            onChange={(e) => setAssignEndDate(e.currentTarget.value)}
          />
          
          <Textarea
            label="Notas (opcional)"
            placeholder="Notas adicionales para esta asignación..."
            value={assignNotes}
            onChange={(e) => setAssignNotes(e.currentTarget.value)}
            rows={3}
          />
          
          {workoutTemplates.length === 0 && (
            <Text size="sm" c="dimmed" ta="center">
              No hay programas de entrenamiento disponibles.
              <br />
              Crea uno desde la sección de Entrenamiento.
            </Text>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeAssignProgramModal} radius="xl">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAssignProgram}
              loading={assignWorkoutProgram.isPending}
              disabled={!selectedProgram || workoutTemplates.length === 0}
              radius="xl"
              leftSection={<IconBarbell size={16} />}
            >
              Asignar Programa
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal para asignar plan nutricional */}
      <Modal
        opened={assignMealPlanModalOpened}
        onClose={closeAssignMealPlanModal}
        title="Asignar Plan Nutricional"
        size="md"
        radius="lg"
      >
        <Stack gap="md">
          <Select
            label="Plan nutricional"
            placeholder="Selecciona un plan"
            data={mealPlanTemplates.map((p: { id: string; name: string; duration_days?: number; target_calories?: number }) => ({
              value: p.id,
              label: `${p.name} (${p.duration_days || 7} días - ${p.target_calories || 0} kcal)`,
            }))}
            value={selectedMealPlanForAssign}
            onChange={setSelectedMealPlanForAssign}
            searchable
            required
          />
          
          <TextInput
            label="Fecha de inicio"
            type="date"
            value={assignStartDate}
            onChange={(e) => setAssignStartDate(e.currentTarget.value)}
            required
          />
          
          <TextInput
            label="Fecha de fin (opcional)"
            type="date"
            value={assignEndDate}
            onChange={(e) => setAssignEndDate(e.currentTarget.value)}
          />
          
          <Textarea
            label="Notas (opcional)"
            placeholder="Notas adicionales para esta asignación..."
            value={assignNotes}
            onChange={(e) => setAssignNotes(e.currentTarget.value)}
            rows={3}
          />
          
          {mealPlanTemplates.length === 0 && (
            <Text size="sm" c="dimmed" ta="center">
              No hay planes nutricionales disponibles.
              <br />
              Crea uno desde la sección de Nutrición.
            </Text>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeAssignMealPlanModal} radius="xl">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAssignMealPlan}
              loading={assignMealPlan.isPending}
              disabled={!selectedMealPlanForAssign || mealPlanTemplates.length === 0}
              radius="xl"
              leftSection={<IconSalad size={16} />}
            >
              Asignar Plan
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de confirmación para eliminar programa/plan */}
      <Modal
        opened={deleteConfirmModalOpened}
        onClose={closeDeleteConfirmModal}
        title={deletingProgramId ? "Eliminar Programa" : "Eliminar Plan Nutricional"}
        size="sm"
        radius="lg"
        centered
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            {deletingProgramId 
              ? "¿Estás seguro de que quieres eliminar este programa de entrenamiento asignado? Esta acción no se puede deshacer."
              : "¿Estás seguro de que quieres eliminar este plan nutricional asignado? Esta acción no se puede deshacer."
            }
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button 
              variant="default" 
              radius="xl"
              onClick={closeDeleteConfirmModal}
            >
              Cancelar
            </Button>
            <Button 
              color="red"
              radius="xl"
              leftSection={<IconTrash size={16} />}
              onClick={handleConfirmDelete}
              loading={deleteAssignedProgram.isPending || deleteAssignedMealPlan.isPending}
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal para ver detalles del programa de entrenamiento */}
      <Modal
        opened={viewProgramModalOpened}
        onClose={closeViewProgramModal}
        title={selectedProgramForView?.name || "Programa de Entrenamiento"}
        size="lg"
        radius="lg"
      >
        {selectedProgramForView && (
          <Stack gap="md">
            {selectedProgramForView.description && (
              <Text size="sm" c="dimmed">{selectedProgramForView.description}</Text>
            )}
            <Group gap="md">
              {selectedProgramForView.duration_weeks && (
                <Badge variant="light" color="blue">
                  {selectedProgramForView.duration_weeks} semanas
                </Badge>
              )}
              {selectedProgramForView.difficulty && (
                <Badge variant="light" color="gray">
                  {selectedProgramForView.difficulty}
                </Badge>
              )}
            </Group>
            
            <Divider my="sm" label="Ejercicios" labelPosition="center" />
            
            {selectedProgramForView.template?.blocks?.map((block, blockIndex) => (
              <Box key={blockIndex}>
                <Group gap="xs" mb="sm">
                  <Badge 
                    color={block.type === 'warmup' ? 'orange' : block.type === 'cooldown' ? 'blue' : 'yellow'} 
                    variant="light"
                    size="sm"
                  >
                    {block.type === 'warmup' ? 'Calentamiento' : block.type === 'cooldown' ? 'Enfriamiento' : 'Principal'}
                  </Badge>
                  <Text fw={600} size="sm">{block.name}</Text>
                </Group>
                <Stack gap="xs">
                  {block.exercises?.map((ex, exIndex) => (
                    <Card key={exIndex} padding="sm" radius="md" withBorder>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>
                          {ex.exercise?.name || ex.name || "Ejercicio"}
                        </Text>
                        <Group gap="xs">
                          <Badge variant="light" color="blue" size="sm">
                            {ex.sets || 3} x {ex.reps || "10-12"}
                          </Badge>
                          {ex.rest_seconds && (
                            <Badge variant="light" color="gray" size="sm">
                              {ex.rest_seconds}s
                            </Badge>
                          )}
                        </Group>
                      </Group>
                      {ex.notes && (
                        <Text size="xs" c="dimmed" mt="xs">{ex.notes}</Text>
                      )}
                    </Card>
                  ))}
                </Stack>
              </Box>
            ))}
            
            {(!selectedProgramForView.template?.blocks || selectedProgramForView.template.blocks.length === 0) && (
              <Text c="dimmed" ta="center" py="xl">
                Este programa no tiene ejercicios configurados
              </Text>
            )}
            
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={closeViewProgramModal}>
                Cerrar
              </Button>
              <Button 
                leftSection={<IconEdit size={16} />}
                onClick={() => {
                  closeViewProgramModal();
                  navigate(`/workouts?edit=${selectedProgramForView.id}&clientId=${id}`);
                }}
              >
                Editar programa
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
