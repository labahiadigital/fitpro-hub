import {
  Box,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Button,
  SimpleGrid,
  Progress,
  Paper,
  ThemeIcon,
  RingProgress,
  Center,
  Loader,
  Modal,
  TextInput,
  NumberInput,
  Select,
  ActionIcon,
  Checkbox,
  Tabs,
  Accordion,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import {
  IconApple,
  IconCalendarEvent,
  IconCheck,
  IconCoffee,
  IconFlame,
  IconHistory,
  IconPlus,
  IconSalad,
  IconSoup,
  IconTrash,
  IconMoon,
} from "@tabler/icons-react";
import { useState, useMemo } from "react";
import {
  useMyMealPlan,
  useNutritionLogs,
  useLogNutrition,
  useNutritionHistory,
} from "../../hooks/useClientPortal";

// Tipos de comidas con sus iconos
const MEAL_TYPES = [
  { value: "Desayuno", label: "Desayuno", icon: IconCoffee, time: "08:00" },
  { value: "Almuerzo", label: "Almuerzo", icon: IconSoup, time: "13:00" },
  { value: "Merienda", label: "Merienda", icon: IconApple, time: "17:00" },
  { value: "Cena", label: "Cena", icon: IconSalad, time: "21:00" },
  { value: "Snack", label: "Snack", icon: IconMoon, time: "23:00" },
];

interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
}

function MacroCard({
  label,
  current,
  target,
  unit,
  color,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <Card shadow="sm" padding="md" radius="lg" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">
          {label}
        </Text>
        <Badge color={color} variant="light" size="sm">
          {Math.round(percentage)}%
        </Badge>
      </Group>
      <Text size="xl" fw={700}>
        {current}
        <Text span size="sm" c="dimmed">
          /{target}
          {unit}
        </Text>
      </Text>
      <Progress value={percentage} color={color} size="sm" radius="xl" mt="xs" />
    </Card>
  );
}

