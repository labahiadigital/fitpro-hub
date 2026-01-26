import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Pagination,
  Paper,
  Progress,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconApple,
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
} from "@tabler/icons-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { nutritionApi } from "../../services/api";

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  category: string;
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
}

export interface MealItem {
  id: string;
  food_id?: string;
  supplement_id?: string;
  food?: Food;
  supplement?: Supplement;
  quantity_grams: number;
  notes?: string;
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
  // Favoritos
  foodFavorites?: string[];
  supplementFavorites?: string[];
  onToggleFoodFavorite?: (foodId: string, isFavorite: boolean) => void;
  onToggleSupplementFavorite?: (supplementId: string, isFavorite: boolean) => void;
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
  foodFavorites = [],
  supplementFavorites = [],
  onToggleFoodFavorite,
  onToggleSupplementFavorite,
}: MealPlanBuilderProps) {
  const [activeDay, setActiveDay] = useState<string>(days[0]?.id || "");
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] =
    useDisclosure(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [foodSearch, setFoodSearch] = useState("");
  const [supplementSearch, setSupplementSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState<string>("all");
  const [supplementFilter, setSupplementFilter] = useState<string>("all");
  const [foodPage, setFoodPage] = useState(1);
  const [debouncedFoodSearch] = useDebouncedValue(foodSearch, 300);
  const [
    shoppingListOpened,
    { open: openShoppingList, close: closeShoppingList },
  ] = useDisclosure(false);

  const FOODS_PER_PAGE = 30;

  // Hook para buscar alimentos desde el servidor con paginación
  const { data: serverFoodsData, isLoading: isLoadingServerFoods } = useQuery({
    queryKey: ["foods-modal-search", debouncedFoodSearch, foodPage],
    queryFn: async () => {
      const response = await nutritionApi.foods({
        page: foodPage,
        limit: FOODS_PER_PAGE,
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
    enabled: foodModalOpened, // Solo buscar cuando el modal está abierto
  });

  // Reset page when search changes
  const handleFoodSearchChange = (value: string) => {
    setFoodSearch(value);
    setFoodPage(1);
  };

  const currentDay = days.find((d) => d.id === activeDay);

  const calculateItemMacros = (item: MealItem) => {
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
  };

  const calculateDayMacros = (day: DayPlan) => {
    let calories = 0,
      protein = 0,
      carbs = 0,
      fat = 0;

    day.meals.forEach((meal) => {
      meal.items.forEach((item) => {
        const macros = calculateItemMacros(item);
        calories += macros.calories;
        protein += macros.protein;
        carbs += macros.carbs;
        fat += macros.fat;
      });
    });

    return { calories, protein, carbs, fat };
  };

  const calculateMealMacros = (meal: Meal) => {
    let calories = 0,
      protein = 0,
      carbs = 0,
      fat = 0;

    meal.items.forEach((item) => {
      const macros = calculateItemMacros(item);
      calories += macros.calories;
      protein += macros.protein;
      carbs += macros.carbs;
      fat += macros.fat;
    });

    return { calories, protein, carbs, fat };
  };

  const addMeal = (mealNumber: number) => {
    if (!currentDay) return;

    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      name: mealNumber === 999 ? "Snack" : `Comida ${mealNumber}`,
      time: mealNumber === 999 ? "16:00" : `${7 + mealNumber * 3}:00`,
      items: [],
    };

    onChange(
      days.map((d) =>
        d.id === activeDay ? { ...d, meals: [...d.meals, newMeal] } : d
      )
    );
  };

  const updateMealName = (mealId: string, name: string) => {
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
  };

  const updateMealTime = (mealId: string, time: string) => {
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
  };

  const removeMeal = (mealId: string) => {
    onChange(
      days.map((d) =>
        d.id === activeDay
          ? { ...d, meals: d.meals.filter((m) => m.id !== mealId) }
          : d
      )
    );
  };

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

  const updateItemQuantityGrams = (
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
  };

  const removeItemFromMeal = (mealId: string, itemId: string) => {
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
  };

  const copyDayToAll = () => {
    if (!currentDay) return;

    onChange(
      days.map((d) =>
        d.id === activeDay
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
  };

  const generateShoppingList = () => {
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
  };

  // Helper para verificar si un alimento es favorito
  const isFoodFavorite = (foodId: string) => foodFavorites.includes(foodId);
  const isSupplementFavorite = (supplementId: string) => supplementFavorites.includes(supplementId);

  // Obtener alimentos del servidor o filtrados localmente para favoritos
  const filteredFoods = (() => {
    // Si estamos en modo favoritos, filtrar de la lista local
    if (foodFilter === "favorites") {
      return availableFoods
        .filter((f) => isFoodFavorite(f.id))
        .filter((f) => {
          if (!foodSearch) return true;
          return f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
            f.category.toLowerCase().includes(foodSearch.toLowerCase());
        });
    }
    // De lo contrario, usar los datos del servidor
    const serverFoods = serverFoodsData?.items || [];
    // Ordenar favoritos primero
    return serverFoods.sort((a: Food, b: Food) => {
      const aFav = isFoodFavorite(a.id) ? 0 : 1;
      const bFav = isFoodFavorite(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  })();

  // Filtrar y ordenar suplementos (favoritos primero)
  const filteredSupplements = availableSupplements
    .filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(supplementSearch.toLowerCase());
      const matchesFilter = supplementFilter === "all" || isSupplementFavorite(s.id);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aFav = isSupplementFavorite(a.id) ? 0 : 1;
      const bFav = isSupplementFavorite(b.id) ? 0 : 1;
      return aFav - bFav;
    });

  const dayMacros = currentDay
    ? calculateDayMacros(currentDay)
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <>
      <Paper mb="md" p="md" radius="lg" withBorder style={{ backgroundColor: "var(--nv-surface)" }}>
        <Group justify="space-between" mb="md">
          <Text fw={600}>Resumen del Día</Text>
          <Group gap="xs">
            <Button
              leftSection={<IconCopy size={14} />}
              onClick={copyDayToAll}
              size="xs"
              variant="light"
              radius="md"
            >
              Copiar a todos los días
            </Button>
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
                {Math.round(dayMacros.protein)}g / {targetProtein}g
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
                {Math.round(dayMacros.carbs)}g / {targetCarbs}g
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
                {Math.round(dayMacros.fat)}g / {targetFat}g
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
      </Paper>

      <Tabs onChange={(v) => setActiveDay(v || days[0]?.id)} value={activeDay}>
        <Tabs.List mb="md">
          {days.map((day) => (
            <Tabs.Tab key={day.id} value={day.id}>
              {day.dayName}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {days.map((day) => (
          <Tabs.Panel key={day.id} value={day.id}>
            <Stack gap="md">
              {day.meals.map((meal) => {
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
                      {meal.items.map((item) => {
                        const itemMacros = calculateItemMacros(item);
                        const itemData =
                          item.type === "food" ? item.food : item.supplement;

                        return (
                          <Card
                            key={item.id}
                            padding="xs"
                            radius="md"
                            withBorder
                            style={{ backgroundColor: "var(--nv-paper-bg)" }}
                          >
                            <Group justify="space-between">
                              <Group gap="sm">
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
                                <Text c="dimmed" size="xs">
                                  {Math.round(itemMacros.calories)} kcal
                                </Text>
                              </Group>
                              <Group gap="xs">
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

                    <Button
                      leftSection={<IconPlus size={14} />}
                      mt="sm"
                      onClick={() => openAddFood(meal.id)}
                      size="xs"
                      variant="light"
                      radius="md"
                    >
                      Añadir Alimento o Suplemento
                    </Button>
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
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Food/Supplement Selection Modal */}
      <Modal
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
          </Tabs.List>

          <Tabs.Panel value="foods">
            <Group mb="md" gap="sm">
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
        </Tabs>
      </Modal>

      {/* Shopping List Modal */}
      <Modal
        onClose={closeShoppingList}
        opened={shoppingListOpened}
        size="md"
        title="Lista de la Compra"
        radius="lg"
      >
        <ScrollArea h={400}>
          <Stack gap="xs">
            {generateShoppingList().map(({ food, totalQuantity }) => (
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
      </Modal>
    </>
  );
}
