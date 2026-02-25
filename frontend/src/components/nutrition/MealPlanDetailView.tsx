import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  Progress,
  RingProgress,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconActivity,
  IconAlertTriangle,
  IconCalculator,
  IconChartPie,
  IconDownload,
  IconEdit,
  IconFlame,
  IconMeat,
  IconPill,
  IconPrinter,
  IconSalad,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { GlossaryTooltip } from "../common/GlossaryTooltip";
import {
  type FormulaType,
  calculateBMR,
  calculateTDEE,
} from "../../utils/calories";

// Types
interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  gender: "male" | "female";
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  body_tendency: "easy_gain" | "normal" | "hard_gain";
  goal_type: "fat_loss" | "maintenance" | "muscle_gain";
  goal_weight_kg?: number;
  allergies?: string[];
  intolerances?: string[];
}

interface MealFood {
  id: string;
  food_id?: string;
  name: string;
  quantity: number;
  unit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens?: string[];
}

// New format from MealPlanBuilder
interface MealItem {
  id: string;
  food_id?: string;
  supplement_id?: string;
  food?: {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    serving_size?: string;
  };
  supplement?: {
    id: string;
    name: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    serving_size?: string;
  };
  quantity_grams: number;
  type: "food" | "supplement";
}

interface Meal {
  id: string;
  name: string;
  time?: string;
  foods?: MealFood[];
  items?: MealItem[];
}

interface DayPlan {
  id: string;
  day: number;
  dayName: string;
  meals: Meal[];
  notes?: string;
}

interface SupplementRecommendation {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  notes?: string;
}

interface MealPlanData {
  id: string;
  name: string;
  description?: string;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  plan: { days: DayPlan[] };
  supplements?: SupplementRecommendation[];
  notes?: string;
  nutritional_advice?: string;
  equivalences?: string;
}

interface MealPlanDetailViewProps {
  mealPlan: MealPlanData;
  client?: ClientData;
  onExportPDF?: () => void;
  onPrint?: () => void;
  onEdit?: () => void;
}

const ACTIVITY_LABELS = {
  sedentary: "Sedentario",
  light: "Ligero",
  moderate: "Activo",
  active: "Muy Activo",
  very_active: "Extremadamente Activo",
};

const BODY_TENDENCY_LABELS = {
  easy_gain: "Suelo Engordar Fácil",
  normal: "Normal",
  hard_gain: "Me Cuesta Engordar",
};

/**
 * Helper function to normalize meal data - converts new format (items) to legacy format (foods)
 */
function getMealFoods(meal: Meal): MealFood[] {
  // If using legacy format, return foods directly
  if (meal.foods && meal.foods.length > 0) {
    return meal.foods;
  }
  
  // If using new format (items), convert to foods
  if (meal.items && meal.items.length > 0) {
    return meal.items.map((item) => {
      const data = item.type === "food" ? item.food : item.supplement;
      if (!data) {
        return {
          id: item.id,
          name: "Sin nombre",
          quantity: item.quantity_grams,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };
      }
      
      // Calculate macros based on quantity
      const servingSize = parseFloat(data.serving_size || "100") || 100;
      const factor = item.quantity_grams / servingSize;
      
      return {
        id: item.id,
        food_id: item.food_id || item.supplement_id,
        name: data.name || "Sin nombre",
        quantity: item.quantity_grams,
        calories: Math.round((data.calories || 0) * factor),
        protein: Math.round(((data.protein || 0) * factor) * 10) / 10,
        carbs: Math.round(((data.carbs || 0) * factor) * 10) / 10,
        fat: Math.round(((data.fat || 0) * factor) * 10) / 10,
      };
    });
  }
  
  return [];
}

/**
 * MealPlanDetailView - Vista completa del plan nutricional
 * Incluye: cálculos energéticos, temporalización, comidas, suplementación
 */