// Modal para registrar comida
function LogMealModal({
  opened,
  onClose,
  onSubmit,
  isLoading,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    meal_name: string;
    foods: FoodItem[];
    notes?: string;
  }) => void;
  isLoading: boolean;
}) {
  const [foods, setFoods] = useState<FoodItem[]>([
    { name: "", calories: 0, protein: 0, carbs: 0, fat: 0, quantity: 1 },
  ]);

  const form = useForm({
    initialValues: {
      meal_name: "Desayuno",
      notes: "",
    },
  });

  const addFood = () => {
    setFoods([
      ...foods,
      { name: "", calories: 0, protein: 0, carbs: 0, fat: 0, quantity: 1 },
    ]);
  };

  const removeFood = (index: number) => {
    if (foods.length > 1) {
      setFoods(foods.filter((_, i) => i !== index));
    }
  };

  const updateFood = (index: number, field: keyof FoodItem, value: string | number) => {
    const newFoods = [...foods];
    newFoods[index] = { ...newFoods[index], [field]: value };
    setFoods(newFoods);
  };

  const handleSubmit = () => {
    const validFoods = foods.filter((f) => f.name.trim() !== "");
    if (validFoods.length === 0) return;

    onSubmit({
      meal_name: form.values.meal_name,
      foods: validFoods,
      notes: form.values.notes || undefined,
    });

    // Reset form
    form.reset();
    setFoods([{ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, quantity: 1 }]);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Registrar Comida"
      size="lg"
    >
      <Stack gap="md">
        <Select
          label="Tipo de comida"
          data={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))}
          {...form.getInputProps("meal_name")}
        />

        <Text fw={500} size="sm">
          Alimentos
        </Text>
        {foods.map((food, index) => (
          <Paper key={index} p="sm" withBorder radius="md">
            <Group align="flex-end" gap="xs">
              <TextInput
                label="Nombre"
                placeholder="Ej: Pechuga de pollo"
                value={food.name}
                onChange={(e) => updateFood(index, "name", e.target.value)}
                style={{ flex: 2 }}
              />
              <NumberInput
                label="Cantidad"
                value={food.quantity}
                onChange={(val) => updateFood(index, "quantity", val || 1)}
                min={0.1}
                step={0.5}
                decimalScale={1}
                style={{ width: 80 }}
              />
              <NumberInput
                label="Calorías"
                value={food.calories}
                onChange={(val) => updateFood(index, "calories", val || 0)}
                min={0}
                style={{ width: 90 }}
              />
              <NumberInput
                label="Proteína"
                value={food.protein}
                onChange={(val) => updateFood(index, "protein", val || 0)}
                min={0}
                decimalScale={1}
                style={{ width: 80 }}
              />
              <NumberInput
                label="Carbs"
                value={food.carbs}
                onChange={(val) => updateFood(index, "carbs", val || 0)}
                min={0}
                decimalScale={1}
                style={{ width: 80 }}
              />
              <NumberInput
                label="Grasas"
                value={food.fat}
                onChange={(val) => updateFood(index, "fat", val || 0)}
                min={0}
                decimalScale={1}
                style={{ width: 80 }}
              />
              <ActionIcon
                color="red"
                variant="light"
                onClick={() => removeFood(index)}
                disabled={foods.length === 1}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}

        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={addFood}
        >
          Añadir alimento
        </Button>

        <TextInput
          label="Notas (opcional)"
          placeholder="Añade notas sobre esta comida..."
          {...form.getInputProps("notes")}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="yellow"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={foods.every((f) => f.name.trim() === "")}
          >
            Registrar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Interface para comidas del plan
interface PlanMeal {
  id: string;
  name: string;
  time: string;
  items: Array<{
    id: string;
    food_id?: string;
    food?: {
      id: string;
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      serving_size: string;
    };
    quantity_grams: number;
    type: "food" | "supplement";
  }>;
}

interface PlanDay {
  id: string;
  day: number;
  dayName: string;
  meals: PlanMeal[];
  notes?: string;
}

// Modal para registrar comida del plan
function LogPlanMealModal({
  opened,
  onClose,
  onSubmit,
  isLoading,
  meal,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    meal_name: string;
    foods: FoodItem[];
    notes?: string;
  }) => void;
  isLoading: boolean;
  meal: PlanMeal | null;
}) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  // Initialize all items as checked when modal opens
  const handleOpen = () => {
    if (meal) {
      const initial: Record<string, boolean> = {};
      meal.items.forEach((item) => {
        initial[item.id] = true;
      });
      setCheckedItems(initial);
    }
  };

  // Reset when opened
  if (opened && Object.keys(checkedItems).length === 0 && meal) {
    handleOpen();
  }

  const handleSubmit = () => {
    if (!meal) return;

    const selectedItems = meal.items.filter((item) => checkedItems[item.id]);
    if (selectedItems.length === 0) return;

    const foods: FoodItem[] = selectedItems.map((item) => ({
      name: item.food?.name || "Alimento",
      calories: Math.round((item.food?.calories || 0) * (item.quantity_grams / 100)),
      protein: Math.round((item.food?.protein || 0) * (item.quantity_grams / 100)),
      carbs: Math.round((item.food?.carbs || 0) * (item.quantity_grams / 100)),
      fat: Math.round((item.food?.fat || 0) * (item.quantity_grams / 100)),
      quantity: item.quantity_grams,
    }));

    onSubmit({
      meal_name: meal.name,
      foods,
      notes: notes || undefined,
    });

    // Reset
    setCheckedItems({});
    setNotes("");
  };

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const totalMacros = useMemo(() => {
    if (!meal) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    return meal.items
      .filter((item) => checkedItems[item.id])
      .reduce(
        (acc, item) => ({
          calories: acc.calories + Math.round((item.food?.calories || 0) * (item.quantity_grams / 100)),
          protein: acc.protein + Math.round((item.food?.protein || 0) * (item.quantity_grams / 100)),
          carbs: acc.carbs + Math.round((item.food?.carbs || 0) * (item.quantity_grams / 100)),
          fat: acc.fat + Math.round((item.food?.fat || 0) * (item.quantity_grams / 100)),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
  }, [meal, checkedItems]);

  if (!meal) return null;

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setCheckedItems({});
        setNotes("");
        onClose();
      }}
      title={`Registrar ${meal.name}`}
      size="lg"
    >
      <Stack gap="md">
        <Paper p="md" radius="md" style={{ background: "var(--mantine-color-yellow-light)" }}>
          <Group justify="space-between">
            <Text fw={600}>{meal.name}</Text>
            <Badge variant="light" color="orange">
              <IconFlame size={12} style={{ marginRight: 4 }} />
              {totalMacros.calories} kcal
            </Badge>
          </Group>
          <Group gap="xs" mt="xs">
            <Badge size="sm" variant="outline" color="green">P: {totalMacros.protein}g</Badge>
            <Badge size="sm" variant="outline" color="blue">C: {totalMacros.carbs}g</Badge>
            <Badge size="sm" variant="outline" color="grape">G: {totalMacros.fat}g</Badge>
          </Group>
        </Paper>

        <Text fw={500} size="sm">
          Alimentos del plan ({Object.values(checkedItems).filter(Boolean).length}/{meal.items.length} seleccionados)
        </Text>
        
        <Stack gap="xs">
          {meal.items.map((item) => (
            <Paper key={item.id} p="sm" withBorder radius="md">
              <Checkbox
                checked={checkedItems[item.id] || false}
                onChange={() => toggleItem(item.id)}
                color="green"
                label={
                  <Group gap="sm" justify="space-between" style={{ flex: 1 }}>
                    <Box>
                      <Text fw={500} size="sm">{item.food?.name || "Alimento"}</Text>
                      <Text size="xs" c="dimmed">{item.quantity_grams}g</Text>
                    </Box>
                    <Badge variant="light" size="sm">
                      {Math.round((item.food?.calories || 0) * (item.quantity_grams / 100))} kcal
                    </Badge>
                  </Group>
                }
              />
            </Paper>
          ))}
        </Stack>

        <TextInput
          label="Notas (opcional)"
          placeholder="¿Cómo te sentiste? ¿Hiciste algún cambio?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="yellow"
            onClick={handleSubmit}
            loading={isLoading}
            leftSection={<IconCheck size={16} />}
            disabled={Object.values(checkedItems).filter(Boolean).length === 0}
          >
            Registrar Comida
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function MyNutritionPage() {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [planMealModalOpened, { open: openPlanMealModal, close: closePlanMealModal }] = useDisclosure(false);
  const [selectedPlanMeal, setSelectedPlanMeal] = useState<PlanMeal | null>(null);
  
  // Hooks para datos reales del backend
  const { data: mealPlan, isLoading: isLoadingPlan } = useMyMealPlan();
  const today = new Date().toISOString().split("T")[0];
  const { data: nutritionLogs } = useNutritionLogs(today, 50);
  const { data: nutritionHistory } = useNutritionHistory(30);
  const logNutritionMutation = useLogNutrition();

  // Obtener el día actual de la semana
  const todayDayIndex = new Date().getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const dayMapping = [7, 1, 2, 3, 4, 5, 6]; // Mapear: Domingo=7, Lunes=1, etc.
  const todayPlanDay = dayMapping[todayDayIndex];

  // Obtener las comidas del plan para hoy
  const todayPlanMeals = useMemo(() => {
    if (!mealPlan?.plan?.days) return [];
    
    const dayPlan = mealPlan.plan.days.find((d: PlanDay) => d.day === todayPlanDay);
    return dayPlan?.meals || [];
  }, [mealPlan, todayPlanDay]);

  // Calcular totales del día
  const dailyTotals = useMemo(() => {
    if (!nutritionLogs?.length) {
      return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
    
    return nutritionLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.total_calories || 0),
        protein: acc.protein + (log.total_protein || 0),
        carbs: acc.carbs + (log.total_carbs || 0),
        fats: acc.fats + (log.total_fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [nutritionLogs]);

  // Objetivos del plan o valores por defecto
  const targets = useMemo(() => ({
    calories: mealPlan?.target_calories || 2000,
    protein: mealPlan?.target_protein || 140,
    carbs: mealPlan?.target_carbs || 250,
    fats: mealPlan?.target_fat || 70,
  }), [mealPlan]);

  // Agrupar logs por tipo de comida
  const mealsByType = useMemo(() => {
    const grouped: Record<string, typeof nutritionLogs> = {};
    MEAL_TYPES.forEach((m) => {
      grouped[m.value] = [];
    });
    
    nutritionLogs?.forEach((log) => {
      if (grouped[log.meal_name]) {
        grouped[log.meal_name]?.push(log);
      } else {
        // Si es un tipo de comida no reconocido, añadir a Snack
        grouped["Snack"]?.push(log);
      }
    });
    
    return grouped;
  }, [nutritionLogs]);

  // Verificar qué comidas del plan ya han sido registradas
  const registeredMeals = useMemo(() => {
    const registered: Record<string, boolean> = {};
    nutritionLogs?.forEach((log) => {
      registered[log.meal_name] = true;
    });
    return registered;
  }, [nutritionLogs]);

  // Calcular datos de la semana desde el historial real
  const weekData = useMemo(() => {
    const days = ["D", "L", "M", "X", "J", "V", "S"];
    const todayDate = new Date();
    
    return days.map((dayLabel, i) => {
      // Calcular la fecha de este día de la semana
      const daysFromToday = i - todayDate.getDay();
      const dateForDay = new Date(todayDate);
      dateForDay.setDate(todayDate.getDate() + daysFromToday);
      const dateStr = dateForDay.toISOString().split("T")[0];
      
      const isToday = i === todayDate.getDay();
      
      // Buscar en el historial
      const dayHistory = nutritionHistory?.days?.find(d => d.date === dateStr);
      
      if (isToday) {
        return {
          day: dayLabel,
          date: dateStr,
          calories: dailyTotals.calories,
          target: targets.calories,
          isToday: true,
          meals: nutritionLogs?.length || 0,
        };
      }
      
      return {
        day: dayLabel,
        date: dateStr,
        calories: dayHistory?.totals?.calories || 0,
        target: targets.calories,
        isToday: false,
        meals: dayHistory?.meals?.length || 0,
      };
    });
  }, [dailyTotals, targets, nutritionHistory, nutritionLogs]);

  const handleLogMeal = async (data: {
    meal_name: string;
    foods: FoodItem[];
    notes?: string;
  }) => {
    await logNutritionMutation.mutateAsync({
      date: today,
      meal_name: data.meal_name,
      foods: data.foods,
      notes: data.notes,
    });
    closeModal();
    closePlanMealModal();
    setSelectedPlanMeal(null);
  };

  const handleOpenPlanMeal = (meal: PlanMeal) => {
    // Don't open modal if already registered
    if (registeredMeals[meal.name]) {
      return;
    }
    setSelectedPlanMeal(meal);
    openPlanMealModal();
  };

  if (isLoadingPlan) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  const caloriesPercentage = targets.calories > 0 
    ? (dailyTotals.calories / targets.calories) * 100 
    : 0;

  // Obtener los nombres de días de la semana para el plan
  const weekDayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const todayDayName = weekDayNames[todayPlanDay - 1] || "Hoy";

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mi Nutrición</Title>
          <Text c="dimmed">Seguimiento de tu alimentación diaria</Text>
        </Box>
        <Button leftSection={<IconPlus size={16} />} color="yellow" onClick={openModal}>
          Registrar comida
        </Button>
      </Group>

      {/* Plan Info */}
      {mealPlan ? (
        <Paper
          p="md"
          radius="lg"
          mb="xl"
          style={{ background: "var(--mantine-color-yellow-light)" }}
        >
          <Group justify="space-between">
            <Box>
              <Text size="sm" c="dimmed">
                Plan nutricional asignado
              </Text>
              <Text fw={600}>{mealPlan.name}</Text>
            </Box>
            <Box ta="right">
              <Text size="sm" c="dimmed">
                Objetivo diario
              </Text>
              <Text fw={500}>{targets.calories} kcal</Text>
            </Box>
          </Group>
        </Paper>
      ) : (
        <Paper
          p="md"
          radius="lg"
          mb="xl"
          style={{ background: "var(--mantine-color-gray-light)" }}
        >
          <Text ta="center" c="dimmed">
            No tienes un plan nutricional asignado. Contacta con tu entrenador.
          </Text>
        </Paper>
      )}

      <Tabs defaultValue="today" variant="pills">
        <Tabs.List mb="lg">
          <Tabs.Tab value="today" leftSection={<IconApple size={16} />}>
            Hoy
          </Tabs.Tab>
          <Tabs.Tab value="week" leftSection={<IconCalendarEvent size={16} />}>
            Esta Semana
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            Historial
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="today">
          {/* Daily Summary */}
      <Card shadow="sm" padding="lg" radius="lg" withBorder mb="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text size="lg" fw={600} mb="md">
              Resumen del Día
            </Text>
            <SimpleGrid cols={2} spacing="md">
              <MacroCard
                label="Proteínas"
                current={Math.round(dailyTotals.protein)}
                target={targets.protein}
                unit="g"
                color="red"
              />
              <MacroCard
                label="Carbohidratos"
                current={Math.round(dailyTotals.carbs)}
                target={targets.carbs}
                unit="g"
                color="blue"
              />
              <MacroCard
                label="Grasas"
                current={Math.round(dailyTotals.fats)}
                target={targets.fats}
                unit="g"
                color="green"
              />
            </SimpleGrid>
          </Box>

          <Box ta="center">
            <RingProgress
              size={160}
              thickness={12}
              roundCaps
              sections={[{ value: Math.min(caloriesPercentage, 100), color: "yellow" }]}
              label={
                <Box>
                  <Text size="xl" fw={700}>
                    {Math.round(dailyTotals.calories)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    de {targets.calories} kcal
                  </Text>
                </Box>
              }
            />
            <Text size="sm" fw={500} mt="xs">
              Calorías consumidas
            </Text>
          </Box>
        </Group>
      </Card>

      {/* Comidas del Plan para Hoy */}
      <Title order={4} mb="md">
        Comidas de Hoy ({todayDayName})
      </Title>
      
      {todayPlanMeals.length > 0 ? (
        <Stack gap="md" mb="xl">
          {todayPlanMeals.map((meal: PlanMeal) => {
            const isRegistered = registeredMeals[meal.name];
            const mealLogs = mealsByType[meal.name] || [];
            const mealCalories = isRegistered 
              ? mealLogs.reduce((sum, l) => sum + (l.total_calories || 0), 0)
              : meal.items.reduce((sum, item) => sum + Math.round((item.food?.calories || 0) * (item.quantity_grams / 100)), 0);

            return (
              <Card key={meal.id} shadow="sm" padding="md" radius="lg" withBorder>
                <Group justify="space-between">
                  <Group>
                    <ThemeIcon
                      variant={isRegistered ? "filled" : "light"}
                      color={isRegistered ? "green" : "yellow"}
                      size="lg"
                      radius="md"
                    >
                      {isRegistered ? <IconCheck size={20} /> : <IconApple size={20} />}
                    </ThemeIcon>
                    <Box>
                      <Group gap="xs">
                        <Text fw={600}>{meal.name}</Text>
                        <Text size="sm" c="dimmed">
                          {meal.time}
                        </Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {meal.items.map((item) => `${item.food?.name || "Alimento"} (${item.quantity_grams}g)`).join(" • ")}
                      </Text>
                    </Box>
                  </Group>
                  <Group>
                    <Badge variant="light" color={isRegistered ? "green" : "orange"} size="lg">
                      <Group gap={4}>
                        <IconFlame size={14} />
                        {mealCalories} kcal
                      </Group>
                    </Badge>
                    <Button
                      variant={isRegistered ? "light" : "filled"}
                      size="sm"
                      color={isRegistered ? "green" : "yellow"}
                      onClick={() => handleOpenPlanMeal(meal)}
                      leftSection={isRegistered ? <IconCheck size={14} /> : undefined}
                      disabled={isRegistered}
                    >
                      {isRegistered ? "Completado" : "Registrar"}
                    </Button>
                  </Group>
                </Group>
                
                {/* Mostrar alimentos expandidos si no está registrado */}
                {!isRegistered && meal.items.length > 0 && (
                  <Box mt="md" pt="md" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
                    <Text size="xs" c="dimmed" mb="xs">Alimentos planificados:</Text>
                    <Group gap="xs">
                      {meal.items.map((item) => (
                        <Badge key={item.id} variant="outline" color="gray" size="sm">
                          {item.food?.name} - {item.quantity_grams}g
                        </Badge>
                      ))}
                    </Group>
                  </Box>
                )}
              </Card>
            );
          })}
        </Stack>
      ) : (
        /* Fallback: mostrar tipos de comida genéricos si no hay plan con días */
        <Stack gap="md" mb="xl">
          {MEAL_TYPES.map((mealType) => {
            const MealIcon = mealType.icon;
            const logs = mealsByType[mealType.value] || [];
            const hasLogs = logs.length > 0;
            const mealCalories = logs.reduce((sum, l) => sum + (l.total_calories || 0), 0);

            return (
              <Card key={mealType.value} shadow="sm" padding="md" radius="lg" withBorder>
                <Group justify="space-between">
                  <Group>
                    <ThemeIcon
                      variant={hasLogs ? "filled" : "light"}
                      color={hasLogs ? "yellow" : "gray"}
                      size="lg"
                      radius="md"
                    >
                      <MealIcon size={20} />
                    </ThemeIcon>
                    <Box>
                      <Group gap="xs">
                        <Text fw={600}>{mealType.label}</Text>
                        <Text size="sm" c="dimmed">
                          {mealType.time}
                        </Text>
                      </Group>
                      {hasLogs ? (
                        <Text size="sm" c="dimmed">
                          {logs.flatMap((l) => l.foods?.map((f) => f.name) || []).join(" • ")}
                        </Text>
                      ) : (
                        <Text size="sm" c="dimmed" fs="italic">
                          Sin registrar
                        </Text>
                      )}
                    </Box>
                  </Group>
                  <Group>
                    {hasLogs && (
                      <Badge variant="light" color="orange" size="lg">
                        <Group gap={4}>
                          <IconFlame size={14} />
                          {mealCalories} kcal
                        </Group>
                      </Badge>
                    )}
                    <Button
                      variant={hasLogs ? "light" : "filled"}
                      size="sm"
                      color={hasLogs ? "gray" : "yellow"}
                      onClick={openModal}
                    >
                      {hasLogs ? "Editar" : "Registrar"}
                    </Button>
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}

        </Tabs.Panel>

        <Tabs.Panel value="week">
          {/* Week View */}
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              {weekData.map((day, index) => {
                const percentage = day.calories > 0 ? (day.calories / day.target) * 100 : 0;
                return (
                  <Card 
                    key={index} 
                    shadow="sm" 
                    padding="md" 
                    radius="md" 
                    withBorder
                    style={{
                      borderColor: day.isToday ? "var(--mantine-color-yellow-5)" : undefined,
                      backgroundColor: day.isToday ? "var(--mantine-color-yellow-0)" : undefined,
                    }}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Text fw={600}>{day.day}</Text>
                        {day.isToday && <Badge size="xs" color="yellow">Hoy</Badge>}
                      </Group>
                      <RingProgress
                        size={40}
                        thickness={4}
                        roundCaps
                        sections={[{
                          value: Math.min(percentage, 100),
                          color: percentage >= 90 ? "green" : percentage > 0 ? "yellow" : "gray",
                        }]}
                      />
                    </Group>
                    <Text size="lg" fw={700}>{day.calories}</Text>
                    <Text size="xs" c="dimmed">de {day.target} kcal</Text>
                    <Text size="xs" c="dimmed" mt="xs">{day.meals} comidas registradas</Text>
                  </Card>
                );
              })}
            </SimpleGrid>

            {/* Week Summary */}
            <Card shadow="sm" padding="lg" radius="lg" withBorder>
              <Title order={5} mb="md">Resumen de la Semana</Title>
              <SimpleGrid cols={3}>
                <Box ta="center">
                  <Text size="xl" fw={700} c="yellow">
                    {nutritionHistory?.summary?.avg_calories || 0}
                  </Text>
                  <Text size="sm" c="dimmed">Promedio kcal/día</Text>
                </Box>
                <Box ta="center">
                  <Text size="xl" fw={700} c="green">
                    {nutritionHistory?.summary?.total_days || 0}
                  </Text>
                  <Text size="sm" c="dimmed">Días registrados</Text>
                </Box>
                <Box ta="center">
                  <Text size="xl" fw={700} c="blue">
                    {targets.calories}
                  </Text>
                  <Text size="sm" c="dimmed">Objetivo kcal/día</Text>
                </Box>
              </SimpleGrid>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="history">
          {/* History View */}
          <Stack gap="md">
            {nutritionHistory?.days && nutritionHistory.days.length > 0 ? (
              <Accordion variant="separated">
                {nutritionHistory.days.map((day) => {
                  const percentage = day.totals.calories > 0 
                    ? (day.totals.calories / targets.calories) * 100 
                    : 0;
                  const dateFormatted = new Date(day.date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  });
                  
                  return (
                    <Accordion.Item key={day.date} value={day.date}>
                      <Accordion.Control>
                        <Group justify="space-between" pr="md">
                          <Group>
                            <Box>
                              <Text fw={500} tt="capitalize">{dateFormatted}</Text>
                              <Text size="sm" c="dimmed">{day.meals.length} comidas</Text>
                            </Box>
                          </Group>
                          <Group gap="md">
                            <Badge 
                              variant="light" 
                              color={percentage >= 90 ? "green" : percentage >= 70 ? "yellow" : "orange"}
                              size="lg"
                            >
                              {day.totals.calories} kcal
                            </Badge>
                            <Badge variant="outline" color="red" size="sm">P: {Math.round(day.totals.protein)}g</Badge>
                            <Badge variant="outline" color="blue" size="sm">C: {Math.round(day.totals.carbs)}g</Badge>
                            <Badge variant="outline" color="grape" size="sm">G: {Math.round(day.totals.fat)}g</Badge>
                          </Group>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="sm">
                          {day.meals.map((meal, mealIndex) => (
                            <Paper key={mealIndex} p="sm" radius="md" withBorder>
                              <Group justify="space-between" mb="xs">
                                <Text fw={500}>{meal.meal_name}</Text>
                                <Badge variant="light" color="orange" size="sm">
                                  {meal.total_calories} kcal
                                </Badge>
                              </Group>
                              <Text size="sm" c="dimmed">
                                {meal.foods.map(f => f.name).join(", ")}
                              </Text>
                            </Paper>
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            ) : (
              <Paper p="xl" ta="center" radius="lg" withBorder>
                <IconHistory size={48} color="gray" style={{ opacity: 0.5 }} />
                <Text c="dimmed" mt="md">No hay historial de nutrición disponible</Text>
                <Text size="sm" c="dimmed">Registra tus comidas para ver tu historial aquí</Text>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal para registrar comida manual */}
      <LogMealModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleLogMeal}
        isLoading={logNutritionMutation.isPending}
      />

      {/* Modal para registrar comida del plan */}
      <LogPlanMealModal
        opened={planMealModalOpened}
        onClose={() => {
          closePlanMealModal();
          setSelectedPlanMeal(null);
        }}
        onSubmit={handleLogMeal}
        isLoading={logNutritionMutation.isPending}
        meal={selectedPlanMeal}
      />
    </Box>
  );
}
