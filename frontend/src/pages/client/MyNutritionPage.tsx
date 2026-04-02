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
  TextInput,
  NumberInput,
  Select,
  ActionIcon,
  Menu,
  Modal,
  ScrollArea,
  Tabs,
} from "@mantine/core";
import { useDisclosure, useMediaQuery, useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import {
  IconApple,
  IconArrowsExchange,
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconCoffee,
  IconDotsVertical,
  IconHistory,
  IconPlus,
  IconSalad,
  IconSearch,
  IconSoup,
  IconToolsKitchen2,
  IconTrash,
  IconUsers,
  IconMoon,
  IconMoodSmile,
  IconMoodSad,
  IconMoodEmpty,
  IconX,
} from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { useState, useMemo } from "react";
import {
  useMyMealPlan,
  useNutritionLogs,
  useLogNutrition,
  useNutritionHistory,
  useClientFoodSearch,
} from "../../hooks/useClientPortal";
import { useClientRecipes } from "../../hooks/useRecipes";
import { RecipeDetailModal } from "../../components/recipes/RecipeDetailModal";
import type { Recipe } from "../../types/recipe";
import { FullPageDetail } from "../../components/common/FullPageDetail";
import { DayCardMenu } from "../../components/common/DayCardMenu";
import { MasterDetailLayout } from "../../components/common/MasterDetailLayout";
import { NativeBottomSheet } from "../../components/common/NativeBottomSheet";

// Tipos de comidas con sus iconos
const MEAL_TYPES = [
  { value: "Desayuno", label: "Desayuno", icon: IconCoffee, time: "08:00", color: "orange" },
  { value: "Almuerzo", label: "Almuerzo", icon: IconSoup, time: "13:00", color: "green" },
  { value: "Merienda", label: "Merienda", icon: IconApple, time: "17:00", color: "yellow" },
  { value: "Cena", label: "Cena", icon: IconSalad, time: "21:00", color: "blue" },
  { value: "Snack", label: "Tentempié", icon: IconMoon, time: "23:00", color: "grape" },
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
function SatisfactionSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const options = [
    { rating: 1, icon: IconMoodSad, label: "Mal", color: "red" },
    { rating: 2, icon: IconMoodEmpty, label: "Normal", color: "yellow" },
    { rating: 3, icon: IconMoodSmile, label: "Bien", color: "green" },
  ];
  return (
    <Box>
      <Text size="sm" fw={500} mb={4}>¿Cómo te ha sentado?</Text>
      <Group gap="xs">
        {options.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.rating;
          return (
            <Button
              key={opt.rating}
              variant={selected ? "filled" : "light"}
              color={opt.color}
              size="sm"
              leftSection={<Icon size={18} />}
              onClick={() => onChange(selected ? null : opt.rating)}
            >
              {opt.label}
            </Button>
          );
        })}
      </Group>
    </Box>
  );
}

interface SearchableFoodResult {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function FoodSearchInput({
  onSelect,
}: {
  onSelect: (food: SearchableFoodResult, grams: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const [showResults, setShowResults] = useState(false);
  const { data: searchResults, isFetching } = useClientFoodSearch(debouncedQuery);

  const handleSelect = (food: SearchableFoodResult) => {
    const grams = food.serving_size || 100;
    onSelect(food, grams);
    setQuery("");
    setShowResults(false);
  };

  return (
    <Box pos="relative" px="md" mb="sm">
      <TextInput
        leftSection={<IconSearch size={16} />}
        rightSection={isFetching ? <Loader size={14} /> : query ? (
          <ActionIcon size="sm" variant="subtle" onClick={() => { setQuery(""); setShowResults(false); }}>
            <IconX size={14} />
          </ActionIcon>
        ) : null}
        placeholder="Buscar alimento..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => query.length >= 2 && setShowResults(true)}
        size="sm"
        styles={{ input: { height: 44, borderRadius: 12 } }}
      />
      {showResults && searchResults?.items?.length > 0 && (
        <Paper
          shadow="lg"
          radius="md"
          withBorder
          pos="absolute"
          left={16}
          right={16}
          style={{ zIndex: 50, maxHeight: 260, overflowY: "auto" }}
        >
          {searchResults.items.map((food: SearchableFoodResult) => (
            <Box
              key={food.id}
              px="sm"
              py="xs"
              onClick={() => handleSelect(food)}
              style={{
                cursor: "pointer",
                borderBottom: "1px solid var(--mantine-color-gray-1)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--mantine-color-gray-0)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Box style={{ minWidth: 0 }}>
                  <Text size="sm" fw={500} lineClamp={1}>{food.name}</Text>
                  {food.brand && <Text size="xs" c="dimmed">{food.brand}</Text>}
                </Box>
                <Group gap={4} style={{ flexShrink: 0 }}>
                  <Badge size="xs" variant="light" color="orange">{Math.round(food.calories)} kcal</Badge>
                  <Badge size="xs" variant="outline" color="red">P:{Math.round(food.protein)}</Badge>
                </Group>
              </Group>
            </Box>
          ))}
        </Paper>
      )}
      {showResults && debouncedQuery.length >= 2 && !isFetching && (!searchResults?.items?.length) && (
        <Paper shadow="md" radius="md" withBorder pos="absolute" left={16} right={16} style={{ zIndex: 50 }} p="md">
          <Text size="sm" c="dimmed" ta="center">Sin resultados para "{debouncedQuery}"</Text>
        </Paper>
      )}
    </Box>
  );
}

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
    satisfaction_rating?: number;
  }) => void;
  isLoading: boolean;
}) {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);

  const form = useForm({
    initialValues: {
      meal_name: "Desayuno",
      notes: "",
    },
  });

  const addFoodFromSearch = (food: SearchableFoodResult, grams: number) => {
    const servingSize = food.serving_size || 100;
    const factor = grams / servingSize;
    setFoods((prev) => [
      ...prev,
      {
        name: food.name,
        calories: Math.round(food.calories * factor),
        protein: Math.round(food.protein * factor * 10) / 10,
        carbs: Math.round(food.carbs * factor * 10) / 10,
        fat: Math.round(food.fat * factor * 10) / 10,
        quantity: grams,
      },
    ]);
  };

  const addManualFood = () => {
    setFoods((prev) => [
      ...prev,
      { name: "", calories: 0, protein: 0, carbs: 0, fat: 0, quantity: 100 },
    ]);
  };

