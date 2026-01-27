import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Drawer,
  Group,
  Loader,
  Modal,
  NumberInput,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconApple,
  IconBread,
  IconCheck,
  IconCopy,
  IconEdit,
  IconEgg,
  IconEye,
  IconMeat,
  IconMilk,
  IconPill,
  IconSalad,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";
import { useClient } from "../../hooks/useClients";
import { PageHeader } from "../../components/common/PageHeader";
import {
  type DayPlan,
  type Food,
  type Meal,
  MealPlanBuilder,
} from "../../components/nutrition/MealPlanBuilder";
import {
  useCreateFood,
  useCreateMealPlan,
  useCreateSupplement,
  useDeleteFood,
  useDeleteMealPlan,
  useDeleteSupplement,
  useSupabaseFoods,
  useSupabaseFoodsCount,
  useSupabaseFoodsPaginated,
  useSupabaseMealPlans,
  useSupabaseMealPlan,
  useSupplements,
  useUpdateFood,
  useUpdateMealPlan,
  useUpdateSupplement,
} from "../../hooks/useSupabaseData";
import { 
  useFoodFavorites, 
  useToggleFoodFavorite,
  useSupplementFavorites,
  useToggleSupplementFavorite 
} from "../../hooks/useFavorites";

// Función para mapear categoría de la BD a categoría del frontend
function mapCategory(dbCategory: string | null): string {
  if (!dbCategory) return "Otros";
  const cat = dbCategory.toLowerCase();
  if (
    cat.includes("carne") ||
    cat.includes("pollo") ||
    cat.includes("pescado") ||
    cat.includes("huevo") ||
    cat.includes("protein")
  )
    return "Proteínas";
  if (
    cat.includes("arroz") ||
    cat.includes("pasta") ||
    cat.includes("pan") ||
    cat.includes("cereal") ||
    cat.includes("patata") ||
    cat.includes("carbohidrat")
  )
    return "Carbohidratos";
  if (
    cat.includes("verdura") ||
    cat.includes("vegetal") ||
    cat.includes("ensalada") ||
    cat.includes("hortaliza")
  )
    return "Verduras";
  if (cat.includes("fruta") || cat.includes("fruit")) return "Frutas";
  if (
    cat.includes("leche") ||
    cat.includes("queso") ||
    cat.includes("yogur") ||
    cat.includes("lácteo") ||
    cat.includes("dairy")
  )
    return "Lácteos";
  if (
    cat.includes("aceite") ||
    cat.includes("grasa") ||
    cat.includes("mantequilla") ||
    cat.includes("oil")
  )
    return "Grasas";
  if (
    cat.includes("fruto seco") ||
    cat.includes("almendra") ||
    cat.includes("nuez") ||
    cat.includes("nut")
  )
    return "Frutos Secos";
  return "Otros";
}

// Función para mapear categoría del frontend a la BD
function categoryToDb(category: string): string {
  const mapping: Record<string, string> = {
    Proteínas: "en:meats",
    Carbohidratos: "en:cereals-and-potatoes",
    Verduras: "en:vegetables",
    Frutas: "en:fruits",
    Lácteos: "en:dairies",
    Grasas: "en:fats",
    "Frutos Secos": "en:nuts",
    Otros: "en:other",
  };
  return mapping[category] || category;
}

const initialDays: DayPlan[] = [
  { id: "day-1", day: 1, dayName: "Lunes", meals: [] as Meal[], notes: "" },
  { id: "day-2", day: 2, dayName: "Martes", meals: [] as Meal[], notes: "" },
  { id: "day-3", day: 3, dayName: "Miércoles", meals: [] as Meal[], notes: "" },
  { id: "day-4", day: 4, dayName: "Jueves", meals: [] as Meal[], notes: "" },
  { id: "day-5", day: 5, dayName: "Viernes", meals: [] as Meal[], notes: "" },
  { id: "day-6", day: 6, dayName: "Sábado", meals: [] as Meal[], notes: "" },
  { id: "day-7", day: 7, dayName: "Domingo", meals: [] as Meal[], notes: "" },
];

const FOODS_PER_PAGE = 50;

