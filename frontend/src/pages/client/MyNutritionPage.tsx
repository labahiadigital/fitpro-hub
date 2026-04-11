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
  Tooltip,
  Checkbox,
  Divider,
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
  IconEdit,
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
  IconDownload,
  IconShoppingCart,
  IconX,
} from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { useState, useMemo } from "react";
import {
  useMyMealPlan,
  useNutritionLogs,
  useLogNutrition,
  useDeleteNutritionLog,
  useNutritionHistory,
  useClientFoodSearch,
  useMoveMeal,
  useSwapDays,
  useSwapMeals,
  useUpdateMealTime,
  useUpdateMealName,
  useMeasurements,
  useProgressPhotos,
} from "../../hooks/useClientPortal";
import { useClientRecipes } from "../../hooks/useRecipes";
import { generateMealPlanPDF } from "../../services/pdfGenerator";
import { useAuthStore } from "../../stores/auth";
import { RecipeDetailModal } from "../../components/recipes/RecipeDetailModal";
import type { Recipe } from "../../types/recipe";
import { FullPageDetail } from "../../components/common/FullPageDetail";
import { DayCardMenu } from "../../components/common/DayCardMenu";
import { MasterDetailLayout } from "../../components/common/MasterDetailLayout";
import { NativeBottomSheet } from "../../components/common/NativeBottomSheet";

function mapFoodCategory(name: string): string {
  const lower = name.toLowerCase();
  if (["pollo", "ternera", "cerdo", "pavo", "salmón", "salmon", "atún", "atun", "merluza", "bacalao", "gambas", "langostino", "huevo", "claras", "jamón", "jamon", "lomo", "filete", "pechuga", "carne", "pescado", "marisco", "proteina", "protein", "whey", "caseina"].some(k => lower.includes(k))) return "Proteínas";
  if (["arroz", "pasta", "pan ", "avena", "patata", "boniato", "quinoa", "cereal", "tortita", "tostada", "maíz", "maiz", "trigo", "harina", "cuscús", "cuscus"].some(k => lower.includes(k))) return "Carbohidratos";
  if (["lechuga", "tomate", "brócoli", "brocoli", "espinaca", "zanahoria", "pepino", "calabacín", "calabacin", "cebolla", "pimiento", "judía", "judia", "berenjena", "espárrago", "esparrago", "champiñón", "champinon", "verdura", "ensalada", "coliflor", "alcachofa", "rúcula", "rucula", "canónigo", "canonigo", "guisante", "apio"].some(k => lower.includes(k))) return "Verduras";
  if (["manzana", "plátano", "platano", "naranja", "fresa", "arándano", "arandano", "kiwi", "pera", "piña", "pina", "melocotón", "melocoton", "cereza", "sandía", "sandia", "melón", "melon", "uva", "mandarina", "fruta", "frambuesa", "mango", "aguacate"].some(k => lower.includes(k))) return "Frutas";
  if (["leche", "yogur", "queso", "requesón", "requeson", "nata", "mantequilla", "cuajada", "kéfir", "kefir", "cottage", "skyr", "lácteo", "lacteo"].some(k => lower.includes(k))) return "Lácteos";
  if (["aceite", "oliva", "manteca", "grasa", "mantequilla de"].some(k => lower.includes(k))) return "Grasas";
  if (["almendra", "nuez", "anacardo", "pistacho", "avellana", "cacahuete", "semilla", "fruto seco", "chía", "chia", "lino", "sésamo", "sesamo"].some(k => lower.includes(k))) return "Frutos Secos";
  return "Otros";
}

const FOOD_CATEGORY_COLORS: Record<string, string> = {
  Proteínas: "red",
  Carbohidratos: "orange",
  Verduras: "green",
  Frutas: "yellow",
  Lácteos: "cyan",
  Grasas: "grape",
  "Frutos Secos": "brown",
  Otros: "gray",
};