  const removeFood = (index: number) => {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFood = (index: number, field: keyof FoodItem, value: string | number) => {
    setFoods((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = () => {
    const validFoods = foods.filter((f) => f.name.trim() !== "");
    if (validFoods.length === 0) return;

    onSubmit({
      meal_name: form.values.meal_name,
      foods: validFoods,
      notes: form.values.notes || undefined,
      satisfaction_rating: satisfactionRating ?? undefined,
    });

    form.reset();
    setFoods([]);
    setSatisfactionRating(null);
  };

  const isMobileView = useMediaQuery("(max-width: 768px)");

  if (!opened) return null;

  const totalMacros = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      protein: acc.protein + (f.protein || 0),
      carbs: acc.carbs + (f.carbs || 0),
      fat: acc.fat + (f.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const foodRows = foods.map((food, index) => (
    <Box key={index} px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
      <Group gap="xs" mb="xs" wrap="nowrap">
        <TextInput
          placeholder="Nombre del alimento"
          value={food.name}
          onChange={(e) => updateFood(index, "name", e.target.value)}
          size="sm"
          style={{ flex: 1 }}
          styles={{ input: { height: 44, borderRadius: 10 } }}
        />
        <NumberInput
          placeholder="g"
          value={food.quantity}
          onChange={(val) => updateFood(index, "quantity", val || 100)}
          min={1}
          step={10}
          size="sm"
          w={70}
          hideControls
          suffix="g"
          styles={{ input: { height: 44, borderRadius: 10, textAlign: "center" } }}
        />
        <ActionIcon
          color="red"
          variant="light"
          onClick={() => removeFood(index)}
          size="lg"
          radius="xl"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        <NumberInput placeholder="Kcal" value={food.calories || ""} onChange={(val) => updateFood(index, "calories", val || 0)} min={0} size="sm" hideControls styles={{ input: { height: 40, borderRadius: 8, textAlign: "center", background: "var(--mantine-color-gray-0)", border: "none", fontWeight: 600 } }} />
        <NumberInput placeholder="Prot" value={food.protein || ""} onChange={(val) => updateFood(index, "protein", val || 0)} min={0} decimalScale={1} size="sm" hideControls styles={{ input: { height: 40, borderRadius: 8, textAlign: "center", background: "var(--mantine-color-red-0)", border: "none", fontWeight: 600 } }} />
        <NumberInput placeholder="Carbs" value={food.carbs || ""} onChange={(val) => updateFood(index, "carbs", val || 0)} min={0} decimalScale={1} size="sm" hideControls styles={{ input: { height: 40, borderRadius: 8, textAlign: "center", background: "var(--mantine-color-blue-0)", border: "none", fontWeight: 600 } }} />
        <NumberInput placeholder="Grasas" value={food.fat || ""} onChange={(val) => updateFood(index, "fat", val || 0)} min={0} decimalScale={1} size="sm" hideControls styles={{ input: { height: 40, borderRadius: 8, textAlign: "center", background: "var(--mantine-color-grape-0)", border: "none", fontWeight: 600 } }} />
      </div>
      {index === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: -2 }}>
          <Text size="xs" c="dimmed" ta="center">Kcal</Text>
          <Text size="xs" c="dimmed" ta="center">Prot (g)</Text>
          <Text size="xs" c="dimmed" ta="center">Carbs (g)</Text>
          <Text size="xs" c="dimmed" ta="center">Grasas (g)</Text>
        </div>
      )}
    </Box>
  ));

  const searchAndAddButtons = (
    <Box mt="sm">
      <FoodSearchInput onSelect={addFoodFromSearch} />
      <Box px="md">
        <Button variant="subtle" leftSection={<IconPlus size={16} />} onClick={addManualFood} fullWidth size="sm" radius="xl" color="gray">
          Añadir manualmente
        </Button>
      </Box>
    </Box>
  );

  const notesAndSatisfaction = (
    <Box px="md" mt="md">
      <TextInput placeholder="Notas (opcional)" {...form.getInputProps("notes")} size="sm" styles={{ input: { height: 44, borderRadius: 10 } }} />
      <Box mt="sm">
        <SatisfactionSelector value={satisfactionRating} onChange={setSatisfactionRating} />
      </Box>
    </Box>
  );

  const submitButton = (
    <Button
      color="yellow"
      onClick={handleSubmit}
      loading={isLoading}
      disabled={foods.length === 0 || foods.every((f) => f.name.trim() === "")}
      fullWidth
      size="lg"
      radius="xl"
      styles={{ root: { height: 48, fontWeight: 700 } }}
    >
      Registrar Comida ({Math.round(totalMacros.calories)} kcal)
    </Button>
  );

  if (!isMobileView) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="xs">
            <Text fw={700}>Registrar Comida</Text>
            <Select
              data={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))}
              {...form.getInputProps("meal_name")}
              size="xs"
              w={130}
              styles={{ input: { borderRadius: 10, height: 36 } }}
            />
          </Group>
        }
        size="lg"
        radius="lg"
        centered
        styles={{
          body: { padding: 0 },
          header: { borderBottom: "1px solid var(--mantine-color-gray-2)", padding: "12px 20px" },
        }}
      >
        <ScrollArea mah="60vh">
          {foodRows}
          {searchAndAddButtons}
          {notesAndSatisfaction}
        </ScrollArea>
        <Box p="md" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
          {submitButton}
        </Box>
      </Modal>
    );
  }

  return (
    <Box
      pos="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      style={{ zIndex: 300, background: "var(--mantine-color-gray-0)", display: "flex", flexDirection: "column" }}
    >
      <Box
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
        }}
      >
        <Group justify="space-between" style={{ width: "100%" }}>
          <Group gap="xs">
            <ActionIcon variant="subtle" size="lg" onClick={onClose} radius="xl">
              <IconX size={20} />
            </ActionIcon>
            <Box>
              <Text fw={700} size="sm">Registrar Comida</Text>
              <Text size="xs" c="dimmed">{foods.filter(f => f.name.trim()).length} alimentos • {Math.round(totalMacros.calories)} kcal</Text>
            </Box>
          </Group>
          <Select
            data={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))}
            {...form.getInputProps("meal_name")}
            size="xs"
            w={130}
            styles={{ input: { borderRadius: 10, height: 36 } }}
          />
        </Group>
      </Box>

      <Box style={{ flex: 1, overflowY: "auto" }} py="sm">
        {foodRows}
        {searchAndAddButtons}
        {notesAndSatisfaction}
      </Box>

      <Box
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--mantine-color-gray-2)",
          background: "#fff",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}
        px="md"
        py="sm"
      >
        {submitButton}
      </Box>
    </Box>
  );
}

// Interface para comidas del plan
interface PlanMealFoodItem {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  quantity: number;
  unit: string;
}

interface SupplementData {
  id: string;
  name: string;
  brand?: string;
  calories: string | number;
  protein: string | number;
  carbs: string | number;
  fat: string | number;
  serving_size: string;
}

interface PlanMeal {
  id: string;
  name: string;
  time: string;
  items: Array<{
    id: string;
    food_id?: string;
    supplement_id?: string;
    food?: {
      id: string;
      name: string;
      calories: string | number;
      protein: string | number;
      carbs: string | number;
      fat: string | number;
      serving_size: string;
    };
    supplement?: SupplementData;
    quantity_grams: number;
    type: "food" | "supplement";
  }>;
  foods?: PlanMealFoodItem[];
}