export function MealPlanDetailView({
  mealPlan,
  client,
  onExportPDF,
  onPrint,
  onEdit,
}: MealPlanDetailViewProps) {
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [editingClient, setEditingClient] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<FormulaType>("mifflin");

  // Form for client data (for calculations)
  const clientForm = useForm({
    initialValues: {
      gender: client?.gender || "male",
      age: client?.age || 30,
      weight_kg: client?.weight_kg || 70,
      height_cm: client?.height_cm || 175,
      activity_level: client?.activity_level || "moderate",
      body_tendency: client?.body_tendency || "normal",
      goal_type: client?.goal_type || "maintenance",
      goal_weight_kg: client?.goal_weight_kg || client?.weight_kg || 70,
    },
  });

  // Calculate BMR using selected formula (Mifflin-St Jeor or Harris-Benedict)
  const bmr = useMemo(() => {
    const { gender, age, weight_kg, height_cm } = clientForm.values;
    return calculateBMR(
      { weight_kg, height_cm, age, gender: gender as "male" | "female" },
      selectedFormula
    );
  }, [clientForm.values, selectedFormula]);

  // Calculate TDEE
  const tdee = useMemo(() => {
    return Math.round(calculateTDEE(bmr, clientForm.values.activity_level));
  }, [bmr, clientForm.values.activity_level]);

  // Calculate energy targets based on goal
  const energyTargets = useMemo(() => {
    const { goal_type } = clientForm.values;
    let maintenance = tdee;
    let hypertrophy = Math.round(tdee * 1.25); // +25% for muscle gain
    let definition = Math.round(tdee * 0.75); // -25% for fat loss

    return {
      maintenance,
      hypertrophy,
      definition,
      recommended: goal_type === "fat_loss" ? definition : goal_type === "muscle_gain" ? hypertrophy : maintenance,
    };
  }, [tdee, clientForm.values.goal_type]);

  // Calculate client-based nutritional targets (these should come from client, not plan)
  const clientTargets = useMemo(() => {
    // If client exists, calculate targets based on their data
    if (client) {
      const { weight_kg, goal_type } = clientForm.values;
      
      // Protein: 1.8-2.2g per kg for muscle gain, 2.0-2.4g for fat loss, 1.6-2.0g for maintenance
      let proteinMultiplier = 2.0;
      if (goal_type === "muscle_gain") proteinMultiplier = 2.2;
      if (goal_type === "fat_loss") proteinMultiplier = 2.2;
      
      const targetProtein = Math.round(weight_kg * proteinMultiplier);
      const targetCalories = energyTargets.recommended;
      
      // Calculate remaining calories after protein
      const proteinCalories = targetProtein * 4;
      const remainingCalories = targetCalories - proteinCalories;
      
      // Split remaining between carbs (60%) and fat (40%)
      const targetFat = Math.round((remainingCalories * 0.35) / 9);
      const targetCarbs = Math.round((remainingCalories * 0.65) / 4);
      
      return {
        calories: targetCalories,
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat,
        source: "client" as const,
      };
    }
    
    // Fallback to plan values if no client
    return {
      calories: mealPlan.target_calories || 2000,
      protein: mealPlan.target_protein || 150,
      carbs: mealPlan.target_carbs || 200,
      fat: mealPlan.target_fat || 70,
      source: "plan" as const,
    };
  }, [client, clientForm.values, energyTargets.recommended, mealPlan]);

  // Calculate goal timeline
  const goalTimeline = useMemo(() => {
    const { weight_kg, goal_weight_kg, goal_type, gender } = clientForm.values;
    const weightDiff = Math.abs(weight_kg - (goal_weight_kg || weight_kg));

    if (goal_type === "fat_loss") {
      // Safe fat loss: 0.5-1kg per week
      const weeksNeeded = Math.ceil(weightDiff / 0.5);
      const monthsNeeded = Math.ceil(weeksNeeded / 4);
      return {
        currentWeight: weight_kg,
        targetWeight: goal_weight_kg,
        weeksNeeded,
        monthsNeeded,
        note: gender === "female" 
          ? "Individuos con obesidad pueden bajar más rápido" 
          : "Individuos con obesidad pueden bajar más rápido",
      };
    } else if (goal_type === "muscle_gain") {
      // Muscle gain: 0.25-0.5kg per week for men, half for women
      const weeklyGain = gender === "male" ? 0.25 : 0.125;
      const weeksNeeded = Math.ceil(weightDiff / weeklyGain);
      const monthsNeeded = Math.ceil(weeksNeeded / 4);
      return {
        currentWeight: weight_kg,
        targetWeight: goal_weight_kg,
        weeksNeeded,
        monthsNeeded,
        note: gender === "female" 
          ? "Mujeres pueden tardar el doble de tiempo en lograrlo" 
          : "",
      };
    }

    return {
      currentWeight: weight_kg,
      targetWeight: weight_kg,
      weeksNeeded: 0,
      monthsNeeded: 0,
      note: "Mantenimiento - sin cambio de peso objetivo",
    };
  }, [clientForm.values]);

  // Calculate actual macros from plan
  const actualMacros = useMemo(() => {
    if (!mealPlan.plan?.days?.length) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    // Calculate average from all days
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let daysCount = 0;

    mealPlan.plan.days.forEach((day) => {
      let dayCalories = 0;
      let dayProtein = 0;
      let dayCarbs = 0;
      let dayFat = 0;

      day.meals?.forEach((meal) => {
        getMealFoods(meal).forEach((food) => {
          dayCalories += food.calories || 0;
          dayProtein += food.protein || 0;
          dayCarbs += food.carbs || 0;
          dayFat += food.fat || 0;
        });
      });

      if (dayCalories > 0) {
        totalCalories += dayCalories;
        totalProtein += dayProtein;
        totalCarbs += dayCarbs;
        totalFat += dayFat;
        daysCount++;
      }
    });

    if (daysCount === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    return {
      calories: Math.round(totalCalories / daysCount),
      protein: Math.round((totalProtein / daysCount) * 10) / 10,
      carbs: Math.round((totalCarbs / daysCount) * 10) / 10,
      fat: Math.round((totalFat / daysCount) * 10) / 10,
    };
  }, [mealPlan.plan]);

  // Calculate macro percentages
  const macroPercentages = useMemo(() => {
    const { protein, carbs, fat } = actualMacros;
    const totalGrams = protein + carbs + fat;
    if (totalGrams === 0) return { protein: 33, carbs: 34, fat: 33 };

    const proteinKcal = protein * 4;
    const carbsKcal = carbs * 4;
    const fatKcal = fat * 9;
    const totalKcal = proteinKcal + carbsKcal + fatKcal;

    return {
      protein: Math.round((proteinKcal / totalKcal) * 100),
      carbs: Math.round((carbsKcal / totalKcal) * 100),
      fat: Math.round((fatKcal / totalKcal) * 100),
    };
  }, [actualMacros]);

  // Check for allergens in the plan
  const allergenWarnings = useMemo(() => {
    if (!client?.allergies?.length && !client?.intolerances?.length) return [];

    const clientAllergens = [...(client.allergies || []), ...(client.intolerances || [])];
    const warnings: { food: string; allergen: string; meal: string; day: string }[] = [];

    mealPlan.plan?.days?.forEach((day) => {
      day.meals?.forEach((meal) => {
        getMealFoods(meal).forEach((food) => {
          food.allergens?.forEach((allergen) => {
            if (clientAllergens.some((a) => a.toLowerCase() === allergen.toLowerCase())) {
              warnings.push({
                food: food.name,
                allergen,
                meal: meal.name,
                day: day.dayName,
              });
            }
          });
        });
      });
    });

    return warnings;
  }, [mealPlan.plan, client]);

  const handleExportPDF = () => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      notifications.show({
        title: "Exportando PDF",
        message: "El PDF se está generando...",
        color: "blue",
      });
      // TODO: Implement PDF export
    }
  };

  return (
    <Box>
      {/* Header */}
      <Paper p="lg" radius="md" withBorder mb="lg">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2}>{mealPlan.name}</Title>
            {mealPlan.description && (
              <Text c="dimmed" mt="xs">
                {mealPlan.description}
              </Text>
            )}
            {client && (
              <Badge color="blue" variant="light" mt="sm" size="lg">
                Cliente: {client.first_name} {client.last_name}
              </Badge>
            )}
          </Box>
          <Group>
            {onEdit && (
              <Button variant="light" leftSection={<IconEdit size={16} />} onClick={onEdit}>
                Editar
              </Button>
            )}
            <Button variant="light" leftSection={<IconPrinter size={16} />} onClick={onPrint}>
              Imprimir
            </Button>
            <Button leftSection={<IconDownload size={16} />} onClick={handleExportPDF}>
              Exportar PDF
            </Button>
          </Group>
        </Group>

        {/* Allergen warnings */}
        {allergenWarnings.length > 0 && (
          <Paper p="md" mt="md" bg="red.0" radius="md" withBorder style={{ borderColor: "var(--mantine-color-red-4)" }}>
            <Group gap="xs" mb="sm">
              <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
              <Text fw={600} c="red">
                ¡ADVERTENCIA! Alimentos con alérgenos detectados
              </Text>
            </Group>
            <Stack gap="xs">
              {allergenWarnings.map((warning, idx) => (
                <Text key={idx} size="sm" c="red">
                  • <strong>{warning.food}</strong> contiene <strong>{warning.allergen}</strong> ({warning.day} - {warning.meal})
                </Text>
              ))}
            </Stack>
          </Paper>
        )}
      </Paper>

      {/* Client Info Card - Only show if client is assigned */}
      {client && (
        <Paper p="lg" radius="md" withBorder mb="lg" bg="blue.0">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
                Datos del Cliente
              </Text>
              <Title order={3} mt="xs">
                {client.first_name} {client.last_name}
              </Title>
            </Box>
            <SimpleGrid cols={{ base: 2, sm: 4, md: 6 }} spacing="md">
              <Box ta="center">
                <Text size="xs" c="dimmed">Peso</Text>
                <Text fw={700}>{clientForm.values.weight_kg} kg</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c="dimmed">Altura</Text>
                <Text fw={700}>{clientForm.values.height_cm} cm</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c="dimmed">Edad</Text>
                <Text fw={700}>{clientForm.values.age} años</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c="dimmed">Actividad</Text>
                <Text fw={700}>{ACTIVITY_LABELS[clientForm.values.activity_level as keyof typeof ACTIVITY_LABELS]}</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c="dimmed">Objetivo</Text>
                <Badge color={
                  clientForm.values.goal_type === "fat_loss" ? "red" : 
                  clientForm.values.goal_type === "muscle_gain" ? "green" : "blue"
                }>
                  {clientForm.values.goal_type === "fat_loss" ? "Pérdida Grasa" : 
                   clientForm.values.goal_type === "muscle_gain" ? "Ganancia Muscular" : "Mantenimiento"}
                </Badge>
              </Box>
              <Box ta="center">
                <Text size="xs" c="dimmed">Kcal Objetivo</Text>
                <Text fw={700} c="blue">{clientTargets.calories} kcal</Text>
              </Box>
            </SimpleGrid>
          </Group>
          {(client.allergies?.length || client.intolerances?.length) && (
            <Group mt="md" gap="xs">
              <Text size="sm" fw={500}>Alergias/Intolerancias:</Text>
              {[...(client.allergies || []), ...(client.intolerances || [])].map((item, idx) => (
                <Badge key={idx} color="red" variant="light" size="sm">{item}</Badge>
              ))}
            </Group>
          )}
        </Paper>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="overview" leftSection={<IconChartPie size={14} />}>
            Resumen Nutricional
          </Tabs.Tab>
          <Tabs.Tab value="meals" leftSection={<IconSalad size={14} />}>
            Plan de Comidas
          </Tabs.Tab>
          <Tabs.Tab value="calculator" leftSection={<IconCalculator size={14} />}>
            Calculadora Energética
          </Tabs.Tab>
          <Tabs.Tab value="supplements" leftSection={<IconPill size={14} />}>
            Suplementación
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {/* Macro distribution */}
            <Paper p="lg" radius="md" withBorder>
              <Text fw={600} mb="md">
                Distribución de Macronutrientes - Kcal
              </Text>
              <Group justify="center" mb="md">
                <RingProgress
                  size={200}
                  thickness={20}
                  roundCaps
                  sections={[
                    { value: macroPercentages.protein, color: "green", tooltip: `Proteína: ${macroPercentages.protein}%` },
                    { value: macroPercentages.carbs, color: "blue", tooltip: `Carbohidratos: ${macroPercentages.carbs}%` },
                    { value: macroPercentages.fat, color: "grape", tooltip: `Grasas: ${macroPercentages.fat}%` },
                  ]}
                  label={
                    <Box ta="center">
                      <Text size="xl" fw={700}>
                        {actualMacros.calories}
                      </Text>
                      <Text size="xs" c="dimmed">
                        kcal/día
                      </Text>
                    </Box>
                  }
                />
              </Group>
              <SimpleGrid cols={3} spacing="xs">
                <Box ta="center">
                  <Badge color="green" variant="light" size="lg">
                    {macroPercentages.protein}%
                  </Badge>
                  <Text size="sm" mt="xs">
                    <GlossaryTooltip term="Proteína">Proteína</GlossaryTooltip>
                  </Text>
                  <Text fw={600}>{actualMacros.protein}g</Text>
                  <Text size="xs" c="dimmed">
                    {Math.round(actualMacros.protein * 4)} kcal
                  </Text>
                </Box>
                <Box ta="center">
                  <Badge color="blue" variant="light" size="lg">
                    {macroPercentages.carbs}%
                  </Badge>
                  <Text size="sm" mt="xs">
                    Carbohidratos
                  </Text>
                  <Text fw={600}>{actualMacros.carbs}g</Text>
                  <Text size="xs" c="dimmed">
                    {Math.round(actualMacros.carbs * 4)} kcal
                  </Text>
                </Box>
                <Box ta="center">
                  <Badge color="grape" variant="light" size="lg">
                    {macroPercentages.fat}%
                  </Badge>
                  <Text size="sm" mt="xs">
                    Grasas
                  </Text>
                  <Text fw={600}>{actualMacros.fat}g</Text>
                  <Text size="xs" c="dimmed">
                    {Math.round(actualMacros.fat * 9)} kcal
                  </Text>
                </Box>
              </SimpleGrid>
            </Paper>

            {/* Target vs Actual */}
            <Paper p="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={600}>
                  Objetivos vs Actual
                </Text>
                {client && (
                  <Badge color="blue" variant="light" size="sm">
                    Calculado desde cliente
                  </Badge>
                )}
              </Group>
              <Stack gap="md">
                <Box>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Calorías</Text>
                    <Text size="sm" fw={500}>
                      {actualMacros.calories} / {clientTargets.calories} kcal
                    </Text>
                  </Group>
                  <Progress
                    value={(actualMacros.calories / clientTargets.calories) * 100}
                    color={actualMacros.calories > clientTargets.calories * 1.1 ? "red" : "blue"}
                    size="lg"
                    radius="xl"
                  />
                </Box>
                <Box>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Proteína</Text>
                    <Text size="sm" fw={500}>
                      {actualMacros.protein} / {clientTargets.protein}g
                    </Text>
                  </Group>
                  <Progress
                    value={(actualMacros.protein / clientTargets.protein) * 100}
                    color="green"
                    size="lg"
                    radius="xl"
                  />
                </Box>
                <Box>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Carbohidratos</Text>
                    <Text size="sm" fw={500}>
                      {actualMacros.carbs} / {clientTargets.carbs}g
                    </Text>
                  </Group>
                  <Progress
                    value={(actualMacros.carbs / clientTargets.carbs) * 100}
                    color="orange"
                    size="lg"
                    radius="xl"
                  />
                </Box>
                <Box>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Grasas</Text>
                    <Text size="sm" fw={500}>
                      {actualMacros.fat} / {clientTargets.fat}g
                    </Text>
                  </Group>
                  <Progress
                    value={(actualMacros.fat / clientTargets.fat) * 100}
                    color="grape"
                    size="lg"
                    radius="xl"
                  />
                </Box>
              </Stack>
            </Paper>

            {/* Detailed macros table */}
            <Paper p="lg" radius="md" withBorder style={{ gridColumn: "1 / -1" }}>
              <Text fw={600} mb="md">
                Desglose Nutricional Detallado
              </Text>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nutriente</Table.Th>
                    <Table.Th ta="right">Cantidad</Table.Th>
                    <Table.Th ta="right">% Kcal</Table.Th>
                    <Table.Th ta="right">Kcal</Table.Th>
                    <Table.Th ta="right">Objetivo</Table.Th>
                    <Table.Th ta="right">Diferencia</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Group gap="xs">
                        <ThemeIcon color="green" variant="light" size="sm">
                          <IconMeat size={14} />
                        </ThemeIcon>
                        <GlossaryTooltip term="Proteína">Proteína</GlossaryTooltip>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">{actualMacros.protein}g</Table.Td>
                    <Table.Td ta="right">{macroPercentages.protein}%</Table.Td>
                    <Table.Td ta="right">{Math.round(actualMacros.protein * 4)}</Table.Td>
                    <Table.Td ta="right">{clientTargets.protein}g</Table.Td>
                    <Table.Td ta="right">
                      <Badge color={actualMacros.protein >= clientTargets.protein ? "green" : "red"} variant="light">
                        {actualMacros.protein - clientTargets.protein > 0 ? "+" : ""}
                        {Math.round(actualMacros.protein - clientTargets.protein)}g
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Group gap="xs">
                        <ThemeIcon color="orange" variant="light" size="sm">
                          <IconFlame size={14} />
                        </ThemeIcon>
                        Carbohidratos
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">{actualMacros.carbs}g</Table.Td>
                    <Table.Td ta="right">{macroPercentages.carbs}%</Table.Td>
                    <Table.Td ta="right">{Math.round(actualMacros.carbs * 4)}</Table.Td>
                    <Table.Td ta="right">{clientTargets.carbs}g</Table.Td>
                    <Table.Td ta="right">
                      <Badge color={Math.abs(actualMacros.carbs - clientTargets.carbs) < 20 ? "green" : "orange"} variant="light">
                        {actualMacros.carbs - clientTargets.carbs > 0 ? "+" : ""}
                        {Math.round(actualMacros.carbs - clientTargets.carbs)}g
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Group gap="xs">
                        <ThemeIcon color="grape" variant="light" size="sm">
                          <IconActivity size={14} />
                        </ThemeIcon>
                        Grasas
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">{actualMacros.fat}g</Table.Td>
                    <Table.Td ta="right">{macroPercentages.fat}%</Table.Td>
                    <Table.Td ta="right">{Math.round(actualMacros.fat * 9)}</Table.Td>
                    <Table.Td ta="right">{clientTargets.fat}g</Table.Td>
                    <Table.Td ta="right">
                      <Badge color={Math.abs(actualMacros.fat - clientTargets.fat) < 10 ? "green" : "orange"} variant="light">
                        {actualMacros.fat - clientTargets.fat > 0 ? "+" : ""}
                        {Math.round(actualMacros.fat - clientTargets.fat)}g
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr style={{ fontWeight: 600 }}>
                    <Table.Td>Total</Table.Td>
                    <Table.Td ta="right">-</Table.Td>
                    <Table.Td ta="right">100%</Table.Td>
                    <Table.Td ta="right">{actualMacros.calories}</Table.Td>
                    <Table.Td ta="right">{clientTargets.calories}</Table.Td>
                    <Table.Td ta="right">
                      <Badge color={Math.abs(actualMacros.calories - clientTargets.calories) < 100 ? "green" : "orange"} variant="light">
                        {actualMacros.calories - clientTargets.calories > 0 ? "+" : ""}
                        {actualMacros.calories - clientTargets.calories}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        {/* Meals Tab */}
        <Tabs.Panel value="meals">
          <MealPlanDaysView 
            days={mealPlan.plan?.days || []} 
            clientAllergens={[...(client?.allergies || []), ...(client?.intolerances || [])]}
          />
        </Tabs.Panel>

        {/* Calculator Tab */}
        <Tabs.Panel value="calculator">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            {/* Energy Requirements Calculator */}
            <Paper p="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={600}>Cálculo de Requisitos Energéticos Diarios</Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setEditingClient(!editingClient)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Group>

              <Stack gap="md">
                <SegmentedControl
                  value={selectedFormula}
                  onChange={(v) => setSelectedFormula(v as FormulaType)}
                  data={[
                    { label: "Mifflin-St Jeor", value: "mifflin" },
                    { label: "Harris-Benedict", value: "harris" },
                  ]}
                  size="sm"
                  radius="md"
                  mb="xs"
                />
                <SimpleGrid cols={2} spacing="md">
                  <Select
                    label="Sexo"
                    data={[
                      { value: "male", label: "Hombre" },
                      { value: "female", label: "Mujer" },
                    ]}
                    disabled={!editingClient}
                    {...clientForm.getInputProps("gender")}
                  />
                  <NumberInput
                    label="Edad"
                    suffix=" años"
                    min={10}
                    max={100}
                    disabled={!editingClient}
                    {...clientForm.getInputProps("age")}
                  />
                </SimpleGrid>

                <SimpleGrid cols={2} spacing="md">
                  <NumberInput
                    label="Peso"
                    suffix=" kg"
                    min={30}
                    max={300}
                    disabled={!editingClient}
                    {...clientForm.getInputProps("weight_kg")}
                  />
                  <NumberInput
                    label="Altura"
                    suffix=" cm"
                    min={100}
                    max={250}
                    disabled={!editingClient}
                    {...clientForm.getInputProps("height_cm")}
                  />
                </SimpleGrid>

                <Select
                  label="Actividad"
                  data={Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({ value, label }))}
                  disabled={!editingClient}
                  {...clientForm.getInputProps("activity_level")}
                />

                <Select
                  label="Tendencia Corporal"
                  data={Object.entries(BODY_TENDENCY_LABELS).map(([value, label]) => ({ value, label }))}
                  disabled={!editingClient}
                  {...clientForm.getInputProps("body_tendency")}
                />

                <Divider />

                <Table withTableBorder withColumnBorders>
                  <Table.Tbody>
                    <Table.Tr style={{ backgroundColor: "var(--mantine-color-yellow-0)" }}>
                      <Table.Td fw={600}>
                        Energía Estimada para <GlossaryTooltip term="TDEE">Mantenimiento</GlossaryTooltip>
                      </Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {energyTargets.maintenance} kcal
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr style={{ backgroundColor: "var(--mantine-color-green-0)" }}>
                      <Table.Td fw={600}>Hipertrofia o Aumento de Peso</Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {energyTargets.hypertrophy} kcal
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr style={{ backgroundColor: "var(--mantine-color-red-0)" }}>
                      <Table.Td fw={600}>Definición o Pérdida de Peso</Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {energyTargets.definition} kcal
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>

                <Text size="xs" c="dimmed">
                  • Estos cálculos son meramente <strong>orientativos</strong>
                  <br />
                  • Individuos con las mismas características (peso, edad, actividad, objetivo) pueden tener gastos energéticos diferentes
                  <br />
                  • La forma correcta de saber si la energía propuesta se ajusta al individuo es tras realizar un control periódico de resultados (peso, perímetros, pliegues corporales, rendimiento)
                  <br />
                  • En base a resultados obtenidos tras control reajustar la energía en dieta
                </Text>
              </Stack>
            </Paper>

            {/* Goal Timeline */}
            <Stack gap="lg">
              <Paper p="lg" radius="md" withBorder style={{ backgroundColor: "var(--mantine-color-cyan-0)" }}>
                <Text fw={600} mb="md">
                  Cálculo de Temporalización de Objetivos para Pérdida de Grasa
                </Text>
                <SimpleGrid cols={2} spacing="md">
                  <Box>
                    <Text size="sm" c="dimmed">
                      Peso Actual
                    </Text>
                    <Text fw={600} size="xl">
                      {clientForm.values.weight_kg} kg
                    </Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Peso Objetivo
                    </Text>
                    <NumberInput
                      value={clientForm.values.goal_weight_kg}
                      onChange={(val) => clientForm.setFieldValue("goal_weight_kg", Number(val))}
                      suffix=" kg"
                      min={30}
                      max={200}
                      size="sm"
                    />
                  </Box>
                </SimpleGrid>
                <Divider my="md" />
                <SimpleGrid cols={2} spacing="md">
                  <Box>
                    <Text size="sm" c="dimmed">
                      Semanas Previstas
                    </Text>
                    <Text fw={600} size="xl">
                      {goalTimeline.weeksNeeded}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Meses
                    </Text>
                    <Text fw={600} size="xl">
                      {goalTimeline.monthsNeeded}
                    </Text>
                  </Box>
                </SimpleGrid>
                {goalTimeline.note && (
                  <Text size="xs" c="dimmed" mt="md" style={{ fontStyle: "italic" }}>
                    • {goalTimeline.note}
                  </Text>
                )}
              </Paper>

              <Paper p="lg" radius="md" withBorder style={{ backgroundColor: "var(--mantine-color-green-0)" }}>
                <Text fw={600} mb="md">
                  Cálculo de Temporalización de Objetivos para Aumento de Músculo
                </Text>
                <SimpleGrid cols={2} spacing="md">
                  <Box>
                    <Text size="sm" c="dimmed">
                      Peso Actual
                    </Text>
                    <Text fw={600} size="xl">
                      {clientForm.values.weight_kg} kg
                    </Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Peso Objetivo
                    </Text>
                    <Text fw={600} size="xl">
                      {clientForm.values.goal_weight_kg} kg
                    </Text>
                  </Box>
                </SimpleGrid>
                <Divider my="md" />
                <SimpleGrid cols={2} spacing="md">
                  <Box>
                    <Text size="sm" c="dimmed">
                      Semanas Previstas
                    </Text>
                    <Text fw={600} size="xl">
                      {clientForm.values.gender === "male" 
                        ? Math.ceil(Math.abs(clientForm.values.goal_weight_kg - clientForm.values.weight_kg) / 0.25)
                        : Math.ceil(Math.abs(clientForm.values.goal_weight_kg - clientForm.values.weight_kg) / 0.125)
                      }
                    </Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Meses
                    </Text>
                    <Text fw={600} size="xl">
                      {clientForm.values.gender === "male"
                        ? Math.ceil(Math.ceil(Math.abs(clientForm.values.goal_weight_kg - clientForm.values.weight_kg) / 0.25) / 4)
                        : Math.ceil(Math.ceil(Math.abs(clientForm.values.goal_weight_kg - clientForm.values.weight_kg) / 0.125) / 4)
                      }
                    </Text>
                  </Box>
                </SimpleGrid>
                <Text size="xs" c="dimmed" mt="md" style={{ fontStyle: "italic" }}>
                  • Mujeres pueden tardar el doble de tiempo en lograrlo
                </Text>
              </Paper>
            </Stack>
          </SimpleGrid>
        </Tabs.Panel>

        {/* Supplements Tab */}
        <Tabs.Panel value="supplements">
          <Paper p="lg" radius="md" withBorder>
            <Text fw={600} mb="lg" size="lg">
              Suplementación Deportiva
            </Text>

            {mealPlan.supplements && mealPlan.supplements.length > 0 ? (
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Suplemento</Table.Th>
                    <Table.Th>Dosis</Table.Th>
                    <Table.Th>Momento</Table.Th>
                    <Table.Th>Notas</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {mealPlan.supplements.map((supp) => (
                    <Table.Tr key={supp.id}>
                      <Table.Td fw={500}>{supp.name}</Table.Td>
                      <Table.Td>{supp.dosage}</Table.Td>
                      <Table.Td>{supp.timing}</Table.Td>
                      <Table.Td>{supp.notes || "-"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Box py="xl" ta="center">
                <ThemeIcon color="gray" size={60} variant="light" radius="xl" mb="md">
                  <IconPill size={30} />
                </ThemeIcon>
                <Text fw={500}>No hay suplementación asignada</Text>
                <Text c="dimmed" size="sm">
                  Añade suplementos recomendados para este plan
                </Text>
              </Box>
            )}

            {/* Example supplementation recommendations */}
            <Divider my="lg" label="Recomendaciones de ejemplo" labelPosition="center" />
            <Stack gap="xs">
              <Text size="sm">
                <strong>1 Multivitamínico</strong> con comida 1 y comida 5
              </Text>
              <Text size="sm">
                <strong>Omega 3</strong> - con comida 1, 3 y 5
              </Text>
              <Text size="sm">
                <strong>Intra entrenamiento o 10g EAAs + 10g GLUTAMINA + 10g CREATINA</strong>
              </Text>
              <Text size="sm">
                <strong>Antes de dormir:</strong> ZMA 3 cápsulas
              </Text>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Important notice */}
      <Paper p="md" mt="lg" bg="red.0" radius="md" withBorder style={{ borderColor: "var(--mantine-color-red-4)" }}>
        <Group gap="xs">
          <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
          <Text fw={600} c="red" size="sm">
            IMPORTANTE: Siempre se debe revisar que el PDF no contenga ningún alimento al que el cliente pueda ser o sea intolerante o alérgico y avisar para su cambio.
          </Text>
        </Group>
      </Paper>
    </Box>
  );
}

// Sub-component for displaying days and meals
interface MealPlanDaysViewProps {
  days: DayPlan[];
  clientAllergens: string[];
}

function MealPlanDaysView({ days, clientAllergens }: MealPlanDaysViewProps) {
  const [selectedDay, setSelectedDay] = useState(0);

  if (!days || days.length === 0) {
    return (
      <Paper p="xl" ta="center" withBorder radius="md">
        <ThemeIcon color="gray" size={60} variant="light" radius="xl" mb="md">
          <IconSalad size={30} />
        </ThemeIcon>
        <Text fw={500}>No hay comidas configuradas</Text>
        <Text c="dimmed" size="sm">
          Edita el plan para añadir comidas
        </Text>
      </Paper>
    );
  }

  const currentDay = days[selectedDay];

  // Calculate day totals
  const dayTotals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    currentDay?.meals?.forEach((meal) => {
      getMealFoods(meal).forEach((food) => {
        calories += food.calories || 0;
        protein += food.protein || 0;
        carbs += food.carbs || 0;
        fat += food.fat || 0;
      });
    });

    return { calories, protein, carbs, fat };
  }, [currentDay]);

  const isAllergen = (foodName: string, foodAllergens?: string[]) => {
    if (!clientAllergens.length) return false;
    
    // Check food allergens array
    if (foodAllergens?.some((a) => clientAllergens.some((ca) => ca.toLowerCase() === a.toLowerCase()))) {
      return true;
    }
    
    // Check food name for common allergens
    const lowerName = foodName.toLowerCase();
    return clientAllergens.some((allergen) => lowerName.includes(allergen.toLowerCase()));
  };

  return (
    <Box>
      {/* Day selector */}
      <ScrollArea mb="lg">
        <Group gap="xs" wrap="nowrap">
          {days.map((day, index) => (
            <Button
              key={day.id}
              variant={selectedDay === index ? "filled" : "light"}
              onClick={() => setSelectedDay(index)}
              size="sm"
            >
              {day.dayName}
            </Button>
          ))}
        </Group>
      </ScrollArea>

      {/* Day summary */}
      <Paper p="md" mb="lg" withBorder radius="md" bg="gray.0">
        <Group justify="space-around">
          <Box ta="center">
            <Text size="xs" c="dimmed">
              KCAL
            </Text>
            <Text fw={700} size="xl">
              {Math.round(dayTotals.calories)}
            </Text>
          </Box>
          <Divider orientation="vertical" />
          <Box ta="center">
            <Text size="xs" c="dimmed">
              PROT
            </Text>
            <Text fw={700} size="xl" c="green">
              {dayTotals.protein.toFixed(1)}g
            </Text>
          </Box>
          <Divider orientation="vertical" />
          <Box ta="center">
            <Text size="xs" c="dimmed">
              HC
            </Text>
            <Text fw={700} size="xl" c="orange">
              {dayTotals.carbs.toFixed(1)}g
            </Text>
          </Box>
          <Divider orientation="vertical" />
          <Box ta="center">
            <Text size="xs" c="dimmed">
              GRASA
            </Text>
            <Text fw={700} size="xl" c="grape">
              {dayTotals.fat.toFixed(1)}g
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* Meals table */}
      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <Table withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: "var(--mantine-color-dark-6)" }}>
              <Table.Th c="white" w={100}>
                HORA
              </Table.Th>
              <Table.Th c="white">COMIDA</Table.Th>
              <Table.Th c="white" ta="right" w={80}>
                KCAL
              </Table.Th>
              <Table.Th c="white" ta="right" w={80}>
                PROT
              </Table.Th>
              <Table.Th c="white" ta="right" w={80}>
                HC
              </Table.Th>
              <Table.Th c="white" ta="right" w={80}>
                GRASA
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {currentDay?.meals?.map((meal, mealIndex) => {
              const foods = getMealFoods(meal);
              const mealTotals = foods.reduce(
                (acc, food) => ({
                  calories: acc.calories + (food.calories || 0),
                  protein: acc.protein + (food.protein || 0),
                  carbs: acc.carbs + (food.carbs || 0),
                  fat: acc.fat + (food.fat || 0),
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
              );

              return (
                <Table.Tr key={meal.id} style={{ backgroundColor: mealIndex % 2 === 0 ? "var(--mantine-color-green-0)" : "var(--mantine-color-gray-0)" }}>
                  <Table.Td fw={600}>{meal.name}</Table.Td>
                  <Table.Td>
                    {foods.map((food, foodIndex) => (
                      <Text
                        key={food.id}
                        size="sm"
                        c={isAllergen(food.name, food.allergens) ? "red" : undefined}
                        fw={isAllergen(food.name, food.allergens) ? 700 : undefined}
                      >
                        {food.quantity}{food.unit || "g"} {food.name}
                        {isAllergen(food.name, food.allergens) && (
                          <Tooltip label="¡Contiene alérgeno!">
                            <IconAlertTriangle size={14} style={{ marginLeft: 4, verticalAlign: "middle" }} color="red" />
                          </Tooltip>
                        )}
                        {foodIndex < foods.length - 1 && " + "}
                      </Text>
                    ))}
                    {foods.length === 0 && <Text size="sm" c="dimmed">(sin alimentos)</Text>}
                  </Table.Td>
                  <Table.Td ta="right">{Math.round(mealTotals.calories)}</Table.Td>
                  <Table.Td ta="right">{mealTotals.protein.toFixed(1)}</Table.Td>
                  <Table.Td ta="right">{mealTotals.carbs.toFixed(1)}</Table.Td>
                  <Table.Td ta="right">{mealTotals.fat.toFixed(1)}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>

      {currentDay?.notes && (
        <Paper p="md" mt="md" withBorder radius="md">
          <Text fw={600} size="sm" mb="xs">
            Notas del día:
          </Text>
          <Text size="sm" c="dimmed">
            {currentDay.notes}
          </Text>
        </Paper>
      )}
    </Box>
  );
}

export default MealPlanDetailView;
