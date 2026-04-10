import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Divider,
  Group,
  Loader,
  NumberInput,
  Pagination,
  Paper,
  Popover,
  Progress,
  ScrollArea,
  SegmentedControl,
  Select,
  Slider,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Switch,
  Modal,
  Tooltip,
} from "@mantine/core";
import { useDebouncedCallback, useDebouncedValue, useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import {
  IconApple,
  IconArrowsExchange,
  IconClock,
  IconCopy,
  IconEdit,
  IconPill,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconCalendarOff,
  IconX,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { nutritionApi } from "../../services/api";
import { calculateMacroPercentages, gramsFromPercentages } from "../../utils/calories";
import { BottomSheet } from "../common/BottomSheet";
import { RecipeFormModal } from "../recipes/RecipeFormModal";
import { useCreateRecipe } from "../../hooks/useRecipes";
import type { RecipeItem } from "../../types/recipe";

const FOOD_CATEGORIES = [
  { value: "Carnes", label: "Carnes" },
  { value: "Pescados y Mariscos", label: "Pescados y Mariscos" },
  { value: "Huevos", label: "Huevos" },
  { value: "Leche y Derivados", label: "Leche y Derivados" },
  { value: "Cereales y Derivados", label: "Cereales y Derivados" },
  { value: "Legumbres", label: "Legumbres" },
  { value: "Verduras", label: "Verduras" },
  { value: "Frutas", label: "Frutas" },
  { value: "Frutos Secos y Deshidratados", label: "Frutos Secos" },
  { value: "Aceites y Grasas", label: "Aceites y Grasas" },
  { value: "Dulces y Chocolate", label: "Dulces y Chocolate" },
  { value: "Bebidas", label: "Bebidas" },
  { value: "Suplementos Deportivos", label: "Suplementos Deportivos" },
];

const DAY_PLAN_OPTIONS = [
  { id: "day-1", dayName: "Lunes", value: "day-1" },
  { id: "day-2", dayName: "Martes", value: "day-2" },
  { id: "day-3", dayName: "Miércoles", value: "day-3" },
  { id: "day-4", dayName: "Jueves", value: "day-4" },
  { id: "day-5", dayName: "Viernes", value: "day-5" },
  { id: "day-6", dayName: "Sábado", value: "day-6" },
  { id: "day-7", dayName: "Domingo", value: "day-7" },
];

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  category: string;
  is_global?: boolean;
}

export interface Supplement {
  id: string;
  name: string;
  brand?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  serving_size: string;
  how_to_take?: string;
  timing?: string;
  is_global?: boolean;
}

export interface MealItem {
  id: string;
  food_id?: string;
  supplement_id?: string;
  food?: Food;
  supplement?: Supplement;
  quantity_grams: number;
  notes?: string;
  // New fields for food preparation details
  cooking_method?: string;
  brand?: string;
  recipe_group?: string;
  type: "food" | "supplement";
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  items: MealItem[];
}

export interface DayPlan {
  id: string;
  day: number;
  dayName: string;
  meals: Meal[];
  notes?: string;
  is_free_day?: boolean;
}

interface MealPlanBuilderProps {
  days: DayPlan[];
  onChange: (days: DayPlan[]) => void;
  availableFoods: Food[];
  availableSupplements?: Supplement[];
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  onTargetMacrosChange?: (targets: { protein: number; carbs: number; fat: number }) => void;
  selectedClient?: { first_name?: string; last_name?: string; weight_kg?: number; height_cm?: number; goals?: string; health_data?: { allergies?: string[]; intolerances?: string[] } } | null;
  foodFavorites?: string[];
  supplementFavorites?: string[];
  onToggleFoodFavorite?: (foodId: string, isFavorite: boolean) => void;
  onToggleSupplementFavorite?: (supplementId: string, isFavorite: boolean) => void;
  recipes?: Array<{ id: string; name: string; items?: Array<{ food_id?: string; name: string; calories?: number; protein?: number; carbs?: number; fat?: number; quantity_grams?: number; type?: string }>; total_calories?: number; total_protein?: number; total_carbs?: number; total_fat?: number; category?: string; difficulty?: string; prep_time_minutes?: number; cook_time_minutes?: number; servings?: number }>;
  startDate?: string | Date | null;
  totalWeeks?: number;
  currentWeek?: number;
  onWeekChange?: (week: number) => void;
  onCopyWeek?: (fromWeek: number, toWeek: number) => void;
}

function getNutritionDayDate(sd: string | Date | null | undefined, week: number, dayIndex: number): string | null {
  if (!sd) return null;
  const d = new Date(sd);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + (week - 1) * 7 + dayIndex);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function MealPlanBuilder({
  days,
  onChange,
  availableFoods,
  availableSupplements = [],
  targetCalories = 2000,
  targetProtein = 150,
  targetCarbs = 200,
  targetFat = 70,
  selectedClient,
  foodFavorites = [],
  supplementFavorites = [],
  onToggleFoodFavorite,
  onToggleSupplementFavorite,
  onTargetMacrosChange,
  recipes = [],
  startDate,
  totalWeeks = 1,
  currentWeek = 1,
  onWeekChange,
  onCopyWeek,
}: MealPlanBuilderProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [copyWeekTarget, setCopyWeekTarget] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string>(days[0]?.id || "");
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] =
    useDisclosure(false);
  const [createFoodModalOpened, { open: openCreateFoodModal, close: closeCreateFoodModal }] = useDisclosure(false);
  const [copyDayPopoverOpened, setCopyDayPopoverOpened] = useState(false);
  const [copyToDayIds, setCopyToDayIds] = useState<string[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [foodSearch, setFoodSearch] = useState("");
  const [supplementSearch, setSupplementSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState<string>("all");
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string | null>(null);
  const [supplementFilter, setSupplementFilter] = useState<string>("all");
  const [foodPage, setFoodPage] = useState(1);
  const [debouncedFoodSearch] = useDebouncedValue(foodSearch, 300);
  const [
    shoppingListOpened,
    { open: openShoppingList, close: closeShoppingList },
  ] = useDisclosure(false);
  const queryClient = useQueryClient();

  // Recipe grouping state
  const [groupingMealId, setGroupingMealId] = useState<string | null>(null);
  const [selectedForGrouping, setSelectedForGrouping] = useState<Set<string>>(new Set());
  const [recipeModalOpened, { open: openRecipeModal, close: closeRecipeModal }] = useDisclosure(false);
  const [prefilledRecipeItems, setPrefilledRecipeItems] = useState<RecipeItem[]>([]);
  const createRecipeMutation = useCreateRecipe();

  const startGroupingMode = (mealId: string) => {
    setGroupingMealId(mealId);
    setSelectedForGrouping(new Set());
  };

  const cancelGroupingMode = () => {
    setGroupingMealId(null);
    setSelectedForGrouping(new Set());
  };

  const toggleItemForGrouping = (itemId: string) => {
    setSelectedForGrouping((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const confirmGroupSelection = () => {
    if (selectedForGrouping.size < 2 || !groupingMealId) return;
    const currentDayData = days.find((d) => d.id === activeDay);
    const meal = currentDayData?.meals.find((m) => m.id === groupingMealId);
    if (!meal) return;

    const items: RecipeItem[] = meal.items
      .filter((i) => selectedForGrouping.has(i.id))
      .map((i) => {
        const data = i.type === "food" ? i.food : i.supplement;
        const servingSizeGrams = parseFloat(data?.serving_size || "100") || 100;
        const factor = i.quantity_grams / servingSizeGrams;
        return {
          food_id: i.food_id || i.supplement_id || "",
          name: data?.name || "",
          type: i.type,
          quantity_grams: i.quantity_grams,
          calories: (data?.calories || 0) * factor,
          protein: (data?.protein || 0) * factor,
          carbs: (data?.carbs || 0) * factor,
          fat: (data?.fat || 0) * factor,
        };
      });

    setPrefilledRecipeItems(items);
    openRecipeModal();
  };

  const handleRecipeCreatedFromGrouping = async (data: object) => {
    await createRecipeMutation.mutateAsync(data);
    const recipeName = (data as { name?: string }).name || "Receta";
    if (groupingMealId) {
      onChange(days.map((d) =>
        d.id === activeDay
          ? { ...d, meals: d.meals.map((m) =>
              m.id === groupingMealId
                ? { ...m, items: m.items.map((i) => selectedForGrouping.has(i.id) ? { ...i, recipe_group: recipeName } : i) }
                : m
            ) }
          : d
      ));
    }
    cancelGroupingMode();
    closeRecipeModal();
  };

  // Macro target percentages (for percentage-driven mode)
  const totalCalsFromTargets = targetProtein * 4 + targetCarbs * 4 + targetFat * 9;
  const defaultPcts = totalCalsFromTargets > 0
    ? {
        protein: Math.round((targetProtein * 4 / totalCalsFromTargets) * 100),
        carbs: Math.round((targetCarbs * 4 / totalCalsFromTargets) * 100),
        fat: Math.round((targetFat * 9 / totalCalsFromTargets) * 100),
      }
    : { protein: 30, carbs: 40, fat: 30 };
  const [macroPct, setMacroPct] = useState(defaultPcts);
  const internalSliderChange = useRef(false);
  useEffect(() => {
    if (internalSliderChange.current) {
      internalSliderChange.current = false;
      return;
    }
    if (totalCalsFromTargets > 0) {
      setMacroPct({
        protein: Math.round((targetProtein * 4 / totalCalsFromTargets) * 100),
        carbs: Math.round((targetCarbs * 4 / totalCalsFromTargets) * 100),
        fat: Math.round((targetFat * 9 / totalCalsFromTargets) * 100),
      });
    }
  }, [targetProtein, targetCarbs, targetFat, totalCalsFromTargets]);

  const createFoodForm = useForm({
    initialValues: {
      name: "",
      category: "Otros",
      serving_size: 100,
      serving_unit: "g",
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
    },
    validate: {
      name: (v) => (v.trim().length < 2 ? "Nombre requerido (mín. 2 caracteres)" : null),
    },
  });

  const createFoodMutation = useMutation({
    mutationFn: async (data: typeof createFoodForm.values) => {
      const res = await nutritionApi.createFood({
        name: data.name.trim(),
        category: data.category || undefined,
        serving_size: data.serving_size,
        serving_unit: data.serving_unit,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        fiber_g: data.fiber_g || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods-modal-search"] });
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      notifications.show({
        title: "Alimento creado",
        message: "El alimento ha sido creado correctamente",
        color: "green",
      });
    },
  });

  const FOODS_PER_PAGE = 30;

  // Hook para buscar alimentos desde el servidor con paginación
  const { data: serverFoodsData, isLoading: isLoadingServerFoods } = useQuery({
    queryKey: ["foods-modal-search", debouncedFoodSearch, foodPage],
    queryFn: async () => {
      const response = await nutritionApi.foods({
        page: foodPage,
        page_size: FOODS_PER_PAGE,
        search: debouncedFoodSearch || undefined,
      });
      const data = response.data;
      return {
        items: (data?.items || []).map((food: any) => ({
          id: food.id,
          name: food.name || "Sin nombre",
          calories: food.calories || 0,
          protein: food.protein_g || 0,
          carbs: food.carbs_g || 0,
          fat: food.fat_g || 0,
          serving_size: food.quantity || `${food.serving_size || 100}g`,
          category: food.category || "Otros",
        })),
        total: data?.total || 0,
        totalPages: Math.ceil((data?.total || 0) / FOODS_PER_PAGE),
      };
    },
    enabled: foodModalOpened,
    placeholderData: (previousData) => previousData,
  });

  // Reset page when search changes
  const handleFoodSearchChange = (value: string) => {
    setFoodSearch(value);
    setFoodPage(1);
  };

  const currentDay = days.find((d) => d.id === activeDay);

  const calculateItemMacros = useCallback((item: MealItem) => {
    const itemData = item.type === "food" ? item.food : item.supplement;
    if (!itemData) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const servingSizeGrams = parseFloat(itemData.serving_size) || 100;
    const factor = item.quantity_grams / servingSizeGrams;

    return {
      calories: (itemData.calories || 0) * factor,
      protein: (itemData.protein || 0) * factor,
      carbs: (itemData.carbs || 0) * factor,
      fat: (itemData.fat || 0) * factor,
    };
  }, []);

  const calculateDayMacros = useCallback((day: DayPlan) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    day.meals.forEach((meal) => {
      meal.items.forEach((item) => {
        const itemData = item.type === "food" ? item.food : item.supplement;
        if (!itemData) return;
        const servingSizeGrams = parseFloat(itemData.serving_size) || 100;
        const factor = item.quantity_grams / servingSizeGrams;
        calories += (itemData.calories || 0) * factor;
        protein += (itemData.protein || 0) * factor;
        carbs += (itemData.carbs || 0) * factor;
        fat += (itemData.fat || 0) * factor;
      });
    });
    return { calories, protein, carbs, fat };
  }, []);

  const calculateMealMacros = useCallback((meal: Meal) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    meal.items.forEach((item) => {
      const itemData = item.type === "food" ? item.food : item.supplement;
      if (!itemData) return;
      const servingSizeGrams = parseFloat(itemData.serving_size) || 100;
      const factor = item.quantity_grams / servingSizeGrams;
      calories += (itemData.calories || 0) * factor;
      protein += (itemData.protein || 0) * factor;
      carbs += (itemData.carbs || 0) * factor;
      fat += (itemData.fat || 0) * factor;
    });
    return { calories, protein, carbs, fat };
  }, []);

  const addMeal = useCallback((mealNumber: number) => {
    if (!currentDay) return;

    let mealTime: string;
    if (mealNumber === 999) {
      mealTime = "16:00";
    } else {
      const existingMeals = currentDay.meals || [];
      if (existingMeals.length === 0) {
        mealTime = "08:00";
      } else {
        const lastMeal = existingMeals[existingMeals.length - 1];
        const [h, m] = (lastMeal.time || "08:00").split(":").map(Number);
        const newHour = Math.min(h + 3, 23);
        mealTime = `${String(newHour).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
      }
    }

    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      name: mealNumber === 999 ? "Tentempié" : `Comida ${mealNumber}`,
      time: mealTime,
      items: [],
    };

    onChange(
      days.map((d) =>
        d.id === activeDay ? { ...d, meals: [...d.meals, newMeal] } : d
      )
    );
  }, [currentDay, activeDay, days, onChange]);

  const updateMealName = useCallback((mealId: string, name: string) => {
    onChange(
      days.map((d) =>
        d.id === activeDay
          ? {
              ...d,
              meals: d.meals.map((m) => (m.id === mealId ? { ...m, name } : m)),
            }
          : d
      )
    );
  }, [activeDay, days, onChange]);

  const updateMealTime = useCallback((mealId: string, time: string) => {
    onChange(
      days.map((d) =>
        d.id === activeDay
          ? {
              ...d,
              meals: d.meals.map((m) => (m.id === mealId ? { ...m, time } : m)),
            }
          : d
      )
    );
  }, [activeDay, days, onChange]);

  const removeMeal = useCallback((mealId: string) => {
    onChange(
      days.map((d) =>
        d.id === activeDay
          ? { ...d, meals: d.meals.filter((m) => m.id !== mealId) }
          : d
      )
    );
  }, [activeDay, days, onChange]);

  const moveMeal = useCallback((mealId: string, direction: "up" | "down") => {
    if (!currentDay) return;
    const meals = [...currentDay.meals];
    const idx = meals.findIndex((m) => m.id === mealId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= meals.length) return;
    [meals[idx], meals[swapIdx]] = [meals[swapIdx], meals[idx]];
    onChange(
      days.map((d) => d.id === activeDay ? { ...d, meals } : d)
    );
  }, [activeDay, currentDay, days, onChange]);

  const duplicateMeal = useCallback((mealId: string) => {
    if (!currentDay) return;
    const meal = currentDay.meals.find((m) => m.id === mealId);
    if (!meal) return;
    const newMeal: Meal = {
      ...meal,
      id: `meal-${Date.now()}`,
      name: `${meal.name} (copia)`,
      items: meal.items.map((item) => ({
        ...item,
        id: `item-${Date.now()}-${Math.random()}`,
      })),
    };
    const index = currentDay.meals.findIndex((m) => m.id === mealId);
    onChange(
      days.map((d) => {
        if (d.id !== activeDay) return d;
        const newMeals = [...d.meals];
        newMeals.splice(index + 1, 0, newMeal);
        return { ...d, meals: newMeals };
      })
    );
  }, [currentDay, activeDay, days, onChange]);

  const [moveMealsModalOpen, setMoveMealsModalOpen] = useState(false);
  const [moveMealsSelected, setMoveMealsSelected] = useState<Set<string>>(new Set());
  const [moveMealsTargetDay, setMoveMealsTargetDay] = useState<string | null>(null);

  const openMoveMealsModal = () => {
    setMoveMealsSelected(new Set());
    setMoveMealsTargetDay(null);
    setMoveMealsModalOpen(true);
  };

  const confirmMoveMeals = useCallback(() => {
    if (!currentDay || moveMealsSelected.size === 0 || !moveMealsTargetDay) return;
    const mealsToMove = currentDay.meals.filter((m) => moveMealsSelected.has(m.id));
    if (mealsToMove.length === 0) return;

    const copiedMeals = mealsToMove.map((m) => ({
      ...m,
      id: `meal-${Date.now()}-${Math.random()}`,
      items: m.items.map((i) => ({ ...i, id: `item-${Date.now()}-${Math.random()}` })),
    }));

    onChange(
      days.map((d) => {
        if (d.id === activeDay) {
          return { ...d, meals: d.meals.filter((m) => !moveMealsSelected.has(m.id)) };
        }
        if (d.id === moveMealsTargetDay) {
          return { ...d, meals: [...d.meals, ...copiedMeals] };
        }
        return d;
      })
    );
    setMoveMealsModalOpen(false);
  }, [currentDay, moveMealsSelected, moveMealsTargetDay, activeDay, days, onChange]);

  const openAddFood = (mealId: string) => {
    setSelectedMealId(mealId);
    openFoodModal();
  };

  const addFoodToMeal = (food: Food) => {
    if (!(selectedMealId && currentDay)) return;

    const newItem: MealItem = {
      id: `item-${Date.now()}`,
      food_id: food.id,
      food,
      quantity_grams: 100,
      type: "food",
    };

    onChange(
      days.map((d) =>
        d.id === activeDay
          ? {
              ...d,
              meals: d.meals.map((m) =>
                m.id === selectedMealId
                  ? { ...m, items: [...m.items, newItem] }
                  : m
              ),
            }
          : d
      )
    );
    closeFoodModal();
    setFoodSearch("");
  };

  const addSupplementToMeal = (supplement: Supplement) => {
    if (!(selectedMealId && currentDay)) return;

    const newItem: MealItem = {
      id: `item-${Date.now()}`,
      supplement_id: supplement.id,
      supplement,
      quantity_grams: 30,
      type: "supplement",
    };

    onChange(
      days.map((d) =>
        d.id === activeDay
          ? {
              ...d,
              meals: d.meals.map((m) =>
                m.id === selectedMealId
                  ? { ...m, items: [...m.items, newItem] }
                  : m
              ),
            }
          : d
      )
    );
    closeFoodModal();
    setSupplementSearch("");
  };

  const updateItemQuantityGramsImmediate = useCallback((
    mealId: string,
    itemId: string,
    quantity_grams: number
  ) => {
    onChange(
      days.map((d) =>
        d.id === activeDay
          ? {
              ...d,
              meals: d.meals.map((m) =>
                m.id === mealId
                  ? {
                      ...m,
                      items: m.items.map((i) =>
                        i.id === itemId ? { ...i, quantity_grams } : i
                      ),
                    }
                  : m
              ),
            }
          : d
      )
    );
  }, [days, activeDay, onChange]);

  const updateItemQuantityGrams = useDebouncedCallback(
    (mealId: string, itemId: string, quantity_grams: number) => {
      updateItemQuantityGramsImmediate(mealId, itemId, quantity_grams);
    },
    150
  );

  const updateItemNotes = useDebouncedCallback(
    (mealId: string, itemId: string, notes: string) => {
      onChange(
        days.map((d) =>
          d.id === activeDay
            ? {
                ...d,
                meals: d.meals.map((m) =>
                  m.id === mealId
                    ? {
                        ...m,
                        items: m.items.map((i) =>
                          i.id === itemId ? { ...i, notes } : i
                        ),
                      }
                    : m
                ),
              }
            : d
        )
      );
    },
    300
  );

  const removeItemFromMeal = useCallback((mealId: string, itemId: string) => {
    onChange(
      days.map((d) =>
        d.id === activeDay
          ? {
              ...d,
              meals: d.meals.map((m) =>
                m.id === mealId
                  ? { ...m, items: m.items.filter((i) => i.id !== itemId) }
                  : m
              ),
            }
          : d
      )
    );
  }, [activeDay, days, onChange]);

  /* updateItemDetails removed - now handled inline via updateItem for notes */

  const copyToSelectedDays = () => {
    if (!currentDay || copyToDayIds.length === 0) return;

    onChange(
      days.map((d) =>
        d.id === activeDay || !copyToDayIds.includes(d.id)
          ? d
          : {
              ...d,
              meals: currentDay.meals.map((m) => ({
                ...m,
                id: `meal-${Date.now()}-${Math.random()}`,
                items: m.items.map((i) => ({
                  ...i,
                  id: `item-${Date.now()}-${Math.random()}`,
                })),
              })),
            }
      )
    );
    setCopyDayPopoverOpened(false);
    setCopyToDayIds([]);
  };

  const handleCreateFood = async () => {
    const values = createFoodForm.values;
    try {
      const created = await createFoodMutation.mutateAsync(values);
      const food: Food = {
        id: created.id,
        name: created.name,
        calories: Number(created.calories ?? values.calories) || 0,
        protein: Number(created.protein_g ?? values.protein_g) || 0,
        carbs: Number(created.carbs_g ?? values.carbs_g) || 0,
        fat: Number(created.fat_g ?? values.fat_g) || 0,
        serving_size: `${created.serving_size ?? values.serving_size ?? 100}${created.serving_unit ?? values.serving_unit ?? "g"}`,
        category: created.category || values.category || "Otros",
      };
      closeCreateFoodModal();
      createFoodForm.reset();
      addFoodToMeal(food);
    } catch {
      // Error handled by mutation
    }
  };

  const shoppingList = useMemo(() => {
    const items: { [key: string]: { food: Food; totalQuantity: number } } = {};
    days.forEach((day) => {
      day.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          if (item.type === "food" && item.food) {
            const key = item.food_id || item.food.id;
            if (items[key]) {
              items[key].totalQuantity += item.quantity_grams;
            } else {
              items[key] = {
                food: item.food,
                totalQuantity: item.quantity_grams,
              };
            }
          }
        });
      });
    });
    return Object.values(items);
  }, [days]);

  const foodFavoritesSet = useMemo(() => new Set(foodFavorites), [foodFavorites]);
  const supplementFavoritesSet = useMemo(() => new Set(supplementFavorites), [supplementFavorites]);
  const isFoodFavorite = useCallback((foodId: string) => foodFavoritesSet.has(foodId), [foodFavoritesSet]);
  const isSupplementFavorite = useCallback((supplementId: string) => supplementFavoritesSet.has(supplementId), [supplementFavoritesSet]);

  const filteredFoods = useMemo(() => {
    const applyCategory = (list: Food[]) =>
      foodCategoryFilter ? list.filter((f) => f.category.toLowerCase().includes(foodCategoryFilter.toLowerCase())) : list;

    if (foodFilter === "favorites") {
      return applyCategory(
        availableFoods
          .filter((f) => isFoodFavorite(f.id))
          .filter((f) => {
            if (!foodSearch) return true;
            return f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
              f.category.toLowerCase().includes(foodSearch.toLowerCase());
          })
      );
    }
    const serverFoods = serverFoodsData?.items || [];
    return applyCategory([...serverFoods].sort((a: Food, b: Food) => {
      const aFav = isFoodFavorite(a.id) ? 0 : 1;
      const bFav = isFoodFavorite(b.id) ? 0 : 1;
      return aFav - bFav;
    }));
  }, [foodFilter, availableFoods, foodFavorites, foodSearch, serverFoodsData, foodCategoryFilter]);

  const filteredSupplements = useMemo(() =>
    availableSupplements
      .filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(supplementSearch.toLowerCase());
        const matchesFilter = supplementFilter === "all" || isSupplementFavorite(s.id);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const aFav = isSupplementFavorite(a.id) ? 0 : 1;
        const bFav = isSupplementFavorite(b.id) ? 0 : 1;
        return aFav - bFav;
      }),
    [availableSupplements, supplementSearch, supplementFilter, supplementFavorites]
  );

  const dayMacros = useMemo(
    () => currentDay ? calculateDayMacros(currentDay) : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    [currentDay]
  );

  const dayMacroPcts = useMemo(
    () => calculateMacroPercentages(
      dayMacros.calories,
      dayMacros.protein,
      dayMacros.carbs,
      dayMacros.fat
    ),
    [dayMacros]
  );

  const applyPercentagesToTargets = useCallback((pct: { protein: number; carbs: number; fat: number }) => {
    internalSliderChange.current = true;
    const grams = gramsFromPercentages(targetCalories, pct.protein, pct.carbs, pct.fat);
    onTargetMacrosChange?.({ protein: grams.protein_g, carbs: grams.carbs_g, fat: grams.fat_g });
  }, [targetCalories, onTargetMacrosChange]);

  const clampAndNormalize = (
    changed: "protein" | "carbs" | "fat",
    newVal: number
  ): { protein: number; carbs: number; fat: number } => {
    const clamped = Math.max(0, Math.min(100, newVal));
    const others =
      changed === "protein" ? (["carbs", "fat"] as const) : changed === "carbs" ? (["protein", "fat"] as const) : (["protein", "carbs"] as const);
    const otherSum = macroPct[others[0]] + macroPct[others[1]];
    const remaining = 100 - clamped;
    if (otherSum === 0) {
      const half = Math.round(remaining / 2);
      return {
        ...macroPct,
        [changed]: clamped,
        [others[0]]: half,
        [others[1]]: remaining - half,
      };
    }
    const scale = remaining / otherSum;
    const first = Math.round(macroPct[others[0]] * scale);
    const second = remaining - first;
    return {
      ...macroPct,
      [changed]: clamped,
      [others[0]]: first,
      [others[1]]: second,
    };
  };

  return (
    <>
      {selectedClient && (
        <Box mb="md" p="sm" style={{ background: "var(--nv-surface-subtle)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
          <Group gap="sm">
            <Avatar size={36} radius="xl">{selectedClient.first_name?.[0] || "?"}</Avatar>
            <Box>
              <Text size="sm" fw={600}>{selectedClient.first_name} {selectedClient.last_name}</Text>
              <Text size="xs" c="dimmed">
                {selectedClient.weight_kg != null ? `${selectedClient.weight_kg}kg` : ""}
                {selectedClient.weight_kg != null && selectedClient.height_cm != null ? " | " : ""}
                {selectedClient.height_cm != null ? `${selectedClient.height_cm}cm` : ""}
                {(selectedClient.weight_kg != null || selectedClient.height_cm != null) && selectedClient.goals ? " | " : ""}
                {selectedClient.goals || "Sin objetivos"}
              </Text>
              {(selectedClient.health_data?.allergies?.length || selectedClient.health_data?.intolerances?.length) ? (
                <Group gap={4} mt={4}>
                  {selectedClient.health_data?.allergies?.map((a: string) => (
                    <Badge key={a} size="xs" color="red" variant="light">{a}</Badge>
                  ))}
                  {selectedClient.health_data?.intolerances?.map((i: string) => (
                    <Badge key={i} size="xs" color="orange" variant="light">{i}</Badge>
                  ))}
                </Group>
              ) : null}
            </Box>
          </Group>
        </Box>
      )}

      {totalWeeks > 1 && (
        <Paper mb="md" p="sm" radius="lg" withBorder style={{ backgroundColor: "var(--nv-surface)" }}>
          <Group justify="space-between">
            <Group gap="sm">
              <Text fw={600} size="sm">Semana</Text>
              <Select
                data={Array.from({ length: totalWeeks }, (_, i) => ({
                  value: String(i + 1),
                  label: `Semana ${i + 1}`,
                }))}
                value={String(currentWeek)}
                onChange={(v) => { onWeekChange?.(Number(v) || 1); setActiveDay(days[0]?.id || ""); }}
                size="xs"
                radius="md"
                w={140}
              />
            </Group>
            {onCopyWeek && (
              <Group gap="xs">
                <Select
                  placeholder="Copiar a..."
                  data={Array.from({ length: totalWeeks }, (_, i) => ({
                    value: String(i + 1),
                    label: `Semana ${i + 1}`,
                  })).filter((w) => Number(w.value) !== currentWeek)}
                  value={copyWeekTarget}
                  onChange={setCopyWeekTarget}
                  size="xs"
                  radius="md"
                  w={140}
                  clearable
                />
                <Button
                  size="xs"
                  variant="light"
                  radius="md"
                  leftSection={<IconCopy size={14} />}
                  disabled={!copyWeekTarget}
                  onClick={() => {
                    if (copyWeekTarget) {
                      onCopyWeek(currentWeek, Number(copyWeekTarget));
                      setCopyWeekTarget(null);
                    }
                  }}
                >
                  Copiar semana
                </Button>
              </Group>
            )}
          </Group>
        </Paper>
      )}

      <Paper mb="md" p="md" radius="lg" withBorder style={{ backgroundColor: "var(--nv-surface)" }}>
        <Group justify="space-between" mb="md">
          <Text fw={600}>Plan nutricional</Text>
          <Group gap="xs">
            <Popover opened={copyDayPopoverOpened} onChange={setCopyDayPopoverOpened} position="bottom-end">
              <Popover.Target>
                <Button
                  leftSection={<IconCopy size={14} />}
                  size="xs"
                  variant="light"
                  radius="md"
                  onClick={() => {
                    setCopyDayPopoverOpened((o) => !o);
                    setCopyToDayIds(days.filter((d) => d.id !== activeDay).map((d) => d.id));
                  }}
                >
                  Copiar día a...
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="sm">
                  <Text size="sm" fw={500}>Copiar a días:</Text>
                  <Checkbox.Group value={copyToDayIds} onChange={setCopyToDayIds}>
                    <Stack gap="xs">
                      {DAY_PLAN_OPTIONS.filter((d) => d.id !== activeDay).map((d) => (
                        <Checkbox key={d.id} value={d.id} label={d.dayName} size="sm" />
                      ))}
                    </Stack>
                  </Checkbox.Group>
                  <Button size="xs" leftSection={<IconCopy size={12} />} onClick={copyToSelectedDays} disabled={copyToDayIds.length === 0}>
                    Copiar
                  </Button>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            {currentDay && currentDay.meals.length > 0 && (
              <Button
                leftSection={<IconArrowsExchange size={14} />}
                onClick={openMoveMealsModal}
                size="xs"
                variant="light"
                color="teal"
                radius="md"
              >
                Mover comidas
              </Button>
            )}
            <Button
              leftSection={<IconShoppingCart size={14} />}
              onClick={openShoppingList}
              size="xs"
              variant="light"
              radius="md"
            >
              Lista de Compra
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Box>
            <Group justify="space-between" mb={4}>
              <Text c="dimmed" size="xs">
                Calorías
              </Text>
              <Text fw={500} size="xs">
                {Math.round(dayMacros.calories)} / {targetCalories}
              </Text>
            </Group>
            <Progress
              color={dayMacros.calories > targetCalories ? "red" : "blue"}
              radius="xl"
              size="sm"
              value={(dayMacros.calories / targetCalories) * 100}
            />
          </Box>
          <Box>
            <Group justify="space-between" mb={4}>
              <Text c="dimmed" size="xs">
                Proteína
              </Text>
              <Text fw={500} size="xs">
                {Math.round(dayMacros.protein)}g ({dayMacroPcts.protein_pct}%) / {targetProtein}g
              </Text>
            </Group>
            <Progress
              color={dayMacros.protein > targetProtein ? "red" : "green"}
              radius="xl"
              size="sm"
              value={(dayMacros.protein / targetProtein) * 100}
            />
          </Box>
          <Box>
            <Group justify="space-between" mb={4}>
              <Text c="dimmed" size="xs">
                Carbohidratos
              </Text>
              <Text fw={500} size="xs">
                {Math.round(dayMacros.carbs)}g ({dayMacroPcts.carbs_pct}%) / {targetCarbs}g
              </Text>
            </Group>
            <Progress
              color={dayMacros.carbs > targetCarbs ? "red" : "orange"}
              radius="xl"
              size="sm"
              value={(dayMacros.carbs / targetCarbs) * 100}
            />
          </Box>
          <Box>
            <Group justify="space-between" mb={4}>
              <Text c="dimmed" size="xs">
                Grasas
              </Text>
              <Text fw={500} size="xs">
                {Math.round(dayMacros.fat)}g ({dayMacroPcts.fat_pct}%) / {targetFat}g
              </Text>
            </Group>
            <Progress
              color={dayMacros.fat > targetFat ? "red" : "grape"}
              radius="xl"
              size="sm"
              value={(dayMacros.fat / targetFat) * 100}
            />
          </Box>
        </SimpleGrid>

        {/* Target macro percentages - trainer can set % and recalculate grams */}
        {onTargetMacrosChange && (
          <Box mt="md" pt="md" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
            <Text size="sm" fw={500} mb="sm" c="dimmed">
              Objetivos por porcentaje (recalcula gramos según calorías)
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Box>
                <Group justify="space-between" mb={4}>
                  <Text size="xs">Proteína %</Text>
                  <Text fw={600} size="sm" c="green">{macroPct.protein}%</Text>
                </Group>
                <Slider
                  value={macroPct.protein}
                  onChange={(v: number) => {
                    const next = clampAndNormalize("protein", v);
                    setMacroPct(next);
                    applyPercentagesToTargets(next);
                  }}
                  min={5}
                  max={60}
                  step={1}
                  color="green"
                  size="sm"
                />
              </Box>
              <Box>
                <Group justify="space-between" mb={4}>
                  <Text size="xs">Carbohidratos %</Text>
                  <Text fw={600} size="sm" c="orange">{macroPct.carbs}%</Text>
                </Group>
                <Slider
                  value={macroPct.carbs}
                  onChange={(v: number) => {
                    const next = clampAndNormalize("carbs", v);
                    setMacroPct(next);
                    applyPercentagesToTargets(next);
                  }}
                  min={5}
                  max={70}
                  step={1}
                  color="orange"
                  size="sm"
                />
              </Box>
              <Box>
                <Group justify="space-between" mb={4}>
                  <Text size="xs">Grasas %</Text>
                  <Text fw={600} size="sm" c="grape">{macroPct.fat}%</Text>
                </Group>
                <Slider
                  value={macroPct.fat}
                  onChange={(v: number) => {
                    const next = clampAndNormalize("fat", v);
                    setMacroPct(next);
                    applyPercentagesToTargets(next);
                  }}
                  min={5}
                  max={60}
                  step={1}
                  color="grape"
                  size="sm"
                />
              </Box>
            </SimpleGrid>
            <Text size="xs" c="dimmed" mt="xs">
              Total: {macroPct.protein + macroPct.carbs + macroPct.fat}% • Objetivo: {Math.round((targetCalories * macroPct.protein / 100) / 4)}g P, {Math.round((targetCalories * macroPct.carbs / 100) / 4)}g C, {Math.round((targetCalories * macroPct.fat / 100) / 9)}g G
            </Text>
          </Box>
        )}
      </Paper>

      {isMobile ? (
        <Select
          value={activeDay}
          onChange={(v) => v && setActiveDay(v)}
          data={days.map((day, idx) => {
            const ds = getNutritionDayDate(startDate, currentWeek, idx);
            return {
              value: day.id,
              label: `${day.dayName}${ds ? ` (${ds})` : ""} — ${day.is_free_day ? "Libre" : `${day.meals?.length || 0} comidas`}`,
            };
          })}
          size="sm"
          radius="md"
          mb="md"
        />
      ) : (
        <SimpleGrid cols={7} mb="md">
          {days.map((day, idx) => {
            const ds = getNutritionDayDate(startDate, currentWeek, idx);
            return (
              <Paper
                key={day.id}
                p="xs"
                radius="md"
                withBorder
                style={{
                  borderColor: day.id === activeDay ? "var(--mantine-color-blue-5)" : undefined,
                  backgroundColor: day.is_free_day ? "var(--mantine-color-gray-0)" : undefined,
                  cursor: "pointer",
                }}
                onClick={() => setActiveDay(day.id)}
              >
                <Text ta="center" size="xs" fw={600}>
                  {day.dayName.slice(0, 3)}
                </Text>
                {ds && (
                  <Text ta="center" size="10px" c="dimmed">
                    {ds}
                  </Text>
                )}
                <Text ta="center" size="xs" c={day.is_free_day ? "dimmed" : "blue"}>
                  {day.is_free_day ? "Libre" : `${day.meals?.length || 0} comidas`}
                </Text>
              </Paper>
            );
          })}
        </SimpleGrid>
      )}

      <Box>

        {currentDay && (
          <Box key={currentDay.id}>
            <Group justify="flex-end" mb="sm">
              <Switch
                label="Día Libre"
                checked={currentDay.is_free_day || false}
                onChange={(e) => {
                  onChange(
                    days.map((d) =>
                      d.id === activeDay
                        ? { ...d, is_free_day: e.currentTarget.checked }
                        : d
                    )
                  );
                }}
                size="sm"
                color="teal"
              />
            </Group>
            {currentDay.is_free_day ? (
              <Paper p="xl" radius="lg" withBorder ta="center" style={{ backgroundColor: "var(--nv-surface)" }}>
                <ThemeIcon size={60} radius="xl" color="teal" variant="light" mb="md" style={{ margin: "0 auto" }}>
                  <IconCalendarOff size={30} />
                </ThemeIcon>
                <Text fw={700} size="lg" mb="xs">Día Libre</Text>
                <Text c="dimmed" size="sm">Este día no tiene comidas preasignadas. El cliente puede comer libremente.</Text>
              </Paper>
            ) : (
            <Stack gap="md">
              {currentDay.meals.map((meal) => {
                const mealMacros = calculateMealMacros(meal);

                return (
                  <Paper key={meal.id} p="md" radius="lg" withBorder style={{ backgroundColor: "var(--nv-surface)" }}>
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon
                          color="blue"
                          radius="md"
                          size="lg"
                          variant="light"
                        >
                          <IconApple size={18} />
                        </ThemeIcon>
                        <Box>
                          <Group gap={4}>
                            <TextInput
                              value={meal.name}
                              onChange={(e) =>
                                updateMealName(meal.id, e.target.value)
                              }
                              variant="unstyled"
                              size="sm"
                              styles={{
                                input: {
                                  fontWeight: 600,
                                  padding: 0,
                                  minWidth: 100,
                                },
                              }}
                            />
                            <Tooltip label="Editar nombre">
                              <ActionIcon size="xs" variant="subtle" color="gray">
                                <IconEdit size={12} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                          <Group gap={4}>
                            <IconClock size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
                            <TextInput
                              value={meal.time}
                              onChange={(e) =>
                                updateMealTime(meal.id, e.target.value)
                              }
                              placeholder="HH:MM"
                              variant="unstyled"
                              size="xs"
                              styles={{
                                input: {
                                  color: "var(--mantine-color-dimmed)",
                                  padding: 0,
                                  width: 50,
                                },
                              }}
                            />
                          </Group>
                        </Box>
                      </Group>
                      <Group gap="sm">
                        <Badge color="blue" variant="light" radius="md">
                          {Math.round(mealMacros.calories)} kcal
                        </Badge>
                        <Badge color="green" variant="outline" radius="md">
                          P: {Math.round(mealMacros.protein)}g
                        </Badge>
                        <Badge color="orange" variant="outline" radius="md">
                          C: {Math.round(mealMacros.carbs)}g
                        </Badge>
                        <Badge color="grape" variant="outline" radius="md">
                          G: {Math.round(mealMacros.fat)}g
                        </Badge>
                        <Tooltip label="Subir">
                          <ActionIcon
                            color="gray"
                            onClick={() => moveMeal(meal.id, "up")}
                            variant="subtle"
                            radius="md"
                            size="sm"
                          >
                            <IconChevronUp size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Bajar">
                          <ActionIcon
                            color="gray"
                            onClick={() => moveMeal(meal.id, "down")}
                            variant="subtle"
                            radius="md"
                            size="sm"
                          >
                            <IconChevronDown size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Duplicar bloque">
                          <ActionIcon
                            color="gray"
                            onClick={() => duplicateMeal(meal.id)}
                            variant="subtle"
                            radius="md"
                          >
                            <IconCopy size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <ActionIcon
                          color="red"
                          onClick={() => removeMeal(meal.id)}
                          variant="subtle"
                          radius="md"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>

                    <Stack gap="xs">
                      {(() => {
                        const recipeGroups = new Map<string, MealItem[]>();
                        const ungrouped: MealItem[] = [];
                        meal.items.forEach((item) => {
                          if (item.recipe_group) {
                            const group = recipeGroups.get(item.recipe_group) || [];
                            group.push(item);
                            recipeGroups.set(item.recipe_group, group);
                          } else {
                            ungrouped.push(item);
                          }
                        });
                        const rendered: React.ReactNode[] = [];
                        const renderedIds = new Set<string>();
                        recipeGroups.forEach((items, recipeName) => {
                          rendered.push(
                            <Paper key={`recipe-${recipeName}`} p="xs" radius="md" withBorder style={{ borderColor: "var(--mantine-color-teal-3)", borderStyle: "dashed" }}>
                              <Group justify="space-between" mb={4}>
                                <Badge color="teal" variant="light" size="sm">🍳 {recipeName}</Badge>
                                <ActionIcon
                                  size="xs"
                                  color="red"
                                  variant="subtle"
                                  onClick={() => {
                                    onChange(days.map((d) =>
                                      d.id === activeDay
                                        ? { ...d, meals: d.meals.map((m) =>
                                            m.id === meal.id
                                              ? { ...m, items: m.items.map((i) => i.recipe_group === recipeName ? { ...i, recipe_group: undefined } : i) }
                                              : m
                                          ) }
                                        : d
                                    ));
                                  }}
                                >
                                  <IconX size={10} />
                                </ActionIcon>
                              </Group>
                              <Stack gap={4}>
                                {items.map((item) => {
                                  renderedIds.add(item.id);
                                  const itemData = item.type === "food" ? item.food : item.supplement;
                                  return (
                                    <Group key={item.id} justify="space-between" px="xs">
                                      <Text size="xs">{itemData?.name} — {item.quantity_grams}g</Text>
                                      <Text size="xs" c="dimmed">{Math.round(calculateItemMacros(item).calories)} kcal</Text>
                                    </Group>
                                  );
                                })}
                              </Stack>
                              {(() => {
                                const totals = items.reduce((acc, it) => {
                                  const m = calculateItemMacros(it);
                                  return { calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat };
                                }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
                                return (
                                  <Group gap={6} mt={4} px="xs" justify="flex-end">
                                    <Badge size="xs" color="orange" variant="light">{Math.round(totals.calories)} kcal</Badge>
                                    <Badge size="xs" color="blue" variant="light">P: {Math.round(totals.protein)}g</Badge>
                                    <Badge size="xs" color="yellow" variant="light">C: {Math.round(totals.carbs)}g</Badge>
                                    <Badge size="xs" color="red" variant="light">G: {Math.round(totals.fat)}g</Badge>
                                  </Group>
                                );
                              })()}
                            </Paper>
                          );
                        });
                        return rendered;
                      })()}
                      {meal.items.filter((i) => !i.recipe_group).map((item) => {
                        const itemMacros = calculateItemMacros(item);
                        const itemData =
                          item.type === "food" ? item.food : item.supplement;
                        const isGroupingThisMeal = groupingMealId === meal.id;

                        return (
                          <Card
                            key={item.id}
                            padding="xs"
                            radius="md"
                            withBorder
                            style={{
                              backgroundColor: isGroupingThisMeal && selectedForGrouping.has(item.id)
                                ? "var(--mantine-color-teal-0)"
                                : "var(--nv-paper-bg)",
                              cursor: isGroupingThisMeal ? "pointer" : undefined,
                            }}
                            onClick={isGroupingThisMeal ? () => toggleItemForGrouping(item.id) : undefined}
                          >
                            <Group justify="space-between">
                              <Group gap="sm">
                                {isGroupingThisMeal && (
                                  <Checkbox
                                    checked={selectedForGrouping.has(item.id)}
                                    onChange={() => toggleItemForGrouping(item.id)}
                                    size="xs"
                                    color="teal"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )}
                                {item.type === "supplement" && (
                                  <ThemeIcon
                                    size="sm"
                                    color="grape"
                                    variant="light"
                                    radius="md"
                                  >
                                    <IconPill size={12} />
                                  </ThemeIcon>
                                )}
                                <Box>
                                  <Text fw={500} size="sm">
                                    {itemData?.name}
                                  </Text>
                                  {item.notes && (
                                    <Text size="xs" c="blue" fs="italic">{item.notes}</Text>
                                  )}
                                  {item.type === "food" && (item.cooking_method || item.brand) && (
                                    <Group gap={4}>
                                      {item.cooking_method && (
                                        <Badge size="xs" variant="light" color="cyan">
                                          {item.cooking_method}
                                        </Badge>
                                      )}
                                      {item.brand && (
                                        <Badge size="xs" variant="outline" color="gray">
                                          {item.brand}
                                        </Badge>
                                      )}
                                    </Group>
                                  )}
                                  {item.type === "supplement" &&
                                    item.supplement?.how_to_take && (
                                      <Text size="xs" c="dimmed" lineClamp={1}>
                                        {item.supplement.how_to_take}
                                      </Text>
                                    )}
                                  {item.type === "supplement" &&
                                    item.supplement?.timing && (
                                      <Badge size="xs" mt={2} variant="dot">
                                        {item.supplement.timing}
                                      </Badge>
                                    )}
                                </Box>
                                <Group gap={4}>
                                  <Badge size="xs" color="blue" variant="light" radius="sm">
                                    {Math.round(itemMacros.calories)} kcal
                                  </Badge>
                                  <Badge size="xs" color="green" variant="light" radius="sm">
                                    P: {Math.round(itemMacros.protein)}g
                                  </Badge>
                                  <Badge size="xs" color="orange" variant="light" radius="sm">
                                    C: {Math.round(itemMacros.carbs)}g
                                  </Badge>
                                  <Badge size="xs" color="grape" variant="light" radius="sm">
                                    G: {Math.round(itemMacros.fat)}g
                                  </Badge>
                                </Group>
                              </Group>
                              <Group gap="xs" wrap="nowrap">
                                <NumberInput
                                  value={item.quantity_grams}
                                  onChange={(v) =>
                                    updateItemQuantityGrams(
                                      meal.id,
                                      item.id,
                                      Number(v)
                                    )
                                  }
                                  min={1}
                                  max={1000}
                                  step={item.type === "supplement" ? 5 : 10}
                                  size="xs"
                                  w={80}
                                  suffix="g"
                                  radius="md"
                                />
                                <TextInput
                                  defaultValue={item.notes || ""}
                                  placeholder="Notas (ej: 1 pieza, a la plancha...)"
                                  size="xs"
                                  w={200}
                                  radius="md"
                                  onChange={(e) =>
                                    updateItemNotes(meal.id, item.id, e.target.value)
                                  }
                                />
                                <Popover width={250} position="bottom" withArrow shadow="md" radius="md">
                                  <Popover.Target>
                                    <Tooltip label="Instrucciones / Nota">
                                      <ActionIcon
                                        color={item.notes || item.cooking_method ? "blue" : "gray"}
                                        size="sm"
                                        variant={item.notes || item.cooking_method ? "light" : "subtle"}
                                        radius="md"
                                      >
                                        <IconEdit size={14} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Popover.Target>
                                  <Popover.Dropdown>
                                    <Stack gap="xs">
                                      <TextInput
                                        label="Instrucciones"
                                        placeholder="Ej: a la plancha, hervido..."
                                        size="xs"
                                        value={item.notes || ""}
                                        onChange={(e) => {
                                          onChange(
                                            days.map((d) =>
                                              d.id === activeDay
                                                ? {
                                                    ...d,
                                                    meals: d.meals.map((m) =>
                                                      m.id === meal.id
                                                        ? {
                                                            ...m,
                                                            items: m.items.map((i) =>
                                                              i.id === item.id ? { ...i, notes: e.target.value } : i
                                                            ),
                                                          }
                                                        : m
                                                    ),
                                                  }
                                                : d
                                            )
                                          );
                                        }}
                                      />
                                    </Stack>
                                  </Popover.Dropdown>
                                </Popover>
                                <ActionIcon
                                  color="red"
                                  onClick={() =>
                                    removeItemFromMeal(meal.id, item.id)
                                  }
                                  size="sm"
                                  variant="subtle"
                                  radius="md"
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Group>
                            </Group>
                          </Card>
                        );
                      })}
                    </Stack>

                    <Group mt="sm" gap="xs">
                      <Button
                        leftSection={<IconPlus size={14} />}
                        onClick={() => openAddFood(meal.id)}
                        size="xs"
                        variant="light"
                        radius="md"
                      >
                        Añadir Alimento o Suplemento
                      </Button>
                      {groupingMealId === meal.id ? (
                        <>
                          <Button
                            size="xs"
                            color="teal"
                            radius="md"
                            disabled={selectedForGrouping.size < 2}
                            onClick={confirmGroupSelection}
                          >
                            Crear Receta ({selectedForGrouping.size} seleccionados)
                          </Button>
                          <Button
                            size="xs"
                            variant="subtle"
                            color="gray"
                            radius="md"
                            onClick={cancelGroupingMode}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        meal.items.filter((i) => !i.recipe_group).length >= 2 && (
                          <Button
                            size="xs"
                            variant="subtle"
                            color="teal"
                            radius="md"
                            onClick={() => startGroupingMode(meal.id)}
                          >
                            Agrupar como Receta
                          </Button>
                        )
                      )}
                    </Group>
                  </Paper>
                );
              })}

              <Divider
                label="Añadir comida"
                labelPosition="center"
                style={{ borderColor: "var(--nv-border)" }}
              />

              <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
                <Button
                  color="blue"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addMeal(1)}
                  variant="light"
                  radius="md"
                  size="xs"
                >
                  Comida 1
                </Button>
                <Button
                  color="green"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addMeal(2)}
                  variant="light"
                  radius="md"
                  size="xs"
                >
                  Comida 2
                </Button>
                <Button
                  color="orange"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addMeal(3)}
                  variant="light"
                  radius="md"
                  size="xs"
                >
                  Comida 3
                </Button>
                <Button
                  color="yellow"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addMeal(4)}
                  variant="light"
                  radius="md"
                  size="xs"
                >
                  Comida 4
                </Button>
                <Button
                  color="red"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addMeal(5)}
                  variant="light"
                  radius="md"
                  size="xs"
                >
                  Comida 5
                </Button>
                <Button
                  color="grape"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addMeal(999)}
                  variant="light"
                  radius="md"
                  size="xs"
                >
                  Snack
                </Button>
              </SimpleGrid>
            </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* Food/Supplement Selection Modal */}
      <BottomSheet
        onClose={closeFoodModal}
        opened={foodModalOpened}
        size="lg"
        title="Seleccionar Alimento o Suplemento"
        radius="lg"
      >
        <Tabs defaultValue="foods">
          <Tabs.List mb="md">
            <Tabs.Tab value="foods" leftSection={<IconApple size={14} />}>
              Alimentos
            </Tabs.Tab>
            <Tabs.Tab value="supplements" leftSection={<IconPill size={14} />}>
              Suplementos
            </Tabs.Tab>
            <Tabs.Tab value="recipes" leftSection={<IconStar size={14} />}>
              Recetas
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="foods">
            <Group mb="md" gap="sm">
              <Button
                variant="light"
                color="green"
                leftSection={<IconPlus size={16} />}
                onClick={openCreateFoodModal}
                size="xs"
              >
                Crear alimento
              </Button>
              <TextInput
                leftSection={<IconSearch size={16} />}
                onChange={(e) => handleFoodSearchChange(e.target.value)}
                placeholder="Buscar alimentos..."
                value={foodSearch}
                radius="md"
                style={{ flex: 1 }}
              />
              <SegmentedControl
                value={foodFilter}
                onChange={(v) => {
                  setFoodFilter(v);
                  setFoodPage(1);
                }}
                data={[
                  { label: "Todos", value: "all" },
                  { label: "⭐ Favoritos", value: "favorites" },
                ]}
                size="xs"
                radius="md"
              />
            </Group>
            <Group mb="xs">
              <Select
                data={FOOD_CATEGORIES}
                placeholder="Filtrar por categoría"
                clearable
                size="xs"
                radius="md"
                value={foodCategoryFilter}
                onChange={setFoodCategoryFilter}
                style={{ flex: 1 }}
              />
            </Group>
            
            {/* Info de resultados */}
            {foodFilter === "all" && serverFoodsData && (
              <Group justify="space-between" mb="xs">
                <Text c="dimmed" size="xs">
                  {serverFoodsData.total > 0 
                    ? `${(foodPage - 1) * FOODS_PER_PAGE + 1} - ${Math.min(foodPage * FOODS_PER_PAGE, serverFoodsData.total)} de ${serverFoodsData.total.toLocaleString()}`
                    : "0 resultados"
                  }
                  {debouncedFoodSearch && ` • "${debouncedFoodSearch}"`}
                </Text>
                {isLoadingServerFoods && <Loader size="xs" />}
              </Group>
            )}

            <ScrollArea h={350}>
              {isLoadingServerFoods && foodFilter === "all" ? (
                <Center py="xl">
                  <Loader size="md" />
                </Center>
              ) : (
                <Stack gap="xs">
                  {filteredFoods.map((food: Food) => {
                    const isFav = isFoodFavorite(food.id);
                    return (
                      <Card
                        key={food.id}
                        padding="sm"
                        radius="md"
                        style={{ 
                          cursor: "pointer",
                          borderColor: isFav ? "var(--mantine-color-yellow-5)" : undefined,
                          backgroundColor: isFav ? "var(--mantine-color-yellow-0)" : undefined,
                        }}
                        withBorder
                      >
                        <Group justify="space-between">
                          <Box onClick={() => addFoodToMeal(food)} style={{ flex: 1, cursor: "pointer" }}>
                            <Group gap="xs">
                              {isFav && <IconStarFilled size={14} color="var(--mantine-color-yellow-6)" />}
                              <Text fw={500} size="sm">
                                {food.name}
                              </Text>
                            </Group>
                            <Group gap="xs">
                              <Badge size="xs" variant="light">
                                {food.category}
                              </Badge>
                              <Text c="dimmed" size="xs">
                                {food.serving_size}
                              </Text>
                            </Group>
                          </Box>
                          <Group gap="xs">
                            <Badge color="blue" variant="light">
                              {food.calories} kcal
                            </Badge>
                            <Badge size="xs" variant="outline">
                              P: {food.protein}g
                            </Badge>
                            <Badge size="xs" variant="outline">
                              C: {food.carbs}g
                            </Badge>
                            <Badge size="xs" variant="outline">
                              G: {food.fat}g
                            </Badge>
                            {onToggleFoodFavorite && (
                              <ActionIcon
                                variant={isFav ? "filled" : "subtle"}
                                color="yellow"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFoodFavorite(food.id, isFav);
                                }}
                              >
                                {isFav ? <IconStarFilled size={14} /> : <IconStar size={14} />}
                              </ActionIcon>
                            )}
                          </Group>
                        </Group>
                      </Card>
                    );
                  })}
                  {filteredFoods.length === 0 && !isLoadingServerFoods && (
                    <Text c="dimmed" ta="center" py="xl">
                      {foodFilter === "favorites" 
                        ? "No tienes alimentos favoritos" 
                        : "No se encontraron alimentos"}
                    </Text>
                  )}
                </Stack>
              )}
            </ScrollArea>
            
            {/* Paginación para alimentos */}
            {foodFilter === "all" && serverFoodsData && serverFoodsData.totalPages > 1 && (
              <Center mt="md">
                <Pagination
                  value={foodPage}
                  onChange={setFoodPage}
                  total={serverFoodsData.totalPages}
                  size="sm"
                  boundaries={1}
                  siblings={1}
                />
              </Center>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="supplements">
            <Group mb="md" gap="sm">
              <TextInput
                leftSection={<IconSearch size={16} />}
                onChange={(e) => setSupplementSearch(e.target.value)}
                placeholder="Buscar suplementos..."
                value={supplementSearch}
                radius="md"
                style={{ flex: 1 }}
              />
              <SegmentedControl
                value={supplementFilter}
                onChange={setSupplementFilter}
                data={[
                  { label: "Todos", value: "all" },
                  { label: "⭐ Favoritos", value: "favorites" },
                ]}
                size="xs"
                radius="md"
              />
            </Group>
            <ScrollArea h={400}>
              <Stack gap="xs">
                {filteredSupplements.map((supplement) => {
                  const isFav = isSupplementFavorite(supplement.id);
                  return (
                    <Card
                      key={supplement.id}
                      padding="sm"
                      radius="md"
                      style={{ 
                        cursor: "pointer",
                        borderColor: isFav ? "var(--mantine-color-yellow-5)" : undefined,
                        backgroundColor: isFav ? "var(--mantine-color-yellow-0)" : undefined,
                      }}
                      withBorder
                    >
                      <Group justify="space-between">
                        <Box onClick={() => addSupplementToMeal(supplement)} style={{ flex: 1, cursor: "pointer" }}>
                          <Group gap="xs">
                            {isFav && <IconStarFilled size={14} color="var(--mantine-color-yellow-6)" />}
                            <Text fw={500} size="sm">
                              {supplement.name}
                            </Text>
                          </Group>
                          {supplement.brand && (
                            <Text size="xs" c="dimmed">
                              {supplement.brand}
                            </Text>
                          )}
                          {supplement.how_to_take && (
                            <Text size="xs" c="dimmed" mt={4} lineClamp={1}>
                              💊 {supplement.how_to_take}
                            </Text>
                          )}
                          {supplement.timing && (
                            <Badge size="xs" mt={4} variant="dot" color="grape">
                              {supplement.timing}
                            </Badge>
                          )}
                        </Box>
                        <Group gap="xs">
                          {supplement.calories && (
                            <Badge color="blue" variant="light">
                              {supplement.calories} kcal
                            </Badge>
                          )}
                          {supplement.protein && (
                            <Badge size="xs" variant="outline">
                              P: {supplement.protein}g
                            </Badge>
                          )}
                          {supplement.carbs && (
                            <Badge size="xs" variant="outline">
                              C: {supplement.carbs}g
                            </Badge>
                          )}
                          {supplement.fat && (
                            <Badge size="xs" variant="outline">
                              G: {supplement.fat}g
                            </Badge>
                          )}
                          {onToggleSupplementFavorite && (
                            <ActionIcon
                              variant={isFav ? "filled" : "subtle"}
                              color="yellow"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSupplementFavorite(supplement.id, isFav);
                              }}
                            >
                              {isFav ? <IconStarFilled size={14} /> : <IconStar size={14} />}
                            </ActionIcon>
                          )}
                        </Group>
                      </Group>
                    </Card>
                  );
                })}
                {filteredSupplements.length === 0 && (
                  <Text c="dimmed" ta="center" py="xl">
                    {supplementFilter === "favorites" 
                      ? "No tienes suplementos favoritos" 
                      : "No hay suplementos disponibles"}
                  </Text>
                )}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="recipes">
            <ScrollArea h={400}>
              {recipes.length > 0 ? (
                <Stack gap="xs">
                  {recipes.map((recipe: any) => {
                    const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
                    return (
                      <Card
                        key={recipe.id}
                        p="sm"
                        radius="md"
                        withBorder
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          if (!selectedMealId) return;
                          const items = (recipe.items || []).map((item: any) => ({
                            id: crypto.randomUUID(),
                            food_id: item.food_id || null,
                            food: {
                              id: item.food_id || recipe.id,
                              name: item.name,
                              calories: item.calories || 0,
                              protein: item.protein || 0,
                              carbs: item.carbs || 0,
                              fat: item.fat || 0,
                              serving_size: "100g",
                            },
                            quantity_grams: item.quantity_grams || 100,
                            type: item.type || "food",
                            recipe_group: recipe.name,
                          }));
                          onChange(
                            days.map((d) =>
                              d.id === activeDay
                                ? {
                                    ...d,
                                    meals: d.meals.map((m) =>
                                      m.id === selectedMealId
                                        ? { ...m, items: [...m.items, ...items] }
                                        : m
                                    ),
                                  }
                                : d
                            )
                          );
                          closeFoodModal();
                          notifications.show({ title: "Receta añadida", message: recipe.name, color: "teal" });
                        }}
                      >
                        <Group justify="space-between" mb={4}>
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text fw={600} size="sm" lineClamp={1}>{recipe.name}</Text>
                            <Group gap={4} mt={2}>
                              {recipe.category && <Badge size="xs" variant="light" color="blue">{recipe.category}</Badge>}
                              {recipe.difficulty && (
                                <Badge size="xs" variant="light" color={recipe.difficulty === "easy" ? "green" : recipe.difficulty === "medium" ? "yellow" : "red"}>
                                  {recipe.difficulty === "easy" ? "Fácil" : recipe.difficulty === "medium" ? "Media" : "Difícil"}
                                </Badge>
                              )}
                              {totalTime > 0 && <Badge size="xs" variant="light" color="orange">{totalTime} min</Badge>}
                              <Text size="xs" c="dimmed">{recipe.items?.length || 0} ingr.</Text>
                            </Group>
                          </Box>
                          <Stack gap={2} align="flex-end">
                            <Badge size="xs" variant="light" color="blue">{Math.round(recipe.total_calories || 0)} kcal</Badge>
                            <Group gap={2}>
                              <Badge size="xs" variant="light" color="green">P:{Math.round(recipe.total_protein || 0)}g</Badge>
                              <Badge size="xs" variant="light" color="orange">C:{Math.round(recipe.total_carbs || 0)}g</Badge>
                              <Badge size="xs" variant="light" color="grape">G:{Math.round(recipe.total_fat || 0)}g</Badge>
                            </Group>
                          </Stack>
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
                <Center py="xl">
                  <Text c="dimmed" size="sm">No hay recetas. Crea recetas desde la pestaña &quot;Recetas&quot; en Nutrición.</Text>
                </Center>
              )}
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </BottomSheet>

      {/* Create Food Sub-Modal */}
      <BottomSheet
        opened={createFoodModalOpened}
        onClose={() => { closeCreateFoodModal(); createFoodForm.reset(); }}
        title="Crear alimento"
        size="md"
      >
        <form onSubmit={createFoodForm.onSubmit(handleCreateFood)}>
          <Stack gap="sm">
            <TextInput
              label="Nombre"
              placeholder="Nombre del alimento"
              required
              {...createFoodForm.getInputProps("name")}
            />
            <Select
              data={FOOD_CATEGORIES}
              label="Categoría"
              {...createFoodForm.getInputProps("category")}
            />
            <Group grow>
              <NumberInput
                label="Porción (cantidad)"
                min={1}
                {...createFoodForm.getInputProps("serving_size")}
              />
              <TextInput
                label="Unidad"
                placeholder="g"
                {...createFoodForm.getInputProps("serving_unit")}
              />
            </Group>
            <Group grow>
              <NumberInput label="Calorías" min={0} {...createFoodForm.getInputProps("calories")} />
              <NumberInput label="Proteínas (g)" min={0} {...createFoodForm.getInputProps("protein_g")} />
            </Group>
            <Group grow>
              <NumberInput label="Carbohidratos (g)" min={0} {...createFoodForm.getInputProps("carbs_g")} />
              <NumberInput label="Grasas (g)" min={0} {...createFoodForm.getInputProps("fat_g")} />
            </Group>
            <NumberInput label="Fibra (g)" min={0} {...createFoodForm.getInputProps("fiber_g")} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => { closeCreateFoodModal(); createFoodForm.reset(); }}>
                Cancelar
              </Button>
              <Button type="submit" color="green" loading={createFoodMutation.isPending}>
                Crear y añadir
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Shopping List Modal */}
      <BottomSheet
        onClose={closeShoppingList}
        opened={shoppingListOpened}
        size="md"
        title="Lista de la Compra"
        radius="lg"
      >
        <ScrollArea h={400}>
          <Stack gap="xs">
            {shoppingList.map(({ food, totalQuantity }) => (
              <Card key={food.id} padding="sm" radius="md" withBorder>
                <Group justify="space-between">
                  <Text size="sm">{food.name}</Text>
                  <Badge variant="light">{totalQuantity}g</Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea>
        <Button
          fullWidth
          leftSection={<IconShoppingCart size={16} />}
          mt="md"
          radius="md"
        >
          Exportar Lista
        </Button>
      </BottomSheet>

      <RecipeFormModal
        opened={recipeModalOpened}
        onClose={() => { closeRecipeModal(); cancelGroupingMode(); }}
        onSubmit={handleRecipeCreatedFromGrouping}
        recipe={prefilledRecipeItems.length > 0 ? { id: "", workspace_id: null, name: "", items: prefilledRecipeItems, tags: [], servings: 1, is_public: false, is_global: false, total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0, total_fiber: 0, total_sugar: 0 } : null}
        loading={createRecipeMutation.isPending}
      />

      <Modal
        opened={moveMealsModalOpen}
        onClose={() => setMoveMealsModalOpen(false)}
        title="Mover comidas a otro día"
        centered
        radius="lg"
      >
        <Stack gap="md">
          <Text size="sm" fw={500}>Selecciona las comidas a mover:</Text>
          {currentDay?.meals.map((meal) => (
            <Checkbox
              key={meal.id}
              label={`${meal.name} (${meal.time}) — ${meal.items.length} alimentos`}
              checked={moveMealsSelected.has(meal.id)}
              onChange={(e) => {
                const next = new Set(moveMealsSelected);
                if (e.currentTarget.checked) next.add(meal.id);
                else next.delete(meal.id);
                setMoveMealsSelected(next);
              }}
            />
          ))}
          <Divider />
          <Text size="sm" fw={500}>Día destino:</Text>
          <Select
            placeholder="Selecciona día"
            data={DAY_PLAN_OPTIONS.filter((d) => d.id !== activeDay).map((d) => ({
              value: d.id,
              label: d.dayName,
            }))}
            value={moveMealsTargetDay}
            onChange={setMoveMealsTargetDay}
          />
          <Button
            leftSection={<IconArrowsExchange size={16} />}
            onClick={confirmMoveMeals}
            disabled={moveMealsSelected.size === 0 || !moveMealsTargetDay}
            fullWidth
            radius="md"
            color="teal"
          >
            Mover {moveMealsSelected.size} comida{moveMealsSelected.size !== 1 ? "s" : ""}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