const FOOD_CATEGORY_ORDER = ["Proteínas", "Carbohidratos", "Verduras", "Frutas", "Lácteos", "Grasas", "Frutos Secos", "Otros"];

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
  recipe_group?: string;
  food_category?: string;
  is_manual?: boolean;
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
      { name: "", calories: 0, protein: 0, carbs: 0, fat: 0, quantity: 100, is_manual: true },
    ]);
  };

  const removeFood = (index: number) => {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFood = (index: number, field: keyof FoodItem, value: string | number) => {
    setFoods((prev) => {
      const updated = [...prev];
      const old = updated[index];
      const numVal = typeof value === "string" ? parseFloat(value) || 0 : value;
      if (field === "quantity" && Number(old.quantity) > 0 && numVal > 0) {
        const ratio = numVal / Number(old.quantity);
        updated[index] = {
          ...old,
          quantity: numVal,
          calories: Math.round(Number(old.calories) * ratio),
          protein: Math.round(Number(old.protein) * ratio * 10) / 10,
          carbs: Math.round(Number(old.carbs) * ratio * 10) / 10,
          fat: Math.round(Number(old.fat) * ratio * 10) / 10,
        };
      } else {
        updated[index] = { ...old, [field]: (field === "name" || field === "food_category") ? value : numVal };
      }
      return updated;
    });
  };

  const handleSubmit = () => {
    const validFoods = foods.filter((f) => f.name.trim() !== "").map((f) => ({
      ...f,
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
      quantity: Number(f.quantity) || 0,
    }));
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
      {food.is_manual && (
        <Select
          placeholder="Categoría (opcional)"
          data={FOOD_CATEGORY_ORDER.map((c) => ({ value: c, label: c }))}
          value={food.food_category || null}
          onChange={(val) => updateFood(index, "food_category", val || "")}
          size="xs"
          radius="md"
          mt={6}
          clearable
        />
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
  recipe_group?: string;
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
    recipe_group?: string;
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
  existingLog,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    meal_name: string;
    foods: FoodItem[];
    notes?: string;
    satisfaction_rating?: number;
    replace?: boolean;
  }) => void;
  isLoading: boolean;
  meal: PlanMeal | null;
  existingLog?: { foods: FoodItem[]; notes?: string; satisfaction_rating?: number } | null;
}) {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [notes, setNotes] = useState("");
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (opened && !initialized && meal) {
    if (existingLog) {
      setFoods(existingLog.foods);
      setNotes(existingLog.notes || "");
      setSatisfactionRating(existingLog.satisfaction_rating ?? null);
    } else if (meal.foods && meal.foods.length > 0) {
      const initial: FoodItem[] = meal.foods.map((f) => ({
        name: f.name,
        calories: Number(f.calories) || 0,
        protein: Number(f.protein_g) || 0,
        carbs: Number(f.carbs_g) || 0,
        fat: Number(f.fat_g) || 0,
        quantity: Number(f.quantity) || 100,
        recipe_group: f.recipe_group,
      }));
      setFoods(initial);
    } else {
      const initial: FoodItem[] = (meal.items || []).map((item) => {
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
          recipe_group: item.recipe_group,
        };
      });
      setFoods(initial);
    }
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
      const old = updated[index];
      const numVal = typeof value === "string" ? parseFloat(value) || 0 : value;
      if (field === "quantity" && Number(old.quantity) > 0 && numVal > 0) {
        const ratio = numVal / Number(old.quantity);
        updated[index] = {
          ...old,
          quantity: numVal,
          calories: Math.round(Number(old.calories) * ratio),
          protein: Math.round(Number(old.protein) * ratio * 10) / 10,
          carbs: Math.round(Number(old.carbs) * ratio * 10) / 10,
          fat: Math.round(Number(old.fat) * ratio * 10) / 10,
        };
      } else {
        updated[index] = { ...old, [field]: (field === "name" || field === "food_category") ? value : numVal };
      }
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
      { name: "", calories: 0, protein: 0, carbs: 0, fat: 0, quantity: 100, is_manual: true },
    ]);
  };

  const handleSubmit = async () => {
    const validFoods = foods.filter((f) => f.name.trim() !== "").map((f) => ({
      ...f,
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
      quantity: Number(f.quantity) || 0,
    }));
    if (validFoods.length === 0) return;

    onSubmit({
      meal_name: meal?.name || "Comida",
      foods: validFoods,
      replace: !!existingLog,
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
          {existingLog ? "Guardar cambios" : "Registrar"} ({Math.round(totalMacros.calories)} kcal)
        </Button>
      }
    >
      {(() => {
        const recipeGroups = new Map<string, { indices: number[] }>();
        const ungroupedIndices: number[] = [];
        foods.forEach((food, idx) => {
          if (food.recipe_group) {
            const g = recipeGroups.get(food.recipe_group) || { indices: [] };
            g.indices.push(idx);
            recipeGroups.set(food.recipe_group, g);
          } else {
            ungroupedIndices.push(idx);
          }
        });

        const renderFoodRow = (food: FoodItem, index: number, showLabels: boolean) => (
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
            {showLabels && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: -2 }}>
                <Text size="xs" c="dimmed" ta="center">Kcal</Text>
                <Text size="xs" c="dimmed" ta="center">Prot (g)</Text>
                <Text size="xs" c="dimmed" ta="center">Carbs (g)</Text>
                <Text size="xs" c="dimmed" ta="center">Grasas (g)</Text>
              </div>
            )}
            {food.is_manual && (
              <Select
                placeholder="Categoría (opcional)"
                data={FOOD_CATEGORY_ORDER.map((c) => ({ value: c, label: c }))}
                value={food.food_category || null}
                onChange={(val) => updateFood(index, "food_category", val || "")}
                size="xs"
                radius="md"
                mt={6}
                clearable
              />
            )}
          </Box>
        );

        const elements: React.ReactNode[] = [];
        let isFirstRow = true;

        recipeGroups.forEach((group, recipeName) => {
          const recipeItems = group.indices.map(i => foods[i]);
          const recipeTotals = recipeItems.reduce((acc, f) => ({
            calories: acc.calories + (f.calories || 0),
            protein: acc.protein + (f.protein || 0),
            carbs: acc.carbs + (f.carbs || 0),
            fat: acc.fat + (f.fat || 0),
          }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

          elements.push(
            <Paper key={`recipe-${recipeName}`} mx="md" mt="sm" p="xs" radius="md" withBorder style={{ borderColor: "var(--mantine-color-teal-3)", borderStyle: "dashed" }}>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
                    <IconToolsKitchen2 size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={700} c="teal">{recipeName}</Text>
                </Group>
                <Group gap={4}>
                  <Badge size="xs" variant="light" color="yellow">{Math.round(recipeTotals.calories)} kcal</Badge>
                  <Badge size="xs" variant="outline" color="red">P:{Math.round(recipeTotals.protein)}</Badge>
                </Group>
              </Group>
              {group.indices.map((idx, j) => renderFoodRow(foods[idx], idx, isFirstRow && j === 0))}
              {isFirstRow && (isFirstRow = false, null)}
            </Paper>
          );
          isFirstRow = false;
        });

        ungroupedIndices.forEach((idx) => {
          elements.push(renderFoodRow(foods[idx], idx, isFirstRow));
          isFirstRow = false;
        });

        return elements;
      })()}

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
  readOnly = false,
  allDays = [],
}: {
  dayData: { dayName: string; calories: number; totals: { protein?: number; carbs?: number; fat?: number }; planDayNum?: number };
  targets: { calories: number };
  planMeals: PlanMeal[];
  readOnly?: boolean;
  allDays?: PlanDay[];
}) {
  const planDayLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const swapDaysMutation = useSwapDays();
  const swapMealsMutation = useSwapMeals();
  const moveMealMut = useMoveMeal();
  const updateMealTimeMut = useUpdateMealTime();
  const updateMealNameMut = useUpdateMealName();
  const [swapState, setSwapState] = useState<{ sourceMealIndex: number; step: "day" | "meal"; targetDay?: number } | null>(null);
  const [editName, setEditName] = useState<{ idx: number; name: string } | null>(null);
  const [editTime, setEditTime] = useState<{ idx: number; time: string } | null>(null);
  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={4}>{dayData.dayName}</Title>
        {!readOnly && dayData.planDayNum && (
          <Menu shadow="md" position="bottom-end" withinPortal>
            <Menu.Target>
              <Button variant="light" size="xs" leftSection={<IconArrowsExchange size={14} />} radius="md" color="teal">
                Intercambiar día
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Intercambiar comidas con</Menu.Label>
              {planDayLabels.map((label, idx) => {
                const targetDayNum = idx + 1;
                if (targetDayNum === dayData.planDayNum) return null;
                return (
                  <Menu.Item
                    key={idx}
                    onClick={() => swapDaysMutation.mutate({ sourceDay: dayData.planDayNum!, targetDay: targetDayNum })}
                  >
                    {label}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
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
            {[...planMeals].sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00")).map((meal: PlanMeal, mealIndex: number) => {
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
                  recipe_group: item.recipe_group,
                };
              }) || [];
              const totalCalories = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.calories) || 0), 0);
              const totalProtein = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.protein_g) || 0), 0);
              const totalCarbs = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.carbs_g) || 0), 0);
              const totalFat = mealFoods.reduce((sum: number, f: PlanMealFoodItem) => sum + (Number(f.fat_g) || 0), 0);
              const MealIcon = mealType?.icon || IconSalad;

              return (
                <Card key={mealIndex} padding="md" radius="md" withBorder>
                  <Group justify="space-between" wrap="wrap">
                    <Group>
                      <ThemeIcon variant="light" color={mealType?.color || "gray"} size="lg" radius="xl">
                        <MealIcon size={18} />
                      </ThemeIcon>
                      <Box>
                        <Group gap="xs">
                          {!readOnly && editName?.idx === mealIndex ? (
                            <Group gap={4}>
                              <TextInput
                                size="xs"
                                value={editName.name}
                                onChange={(e) => setEditName({ ...editName, name: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && editName.name.trim() && dayData.planDayNum) {
                                    updateMealNameMut.mutate({ day: dayData.planDayNum, mealIndex, displayName: editName.name });
                                    setEditName(null);
                                  } else if (e.key === "Escape") setEditName(null);
                                }}
                                autoFocus
                                styles={{ input: { minWidth: 100, fontWeight: 600 } }}
                              />
                              <ActionIcon size="xs" color="green" variant="light" onClick={() => {
                                if (editName.name.trim() && dayData.planDayNum) {
                                  updateMealNameMut.mutate({ day: dayData.planDayNum, mealIndex, displayName: editName.name });
                                }
                                setEditName(null);
                              }}><IconCheck size={12} /></ActionIcon>
                              <ActionIcon size="xs" color="gray" variant="light" onClick={() => setEditName(null)}><IconX size={12} /></ActionIcon>
                            </Group>
                          ) : (
                            <Group gap={4}>
                              <Text fw={600} size="sm">{(meal as PlanMeal & { display_name?: string }).display_name || mealType?.label || meal.name}</Text>
                              {!readOnly && (
                                <Tooltip label="Editar nombre">
                                  <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setEditName({ idx: mealIndex, name: (meal as any).display_name || mealType?.label || meal.name })}>
                                    <IconEdit size={11} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          )}
                          {!readOnly && editTime?.idx === mealIndex ? (
                            <Group gap={4}>
                              <TextInput
                                size="xs"
                                type="time"
                                value={editTime.time}
                                onChange={(e) => setEditTime({ ...editTime, time: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && dayData.planDayNum) {
                                    updateMealTimeMut.mutate({ day: dayData.planDayNum, mealIndex, newTime: editTime.time });
                                    setEditTime(null);
                                  } else if (e.key === "Escape") setEditTime(null);
                                }}
                                autoFocus
                                w={90}
                                styles={{ input: { textAlign: "center", height: 28 } }}
                              />
                              <ActionIcon size="xs" color="green" variant="light" onClick={() => {
                                if (dayData.planDayNum) {
                                  updateMealTimeMut.mutate({ day: dayData.planDayNum, mealIndex, newTime: editTime.time });
                                }
                                setEditTime(null);
                              }}><IconCheck size={12} /></ActionIcon>
                              <ActionIcon size="xs" color="gray" variant="light" onClick={() => setEditTime(null)}><IconX size={12} /></ActionIcon>
                            </Group>
                          ) : (
                            <Group gap={2}>
                              {meal.time && <Badge variant="light" color="gray" size="xs" leftSection={<IconClock size={10} />}>{meal.time}</Badge>}
                              {!readOnly && (
                                <Tooltip label="Editar hora">
                                  <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setEditTime({ idx: mealIndex, time: meal.time || "12:00" })}>
                                    <IconEdit size={10} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {(() => {
                            const recipeNames = new Set(mealFoods.filter((f: PlanMealFoodItem) => f.recipe_group).map((f: PlanMealFoodItem) => f.recipe_group));
                            const ungroupedCount = mealFoods.filter((f: PlanMealFoodItem) => !f.recipe_group).length;
                            const parts: string[] = [];
                            if (recipeNames.size > 0) parts.push(`${recipeNames.size} receta${recipeNames.size > 1 ? "s" : ""}`);
                            if (ungroupedCount > 0) parts.push(`${ungroupedCount} alimento${ungroupedCount > 1 ? "s" : ""}`);
                            return parts.join(" + ") || `${mealFoods.length} alimentos`;
                          })()}
                        </Text>
                      </Box>
                    </Group>
                    <Group gap="xs" wrap="wrap">
                      <Badge variant="light" color="yellow" size="sm">{totalCalories} kcal</Badge>
                      <Badge variant="outline" color="red" size="xs">P: {Math.round(totalProtein)}g</Badge>
                      <Badge variant="outline" color="blue" size="xs">C: {Math.round(totalCarbs)}g</Badge>
                      <Badge variant="outline" color="grape" size="xs">G: {Math.round(totalFat)}g</Badge>
                      {!readOnly && (
                        <Tooltip label="Intercambiar comida">
                          <ActionIcon variant="subtle" color="teal" size="sm" onClick={() => setSwapState({ sourceMealIndex: mealIndex, step: "day" })}>
                            <IconArrowsExchange size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>
                  {mealFoods.length > 0 && (
                    <Stack gap="xs" mt="sm" ml={54}>
                      {(() => {
                        const recipeGroups = new Map<string, PlanMealFoodItem[]>();
                        const ungrouped: PlanMealFoodItem[] = [];
                        mealFoods.forEach((food: PlanMealFoodItem) => {
                          if (food.recipe_group) {
                            const g = recipeGroups.get(food.recipe_group) || [];
                            g.push(food);
                            recipeGroups.set(food.recipe_group, g);
                          } else {
                            ungrouped.push(food);
                          }
                        });
                        const elements: React.ReactNode[] = [];
                        recipeGroups.forEach((items, recipeName) => {
                          const rCal = items.reduce((s, f) => s + f.calories, 0);
                          elements.push(
                            <Paper key={`r-${recipeName}`} p="xs" radius="md" withBorder style={{ borderColor: "var(--mantine-color-teal-3)", borderStyle: "dashed" }}>
                              <Group justify="space-between" mb={4}>
                                <Text size="sm" fw={700} c="teal">🍳 {recipeName}</Text>
                                <Badge size="xs" variant="light" color="yellow">{rCal} kcal</Badge>
                              </Group>
                              <Stack gap={2} ml="sm">
                                {items.map((f, i) => (
                                  <Group key={i} justify="space-between">
                                    <Text size="xs">{f.name}</Text>
                                    <Text size="xs" c="dimmed">{f.quantity}{f.unit} - {f.calories} kcal</Text>
                                  </Group>
                                ))}
                              </Stack>
                            </Paper>
                          );
                        });
                        ungrouped.forEach((food, i) => {
                          elements.push(
                            <Group key={`u-${i}`} justify="space-between">
                              <Text size="sm">{food.name}</Text>
                              <Text size="xs" c="dimmed">{food.quantity}{food.unit} - {food.calories} kcal</Text>
                            </Group>
                          );
                        });
                        return elements;
                      })()}
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

      {/* Modal step 1: select target day */}
      <Modal
        opened={swapState?.step === "day"}
        onClose={() => setSwapState(null)}
        title="Intercambiar con"
        size="sm"
      >
        <Stack gap="xs">
          {planDayLabels.map((label, idx) => {
            const targetDayNum = idx + 1;
            if (targetDayNum === dayData.planDayNum) return null;
            return (
              <Button
                key={idx}
                variant="light"
                fullWidth
                justify="start"
                leftSection={<IconArrowsExchange size={14} />}
                onClick={() => setSwapState(prev => prev ? { ...prev, step: "meal", targetDay: targetDayNum } : null)}
              >
                {label}
              </Button>
            );
          })}
        </Stack>
      </Modal>

      {/* Modal step 2: select target meal to swap */}
      <Modal
        opened={swapState?.step === "meal" && swapState.targetDay != null}
        onClose={() => setSwapState(null)}
        title="Selecciona la comida a intercambiar"
        size="sm"
      >
        {(() => {
          if (!swapState || swapState.targetDay == null) return null;
          const targetDayData = allDays.find(d => d.day === swapState.targetDay);
          const rawTargetMeals = targetDayData?.meals || [];
          const seenKeys = new Set<string>();
          const targetMeals = rawTargetMeals.filter((meal: PlanMeal) => {
            if (seenKeys.has(`${meal.name}-${meal.time || ""}`)) return false;
            seenKeys.add(`${meal.name}-${meal.time || ""}`);
            return true;
          });
          const targetDayLabel = planDayLabels[(swapState.targetDay - 1) % 7] || `Día ${swapState.targetDay}`;
          if (targetMeals.length === 0) {
            return <Text c="dimmed" ta="center" py="md">No hay comidas en {targetDayLabel}</Text>;
          }
          return (
            <Stack gap="xs">
              <Button
                variant="filled"
                color="red"
                fullWidth
                justify="start"
                onClick={() => {
                  if (dayData.planDayNum) {
                    moveMealMut.mutate({
                      sourceDay: dayData.planDayNum,
                      mealIndex: swapState.sourceMealIndex,
                      targetDay: swapState.targetDay!,
                    });
                  }
                  setSwapState(null);
                }}
              >
                Mover sin intercambiar
              </Button>
              <Text size="sm" c="dimmed" mb="xs">Comidas de {targetDayLabel}:</Text>
              {targetMeals.map((meal: PlanMeal, tmi: number) => {
                const mt = MEAL_TYPES.find(m => m.value === meal.name);
                return (
                  <Button
                    key={tmi}
                    variant="outline"
                    fullWidth
                    justify="start"
                    leftSection={mt ? <ThemeIcon variant="light" color={mt.color} size="sm" radius="xl">{(() => { const I = mt.icon; return <I size={14} />; })()}</ThemeIcon> : null}
                    onClick={() => {
                      if (dayData.planDayNum) {
                        swapMealsMutation.mutate({
                          sourceDay: dayData.planDayNum,
                          sourceMealIndex: swapState.sourceMealIndex,
                          targetDay: swapState.targetDay!,
                          targetMealIndex: tmi,
                        });
                      }
                      setSwapState(null);
                    }}
                  >
                    {mt?.label || meal.name}{meal.time ? ` (${meal.time})` : ""}
                  </Button>
                );
              })}
            </Stack>
          );
        })()}
      </Modal>
    </>
  );
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MyNutritionPage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isMdUp = useMediaQuery("(min-width: 1024px)");
  const [activeTab, setActiveTab] = useState<string | null>("today");
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [planMealModalOpened, { open: openPlanMealModal, close: closePlanMealModal }] = useDisclosure(false);
  const [selectedPlanMeal, setSelectedPlanMeal] = useState<PlanMeal | null>(null);
  const [selectedWeekDayIndex, setSelectedWeekDayIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [historyDetailDay, setHistoryDetailDay] = useState<string | null>(null);
  const [planViewMode, setPlanViewMode] = useState<string>("modified");
  const [selectedWeekOverride, setSelectedWeekOverride] = useState<string | null>(null);
  
  // Hooks para datos reales del backend
  const { data: mealPlan, isLoading: isLoadingPlan } = useMyMealPlan();
  const selectedDateStr = toLocalDateStr(selectedDate);
  const { data: nutritionLogs } = useNutritionLogs(selectedDateStr, 50);
  const { data: nutritionHistory } = useNutritionHistory(30);
  const logNutritionMutation = useLogNutrition();
  const deleteNutritionLogMutation = useDeleteNutritionLog();
  const moveMealMutation = useMoveMeal();
  const swapDaysMutation = useSwapDays();
  const swapMealsMutation = useSwapMeals();
  const updateMealTimeMutation = useUpdateMealTime();
  const updateMealNameMutation = useUpdateMealName();
  const [editingMealTime, setEditingMealTime] = useState<{ dayNum: number; mealIndex: number; time: string } | null>(null);
  const [editingMealName, setEditingMealName] = useState<{ dayNum: number; mealIndex: number; name: string } | null>(null);
  const [registerSwapState, setRegisterSwapState] = useState<{ sourceMealIndex: number; step: "day" | "meal"; targetDay?: number } | null>(null);
  const [planSwapState, setPlanSwapState] = useState<{ sourceMealIndex: number; sourceDayNum: number; step: "day" | "meal"; targetDay?: number } | null>(null);
  const { data: measurementsData } = useMeasurements(100);
  const { data: progressPhotosData } = useProgressPhotos(50);

  const dayMapping = [7, 1, 2, 3, 4, 5, 6]; // Domingo=7, Lunes=1, etc.
  const selectedPlanDay = dayMapping[selectedDate.getDay()];

  const currentAutoWeek = useMemo(() => {
    if (!mealPlan?.plan) return 1;
    const plan = mealPlan.plan as unknown as { weeks?: { week: number; days: PlanDay[] }[] };
    if (!plan.weeks || plan.weeks.length === 0) return 1;
    const durationWeeks = (mealPlan as unknown as { duration_weeks?: number })?.duration_weeks || plan.weeks.length;
    if (!durationWeeks || durationWeeks <= 1) return 1;
    const startDateStr = (mealPlan as any)?.start_date;
    const startDate = startDateStr ? new Date(startDateStr) : new Date(mealPlan?.created_at || Date.now());
    if (isNaN(startDate.getTime())) return 1;
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (Math.floor(Math.max(0, daysDiff) / 7) % durationWeeks) + 1;
  }, [mealPlan]);

  const extractPlanDays = (rawPlan: unknown, weekOverride?: number) => {
    if (!rawPlan) return [];
    const plan = rawPlan as { weeks?: { week: number; days: PlanDay[] }[]; days?: PlanDay[] };
    if (plan.weeks && plan.weeks.length > 0) {
      const weekNum = weekOverride || currentAutoWeek;
      const wk = plan.weeks.find((w) => w.week === weekNum);
      return wk?.days || plan.weeks[0]?.days || [];
    }
    return plan.days || [];
  };

  const weekOverrideNum = selectedWeekOverride ? parseInt(selectedWeekOverride, 10) : undefined;

  const executedPlanSource = (mealPlan as any)?.executed_plan || mealPlan?.plan;
  const planDays = useMemo(() => extractPlanDays(executedPlanSource, weekOverrideNum), [executedPlanSource, weekOverrideNum, currentAutoWeek]);
  const originalPlanDays = useMemo(() => extractPlanDays(mealPlan?.plan, weekOverrideNum), [mealPlan?.plan, weekOverrideNum, currentAutoWeek]);

  const allPlanWeeks = useMemo(() => {
    if (!mealPlan?.plan) return [];
    const plan = mealPlan.plan as unknown as { weeks?: { week: number; days: PlanDay[] }[]; days?: PlanDay[] };
    if (plan.weeks && plan.weeks.length > 0) return plan.weeks;
    if (plan.days && plan.days.length > 0) return [{ week: 1, days: plan.days }];
    return [];
  }, [mealPlan]);

  const selectedPlanMeals = useMemo(() => {
    if (!planDays || planDays.length === 0) return [];
    const dayPlan = planDays.find((d: PlanDay) => d.day === selectedPlanDay);
    const meals = dayPlan?.meals || [];
    return [...meals].sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
  }, [planDays, selectedPlanDay]);

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
    calories: Math.round(mealPlan?.target_calories || 2000),
    protein: Math.round(mealPlan?.target_protein || 140),
    carbs: Math.round(mealPlan?.target_carbs || 250),
    fats: Math.round(mealPlan?.target_fat || 70),
  }), [mealPlan]);

  // Agrupar logs por tipo de comida
  const mealsByType = useMemo(() => {
    const grouped: Record<string, typeof nutritionLogs> = {};
    MEAL_TYPES.forEach((m) => {
      grouped[m.value] = [];
    });
    
    nutritionLogs?.forEach((log) => {
      if (!grouped[log.meal_name]) {
        grouped[log.meal_name] = [];
      }
      grouped[log.meal_name]!.push(log);
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

  const [checkedItemsByWeek, setCheckedItemsByWeek] = useState<Record<string, Set<string>>>({});
  const [shoppingWeek, setShoppingWeek] = useState<string | null>(null);

  const shoppingWeekNum = shoppingWeek ? parseInt(shoppingWeek, 10) : currentAutoWeek;
  const weekKey = String(shoppingWeekNum);
  const checkedItems = checkedItemsByWeek[weekKey] || new Set<string>();
  const setCheckedItems = (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setCheckedItemsByWeek((prev) => {
      const current = prev[weekKey] || new Set<string>();
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [weekKey]: next };
    });
  };
  const shoppingPlanDays = useMemo(
    () => extractPlanDays(executedPlanSource, shoppingWeekNum),
    [executedPlanSource, shoppingWeekNum, currentAutoWeek]
  );

  const shoppingWeekDateRange = useMemo(() => {
    const startStr = (mealPlan as any)?.start_date;
    if (!startStr) return null;
    const programStart = new Date(startStr);
    if (isNaN(programStart.getTime())) return null;
    const weekStart = new Date(programStart);
    weekStart.setDate(weekStart.getDate() + (shoppingWeekNum - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return {
      startStr: weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      endStr: weekEnd.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    };
  }, [mealPlan, shoppingWeekNum]);

  const shoppingList = useMemo(() => {
    if (!shoppingPlanDays || shoppingPlanDays.length === 0) return [];
    const foodMap = new Map<string, { name: string; totalGrams: number; category: string }>();
    for (const day of shoppingPlanDays) {
      for (const meal of (day.meals || [])) {
        for (const item of (meal.items || [])) {
          if (item.type === "supplement") continue;
          const foodName = item.food?.name;
          if (!foodName) continue;
          const grams = item.quantity_grams || 0;
          const existing = foodMap.get(foodName);
          if (existing) {
            existing.totalGrams += grams;
          } else {
            foodMap.set(foodName, { name: foodName, totalGrams: grams, category: mapFoodCategory(foodName) });
          }
        }
        for (const f of (meal.foods || [])) {
          if (!f.name) continue;
          const grams = f.quantity || 0;
          const existing = foodMap.get(f.name);
          if (existing) {
            existing.totalGrams += grams;
          } else {
            foodMap.set(f.name, { name: f.name, totalGrams: grams, category: mapFoodCategory(f.name) });
          }
        }
      }
    }
    const items = Array.from(foodMap.values());
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    }
    return FOOD_CATEGORY_ORDER
      .filter((cat) => grouped[cat] && grouped[cat].length > 0)
      .map((cat) => ({ category: cat, items: grouped[cat] }));
  }, [shoppingPlanDays]);

  const toggleChecked = (foodName: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(foodName)) next.delete(foodName);
      else next.add(foodName);
      return next;
    });
  };

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
    const days = ["L", "M", "X", "J", "V", "S", "D"];
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const dayMappingToPlan = [1, 2, 3, 4, 5, 6, 7];
    const todayDate = new Date();
    const todayJsDay = todayDate.getDay();
    
    return days.map((dayLabel, i) => {
      const jsDay = (i + 1) % 7;
      const daysFromToday = jsDay - todayJsDay;
      const dateForDay = new Date(todayDate);
      dateForDay.setDate(todayDate.getDate() + daysFromToday);
      const dateStr = toLocalDateStr(dateForDay);
      
      const isTodayDay = jsDay === todayJsDay;
      
      const dayHistory = nutritionHistory?.days?.find(d => d.date === dateStr);
      
      const planDayNum = dayMappingToPlan[i];
      const dayPlan = planDays.find((d: PlanDay) => d.day === planDayNum);
      const planMeals = dayPlan?.meals || [];
      
      if (isTodayDay) {
        const loggedNames = new Set((nutritionLogs || []).map((l: { meal_name: string }) => l.meal_name));
        return {
          day: dayLabel,
          dayName: dayNames[i],
          date: dateStr,
          calories: dailyTotals.calories,
          target: targets.calories,
          isToday: true,
          mealsLogged: nutritionLogs?.length || 0,
          planMeals: planMeals,
          planDayNum,
          registeredMealNames: loggedNames,
          totals: {
            protein: dailyTotals.protein,
            carbs: dailyTotals.carbs,
            fat: dailyTotals.fats,
          },
        };
      }
      
      const histMealNames = new Set((dayHistory?.meals || []).map((m: { meal_name?: string; name?: string }) => m.meal_name || m.name || ""));
      return {
        day: dayLabel,
        dayName: dayNames[i],
        date: dateStr,
        calories: dayHistory?.totals?.calories || 0,
        target: targets.calories,
        isToday: false,
        mealsLogged: dayHistory?.meals?.length || 0,
        planMeals: planMeals,
        planDayNum,
        registeredMealNames: histMealNames,
        totals: dayHistory?.totals || { protein: 0, carbs: 0, fat: 0 },
      };
    });
  }, [dailyTotals, targets, nutritionHistory, nutritionLogs, planDays]);

  const weekDataOriginal = useMemo(() => {
    const days = ["L", "M", "X", "J", "V", "S", "D"];
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const dayMappingToPlan = [1, 2, 3, 4, 5, 6, 7];
    const todayDate = new Date();

    const todayJsDay = todayDate.getDay();

    return days.map((dayLabel, i) => {
      const jsDay = (i + 1) % 7;
      const daysFromToday = jsDay - todayJsDay;
      const dateForDay = new Date(todayDate);
      dateForDay.setDate(todayDate.getDate() + daysFromToday);
      const dateStr = toLocalDateStr(dateForDay);
      const planDayNum = dayMappingToPlan[i];
      const dayPlan = originalPlanDays.find((d: PlanDay) => d.day === planDayNum);
      const planMeals = dayPlan?.meals || [];

      const computeMacros = (meals: PlanMeal[]) => {
        let calories = 0, protein = 0, carbs = 0, fat = 0;
        for (const meal of meals) {
          const foods = meal.foods || meal.items?.map(item => {
            const fd = item.food || item.supplement;
            const ss = parseFloat(String(fd?.serving_size || "100")) || 100;
            const factor = (item.quantity_grams || 0) / ss;
            return {
              calories: Math.round(Number(fd?.calories || 0) * factor),
              protein: Math.round(Number(fd?.protein || 0) * factor * 10) / 10,
              carbs: Math.round(Number(fd?.carbs || 0) * factor * 10) / 10,
              fat: Math.round(Number(fd?.fat || 0) * factor * 10) / 10,
            };
          }) || [];
          for (const f of foods) {
            calories += Number((f as any).calories) || 0;
            protein += Number((f as any).protein ?? (f as any).protein_g) || 0;
            carbs += Number((f as any).carbs ?? (f as any).carbs_g) || 0;
            fat += Number((f as any).fat ?? (f as any).fat_g) || 0;
          }
        }
        return { calories, protein, carbs, fat };
      };

      const macros = computeMacros(planMeals);

      return {
        day: dayLabel,
        dayName: dayNames[i],
        date: dateStr,
        calories: macros.calories,
        target: targets.calories,
        isToday: jsDay === todayJsDay,
        mealsLogged: planMeals.length,
        planMeals,
        planDayNum,
        totals: { protein: macros.protein, carbs: macros.carbs, fat: macros.fat },
      };
    });
  }, [targets, originalPlanDays]);

  const activeWeekData = planViewMode === "original" ? weekDataOriginal : weekData;
  const activePlanDays = planViewMode === "original" ? originalPlanDays : planDays;

  const handleLogMeal = async (data: {
    meal_name: string;
    foods: FoodItem[];
    notes?: string;
    satisfaction_rating?: number;
    replace?: boolean;
  }) => {
    try {
      const sanitizedFoods = data.foods.map((f) => ({
        ...f,
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fat: Number(f.fat) || 0,
        quantity: Number(f.quantity) || 0,
      }));
      const hasExisting = (nutritionLogs || []).some(
        (l) => l.meal_name === data.meal_name
      );
      await logNutritionMutation.mutateAsync({
        date: selectedDateStr,
        meal_name: data.meal_name,
        foods: sanitizedFoods,
        notes: data.notes,
        satisfaction_rating: data.satisfaction_rating,
        replace: data.replace || hasExisting,
      });
      closeModal();
      closePlanMealModal();
      setSelectedPlanMeal(null);
    } catch {
      // Error notification handled by mutation onError
    }
  };

  const handleOpenPlanMeal = (meal: PlanMeal) => {
    setSelectedPlanMeal(meal);
    openPlanMealModal();
  };

  const handleUnregisterMeal = async (mealName: string) => {
    const logsForMeal = (nutritionLogs || []).filter(
      (l) => l.meal_name === mealName && l.log_index != null
    );
    for (const log of logsForMeal) {
      if (log.log_index != null) {
        await deleteNutritionLogMutation.mutateAsync(log.log_index);
      }
    }
  };

  const isToday = selectedDateStr === toLocalDateStr(new Date());

  const activeNutritionWeekNum = selectedWeekOverride ? parseInt(selectedWeekOverride, 10) : currentAutoWeek;

  const nutritionWeekDateRange = useMemo(() => {
    const startStr = (mealPlan as any)?.start_date;
    if (!startStr) return null;
    const programStart = new Date(startStr);
    if (isNaN(programStart.getTime())) return null;
    const weekStart = new Date(programStart);
    weekStart.setDate(weekStart.getDate() + (activeNutritionWeekNum - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const endStr = (mealPlan as any)?.end_date;
    const cap = endStr ? new Date(endStr) : null;
    const effectiveEnd = cap && !isNaN(cap.getTime()) && weekEnd > cap ? cap : weekEnd;
    return {
      start: weekStart,
      end: effectiveEnd,
      startStr: weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      endStr: effectiveEnd.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    };
  }, [mealPlan, activeNutritionWeekNum]);

  const getNutritionDayDate = (dayIndex: number): string | null => {
    if (!nutritionWeekDateRange?.start) return null;
    const d = new Date(nutritionWeekDateRange.start);
    d.setDate(d.getDate() + dayIndex);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const nutritionDateRange = useMemo(() => {
    const startStr = (mealPlan as any)?.start_date;
    const endStr = (mealPlan as any)?.end_date;
    if (!startStr) return null;
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;
    if (isNaN(start.getTime())) return null;
    return {
      start,
      end: end && !isNaN(end.getTime()) ? end : null,
      startStr: start.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      endStr: end && !isNaN(end.getTime()) ? end.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : null,
    };
  }, [mealPlan]);

  const isSelectedDateInRange = useMemo(() => {
    if (!nutritionDateRange) return true;
    const selStr = toLocalDateStr(selectedDate);
    const startStr = toLocalDateStr(nutritionDateRange.start);
    if (selStr < startStr) return false;
    if (nutritionDateRange.end) {
      const endStr = toLocalDateStr(nutritionDateRange.end);
      if (selStr > endStr) return false;
    }
    return true;
  }, [selectedDate, nutritionDateRange]);

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
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2}>Mi Nutrición</Title>
            <Text c="dimmed">Seguimiento de tu alimentación diaria</Text>
          </Box>
          {mealPlan && (
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              size="sm"
              onClick={async () => {
                const ws = useAuthStore.getState().currentWorkspace;
                const measurements = (measurementsData || []).map((m: any) => ({
                  date: m.measured_at || m.date,
                  weight_kg: m.weight_kg,
                  body_fat_percentage: m.body_fat_percentage,
                  muscle_mass_kg: m.muscle_mass_kg,
                  waist_cm: m.measurements?.waist,
                  hip_cm: m.measurements?.hips,
                  chest_cm: m.measurements?.chest,
                  arm_cm: m.measurements?.arms,
                  thigh_cm: m.measurements?.thighs,
                }));
                const weightHistory = measurements
                  .filter((m: any) => m.weight_kg)
                  .map((m: any) => ({
                    date: m.date,
                    weight: m.weight_kg,
                    body_fat: m.body_fat_percentage || 0,
                    muscle_mass: m.muscle_mass_kg || 0,
                  }));
                const photos = (progressPhotosData || []).map((p: any) => ({
                  url: p.url || p.ref_url,
                  type: p.type,
                  date: p.measurement_date || p.uploaded_at,
                }));
                await generateMealPlanPDF(mealPlan as any, {
                  workspaceName: (ws as any)?.name || "Trackfiz",
                  branding: (ws as any)?.branding,
                  workspaceLogo: (ws as any)?.logo_url,
                  progressData: {
                    currentWeight: weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : undefined,
                    startWeight: weightHistory.length > 0 ? weightHistory[0].weight : undefined,
                    measurements,
                    weightHistory,
                    photos,
                  },
                });
              }}
            >
              Descargar mi nutrición
            </Button>
          )}
        </Group>
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
            { value: "today", label: "Registrar comida" },
            { value: "week", label: "Tu plan" },
            { value: "history", label: "Historial" },
            { value: "recipes", label: "Recetas" },
            { value: "shopping", label: "Cesta de la compra" },
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
            Registrar comida
          </Tabs.Tab>
          <Tabs.Tab value="week" leftSection={<IconCalendarEvent size={16} />}>
            Tu plan
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            Historial
          </Tabs.Tab>
          <Tabs.Tab value="recipes" leftSection={<IconToolsKitchen2 size={16} />}>
            Recetas
          </Tabs.Tab>
          <Tabs.Tab value="shopping" leftSection={<IconShoppingCart size={16} />}>
            Cesta de la compra
          </Tabs.Tab>
        </Tabs.List>
        )}

        <Tabs.Panel value="today">
          {!mealPlan ? (
            <Box ta="center" py="xl">
              <Text size="xl" mb="sm">🍽️</Text>
              <Text fw={600} size="lg">No tienes ningún plan nutricional activo</Text>
              <Text c="dimmed" size="sm" mt="xs">Tu entrenador te asignará un plan cuando esté listo.</Text>
            </Box>
          ) : (
          <>
          <Card shadow="sm" padding="md" radius="lg" withBorder mb="lg">
            <Group gap="md" align="flex-end">
              <DateInput
                label="Fecha de registro"
                value={selectedDate}
                onChange={(d) => d && setSelectedDate(new Date(d))}
                minDate={nutritionDateRange?.start || undefined}
                maxDate={nutritionDateRange?.end && nutritionDateRange.end < new Date() ? nutritionDateRange.end : new Date()}
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

          {!isSelectedDateInRange && (
            <Box ta="center" py="xl">
              <Text size="xl" mb="sm">📅</Text>
              <Text fw={700} size="lg">Fecha fuera del plan nutricional</Text>
              <Text c="dimmed" size="sm" mt="xs">
                Tu plan va del {nutritionDateRange?.startStr} al {nutritionDateRange?.endStr || "—"}.
                Selecciona una fecha dentro de ese rango.
              </Text>
            </Box>
          )}

          {isSelectedDateInRange && (
          <>
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
          {selectedPlanMeals.map((meal: PlanMeal, sortedIdx: number) => {
            const isRegistered = registeredMeals[meal.name];
            const mealLogs = mealsByType[meal.name] || [];
            const mealCalories = isRegistered
              ? mealLogs.reduce((sum, l) => sum + (Number(l.total_calories) || 0), 0)
              : (() => {
                  if (meal.foods && meal.foods.length > 0) {
                    return meal.foods.reduce((sum, f) => sum + (Number(f.calories) || 0), 0);
                  }
                  return (meal.items || []).reduce((sum, item) => {
                    const food = item.food || item.supplement;
                    const ss = parseFloat(String(food?.serving_size || "100")) || 100;
                    const qty = Number(item.quantity_grams) || 0;
                    return sum + Math.round(Number(food?.calories || 0) * qty / ss);
                  }, 0);
                })();
            const mealType = MEAL_TYPES.find(m => m.value === meal.name);
            const MealIcon = mealType?.icon || IconApple;
            const displayName = (meal as PlanMeal & { display_name?: string }).display_name || meal.name;
            const mealDayPlan = planDays.find((d: PlanDay) => d.day === selectedPlanDay);
            const originalMealIndex = mealDayPlan?.meals?.findIndex((m: PlanMeal) => m.id === meal.id) ?? sortedIdx;

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
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <ThemeIcon
                    variant={isRegistered ? "filled" : "light"}
                    color={isRegistered ? "green" : mealType?.color || "yellow"}
                    size={40}
                    radius="lg"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  >
                    {isRegistered ? <IconCheck size={20} /> : <MealIcon size={20} />}
                  </ThemeIcon>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" wrap="wrap">
                      {editingMealName?.dayNum === selectedPlanDay && editingMealName?.mealIndex === originalMealIndex ? (
                        <Group gap={4}>
                          <TextInput
                            size="xs"
                            value={editingMealName.name}
                            onChange={(e) => setEditingMealName({ ...editingMealName, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editingMealName.name.trim()) {
                                updateMealNameMutation.mutate({ day: selectedPlanDay, mealIndex: originalMealIndex, displayName: editingMealName.name });
                                setEditingMealName(null);
                              } else if (e.key === "Escape") setEditingMealName(null);
                            }}
                            autoFocus
                            styles={{ input: { minWidth: 80, fontWeight: 600 } }}
                          />
                          <ActionIcon size="xs" color="green" variant="light" onClick={() => {
                            if (editingMealName.name.trim()) {
                              updateMealNameMutation.mutate({ day: selectedPlanDay, mealIndex: originalMealIndex, displayName: editingMealName.name });
                            }
                            setEditingMealName(null);
                          }}><IconCheck size={12} /></ActionIcon>
                          <ActionIcon size="xs" color="gray" variant="light" onClick={() => setEditingMealName(null)}><IconX size={12} /></ActionIcon>
                        </Group>
                      ) : (
                        <Group gap={4} wrap="nowrap">
                          <Text fw={600} size="sm" lineClamp={1}>{displayName}</Text>
                          {planViewMode !== "original" && (
                            <Tooltip label="Editar nombre">
                              <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setEditingMealName({ dayNum: selectedPlanDay, mealIndex: originalMealIndex, name: displayName })}>
                                <IconEdit size={11} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      )}
                      {(meal as PlanMeal & { display_name?: string }).display_name && (
                        <Text size="xs" c="dimmed">({meal.name})</Text>
                      )}
                      {editingMealTime?.dayNum === selectedPlanDay && editingMealTime?.mealIndex === originalMealIndex ? (
                        <Group gap={4}>
                          <TextInput
                            size="xs"
                            type="time"
                            value={editingMealTime.time}
                            onChange={(e) => setEditingMealTime({ ...editingMealTime, time: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateMealTimeMutation.mutate({ day: selectedPlanDay, mealIndex: originalMealIndex, newTime: editingMealTime.time });
                                setEditingMealTime(null);
                              } else if (e.key === "Escape") setEditingMealTime(null);
                            }}
                            autoFocus
                            w={90}
                            styles={{ input: { textAlign: "center", height: 28 } }}
                          />
                          <ActionIcon size="xs" color="green" variant="light" onClick={() => {
                            updateMealTimeMutation.mutate({ day: selectedPlanDay, mealIndex: originalMealIndex, newTime: editingMealTime.time });
                            setEditingMealTime(null);
                          }}><IconCheck size={12} /></ActionIcon>
                          <ActionIcon size="xs" color="gray" variant="light" onClick={() => setEditingMealTime(null)}><IconX size={12} /></ActionIcon>
                        </Group>
                      ) : (
                        <Group gap={2}>
                          <Badge variant="light" color="gray" size="xs" leftSection={<IconClock size={10} />}>{meal.time || "--:--"}</Badge>
                          {planViewMode !== "original" && (
                            <Tooltip label="Editar hora">
                              <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setEditingMealTime({ dayNum: selectedPlanDay, mealIndex: originalMealIndex, time: meal.time || "12:00" })}>
                                <IconEdit size={10} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      )}
                      {isRegistered && mealSatisfaction[meal.name] && (
                        <Text size="sm">
                          {mealSatisfaction[meal.name] === 1 ? "😞" : mealSatisfaction[meal.name] === 2 ? "😐" : "😊"}
                        </Text>
                      )}
                    </Group>
                    <Group gap="xs" mt={4} wrap="wrap">
                      <Badge variant="light" color={isRegistered ? "green" : "orange"} size="sm">
                        {mealCalories} kcal
                      </Badge>
                      {isRegistered ? (
                        <Menu shadow="md" width={180} position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" size="sm">
                              <IconDotsVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconToolsKitchen2 size={14} />}
                              onClick={() => handleOpenPlanMeal(meal)}
                            >
                              Editar registro
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconArrowsExchange size={14} />}
                              onClick={() => setRegisterSwapState({ sourceMealIndex: originalMealIndex, step: "day" })}
                            >
                              Intercambiar
                            </Menu.Item>
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={() => handleUnregisterMeal(meal.name)}
                            >
                              Eliminar registro
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      ) : (
                        <>
                          <Button
                            size="xs"
                            variant="light"
                            color="yellow"
                            radius="xl"
                            onClick={() => handleOpenPlanMeal(meal)}
                          >
                            Registrar
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            color="teal"
                            radius="xl"
                            onClick={() => setRegisterSwapState({ sourceMealIndex: originalMealIndex, step: "day" })}
                          >
                            Intercambiar
                          </Button>
                        </>
                      )}
                    </Group>
                  </Box>
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

      {/* Swap modals for Registrar tab */}
      <Modal
        opened={registerSwapState?.step === "day"}
        onClose={() => setRegisterSwapState(null)}
        title="Selecciona el día de destino"
        size="sm"
      >
        <Stack gap="xs">
          {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((label, i) => {
            const targetDayNum = i + 1;
            if (targetDayNum === selectedPlanDay) return null;
            return (
              <Button
                key={targetDayNum}
                variant="outline"
                fullWidth
                justify="start"
                onClick={() => setRegisterSwapState(prev => prev ? { ...prev, step: "meal", targetDay: targetDayNum } : null)}
              >
                {label}
              </Button>
            );
          })}
        </Stack>
      </Modal>

      <Modal
        opened={registerSwapState?.step === "meal" && registerSwapState?.targetDay != null}
        onClose={() => setRegisterSwapState(null)}
        title="Selecciona la comida a intercambiar"
        size="sm"
      >
        {(() => {
          if (!registerSwapState || registerSwapState.targetDay == null) return null;
          const targetDayData = planDays.find((d: PlanDay) => d.day === registerSwapState.targetDay);
          const rawTargetMeals = targetDayData?.meals || [];
          const seenKeys = new Set<string>();
          const targetMeals = rawTargetMeals.filter((meal: PlanMeal) => {
            const key = `${meal.name}-${meal.time || ""}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
          });
          const targetDayLabel = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][(registerSwapState.targetDay - 1) % 7] || `Día ${registerSwapState.targetDay}`;
          if (targetMeals.length === 0) {
            return <Text c="dimmed" ta="center" py="md">No hay comidas en {targetDayLabel}</Text>;
          }
          return (
            <Stack gap="xs">
              <Button
                variant="filled"
                color="red"
                fullWidth
                justify="start"
                onClick={() => {
                  moveMealMutation.mutate({
                    sourceDay: selectedPlanDay,
                    mealIndex: registerSwapState.sourceMealIndex,
                    targetDay: registerSwapState.targetDay!,
                  });
                  setRegisterSwapState(null);
                }}
              >
                Mover sin intercambiar
              </Button>
              <Text size="sm" c="dimmed" mb="xs">Comidas de {targetDayLabel}:</Text>
              {targetMeals.map((meal: PlanMeal, tmi: number) => {
                const mt = MEAL_TYPES.find(m => m.value === meal.name);
                return (
                  <Button
                    key={tmi}
                    variant="outline"
                    fullWidth
                    justify="start"
                    leftSection={mt ? <ThemeIcon variant="light" color={mt.color} size="sm" radius="xl">{(() => { const I = mt.icon; return <I size={14} />; })()}</ThemeIcon> : null}
                    onClick={() => {
                      swapMealsMutation.mutate({
                        sourceDay: selectedPlanDay,
                        sourceMealIndex: registerSwapState.sourceMealIndex,
                        targetDay: registerSwapState.targetDay!,
                        targetMealIndex: tmi,
                      });
                      setRegisterSwapState(null);
                    }}
                  >
                    {mt?.label || meal.name}{meal.time ? ` (${meal.time})` : ""}
                  </Button>
                );
              })}
            </Stack>
          );
        })()}
      </Modal>

          </>
          )}
          </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="week">
          {!mealPlan ? (
            <Box ta="center" py="xl">
              <Text size="xl" mb="sm">🍽️</Text>
              <Text fw={600} size="lg">No tienes ningún plan nutricional activo</Text>
              <Text c="dimmed" size="sm" mt="xs">Tu entrenador te asignará un plan cuando esté listo.</Text>
            </Box>
          ) : (
          <>
          <Stack gap="xs" mb="md">
            <Group gap="sm" wrap="wrap">
              <Select
                value={planViewMode}
                onChange={(v) => setPlanViewMode(v || "modified")}
                data={[
                  { value: "modified", label: "Plan ejecutado" },
                  { value: "original", label: "Plan asignado" },
                ]}
                size="xs"
                radius="md"
                w={180}
              />
              {nutritionDateRange && (
                <Badge variant="light" color="gray" size="sm">
                  {nutritionDateRange.startStr}{nutritionDateRange.endStr ? ` – ${nutritionDateRange.endStr}` : ""}
                </Badge>
              )}
            </Group>
            {allPlanWeeks.length > 1 && (
              <Group gap="sm" wrap="wrap">
                <Select
                  value={selectedWeekOverride || String(currentAutoWeek)}
                  onChange={(v) => setSelectedWeekOverride(v)}
                  data={allPlanWeeks.map((w: { week: number }) => ({ value: String(w.week), label: `Semana ${w.week}` }))}
                  size="xs"
                  radius="md"
                  w={150}
                  allowDeselect={false}
                />
                {nutritionWeekDateRange && (
                  <Badge variant="light" color="blue" size="sm">
                    {nutritionWeekDateRange.startStr} – {nutritionWeekDateRange.endStr}
                  </Badge>
                )}
              </Group>
            )}
          </Stack>

          <Card shadow="sm" padding="lg" radius="lg" withBorder mb="md">
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
          <MasterDetailLayout
            hasSelection={selectedWeekDayIndex !== null}
            emptyMessage="Selecciona un día para ver el detalle nutricional"
            master={
              <>
                {activeWeekData.map((day, index) => {
                  const percentage = day.calories > 0 ? (day.calories / day.target) * 100 : 0;
                  const dayDate = getNutritionDayDate(index);
                  return (
                    <DayCardMenu
                      key={index}
                      dayName={dayDate ? `${day.dayName} · ${dayDate}` : `${day.day} - ${day.dayName}`}
                      isToday={day.isToday}
                      isSelected={selectedWeekDayIndex === index}
                      onClick={() => setSelectedWeekDayIndex(index)}
                      badge={
                        <Badge variant="light" color={percentage >= 90 ? "green" : percentage > 0 ? "yellow" : "gray"} size="sm">
                          {day.calories} / {day.target} kcal
                        </Badge>
                      }
                      summary={
                        <Text size="xs" c="dimmed">
                          {planViewMode === "original"
                            ? `${day.planMeals?.length || 0} comidas para este día`
                            : `${day.mealsLogged}/${day.planMeals?.length || 0} comidas registradas`}
                        </Text>
                      }
                      progressValue={percentage}
                      progressColor={percentage >= 90 ? "green" : percentage > 0 ? "yellow" : "gray"}
                    />
                  );
                })}

                {/* FullPageDetail for mobile */}
                {!isMdUp && selectedWeekDayIndex !== null && activeWeekData[selectedWeekDayIndex] && (
                  <FullPageDetail
                    opened={true}
                    onClose={() => setSelectedWeekDayIndex(null)}
                    title={activeWeekData[selectedWeekDayIndex].dayName}
                    subtitle={new Date(activeWeekData[selectedWeekDayIndex].date).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                  >
                <SimpleGrid cols={2} spacing="sm" mb="lg">
                  <Box ta="center" p="md" style={{ background: "var(--mantine-color-yellow-light)", borderRadius: "var(--mantine-radius-md)" }}>
                    <Text size="xl" fw={700}>
                      {activeWeekData[selectedWeekDayIndex].calories}
                    </Text>
                    <Text size="xs" c="dimmed">kcal consumidas</Text>
                    <Progress
                      value={targets.calories > 0 ? Math.min((activeWeekData[selectedWeekDayIndex].calories / targets.calories) * 100, 100) : 0}
                      color="yellow"
                      size="sm"
                      mt="xs"
                    />
                  </Box>
                  <Box ta="center" p="md" style={{ background: "var(--mantine-color-red-light)", borderRadius: "var(--mantine-radius-md)" }}>
                    <Text size="xl" fw={700}>
                      {Math.round(activeWeekData[selectedWeekDayIndex].totals?.protein || 0)}g
                    </Text>
                    <Text size="xs" c="dimmed">Proteína</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "var(--mantine-color-blue-light)", borderRadius: "var(--mantine-radius-md)" }}>
                    <Text size="xl" fw={700}>
                      {Math.round(activeWeekData[selectedWeekDayIndex].totals?.carbs || 0)}g
                    </Text>
                    <Text size="xs" c="dimmed">Carbohidratos</Text>
                  </Box>
                  <Box ta="center" p="md" style={{ background: "var(--mantine-color-grape-light)", borderRadius: "var(--mantine-radius-md)" }}>
                    <Text size="xl" fw={700}>
                      {Math.round(activeWeekData[selectedWeekDayIndex].totals?.fat || 0)}g
                    </Text>
                    <Text size="xs" c="dimmed">Grasas</Text>
                  </Box>
                </SimpleGrid>

                {/* Plan meals for this day */}
                {activeWeekData[selectedWeekDayIndex].planMeals && activeWeekData[selectedWeekDayIndex].planMeals.length > 0 ? (
                  <Box>
                    <Group justify="space-between" mb="sm">
                      <Text fw={600}>Comidas del plan para {activeWeekData[selectedWeekDayIndex].dayName}</Text>
                      {planViewMode !== "original" && activeWeekData[selectedWeekDayIndex].planDayNum && (
                        <Menu shadow="md" position="bottom-end" withinPortal>
                          <Menu.Target>
                            <Button variant="light" size="xs" leftSection={<IconArrowsExchange size={14} />} radius="md" color="teal">
                              Intercambiar día
                            </Button>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Label>Intercambiar comidas con</Menu.Label>
                            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((label, idx) => {
                              const targetDayNum = idx + 1;
                              if (targetDayNum === activeWeekData[selectedWeekDayIndex].planDayNum) return null;
                              return (
                                <Menu.Item
                                  key={idx}
                                  onClick={() => swapDaysMutation.mutate({ sourceDay: activeWeekData[selectedWeekDayIndex].planDayNum!, targetDay: targetDayNum })}
                                >
                                  {label}
                                </Menu.Item>
                              );
                            })}
                          </Menu.Dropdown>
                        </Menu>
                      )}
                    </Group>
                    <Stack gap="sm">
                      {[...activeWeekData[selectedWeekDayIndex].planMeals].sort((a: PlanMeal, b: PlanMeal) => (a.time || "00:00").localeCompare(b.time || "00:00")).map((meal: PlanMeal, mealIndex: number) => {
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
                        
                        const currentPlanDayNum = activeWeekData[selectedWeekDayIndex]?.planDayNum;
                        
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
                                  <Group gap="xs" wrap="wrap">
                                    {planViewMode !== "original" && editingMealName?.dayNum === currentPlanDayNum && editingMealName?.mealIndex === mealIndex ? (
                                      <Group gap={4}>
                                        <TextInput
                                          size="xs"
                                          value={editingMealName.name}
                                          onChange={(e) => setEditingMealName({ ...editingMealName, name: e.target.value })}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && editingMealName.name.trim()) {
                                              updateMealNameMutation.mutate({ day: currentPlanDayNum!, mealIndex, displayName: editingMealName.name });
                                              setEditingMealName(null);
                                            } else if (e.key === "Escape") setEditingMealName(null);
                                          }}
                                          autoFocus
                                          styles={{ input: { minWidth: 80, fontWeight: 600 } }}
                                        />
                                        <ActionIcon size="xs" color="green" variant="light" onClick={() => {
                                          if (editingMealName.name.trim()) updateMealNameMutation.mutate({ day: currentPlanDayNum!, mealIndex, displayName: editingMealName.name });
                                          setEditingMealName(null);
                                        }}><IconCheck size={12} /></ActionIcon>
                                        <ActionIcon size="xs" color="gray" variant="light" onClick={() => setEditingMealName(null)}><IconX size={12} /></ActionIcon>
                                      </Group>
                                    ) : (
                                      <Group gap={4} wrap="nowrap">
                                        <Text fw={600} size="sm">{(meal as PlanMeal & { display_name?: string }).display_name || mealType?.label || meal.name}</Text>
                                        {planViewMode !== "original" && (activeWeekData[selectedWeekDayIndex] as any)?.registeredMealNames?.has(meal.name) && (
                                          <Badge variant="light" color="green" size="xs">Registrada</Badge>
                                        )}
                                        {planViewMode !== "original" && (
                                          <Tooltip label="Editar nombre">
                                            <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setEditingMealName({ dayNum: currentPlanDayNum!, mealIndex, name: (meal as any).display_name || mealType?.label || meal.name })}>
                                              <IconEdit size={11} />
                                            </ActionIcon>
                                          </Tooltip>
                                        )}
                                      </Group>
                                    )}
                                    {planViewMode !== "original" && editingMealTime?.dayNum === currentPlanDayNum && editingMealTime?.mealIndex === mealIndex ? (
                                      <Group gap={4}>
                                        <TextInput
                                          size="xs"
                                          type="time"
                                          value={editingMealTime.time}
                                          onChange={(e) => setEditingMealTime({ ...editingMealTime, time: e.target.value })}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              updateMealTimeMutation.mutate({ day: currentPlanDayNum!, mealIndex, newTime: editingMealTime.time });
                                              setEditingMealTime(null);
                                            } else if (e.key === "Escape") setEditingMealTime(null);
                                          }}
                                          autoFocus
                                          w={90}
                                          styles={{ input: { textAlign: "center", height: 28 } }}
                                        />
                                        <ActionIcon size="xs" color="green" variant="light" onClick={() => {
                                          updateMealTimeMutation.mutate({ day: currentPlanDayNum!, mealIndex, newTime: editingMealTime.time });
                                          setEditingMealTime(null);
                                        }}><IconCheck size={12} /></ActionIcon>
                                        <ActionIcon size="xs" color="gray" variant="light" onClick={() => setEditingMealTime(null)}><IconX size={12} /></ActionIcon>
                                      </Group>
                                    ) : (
                                      <Group gap={2}>
                                        <Badge variant="light" color="gray" size="xs" leftSection={<IconClock size={10} />}>{meal.time || "--:--"}</Badge>
                                        {planViewMode !== "original" && (
                                          <Tooltip label="Editar hora">
                                            <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setEditingMealTime({ dayNum: currentPlanDayNum!, mealIndex, time: meal.time || "12:00" })}>
                                              <IconEdit size={10} />
                                            </ActionIcon>
                                          </Tooltip>
                                        )}
                                      </Group>
                                    )}
                                  </Group>
                                  <Text size="xs" c="dimmed">{mealFoods.length} alimentos</Text>
                                </Box>
                              </Group>
                              <Group gap="xs">
                                <Badge variant="light" color="yellow" size="sm">{totalCalories} kcal</Badge>
                                <Badge variant="outline" color="red" size="xs">P: {Math.round(totalProtein)}g</Badge>
                                <Badge variant="outline" color="blue" size="xs">C: {Math.round(totalCarbs)}g</Badge>
                                <Badge variant="outline" color="grape" size="xs">G: {Math.round(totalFat)}g</Badge>
                                {planViewMode !== "original" && currentPlanDayNum && (
                                  <Tooltip label="Intercambiar comida">
                                    <ActionIcon variant="subtle" color="teal" size="sm" onClick={() => setPlanSwapState({ sourceMealIndex: mealIndex, sourceDayNum: currentPlanDayNum, step: "day" })}>
                                      <IconArrowsExchange size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                              </Group>
                            </Group>
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

              </>
            }
            detail={
              selectedWeekDayIndex !== null && activeWeekData[selectedWeekDayIndex] ? (
                <NutritionDayDetail
                  dayData={activeWeekData[selectedWeekDayIndex]}
                  targets={targets}
                  planMeals={activeWeekData[selectedWeekDayIndex].planMeals}
                  allDays={activePlanDays}
                  readOnly={planViewMode === "original"}
                />
              ) : null
            }
          />

          {/* Modal paso 1: seleccionar día destino (Tu Plan mobile) */}
          <Modal
            opened={planSwapState?.step === "day"}
            onClose={() => setPlanSwapState(null)}
            title="Intercambiar con"
            size="sm"
          >
            <Stack gap="xs">
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((label, idx) => {
                const targetDayNum = idx + 1;
                if (targetDayNum === planSwapState?.sourceDayNum) return null;
                return (
                  <Button
                    key={idx}
                    variant="light"
                    fullWidth
                    justify="start"
                    leftSection={<IconArrowsExchange size={14} />}
                    onClick={() => setPlanSwapState(prev => prev ? { ...prev, step: "meal", targetDay: targetDayNum } : null)}
                  >
                    {label}
                  </Button>
                );
              })}
            </Stack>
          </Modal>

          {/* Modal paso 2: seleccionar comida o mover sin intercambiar (Tu Plan mobile) */}
          <Modal
            opened={planSwapState?.step === "meal" && planSwapState?.targetDay != null}
            onClose={() => setPlanSwapState(null)}
            title="Selecciona la comida a intercambiar"
            size="sm"
          >
            {(() => {
              if (!planSwapState || planSwapState.targetDay == null) return null;
              const targetDayData = activePlanDays.find((d: PlanDay) => d.day === planSwapState.targetDay);
              const rawTargetMeals = targetDayData?.meals || [];
              const seenKeys = new Set<string>();
              const targetMeals = rawTargetMeals.filter((meal: PlanMeal) => {
                const key = `${meal.name}-${meal.time || ""}`;
                if (seenKeys.has(key)) return false;
                seenKeys.add(key);
                return true;
              });
              const dayLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
              const targetDayLabel = dayLabels[(planSwapState.targetDay - 1) % 7] || `Día ${planSwapState.targetDay}`;
              if (targetMeals.length === 0) {
                return <Text c="dimmed" ta="center" py="md">No hay comidas en {targetDayLabel}</Text>;
              }
              return (
                <Stack gap="xs">
                  <Button
                    variant="filled"
                    color="red"
                    fullWidth
                    justify="start"
                    onClick={() => {
                      moveMealMutation.mutate({
                        sourceDay: planSwapState.sourceDayNum,
                        mealIndex: planSwapState.sourceMealIndex,
                        targetDay: planSwapState.targetDay!,
                      });
                      setPlanSwapState(null);
                    }}
                  >
                    Mover sin intercambiar
                  </Button>
                  <Text size="sm" c="dimmed" mb="xs">Comidas de {targetDayLabel}:</Text>
                  {targetMeals.map((meal: PlanMeal, tmi: number) => {
                    const mt = MEAL_TYPES.find(m => m.value === meal.name);
                    return (
                      <Button
                        key={tmi}
                        variant="outline"
                        fullWidth
                        justify="start"
                        leftSection={mt ? <ThemeIcon variant="light" color={mt.color} size="sm" radius="xl">{(() => { const I = mt.icon; return <I size={14} />; })()}</ThemeIcon> : null}
                        onClick={() => {
                          swapMealsMutation.mutate({
                            sourceDay: planSwapState.sourceDayNum,
                            sourceMealIndex: planSwapState.sourceMealIndex,
                            targetDay: planSwapState.targetDay!,
                            targetMealIndex: tmi,
                          });
                          setPlanSwapState(null);
                        }}
                      >
                        {mt?.label || meal.name}{meal.time ? ` (${meal.time})` : ""}
                      </Button>
                    );
                  })}
                </Stack>
              );
            })()}
          </Modal>
          </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Stack gap="md">
            {(() => {
              type HistDay = { date: string; meals: Array<{ meal_name: string; total_calories: number; total_protein: number; total_carbs: number; total_fat: number; foods: Array<Record<string, unknown>>; logged_at?: string; plan_reference?: { calories: number; protein: number; carbs: number; fat: number; foods: Array<Record<string, unknown>> } | null; has_modifications?: boolean }>; totals: { calories: number; protein: number; carbs: number; fat: number }; plan_totals?: { calories: number; protein: number; carbs: number; fat: number }; has_modifications?: boolean };
              const renderDeviations = (day: HistDay) => {
                const pt = day.plan_totals;
                if (!pt || (pt.calories === 0 && pt.protein === 0 && pt.carbs === 0 && pt.fat === 0)) return null;
                const dCal = day.totals.calories - pt.calories;
                const dProt = Math.round((day.totals.protein - pt.protein) * 10) / 10;
                const dCarbs = Math.round((day.totals.carbs - pt.carbs) * 10) / 10;
                const dFat = Math.round((day.totals.fat - pt.fat) * 10) / 10;
                return (
                  <Group gap={4} mt={2}>
                    {dCal !== 0 && <Badge size="xs" variant="light" color={dCal > 0 ? "red" : "green"}>{dCal > 0 ? "+" : ""}{dCal} kcal</Badge>}
                    {dProt !== 0 && <Badge size="xs" variant="light" color={dProt > 0 ? "red" : "green"}>{dProt > 0 ? "+" : ""}{dProt}g P</Badge>}
                    {dCarbs !== 0 && <Badge size="xs" variant="light" color={dCarbs > 0 ? "red" : "green"}>{dCarbs > 0 ? "+" : ""}{dCarbs}g C</Badge>}
                    {dFat !== 0 && <Badge size="xs" variant="light" color={dFat > 0 ? "red" : "green"}>{dFat > 0 ? "+" : ""}{dFat}g G</Badge>}
                    {day.has_modifications && <Badge size="xs" variant="light" color="yellow">Modificado</Badge>}
                  </Group>
                );
              };
              const renderDayCard = (day: HistDay) => {
                const pct = day.totals.calories > 0 && targets.calories > 0
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
                    isToday={day.date === toLocalDateStr(new Date())}
                    onClick={() => setHistoryDetailDay(day.date)}
                    badge={
                      <Badge variant="light" color={pct >= 90 ? "green" : pct >= 70 ? "yellow" : "orange"} size="sm">
                        {day.totals.calories} kcal
                      </Badge>
                    }
                    summary={
                      <>
                        <Group gap={4} mt={2}>
                          <Text size="xs" c="dimmed">{day.meals.length} comidas</Text>
                          <Badge variant="outline" color="red" size="xs">P:{Math.round(day.totals.protein)}g</Badge>
                          <Badge variant="outline" color="blue" size="xs">C:{Math.round(day.totals.carbs)}g</Badge>
                          <Badge variant="outline" color="grape" size="xs">G:{Math.round(day.totals.fat)}g</Badge>
                        </Group>
                        {renderDeviations(day)}
                      </>
                    }
                    progressValue={pct}
                    progressColor={pct >= 90 ? "green" : pct >= 70 ? "yellow" : "orange"}
                  />
                );
              };
              return nutritionHistory?.plan_groups && nutritionHistory.plan_groups.length > 0 ? (
                nutritionHistory.plan_groups.map((group: { plan_id: string; plan_name: string; is_active: boolean; days: HistDay[] }) => (
                  <Box key={group.plan_id} mb="lg">
                    <Group gap="sm" mb="sm">
                      <Text fw={700} size="lg">{group.plan_name}</Text>
                      <Badge variant="light" color={group.is_active ? "green" : "gray"} size="sm">
                        {group.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Group>
                    <Box pl="md" style={{ borderLeft: `3px solid var(--mantine-color-${group.is_active ? "green" : "gray"}-3)` }}>
                      <Stack gap="xs">
                        {group.days.map(renderDayCard)}
                      </Stack>
                    </Box>
                  </Box>
                ))
              ) : nutritionHistory?.days && nutritionHistory.days.length > 0 ? (
                (nutritionHistory.days as HistDay[]).map(renderDayCard)
              ) : null;
            })() || (
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
                  {selectedDay.meals.map((meal: { meal_name: string; total_calories: number; total_protein: number; total_carbs: number; total_fat: number; foods: Array<{ name: string; calories: number; protein?: number; carbs?: number; fat?: number; quantity?: number }>; plan_reference?: { calories: number; protein: number; carbs: number; fat: number; foods: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number; quantity: number }> } }, mealIndex: number) => {
                    const ref = meal.plan_reference;
                    const diffCal = ref ? meal.total_calories - ref.calories : 0;
                    const diffProt = ref ? (meal.total_protein || 0) - ref.protein : 0;
                    const diffCarbs = ref ? (meal.total_carbs || 0) - ref.carbs : 0;
                    const diffFat = ref ? (meal.total_fat || 0) - ref.fat : 0;
                    const fmtDiff = (v: number) => (v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`);
                    const diffColor = (v: number) => (Math.abs(v) < 1 ? "gray" : v > 0 ? "red" : "green");

                    const loggedNames = new Set(meal.foods.map(f => f.name));
                    const planNames = new Set((ref?.foods || []).map(f => f.name));
                    const addedFoods = meal.foods.filter(f => !planNames.has(f.name));
                    const removedFoods = (ref?.foods || []).filter(f => !loggedNames.has(f.name));

                    return (
                      <Paper key={mealIndex} p="md" radius="md" withBorder>
                        <Group justify="space-between" mb="xs">
                          <Text fw={600}>{meal.meal_name}</Text>
                          <Badge variant="light" color="orange">{meal.total_calories} kcal</Badge>
                        </Group>
                        <Text size="sm" c="dimmed" mb="xs">
                          {meal.foods.map((f) => `${f.name}${f.quantity ? ` (${f.quantity}g)` : ""}`).join(", ")}
                        </Text>
                        <Group gap={4} mb="xs">
                          <Badge size="xs" variant="outline" color="red">P:{Math.round(meal.total_protein || 0)}g</Badge>
                          <Badge size="xs" variant="outline" color="blue">C:{Math.round(meal.total_carbs || 0)}g</Badge>
                          <Badge size="xs" variant="outline" color="grape">G:{Math.round(meal.total_fat || 0)}g</Badge>
                        </Group>
                        {ref && (
                          <Box p="xs" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
                            {addedFoods.length === 0 && removedFoods.length === 0 && Math.abs(diffCal) < 5 && Math.abs(diffProt) < 1 && Math.abs(diffCarbs) < 1 && Math.abs(diffFat) < 1 ? (
                              <Badge size="sm" variant="light" color="green">Sin variaciones</Badge>
                            ) : (
                              <>
                                <Text size="xs" fw={600} mb={4}>Variación vs plan:</Text>
                                <Group gap={6} wrap="wrap" mb={4}>
                                  <Badge size="xs" variant="light" color={diffColor(diffCal)}>{fmtDiff(diffCal)} kcal</Badge>
                                  <Badge size="xs" variant="light" color={diffColor(diffProt)}>{fmtDiff(diffProt)}g prot</Badge>
                                  <Badge size="xs" variant="light" color={diffColor(diffCarbs)}>{fmtDiff(diffCarbs)}g carbs</Badge>
                                  <Badge size="xs" variant="light" color={diffColor(diffFat)}>{fmtDiff(diffFat)}g grasas</Badge>
                                </Group>
                                {(addedFoods.length > 0 || removedFoods.length > 0) && (
                                  <Box mt={4}>
                                    <Text size="xs" fw={600} mb={2}>Alimentos originales vs finales:</Text>
                                    {ref.foods.map((pf, pi) => {
                                      const loggedEquiv = meal.foods.find(f => f.name === pf.name);
                                      return (
                                        <Group key={pi} gap={4} mb={2}>
                                          <Text size="xs" c={loggedEquiv ? undefined : "red"} td={loggedEquiv ? undefined : "line-through"} style={{ flex: 1 }}>
                                            {pf.name} ({pf.quantity}g)
                                          </Text>
                                          <Text size="xs" c="dimmed">{loggedEquiv ? `→ ${loggedEquiv.name} (${loggedEquiv.quantity || "?"}g)` : "No registrado"}</Text>
                                        </Group>
                                      );
                                    })}
                                    {addedFoods.map((af, ai) => (
                                      <Group key={`a-${ai}`} gap={4} mb={2}>
                                        <Text size="xs" c="teal" style={{ flex: 1 }}>+ {af.name} ({af.quantity || "?"}g)</Text>
                                        <Text size="xs" c="dimmed">Añadido</Text>
                                      </Group>
                                    ))}
                                  </Box>
                                )}
                              </>
                            )}
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Stack>
              </FullPageDetail>
            );
          })()}
        </Tabs.Panel>

        <Tabs.Panel value="recipes">
          <ClientRecipesTab />
        </Tabs.Panel>

        <Tabs.Panel value="shopping">
          {shoppingList.length === 0 ? (
            <Paper p="xl" ta="center" radius="lg" withBorder>
              <Text size="xl" mb="sm">🛒</Text>
              <Title order={4} mb="xs">Cesta de la compra vacía</Title>
              <Text c="dimmed" size="sm">
                No hay alimentos en tu plan nutricional para esta semana. Consulta con tu entrenador.
              </Text>
            </Paper>
          ) : (
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Title order={4}>Cesta de la compra</Title>
                  <Text size="sm" c="dimmed">
                    {shoppingList.reduce((sum, g) => sum + g.items.length, 0)} alimentos
                  </Text>
                </Box>
                {checkedItems.size > 0 && (
                  <Button variant="subtle" size="xs" onClick={() => setCheckedItems(new Set())}>
                    Desmarcar todos
                  </Button>
                )}
              </Group>

              {allPlanWeeks.length > 0 && (
                <Group gap="sm" wrap="wrap">
                  <Select
                    value={shoppingWeek || String(currentAutoWeek)}
                    onChange={(v) => setShoppingWeek(v)}
                    data={allPlanWeeks.map((w: { week: number }) => ({ value: String(w.week), label: `Semana ${w.week}` }))}
                    size="xs"
                    radius="md"
                    w={150}
                    allowDeselect={false}
                  />
                  {shoppingWeekDateRange && (
                    <Badge variant="light" color="blue" size="sm">
                      {shoppingWeekDateRange.startStr} – {shoppingWeekDateRange.endStr}
                    </Badge>
                  )}
                </Group>
              )}

              {shoppingList.map((group) => (
                <Box key={group.category}>
                  <Group gap="xs" mb="sm">
                    <Badge
                      color={FOOD_CATEGORY_COLORS[group.category] || "gray"}
                      variant="light"
                      size="lg"
                    >
                      {group.category}
                    </Badge>
                    <Text size="xs" c="dimmed">{group.items.length} alimentos</Text>
                  </Group>
                  <Stack gap={0}>
                    {group.items.map((item) => {
                      const isChecked = checkedItems.has(item.name);
                      return (
                        <Box
                          key={item.name}
                          px="md"
                          py="sm"
                          style={{
                            borderBottom: "1px solid var(--mantine-color-gray-2)",
                            opacity: isChecked ? 0.5 : 1,
                            transition: "opacity 0.15s ease",
                          }}
                        >
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                              <Checkbox
                                checked={isChecked}
                                onChange={() => toggleChecked(item.name)}
                                color="green"
                                radius="xl"
                              />
                              <Text
                                size="sm"
                                fw={500}
                                td={isChecked ? "line-through" : undefined}
                              >
                                {item.name}
                              </Text>
                            </Group>
                            <Badge variant="light" color="gray" size="sm">
                              {item.totalGrams >= 1000
                                ? `${(item.totalGrams / 1000).toFixed(1)} kg`
                                : `${Math.round(item.totalGrams)} g`}
                            </Badge>
                          </Group>
                        </Box>
                      );
                    })}
                  </Stack>
                  <Divider mt="sm" />
                </Box>
              ))}

              <Paper p="sm" radius="md" withBorder>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Progreso</Text>
                  <Text size="sm" fw={600}>
                    {checkedItems.size} / {shoppingList.reduce((sum, g) => sum + g.items.length, 0)} comprados
                  </Text>
                </Group>
                <Progress
                  value={(checkedItems.size / Math.max(1, shoppingList.reduce((sum, g) => sum + g.items.length, 0))) * 100}
                  color="green"
                  size="sm"
                  radius="xl"
                  mt="xs"
                />
              </Paper>
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Modal para registrar comida manual */}
      <LogMealModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleLogMeal}
        isLoading={logNutritionMutation.isPending}
      />

      {/* Modal para registrar/editar comida del plan */}
      <LogPlanMealModal
        opened={planMealModalOpened}
        onClose={() => {
          closePlanMealModal();
          setSelectedPlanMeal(null);
        }}
        onSubmit={handleLogMeal}
        isLoading={logNutritionMutation.isPending}
        meal={selectedPlanMeal}
        existingLog={
          selectedPlanMeal && registeredMeals[selectedPlanMeal.name]
            ? (() => {
                const logs = (nutritionLogs || []).filter(
                  (l) => l.meal_name === selectedPlanMeal.name
                );
                if (logs.length === 0) return null;
                const log = logs[0];
                return {
                  foods: (log.foods || []).map((f: Record<string, unknown>) => ({
                    name: (f.name as string) || "",
                    calories: Number(f.calories || 0),
                    protein: Number(f.protein || 0),
                    carbs: Number(f.carbs || 0),
                    fat: Number(f.fat || 0),
                    quantity: Number(f.quantity || 100),
                  })),
                  notes: log.notes || undefined,
                  satisfaction_rating: log.satisfaction_rating ?? undefined,
                };
              })()
            : null
        }
      />
    </Box>
  );
}
