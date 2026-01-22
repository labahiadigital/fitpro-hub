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
  Tabs,
  RingProgress,
  Table,
  ActionIcon,
} from "@mantine/core";
import {
  IconApple,
  IconCoffee,
  IconFlame,
  IconMeat,
  IconPlus,
  IconSalad,
  IconSoup,
} from "@tabler/icons-react";
import { useAuthStore } from "../../stores/auth";

// Datos de ejemplo
const mockNutritionData = {
  dailyGoals: {
    calories: { current: 1650, target: 2680 },
    protein: { current: 95, target: 140 },
    carbs: { current: 180, target: 342 },
    fats: { current: 55, target: 83 },
  },
  meals: [
    {
      name: "Desayuno",
      time: "08:30",
      icon: IconCoffee,
      calories: 450,
      foods: ["Avena con plátano", "Claras de huevo x4", "Tostada integral"],
      logged: true,
    },
    {
      name: "Almuerzo",
      time: "13:00",
      icon: IconSoup,
      calories: 650,
      foods: ["Pechuga de pollo 200g", "Arroz integral 150g", "Ensalada mixta"],
      logged: true,
    },
    {
      name: "Merienda",
      time: "17:00",
      icon: IconApple,
      calories: 250,
      foods: ["Yogur griego", "Frutos secos 30g"],
      logged: true,
    },
    {
      name: "Cena",
      time: "21:00",
      icon: IconSalad,
      calories: 0,
      foods: [],
      logged: false,
    },
  ],
  mealPlan: {
    name: "Plan Hipertrofia",
    assignedBy: "E13 Fitness",
    startDate: "15 Ene 2026",
  },
  weekSummary: [
    { day: "L", calories: 2650, target: 2680 },
    { day: "M", calories: 2580, target: 2680 },
    { day: "X", calories: 2720, target: 2680 },
    { day: "J", calories: 2100, target: 2680 },
    { day: "V", calories: 1650, target: 2680 },
    { day: "S", calories: 0, target: 2680 },
    { day: "D", calories: 0, target: 2680 },
  ],
};

function MacroCard({ 
  label, 
  current, 
  target, 
  unit, 
  color 
}: { 
  label: string; 
  current: number; 
  target: number; 
  unit: string;
  color: string;
}) {
  const percentage = Math.min((current / target) * 100, 100);
  return (
    <Card shadow="sm" padding="md" radius="lg" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">{label}</Text>
        <Badge color={color} variant="light" size="sm">
          {Math.round(percentage)}%
        </Badge>
      </Group>
      <Text size="xl" fw={700}>{current}<Text span size="sm" c="dimmed">/{target}{unit}</Text></Text>
      <Progress value={percentage} color={color} size="sm" radius="xl" mt="xs" />
    </Card>
  );
}

export function MyNutritionPage() {
  const { user } = useAuthStore();
  const data = mockNutritionData;
  const caloriesPercentage = (data.dailyGoals.calories.current / data.dailyGoals.calories.target) * 100;

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mi Nutrición</Title>
          <Text c="dimmed">Seguimiento de tu alimentación diaria</Text>
        </Box>
        <Button leftSection={<IconPlus size={16} />} color="yellow">
          Registrar comida
        </Button>
      </Group>

      {/* Plan Info */}
      {data.mealPlan && (
        <Paper p="md" radius="lg" mb="xl" style={{ background: "var(--mantine-color-yellow-light)" }}>
          <Group justify="space-between">
            <Box>
              <Text size="sm" c="dimmed">Plan nutricional asignado</Text>
              <Text fw={600}>{data.mealPlan.name}</Text>
            </Box>
            <Box ta="right">
              <Text size="sm" c="dimmed">Asignado por</Text>
              <Text fw={500}>{data.mealPlan.assignedBy}</Text>
            </Box>
          </Group>
        </Paper>
      )}

      {/* Daily Summary */}
      <Card shadow="sm" padding="lg" radius="lg" withBorder mb="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text size="lg" fw={600} mb="md">Resumen del Día</Text>
            <SimpleGrid cols={2} spacing="md">
              <MacroCard 
                label="Proteínas" 
                current={data.dailyGoals.protein.current} 
                target={data.dailyGoals.protein.target} 
                unit="g" 
                color="red" 
              />
              <MacroCard 
                label="Carbohidratos" 
                current={data.dailyGoals.carbs.current} 
                target={data.dailyGoals.carbs.target} 
                unit="g" 
                color="blue" 
              />
              <MacroCard 
                label="Grasas" 
                current={data.dailyGoals.fats.current} 
                target={data.dailyGoals.fats.target} 
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
              sections={[{ value: caloriesPercentage, color: "yellow" }]}
              label={
                <Box>
                  <Text size="xl" fw={700}>{data.dailyGoals.calories.current}</Text>
                  <Text size="xs" c="dimmed">de {data.dailyGoals.calories.target} kcal</Text>
                </Box>
              }
            />
            <Text size="sm" fw={500} mt="xs">Calorías consumidas</Text>
          </Box>
        </Group>
      </Card>

      {/* Meals */}
      <Title order={4} mb="md">Comidas de Hoy</Title>
      <Stack gap="md" mb="xl">
        {data.meals.map((meal, index) => (
          <Card key={index} shadow="sm" padding="md" radius="lg" withBorder>
            <Group justify="space-between">
              <Group>
                <ThemeIcon 
                  variant={meal.logged ? "filled" : "light"} 
                  color={meal.logged ? "yellow" : "gray"} 
                  size="lg" 
                  radius="md"
                >
                  <meal.icon size={20} />
                </ThemeIcon>
                <Box>
                  <Group gap="xs">
                    <Text fw={600}>{meal.name}</Text>
                    <Text size="sm" c="dimmed">{meal.time}</Text>
                  </Group>
                  {meal.logged ? (
                    <Text size="sm" c="dimmed">{meal.foods.join(" • ")}</Text>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic">Sin registrar</Text>
                  )}
                </Box>
              </Group>
              <Group>
                {meal.logged && (
                  <Badge variant="light" color="orange" size="lg">
                    <Group gap={4}>
                      <IconFlame size={14} />
                      {meal.calories} kcal
                    </Group>
                  </Badge>
                )}
                <Button 
                  variant={meal.logged ? "light" : "filled"} 
                  size="sm"
                  color={meal.logged ? "gray" : "yellow"}
                >
                  {meal.logged ? "Editar" : "Registrar"}
                </Button>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>

      {/* Weekly Overview */}
      <Title order={4} mb="md">Resumen Semanal</Title>
      <Card shadow="sm" padding="lg" radius="lg" withBorder>
        <Group justify="space-around">
          {data.weekSummary.map((day, index) => {
            const percentage = day.calories > 0 ? (day.calories / day.target) * 100 : 0;
            const isToday = index === 4; // Viernes en este ejemplo
            return (
              <Box key={index} ta="center">
                <Text size="sm" c={isToday ? "yellow" : "dimmed"} fw={isToday ? 700 : 400}>
                  {day.day}
                </Text>
                <RingProgress
                  size={50}
                  thickness={4}
                  roundCaps
                  sections={[{ value: percentage, color: percentage >= 90 ? "green" : percentage > 0 ? "yellow" : "gray" }]}
                  label={
                    <Text size="xs" ta="center">
                      {percentage > 0 ? `${Math.round(percentage)}%` : "-"}
                    </Text>
                  }
                />
              </Box>
            );
          })}
        </Group>
      </Card>
    </Box>
  );
}
