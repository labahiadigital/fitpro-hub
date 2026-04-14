import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Loader,
  Divider,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue, useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconApple,
  IconBread,
  IconCheck,
  IconEgg,
  IconMeat,
  IconMilk,
  IconPill,
  IconSalad,
  IconSearch,
  IconTemplate,
  IconToolsKitchen2,
  IconUser,
  IconUsers,
  IconGlass,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClient, useClients } from "../../hooks/useClients";
import { PageHeader } from "../../components/common/PageHeader";
import { clientsApi } from "../../services/api";
import { calculateBMR, calculateTDEE, gramsFromPercentages } from "../../utils/calories";
import {
  type DayPlan,
  type Food,
  type Meal,
  MealPlanBuilder,
} from "../../components/nutrition/MealPlanBuilder";
import { BottomSheet } from "../../components/common/BottomSheet";
import { PlanEditorLayout } from "../../components/common/PlanEditorLayout";
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
  useFoodGroups,
  useCreateFoodGroup,
  useUpdateFoodGroup,
  useDeleteFoodGroup,
} from "../../hooks/useSupabaseData";
import {
  useFoodFavorites,
  useToggleFoodFavorite,
  useSupplementFavorites,
  useToggleSupplementFavorite,
} from "../../hooks/useFavorites";
import {
  useRecipes,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useDuplicateRecipe,
} from "../../hooks/useRecipes";
import { RecipeFormModal } from "../../components/recipes/RecipeFormModal";
import { RecipeDetailModal } from "../../components/recipes/RecipeDetailModal";
import type { Recipe } from "../../types/recipe";
import { formatDecimal } from "../../utils/format";

import { NutritionTemplatesTab } from "./components/NutritionTemplatesTab";
import { ClientPlansTab } from "./components/ClientPlansTab";
import { RecipesTab } from "./components/RecipesTab";
import { FoodsTab } from "./components/FoodsTab";
import { SupplementsTab } from "./components/SupplementsTab";
import { BeveragesTab } from "./components/BeveragesTab";
import { RectificationButton } from "../../components/common/RectificationButton";

function mapCategory(dbCategory: string | null): string {
  if (!dbCategory) return "Otros";
  const cat = dbCategory.toLowerCase();
  if (cat.includes("carne") || cat.includes("pollo") || cat.includes("pescado") || cat.includes("huevo") || cat.includes("protein")) return "Proteínas";
  if (cat.includes("arroz") || cat.includes("pasta") || cat.includes("pan") || cat.includes("cereal") || cat.includes("patata") || cat.includes("carbohidrat")) return "Carbohidratos";
  if (cat.includes("verdura") || cat.includes("vegetal") || cat.includes("ensalada") || cat.includes("hortaliza")) return "Verduras";
  if (cat.includes("fruta") || cat.includes("fruit")) return "Frutas";
  if (cat.includes("leche") || cat.includes("queso") || cat.includes("yogur") || cat.includes("lácteo") || cat.includes("dairy")) return "Lácteos";
  if (cat.includes("aceite") || cat.includes("grasa") || cat.includes("mantequilla") || cat.includes("oil")) return "Grasas";
  if (cat.includes("fruto seco") || cat.includes("almendra") || cat.includes("nuez") || cat.includes("nut")) return "Frutos Secos";
  return "Otros";
}

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

function extractWeeksFromPlan(plan: { weeks?: { week: number; days: DayPlan[] }[]; days?: DayPlan[] } | null | undefined): { week: number; days: DayPlan[] }[] {
  if (!plan) return [{ week: 1, days: [...initialDays] }];
  if (plan.weeks && plan.weeks.length > 0) return plan.weeks;
  if (plan.days && plan.days.length > 0) return [{ week: 1, days: plan.days }];
  return [{ week: 1, days: [...initialDays] }];
}

function getDurationWeeks(plan: any): number {
  if (plan.duration_weeks && plan.duration_weeks > 0) return plan.duration_weeks;
  if (plan.duration_days) return Math.max(1, Math.ceil(plan.duration_days / 7));
  return 1;
}

const FOODS_PER_PAGE = 50;

function calculateAge(birthDate: string | null | undefined): number {
  if (!birthDate) return 30;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(1, age);
}