export function NutritionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editPlanId = searchParams.get("edit");
  const clientId = searchParams.get("clientId");
  
  // If editing for a specific client, get client info
  const { data: clientData } = useClient(clientId || "");
  
  const [activeTab, setActiveTab] = useState<string | null>("plans");
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] =
    useDisclosure(false);
  const [builderOpened, { open: openBuilder, close: closeBuilder }] =
    useDisclosure(false);
  const [searchFood, setSearchFood] = useState("");
  const [searchSupplement, setSearchSupplement] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchFood, 300);
  const [debouncedSupplementSearch] = useDebouncedValue(searchSupplement, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [mealPlanDays, setMealPlanDays] = useState(initialDays);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [foodFilter, setFoodFilter] = useState<string>("all"); // "all" | "favorites"
  const [supplementFilter, setSupplementFilter] = useState<string>("all"); // "all" | "favorites"
  const [editingFood, setEditingFood] = useState<any>(null);
  const [editFoodModalOpened, { open: openEditFoodModal, close: closeEditFoodModal }] = useDisclosure(false);
  const [editingSupplement, setEditingSupplement] = useState<any>(null);
  const [editSupplementModalOpened, { open: openEditSupplementModal, close: closeEditSupplementModal }] = useDisclosure(false);
  const [supplementModalOpened, { open: openSupplementModal, close: closeSupplementModal }] = useDisclosure(false);
  
  // Modales de detalle
  const [viewingFood, setViewingFood] = useState<any>(null);
  const [foodDetailModalOpened, { open: openFoodDetailModal, close: closeFoodDetailModal }] = useDisclosure(false);
  const [viewingSupplement, setViewingSupplement] = useState<any>(null);
  const [supplementDetailModalOpened, { open: openSupplementDetailModal, close: closeSupplementDetailModal }] = useDisclosure(false);

  // Cargar datos desde Supabase
  const { data: supabaseFoods } = useSupabaseFoods(); // Para el MealPlanBuilder (todos los alimentos)
  const {
    data: paginatedFoods,
    isLoading: isLoadingPaginatedFoods,
    isFetching: isFetchingFoods,
  } = useSupabaseFoodsPaginated(currentPage, FOODS_PER_PAGE, debouncedSearch);
  const { data: totalFoodsCount } = useSupabaseFoodsCount();
  // When editing a client's plan, we need to fetch all plans (not just templates)
  const { data: supabaseMealPlans, isLoading: isLoadingPlans } =
    useSupabaseMealPlans(clientId ? {} : { is_template: true });
  
  // Also fetch the specific plan if editing a client's plan
  const { data: specificClientPlan } = useSupabaseMealPlan(editPlanId && clientId ? editPlanId : "");
  const { data: supabaseSupplements } = useSupplements();
  
  // Favoritos
  const { data: foodFavorites = [] } = useFoodFavorites();
  const toggleFoodFavorite = useToggleFoodFavorite();
  const { data: supplementFavorites = [] } = useSupplementFavorites();
  const toggleSupplementFavorite = useToggleSupplementFavorite();

  // Resetear página cuando cambia la búsqueda
  const handleSearchChange = useCallback((value: string) => {
    setSearchFood(value);
    setCurrentPage(1);
  }, []);

  // Mutations
  const createMealPlan = useCreateMealPlan();
  const updateMealPlan = useUpdateMealPlan();
  const deleteMealPlan = useDeleteMealPlan();
  const createFood = useCreateFood();
  const updateFood = useUpdateFood();
  const deleteFood = useDeleteFood();
  const createSupplement = useCreateSupplement();
  const updateSupplement = useUpdateSupplement();
  void useDeleteSupplement; // Available for future use

  // Mapear los datos de Supabase al formato del frontend
  const foods: Food[] = useMemo(() => {
    if (!supabaseFoods) return [];
    return supabaseFoods.map((food: any) => ({
      id: food.id,
      name: food.name || "Sin nombre",
      calories: food.calories || 0,
      protein: food.protein_g || 0,
      carbs: food.carbs_g || 0,
      fat: food.fat_g || 0,
      serving_size: food.quantity || "100g",
      category: mapCategory(food.category),
    }));
  }, [supabaseFoods]);

  // Mapear suplementos
  const supplements = useMemo(() => {
    if (!supabaseSupplements) return [];
    return supabaseSupplements.map((supp: any) => ({
      id: supp.id,
      name: supp.name,
      brand: supp.brand,
      calories: supp.calories || 0,
      protein: supp.protein || 0,
      carbs: supp.carbs || 0,
      fat: supp.fat || 0,
      serving_size: supp.serving_size || "30g",
      how_to_take: supp.usage_instructions,
      timing: supp.extra_data?.timing,
    }));
  }, [supabaseSupplements]);

  // Check if food is favorite - foodFavorites is an array of food IDs
  const isFoodFavorite = useCallback((foodId: string) => {
    return Array.isArray(foodFavorites) && foodFavorites.includes(foodId);
  }, [foodFavorites]);

  // Check if supplement is favorite - supplementFavorites is an array of supplement IDs
  const isSupplementFavorite = useCallback((supplementId: string) => {
    return Array.isArray(supplementFavorites) && supplementFavorites.includes(supplementId);
  }, [supplementFavorites]);

  // Toggle food favorite
  const handleToggleFoodFavorite = async (foodId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isFavorite = isFoodFavorite(foodId);
    try {
      await toggleFoodFavorite.mutateAsync({ foodId, isFavorite });
      notifications.show({
        title: isFavorite ? "Eliminado de favoritos" : "Añadido a favoritos",
        message: isFavorite ? "El alimento se ha eliminado de tus favoritos" : "El alimento se ha añadido a tus favoritos",
        color: isFavorite ? "gray" : "yellow",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudo actualizar el favorito",
        color: "red",
      });
    }
  };

  // Toggle supplement favorite
  const handleToggleSupplementFavorite = async (supplementId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isFavorite = isSupplementFavorite(supplementId);
    try {
      await toggleSupplementFavorite.mutateAsync({ supplementId, isFavorite });
      notifications.show({
        title: isFavorite ? "Eliminado de favoritos" : "Añadido a favoritos",
        message: isFavorite ? "El suplemento se ha eliminado de tus favoritos" : "El suplemento se ha añadido a tus favoritos",
        color: isFavorite ? "gray" : "yellow",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudo actualizar el favorito",
        color: "red",
      });
    }
  };

  // Mapear planes nutricionales
  const mealPlans = useMemo(() => {
    if (!supabaseMealPlans) return [];
    return supabaseMealPlans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      duration_days: plan.duration_days || 7,
      target_calories: plan.target_calories || 2000,
      target_protein: plan.target_protein || 150,
      target_carbs: plan.target_carbs || 200,
      target_fat: plan.target_fat || 70,
      dietary_tags: plan.dietary_tags || [],
      plan: plan.plan || { days: [] },
      client_name: plan.clients
        ? `${plan.clients.first_name} ${plan.clients.last_name}`
        : null,
    }));
  }, [supabaseMealPlans]);
  
  // Auto-open builder when edit param is in URL
  useEffect(() => {
    if (editPlanId && !builderOpened) {
      // First try to find in the mealPlans list
      let plan = mealPlans.find((p: any) => p.id === editPlanId);
      
      // If not found and we have a specific client plan loaded, use that
      if (!plan && specificClientPlan) {
        plan = {
          id: specificClientPlan.id,
          name: specificClientPlan.name,
          description: specificClientPlan.description,
          duration_days: specificClientPlan.duration_days || 7,
          target_calories: specificClientPlan.target_calories || 2000,
          target_protein: specificClientPlan.target_protein || 150,
          target_carbs: specificClientPlan.target_carbs || 200,
          target_fat: specificClientPlan.target_fat || 70,
          dietary_tags: specificClientPlan.dietary_tags || [],
          plan: specificClientPlan.plan || { days: [] },
        };
      }
      
      if (plan) {
        openPlanBuilderFromUrl(plan);
      }
    }
  }, [editPlanId, mealPlans, specificClientPlan, builderOpened]);
  
  const openPlanBuilderFromUrl = (plan: any) => {
    setEditingPlan(plan);
    planForm.setValues({
      name: plan.name,
      description: plan.description || "",
      duration_days: plan.duration_days,
      target_calories: plan.target_calories,
      target_protein: plan.target_protein,
      target_carbs: plan.target_carbs,
      target_fat: plan.target_fat,
      dietary_tags: plan.dietary_tags || [],
    });
    if (plan.plan?.days?.length > 0) {
      setMealPlanDays(plan.plan.days);
    } else {
      setMealPlanDays(initialDays);
    }
    openBuilder();
  };
  
  const handleCloseBuilder = () => {
    closeBuilder();
    // Clear URL params when closing
    if (editPlanId || clientId) {
      setSearchParams({});
    }
  };

  const foodForm = useForm({
    initialValues: {
      name: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      serving_size: "100g",
      category: "",
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const planForm = useForm({
    initialValues: {
      name: "",
      description: "",
      duration_days: 7,
      target_calories: 2000,
      target_protein: 150,
      target_carbs: 200,
      target_fat: 70,
      dietary_tags: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
    },
  });

  const handleCreateFood = async (values: typeof foodForm.values) => {
    try {
      await createFood.mutateAsync({
        name: values.name,
        category: categoryToDb(values.category),
        calories: values.calories,
        protein_g: values.protein,
        carbs_g: values.carbs,
        fat_g: values.fat,
        quantity: values.serving_size,
      });
      notifications.show({
        title: "Alimento creado",
        message: `${values.name} se ha añadido a tu biblioteca`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
      closeFoodModal();
      foodForm.reset();
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo crear el alimento",
        color: "red",
      });
    }
  };

  const handleDeleteFood = async (foodId: string, foodName: string) => {
    try {
      await deleteFood.mutateAsync(foodId);
      notifications.show({
        title: "Alimento eliminado",
        message: `${foodName} se ha eliminado de tu biblioteca`,
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo eliminar el alimento",
        color: "red",
      });
    }
  };

  const openPlanBuilder = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      planForm.setValues({
        name: plan.name,
        description: plan.description || "",
        duration_days: plan.duration_days,
        target_calories: plan.target_calories,
        target_protein: plan.target_protein,
        target_carbs: plan.target_carbs,
        target_fat: plan.target_fat,
        dietary_tags: plan.dietary_tags || [],
      });
      // Cargar los días del plan si existen
      if (plan.plan?.days?.length > 0) {
        setMealPlanDays(plan.plan.days);
      } else {
        setMealPlanDays(initialDays);
      }
    } else {
      setEditingPlan(null);
      setMealPlanDays(initialDays);
      planForm.reset();
    }
    openBuilder();
  };

  const handleSavePlan = async () => {
    const values = planForm.values;
    if (!values.name) return;

    try {
      const planData = {
        name: values.name,
        description: values.description,
        duration_days: values.duration_days,
        target_calories: values.target_calories,
        target_protein: values.target_protein,
        target_carbs: values.target_carbs,
        target_fat: values.target_fat,
        dietary_tags: values.dietary_tags,
        plan: { days: mealPlanDays },
        is_template: true,
      };

      if (editingPlan) {
        await updateMealPlan.mutateAsync({ id: editingPlan.id, ...planData });
        notifications.show({
          title: "Plan actualizado",
          message: `${values.name} se ha actualizado correctamente`,
          color: "green",
          icon: <IconCheck size={16} />,
        });
      } else {
        await createMealPlan.mutateAsync(planData);
        notifications.show({
          title: "Plan creado",
          message: `${values.name} se ha creado correctamente`,
          color: "green",
          icon: <IconCheck size={16} />,
        });
      }

      handleCloseBuilder();
      planForm.reset();
      setMealPlanDays(initialDays);
      setEditingPlan(null);
      
      // If editing for a specific client, redirect back to client page
      if (clientId) {
        navigate(`/clients/${clientId}`);
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo guardar el plan",
        color: "red",
      });
    }
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    try {
      await deleteMealPlan.mutateAsync(planId);
      notifications.show({
        title: "Plan eliminado",
        message: `${planName} se ha eliminado correctamente`,
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo eliminar el plan",
        color: "red",
      });
    }
  };

  const handleDuplicatePlan = async (plan: any) => {
    try {
      await createMealPlan.mutateAsync({
        name: `${plan.name} (copia)`,
        description: plan.description,
        duration_days: plan.duration_days,
        target_calories: plan.target_calories,
        target_protein: plan.target_protein,
        target_carbs: plan.target_carbs,
        target_fat: plan.target_fat,
        dietary_tags: plan.dietary_tags,
        plan: plan.plan,
        is_template: true,
      });
      notifications.show({
        title: "Plan duplicado",
        message: `Se ha creado una copia de ${plan.name}`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo duplicar el plan",
        color: "red",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Proteínas":
        return IconMeat;
      case "Carbohidratos":
        return IconBread;
      case "Verduras":
        return IconSalad;
      case "Frutas":
        return IconApple;
      case "Lácteos":
        return IconMilk;
      case "Grasas":
        return IconEgg;
      default:
        return IconApple;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Proteínas":
        return "red";
      case "Carbohidratos":
        return "orange";
      case "Verduras":
        return "green";
      case "Frutas":
        return "yellow";
      case "Lácteos":
        return "blue";
      case "Grasas":
        return "grape";
      case "Frutos Secos":
        return "teal";
      default:
        return "gray";
    }
  };

  // Mapear alimentos paginados para la vista
  const paginatedFoodsList: Food[] = useMemo(() => {
    if (!paginatedFoods?.items) return [];
    
    let foodsList = paginatedFoods.items.map((food: any) => ({
      id: food.id,
      name: food.name || "Sin nombre",
      calories: food.calories || 0,
      protein: food.protein_g || 0,
      carbs: food.carbs_g || 0,
      fat: food.fat_g || 0,
      serving_size: food.quantity || "100g",
      category: mapCategory(food.category),
    }));

    // Filtrar solo favoritos si está activo el filtro
    if (foodFilter === "favorites") {
      foodsList = foodsList.filter((food: Food) => isFoodFavorite(food.id));
    }

    // Ordenar favoritos primero
    foodsList.sort((a: Food, b: Food) => {
      const aFav = isFoodFavorite(a.id);
      const bFav = isFoodFavorite(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

    return foodsList;
  }, [paginatedFoods, foodFilter, isFoodFavorite]);

  // Mapear suplementos con filtro de favoritos
  const filteredSupplements = useMemo(() => {
    let suppList = supplements;
    
    // Filtrar por búsqueda
    if (debouncedSupplementSearch) {
      const search = debouncedSupplementSearch.toLowerCase();
      suppList = suppList.filter((supp: any) => 
        supp.name.toLowerCase().includes(search) ||
        (supp.brand && supp.brand.toLowerCase().includes(search))
      );
    }
    
    // Filtrar solo favoritos si está activo el filtro
    if (supplementFilter === "favorites") {
      suppList = suppList.filter((supp: any) => isSupplementFavorite(supp.id));
    }

    // Ordenar favoritos primero
    suppList.sort((a: any, b: any) => {
      const aFav = isSupplementFavorite(a.id);
      const bFav = isSupplementFavorite(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

    return suppList;
  }, [supplements, supplementFilter, isSupplementFavorite, debouncedSupplementSearch]);

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: activeTab === "foods" ? "Nuevo Alimento" : "Nuevo Plan",
          onClick:
            activeTab === "foods" ? openFoodModal : () => openPlanBuilder(),
        }}
        description="Gestiona planes nutricionales y alimentos"
        title="Nutrición"
      />

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="md" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Tabs.Tab leftSection={<IconTemplate size={14} />} value="plans" style={{ fontWeight: 600, fontSize: "13px" }}>
            Planes{" "}
            {mealPlans.length > 0 && (
              <Badge ml="xs" size="xs" radius="md" variant="light">
                {mealPlans.length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconApple size={14} />} value="foods" style={{ fontWeight: 600, fontSize: "13px" }}>
            Alimentos{" "}
            {(totalFoodsCount ?? 0) > 0 && (
              <Badge ml="xs" size="xs" radius="md" variant="light">
                {totalFoodsCount?.toLocaleString()}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconPill size={14} />} value="supplements" style={{ fontWeight: 600, fontSize: "13px" }}>
            Suplementos{" "}
            {supplements.length > 0 && (
              <Badge ml="xs" size="xs" radius="md" variant="light">
                {supplements.length}
              </Badge>
            )}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="plans">
          {isLoadingPlans ? (
            <Center py="xl">
              <Loader size="md" />
            </Center>
          ) : mealPlans.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
              {mealPlans.map((plan: { id: string; name: string; description?: string; duration_days: number; target_calories: number; target_protein: number; target_carbs: number; target_fat: number; dietary_tags: string[]; plan: { days: unknown[] }; client_name: string | null }) => (
                <Box key={plan.id} className="nv-card" p="md">
                  <Group justify="space-between" mb="sm">
                    <Text fw={600} size="sm" style={{ color: "var(--nv-dark)" }} lineClamp={1}>{plan.name}</Text>
                    <Badge color="green" variant="light" radius="md" size="xs">
                      {plan.duration_days}d
                    </Badge>
                  </Group>

                  <Text c="dimmed" lineClamp={2} size="xs">
                    {plan.description || "Sin descripción"}
                  </Text>

                  {plan.client_name && (
                    <Badge color="blue" mt="xs" size="xs" variant="outline" radius="md">
                      {plan.client_name}
                    </Badge>
                  )}

                  <Stack gap={4} mt="sm">
                    <Group justify="space-between">
                      <Text c="dimmed" size="xs">Calorías</Text>
                      <Text fw={600} size="xs" style={{ color: "var(--nv-dark)" }}>
                        {plan.target_calories} kcal
                      </Text>
                    </Group>
                    <Group gap={4}>
                      <Badge color="green" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>
                        P:{plan.target_protein}g
                      </Badge>
                      <Badge color="orange" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>
                        C:{plan.target_carbs}g
                      </Badge>
                      <Badge color="grape" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>
                        G:{plan.target_fat}g
                      </Badge>
                    </Group>
                  </Stack>

                  <Divider my="sm" style={{ borderColor: "var(--border-subtle)" }} />

                  <Group gap={6}>
                    <Button
                      flex={1}
                      leftSection={<IconEdit size={12} />}
                      onClick={() => openPlanBuilder(plan)}
                      size="xs"
                      variant="light"
                      radius="md"
                      styles={{ root: { height: 28 } }}
                    >
                      Editar
                    </Button>
                    <ActionIcon 
                      color="blue" 
                      variant="light"
                      radius="md"
                      size="sm"
                      onClick={() => navigate(`/nutrition/${plan.id}`)}
                    >
                      <IconEye size={14} />
                    </ActionIcon>
                    <ActionIcon
                      color="gray"
                      loading={createMealPlan.isPending}
                      onClick={() => handleDuplicatePlan(plan)}
                      variant="light"
                      radius="md"
                      size="sm"
                    >
                      <IconCopy size={14} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      loading={deleteMealPlan.isPending}
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      variant="light"
                      radius="md"
                      size="sm"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Box>
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              actionLabel="Crear Plan"
              description="Crea tu primer plan nutricional para asignarlo a tus clientes."
              icon={<IconTemplate size={36} />}
              onAction={() => openPlanBuilder()}
              title="No hay planes nutricionales"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="foods">
          <Group mb="md" gap="sm">
            <TextInput
              leftSection={<IconSearch size={14} />}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar alimentos..."
              value={searchFood}
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
              value={foodFilter}
              onChange={setFoodFilter}
              size="xs"
              radius="md"
              data={[
                { label: "Todos", value: "all" },
                { label: "⭐ Favoritos", value: "favorites" },
              ]}
              styles={{
                root: {
                  backgroundColor: "var(--nv-surface)",
                  border: "1px solid var(--border-subtle)",
                }
              }}
            />
          </Group>

          {isLoadingPaginatedFoods ? (
            <Center py="xl">
              <Loader size="md" />
            </Center>
          ) : paginatedFoodsList.length > 0 ? (
            <>
              {/* Info de resultados */}
              <Group justify="space-between" mb="sm">
                <Text c="dimmed" size="xs">
                  {(currentPage - 1) * FOODS_PER_PAGE + 1} - {Math.min(currentPage * FOODS_PER_PAGE, paginatedFoods?.total || 0)} de {paginatedFoods?.total?.toLocaleString()}
                  {debouncedSearch && ` • "${debouncedSearch}"`}
                </Text>
                {isFetchingFoods && <Loader size="xs" />}
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md" className="stagger">
                {paginatedFoodsList.map((food) => {
                  const CategoryIcon = getCategoryIcon(food.category);
                  return (
                    <Box key={food.id} className="food-card">
                      {/* Header con icono, nombre y acciones */}
                      <Box className="food-card-header">
                        <Box 
                          className="food-card-icon"
                          style={{ 
                            background: `var(--mantine-color-${getCategoryColor(food.category)}-light)`,
                            color: `var(--mantine-color-${getCategoryColor(food.category)}-filled)`,
                          }}
                        >
                          <CategoryIcon size={20} />
                        </Box>
                        <Box className="food-card-info">
                          <Text className="food-card-name">{food.name}</Text>
                          <Text className="food-card-serving">{food.serving_size}</Text>
                        </Box>
                        <Box className="food-card-actions">
                          <Tooltip label={isFoodFavorite(food.id) ? "Quitar de favoritos" : "Añadir a favoritos"}>
                            <ActionIcon
                              color={isFoodFavorite(food.id) ? "yellow" : "gray"}
                              onClick={(e) => handleToggleFoodFavorite(food.id, e)}
                              size="sm"
                              variant="subtle"
                              radius="md"
                              loading={toggleFoodFavorite.isPending}
                            >
                              {isFoodFavorite(food.id) ? (
                                <IconStarFilled size={16} />
                              ) : (
                                <IconStar size={16} />
                              )}
                            </ActionIcon>
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* Calorías destacadas */}
                      <Group justify="space-between" align="center">
                        <Box className="food-card-calories">
                          🔥 {Number(food.calories || 0).toFixed(0)} kcal
                        </Box>
                        <Group gap={4}>
                          <Tooltip label="Ver detalle">
                            <ActionIcon
                              color="gray"
                              onClick={() => {
                                const originalFood = paginatedFoods?.items?.find((f: any) => f.id === food.id);
                                setViewingFood(originalFood || food);
                                openFoodDetailModal();
                              }}
                              size="sm"
                              variant="subtle"
                              radius="md"
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Editar">
                            <ActionIcon
                              color="gray"
                              onClick={() => {
                                const originalFood = paginatedFoods?.items?.find((f: any) => f.id === food.id);
                                setEditingFood(originalFood || food);
                                openEditFoodModal();
                              }}
                              size="sm"
                              variant="subtle"
                              radius="md"
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Eliminar">
                            <ActionIcon
                              color="red"
                              onClick={() => handleDeleteFood(food.id, food.name)}
                              size="sm"
                              variant="subtle"
                              radius="md"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>

                      {/* Macros en grid elegante */}
                      <Box className="food-card-macros">
                        <Box className="food-card-macro protein">
                          <Text className="food-card-macro-value">{Number(food.protein || 0).toFixed(0)}g</Text>
                          <Text className="food-card-macro-label">Proteína</Text>
                        </Box>
                        <Box className="food-card-macro carbs">
                          <Text className="food-card-macro-value">{Number(food.carbs || 0).toFixed(0)}g</Text>
                          <Text className="food-card-macro-label">Carbos</Text>
                        </Box>
                        <Box className="food-card-macro fat">
                          <Text className="food-card-macro-value">{Number(food.fat || 0).toFixed(0)}g</Text>
                          <Text className="food-card-macro-label">Grasas</Text>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </SimpleGrid>

              {/* Paginación */}
              {(paginatedFoods?.totalPages || 0) > 1 && (
                <Center mt="xl">
                  <Pagination
                    boundaries={1}
                    onChange={setCurrentPage}
                    siblings={1}
                    total={paginatedFoods?.totalPages || 1}
                    value={currentPage}
                    withEdges
                  />
                </Center>
              )}
            </>
          ) : debouncedSearch ? (
            <EmptyState
              actionLabel="Limpiar búsqueda"
              description={`No se encontraron alimentos que coincidan con "${debouncedSearch}"`}
              icon={<IconSearch size={40} />}
              onAction={() => handleSearchChange("")}
              title="Sin resultados"
            />
          ) : (
            <EmptyState
              actionLabel="Añadir Alimento"
              description="Añade alimentos a tu biblioteca para usarlos en tus planes."
              icon={<IconApple size={40} />}
              onAction={openFoodModal}
              title="No hay alimentos"
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="supplements">
          <Group mb="md" gap="sm">
            <TextInput
              leftSection={<IconSearch size={14} />}
              onChange={(e) => setSearchSupplement(e.target.value)}
              placeholder="Buscar suplementos..."
              value={searchSupplement}
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
              value={supplementFilter}
              onChange={setSupplementFilter}
              size="xs"
              radius="md"
              data={[
                { label: "Todos", value: "all" },
                { label: "⭐ Favoritos", value: "favorites" },
              ]}
              styles={{
                root: {
                  backgroundColor: "var(--nv-surface)",
                  border: "1px solid var(--border-subtle)",
                }
              }}
            />
            <Button
              leftSection={<IconPill size={14} />}
              onClick={openSupplementModal}
              size="xs"
              radius="md"
              variant="light"
            >
              Añadir
            </Button>
          </Group>

          {filteredSupplements.length > 0 ? (
            <>
              <Group justify="space-between" mb="sm">
                <Text c="dimmed" size="xs">
                  {filteredSupplements.length} suplemento{filteredSupplements.length !== 1 ? 's' : ''}
                  {debouncedSupplementSearch && ` • "${debouncedSupplementSearch}"`}
                  {supplementFilter === "favorites" && " • Solo favoritos"}
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md" className="stagger">
                {filteredSupplements.map((supp: any) => (
                  <Box key={supp.id} className="food-card" style={{ borderColor: isSupplementFavorite(supp.id) ? "var(--mantine-color-violet-4)" : undefined }}>
                    {/* Header */}
                    <Box className="food-card-header">
                      <Box 
                        className="food-card-icon"
                        style={{ 
                          background: "var(--mantine-color-violet-light)",
                          color: "var(--mantine-color-violet-filled)",
                        }}
                      >
                        <IconPill size={20} />
                      </Box>
                      <Box className="food-card-info">
                        <Text className="food-card-name">{supp.name}</Text>
                        <Text className="food-card-serving">{supp.brand || supp.serving_size}</Text>
                      </Box>
                      <Box className="food-card-actions">
                        <Tooltip label={isSupplementFavorite(supp.id) ? "Quitar de favoritos" : "Añadir a favoritos"}>
                          <ActionIcon
                            color={isSupplementFavorite(supp.id) ? "yellow" : "gray"}
                            onClick={(e) => handleToggleSupplementFavorite(supp.id, e)}
                            size="sm"
                            variant="subtle"
                            radius="md"
                            loading={toggleSupplementFavorite.isPending}
                          >
                            {isSupplementFavorite(supp.id) ? (
                              <IconStarFilled size={16} />
                            ) : (
                              <IconStar size={16} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Info y acciones */}
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <Badge color="violet" variant="light" radius="xl" size="sm">
                          {supp.serving_size}
                        </Badge>
                        {supp.calories > 0 && (
                          <Box className="food-card-calories" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
                            {supp.calories} kcal
                          </Box>
                        )}
                      </Group>
                      <Group gap={4}>
                        <Tooltip label="Ver detalle">
                          <ActionIcon
                            color="gray"
                            onClick={() => {
                              setViewingSupplement(supp);
                              openSupplementDetailModal();
                            }}
                            size="sm"
                            variant="subtle"
                            radius="md"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Editar">
                          <ActionIcon
                            color="gray"
                            onClick={() => {
                              setEditingSupplement(supp);
                              openEditSupplementModal();
                            }}
                            size="sm"
                            variant="subtle"
                            radius="md"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>

                    {/* Macros si tiene */}
                    {(supp.protein > 0 || supp.carbs > 0 || supp.fat > 0) && (
                      <Box className="food-card-macros">
                        <Box className="food-card-macro protein">
                          <Text className="food-card-macro-value">{supp.protein || 0}g</Text>
                          <Text className="food-card-macro-label">Proteína</Text>
                        </Box>
                        <Box className="food-card-macro carbs">
                          <Text className="food-card-macro-value">{supp.carbs || 0}g</Text>
                          <Text className="food-card-macro-label">Carbos</Text>
                        </Box>
                        <Box className="food-card-macro fat">
                          <Text className="food-card-macro-value">{supp.fat || 0}g</Text>
                          <Text className="food-card-macro-label">Grasas</Text>
                        </Box>
                      </Box>
                    )}

                    {/* Cómo tomar */}
                    {supp.how_to_take && (
                      <Text size="xs" c="dimmed" lineClamp={2} style={{ paddingTop: "var(--space-xs)", borderTop: "1px solid var(--border-subtle)" }}>
                        <Text component="span" fw={600} c="violet">Cómo tomar:</Text> {supp.how_to_take}
                      </Text>
                    )}
                  </Box>
                ))}
              </SimpleGrid>
            </>
          ) : supplementFilter === "favorites" ? (
            <EmptyState
              actionLabel="Ver todos"
              description="No tienes suplementos marcados como favoritos."
              icon={<IconStar size={40} />}
              onAction={() => setSupplementFilter("all")}
              title="Sin favoritos"
            />
          ) : debouncedSupplementSearch ? (
            <EmptyState
              actionLabel="Limpiar búsqueda"
              description={`No se encontraron suplementos que coincidan con "${debouncedSupplementSearch}"`}
              icon={<IconSearch size={40} />}
              onAction={() => setSearchSupplement("")}
              title="Sin resultados"
            />
          ) : (
            <EmptyState
              actionLabel="Añadir Suplemento"
              description="Los suplementos se cargan desde la base de datos. Añade suplementos para verlos aquí."
              icon={<IconPill size={40} />}
              onAction={openSupplementModal}
              title="No hay suplementos"
            />
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Modal para crear alimento */}
      <Modal
        onClose={closeFoodModal}
        opened={foodModalOpened}
        size="md"
        title="Nuevo Alimento"
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={foodForm.onSubmit(handleCreateFood)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Pechuga de Pollo"
              required
              {...foodForm.getInputProps("name")}
            />

            <Group grow>
              <Select
                data={[
                  { value: "Proteínas", label: "Proteínas" },
                  { value: "Carbohidratos", label: "Carbohidratos" },
                  { value: "Verduras", label: "Verduras" },
                  { value: "Frutas", label: "Frutas" },
                  { value: "Lácteos", label: "Lácteos" },
                  { value: "Grasas", label: "Grasas" },
                  { value: "Frutos Secos", label: "Frutos Secos" },
                ]}
                label="Categoría"
                placeholder="Selecciona"
                {...foodForm.getInputProps("category")}
              />
              <TextInput
                label="Porción"
                placeholder="100g"
                {...foodForm.getInputProps("serving_size")}
              />
            </Group>

            <NumberInput
              label="Calorías"
              min={0}
              placeholder="0"
              {...foodForm.getInputProps("calories")}
            />

            <Group grow>
              <NumberInput
                decimalScale={1}
                label="Proteína (g)"
                min={0}
                placeholder="0"
                {...foodForm.getInputProps("protein")}
              />
              <NumberInput
                decimalScale={1}
                label="Carbohidratos (g)"
                min={0}
                placeholder="0"
                {...foodForm.getInputProps("carbs")}
              />
              <NumberInput
                decimalScale={1}
                label="Grasas (g)"
                min={0}
                placeholder="0"
                {...foodForm.getInputProps("fat")}
              />
            </Group>

            <Group justify="flex-end" mt="md">
              <Button onClick={closeFoodModal} variant="default">
                Cancelar
              </Button>
              <Button loading={createFood.isPending} type="submit">
                Crear Alimento
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal para editar alimento - COMPLETO */}
      <Modal
        onClose={() => {
          closeEditFoodModal();
          setEditingFood(null);
        }}
        opened={editFoodModalOpened}
        size="xl"
        title="Editar Alimento"
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        {editingFood && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            try {
              await updateFood.mutateAsync({
                id: editingFood.id,
                name: formData.get("name") as string,
                generic_name: formData.get("generic_name") as string || null,
                brand: formData.get("brand") as string || null,
                category: categoryToDb(formData.get("category") as string),
                barcode: formData.get("barcode") as string || null,
                serving_size: Number(formData.get("serving_size_num")) || 100,
                serving_unit: formData.get("serving_unit") as string || "g",
                quantity: formData.get("quantity") as string || null,
                calories: Number(formData.get("calories")) || 0,
                protein_g: Number(formData.get("protein")) || 0,
                carbs_g: Number(formData.get("carbs")) || 0,
                fat_g: Number(formData.get("fat")) || 0,
                fiber_g: Number(formData.get("fiber")) || 0,
                sugars_g: Number(formData.get("sugars")) || 0,
                saturated_fat_g: Number(formData.get("saturated_fat")) || 0,
                salt_g: Number(formData.get("salt")) || 0,
                sodium_mg: Number(formData.get("sodium")) || 0,
                ingredients_text: formData.get("ingredients") as string || null,
                allergens: formData.get("allergens") as string || null,
              });
              notifications.show({
                title: "Alimento actualizado",
                message: "El alimento se ha actualizado correctamente",
                color: "green",
              });
              closeEditFoodModal();
              setEditingFood(null);
            } catch (error) {
              notifications.show({
                title: "Error",
                message: "No se pudo actualizar el alimento",
                color: "red",
              });
            }
          }}>
            <ScrollArea h={500}>
              <Tabs defaultValue="general" radius="md">
                <Tabs.List mb="md">
                  <Tabs.Tab value="general">General</Tabs.Tab>
                  <Tabs.Tab value="nutrition">Nutrición</Tabs.Tab>
                  <Tabs.Tab value="details">Detalles</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="general">
                  <Stack gap="sm">
                    <TextInput
                      label="Nombre"
                      name="name"
                      placeholder="Pechuga de Pollo"
                      required
                      defaultValue={editingFood.name}
                    />
                    <TextInput
                      label="Nombre genérico"
                      name="generic_name"
                      placeholder="Pollo"
                      defaultValue={editingFood.generic_name || ""}
                    />
                    <Group grow>
                      <TextInput
                        label="Marca"
                        name="brand"
                        placeholder="Marca del producto"
                        defaultValue={editingFood.brand || ""}
                      />
                      <Select
                        name="category"
                        data={[
                          { value: "Proteínas", label: "Proteínas" },
                          { value: "Carbohidratos", label: "Carbohidratos" },
                          { value: "Verduras", label: "Verduras" },
                          { value: "Frutas", label: "Frutas" },
                          { value: "Lácteos", label: "Lácteos" },
                          { value: "Grasas", label: "Grasas" },
                          { value: "Frutos Secos", label: "Frutos Secos" },
                          { value: "Otros", label: "Otros" },
                        ]}
                        label="Categoría"
                        placeholder="Selecciona"
                        defaultValue={mapCategory(editingFood.category)}
                      />
                    </Group>
                    <Group grow>
                      <TextInput
                        label="Código de barras"
                        name="barcode"
                        placeholder="8400000000000"
                        defaultValue={editingFood.barcode || ""}
                      />
                      <TextInput
                        label="Cantidad/Envase"
                        name="quantity"
                        placeholder="500g, 1L, etc."
                        defaultValue={editingFood.quantity || ""}
                      />
                    </Group>
                    <Group grow>
                      <NumberInput
                        label="Tamaño porción"
                        name="serving_size_num"
                        min={0}
                        defaultValue={editingFood.serving_size || 100}
                      />
                      <Select
                        name="serving_unit"
                        data={[
                          { value: "g", label: "gramos (g)" },
                          { value: "ml", label: "mililitros (ml)" },
                          { value: "unidad", label: "unidad" },
                          { value: "porción", label: "porción" },
                        ]}
                        label="Unidad"
                        defaultValue={editingFood.serving_unit || "g"}
                      />
                    </Group>
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="nutrition">
                  <Stack gap="sm">
                    <Text fw={600} size="sm" c="dimmed">Macronutrientes principales</Text>
                    <Group grow>
                      <NumberInput
                        label="Calorías (kcal)"
                        name="calories"
                        min={0}
                        decimalScale={1}
                        defaultValue={editingFood.calories || 0}
                      />
                      <NumberInput
                        label="Proteínas (g)"
                        name="protein"
                        min={0}
                        decimalScale={2}
                        defaultValue={editingFood.protein_g || 0}
                      />
                    </Group>
                    <Group grow>
                      <NumberInput
                        label="Carbohidratos (g)"
                        name="carbs"
                        min={0}
                        decimalScale={2}
                        defaultValue={editingFood.carbs_g || 0}
                      />
                      <NumberInput
                        label="Grasas (g)"
                        name="fat"
                        min={0}
                        decimalScale={2}
                        defaultValue={editingFood.fat_g || 0}
                      />
                    </Group>

                    <Divider my="sm" />
                    <Text fw={600} size="sm" c="dimmed">Información adicional</Text>
                    
                    <Group grow>
                      <NumberInput
                        label="Fibra (g)"
                        name="fiber"
                        min={0}
                        decimalScale={2}
                        defaultValue={editingFood.fiber_g || 0}
                      />
                      <NumberInput
                        label="Azúcares (g)"
                        name="sugars"
                        min={0}
                        decimalScale={2}
                        defaultValue={editingFood.sugars_g || 0}
                      />
                    </Group>
                    <Group grow>
                      <NumberInput
                        label="Grasas saturadas (g)"
                        name="saturated_fat"
                        min={0}
                        decimalScale={2}
                        defaultValue={editingFood.saturated_fat_g || 0}
                      />
                      <NumberInput
                        label="Sal (g)"
                        name="salt"
                        min={0}
                        decimalScale={3}
                        defaultValue={editingFood.salt_g || 0}
                      />
                    </Group>
                    <NumberInput
                      label="Sodio (mg)"
                      name="sodium"
                      min={0}
                      defaultValue={editingFood.sodium_mg || 0}
                    />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="details">
                  <Stack gap="sm">
                    <Textarea
                      label="Ingredientes"
                      name="ingredients"
                      placeholder="Lista de ingredientes..."
                      minRows={3}
                      defaultValue={editingFood.ingredients_text || ""}
                    />
                    <Textarea
                      label="Alérgenos"
                      name="allergens"
                      placeholder="Gluten, Leche, Frutos secos..."
                      minRows={2}
                      defaultValue={editingFood.allergens || ""}
                    />
                    {editingFood.image_url && (
                      <Box>
                        <Text size="xs" c="dimmed" mb="xs">Imagen actual</Text>
                        <img 
                          src={editingFood.image_url} 
                          alt={editingFood.name}
                          style={{ maxHeight: 100, borderRadius: 8, objectFit: "contain" }}
                        />
                      </Box>
                    )}
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </ScrollArea>

            <Group justify="flex-end" mt="md">
              <Button 
                onClick={() => {
                  closeEditFoodModal();
                  setEditingFood(null);
                }} 
                variant="default"
              >
                Cancelar
              </Button>
              <Button loading={updateFood.isPending} type="submit">
                Guardar Cambios
              </Button>
            </Group>
          </form>
        )}
      </Modal>

      {/* Modal de detalle de alimento */}
      <Modal
        onClose={() => {
          closeFoodDetailModal();
          setViewingFood(null);
        }}
        opened={foodDetailModalOpened}
        size="xl"
        title={viewingFood?.name || "Detalle del Alimento"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        {viewingFood && (
          <ScrollArea h={500}>
            <Tabs defaultValue="general" radius="md">
              <Tabs.List mb="md">
                <Tabs.Tab value="general">General</Tabs.Tab>
                <Tabs.Tab value="macros">Macronutrientes</Tabs.Tab>
                <Tabs.Tab value="vitamins">Vitaminas</Tabs.Tab>
                <Tabs.Tab value="minerals">Minerales</Tabs.Tab>
                <Tabs.Tab value="other">Otros</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="general">
                <Stack gap="md">
                  {viewingFood.image_url && (
                    <Center>
                      <img 
                        src={viewingFood.image_url} 
                        alt={viewingFood.name}
                        style={{ maxHeight: 150, borderRadius: 8, objectFit: "contain" }}
                      />
                    </Center>
                  )}
                  <SimpleGrid cols={2}>
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Nombre</Text>
                      <Text fw={600}>{viewingFood.name}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Nombre genérico</Text>
                      <Text>{viewingFood.generic_name || "-"}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Marca</Text>
                      <Text>{viewingFood.brand || "-"}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Categoría</Text>
                      <Text>{viewingFood.category || "-"}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Código de barras</Text>
                      <Text>{viewingFood.barcode || "-"}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Porción</Text>
                      <Text>{viewingFood.serving_size} {viewingFood.serving_unit || "g"}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Cantidad</Text>
                      <Text>{viewingFood.quantity || "-"}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Envase</Text>
                      <Text>{viewingFood.packaging || "-"}</Text>
                    </Box>
                  </SimpleGrid>
                  
                  {viewingFood.ingredients_text && (
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Ingredientes</Text>
                      <Text size="sm">{viewingFood.ingredients_text}</Text>
                    </Box>
                  )}
                  
                  {(viewingFood.allergens || viewingFood.allergens_tags?.length > 0) && (
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Alérgenos</Text>
                      <Group gap="xs" mt="xs">
                        {viewingFood.allergens_tags?.map((tag: string) => (
                          <Badge key={tag} color="red" variant="light" size="sm">{tag}</Badge>
                        )) || <Text size="sm">{viewingFood.allergens}</Text>}
                      </Group>
                    </Box>
                  )}

                  {(viewingFood.traces || viewingFood.traces_tags?.length > 0) && (
                    <Box>
                      <Text size="xs" c="dimmed" fw={500}>Trazas</Text>
                      <Group gap="xs" mt="xs">
                        {viewingFood.traces_tags?.map((tag: string) => (
                          <Badge key={tag} color="orange" variant="light" size="sm">{tag}</Badge>
                        )) || <Text size="sm">{viewingFood.traces}</Text>}
                      </Group>
                    </Box>
                  )}

                  <SimpleGrid cols={3}>
                    {viewingFood.nutriscore_grade && (
                      <Box>
                        <Text size="xs" c="dimmed" fw={500}>Nutri-Score</Text>
                        <Badge 
                          color={
                            viewingFood.nutriscore_grade === 'a' ? 'green' :
                            viewingFood.nutriscore_grade === 'b' ? 'lime' :
                            viewingFood.nutriscore_grade === 'c' ? 'yellow' :
                            viewingFood.nutriscore_grade === 'd' ? 'orange' : 'red'
                          }
                          size="lg"
                        >
                          {viewingFood.nutriscore_grade?.toUpperCase()}
                        </Badge>
                      </Box>
                    )}
                    {viewingFood.nova_group && (
                      <Box>
                        <Text size="xs" c="dimmed" fw={500}>NOVA Group</Text>
                        <Badge color="blue" size="lg">{viewingFood.nova_group}</Badge>
                      </Box>
                    )}
                    {viewingFood.ecoscore_grade && (
                      <Box>
                        <Text size="xs" c="dimmed" fw={500}>Eco-Score</Text>
                        <Badge 
                          color={
                            viewingFood.ecoscore_grade === 'a' ? 'green' :
                            viewingFood.ecoscore_grade === 'b' ? 'lime' :
                            viewingFood.ecoscore_grade === 'c' ? 'yellow' :
                            viewingFood.ecoscore_grade === 'd' ? 'orange' : 'red'
                          }
                          size="lg"
                        >
                          {viewingFood.ecoscore_grade?.toUpperCase()}
                        </Badge>
                      </Box>
                    )}
                  </SimpleGrid>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="macros">
                <Stack gap="md">
                  <Text fw={600} size="lg">Información Nutricional (por {viewingFood.serving_size || 100}g)</Text>
                  <SimpleGrid cols={2}>
                    <Box className="nv-card-compact" p="sm">
                      <Text size="xs" c="dimmed">Energía</Text>
                      <Text fw={600} size="lg">{Number(viewingFood.calories || 0).toFixed(1)} kcal</Text>
                      {viewingFood.energy_kj && <Text size="xs" c="dimmed">{viewingFood.energy_kj} kJ</Text>}
                    </Box>
                    <Box className="nv-card-compact" p="sm">
                      <Text size="xs" c="dimmed">Proteínas</Text>
                      <Text fw={600} size="lg" c="green">{Number(viewingFood.protein_g || 0).toFixed(1)} g</Text>
                    </Box>
                    <Box className="nv-card-compact" p="sm">
                      <Text size="xs" c="dimmed">Carbohidratos</Text>
                      <Text fw={600} size="lg" c="orange">{Number(viewingFood.carbs_g || 0).toFixed(1)} g</Text>
                      {viewingFood.sugars_g > 0 && <Text size="xs" c="dimmed">de los cuales azúcares: {viewingFood.sugars_g}g</Text>}
                      {viewingFood.added_sugars_g > 0 && <Text size="xs" c="dimmed">azúcares añadidos: {viewingFood.added_sugars_g}g</Text>}
                      {viewingFood.starch_g > 0 && <Text size="xs" c="dimmed">almidón: {viewingFood.starch_g}g</Text>}
                    </Box>
                    <Box className="nv-card-compact" p="sm">
                      <Text size="xs" c="dimmed">Grasas</Text>
                      <Text fw={600} size="lg" c="grape">{Number(viewingFood.fat_g || 0).toFixed(1)} g</Text>
                      {viewingFood.saturated_fat_g > 0 && <Text size="xs" c="dimmed">saturadas: {viewingFood.saturated_fat_g}g</Text>}
                      {viewingFood.monounsaturated_fat_g > 0 && <Text size="xs" c="dimmed">monoinsaturadas: {viewingFood.monounsaturated_fat_g}g</Text>}
                      {viewingFood.polyunsaturated_fat_g > 0 && <Text size="xs" c="dimmed">poliinsaturadas: {viewingFood.polyunsaturated_fat_g}g</Text>}
                      {viewingFood.trans_fat_g > 0 && <Text size="xs" c="dimmed">trans: {viewingFood.trans_fat_g}g</Text>}
                    </Box>
                    <Box className="nv-card-compact" p="sm">
                      <Text size="xs" c="dimmed">Fibra</Text>
                      <Text fw={600} size="lg">{Number(viewingFood.fiber_g || 0).toFixed(1)} g</Text>
                    </Box>
                    <Box className="nv-card-compact" p="sm">
                      <Text size="xs" c="dimmed">Sal</Text>
                      <Text fw={600} size="lg">{Number(viewingFood.salt_g || 0).toFixed(2)} g</Text>
                      {viewingFood.sodium_mg > 0 && <Text size="xs" c="dimmed">sodio: {viewingFood.sodium_mg}mg</Text>}
                    </Box>
                  </SimpleGrid>
                  
                  {(viewingFood.cholesterol_mg > 0 || viewingFood.omega3_g > 0 || viewingFood.alcohol_g > 0) && (
                    <>
                      <Divider my="sm" />
                      <SimpleGrid cols={3}>
                        {viewingFood.cholesterol_mg > 0 && (
                          <Box>
                            <Text size="xs" c="dimmed">Colesterol</Text>
                            <Text fw={600}>{viewingFood.cholesterol_mg} mg</Text>
                          </Box>
                        )}
                        {viewingFood.omega3_g > 0 && (
                          <Box>
                            <Text size="xs" c="dimmed">Omega-3</Text>
                            <Text fw={600}>{viewingFood.omega3_g} g</Text>
                          </Box>
                        )}
                        {viewingFood.alcohol_g > 0 && (
                          <Box>
                            <Text size="xs" c="dimmed">Alcohol</Text>
                            <Text fw={600}>{viewingFood.alcohol_g} g</Text>
                          </Box>
                        )}
                      </SimpleGrid>
                    </>
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="vitamins">
                <Stack gap="md">
                  <Text fw={600} size="lg">Vitaminas (por {viewingFood.serving_size || 100}g)</Text>
                  <SimpleGrid cols={3}>
                    {viewingFood.vitamin_a_ug > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina A</Text>
                        <Text fw={600}>{viewingFood.vitamin_a_ug} µg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_d_ug > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina D</Text>
                        <Text fw={600}>{viewingFood.vitamin_d_ug} µg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_e_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina E</Text>
                        <Text fw={600}>{viewingFood.vitamin_e_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_k_ug > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina K</Text>
                        <Text fw={600}>{viewingFood.vitamin_k_ug} µg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_c_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina C</Text>
                        <Text fw={600}>{viewingFood.vitamin_c_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_b1_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina B1 (Tiamina)</Text>
                        <Text fw={600}>{viewingFood.vitamin_b1_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_b2_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina B2 (Riboflavina)</Text>
                        <Text fw={600}>{viewingFood.vitamin_b2_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_b6_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina B6</Text>
                        <Text fw={600}>{viewingFood.vitamin_b6_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_b9_ug > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina B9 (Ácido Fólico)</Text>
                        <Text fw={600}>{viewingFood.vitamin_b9_ug} µg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_b12_ug > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina B12</Text>
                        <Text fw={600}>{viewingFood.vitamin_b12_ug} µg</Text>
                      </Box>
                    )}
                    {viewingFood.vitamin_pp_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Vitamina PP (Niacina)</Text>
                        <Text fw={600}>{viewingFood.vitamin_pp_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.pantothenic_acid_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Ácido Pantoténico</Text>
                        <Text fw={600}>{viewingFood.pantothenic_acid_mg} mg</Text>
                      </Box>
                    )}
                  </SimpleGrid>
                  {!viewingFood.vitamin_a_ug && !viewingFood.vitamin_c_mg && !viewingFood.vitamin_d_ug && (
                    <Text c="dimmed" ta="center">No hay información de vitaminas disponible</Text>
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="minerals">
                <Stack gap="md">
                  <Text fw={600} size="lg">Minerales (por {viewingFood.serving_size || 100}g)</Text>
                  <SimpleGrid cols={3}>
                    {viewingFood.calcium_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Calcio</Text>
                        <Text fw={600}>{viewingFood.calcium_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.iron_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Hierro</Text>
                        <Text fw={600}>{viewingFood.iron_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.magnesium_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Magnesio</Text>
                        <Text fw={600}>{viewingFood.magnesium_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.phosphorus_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Fósforo</Text>
                        <Text fw={600}>{viewingFood.phosphorus_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.potassium_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Potasio</Text>
                        <Text fw={600}>{viewingFood.potassium_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.zinc_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Zinc</Text>
                        <Text fw={600}>{viewingFood.zinc_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.copper_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Cobre</Text>
                        <Text fw={600}>{viewingFood.copper_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.manganese_mg > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Manganeso</Text>
                        <Text fw={600}>{viewingFood.manganese_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.selenium_ug > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Selenio</Text>
                        <Text fw={600}>{viewingFood.selenium_ug} µg</Text>
                      </Box>
                    )}
                    {viewingFood.iodine_ug > 0 && (
                      <Box className="nv-card-compact" p="sm">
                        <Text size="xs" c="dimmed">Yodo</Text>
                        <Text fw={600}>{viewingFood.iodine_ug} µg</Text>
                      </Box>
                    )}
                  </SimpleGrid>
                  {!viewingFood.calcium_mg && !viewingFood.iron_mg && !viewingFood.magnesium_mg && (
                    <Text c="dimmed" ta="center">No hay información de minerales disponible</Text>
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="other">
                <Stack gap="md">
                  <Text fw={600} size="lg">Información Adicional</Text>
                  <SimpleGrid cols={2}>
                    {viewingFood.caffeine_mg > 0 && (
                      <Box>
                        <Text size="xs" c="dimmed">Cafeína</Text>
                        <Text fw={600}>{viewingFood.caffeine_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.choline_mg > 0 && (
                      <Box>
                        <Text size="xs" c="dimmed">Colina</Text>
                        <Text fw={600}>{viewingFood.choline_mg} mg</Text>
                      </Box>
                    )}
                    {viewingFood.polyols_g > 0 && (
                      <Box>
                        <Text size="xs" c="dimmed">Polialcoholes</Text>
                        <Text fw={600}>{viewingFood.polyols_g} g</Text>
                      </Box>
                    )}
                  </SimpleGrid>

                  <Divider my="sm" />
                  
                  <SimpleGrid cols={2}>
                    {viewingFood.labels && (
                      <Box>
                        <Text size="xs" c="dimmed">Etiquetas</Text>
                        <Text size="sm">{viewingFood.labels}</Text>
                      </Box>
                    )}
                    {viewingFood.origins && (
                      <Box>
                        <Text size="xs" c="dimmed">Origen</Text>
                        <Text size="sm">{viewingFood.origins}</Text>
                      </Box>
                    )}
                    {viewingFood.manufacturing_places && (
                      <Box>
                        <Text size="xs" c="dimmed">Lugar de fabricación</Text>
                        <Text size="sm">{viewingFood.manufacturing_places}</Text>
                      </Box>
                    )}
                    {viewingFood.food_groups && (
                      <Box>
                        <Text size="xs" c="dimmed">Grupo alimenticio</Text>
                        <Text size="sm">{viewingFood.food_groups}</Text>
                      </Box>
                    )}
                    {viewingFood.source_supermarket && (
                      <Box>
                        <Text size="xs" c="dimmed">Supermercado</Text>
                        <Text size="sm">{viewingFood.source_supermarket}</Text>
                      </Box>
                    )}
                    {viewingFood.data_source && (
                      <Box>
                        <Text size="xs" c="dimmed">Fuente de datos</Text>
                        <Text size="sm">{viewingFood.data_source}</Text>
                      </Box>
                    )}
                  </SimpleGrid>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </ScrollArea>
        )}
      </Modal>

      {/* Modal de detalle de suplemento */}
      <Modal
        onClose={() => {
          closeSupplementDetailModal();
          setViewingSupplement(null);
        }}
        opened={supplementDetailModalOpened}
        size="lg"
        title={viewingSupplement?.name || "Detalle del Suplemento"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        {viewingSupplement && (
          <ScrollArea h={400}>
            <Stack gap="md">
              <SimpleGrid cols={2}>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Nombre</Text>
                  <Text fw={600}>{viewingSupplement.name}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Marca</Text>
                  <Text>{viewingSupplement.brand || "-"}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Categoría</Text>
                  <Text>{viewingSupplement.category || "-"}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Porción</Text>
                  <Text>{viewingSupplement.serving_size} {viewingSupplement.serving_unit || ""}</Text>
                </Box>
              </SimpleGrid>

              {viewingSupplement.description && (
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Descripción</Text>
                  <Text size="sm">{viewingSupplement.description}</Text>
                </Box>
              )}

              <Divider />

              <Text fw={600}>Información Nutricional</Text>
              <SimpleGrid cols={4}>
                <Box className="nv-card-compact" p="sm">
                  <Text size="xs" c="dimmed">Calorías</Text>
                  <Text fw={600}>{viewingSupplement.calories || 0} kcal</Text>
                </Box>
                <Box className="nv-card-compact" p="sm">
                  <Text size="xs" c="dimmed">Proteínas</Text>
                  <Text fw={600} c="green">{viewingSupplement.protein || 0} g</Text>
                </Box>
                <Box className="nv-card-compact" p="sm">
                  <Text size="xs" c="dimmed">Carbohidratos</Text>
                  <Text fw={600} c="orange">{viewingSupplement.carbs || 0} g</Text>
                </Box>
                <Box className="nv-card-compact" p="sm">
                  <Text size="xs" c="dimmed">Grasas</Text>
                  <Text fw={600} c="grape">{viewingSupplement.fat || 0} g</Text>
                </Box>
              </SimpleGrid>

              {viewingSupplement.usage_instructions && (
                <>
                  <Divider />
                  <Box>
                    <Text size="xs" c="dimmed" fw={500}>Instrucciones de uso</Text>
                    <Text size="sm">{viewingSupplement.usage_instructions}</Text>
                  </Box>
                </>
              )}

              {viewingSupplement.warnings && (
                <Box>
                  <Text size="xs" c="dimmed" fw={500}>Advertencias</Text>
                  <Text size="sm" c="red">{viewingSupplement.warnings}</Text>
                </Box>
              )}
            </Stack>
          </ScrollArea>
        )}
      </Modal>

      {/* Drawer para el constructor de planes */}
      <Drawer
        onClose={handleCloseBuilder}
        opened={builderOpened}
        position="right"
        size="xl"
        title={
          clientId && clientData ? (
            <Box>
              <Text fw={600}>Editar Plan de {clientData.first_name} {clientData.last_name}</Text>
              <Badge color="blue" size="sm" variant="light">Plan individual del cliente</Badge>
            </Box>
          ) : editingPlan ? "Editar Plan Nutricional" : "Nuevo Plan Nutricional"
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
                  label="Nombre del plan"
                  placeholder="Plan de Pérdida de Peso"
                  required
                  {...planForm.getInputProps("name")}
                />

                <Textarea
                  label="Descripción"
                  minRows={2}
                  placeholder="Describe el plan..."
                  {...planForm.getInputProps("description")}
                />

                <Group grow>
                  <NumberInput
                    label="Duración (días)"
                    max={30}
                    min={1}
                    {...planForm.getInputProps("duration_days")}
                  />
                  <NumberInput
                    label="Calorías objetivo"
                    max={5000}
                    min={1000}
                    step={50}
                    {...planForm.getInputProps("target_calories")}
                  />
                </Group>

                <Group grow>
                  <NumberInput
                    label="Proteína (g)"
                    max={500}
                    min={0}
                    {...planForm.getInputProps("target_protein")}
                  />
                  <NumberInput
                    label="Carbohidratos (g)"
                    max={500}
                    min={0}
                    {...planForm.getInputProps("target_carbs")}
                  />
                  <NumberInput
                    label="Grasas (g)"
                    max={300}
                    min={0}
                    {...planForm.getInputProps("target_fat")}
                  />
                </Group>
              </Stack>
            </Box>

            <Divider label="Constructor de Plan" labelPosition="center" style={{ borderColor: "var(--nv-border)" }} />

            <MealPlanBuilder
              availableFoods={foods}
              availableSupplements={supplements}
              days={mealPlanDays}
              onChange={setMealPlanDays}
              targetCalories={planForm.values.target_calories}
              targetCarbs={planForm.values.target_carbs}
              targetFat={planForm.values.target_fat}
              targetProtein={planForm.values.target_protein}
              foodFavorites={foodFavorites}
              supplementFavorites={supplementFavorites}
              onToggleFoodFavorite={(foodId, isFavorite) => 
                toggleFoodFavorite.mutate({ foodId, isFavorite })
              }
              onToggleSupplementFavorite={(supplementId, isFavorite) => 
                toggleSupplementFavorite.mutate({ supplementId, isFavorite })
              }
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
            loading={createMealPlan.isPending || updateMealPlan.isPending}
            onClick={handleSavePlan}
            radius="xl"
            style={{ backgroundColor: "var(--nv-success)" }}
          >
            {editingPlan ? "Guardar Cambios" : "Crear Plan"}
          </Button>
        </Group>
      </Drawer>

      {/* Modal para crear suplemento */}
      <Modal
        onClose={closeSupplementModal}
        opened={supplementModalOpened}
        size="md"
        title="Nuevo Suplemento"
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          try {
            await createSupplement.mutateAsync({
              name: formData.get("name") as string,
              brand: formData.get("brand") as string || undefined,
              category: formData.get("category") as string || "general",
              serving_size: Number(formData.get("serving_size")) || 30,
              serving_unit: formData.get("serving_unit") as string || "g",
              calories: Number(formData.get("calories")) || 0,
              protein: Number(formData.get("protein")) || 0,
              carbs: Number(formData.get("carbs")) || 0,
              fat: Number(formData.get("fat")) || 0,
              usage_instructions: formData.get("usage_instructions") as string || undefined,
            });
            notifications.show({
              title: "Suplemento creado",
              message: "El suplemento se ha creado correctamente",
              color: "green",
            });
            closeSupplementModal();
          } catch (error) {
            notifications.show({
              title: "Error",
              message: "No se pudo crear el suplemento",
              color: "red",
            });
          }
        }}>
          <Stack>
            <TextInput
              label="Nombre"
              name="name"
              placeholder="Proteína Whey"
              required
            />

            <Group grow>
              <TextInput
                label="Marca"
                name="brand"
                placeholder="Optimum Nutrition"
              />
              <Select
                name="category"
                data={[
                  { value: "protein", label: "Proteína" },
                  { value: "creatine", label: "Creatina" },
                  { value: "pre_workout", label: "Pre-entreno" },
                  { value: "vitamins", label: "Vitaminas" },
                  { value: "minerals", label: "Minerales" },
                  { value: "amino_acids", label: "Aminoácidos" },
                  { value: "fat_burner", label: "Quemador de grasa" },
                  { value: "general", label: "General" },
                ]}
                label="Categoría"
                placeholder="Selecciona"
                defaultValue="general"
              />
            </Group>

            <Group grow>
              <NumberInput
                label="Porción"
                name="serving_size"
                min={1}
                defaultValue={30}
              />
              <Select
                name="serving_unit"
                data={[
                  { value: "g", label: "gramos" },
                  { value: "ml", label: "ml" },
                  { value: "caps", label: "cápsulas" },
                  { value: "tabs", label: "tabletas" },
                  { value: "scoop", label: "scoop" },
                ]}
                label="Unidad"
                defaultValue="g"
              />
            </Group>

            <NumberInput
              label="Calorías"
              name="calories"
              min={0}
              defaultValue={0}
            />

            <Group grow>
              <NumberInput
                label="Proteína (g)"
                name="protein"
                min={0}
                decimalScale={1}
                defaultValue={0}
              />
              <NumberInput
                label="Carbohidratos (g)"
                name="carbs"
                min={0}
                decimalScale={1}
                defaultValue={0}
              />
              <NumberInput
                label="Grasas (g)"
                name="fat"
                min={0}
                decimalScale={1}
                defaultValue={0}
              />
            </Group>

            <Textarea
              label="Cómo tomar"
              name="usage_instructions"
              placeholder="Mezclar 1 scoop con 200ml de agua..."
              minRows={2}
            />

            <Group justify="flex-end" mt="md">
              <Button onClick={closeSupplementModal} variant="default">
                Cancelar
              </Button>
              <Button loading={createSupplement.isPending} type="submit">
                Crear Suplemento
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal para editar suplemento */}
      <Modal
        onClose={() => {
          closeEditSupplementModal();
          setEditingSupplement(null);
        }}
        opened={editSupplementModalOpened}
        size="md"
        title="Editar Suplemento"
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        {editingSupplement && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            try {
              await updateSupplement.mutateAsync({
                id: editingSupplement.id,
                name: formData.get("name") as string,
                brand: formData.get("brand") as string || undefined,
                category: formData.get("category") as string || "general",
                serving_size: Number(formData.get("serving_size")) || 30,
                serving_unit: formData.get("serving_unit") as string || "g",
                calories: Number(formData.get("calories")) || 0,
                protein: Number(formData.get("protein")) || 0,
                carbs: Number(formData.get("carbs")) || 0,
                fat: Number(formData.get("fat")) || 0,
                usage_instructions: formData.get("usage_instructions") as string || undefined,
              });
              notifications.show({
                title: "Suplemento actualizado",
                message: "El suplemento se ha actualizado correctamente",
                color: "green",
              });
              closeEditSupplementModal();
              setEditingSupplement(null);
            } catch (error) {
              notifications.show({
                title: "Error",
                message: "No se pudo actualizar el suplemento",
                color: "red",
              });
            }
          }}>
            <Stack>
              <TextInput
                label="Nombre"
                name="name"
                placeholder="Proteína Whey"
                required
                defaultValue={editingSupplement.name}
              />

              <Group grow>
                <TextInput
                  label="Marca"
                  name="brand"
                  placeholder="Optimum Nutrition"
                  defaultValue={editingSupplement.brand || ""}
                />
                <Select
                  name="category"
                  data={[
                    { value: "protein", label: "Proteína" },
                    { value: "creatine", label: "Creatina" },
                    { value: "pre_workout", label: "Pre-entreno" },
                    { value: "vitamins", label: "Vitaminas" },
                    { value: "minerals", label: "Minerales" },
                    { value: "amino_acids", label: "Aminoácidos" },
                    { value: "fat_burner", label: "Quemador de grasa" },
                    { value: "general", label: "General" },
                  ]}
                  label="Categoría"
                  defaultValue={editingSupplement.category || "general"}
                />
              </Group>

              <Group grow>
                <NumberInput
                  label="Porción"
                  name="serving_size"
                  min={1}
                  defaultValue={editingSupplement.serving_size || 30}
                />
                <Select
                  name="serving_unit"
                  data={[
                    { value: "g", label: "gramos" },
                    { value: "ml", label: "ml" },
                    { value: "caps", label: "cápsulas" },
                    { value: "tabs", label: "tabletas" },
                    { value: "scoop", label: "scoop" },
                  ]}
                  label="Unidad"
                  defaultValue={editingSupplement.serving_unit || "g"}
                />
              </Group>

              <NumberInput
                label="Calorías"
                name="calories"
                min={0}
                defaultValue={editingSupplement.calories || 0}
              />

              <Group grow>
                <NumberInput
                  label="Proteína (g)"
                  name="protein"
                  min={0}
                  decimalScale={1}
                  defaultValue={editingSupplement.protein || 0}
                />
                <NumberInput
                  label="Carbohidratos (g)"
                  name="carbs"
                  min={0}
                  decimalScale={1}
                  defaultValue={editingSupplement.carbs || 0}
                />
                <NumberInput
                  label="Grasas (g)"
                  name="fat"
                  min={0}
                  decimalScale={1}
                  defaultValue={editingSupplement.fat || 0}
                />
              </Group>

              <Textarea
                label="Cómo tomar"
                name="usage_instructions"
                placeholder="Mezclar 1 scoop con 200ml de agua..."
                minRows={2}
                defaultValue={editingSupplement.how_to_take || ""}
              />

              <Group justify="flex-end" mt="md">
                <Button 
                  onClick={() => {
                    closeEditSupplementModal();
                    setEditingSupplement(null);
                  }} 
                  variant="default"
                >
                  Cancelar
                </Button>
                <Button loading={updateSupplement.isPending} type="submit">
                  Guardar Cambios
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Container>
  );
}

export default NutritionPage;
