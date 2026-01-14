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
import { useClient, useUpdateClient, useDeleteClient } from "../../hooks/useClients";
import { 
  useClientMealPlans,
  useWorkoutProgramTemplates,
  useMealPlanTemplates,
  useAssignWorkoutProgram,
  useAssignMealPlan,
  useSupabaseMealPlan,
} from "../../hooks/useSupabaseData";
import { AllergenList } from "../../components/common/AllergenBadge";
import { MealPlanDetailView } from "../../components/nutrition/MealPlanDetailView";
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
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  
  const { data: fetchedClient, isLoading } = useClient(id || "");
  const { data: clientMealPlans } = useClientMealPlans(id || "");
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
  
  // Estados para los formularios de asignación
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedMealPlanForAssign, setSelectedMealPlanForAssign] = useState<string | null>(null);
  const [assignStartDate, setAssignStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignEndDate, setAssignEndDate] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");
  
  // Estado para ver plan nutricional detallado
  const [viewingMealPlanId, setViewingMealPlanId] = useState<string | null>(null);
  const { data: viewingMealPlan } = useSupabaseMealPlan(viewingMealPlanId || "");

  // Mock client data as fallback
  const mockClient = {
    id: id || "1",
    first_name: "María",
    last_name: "García",
    email: "maria@email.com",
    phone: "+34 600 123 456",
    avatar_url: null,
    birth_date: "1990-05-15",
    gender: "female",
    height_cm: 165,
    weight_kg: 62,
    goals: "Tonificación y mejora de resistencia cardiovascular",
    internal_notes: "Lesión antigua en rodilla derecha, evitar impacto alto",
    is_active: true,
    chat_enabled: true,
    allergies: ["gluten", "lactosa"],
    intolerances: ["fructosa"],
    injuries: [
      { name: "Lesión de rodilla derecha", date: "2020-03-15", notes: "Evitar impacto alto", status: "recovered" }
    ],
    tags: [
      { name: "VIP", color: "#8B5CF6" },
      { name: "Presencial", color: "#10B981" },
    ],
    created_at: "2023-06-15",
    consents: {
      data_processing: true,
      marketing: true,
      health_data: true,
      consent_date: "2023-06-15",
    },
  };

  // Mock data
  const documents = [
    { id: "1", name: "Plan Nutricional Enero.pdf", type: "diet_plan", direction: "outbound", created_at: "2024-01-15", is_read: true },
    { id: "2", name: "Contrato de Servicios.pdf", type: "contract", direction: "outbound", created_at: "2023-06-15", is_read: true },
    { id: "3", name: "Análisis de Sangre.pdf", type: "medical", direction: "inbound", created_at: "2024-01-10", is_read: false },
  ];

  const progressPhotos = [
    { id: "1", photo_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300", photo_type: "front", photo_date: "2024-01-01", weight_kg: "62" },
    { id: "2", photo_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300", photo_type: "side", photo_date: "2024-01-01", weight_kg: "62" },
  ];

  const mealPlans = clientMealPlans?.length ? clientMealPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    target_calories: plan.target_calories || 2000,
    status: plan.is_template === "N" ? "active" : "inactive",
    created_at: plan.created_at,
  })) : [
    { id: "1", name: "Plan Definición Q1", target_calories: 1800, status: "active", created_at: "2024-01-01" },
  ];

  const supplements = [
    { id: "1", name: "Whey Protein", dosage: "30g post-entreno", frequency: "Días de entrenamiento" },
    { id: "2", name: "Omega 3", dosage: "2 cápsulas", frequency: "Diario con comida" },
  ];

  const client = fetchedClient || mockClient;

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
      await updateClient.mutateAsync({ id, data: values });
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
  
  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  const stats = {
    total_sessions: 48,
    sessions_this_month: 8,
    adherence: 92,
    mrr: 149,
    lifetime_value: 1788,
    days_as_client: 214,
  };

  const activities = [
    { id: "1", type: "session", title: "Sesión completada", description: "Entrenamiento de fuerza", date: "2024-01-15 10:00" },
    { id: "2", type: "payment", title: "Pago recibido", description: "Plan Premium - Enero", date: "2024-01-01 06:00" },
    { id: "3", type: "message", title: "Mensaje enviado", description: "Recordatorio de objetivos", date: "2023-12-28 14:30" },
  ];

  const sessions = [
    { id: "1", date: "2024-01-15", time: "10:00", type: "Personal Training", status: "completed", notes: "Buen progreso" },
    { id: "2", date: "2024-01-18", time: "10:00", type: "Personal Training", status: "confirmed", notes: "" },
  ];

  const measurements = [
    { date: "2024-01-01", weight: 62, body_fat: 24, muscle_mass: 26 },
    { date: "2023-12-01", weight: 63, body_fat: 25, muscle_mass: 25.5 },
    { date: "2023-11-01", weight: 64, body_fat: 26, muscle_mass: 25 },
  ];

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
    setSelectedAllergies(client.allergies || []);
    setSelectedIntolerances(client.intolerances || []);
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
            ...(client.health_data || {}),
            allergies: selectedAllergies,
            intolerances: selectedIntolerances,
          },
        },
      });
      closeAllergyModal();
    } catch (error) {
      console.error("Error saving allergies:", error);
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
          value={stats.total_sessions}
          color="var(--nv-primary)"
        />
        <StatCard 
          icon={<IconActivity size={24} />} 
          label="Este Mes" 
          value={stats.sessions_this_month}
          color="var(--nv-success)"
        />
        <StatCard 
          icon={<IconTarget size={24} />} 
          label="Adherencia" 
          value={`${stats.adherence}%`}
          color="var(--nv-success)"
          trend={{ value: 5, positive: true }}
        />
        <StatCard 
          icon={<IconCreditCard size={24} />} 
          label="MRR" 
          value={`€${stats.mrr}`}
          color="var(--nv-warning)"
        />
        <StatCard 
          icon={<IconHeart size={24} />} 
          label="LTV" 
          value={`€${stats.lifetime_value}`}
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

              {(client.allergies?.length > 0 || client.intolerances?.length > 0) ? (
                <Stack gap="md">
                  {client.allergies?.length > 0 && (
                    <Box>
                      <Text size="sm" c="dimmed" mb="xs">Alergias</Text>
                      <AllergenList 
                        allergens={client.allergies} 
                        clientAllergens={client.allergies}
                        clientIntolerances={client.intolerances}
                      />
                    </Box>
                  )}
                  {client.intolerances?.length > 0 && (
                    <Box>
                      <Text size="sm" c="dimmed" mb="xs">Intolerancias</Text>
                      <AllergenList 
                        allergens={client.intolerances} 
                        clientAllergens={client.allergies}
                        clientIntolerances={client.intolerances}
                      />
                    </Box>
                  )}
                </Stack>
              ) : (
                <Text c="dimmed" size="sm">Sin alergias ni intolerancias registradas</Text>
              )}

              {client.injuries?.length > 0 && (
                <Box mt="lg">
                  <Divider mb="lg" />
                  <Text size="sm" c="dimmed" mb="xs">Lesiones</Text>
                  <Stack gap="xs">
                    {client.injuries.map((injury: any, idx: number) => (
                      <Badge 
                        key={idx} 
                        size="lg" 
                        variant="light"
                        radius="xl"
                        styles={{
                          root: {
                            backgroundColor: "var(--nv-warning-bg)",
                            color: "var(--nv-warning)"
                          }
                        }}
                      >
                        {injury.name}
                      </Badge>
                    ))}
                  </Stack>
                </Box>
              )}
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
                  allergies: (client as any).health_data?.allergies || client.allergies || [],
                  intolerances: (client as any).health_data?.intolerances || client.intolerances || [],
                }}
                onEdit={() => navigate(`/nutrition/plans/${viewingMealPlanId}/edit`)}
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

                {/* Macros Objetivo */}
                <Box p="lg" style={{ background: "rgba(255,255,255,0.95)", borderRadius: "var(--radius-lg)" }}>
                  <Text fw={700} size="sm" mb="md" style={{ color: "var(--nv-dark)" }}>
                    🎯 Objetivos Diarios Recomendados
                  </Text>
                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
                    <Box ta="center">
                      <Text size="2rem" fw={700} style={{ color: "#3B82F6", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {nutritionalTargets.calories}
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Calorías</Text>
                    </Box>
                    <Box ta="center">
                      <Text size="2rem" fw={700} style={{ color: "#22C55E", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {nutritionalTargets.protein}g
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Proteínas</Text>
                    </Box>
                    <Box ta="center">
                      <Text size="2rem" fw={700} style={{ color: "#F59E0B", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {nutritionalTargets.carbs}g
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Carbohidratos</Text>
                    </Box>
                    <Box ta="center">
                      <Text size="2rem" fw={700} style={{ color: "#8B5CF6", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {nutritionalTargets.fat}g
                      </Text>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Grasas</Text>
                    </Box>
                  </SimpleGrid>
                </Box>

                {/* Alergias e intolerancias */}
                {((client as any).health_data?.allergies?.length > 0 || (client as any).health_data?.intolerances?.length > 0 || client.allergies?.length > 0) && (
                  <Box mt="md" p="md" style={{ background: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                    <Group gap="xs" mb="xs">
                      <IconAlertTriangle size={16} color="#EF4444" />
                      <Text size="sm" fw={600} style={{ color: "#EF4444" }}>Alergias e Intolerancias</Text>
                    </Group>
                    <Group gap="xs">
                      {[
                        ...((client as any).health_data?.allergies || client.allergies || []),
                        ...((client as any).health_data?.intolerances || client.intolerances || [])
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
                    {mealPlans.map((plan) => (
                      <Box 
                        key={plan.id} 
                        p="md" 
                        style={{ 
                          border: "1px solid var(--border-subtle)", 
                          borderRadius: "var(--radius-md)",
                          transition: "all 0.2s",
                          cursor: "pointer"
                        }}
                        className="hover-lift"
                        onClick={() => setViewingMealPlanId(plan.id)}
                      >
                        <Group justify="space-between">
                          <Box>
                            <Text fw={600} size="sm">{plan.name}</Text>
                            <Text c="dimmed" size="xs">{plan.target_calories} kcal/día</Text>
                          </Box>
                          <Group gap="xs">
                            <Badge 
                              size="sm" 
                              variant="light"
                              radius="xl"
                              color={plan.status === "active" ? "green" : "gray"}
                            >
                              {plan.status === "active" ? "Activo" : "Inactivo"}
                            </Badge>
                            <ActionIcon 
                              variant="subtle" 
                              color="blue" 
                              radius="xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingMealPlanId(plan.id);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                            <ActionIcon 
                              variant="subtle" 
                              color="gray" 
                              radius="xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Box>
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
          <Box className="nv-card" p="xl">
            <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Evolución de Medidas
            </Text>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Peso (kg)</Table.Th>
                  <Table.Th>% Grasa</Table.Th>
                  <Table.Th>Masa Muscular (kg)</Table.Th>
                  <Table.Th>Variación</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {measurements.map((m, index) => {
                  const prevWeight = measurements[index + 1]?.weight || m.weight;
                  const weightChange = m.weight - prevWeight;
                  return (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {new Date(m.date).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                        </Text>
                      </Table.Td>
                      <Table.Td><Text size="sm">{m.weight} kg</Text></Table.Td>
                      <Table.Td><Text size="sm">{m.body_fat}%</Text></Table.Td>
                      <Table.Td><Text size="sm">{m.muscle_mass} kg</Text></Table.Td>
                      <Table.Td>
                        {index < measurements.length - 1 && (
                          <Badge
                            color={weightChange <= 0 ? "green" : "red"}
                            size="sm"
                            variant="light"
                            radius="xl"
                          >
                            {weightChange <= 0 ? "" : "+"}{weightChange} kg
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>

        {/* Programas */}
        <Tabs.Panel value="programs">
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
            data={workoutTemplates.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.duration_weeks} semanas - ${p.difficulty})`,
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
            data={mealPlanTemplates.map((p) => ({
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
    </Container>
  );
}
