import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconApple,
  IconCoffee,
  IconCookie,
  IconCopy,
  IconMeat,
  IconPlus,
  IconSalad,
  IconSearch,
  IconShoppingCart,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

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

export interface MealItem {
  id: string;
  food_id: string;
  food: Food;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
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
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

export function MealPlanBuilder({
  days,
  onChange,
  availableFoods,
  targetCalories = 2000,
  targetProtein = 150,
  targetCarbs = 200,
  targetFat = 70,
}: MealPlanBuilderProps) {
  const [activeDay, setActiveDay] = useState<string>(days[0]?.id || "");
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] =
    useDisclosure(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [foodSearch, setFoodSearch] = useState("");
  const [
    shoppingListOpened,
    { open: openShoppingList, close: closeShoppingList },
  ] = useDisclosure(false);

  const currentDay = days.find((d) => d.id === activeDay);

  const getMealIcon = (type: Meal["type"]) => {
    switch (type) {
      case "breakfast":
        return IconCoffee;
      case "lunch":
        return IconSalad;
      case "dinner":
        return IconMeat;
      case "snack":
        return IconCookie;
      default:
        return IconApple;
    }
  };

  const getMealColor = (type: Meal["type"]) => {
    switch (type) {
      case "breakfast":
        return "orange";
      case "lunch":
        return "green";
      case "dinner":
        return "blue";
      case "snack":
        return "grape";
      default:
        return "gray";
    }
  };

  const calculateDayMacros = (day: DayPlan) => {
    let calories = 0,
      protein = 0,
      carbs = 0,
      fat = 0;

    day.meals.forEach((meal) => {
      meal.items.forEach((item) => {
        const multiplier = item.quantity;
        calories += item.food.calories * multiplier;
        protein += item.food.protein * multiplier;
        carbs += item.food.carbs * multiplier;
        fat += item.food.fat * multiplier;
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
      const multiplier = item.quantity;
      calories += item.food.calories * multiplier;
      protein += item.food.protein * multiplier;
      carbs += item.food.carbs * multiplier;
      fat += item.food.fat * multiplier;
    });

    return { calories, protein, carbs, fat };
  };

  const addMeal = (type: Meal["type"]) => {
    if (!currentDay) return;

    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      name:
        type === "breakfast"
          ? "Desayuno"
          : type === "lunch"
            ? "Almuerzo"
            : type === "dinner"
              ? "Cena"
              : "Snack",
      time:
        type === "breakfast"
          ? "08:00"
          : type === "lunch"
            ? "13:00"
            : type === "dinner"
              ? "20:00"
              : "16:00",
      type,
      items: [],
    };

    onChange(
      days.map((d) =>
        d.id === activeDay ? { ...d, meals: [...d.meals, newMeal] } : d
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
      quantity: 1,
      unit: food.serving_size,
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
  };

  const updateFoodQuantity = (
    mealId: string,
    itemId: string,
    quantity: number
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
                        i.id === itemId ? { ...i, quantity } : i
                      ),
                    }
                  : m
              ),
            }
          : d
      )
    );
  };

  const removeFoodFromMeal = (mealId: string, itemId: string) => {
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
          if (items[item.food_id]) {
            items[item.food_id].totalQuantity += item.quantity;
          } else {
            items[item.food_id] = {
              food: item.food,
              totalQuantity: item.quantity,
            };
          }
        });
      });
    });

    return Object.values(items);
  };

  const filteredFoods = availableFoods.filter(
    (f) =>
      f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(foodSearch.toLowerCase())
  );

  const dayMacros = currentDay
    ? calculateDayMacros(currentDay)
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <>
      <Paper mb="md" p="md" radius="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>Resumen del Día</Text>
          <Group gap="xs">
            <Button
              leftSection={<IconCopy size={14} />}
              onClick={copyDayToAll}
              size="xs"
              variant="light"
            >
              Copiar a todos los días
            </Button>
            <Button
              leftSection={<IconShoppingCart size={14} />}
              onClick={openShoppingList}
              size="xs"
              variant="light"
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
                const MealIcon = getMealIcon(meal.type);

                return (
                  <Paper key={meal.id} p="md" radius="lg" withBorder>
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon
                          color={getMealColor(meal.type)}
                          radius="md"
                          size="lg"
                          variant="light"
                        >
                          <MealIcon size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={600}>{meal.name}</Text>
                          <Text c="dimmed" size="xs">
                            {meal.time}
                          </Text>
                        </Box>
                      </Group>
                      <Group gap="sm">
                        <Badge color="blue" variant="light">
                          {Math.round(mealMacros.calories)} kcal
                        </Badge>
                        <Badge color="green" variant="outline">
                          P: {Math.round(mealMacros.protein)}g
                        </Badge>
                        <Badge color="orange" variant="outline">
                          C: {Math.round(mealMacros.carbs)}g
                        </Badge>
                        <Badge color="grape" variant="outline">
                          G: {Math.round(mealMacros.fat)}g
                        </Badge>
                        <ActionIcon
                          color="red"
                          onClick={() => removeMeal(meal.id)}
                          variant="subtle"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>

                    <Stack gap="xs">
                      {meal.items.map((item) => (
                        <Card key={item.id} padding="xs" radius="md" withBorder>
                          <Group justify="space-between">
                            <Group gap="sm">
                              <Text fw={500} size="sm">
                                {item.food.name}
                              </Text>
                              <Text c="dimmed" size="xs">
                                {Math.round(item.food.calories * item.quantity)}{" "}
                                kcal
                              </Text>
                            </Group>
                            <Group gap="xs">
                              <NumberInput
                                max={10}
                                min={0.5}
                                onChange={(v) =>
                                  updateFoodQuantity(
                                    meal.id,
                                    item.id,
                                    Number(v)
                                  )
                                }
                                size="xs"
                                step={0.5}
                                value={item.quantity}
                                w={70}
                              />
                              <Text c="dimmed" size="xs" w={60}>
                                {item.unit}
                              </Text>
                              <ActionIcon
                                color="red"
                                onClick={() =>
                                  removeFoodFromMeal(meal.id, item.id)
                                }
                                size="sm"
                                variant="subtle"
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Group>
                        </Card>
                      ))}
                    </Stack>

                    <Button
                      leftSection={<IconPlus size={14} />}
                      mt="sm"
                      onClick={() => openAddFood(meal.id)}
                      size="xs"
                      variant="light"
                    >
                      Añadir Alimento
                    </Button>
                  </Paper>
                );
              })}

              <Divider label="Añadir comida" labelPosition="center" />

              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <Button
                  color="orange"
                  leftSection={<IconCoffee size={16} />}
                  onClick={() => addMeal("breakfast")}
                  variant="light"
                >
                  Desayuno
                </Button>
                <Button
                  color="green"
                  leftSection={<IconSalad size={16} />}
                  onClick={() => addMeal("lunch")}
                  variant="light"
                >
                  Almuerzo
                </Button>
                <Button
                  color="blue"
                  leftSection={<IconMeat size={16} />}
                  onClick={() => addMeal("dinner")}
                  variant="light"
                >
                  Cena
                </Button>
                <Button
                  color="grape"
                  leftSection={<IconCookie size={16} />}
                  onClick={() => addMeal("snack")}
                  variant="light"
                >
                  Snack
                </Button>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Food Selection Modal */}
      <Modal
        onClose={closeFoodModal}
        opened={foodModalOpened}
        size="lg"
        title="Seleccionar Alimento"
      >
        <TextInput
          leftSection={<IconSearch size={16} />}
          mb="md"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFoodSearch(e.target.value)
          }
          placeholder="Buscar alimentos..."
          value={foodSearch}
        />
        <ScrollArea h={400}>
          <Stack gap="xs">
            {filteredFoods.map((food) => (
              <Card
                key={food.id}
                onClick={() => addFoodToMeal(food)}
                padding="sm"
                radius="md"
                style={{ cursor: "pointer" }}
                withBorder
              >
                <Group justify="space-between">
                  <Box>
                    <Text fw={500} size="sm">
                      {food.name}
                    </Text>
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
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea>
      </Modal>

      {/* Shopping List Modal */}
      <Modal
        onClose={closeShoppingList}
        opened={shoppingListOpened}
        size="md"
        title="Lista de la Compra"
      >
        <ScrollArea h={400}>
          <Stack gap="xs">
            {generateShoppingList().map(({ food, totalQuantity }) => (
              <Card key={food.id} padding="sm" radius="md" withBorder>
                <Group justify="space-between">
                  <Text size="sm">{food.name}</Text>
                  <Badge variant="light">
                    {totalQuantity} x {food.serving_size}
                  </Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea>
        <Button fullWidth leftSection={<IconShoppingCart size={16} />} mt="md">
          Exportar Lista
        </Button>
      </Modal>
    </>
  );
}