function FoodGroupsPanel() {
  const [fgSearch, setFgSearch] = useState("");
  const [fgCategoryFilter, setFgCategoryFilter] = useState("");
  const { data: foodGroups = [], isLoading } = useFoodGroups(fgSearch || undefined, fgCategoryFilter || undefined);
  const createFoodGroup = useCreateFoodGroup();
  const updateFoodGroup = useUpdateFoodGroup();
  const deleteFoodGroup = useDeleteFoodGroup();
  const [editingFg, setEditingFg] = useState<any>(null);
  const [fgModalOpened, { open: openFgModal, close: closeFgModal }] = useDisclosure(false);

  const fgCategoryOptions = useMemo(() => {
    const cats = new Set<string>(foodGroups.map((fg: any) => fg.name as string).filter(Boolean));
    return [{ value: "", label: "Todas las categorías" }, ...Array.from(cats).sort().map((c: string) => ({ value: c, label: c }))];
  }, [foodGroups]);

  const fgForm = useForm({
    initialValues: { name: "", subcategory: "", quantity: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    validate: { name: (v) => (v.length < 2 ? "Nombre requerido" : null) },
  });

  const handleSaveFg = async (values: typeof fgForm.values) => {
    if (editingFg) {
      await updateFoodGroup.mutateAsync({ id: editingFg.id, data: values });
      notifications.show({ title: "Grupo actualizado", message: values.name, color: "green" });
    } else {
      await createFoodGroup.mutateAsync(values);
      notifications.show({ title: "Grupo creado", message: values.name, color: "green" });
    }
    closeFgModal();
    fgForm.reset();
    setEditingFg(null);
  };

  const openEditFg = (fg: any) => {
    setEditingFg(fg);
    fgForm.setValues({
      name: fg.name || "",
      subcategory: fg.subcategory || "",
      quantity: fg.quantity || "",
      calories: fg.calories || 0,
      protein_g: fg.protein_g || 0,
      carbs_g: fg.carbs_g || 0,
      fat_g: fg.fat_g || 0,
      fiber_g: fg.fiber_g || 0,
    });
    openFgModal();
  };

  return (
    <Stack gap="md">
      <Group gap="sm">
        <TextInput
          leftSection={<IconSearch size={14} />}
          placeholder="Buscar grupo de alimentos..."
          value={fgSearch}
          onChange={(e) => setFgSearch(e.target.value)}
          radius="md"
          size="sm"
          style={{ flex: 1 }}
          styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        <Select
          value={fgCategoryFilter}
          onChange={(v) => setFgCategoryFilter(v || "")}
          data={fgCategoryOptions}
          size="xs"
          radius="md"
          w={200}
          placeholder="Categoría"
          clearable
          styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        <Button size="xs" radius="md" onClick={() => { setEditingFg(null); fgForm.reset(); openFgModal(); }}>
          Nuevo Grupo
        </Button>
      </Group>

      {isLoading ? (
        <Center py="xl"><Loader size="sm" /></Center>
      ) : foodGroups.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="sm">
          {foodGroups.map((fg: any) => (
            <Box key={fg.id} className="nv-card-compact" p="sm" style={{ cursor: "pointer" }} onClick={() => openEditFg(fg)}>
              <Group justify="space-between" mb={4}>
                <Text fw={600} size="sm" lineClamp={1}>{fg.subcategory || fg.name}</Text>
                <Group gap={4}>
                  <Badge size="xs" variant="light" color="yellow">{fg.name}</Badge>
                  <RectificationButton entityType="food_group" entityId={fg.id} entityName={fg.subcategory || fg.name} size="xs" />
                </Group>
              </Group>
              <Group gap={4}>
                <Badge size="xs" variant="light" color="gray">100g</Badge>
                <Badge size="xs" variant="light" color="blue">{Math.round(fg.calories || 0)} kcal</Badge>
                <Badge size="xs" variant="light" color="green">P:{Math.round(fg.protein_g || 0)}g</Badge>
                <Badge size="xs" variant="light" color="orange">C:{Math.round(fg.carbs_g || 0)}g</Badge>
                <Badge size="xs" variant="light" color="grape">G:{Math.round(fg.fat_g || 0)}g</Badge>
              </Group>
              {fg.quantity && <Text size="xs" c="dimmed" mt={4}>Aprox. una ración de este producto son {fg.quantity}</Text>}
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed" ta="center" py="md">No se encontraron grupos de alimentos</Text>
      )}

      <BottomSheet opened={fgModalOpened} onClose={() => { closeFgModal(); setEditingFg(null); fgForm.reset(); }} title={editingFg ? "Editar Grupo" : "Nuevo Grupo"} desktopSize="md">
        <form onSubmit={fgForm.onSubmit(handleSaveFg)}>
          <Stack>
            <TextInput label="Nombre" placeholder="Legumbres" required {...fgForm.getInputProps("name")} />
            <TextInput label="Subcategoría" placeholder="Opcional" {...fgForm.getInputProps("subcategory")} />
            <TextInput label="Cantidad de referencia" placeholder="100g, 1 unidad..." {...fgForm.getInputProps("quantity")} />
            <Group grow>
              <NumberInput label="Calorías" min={0} {...fgForm.getInputProps("calories")} />
              <NumberInput label="Proteína (g)" min={0} decimalScale={1} {...fgForm.getInputProps("protein_g")} />
            </Group>
            <Group grow>
              <NumberInput label="Carbohidratos (g)" min={0} decimalScale={1} {...fgForm.getInputProps("carbs_g")} />
              <NumberInput label="Grasas (g)" min={0} decimalScale={1} {...fgForm.getInputProps("fat_g")} />
            </Group>
            <NumberInput label="Fibra (g)" min={0} decimalScale={1} {...fgForm.getInputProps("fiber_g")} />
            <Group justify="space-between" mt="md">
              {editingFg && (
                <Button color="red" variant="subtle" onClick={async () => { await deleteFoodGroup.mutateAsync(editingFg.id); closeFgModal(); setEditingFg(null); fgForm.reset(); }} loading={deleteFoodGroup.isPending}>Eliminar</Button>
              )}
              <Group ml="auto">
                <Button onClick={() => { closeFgModal(); setEditingFg(null); fgForm.reset(); }} variant="default">Cancelar</Button>
                <Button type="submit" loading={createFoodGroup.isPending || updateFoodGroup.isPending}>{editingFg ? "Guardar" : "Crear"}</Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Stack>
  );
}

export function NutritionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editPlanId = searchParams.get("edit");
  const clientId = searchParams.get("clientId");
  const returnTo = searchParams.get("returnTo");

  const { data: clientData } = useClient(clientId || "");
  const { data: clientsData } = useClients({ page: 1, search: "", page_size: 100 });
  const clientsMap = useMemo(() => {
    const map = new Map<string, string>();
    (clientsData?.items || []).forEach((c: { id: string; first_name?: string; last_name?: string }) => {
      map.set(c.id, `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sin nombre");
    });
    return map;
  }, [clientsData]);

  const clientOptions = (clientsData?.items || []).map((c: { id: string; first_name?: string; last_name?: string }) => ({
    value: c.id,
    label: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sin nombre",
  }));

  const goBack = useCallback(() => {
    if (returnTo) navigate(returnTo);
    else if (clientId) navigate(`/clients/${clientId}`);
  }, [navigate, returnTo, clientId]);

  const [activeTab, setActiveTab] = useState<string | null>("templates");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [editFoodTab, setEditFoodTab] = useState<string | null>("general");
  const [foodDetailTab, setFoodDetailTab] = useState<string | null>("general");
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] = useDisclosure(false);
  const [builderOpened, { open: openBuilder, close: closeBuilder }] = useDisclosure(false);
  const [searchFood, setSearchFood] = useState("");
  const [searchSupplement, setSearchSupplement] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchFood, 300);
  const [debouncedSupplementSearch] = useDebouncedValue(searchSupplement, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [mealPlanWeeks, setMealPlanWeeks] = useState<{ week: number; days: DayPlan[] }[]>([{ week: 1, days: [...initialDays] }]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const mealPlanDays = useMemo(() => {
    const wk = mealPlanWeeks.find((w) => w.week === currentWeek);
    return wk ? wk.days : initialDays;
  }, [mealPlanWeeks, currentWeek]);
  const setMealPlanDays = useCallback((days: DayPlan[]) => {
    setMealPlanWeeks((prev) => prev.map((w) => w.week === currentWeek ? { ...w, days } : w));
  }, [currentWeek]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [foodFilter, setFoodFilter] = useState<string>("all");
  const [foodSourceFilter, setFoodSourceFilter] = useState<string>("all");
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>("");
  const [supplementFilter, setSupplementFilter] = useState<string>("all");
  const [supplementSourceFilter, setSupplementSourceFilter] = useState<string>("all");
  const [editingFood, setEditingFood] = useState<any>(null);
  const [editFoodModalOpened, { open: openEditFoodModal, close: closeEditFoodModal }] = useDisclosure(false);
  const [editingSupplement, setEditingSupplement] = useState<any>(null);
  const [editSupplementModalOpened, { open: openEditSupplementModal, close: closeEditSupplementModal }] = useDisclosure(false);
  const [supplementModalOpened, { open: openSupplementModal, close: closeSupplementModal }] = useDisclosure(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isTemplateModeOn, setIsTemplateModeOn] = useState(false);

  const [recipeModalOpened, { open: openRecipeModal, close: closeRecipeModal }] = useDisclosure(false);
  const [recipeDetailOpened, { open: openRecipeDetail, close: closeRecipeDetail }] = useDisclosure(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [debouncedRecipeSearch] = useDebouncedValue(recipeSearch, 300);
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState<string>("");
  const [recipeDifficultyFilter, setRecipeDifficultyFilter] = useState<string>("");
  const recipeFilters = useMemo(() => ({
    search: debouncedRecipeSearch || undefined,
    category: recipeCategoryFilter || undefined,
    difficulty: recipeDifficultyFilter || undefined,
  }), [debouncedRecipeSearch, recipeCategoryFilter, recipeDifficultyFilter]);
  const { data: recipes = [], isLoading: isLoadingRecipes } = useRecipes(recipeFilters);
  const createRecipeMutation = useCreateRecipe();
  const updateRecipeMutation = useUpdateRecipe();
  const deleteRecipeMutation = useDeleteRecipe();
  const duplicateRecipeMutation = useDuplicateRecipe();

  const [viewingFood, setViewingFood] = useState<any>(null);
  const [foodDetailModalOpened, { open: openFoodDetailModal, close: closeFoodDetailModal }] = useDisclosure(false);
  const [viewingSupplement, setViewingSupplement] = useState<any>(null);
  const [supplementDetailModalOpened, { open: openSupplementDetailModal, close: closeSupplementDetailModal }] = useDisclosure(false);

  useEffect(() => { setEditFoodTab("general"); }, [editingFood?.id]);
  useEffect(() => { setFoodDetailTab("general"); }, [viewingFood?.id]);

  const { data: supabaseFoods } = useSupabaseFoods(builderOpened);
  const { data: paginatedFoods, isLoading: isLoadingPaginatedFoods, isFetching: isFetchingFoods } = useSupabaseFoodsPaginated(currentPage, FOODS_PER_PAGE, debouncedSearch, foodCategoryFilter);
  const { data: totalFoodsCount } = useSupabaseFoodsCount();
  const { data: supabaseMealPlans, isLoading: isLoadingPlans } = useSupabaseMealPlans(clientId ? {} : {});
  const { data: specificClientPlan } = useSupabaseMealPlan(editPlanId && clientId ? editPlanId : "");
  const { data: supabaseSupplements } = useSupplements();

  const { data: foodFavorites = [] } = useFoodFavorites();
  const toggleFoodFavorite = useToggleFoodFavorite();
  const { data: supplementFavorites = [] } = useSupplementFavorites();
  const toggleSupplementFavorite = useToggleSupplementFavorite();

  const handleToggleFoodFavoriteForBuilder = useCallback((foodId: string, isFavorite: boolean) => {
    toggleFoodFavorite.mutate({ foodId, isFavorite });
  }, [toggleFoodFavorite]);

  const handleToggleSupplementFavoriteForBuilder = useCallback((supplementId: string, isFavorite: boolean) => {
    toggleSupplementFavorite.mutate({ supplementId, isFavorite });
  }, [toggleSupplementFavorite]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchFood(value);
    setCurrentPage(1);
  }, []);

  const createMealPlan = useCreateMealPlan();
  const updateMealPlan = useUpdateMealPlan();
  const deleteMealPlan = useDeleteMealPlan();
  const createFood = useCreateFood();
  const updateFood = useUpdateFood();
  const deleteFood = useDeleteFood();
  const createSupplement = useCreateSupplement();
  const updateSupplement = useUpdateSupplement();
  void useDeleteSupplement;

  const foods: Food[] = useMemo(() => {
    if (!supabaseFoods) return [];
    return supabaseFoods.map((food: any) => ({
      id: food.id, name: food.name || "Sin nombre", calories: food.calories || 0,
      protein: food.protein_g || 0, carbs: food.carbs_g || 0, fat: food.fat_g || 0,
      serving_size: food.quantity || "100g", category: mapCategory(food.category),
    }));
  }, [supabaseFoods]);

  const supplements = useMemo(() => {
    if (!supabaseSupplements) return [];
    return supabaseSupplements.map((supp: any) => ({
      id: supp.id, name: supp.name, brand: supp.brand, calories: supp.calories || 0,
      protein: supp.protein || 0, carbs: supp.carbs || 0, fat: supp.fat || 0,
      serving_size: supp.serving_size || "30g", how_to_take: supp.usage_instructions,
      timing: supp.extra_data?.timing, is_global: supp.is_global ?? false,
    }));
  }, [supabaseSupplements]);

  const foodFavoritesSet = useMemo(() => new Set<string>(Array.isArray(foodFavorites) ? foodFavorites as string[] : []), [foodFavorites]);
  const supplementFavoritesSet = useMemo(() => new Set<string>(Array.isArray(supplementFavorites) ? supplementFavorites as string[] : []), [supplementFavorites]);

  const isFoodFavorite = useCallback((foodId: string) => foodFavoritesSet.has(foodId), [foodFavoritesSet]);
  const isSupplementFavorite = useCallback((supplementId: string) => supplementFavoritesSet.has(supplementId), [supplementFavoritesSet]);

  const handleToggleFoodFavorite = async (foodId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isFav = isFoodFavorite(foodId);
    try {
      await toggleFoodFavorite.mutateAsync({ foodId, isFavorite: isFav });
      notifications.show({ title: isFav ? "Eliminado de favoritos" : "Añadido a favoritos", message: isFav ? "El alimento se ha eliminado de tus favoritos" : "El alimento se ha añadido a tus favoritos", color: isFav ? "gray" : "yellow" });
    } catch {
      notifications.show({ title: "Error", message: "No se pudo actualizar el favorito", color: "red" });
    }
  };

  const handleToggleSupplementFavorite = async (supplementId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isFav = isSupplementFavorite(supplementId);
    try {
      await toggleSupplementFavorite.mutateAsync({ supplementId, isFavorite: isFav });
      notifications.show({ title: isFav ? "Eliminado de favoritos" : "Añadido a favoritos", message: isFav ? "El suplemento se ha eliminado de tus favoritos" : "El suplemento se ha añadido a tus favoritos", color: isFav ? "gray" : "yellow" });
    } catch {
      notifications.show({ title: "Error", message: "No se pudo actualizar el favorito", color: "red" });
    }
  };

  const mealPlans = useMemo(() => {
    if (!supabaseMealPlans) return [];
    return supabaseMealPlans.map((plan: any) => ({
      id: plan.id, name: plan.name, description: plan.description,
      duration_days: plan.duration_days || 7, duration_weeks: getDurationWeeks(plan),
      target_calories: plan.target_calories || 2000, target_protein: plan.target_protein || 150,
      target_carbs: plan.target_carbs || 200, target_fat: plan.target_fat || 70,
      dietary_tags: plan.dietary_tags || [], plan: plan.plan || { weeks: [{ week: 1, days: [] }] },
      client_id: plan.client_id, is_template: plan.is_template ?? true,
      is_active: plan.is_active ?? false, start_date: plan.start_date, end_date: plan.end_date,
      client_name: plan.client_id ? (clientsMap.get(plan.client_id) || null) : null,
    }));
  }, [supabaseMealPlans, clientsMap]);

  const templates = useMemo(() => mealPlans.filter((p: any) => p.is_template), [mealPlans]);
  const clientPlans = useMemo(() => mealPlans.filter((p: any) => !p.is_template), [mealPlans]);

  useEffect(() => {
    if (editPlanId && !builderOpened) {
      let plan = mealPlans.find((p: any) => p.id === editPlanId);
      if (!plan && specificClientPlan) {
        plan = {
          id: specificClientPlan.id, name: specificClientPlan.name, description: specificClientPlan.description,
          duration_days: specificClientPlan.duration_days || 7, duration_weeks: getDurationWeeks(specificClientPlan),
          target_calories: specificClientPlan.target_calories || 2000, target_protein: specificClientPlan.target_protein || 150,
          target_carbs: specificClientPlan.target_carbs || 200, target_fat: specificClientPlan.target_fat || 70,
          dietary_tags: specificClientPlan.dietary_tags || [], plan: specificClientPlan.plan || { weeks: [{ week: 1, days: [] }] },
          client_id: specificClientPlan.client_id,
        };
      }
      if (plan) openPlanBuilderFromUrl(plan);
    }
  }, [editPlanId, mealPlans, specificClientPlan, builderOpened]);

  const openPlanBuilderFromUrl = (plan: any) => {
    setEditingPlan(plan);
    const planClientId = plan.client_id || clientId || null;
    setSelectedClientId(planClientId);
    setIsTemplateModeOn(plan.is_template ?? !planClientId);
    if (planClientId) clientsApi.get(planClientId).then((res) => setSelectedClient(res.data)).catch(() => setSelectedClient(null));
    else setSelectedClient(null);
    planForm.setValues({
      name: plan.name, description: plan.description || "", duration_weeks: getDurationWeeks(plan),
      target_calories: plan.target_calories, target_protein: plan.target_protein,
      target_carbs: plan.target_carbs, target_fat: plan.target_fat,
      dietary_tags: plan.dietary_tags || [], client_id: planClientId, start_date: plan.start_date || "", end_date: plan.end_date || "",
    });
    setMealPlanWeeks(extractWeeksFromPlan(plan.plan));
    setCurrentWeek(1);
    openBuilder();
  };

  const handleCloseBuilder = () => {
    closeBuilder();
    setSelectedClientId(null);
    setSelectedClient(null);
    if (editPlanId || clientId) setSearchParams({});
    if (returnTo || clientId) goBack();
  };

  const foodForm = useForm({
    initialValues: { name: "", calories: 0, protein: 0, carbs: 0, fat: 0, serving_size: "100g", category: "" },
    validate: { name: (value) => (value.length < 2 ? "Nombre requerido" : null) },
  });

  const planForm = useForm({
    initialValues: {
      name: "", description: "", duration_weeks: 1, target_calories: 2000,
      target_protein: 150, target_carbs: 200, target_fat: 70,
      dietary_tags: [] as string[], client_id: null as string | null, start_date: "", end_date: "",
      review_interval_days: null as number | null,
    },
    validate: { name: (value) => (value.length < 2 ? "Nombre requerido" : null) },
  });

  const handleTargetMacrosChange = useCallback((t: { protein: number; carbs: number; fat: number }) => {
    planForm.setFieldValue("target_protein", t.protein);
    planForm.setFieldValue("target_carbs", t.carbs);
    planForm.setFieldValue("target_fat", t.fat);
  }, [planForm]);

  const loadClientData = useCallback(async (clientIdValue: string) => {
    try {
      const res = await clientsApi.get(clientIdValue);
      const client = res.data;
      setSelectedClient(client);
      planForm.setFieldValue("client_id", clientIdValue);
      if (client.weight_kg && client.height_cm && client.birth_date && client.gender) {
        const age = calculateAge(client.birth_date);
        const bmr = calculateBMR({ weight_kg: Number(client.weight_kg), height_cm: Number(client.height_cm), age, gender: client.gender === "masculino" ? "male" : "female" });
        const tdee = calculateTDEE(bmr, (client.health_data?.activity_level as string) || "moderate");
        planForm.setFieldValue("target_calories", Math.round(tdee));
        planForm.setFieldValue("target_protein", Math.round((tdee * 0.3) / 4));
        planForm.setFieldValue("target_carbs", Math.round((tdee * 0.4) / 4));
        planForm.setFieldValue("target_fat", Math.round((tdee * 0.3) / 9));
      }
    } catch { setSelectedClient(null); }
  }, [planForm]);

  const handleCreateFood = async (values: typeof foodForm.values) => {
    try {
      await createFood.mutateAsync({ name: values.name, category: categoryToDb(values.category), calories: values.calories, protein_g: values.protein, carbs_g: values.carbs, fat_g: values.fat, quantity: values.serving_size });
      notifications.show({ title: "Alimento creado", message: `${values.name} se ha añadido a tu biblioteca`, color: "green", icon: <IconCheck size={16} /> });
      closeFoodModal(); foodForm.reset();
    } catch { notifications.show({ title: "Error", message: "No se pudo crear el alimento", color: "red" }); }
  };

  const handleDeleteFood = async (foodId: string, foodName: string) => {
    try {
      await deleteFood.mutateAsync(foodId);
      notifications.show({ title: "Alimento eliminado", message: `${foodName} se ha eliminado de tu biblioteca`, color: "green" });
    } catch { notifications.show({ title: "Error", message: "No se pudo eliminar el alimento", color: "red" }); }
  };

  const openPlanBuilder = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      const planClientId = plan.client_id || clientId || null;
      setSelectedClientId(planClientId);
      setIsTemplateModeOn(plan.is_template ?? !planClientId);
      if (planClientId) clientsApi.get(planClientId).then((res) => setSelectedClient(res.data)).catch(() => setSelectedClient(null));
      else setSelectedClient(null);
      planForm.setValues({
        name: plan.name, description: plan.description || "", duration_weeks: getDurationWeeks(plan),
        target_calories: plan.target_calories, target_protein: plan.target_protein,
        target_carbs: plan.target_carbs, target_fat: plan.target_fat,
        dietary_tags: plan.dietary_tags || [], client_id: planClientId, start_date: plan.start_date || "", end_date: plan.end_date || "",
      });
      setMealPlanWeeks(extractWeeksFromPlan(plan.plan));
      setCurrentWeek(1);
    } else {
      setEditingPlan(null);
      setMealPlanWeeks([{ week: 1, days: [...initialDays] }]);
      setCurrentWeek(1);
      planForm.reset();
      if (clientId) { setSelectedClientId(clientId); setIsTemplateModeOn(true); loadClientData(clientId); }
      else { setSelectedClientId(null); setSelectedClient(null); setIsTemplateModeOn(true); }
    }
    openBuilder();
  };

  const canSavePlan = !!(selectedClientId || planForm.values.client_id || clientId || isTemplateModeOn);

  const handleSavePlan = async () => {
    const values = planForm.values;
    if (!values.name || !canSavePlan) return;
    try {
      const hasClient = !!(selectedClientId || values.client_id || clientId);
      const planClientId = hasClient ? (selectedClientId || values.client_id || clientId) : null;
      const cleanDates = { start_date: values.start_date || undefined, end_date: values.end_date || undefined };
      const basePlanData = {
        name: values.name, description: values.description, duration_days: values.duration_weeks * 7,
        duration_weeks: values.duration_weeks, target_calories: values.target_calories,
        target_protein: values.target_protein, target_carbs: values.target_carbs,
        target_fat: values.target_fat, dietary_tags: values.dietary_tags, plan: { weeks: mealPlanWeeks },
        review_interval_days: values.review_interval_days || undefined,
      };
      if (editingPlan) {
        await updateMealPlan.mutateAsync({ id: editingPlan.id, ...basePlanData, ...cleanDates, client_id: planClientId || undefined, is_template: editingPlan.is_template ?? !hasClient });
        notifications.show({ title: "Plan actualizado", message: `${values.name} se ha actualizado correctamente`, color: "green", icon: <IconCheck size={16} /> });
      } else {
        if (hasClient) {
          await createMealPlan.mutateAsync({ ...basePlanData, ...cleanDates, client_id: planClientId || undefined, is_template: false });
          notifications.show({ title: "Plan creado", message: `${values.name} se ha creado correctamente`, color: "green", icon: <IconCheck size={16} /> });
        }
        if (isTemplateModeOn) {
          const templateName = hasClient ? `${values.name} (Plantilla)` : values.name;
          await createMealPlan.mutateAsync({ ...basePlanData, client_id: undefined, is_template: true, name: templateName, start_date: undefined, end_date: undefined });
          notifications.show({ title: hasClient ? "Plantilla creada" : "Plantilla creada", message: hasClient ? "Se guardó también como plantilla reutilizable" : `${values.name} se ha creado correctamente`, color: hasClient ? "teal" : "green", icon: hasClient ? <IconTemplate size={16} /> : <IconCheck size={16} /> });
        }
      }
      closeBuilder(); setSelectedClientId(null); setSelectedClient(null);
      if (editPlanId || clientId) setSearchParams({});
      planForm.reset(); setMealPlanWeeks([{ week: 1, days: [...initialDays] }]); setCurrentWeek(1); setEditingPlan(null);
      if (clientId) navigate(`/clients/${clientId}`, { replace: true });
      else if (returnTo) navigate(returnTo, { replace: true });
    } catch { notifications.show({ title: "Error", message: "No se pudo guardar el plan", color: "red" }); }
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    try { await deleteMealPlan.mutateAsync(planId); notifications.show({ title: "Plan eliminado", message: `${planName} se ha eliminado correctamente`, color: "green" }); }
    catch { notifications.show({ title: "Error", message: "No se pudo eliminar el plan", color: "red" }); }
  };

  const handleDuplicatePlan = async (plan: any) => {
    try {
      await createMealPlan.mutateAsync({ name: `${plan.name} (copia)`, description: plan.description, duration_days: plan.duration_days, duration_weeks: getDurationWeeks(plan), target_calories: plan.target_calories, target_protein: plan.target_protein, target_carbs: plan.target_carbs, target_fat: plan.target_fat, dietary_tags: plan.dietary_tags, plan: plan.plan, is_template: true });
      notifications.show({ title: "Plan duplicado", message: `Se ha creado una copia de ${plan.name}`, color: "green", icon: <IconCheck size={16} /> });
    } catch { notifications.show({ title: "Error", message: "No se pudo duplicar el plan", color: "red" }); }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Proteínas": return IconMeat;
      case "Carbohidratos": return IconBread;
      case "Verduras": return IconSalad;
      case "Frutas": return IconApple;
      case "Lácteos": return IconMilk;
      case "Grasas": return IconEgg;
      default: return IconApple;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Proteínas": return "red"; case "Carbohidratos": return "orange"; case "Verduras": return "green";
      case "Frutas": return "yellow"; case "Lácteos": return "blue"; case "Grasas": return "grape";
      case "Frutos Secos": return "teal"; default: return "gray";
    }
  };

  const paginatedFoodsList: Food[] = useMemo(() => {
    if (!paginatedFoods?.items) return [];
    let foodsList = paginatedFoods.items.map((food: any) => ({
      id: food.id, name: food.name || "Sin nombre", calories: food.calories || 0,
      protein: food.protein_g || 0, carbs: food.carbs_g || 0, fat: food.fat_g || 0,
      serving_size: food.serving_size || 100, category: mapCategory(food.category), is_global: food.is_global ?? false,
    }));
    if (foodSourceFilter === "system") foodsList = foodsList.filter((f: Food) => f.is_global);
    else if (foodSourceFilter === "custom") foodsList = foodsList.filter((f: Food) => !f.is_global);
    if (foodFilter === "favorites") foodsList = foodsList.filter((food: Food) => isFoodFavorite(food.id));
    foodsList.sort((a: Food, b: Food) => { const aF = isFoodFavorite(a.id); const bF = isFoodFavorite(b.id); if (aF && !bF) return -1; if (!aF && bF) return 1; return 0; });
    return foodsList;
  }, [paginatedFoods, foodFilter, foodSourceFilter, isFoodFavorite]);

  const filteredSupplements = useMemo(() => {
    let suppList = supplements;
    if (supplementSourceFilter === "system") suppList = suppList.filter((s: any) => s.is_global);
    else if (supplementSourceFilter === "custom") suppList = suppList.filter((s: any) => !s.is_global);
    if (debouncedSupplementSearch) {
      const search = debouncedSupplementSearch.toLowerCase();
      suppList = suppList.filter((supp: any) => supp.name.toLowerCase().includes(search) || (supp.brand && supp.brand.toLowerCase().includes(search)));
    }
    if (supplementFilter === "favorites") suppList = suppList.filter((supp: any) => isSupplementFavorite(supp.id));
    suppList.sort((a: any, b: any) => { const aF = isSupplementFavorite(a.id); const bF = isSupplementFavorite(b.id); if (aF && !bF) return -1; if (!aF && bF) return 1; return 0; });
    return suppList;
  }, [supplements, supplementFilter, supplementSourceFilter, isSupplementFavorite, debouncedSupplementSearch]);

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: activeTab === "foods" ? "Nuevo Alimento" : activeTab === "recipes" ? "Nueva Receta" : activeTab === "templates" ? "Nueva Plantilla" : "Nuevo Plan",
          onClick: activeTab === "foods" ? openFoodModal : activeTab === "recipes" ? () => { setEditingRecipe(null); openRecipeModal(); } : () => { if (activeTab === "templates") setIsTemplateModeOn(true); else setIsTemplateModeOn(false); openPlanBuilder(); },
        }}
        description="Gestiona planes nutricionales y alimentos"
        title="Nutrición"
      />

      {isMobile && (
        <Select value={activeTab} onChange={setActiveTab} data={[
          { value: "templates", label: "Plantillas" }, { value: "plans", label: "Planes de Clientes" },
          { value: "recipes", label: "Recetas" }, { value: "foods", label: "Alimentos" }, { value: "supplements", label: "Suplementos" }, { value: "beverages", label: "Bebidas" },
        ]} size="sm" radius="md" mb="md" />
      )}

      <Tabs onChange={setActiveTab} value={activeTab}>
        {!isMobile && (
          <Tabs.List mb="md" style={{ borderBottom: "1px solid var(--border-subtle)", flexWrap: "nowrap" }}>
            {([
              { value: "templates", icon: <IconTemplate size={14} />, label: "Plantillas", count: templates.length },
              { value: "plans", icon: <IconUsers size={14} />, label: "Planes de Clientes", count: clientPlans.length },
              { value: "recipes", icon: <IconToolsKitchen2 size={14} />, label: "Recetas", count: recipes.length },
              { value: "foods", icon: <IconApple size={14} />, label: "Alimentos", count: totalFoodsCount ?? 0 },
              { value: "food-groups", icon: <IconSalad size={14} />, label: "Grupos", count: 0 },
              { value: "supplements", icon: <IconPill size={14} />, label: "Suplementos", count: supplements.length },
              { value: "beverages", icon: <IconGlass size={14} />, label: "Bebidas", count: 0 },
            ] as const).map((t) => (
              <Tabs.Tab key={t.value} leftSection={t.icon} value={t.value} style={{ fontWeight: 600, fontSize: "13px", flexDirection: "column", gap: 2, alignItems: "center", minWidth: 0 }}>
                {t.count > 0 && <Badge size="xs" radius="md" variant="light">{t.count.toLocaleString()}</Badge>}
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</span>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        )}

        <Tabs.Panel value="templates">
          <NutritionTemplatesTab templates={templates} isLoading={isLoadingPlans} onEdit={openPlanBuilder} onView={(id) => navigate(`/nutrition/${id}`)} onDuplicate={handleDuplicatePlan} onDelete={handleDeletePlan} onCreate={() => { setIsTemplateModeOn(true); openPlanBuilder(); }} createPending={createMealPlan.isPending} deletePending={deleteMealPlan.isPending} />
        </Tabs.Panel>

        <Tabs.Panel value="plans">
          <ClientPlansTab clientPlans={clientPlans} isLoading={isLoadingPlans} getDurationWeeks={getDurationWeeks} onEdit={openPlanBuilder} onView={(id) => navigate(`/nutrition/${id}`)} onDuplicate={handleDuplicatePlan} onDelete={handleDeletePlan} onCreate={() => { setIsTemplateModeOn(false); openPlanBuilder(); }} createPending={createMealPlan.isPending} deletePending={deleteMealPlan.isPending} />
        </Tabs.Panel>

        <Tabs.Panel value="recipes">
          <RecipesTab recipes={recipes} isLoading={isLoadingRecipes} recipeSearch={recipeSearch} recipeCategoryFilter={recipeCategoryFilter} recipeDifficultyFilter={recipeDifficultyFilter} onSearchChange={setRecipeSearch} onCategoryChange={setRecipeCategoryFilter} onDifficultyChange={setRecipeDifficultyFilter} onEdit={(r) => { setEditingRecipe(r); openRecipeModal(); }} onView={(r) => { setViewingRecipe(r); openRecipeDetail(); }} onDuplicate={async (r) => { await duplicateRecipeMutation.mutateAsync(r.id); }} onDelete={async (r) => { await deleteRecipeMutation.mutateAsync(r.id); }} onCreate={() => { setEditingRecipe(null); openRecipeModal(); }} duplicatePending={duplicateRecipeMutation.isPending} deletePending={deleteRecipeMutation.isPending} />
        </Tabs.Panel>

        <Tabs.Panel value="foods">
          <FoodsTab
            paginatedFoodsList={paginatedFoodsList} isLoading={isLoadingPaginatedFoods} isFetching={isFetchingFoods}
            searchFood={searchFood} debouncedSearch={debouncedSearch} foodFilter={foodFilter} foodSourceFilter={foodSourceFilter}
            foodCategoryFilter={foodCategoryFilter}
            currentPage={currentPage} totalPages={paginatedFoods?.totalPages || 0} total={paginatedFoods?.total || 0}
            isFoodFavorite={isFoodFavorite} getCategoryIcon={getCategoryIcon} getCategoryColor={getCategoryColor}
            onSearchChange={handleSearchChange} onFilterChange={setFoodFilter} onSourceFilterChange={setFoodSourceFilter}
            onCategoryFilterChange={(v) => { setFoodCategoryFilter(v || ""); setCurrentPage(1); }}
            onPageChange={setCurrentPage}
            onToggleFavorite={handleToggleFoodFavorite}
            onEdit={(food) => { const orig = paginatedFoods?.items?.find((f: any) => f.id === food.id); setEditingFood(orig || food); openEditFoodModal(); }}
            onView={(food) => { const orig = paginatedFoods?.items?.find((f: any) => f.id === food.id); setViewingFood(orig || food); openFoodDetailModal(); }}
            onDelete={handleDeleteFood} onNewFood={openFoodModal} togglePending={toggleFoodFavorite.isPending} foodsPerPage={FOODS_PER_PAGE}
            viewMode={viewMode} onViewModeChange={setViewMode}
          />
        </Tabs.Panel>

        <Tabs.Panel value="food-groups"><FoodGroupsPanel /></Tabs.Panel>

        <Tabs.Panel value="supplements">
          <SupplementsTab
            filteredSupplements={filteredSupplements} searchSupplement={searchSupplement} debouncedSupplementSearch={debouncedSupplementSearch}
            supplementFilter={supplementFilter} supplementSourceFilter={supplementSourceFilter} isSupplementFavorite={isSupplementFavorite}
            onSearchChange={setSearchSupplement} onFilterChange={setSupplementFilter} onSourceFilterChange={setSupplementSourceFilter}
            onToggleFavorite={handleToggleSupplementFavorite}
            onEdit={(s) => { setEditingSupplement(s); openEditSupplementModal(); }}
            onView={(s) => { setViewingSupplement(s); openSupplementDetailModal(); }}
            onNew={openSupplementModal} togglePending={toggleSupplementFavorite.isPending}
          />
        </Tabs.Panel>

        <Tabs.Panel value="beverages">
          <BeveragesTab />
        </Tabs.Panel>
      </Tabs>

      {/* Food Form Modal */}
      <BottomSheet onClose={closeFoodModal} opened={foodModalOpened} size="md" title="Nuevo Alimento" radius="lg" styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}>
        <form onSubmit={foodForm.onSubmit(handleCreateFood)}>
          <Stack>
            <TextInput label="Nombre" placeholder="Pechuga de Pollo" required {...foodForm.getInputProps("name")} />
            <Group grow>
              <Select data={[{ value: "Proteínas", label: "Proteínas" }, { value: "Carbohidratos", label: "Carbohidratos" }, { value: "Verduras", label: "Verduras" }, { value: "Frutas", label: "Frutas" }, { value: "Lácteos", label: "Lácteos" }, { value: "Grasas", label: "Grasas" }, { value: "Frutos Secos", label: "Frutos Secos" }]} label="Categoría" placeholder="Selecciona" {...foodForm.getInputProps("category")} />
              <TextInput label="Ración aproximada (gramos)" placeholder="Ej: 100g, 250g..." description="Aprox. una ración de este producto" {...foodForm.getInputProps("serving_size")} />
            </Group>
            <Text size="xs" c="dimmed" fw={500} mt="xs">Los valores nutricionales se introducen siempre por cada 100g</Text>
            <NumberInput label="Calorías (por 100g)" min={0} placeholder="0" {...foodForm.getInputProps("calories")} />
            <Group grow>
              <NumberInput decimalScale={1} label="Proteína (g)" min={0} placeholder="0" {...foodForm.getInputProps("protein")} />
              <NumberInput decimalScale={1} label="Carbohidratos (g)" min={0} placeholder="0" {...foodForm.getInputProps("carbs")} />
              <NumberInput decimalScale={1} label="Grasas (g)" min={0} placeholder="0" {...foodForm.getInputProps("fat")} />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button onClick={closeFoodModal} variant="default">Cancelar</Button>
              <Button loading={createFood.isPending} type="submit">Crear Alimento</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Edit Food Modal */}
      <BottomSheet onClose={() => { closeEditFoodModal(); setEditingFood(null); }} opened={editFoodModalOpened} size="xl" title="Editar Alimento" radius="lg" styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}>
        {editingFood && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            try {
              await updateFood.mutateAsync({ id: editingFood.id, name: formData.get("name") as string, generic_name: formData.get("generic_name") as string || null, brand: formData.get("brand") as string || null, category: categoryToDb(formData.get("category") as string), barcode: formData.get("barcode") as string || null, serving_size: Number(formData.get("serving_size_num")) || 100, serving_unit: formData.get("serving_unit") as string || "g", quantity: formData.get("quantity") as string || null, calories: Number(formData.get("calories")) || 0, protein_g: Number(formData.get("protein")) || 0, carbs_g: Number(formData.get("carbs")) || 0, fat_g: Number(formData.get("fat")) || 0, fiber_g: Number(formData.get("fiber")) || 0, sugars_g: Number(formData.get("sugars")) || 0, saturated_fat_g: Number(formData.get("saturated_fat")) || 0, salt_g: Number(formData.get("salt")) || 0, sodium_mg: Number(formData.get("sodium")) || 0, ingredients_text: formData.get("ingredients") as string || null, allergens: formData.get("allergens") as string || null });
              notifications.show({ title: "Alimento actualizado", message: "El alimento se ha actualizado correctamente", color: "green" });
              closeEditFoodModal(); setEditingFood(null);
            } catch { notifications.show({ title: "Error", message: "No se pudo actualizar el alimento", color: "red" }); }
          }}>
            <ScrollArea h={500}>
              <Tabs value={editFoodTab} onChange={setEditFoodTab} radius="md">
                {isMobile && <Select value={editFoodTab} onChange={setEditFoodTab} data={[{ value: "general", label: "General" }, { value: "nutrition", label: "Nutrición" }, { value: "details", label: "Detalles" }]} size="sm" radius="md" mb="md" />}
                {!isMobile && <Tabs.List mb="md"><Tabs.Tab value="general">General</Tabs.Tab><Tabs.Tab value="nutrition">Nutrición</Tabs.Tab><Tabs.Tab value="details">Detalles</Tabs.Tab></Tabs.List>}
                <Tabs.Panel value="general">
                  <Stack gap="sm">
                    <TextInput label="Nombre" name="name" placeholder="Pechuga de Pollo" required defaultValue={editingFood.name} />
                    <TextInput label="Nombre genérico" name="generic_name" placeholder="Pollo" defaultValue={editingFood.generic_name || ""} />
                    <Group grow><TextInput label="Marca" name="brand" placeholder="Marca del producto" defaultValue={editingFood.brand || ""} /><Select name="category" data={[{ value: "Proteínas", label: "Proteínas" }, { value: "Carbohidratos", label: "Carbohidratos" }, { value: "Verduras", label: "Verduras" }, { value: "Frutas", label: "Frutas" }, { value: "Lácteos", label: "Lácteos" }, { value: "Grasas", label: "Grasas" }, { value: "Frutos Secos", label: "Frutos Secos" }, { value: "Otros", label: "Otros" }]} label="Categoría" placeholder="Selecciona" defaultValue={mapCategory(editingFood.category)} /></Group>
                    <Group grow><TextInput label="Código de barras" name="barcode" placeholder="8400000000000" defaultValue={editingFood.barcode || ""} /><TextInput label="Cantidad/Envase" name="quantity" placeholder="500g, 1L, etc." defaultValue={editingFood.quantity || ""} /></Group>
                    <Group grow><NumberInput label="Tamaño porción" name="serving_size_num" min={0} defaultValue={editingFood.serving_size || 100} /><Select name="serving_unit" data={[{ value: "g", label: "gramos (g)" }, { value: "ml", label: "mililitros (ml)" }, { value: "unidad", label: "unidad" }, { value: "porción", label: "porción" }]} label="Unidad" defaultValue={editingFood.serving_unit || "g"} /></Group>
                  </Stack>
                </Tabs.Panel>
                <Tabs.Panel value="nutrition">
                  <Stack gap="sm">
                    <Text fw={600} size="sm" c="dimmed">Macronutrientes principales</Text>
                    <Group grow><NumberInput label="Calorías (kcal)" name="calories" min={0} decimalScale={1} defaultValue={editingFood.calories || 0} /><NumberInput label="Proteínas (g)" name="protein" min={0} decimalScale={2} defaultValue={editingFood.protein_g || 0} /></Group>
                    <Group grow><NumberInput label="Carbohidratos (g)" name="carbs" min={0} decimalScale={2} defaultValue={editingFood.carbs_g || 0} /><NumberInput label="Grasas (g)" name="fat" min={0} decimalScale={2} defaultValue={editingFood.fat_g || 0} /></Group>
                    <Divider my="sm" /><Text fw={600} size="sm" c="dimmed">Información adicional</Text>
                    <Group grow><NumberInput label="Fibra (g)" name="fiber" min={0} decimalScale={2} defaultValue={editingFood.fiber_g || 0} /><NumberInput label="Azúcares (g)" name="sugars" min={0} decimalScale={2} defaultValue={editingFood.sugars_g || 0} /></Group>
                    <Group grow><NumberInput label="Grasas saturadas (g)" name="saturated_fat" min={0} decimalScale={2} defaultValue={editingFood.saturated_fat_g || 0} /><NumberInput label="Sal (g)" name="salt" min={0} decimalScale={3} defaultValue={editingFood.salt_g || 0} /></Group>
                    <NumberInput label="Sodio (mg)" name="sodium" min={0} defaultValue={editingFood.sodium_mg || 0} />
                  </Stack>
                </Tabs.Panel>
                <Tabs.Panel value="details">
                  <Stack gap="sm">
                    <Textarea label="Ingredientes" name="ingredients" placeholder="Lista de ingredientes..." minRows={3} defaultValue={editingFood.ingredients_text || ""} />
                    <Textarea label="Alérgenos" name="allergens" placeholder="Gluten, Leche, Frutos secos..." minRows={2} defaultValue={editingFood.allergens || ""} />
                    {editingFood.image_url && <Box><Text size="xs" c="dimmed" mb="xs">Imagen actual</Text><img src={editingFood.image_url} alt={editingFood.name} style={{ maxHeight: 100, borderRadius: 8, objectFit: "contain" }} /></Box>}
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </ScrollArea>
            <Group justify="flex-end" mt="md">
              <Button onClick={() => { closeEditFoodModal(); setEditingFood(null); }} variant="default">Cancelar</Button>
              <Button loading={updateFood.isPending} type="submit">Guardar Cambios</Button>
            </Group>
          </form>
        )}
      </BottomSheet>

      {/* Food Detail Modal */}
      <BottomSheet onClose={() => { closeFoodDetailModal(); setViewingFood(null); }} opened={foodDetailModalOpened} size="xl" title={viewingFood?.name || "Detalle del Alimento"} radius="lg" styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}>
        {viewingFood && (
          <ScrollArea h={500}>
            <Tabs value={foodDetailTab} onChange={setFoodDetailTab} radius="md">
              {isMobile && <Select value={foodDetailTab} onChange={setFoodDetailTab} data={[{ value: "general", label: "General" }, { value: "macros", label: "Macronutrientes" }, { value: "vitamins", label: "Vitaminas" }, { value: "minerals", label: "Minerales" }, { value: "other", label: "Otros" }]} size="sm" radius="md" mb="md" />}
              {!isMobile && <Tabs.List mb="md"><Tabs.Tab value="general">General</Tabs.Tab><Tabs.Tab value="macros">Macronutrientes</Tabs.Tab><Tabs.Tab value="vitamins">Vitaminas</Tabs.Tab><Tabs.Tab value="minerals">Minerales</Tabs.Tab><Tabs.Tab value="other">Otros</Tabs.Tab></Tabs.List>}
              <Tabs.Panel value="general">
                <Stack gap="md">
                  {viewingFood.image_url && <Center><img src={viewingFood.image_url} alt={viewingFood.name} style={{ maxHeight: 150, borderRadius: 8, objectFit: "contain" }} /></Center>}
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Box><Text size="xs" c="dimmed" fw={500}>Nombre</Text><Text fw={600}>{viewingFood.name}</Text></Box>
                    <Box><Text size="xs" c="dimmed" fw={500}>Nombre genérico</Text><Text>{viewingFood.generic_name || "-"}</Text></Box>
                    <Box><Text size="xs" c="dimmed" fw={500}>Marca</Text><Text>{viewingFood.brand || "-"}</Text></Box>
                    <Box><Text size="xs" c="dimmed" fw={500}>Categoría</Text><Text>{viewingFood.category || "-"}</Text></Box>
                    <Box><Text size="xs" c="dimmed" fw={500}>Código de barras</Text><Text>{viewingFood.barcode || "-"}</Text></Box>
                    <Box><Text size="xs" c="dimmed" fw={500}>Valores nutricionales por</Text><Text>100g</Text></Box>
                    <Box><Text size="xs" c="dimmed" fw={500}>Ración aproximada</Text><Text>{viewingFood.quantity ? `Aprox. una ración son ${viewingFood.quantity}` : viewingFood.serving_size ? `Aprox. una ración son ${viewingFood.serving_size}g` : "-"}</Text></Box>
                    <Box><Text size="xs" c="dimmed" fw={500}>Envase</Text><Text>{viewingFood.packaging || "-"}</Text></Box>
                  </SimpleGrid>
                  {viewingFood.ingredients_text && <Box><Text size="xs" c="dimmed" fw={500}>Ingredientes</Text><Text size="sm">{viewingFood.ingredients_text}</Text></Box>}
                  {(viewingFood.allergens || viewingFood.allergens_tags?.length > 0) && <Box><Text size="xs" c="dimmed" fw={500}>Alérgenos</Text><Group gap="xs" mt="xs">{viewingFood.allergens_tags?.map((tag: string) => <Badge key={tag} color="red" variant="light" size="sm">{tag}</Badge>) || <Text size="sm">{viewingFood.allergens}</Text>}</Group></Box>}
                  {(viewingFood.traces || viewingFood.traces_tags?.length > 0) && <Box><Text size="xs" c="dimmed" fw={500}>Trazas</Text><Group gap="xs" mt="xs">{viewingFood.traces_tags?.map((tag: string) => <Badge key={tag} color="orange" variant="light" size="sm">{tag}</Badge>) || <Text size="sm">{viewingFood.traces}</Text>}</Group></Box>}
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {viewingFood.nutriscore_grade && <Box><Text size="xs" c="dimmed" fw={500}>Nutri-Score</Text><Badge color={viewingFood.nutriscore_grade === 'a' ? 'green' : viewingFood.nutriscore_grade === 'b' ? 'lime' : viewingFood.nutriscore_grade === 'c' ? 'yellow' : viewingFood.nutriscore_grade === 'd' ? 'orange' : 'red'} size="lg">{viewingFood.nutriscore_grade?.toUpperCase()}</Badge></Box>}
                    {viewingFood.nova_group && <Box><Text size="xs" c="dimmed" fw={500}>NOVA Group</Text><Badge color="blue" size="lg">{viewingFood.nova_group}</Badge></Box>}
                    {viewingFood.ecoscore_grade && <Box><Text size="xs" c="dimmed" fw={500}>Eco-Score</Text><Badge color={viewingFood.ecoscore_grade === 'a' ? 'green' : viewingFood.ecoscore_grade === 'b' ? 'lime' : viewingFood.ecoscore_grade === 'c' ? 'yellow' : viewingFood.ecoscore_grade === 'd' ? 'orange' : 'red'} size="lg">{viewingFood.ecoscore_grade?.toUpperCase()}</Badge></Box>}
                  </SimpleGrid>
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="macros">
                <Stack gap="md">
                  <Text fw={600} size="lg">Información Nutricional (por 100g)</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Energía</Text><Text fw={600} size="lg">{formatDecimal(Number(viewingFood.calories || 0), 1)} kcal</Text>{viewingFood.energy_kj && <Text size="xs" c="dimmed">{viewingFood.energy_kj} kJ</Text>}</Box>
                    <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Proteínas</Text><Text fw={600} size="lg" c="green">{formatDecimal(Number(viewingFood.protein_g || 0), 1)} g</Text></Box>
                    <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Carbohidratos</Text><Text fw={600} size="lg" c="orange">{formatDecimal(Number(viewingFood.carbs_g || 0), 1)} g</Text>{viewingFood.sugars_g > 0 && <Text size="xs" c="dimmed">de los cuales azúcares: {viewingFood.sugars_g}g</Text>}{viewingFood.added_sugars_g > 0 && <Text size="xs" c="dimmed">azúcares añadidos: {viewingFood.added_sugars_g}g</Text>}{viewingFood.starch_g > 0 && <Text size="xs" c="dimmed">almidón: {viewingFood.starch_g}g</Text>}</Box>
                    <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Grasas</Text><Text fw={600} size="lg" c="grape">{formatDecimal(Number(viewingFood.fat_g || 0), 1)} g</Text>{viewingFood.saturated_fat_g > 0 && <Text size="xs" c="dimmed">saturadas: {viewingFood.saturated_fat_g}g</Text>}{viewingFood.monounsaturated_fat_g > 0 && <Text size="xs" c="dimmed">monoinsaturadas: {viewingFood.monounsaturated_fat_g}g</Text>}{viewingFood.polyunsaturated_fat_g > 0 && <Text size="xs" c="dimmed">poliinsaturadas: {viewingFood.polyunsaturated_fat_g}g</Text>}{viewingFood.trans_fat_g > 0 && <Text size="xs" c="dimmed">trans: {viewingFood.trans_fat_g}g</Text>}</Box>
                    <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Fibra</Text><Text fw={600} size="lg">{formatDecimal(Number(viewingFood.fiber_g || 0), 1)} g</Text></Box>
                    <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Sal</Text><Text fw={600} size="lg">{formatDecimal(Number(viewingFood.salt_g || 0), 2)} g</Text>{viewingFood.sodium_mg > 0 && <Text size="xs" c="dimmed">sodio: {viewingFood.sodium_mg}mg</Text>}</Box>
                  </SimpleGrid>
                  {(viewingFood.cholesterol_mg > 0 || viewingFood.omega3_g > 0 || viewingFood.alcohol_g > 0) && <><Divider my="sm" /><SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>{viewingFood.cholesterol_mg > 0 && <Box><Text size="xs" c="dimmed">Colesterol</Text><Text fw={600}>{viewingFood.cholesterol_mg} mg</Text></Box>}{viewingFood.omega3_g > 0 && <Box><Text size="xs" c="dimmed">Omega-3</Text><Text fw={600}>{viewingFood.omega3_g} g</Text></Box>}{viewingFood.alcohol_g > 0 && <Box><Text size="xs" c="dimmed">Alcohol</Text><Text fw={600}>{viewingFood.alcohol_g} g</Text></Box>}</SimpleGrid></>}
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="vitamins">
                <Stack gap="md">
                  <Text fw={600} size="lg">Vitaminas (por 100g)</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {viewingFood.vitamin_a_ug > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina A</Text><Text fw={600}>{viewingFood.vitamin_a_ug} µg</Text></Box>}
                    {viewingFood.vitamin_d_ug > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina D</Text><Text fw={600}>{viewingFood.vitamin_d_ug} µg</Text></Box>}
                    {viewingFood.vitamin_e_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina E</Text><Text fw={600}>{viewingFood.vitamin_e_mg} mg</Text></Box>}
                    {viewingFood.vitamin_k_ug > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina K</Text><Text fw={600}>{viewingFood.vitamin_k_ug} µg</Text></Box>}
                    {viewingFood.vitamin_c_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina C</Text><Text fw={600}>{viewingFood.vitamin_c_mg} mg</Text></Box>}
                    {viewingFood.vitamin_b1_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina B1 (Tiamina)</Text><Text fw={600}>{viewingFood.vitamin_b1_mg} mg</Text></Box>}
                    {viewingFood.vitamin_b2_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina B2 (Riboflavina)</Text><Text fw={600}>{viewingFood.vitamin_b2_mg} mg</Text></Box>}
                    {viewingFood.vitamin_b6_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina B6</Text><Text fw={600}>{viewingFood.vitamin_b6_mg} mg</Text></Box>}
                    {viewingFood.vitamin_b9_ug > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina B9 (Ácido Fólico)</Text><Text fw={600}>{viewingFood.vitamin_b9_ug} µg</Text></Box>}
                    {viewingFood.vitamin_b12_ug > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina B12</Text><Text fw={600}>{viewingFood.vitamin_b12_ug} µg</Text></Box>}
                    {viewingFood.vitamin_pp_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Vitamina PP (Niacina)</Text><Text fw={600}>{viewingFood.vitamin_pp_mg} mg</Text></Box>}
                    {viewingFood.pantothenic_acid_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Ácido Pantoténico</Text><Text fw={600}>{viewingFood.pantothenic_acid_mg} mg</Text></Box>}
                  </SimpleGrid>
                  {!viewingFood.vitamin_a_ug && !viewingFood.vitamin_c_mg && !viewingFood.vitamin_d_ug && <Text c="dimmed" ta="center">No hay información de vitaminas disponible</Text>}
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="minerals">
                <Stack gap="md">
                  <Text fw={600} size="lg">Minerales (por 100g)</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                    {viewingFood.calcium_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Calcio</Text><Text fw={600}>{viewingFood.calcium_mg} mg</Text></Box>}
                    {viewingFood.iron_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Hierro</Text><Text fw={600}>{viewingFood.iron_mg} mg</Text></Box>}
                    {viewingFood.magnesium_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Magnesio</Text><Text fw={600}>{viewingFood.magnesium_mg} mg</Text></Box>}
                    {viewingFood.phosphorus_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Fósforo</Text><Text fw={600}>{viewingFood.phosphorus_mg} mg</Text></Box>}
                    {viewingFood.potassium_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Potasio</Text><Text fw={600}>{viewingFood.potassium_mg} mg</Text></Box>}
                    {viewingFood.zinc_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Zinc</Text><Text fw={600}>{viewingFood.zinc_mg} mg</Text></Box>}
                    {viewingFood.copper_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Cobre</Text><Text fw={600}>{viewingFood.copper_mg} mg</Text></Box>}
                    {viewingFood.manganese_mg > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Manganeso</Text><Text fw={600}>{viewingFood.manganese_mg} mg</Text></Box>}
                    {viewingFood.selenium_ug > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Selenio</Text><Text fw={600}>{viewingFood.selenium_ug} µg</Text></Box>}
                    {viewingFood.iodine_ug > 0 && <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Yodo</Text><Text fw={600}>{viewingFood.iodine_ug} µg</Text></Box>}
                  </SimpleGrid>
                  {!viewingFood.calcium_mg && !viewingFood.iron_mg && !viewingFood.magnesium_mg && <Text c="dimmed" ta="center">No hay información de minerales disponible</Text>}
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="other">
                <Stack gap="md">
                  <Text fw={600} size="lg">Información Adicional</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {viewingFood.caffeine_mg > 0 && <Box><Text size="xs" c="dimmed">Cafeína</Text><Text fw={600}>{viewingFood.caffeine_mg} mg</Text></Box>}
                    {viewingFood.choline_mg > 0 && <Box><Text size="xs" c="dimmed">Colina</Text><Text fw={600}>{viewingFood.choline_mg} mg</Text></Box>}
                    {viewingFood.polyols_g > 0 && <Box><Text size="xs" c="dimmed">Polialcoholes</Text><Text fw={600}>{viewingFood.polyols_g} g</Text></Box>}
                  </SimpleGrid>
                  <Divider my="sm" />
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {viewingFood.labels && <Box><Text size="xs" c="dimmed">Etiquetas</Text><Text size="sm">{viewingFood.labels}</Text></Box>}
                    {viewingFood.origins && <Box><Text size="xs" c="dimmed">Origen</Text><Text size="sm">{viewingFood.origins}</Text></Box>}
                    {viewingFood.manufacturing_places && <Box><Text size="xs" c="dimmed">Lugar de fabricación</Text><Text size="sm">{viewingFood.manufacturing_places}</Text></Box>}
                    {viewingFood.food_groups && <Box><Text size="xs" c="dimmed">Grupo alimenticio</Text><Text size="sm">{viewingFood.food_groups}</Text></Box>}
                    {viewingFood.source_supermarket && <Box><Text size="xs" c="dimmed">Supermercado</Text><Text size="sm">{viewingFood.source_supermarket}</Text></Box>}
                    {viewingFood.data_source && <Box><Text size="xs" c="dimmed">Fuente de datos</Text><Text size="sm">{viewingFood.data_source}</Text></Box>}
                  </SimpleGrid>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </ScrollArea>
        )}
      </BottomSheet>

      {/* Supplement Detail Modal */}
      <BottomSheet onClose={() => { closeSupplementDetailModal(); setViewingSupplement(null); }} opened={supplementDetailModalOpened} size="lg" title={viewingSupplement?.name || "Detalle del Suplemento"} radius="lg" styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}>
        {viewingSupplement && (
          <ScrollArea h={400}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Box><Text size="xs" c="dimmed" fw={500}>Nombre</Text><Text fw={600}>{viewingSupplement.name}</Text></Box>
                <Box><Text size="xs" c="dimmed" fw={500}>Marca</Text><Text>{viewingSupplement.brand || "-"}</Text></Box>
                <Box><Text size="xs" c="dimmed" fw={500}>Categoría</Text><Text>{viewingSupplement.category || "-"}</Text></Box>
                <Box><Text size="xs" c="dimmed" fw={500}>Porción</Text><Text>{viewingSupplement.serving_size} {viewingSupplement.serving_unit || ""}</Text></Box>
              </SimpleGrid>
              {viewingSupplement.description && <Box><Text size="xs" c="dimmed" fw={500}>Descripción</Text><Text size="sm">{viewingSupplement.description}</Text></Box>}
              <Divider />
              <Text fw={600}>Información Nutricional</Text>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Calorías</Text><Text fw={600}>{viewingSupplement.calories || 0} kcal</Text></Box>
                <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Proteínas</Text><Text fw={600} c="green">{viewingSupplement.protein || 0} g</Text></Box>
                <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Carbohidratos</Text><Text fw={600} c="orange">{viewingSupplement.carbs || 0} g</Text></Box>
                <Box className="nv-card-compact" p="sm"><Text size="xs" c="dimmed">Grasas</Text><Text fw={600} c="grape">{viewingSupplement.fat || 0} g</Text></Box>
              </SimpleGrid>
              {viewingSupplement.usage_instructions && <><Divider /><Box><Text size="xs" c="dimmed" fw={500}>Instrucciones de uso</Text><Text size="sm">{viewingSupplement.usage_instructions}</Text></Box></>}
              {viewingSupplement.warnings && <Box><Text size="xs" c="dimmed" fw={500}>Advertencias</Text><Text size="sm" c="red">{viewingSupplement.warnings}</Text></Box>}
            </Stack>
          </ScrollArea>
        )}
      </BottomSheet>

      {/* Plan Builder */}
      <PlanEditorLayout opened={builderOpened} onClose={handleCloseBuilder} title={editingPlan ? "Editar Plan Nutricional" : "Nuevo Plan Nutricional"} clientBadge={clientId && clientData ? `${clientData.first_name} ${clientData.last_name}` : undefined} badgeColor="green" isSaving={createMealPlan.isPending || updateMealPlan.isPending} onSave={handleSavePlan} saveDisabled={!canSavePlan || !planForm.values.name} saveLabel={editingPlan ? "Guardar Cambios" : "Crear Plan"}
        sidebarContent={
          <Stack gap="md">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.05em" }}>Configuración</Text>
            <Select label="Asignar a cliente" placeholder="Buscar cliente..." data={clientOptions} searchable clearable radius="md" size="sm" leftSection={<IconUser size={14} />} value={selectedClientId} disabled={!!clientId} onChange={(value) => { setSelectedClientId(value); if (value) loadClientData(value); else { setSelectedClient(null); planForm.setFieldValue("client_id", null); } }} />
            <Switch label="Crear como plantilla" description={selectedClientId || clientId ? "Guarda una copia reutilizable además del plan del cliente" : "Guarda como plantilla reutilizable"} checked={isTemplateModeOn} onChange={(e) => setIsTemplateModeOn(e.currentTarget.checked)} size="sm" color="teal" />
            {!canSavePlan && <Text size="xs" c="red">Asigna un cliente o marca &quot;Crear como plantilla&quot; para poder guardar</Text>}
            <TextInput label="Nombre del plan" placeholder="Plan de Pérdida de Peso" required radius="md" size="sm" {...planForm.getInputProps("name")} />
            <Textarea label="Descripción" minRows={2} placeholder="Describe el plan..." radius="md" size="sm" {...planForm.getInputProps("description")} />
            <Group grow>
              <NumberInput label="Programación (semanal)" max={12} min={1} radius="md" size="sm" {...planForm.getInputProps("duration_weeks")} onChange={(v) => { const weeks = Number(v) || 1; planForm.setFieldValue("duration_weeks", weeks); setMealPlanWeeks((prev) => { if (weeks > prev.length) { const nw = [...prev]; for (let i = prev.length; i < weeks; i++) nw.push({ week: i + 1, days: initialDays.map((d) => ({ ...d, id: `day-${i + 1}-${d.day}`, meals: [] })) }); return nw; } return prev.slice(0, weeks); }); }} />
            </Group>
            {(selectedClientId || clientId) && <Group grow><TextInput label="Fecha de inicio" type="date" radius="md" size="sm" {...planForm.getInputProps("start_date")} /><TextInput label="Fecha de fin (opcional)" description="Si no se indica, las semanas se repiten indefinidamente" type="date" radius="md" size="sm" {...planForm.getInputProps("end_date")} /></Group>}
            {(selectedClientId || clientId) && <NumberInput label="Intervalo de revisión (días)" description="Genera recordatorios automáticos para revisar el plan" placeholder="Ej: 15" min={1} max={365} radius="md" size="sm" {...planForm.getInputProps("review_interval_days")} />}
            <Divider label="Objetivos nutricionales" labelPosition="center" styles={{ label: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" } }} />
            <NumberInput label="Calorías objetivo" max={5000} min={1000} step={50} radius="md" size="sm" value={planForm.values.target_calories} onChange={(v) => { const cal = Number(v) || 1000; planForm.setFieldValue("target_calories", cal); const curP = planForm.values.target_protein; const curC = planForm.values.target_carbs; const curF = planForm.values.target_fat; const curCal = (curP * 4) + (curC * 4) + (curF * 9); if (curCal > 0) { const pPct = (curP * 4 / curCal) * 100; const cPct = (curC * 4 / curCal) * 100; const fPct = (curF * 9 / curCal) * 100; const g = gramsFromPercentages(cal, pPct, cPct, fPct); planForm.setFieldValue("target_protein", g.protein_g); planForm.setFieldValue("target_carbs", g.carbs_g); planForm.setFieldValue("target_fat", g.fat_g); } }} error={planForm.errors.target_calories} />
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs">
              <NumberInput label="Prot. (g)" max={500} min={0} radius="md" size="sm" {...planForm.getInputProps("target_protein")} />
              <NumberInput label="Carbs (g)" max={500} min={0} radius="md" size="sm" {...planForm.getInputProps("target_carbs")} />
              <NumberInput label="Grasas (g)" max={300} min={0} radius="md" size="sm" {...planForm.getInputProps("target_fat")} />
            </SimpleGrid>
          </Stack>
        }
        mainContent={
          <MealPlanBuilder selectedClient={selectedClient} availableFoods={foods} availableSupplements={supplements} days={mealPlanDays} onChange={setMealPlanDays} targetCalories={planForm.values.target_calories} targetCarbs={planForm.values.target_carbs} targetFat={planForm.values.target_fat} targetProtein={planForm.values.target_protein} onTargetMacrosChange={handleTargetMacrosChange} foodFavorites={foodFavorites} supplementFavorites={supplementFavorites} onToggleFoodFavorite={handleToggleFoodFavoriteForBuilder} onToggleSupplementFavorite={handleToggleSupplementFavoriteForBuilder} recipes={recipes} startDate={planForm.values.start_date} totalWeeks={planForm.values.duration_weeks} currentWeek={currentWeek} onWeekChange={setCurrentWeek}
            onCopyWeek={(from, to) => { setMealPlanWeeks((prev) => { const srcWeek = prev.find((w) => w.week === from); if (!srcWeek) return prev; const now = Date.now(); const copiedDays = srcWeek.days.map((d, di) => ({ ...d, id: `day-${to}-${d.day}`, meals: d.meals.map((m, mi) => ({ ...m, id: `meal-${now}-${di}-${mi}`, items: m.items.map((item, ii) => ({ ...item, id: `item-${now}-${di}-${mi}-${ii}` })) })) })); return prev.map((w) => w.week === to ? { ...w, days: copiedDays } : w); }); setCurrentWeek(to); notifications.show({ title: "Semana copiada", message: `Semana ${from} copiada a Semana ${to}`, color: "green" }); }}
          />
        }
      />

      {/* Supplement Create Modal */}
      <BottomSheet onClose={closeSupplementModal} opened={supplementModalOpened} size="md" title="Nuevo Suplemento" radius="lg" styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}>
        <form onSubmit={async (e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); try { await createSupplement.mutateAsync({ name: formData.get("name") as string, brand: formData.get("brand") as string || undefined, category: formData.get("category") as string || "general", serving_size: Number(formData.get("serving_size")) || 30, serving_unit: formData.get("serving_unit") as string || "g", calories: Number(formData.get("calories")) || 0, protein: Number(formData.get("protein")) || 0, carbs: Number(formData.get("carbs")) || 0, fat: Number(formData.get("fat")) || 0, usage_instructions: formData.get("usage_instructions") as string || undefined }); notifications.show({ title: "Suplemento creado", message: "El suplemento se ha creado correctamente", color: "green" }); closeSupplementModal(); } catch { notifications.show({ title: "Error", message: "No se pudo crear el suplemento", color: "red" }); } }}>
          <Stack>
            <TextInput label="Nombre" name="name" placeholder="Proteína Whey" required />
            <Group grow><TextInput label="Marca" name="brand" placeholder="Optimum Nutrition" /><Select name="category" data={[{ value: "protein", label: "Proteína" }, { value: "creatine", label: "Creatina" }, { value: "pre_workout", label: "Pre-entreno" }, { value: "vitamins", label: "Vitaminas" }, { value: "minerals", label: "Minerales" }, { value: "amino_acids", label: "Aminoácidos" }, { value: "fat_burner", label: "Quemador de grasa" }, { value: "general", label: "General" }]} label="Categoría" placeholder="Selecciona" defaultValue="general" /></Group>
            <Group grow><NumberInput label="Porción" name="serving_size" min={1} defaultValue={30} /><Select name="serving_unit" data={[{ value: "g", label: "gramos" }, { value: "ml", label: "ml" }, { value: "caps", label: "cápsulas" }, { value: "tabs", label: "tabletas" }, { value: "scoop", label: "scoop" }]} label="Unidad" defaultValue="g" /></Group>
            <NumberInput label="Calorías" name="calories" min={0} defaultValue={0} />
            <Group grow><NumberInput label="Proteína (g)" name="protein" min={0} decimalScale={1} defaultValue={0} /><NumberInput label="Carbohidratos (g)" name="carbs" min={0} decimalScale={1} defaultValue={0} /><NumberInput label="Grasas (g)" name="fat" min={0} decimalScale={1} defaultValue={0} /></Group>
            <Textarea label="Cómo tomar" name="usage_instructions" placeholder="Mezclar 1 scoop con 200ml de agua..." minRows={2} />
            <Group justify="flex-end" mt="md"><Button onClick={closeSupplementModal} variant="default">Cancelar</Button><Button loading={createSupplement.isPending} type="submit">Crear Suplemento</Button></Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Supplement Edit Modal */}
      <BottomSheet onClose={() => { closeEditSupplementModal(); setEditingSupplement(null); }} opened={editSupplementModalOpened} size="md" title="Editar Suplemento" radius="lg" styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}>
        {editingSupplement && (
          <form onSubmit={async (e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); try { await updateSupplement.mutateAsync({ id: editingSupplement.id, name: formData.get("name") as string, brand: formData.get("brand") as string || undefined, category: formData.get("category") as string || "general", serving_size: Number(formData.get("serving_size")) || 30, serving_unit: formData.get("serving_unit") as string || "g", calories: Number(formData.get("calories")) || 0, protein: Number(formData.get("protein")) || 0, carbs: Number(formData.get("carbs")) || 0, fat: Number(formData.get("fat")) || 0, usage_instructions: formData.get("usage_instructions") as string || undefined }); notifications.show({ title: "Suplemento actualizado", message: "El suplemento se ha actualizado correctamente", color: "green" }); closeEditSupplementModal(); setEditingSupplement(null); } catch { notifications.show({ title: "Error", message: "No se pudo actualizar el suplemento", color: "red" }); } }}>
            <Stack>
              <TextInput label="Nombre" name="name" placeholder="Proteína Whey" required defaultValue={editingSupplement.name} />
              <Group grow><TextInput label="Marca" name="brand" placeholder="Optimum Nutrition" defaultValue={editingSupplement.brand || ""} /><Select name="category" data={[{ value: "protein", label: "Proteína" }, { value: "creatine", label: "Creatina" }, { value: "pre_workout", label: "Pre-entreno" }, { value: "vitamins", label: "Vitaminas" }, { value: "minerals", label: "Minerales" }, { value: "amino_acids", label: "Aminoácidos" }, { value: "fat_burner", label: "Quemador de grasa" }, { value: "general", label: "General" }]} label="Categoría" defaultValue={editingSupplement.category || "general"} /></Group>
              <Group grow><NumberInput label="Porción" name="serving_size" min={1} defaultValue={editingSupplement.serving_size || 30} /><Select name="serving_unit" data={[{ value: "g", label: "gramos" }, { value: "ml", label: "ml" }, { value: "caps", label: "cápsulas" }, { value: "tabs", label: "tabletas" }, { value: "scoop", label: "scoop" }]} label="Unidad" defaultValue={editingSupplement.serving_unit || "g"} /></Group>
              <NumberInput label="Calorías" name="calories" min={0} defaultValue={editingSupplement.calories || 0} />
              <Group grow><NumberInput label="Proteína (g)" name="protein" min={0} decimalScale={1} defaultValue={editingSupplement.protein || 0} /><NumberInput label="Carbohidratos (g)" name="carbs" min={0} decimalScale={1} defaultValue={editingSupplement.carbs || 0} /><NumberInput label="Grasas (g)" name="fat" min={0} decimalScale={1} defaultValue={editingSupplement.fat || 0} /></Group>
              <Textarea label="Cómo tomar" name="usage_instructions" placeholder="Mezclar 1 scoop con 200ml de agua..." minRows={2} defaultValue={editingSupplement.how_to_take || ""} />
              <Group justify="flex-end" mt="md"><Button onClick={() => { closeEditSupplementModal(); setEditingSupplement(null); }} variant="default">Cancelar</Button><Button loading={updateSupplement.isPending} type="submit">Guardar Cambios</Button></Group>
            </Stack>
          </form>
        )}
      </BottomSheet>

      <RecipeFormModal opened={recipeModalOpened} onClose={() => { closeRecipeModal(); setEditingRecipe(null); }} recipe={editingRecipe} loading={createRecipeMutation.isPending || updateRecipeMutation.isPending}
        onSubmit={async (data) => { if (editingRecipe) { await updateRecipeMutation.mutateAsync({ id: editingRecipe.id, ...data }); notifications.show({ title: "Receta actualizada", message: (data as any).name, color: "green", icon: <IconCheck size={16} /> }); } else { await createRecipeMutation.mutateAsync(data); notifications.show({ title: "Receta creada", message: (data as any).name, color: "green", icon: <IconCheck size={16} /> }); } closeRecipeModal(); setEditingRecipe(null); }} />
      <RecipeDetailModal opened={recipeDetailOpened} onClose={() => { closeRecipeDetail(); setViewingRecipe(null); }} recipe={viewingRecipe}
        onEdit={(r) => { closeRecipeDetail(); setEditingRecipe(r); openRecipeModal(); }}
        onDuplicate={async (r) => { await duplicateRecipeMutation.mutateAsync(r.id); notifications.show({ title: "Receta duplicada", message: `${r.name} (copia)`, color: "teal" }); closeRecipeDetail(); }} />
    </Container>
  );
}

export default NutritionPage;