interface PlanDay {
  id: string;
  day: number;
  dayName: string;
  meals: PlanMeal[];
  notes?: string;
}

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
    satisfaction_rating?: number;
  }) => void;
  isLoading: boolean;
  meal: PlanMeal | null;
}) {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [notes, setNotes] = useState("");
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (opened && !initialized && meal) {
    const initial: FoodItem[] = meal.items.map((item) => {
      const food = item.food || item.supplement;
      const servingSize = parseFloat(String(food?.serving_size || "100")) || 100;
      const factor = item.quantity_grams / servingSize;
      return {
        name: food?.name || "Alimento",
        calories: Math.round(Number(food?.calories || 0) * factor),
        protein: Math.round(Number(food?.protein || 0) * factor * 10) / 10,
        carbs: Math.round(Number(food?.carbs || 0) * factor * 10) / 10,
        fat: Math.round(Number(food?.fat || 0) * factor * 10) / 10,
        quantity: item.quantity_grams,
      };
    });
    setFoods(initial);
    setInitialized(true);
  }

  const handleClose = () => {
    setFoods([]);
    setNotes("");
    setSatisfactionRating(null);
    setInitialized(false);
    onClose();
  };

  const updateFood = (index: number, field: keyof FoodItem, value: string | number) => {
    setFoods((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeFood = (index: number) => {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  };

  const addFoodFromSearch = (food: SearchableFoodResult, grams: number) => {
    const servingSize = food.serving_size || 100;
    const factor = grams / servingSize;
    setFoods((prev) => [
      ...prev,
      {
        name: food.name,
        calories: Math.round(food.calories * factor),
        protein: Math.round(food.protein * factor * 10) / 10,
        carbs: Math.round(food.carbs * factor * 10) / 10,
        fat: Math.round(food.fat * factor * 10) / 10,
        quantity: grams,
      },
    ]);
  };

  const addManualFood = () => {
    setFoods((prev) => [
      ...prev,
      { name: "", calories: 0, protein: 0, carbs: 0, fat: 0, quantity: 100 },
    ]);
  };

  const handleSubmit = () => {
    const validFoods = foods.filter((f) => f.name.trim() !== "");
    if (validFoods.length === 0) return;

    onSubmit({
      meal_name: meal?.name || "Comida",
      foods: validFoods,
      notes: notes || undefined,
      satisfaction_rating: satisfactionRating ?? undefined,
    });

    setFoods([]);
    setNotes("");
    setSatisfactionRating(null);
    setInitialized(false);
  };

  const totalMacros = useMemo(
    () =>
      foods.reduce(
        (acc, f) => ({
          calories: acc.calories + (f.calories || 0),
          protein: acc.protein + (f.protein || 0),
          carbs: acc.carbs + (f.carbs || 0),
          fat: acc.fat + (f.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [foods]
  );

  if (!meal) return null;

  return (
    <NativeBottomSheet
      opened={opened}
      onClose={handleClose}
      title={`Registrar ${meal.name}`}
      subtitle={`${foods.length} alimentos • ${Math.round(totalMacros.calories)} kcal`}
      footer={
        <Button
          color="yellow"
          onClick={handleSubmit}
          loading={isLoading}
          leftSection={<IconCheck size={18} />}
          disabled={foods.length === 0 || foods.every((f) => f.name.trim() === "")}
          fullWidth
          size="lg"
          radius="xl"
          styles={{ root: { height: 48, fontWeight: 700 } }}
        >
          Registrar ({Math.round(totalMacros.calories)} kcal)
        </Button>
      }
    >
      {foods.map((food, index) => (
        <Box key={index} px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Group gap="xs" mb="xs" wrap="nowrap">
            <TextInput
              placeholder="Nombre del alimento"
              value={food.name}
              onChange={(e) => updateFood(index, "name", e.target.value)}
              size="sm"
              style={{ flex: 1 }}
              styles={{ input: { height: 44, borderRadius: 10 } }}
            />
            <NumberInput
              placeholder="g"
              value={food.quantity}
              onChange={(val) => updateFood(index, "quantity", val || 100)}
              min={1}
              step={10}
              size="sm"
              w={70}
              hideControls
              suffix="g"
              styles={{ input: { height: 44, borderRadius: 10, textAlign: "center" } }}
            />
            <ActionIcon color="red" variant="light" onClick={() => removeFood(index)} size="lg" radius="xl">
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            <NumberInput placeholder="Kcal" value={food.calories || ""} onChange={(val) => updateFood(index, "calories", val || 0)} min={0} size="sm" hideControls styles={{ input: { height: 40, borderRadius: 8, textAlign: "center", background: "var(--mantine-color-gray-0)", border: "none", fontWeight: 600 } }} />
            <NumberInput placeholder="Prot" value={food.protein || ""} onChange={(val) => updateFood(index, "protein", val || 0)} min={0} decimalScale={1} size="sm" hideControls styles={{ input: { height: 40, borderRadius: 8, textAlign: "center", background: "var(--mantine-color-red-0)", border: "none", fontWeight: 600 } }} />
            <NumberInput placeholder="Carbs" value={food.carbs || ""} onChange={(val) => updateFood(index, "carbs", val || 0)} min={0} decimalScale={1} size="sm" hideControls styles={{ input: { height: 40, borderRadius: 8, textAlign: "center", background: "var(--mantine-color-blue-0)", border: "none", fontWeight: 600 } }} />
            <NumberInput placeholder="Grasas" value={food.fat || ""} onChange={(val) => updateFood(index, "fat", val || 0)} min={0} decimalScale={1} size="sm" hideControls styles={{ input: { height: 40, borderRadius: 8, textAlign: "center", background: "var(--mantine-color-grape-0)", border: "none", fontWeight: 600 } }} />
          </div>
          {index === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: -2 }}>
              <Text size="xs" c="dimmed" ta="center">Kcal</Text>
              <Text size="xs" c="dimmed" ta="center">Prot (g)</Text>
              <Text size="xs" c="dimmed" ta="center">Carbs (g)</Text>
              <Text size="xs" c="dimmed" ta="center">Grasas (g)</Text>
            </div>
          )}
        </Box>
      ))}

      <Box mt="sm">
        <FoodSearchInput onSelect={addFoodFromSearch} />
        <Box px="md">
          <Button variant="subtle" leftSection={<IconPlus size={16} />} onClick={addManualFood} fullWidth size="sm" radius="xl" color="gray">
            Añadir manualmente
          </Button>
        </Box>
      </Box>

      <Box px="md" mt="md">
        <TextInput
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          size="sm"
          styles={{ input: { height: 44, borderRadius: 10 } }}
        />
        <Box mt="sm">
          <SatisfactionSelector value={satisfactionRating} onChange={setSatisfactionRating} />
        </Box>
      </Box>
    </NativeBottomSheet>
  );
}

function ClientRecipesTab() {
  const [recipeSearch, setRecipeSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [detailOpened, setDetailOpened] = useState(false);
  const { data: recipes = [], isLoading } = useClientRecipes(
    recipeSearch ? { search: recipeSearch } : undefined
  );

  return (
    <Stack gap="md">
      <TextInput
        leftSection={<IconSearch size={14} />}
        placeholder="Buscar recetas..."
        value={recipeSearch}
        onChange={(e) => setRecipeSearch(e.target.value)}
        size="sm"
        radius="md"
      />

      {isLoading ? (
        <Center py="xl"><Loader size="md" /></Center>
      ) : recipes.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {recipes.map((recipe: Recipe) => {
            const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
            const diffLabel = recipe.difficulty === "easy" ? "Fácil" : recipe.difficulty === "medium" ? "Media" : recipe.difficulty === "hard" ? "Difícil" : null;
            const diffColor = recipe.difficulty === "easy" ? "green" : recipe.difficulty === "medium" ? "yellow" : recipe.difficulty === "hard" ? "red" : "gray";
            const perServing = recipe.servings > 0 ? Math.round((recipe.total_calories || 0) / recipe.servings) : Math.round(recipe.total_calories || 0);

            return (
              <Card
                key={recipe.id}
                shadow="sm"
                padding="md"
                radius="lg"
                withBorder
                style={{ cursor: "pointer", transition: "transform 0.15s" }}
                onClick={() => { setSelectedRecipe(recipe); setDetailOpened(true); }}
              >
                <Group justify="space-between" mb="xs">
                  <Text fw={700} size="sm" lineClamp={1} style={{ flex: 1 }}>
                    {recipe.name}
                  </Text>
                  {recipe.is_global && (
                    <Badge size="xs" variant="light" color="violet">Sistema</Badge>
                  )}
                </Group>

                <Group gap={6} mb="xs" wrap="wrap">
                  {recipe.category && (
                    <Badge size="xs" variant="light" color="blue">{recipe.category}</Badge>
                  )}
                  {diffLabel && (
                    <Badge size="xs" variant="light" color={diffColor}>{diffLabel}</Badge>
                  )}
                  {totalTime > 0 && (
                    <Badge size="xs" variant="light" color="orange" leftSection={<IconClock size={8} />}>
                      {totalTime} min
                    </Badge>
                  )}
                  {recipe.servings > 1 && (
                    <Badge size="xs" variant="light" color="gray" leftSection={<IconUsers size={8} />}>
                      {recipe.servings} porc.
                    </Badge>
                  )}
                </Group>

                {recipe.description && (
                  <Text c="dimmed" lineClamp={2} size="xs" mb="xs">{recipe.description}</Text>
                )}

                <Group gap={4}>
                  <Badge color="blue" size="xs" variant="light">{Math.round(recipe.total_calories || 0)} kcal</Badge>
                  <Badge color="green" size="xs" variant="light">P:{Math.round(recipe.total_protein || 0)}g</Badge>
                  <Badge color="orange" size="xs" variant="light">C:{Math.round(recipe.total_carbs || 0)}g</Badge>
                  <Badge color="grape" size="xs" variant="light">G:{Math.round(recipe.total_fat || 0)}g</Badge>
                </Group>
                {recipe.servings > 1 && (
                  <Text size="xs" c="dimmed" mt={4}>{perServing} kcal/porción</Text>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
      ) : (
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <IconToolsKitchen2 size={36} style={{ color: "var(--mantine-color-dimmed)", marginBottom: 8 }} />
          <Text fw={600} size="md" mb={4}>No hay recetas disponibles</Text>
          <Text size="sm" c="dimmed">
            {recipeSearch ? "No se encontraron recetas con esa búsqueda." : "Tu entrenador aún no ha compartido recetas contigo."}
          </Text>
        </Paper>
      )}

      <RecipeDetailModal
        opened={detailOpened}
        onClose={() => { setDetailOpened(false); setSelectedRecipe(null); }}
        recipe={selectedRecipe}
        readOnly
      />
    </Stack>
  );
}

function NutritionDayDetail({
  dayData,
  targets,
  planMeals,
  mealDayOverrides,
  setMealDayOverrides,
  selectedWeekDayIndex,
}: {
  dayData: { dayName: string; calories: number; totals: { protein?: number; carbs?: number; fat?: number } };
  targets: { calories: number };
  planMeals: PlanMeal[];
  mealDayOverrides: Record<string, number>;
  setMealDayOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  selectedWeekDayIndex: number;
}) {
  const dayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return (
    <>
      <Title order={4} mb="md">{dayData.dayName}</Title>
      <SimpleGrid cols={2} spacing="sm" mb="lg">
        <Box ta="center" p="md" style={{ background: "var(--mantine-color-yellow-light)", borderRadius: "var(--mantine-radius-md)" }}>
          <Text size="xl" fw={700}>{dayData.calories}</Text>
          <Text size="xs" c="dimmed">kcal consumidas</Text>
          <Progress
            value={targets.calories > 0 ? Math.min((dayData.calories / targets.calories) * 100, 100) : 0}
            color="yellow"
            size="sm"
            mt="xs"
          />
        </Box>
        <Box ta="center" p="md" style={{ background: "var(--mantine-color-red-light)", borderRadius: "var(--mantine-radius-md)" }}>
          <Text size="xl" fw={700}>{Math.round(dayData.totals?.protein || 0)}g</Text>
          <Text size="xs" c="dimmed">Proteína</Text>
        </Box>
        <Box ta="center" p="md" style={{ background: "var(--mantine-color-blue-light)", borderRadius: "var(--mantine-radius-md)" }}>
          <Text size="xl" fw={700}>{Math.round(dayData.totals?.carbs || 0)}g</Text>
          <Text size="xs" c="dimmed">Carbohidratos</Text>
        </Box>
        <Box ta="center" p="md" style={{ background: "var(--mantine-color-grape-light)", borderRadius: "var(--mantine-radius-md)" }}>
          <Text size="xl" fw={700}>{Math.round(dayData.totals?.fat || 0)}g</Text>
          <Text size="xs" c="dimmed">Grasas</Text>
        </Box>
      </SimpleGrid>

      {planMeals && planMeals.length > 0 ? (
        <Box>
          <Text fw={600} mb="sm">Comidas del plan para {dayData.dayName}</Text>
          <Stack gap="sm">
            {planMeals.map((meal: PlanMeal, mealIndex: number) => {
              const mealType = MEAL_TYPES.find(m => m.value === meal.name);
              const mealFoods = meal.foods || meal.items?.map(item => {
                const food = item.food || item.supplement;
                const ss = parseFloat(String(food?.serving_size || "100")) || 100;
                const qty = item.quantity_grams || 0;
                const factor = qty / ss;
                return {
                  name: food?.name || "Alimento",
                  calories: Math.round(Number(food?.calories || 0) * factor),
                  protein_g: Math.round(Number(food?.protein || 0) * factor * 10) / 10,
                  carbs_g: Math.round(Number(food?.carbs || 0) * factor * 10) / 10,
                  fat_g: Math.round(Number(food?.fat || 0) * factor * 10) / 10,
                  quantity: qty,
                  unit: "g",
                };
              }) || [];
              const totalCalories = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.calories) || 0), 0);
              const totalProtein = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.protein_g) || 0), 0);
              const totalCarbs = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.carbs_g) || 0), 0);
              const totalFat = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.fat_g) || 0), 0);
              const MealIcon = mealType?.icon || IconSalad;
              const mealKey = `${selectedWeekDayIndex}-${mealIndex}`;

              return (
                <Card key={mealIndex} padding="md" radius="md" withBorder>
                  <Group justify="space-between" wrap="wrap">
                    <Group>
                      <ThemeIcon variant="light" color={mealType?.color || "gray"} size="lg" radius="xl">
                        <MealIcon size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm">{mealType?.label || meal.name}</Text>
                        <Text size="xs" c="dimmed">{mealFoods.length} alimentos</Text>
                      </Box>
                    </Group>
                    <Group gap="xs" wrap="wrap">
                      <Badge variant="light" color="yellow" size="sm">{totalCalories} kcal</Badge>
                      <Badge variant="outline" color="red" size="xs">P: {Math.round(totalProtein)}g</Badge>
                      <Badge variant="outline" color="blue" size="xs">C: {Math.round(totalCarbs)}g</Badge>
                      <Badge variant="outline" color="grape" size="xs">G: {Math.round(totalFat)}g</Badge>
                      <Menu shadow="md" width={180} position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" size="sm">
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>Mover a</Menu.Label>
                          {dayLabels.map((targetDay, targetIndex) => {
                            if (targetIndex === selectedWeekDayIndex) return null;
                            return (
                              <Menu.Item
                                key={targetIndex}
                                leftSection={<IconArrowsExchange size={14} />}
                                onClick={() => {
                                  setMealDayOverrides((prev) => ({ ...prev, [mealKey]: targetIndex }));
                                }}
                              >
                                {targetDay}
                              </Menu.Item>
                            );
                          })}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                  {mealDayOverrides[mealKey] !== undefined && (
                    <Badge variant="light" color="blue" size="xs" mt="xs">
                      Movida a {dayLabels[mealDayOverrides[mealKey]]}
                    </Badge>
                  )}
                  {mealFoods.length > 0 && (
                    <Stack gap="xs" mt="sm" ml={54}>
                      {mealFoods.map((food: PlanMealFoodItem, foodIndex: number) => (
                        <Group key={foodIndex} justify="space-between">
                          <Text size="sm">{food.name}</Text>
                          <Text size="xs" c="dimmed">
                            {food.quantity}{food.unit} - {food.calories} kcal
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  )}
                </Card>
              );
            })}
          </Stack>
        </Box>
      ) : (
        <Text c="dimmed" ta="center">No hay comidas asignadas en el plan para este día</Text>
      )}
    </>
  );
}

export function MyNutritionPage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isMdUp = useMediaQuery("(min-width: 1024px)");
  const [activeTab, setActiveTab] = useState<string | null>("today");
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [planMealModalOpened, { open: openPlanMealModal, close: closePlanMealModal }] = useDisclosure(false);
  const [selectedPlanMeal, setSelectedPlanMeal] = useState<PlanMeal | null>(null);
  const [selectedWeekDayIndex, setSelectedWeekDayIndex] = useState<number | null>(null);
  const [mealDayOverrides, setMealDayOverrides] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [historyDetailDay, setHistoryDetailDay] = useState<string | null>(null);
  
  // Hooks para datos reales del backend
  const { data: mealPlan, isLoading: isLoadingPlan } = useMyMealPlan();
  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const { data: nutritionLogs } = useNutritionLogs(selectedDateStr, 50);
  const { data: nutritionHistory } = useNutritionHistory(30);
  const logNutritionMutation = useLogNutrition();

  const dayMapping = [7, 1, 2, 3, 4, 5, 6]; // Domingo=7, Lunes=1, etc.
  const selectedPlanDay = dayMapping[selectedDate.getDay()];

  const selectedPlanMeals = useMemo(() => {
    if (!mealPlan?.plan?.days) return [];
    
    const dayPlan = mealPlan.plan.days.find((d: PlanDay) => d.day === selectedPlanDay);
    return dayPlan?.meals || [];
  }, [mealPlan, selectedPlanDay]);

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

  const registeredMeals = useMemo(() => {
    const registered: Record<string, boolean> = {};
    nutritionLogs?.forEach((log) => {
      registered[log.meal_name] = true;
    });
    return registered;
  }, [nutritionLogs]);

  const mealSatisfaction = useMemo(() => {
    const map: Record<string, number> = {};
    nutritionLogs?.forEach((log) => {
      if (log.satisfaction_rating) {
        map[log.meal_name] = log.satisfaction_rating;
      }
    });
    return map;
  }, [nutritionLogs]);

  const dailySatisfaction = useMemo(() => {
    const ratings = nutritionLogs?.filter((l) => l.satisfaction_rating).map((l) => l.satisfaction_rating!) || [];
    if (ratings.length === 0) return null;
    return Math.round((ratings.reduce((a, b) => a + b, 0) / (ratings.length * 3)) * 100);
  }, [nutritionLogs]);

  // Calcular datos de la semana desde el historial real
  const weekData = useMemo(() => {
    const days = ["D", "L", "M", "X", "J", "V", "S"];
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayMappingToPlan = [7, 1, 2, 3, 4, 5, 6]; // Domingo=7, Lunes=1, etc.
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
      
      // Obtener las comidas del plan para este día
      const planDayNum = dayMappingToPlan[i];
      const dayPlan = mealPlan?.plan?.days?.find((d: PlanDay) => d.day === planDayNum);
      const planMeals = dayPlan?.meals || [];
      
      if (isToday) {
        return {
          day: dayLabel,
          dayName: dayNames[i],
          date: dateStr,
          calories: dailyTotals.calories,
          target: targets.calories,
          isToday: true,
          mealsLogged: nutritionLogs?.length || 0,
          planMeals: planMeals,
          totals: {
            protein: dailyTotals.protein,
            carbs: dailyTotals.carbs,
            fat: dailyTotals.fats,
          },
        };
      }
      
      return {
        day: dayLabel,
        dayName: dayNames[i],
        date: dateStr,
        calories: dayHistory?.totals?.calories || 0,
        target: targets.calories,
        isToday: false,
        mealsLogged: dayHistory?.meals?.length || 0,
        planMeals: planMeals,
        totals: dayHistory?.totals || { protein: 0, carbs: 0, fat: 0 },
      };
    });
  }, [dailyTotals, targets, nutritionHistory, nutritionLogs, mealPlan]);

  const handleLogMeal = async (data: {
    meal_name: string;
    foods: FoodItem[];
    notes?: string;
    satisfaction_rating?: number;
  }) => {
    try {
      await logNutritionMutation.mutateAsync({
        date: selectedDateStr,
        meal_name: data.meal_name,
        foods: data.foods,
        notes: data.notes,
        satisfaction_rating: data.satisfaction_rating,
      });
      closeModal();
      closePlanMealModal();
      setSelectedPlanMeal(null);
    } catch {
      // Error notification handled by mutation onError
    }
  };

  const handleOpenPlanMeal = (meal: PlanMeal) => {
    if (registeredMeals[meal.name]) return;
    setSelectedPlanMeal(meal);
    openPlanMealModal();
  };

  const isToday = selectedDateStr === new Date().toISOString().split("T")[0];

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
  const todayDayName = weekDayNames[selectedPlanDay - 1] || "Día";

  return (
    <Box p="xl" maw={1280} mx="auto">
      <Box mb="xl">
        <Title order={2}>Mi Nutrición</Title>
        <Text c="dimmed">Seguimiento de tu alimentación diaria</Text>
      </Box>

      {!mealPlan && (
        <Paper p="md" radius="lg" mb="xl" style={{ background: "var(--mantine-color-gray-light)" }}>
          <Text ta="center" c="dimmed">
            No tienes un plan nutricional asignado. Contacta con tu entrenador.
          </Text>
        </Paper>
      )}

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "today", label: "Hoy" },
            { value: "week", label: "Esta Semana" },
            { value: "history", label: "Historial" },
            { value: "recipes", label: "Recetas" },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
        {!isMobile && (
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
          <Tabs.Tab value="recipes" leftSection={<IconToolsKitchen2 size={16} />}>
            Recetas
          </Tabs.Tab>
        </Tabs.List>
        )}

        <Tabs.Panel value="today">
          <Card shadow="sm" padding="md" radius="lg" withBorder mb="lg">
            <Group gap="md" align="flex-end">
              <DateInput
                label="Fecha de registro"
                value={selectedDate}
                onChange={(d) => d && setSelectedDate(new Date(d))}
                maxDate={new Date()}
                locale="es"
                valueFormat="DD/MM/YYYY"
                style={{ flex: 1, maxWidth: 220 }}
              />
              {!isToday && (
                <Button variant="subtle" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Volver a hoy
                </Button>
              )}
              <Text size="sm" c="dimmed">
                Registrar {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </Text>
            </Group>
          </Card>

          {/* Daily Summary */}
      <Card shadow="sm" padding="lg" radius="lg" withBorder mb="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text size="lg" fw={600} mb="md">
              Resumen del Día
            </Text>
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
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

        {/* Distribución de macros P:C:F */}
        {(dailyTotals.protein > 0 || dailyTotals.carbs > 0 || dailyTotals.fats > 0) && (() => {
          const totalMacroCals = (dailyTotals.protein * 4) + (dailyTotals.carbs * 4) + (dailyTotals.fats * 9);
          const protPct = totalMacroCals > 0 ? Math.round((dailyTotals.protein * 4 / totalMacroCals) * 100) : 0;
          const carbsPct = totalMacroCals > 0 ? Math.round((dailyTotals.carbs * 4 / totalMacroCals) * 100) : 0;
          const fatPct = totalMacroCals > 0 ? Math.round((dailyTotals.fats * 9 / totalMacroCals) * 100) : 0;
          return (
            <Box mt="md">
              <Text size="sm" fw={600} mb="xs">Distribución de macros</Text>
              <Group gap="xs" mb={4}>
                <Box style={{ flex: protPct, height: 8, borderRadius: 4, background: "var(--mantine-color-red-5)", minWidth: protPct > 0 ? 8 : 0 }} />
                <Box style={{ flex: carbsPct, height: 8, borderRadius: 4, background: "var(--mantine-color-blue-5)", minWidth: carbsPct > 0 ? 8 : 0 }} />
                <Box style={{ flex: fatPct, height: 8, borderRadius: 4, background: "var(--mantine-color-green-5)", minWidth: fatPct > 0 ? 8 : 0 }} />
              </Group>
              <Group gap="md">
                <Group gap={4}>
                  <Box style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mantine-color-red-5)" }} />
                  <Text size="xs" c="dimmed">Proteínas {protPct}%</Text>
                </Group>
                <Group gap={4}>
                  <Box style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mantine-color-blue-5)" }} />
                  <Text size="xs" c="dimmed">Carbohidratos {carbsPct}%</Text>
                </Group>
                <Group gap={4}>
                  <Box style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mantine-color-green-5)" }} />
                  <Text size="xs" c="dimmed">Grasas {fatPct}%</Text>
                </Group>
              </Group>
            </Box>
          );
        })()}

        {dailySatisfaction !== null && (
          <Box mt="md" p="md" style={{ borderRadius: 8, background: "var(--mantine-color-yellow-light)" }}>
            <Group justify="space-between">
              <Group gap="xs">
                <Text size="lg">
                  {dailySatisfaction >= 80 ? "😊" : dailySatisfaction >= 50 ? "😐" : "😞"}
                </Text>
                <Box>
                  <Text size="sm" fw={600}>Satisfacción del día</Text>
                  <Text size="xs" c="dimmed">Basado en las comidas registradas</Text>
                </Box>
              </Group>
              <Text size="xl" fw={700}>{dailySatisfaction}%</Text>
            </Group>
            <Progress value={dailySatisfaction} color={dailySatisfaction >= 80 ? "green" : dailySatisfaction >= 50 ? "yellow" : "red"} mt="xs" size="sm" radius="xl" />
          </Box>
        )}
      </Card>

      {/* Comidas del Plan */}
      <Title order={4} mb="md">
        Registrar ({todayDayName})
      </Title>
      
      {selectedPlanMeals.length > 0 ? (
        <Box mb="xl">
          {selectedPlanMeals.map((meal: PlanMeal) => {
            const isRegistered = registeredMeals[meal.name];
            const mealLogs = mealsByType[meal.name] || [];
            const mealCalories = isRegistered 
              ? mealLogs.reduce((sum, l) => sum + (l.total_calories || 0), 0)
              : meal.items.reduce((sum, item) => {
                  const food = item.food || item.supplement;
                  const ss = parseFloat(String(food?.serving_size || "100")) || 100;
                  return sum + Math.round(Number(food?.calories || 0) * (item.quantity_grams / ss));
                }, 0);
            const mealType = MEAL_TYPES.find(m => m.value === meal.name);
            const MealIcon = mealType?.icon || IconApple;

            return (
              <Box
                key={meal.id}
                px="md"
                py="sm"
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-2)",
                  background: isRegistered ? "var(--mantine-color-green-0)" : "transparent",
                }}
              >
                <Group gap="sm" wrap="nowrap" align="center">
                  <ThemeIcon
                    variant={isRegistered ? "filled" : "light"}
                    color={isRegistered ? "green" : mealType?.color || "yellow"}
                    size={44}
                    radius="lg"
                    style={{ flexShrink: 0 }}
                  >
                    {isRegistered ? <IconCheck size={22} /> : <MealIcon size={22} />}
                  </ThemeIcon>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Text fw={600} size="sm">{meal.name}</Text>
                      <Text size="xs" c="dimmed">{meal.time}</Text>
                      {isRegistered && mealSatisfaction[meal.name] && (
                        <Text size="sm">
                          {mealSatisfaction[meal.name] === 1 ? "😞" : mealSatisfaction[meal.name] === 2 ? "😐" : "😊"}
                        </Text>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                      {meal.items.map((item) => item.food?.name || "Alimento").join(" • ")}
                    </Text>
                  </Box>
                  <Badge variant="light" color={isRegistered ? "green" : "orange"} size="sm" style={{ flexShrink: 0 }}>
                    {mealCalories} kcal
                  </Badge>
                  {!isRegistered && (
                    <Button
                      size="xs"
                      variant="light"
                      color="yellow"
                      radius="xl"
                      onClick={() => handleOpenPlanMeal(meal)}
                      style={{ flexShrink: 0 }}
                    >
                      Registrar
                    </Button>
                  )}
                </Group>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box mb="xl">
          {MEAL_TYPES.map((mealType) => {
            const MealIcon = mealType.icon;
            const logs = mealsByType[mealType.value] || [];
            const hasLogs = logs.length > 0;
            const mealCalories = logs.reduce((sum, l) => sum + (l.total_calories || 0), 0);

            return (
              <Box
                key={mealType.value}
                px="md"
                py="sm"
                onClick={openModal}
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-2)",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  background: hasLogs ? "var(--mantine-color-yellow-0)" : "transparent",
                }}
              >
                <Group gap="sm" wrap="nowrap" align="center">
                  <ThemeIcon
                    variant={hasLogs ? "filled" : "light"}
                    color={hasLogs ? "yellow" : "gray"}
                    size={44}
                    radius="lg"
                    style={{ flexShrink: 0 }}
                  >
                    <MealIcon size={22} />
                  </ThemeIcon>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Text fw={600} size="sm">{mealType.label}</Text>
                      <Text size="xs" c="dimmed">{mealType.time}</Text>
                      {hasLogs && mealSatisfaction[mealType.value] && (
                        <Text size="sm">
                          {mealSatisfaction[mealType.value] === 1 ? "😞" : mealSatisfaction[mealType.value] === 2 ? "😐" : "😊"}
                        </Text>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                      {hasLogs
                        ? logs.flatMap((l) => l.foods?.map((f) => f.name) || []).join(" • ")
                        : "Sin registrar"
                      }
                    </Text>
                  </Box>
                  {hasLogs && (
                    <Badge variant="light" color="orange" size="sm" style={{ flexShrink: 0 }}>
                      {mealCalories} kcal
                    </Badge>
                  )}
                </Group>
              </Box>
            );
          })}
        </Box>
      )}

        </Tabs.Panel>

        <Tabs.Panel value="week">
          <MasterDetailLayout
            hasSelection={selectedWeekDayIndex !== null}
            emptyMessage="Selecciona un día para ver el detalle nutricional"
            master={
              <>
                {weekData.map((day, index) => {
                  const percentage = day.calories > 0 ? (day.calories / day.target) * 100 : 0;
                  return (
                    <DayCardMenu
                      key={index}
                      dayName={`${day.day} - ${day.dayName}`}
                      isToday={day.isToday}
                      isSelected={selectedWeekDayIndex === index}
                      onClick={() => setSelectedWeekDayIndex(index)}
                      badge={
                        <Badge variant="light" color={percentage >= 90 ? "green" : percentage > 0 ? "yellow" : "gray"} size="sm">
                          {day.calories} / {day.target} kcal
                        </Badge>
                      }
                      summary={
                        <Text size="xs" c="dimmed">{day.mealsLogged} comidas registradas</Text>
                      }
                      progressValue={percentage}
                      progressColor={percentage >= 90 ? "green" : percentage > 0 ? "yellow" : "gray"}
                    />
                  );
                })}

                {/* FullPageDetail for mobile */}
                {!isMdUp && selectedWeekDayIndex !== null && weekData[selectedWeekDayIndex] && (
                  <FullPageDetail
                    opened={true}
                    onClose={() => setSelectedWeekDayIndex(null)}
                    title={weekData[selectedWeekDayIndex].dayName}
                    subtitle={new Date(weekData[selectedWeekDayIndex].date).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                  >
                <SimpleGrid cols={2} spacing="sm" mb="lg">
                  <Box ta="center" p="md" style={{ background: "var(--mantine-color-yellow-light)", borderRadius: "var(--mantine-radius-md)" }}>
                    <Text size="xl" fw={700}>
                      {weekData[selectedWeekDayIndex].calories}
                    </Text>
                    <Text size="xs" c="dimmed">kcal consumidas</Text>
                    <Progress
                      value={targets.calories > 0 ? Math.min((weekData[selectedWeekDayIndex].calories / targets.calories) * 100, 100) : 0}
                      color="yellow"
                      size="sm"
                      mt="xs"
                    />
                  </Box>
                  <Box ta="center" p="md" style={{ background: "var(--mantine-color-red-light)", borderRadius: "var(--mantine-radius-md)" }}>
                    <Text size="xl" fw={700}>
                      {Math.round(weekData[selectedWeekDayIndex].totals?.protein || 0)}g
                    </Text>
                    <Text size="xs" c="dimmed">Proteína</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "var(--mantine-color-blue-light)", borderRadius: "var(--mantine-radius-md)" }}>
                    <Text size="xl" fw={700}>
                      {Math.round(weekData[selectedWeekDayIndex].totals?.carbs || 0)}g
                    </Text>
                    <Text size="xs" c="dimmed">Carbohidratos</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "var(--mantine-color-grape-light)", borderRadius: "var(--mantine-radius-md)" }}>
                    <Text size="xl" fw={700}>
                      {Math.round(weekData[selectedWeekDayIndex].totals?.fat || 0)}g
                    </Text>
                    <Text size="xs" c="dimmed">Grasas</Text>
                  </Box>
                </SimpleGrid>

                {/* Plan meals for this day */}
                {weekData[selectedWeekDayIndex].planMeals && weekData[selectedWeekDayIndex].planMeals.length > 0 ? (
                  <Box>
                    <Text fw={600} mb="sm">Comidas del plan para {weekData[selectedWeekDayIndex].dayName}</Text>
                    <Stack gap="sm">
                      {weekData[selectedWeekDayIndex].planMeals.map((meal: PlanMeal, mealIndex: number) => {
                        const mealType = MEAL_TYPES.find(m => m.value === meal.name);
                        // Support both foods array and items array
                        const mealFoods = meal.foods || meal.items?.map(item => {
                          const food = item.food || item.supplement;
                          const ss = parseFloat(String(food?.serving_size || "100")) || 100;
                          const qty = item.quantity_grams || 0;
                          const factor = qty / ss;
                          return {
                            name: food?.name || "Alimento",
                            calories: Math.round(Number(food?.calories || 0) * factor),
                            protein_g: Math.round(Number(food?.protein || 0) * factor * 10) / 10,
                            carbs_g: Math.round(Number(food?.carbs || 0) * factor * 10) / 10,
                            fat_g: Math.round(Number(food?.fat || 0) * factor * 10) / 10,
                            quantity: qty,
                            unit: "g",
                          };
                        }) || [];
                        
                        const totalCalories = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.calories) || 0), 0);
                        const totalProtein = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.protein_g) || 0), 0);
                        const totalCarbs = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.carbs_g) || 0), 0);
                        const totalFat = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.fat_g) || 0), 0);
                        
                        const MealIcon = mealType?.icon || IconSalad;
                        
                        const mealKey = `${selectedWeekDayIndex}-${mealIndex}`;
                        const dayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                        
                        return (
                          <Card key={mealIndex} padding="md" radius="md" withBorder>
                            <Group justify="space-between">
                              <Group>
                                <ThemeIcon 
                                  variant="light" 
                                  color={mealType?.color || "gray"} 
                                  size="lg" 
                                  radius="xl"
                                >
                                  <MealIcon size={18} />
                                </ThemeIcon>
                                <Box>
                                  <Text fw={600} size="sm">{mealType?.label || meal.name}</Text>
                                  <Text size="xs" c="dimmed">{mealFoods.length} alimentos</Text>
                                </Box>
                              </Group>
                              <Group gap="xs">
                                <Badge variant="light" color="yellow" size="sm">{totalCalories} kcal</Badge>
                                <Badge variant="outline" color="red" size="xs">P: {Math.round(totalProtein)}g</Badge>
                                <Badge variant="outline" color="blue" size="xs">C: {Math.round(totalCarbs)}g</Badge>
                                <Badge variant="outline" color="grape" size="xs">G: {Math.round(totalFat)}g</Badge>
                                <Menu shadow="md" width={180} position="bottom-end" withinPortal>
                                  <Menu.Target>
                                    <ActionIcon variant="subtle" color="gray" size="sm">
                                      <IconDotsVertical size={14} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Label>Mover a</Menu.Label>
                                    {dayLabels.map((targetDay, targetIndex) => {
                                      if (targetIndex === selectedWeekDayIndex) return null;
                                      return (
                                        <Menu.Item
                                          key={targetIndex}
                                          leftSection={<IconArrowsExchange size={14} />}
                                          onClick={() => {
                                            setMealDayOverrides((prev) => ({ ...prev, [mealKey]: targetIndex }));
                                          }}
                                        >
                                          {targetDay}
                                        </Menu.Item>
                                      );
                                    })}
                                  </Menu.Dropdown>
                                </Menu>
                              </Group>
                            </Group>
                            {mealDayOverrides[mealKey] !== undefined && (
                              <Badge variant="light" color="blue" size="xs" mt="xs">
                                Movida a {dayLabels[mealDayOverrides[mealKey]]}
                              </Badge>
                            )}
                            {mealFoods.length > 0 && (
                              <Stack gap="xs" mt="sm" ml={54}>
                                {mealFoods.map((food: PlanMealFoodItem, foodIndex: number) => (
                                  <Group key={foodIndex} justify="space-between">
                                    <Text size="sm">{food.name}</Text>
                                    <Text size="xs" c="dimmed">
                                      {food.quantity}{food.unit} - {food.calories} kcal
                                    </Text>
                                  </Group>
                                ))}
                              </Stack>
                            )}
                          </Card>
                        );
                      })}
                    </Stack>
                  </Box>
                ) : (
                  <Text c="dimmed" ta="center">No hay comidas asignadas en el plan para este día</Text>
                )}
              </FullPageDetail>
            )}

                <Card shadow="sm" padding="lg" radius="lg" withBorder>
                  <Title order={5} mb="md">Resumen de la Semana</Title>
                  <SimpleGrid cols={{ base: 1, xs: 3 }}>
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
              </>
            }
            detail={
              selectedWeekDayIndex !== null && weekData[selectedWeekDayIndex] ? (
                <NutritionDayDetail
                  dayData={weekData[selectedWeekDayIndex]}
                  targets={targets}
                  planMeals={weekData[selectedWeekDayIndex].planMeals}
                  mealDayOverrides={mealDayOverrides}
                  setMealDayOverrides={setMealDayOverrides}
                  selectedWeekDayIndex={selectedWeekDayIndex}
                />
              ) : null
            }
          />
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Stack gap="sm">
            {nutritionHistory?.days && nutritionHistory.days.length > 0 ? (
              nutritionHistory.days.map((day) => {
                const percentage = day.totals.calories > 0 && targets.calories > 0
                  ? (day.totals.calories / targets.calories) * 100
                  : 0;
                const dateFormatted = new Date(day.date).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                });

                return (
                  <DayCardMenu
                    key={day.date}
                    dayName={dateFormatted}
                    isToday={day.date === new Date().toISOString().split("T")[0]}
                    onClick={() => setHistoryDetailDay(day.date)}
                    badge={
                      <Badge variant="light" color={percentage >= 90 ? "green" : percentage >= 70 ? "yellow" : "orange"} size="sm">
                        {day.totals.calories} kcal
                      </Badge>
                    }
                    summary={
                      <Group gap={4} mt={2}>
                        <Text size="xs" c="dimmed">{day.meals.length} comidas</Text>
                        <Badge variant="outline" color="red" size="xs">P:{Math.round(day.totals.protein)}g</Badge>
                        <Badge variant="outline" color="blue" size="xs">C:{Math.round(day.totals.carbs)}g</Badge>
                        <Badge variant="outline" color="grape" size="xs">G:{Math.round(day.totals.fat)}g</Badge>
                      </Group>
                    }
                    progressValue={percentage}
                    progressColor={percentage >= 90 ? "green" : percentage >= 70 ? "yellow" : "orange"}
                  />
                );
              })
            ) : (
              <Paper p="xl" ta="center" radius="lg" withBorder>
                <IconHistory size={48} color="gray" style={{ opacity: 0.5 }} />
                <Text c="dimmed" mt="md">No hay historial de nutrición disponible</Text>
                <Text size="sm" c="dimmed">Registra tus comidas para ver tu historial aquí</Text>
              </Paper>
            )}
          </Stack>

          {/* Full-page detail for selected history day */}
          {(() => {
            const selectedDay = nutritionHistory?.days?.find((d) => d.date === historyDetailDay);
            if (!selectedDay) return null;
            const dateFmt = new Date(selectedDay.date).toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            });
            return (
              <FullPageDetail
                opened={!!historyDetailDay}
                onClose={() => setHistoryDetailDay(null)}
                title={dateFmt}
                subtitle={`${selectedDay.meals.length} comidas registradas`}
              >
                <SimpleGrid cols={2} spacing="sm" mb="md">
                  <Paper p="sm" radius="md" withBorder ta="center">
                    <Text size="xs" c="dimmed">Kcal</Text>
                    <Text fw={700} size="lg">{selectedDay.totals.calories}</Text>
                  </Paper>
                  <Paper p="sm" radius="md" withBorder ta="center">
                    <Text size="xs" c="dimmed">Proteína</Text>
                    <Text fw={700} size="lg">{Math.round(selectedDay.totals.protein)}g</Text>
                  </Paper>
                  <Paper p="sm" radius="md" withBorder ta="center">
                    <Text size="xs" c="dimmed">Carbohidratos</Text>
                    <Text fw={700} size="lg">{Math.round(selectedDay.totals.carbs)}g</Text>
                  </Paper>
                  <Paper p="sm" radius="md" withBorder ta="center">
                    <Text size="xs" c="dimmed">Grasas</Text>
                    <Text fw={700} size="lg">{Math.round(selectedDay.totals.fat)}g</Text>
                  </Paper>
                </SimpleGrid>

                <Stack gap="sm">
                  {selectedDay.meals.map((meal, mealIndex) => (
                    <Paper key={mealIndex} p="md" radius="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Text fw={600}>{meal.meal_name}</Text>
                        <Badge variant="light" color="orange">{meal.total_calories} kcal</Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {meal.foods.map((f) => f.name).join(", ")}
                      </Text>
                      <Group gap={4} mt="xs">
                        <Badge size="xs" variant="outline" color="red">P:{Math.round(meal.total_protein || 0)}g</Badge>
                        <Badge size="xs" variant="outline" color="blue">C:{Math.round(meal.total_carbs || 0)}g</Badge>
                        <Badge size="xs" variant="outline" color="grape">G:{Math.round(meal.total_fat || 0)}g</Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </FullPageDetail>
            );
          })()}
        </Tabs.Panel>

        <Tabs.Panel value="recipes">
          <ClientRecipesTab />
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
