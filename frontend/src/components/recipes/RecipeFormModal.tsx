import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconFlame,
  IconGripVertical,
  IconPill,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { nutritionApi } from "../../services/api";
import type {
  Recipe,
  RecipeFormValues,
  RecipeItem,
} from "../../types/recipe";
import { RECIPE_CATEGORIES, RECIPE_DIFFICULTIES } from "../../types/recipe";

interface RecipeFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: object) => Promise<void>;
  recipe?: Recipe | null;
  loading?: boolean;
}

function computeTotals(items: RecipeItem[]) {
  return items.reduce(
    (acc, item) => {
      const ratio = (item.quantity_grams || 100) / 100;
      return {
        calories: acc.calories + (item.calories || 0) * ratio,
        protein: acc.protein + (item.protein || 0) * ratio,
        carbs: acc.carbs + (item.carbs || 0) * ratio,
        fat: acc.fat + (item.fat || 0) * ratio,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function RecipeFormModal({
  opened,
  onClose,
  onSubmit,
  recipe,
  loading,
}: RecipeFormModalProps) {
  const [foodSearch, setFoodSearch] = useState("");
  const [debouncedFoodSearch] = useDebouncedValue(foodSearch, 300);
  const [selectedFoods, setSelectedFoods] = useState<any[]>([]);
  const [showIngredients, setShowIngredients] = useState(true);

  const form = useForm<RecipeFormValues>({
    initialValues: {
      name: "",
      description: "",
      category: "",
      tags: [],
      servings: 1,
      prep_time_minutes: "",
      cook_time_minutes: "",
      difficulty: "",
      image_url: "",
      notes: "",
      is_public: false,
      items: [],
    },
    validate: {
      name: (v) => (v.length < 2 ? "Nombre requerido (min 2 caracteres)" : null),
      servings: (v) => (typeof v === "number" && v < 1 ? "Mínimo 1 porción" : null),
    },
  });

  useEffect(() => {
    if (opened) {
      if (recipe) {
        form.setValues({
          name: recipe.name,
          description: recipe.description || "",
          category: recipe.category || "",
          tags: recipe.tags || [],
          servings: recipe.servings || 1,
          prep_time_minutes: recipe.prep_time_minutes ?? "",
          cook_time_minutes: recipe.cook_time_minutes ?? "",
          difficulty: recipe.difficulty || "",
          image_url: recipe.image_url || "",
          notes: recipe.notes || "",
          is_public: recipe.is_public ?? false,
          items: recipe.items || [],
        });
      } else {
        form.reset();
      }
      setFoodSearch("");
      setSelectedFoods([]);
    }
  }, [opened, recipe]);

  const { data: foodSearchResults = [] } = useQuery({
    queryKey: ["recipe-food-search", debouncedFoodSearch],
    queryFn: async () => {
      if (!debouncedFoodSearch) return [];
      const res = await nutritionApi.foods({
        search: debouncedFoodSearch,
        page_size: 20,
      });
      return res.data?.items || [];
    },
    enabled: !!debouncedFoodSearch && opened,
  });

  const addSelectedFoods = useCallback(() => {
    const newItems: RecipeItem[] = selectedFoods.map((food) => ({
      food_id: food.id,
      name: food.name,
      type: "food" as const,
      quantity_grams: 100,
      calories: food.calories || 0,
      protein: food.protein_g || 0,
      carbs: food.carbs_g || 0,
      fat: food.fat_g || 0,
    }));
    form.setFieldValue("items", [...form.values.items, ...newItems]);
    setSelectedFoods([]);
    setFoodSearch("");
  }, [selectedFoods, form]);

  const removeItem = useCallback(
    (idx: number) => {
      form.setFieldValue(
        "items",
        form.values.items.filter((_, i) => i !== idx)
      );
    },
    [form]
  );

  const updateItemQuantity = useCallback(
    (idx: number, qty: number) => {
      const items = [...form.values.items];
      items[idx] = { ...items[idx], quantity_grams: qty };
      form.setFieldValue("items", items);
    },
    [form]
  );

  const totals = computeTotals(form.values.items);
  const servings = typeof form.values.servings === "number" && form.values.servings > 0
    ? form.values.servings
    : 1;

  const handleSubmit = async () => {
    const validation = form.validate();
    if (validation.hasErrors) return;

    const data = {
      ...form.values,
      prep_time_minutes: form.values.prep_time_minutes || null,
      cook_time_minutes: form.values.cook_time_minutes || null,
      category: form.values.category || null,
      difficulty: form.values.difficulty || null,
      total_calories: Math.round(totals.calories),
      total_protein: Math.round(totals.protein * 10) / 10,
      total_carbs: Math.round(totals.carbs * 10) / 10,
      total_fat: Math.round(totals.fat * 10) / 10,
      total_fiber: 0,
      total_sugar: 0,
    };

    await onSubmit(data);
  };

  const totalTime =
    (typeof form.values.prep_time_minutes === "number" ? form.values.prep_time_minutes : 0) +
    (typeof form.values.cook_time_minutes === "number" ? form.values.cook_time_minutes : 0);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="lg" style={{ color: "var(--nv-dark)" }}>
          {recipe ? "Editar Receta" : "Nueva Receta"}
        </Text>
      }
      size="xl"
      radius="lg"
    >
      <ScrollArea.Autosize mah="75vh" offsetScrollbars>
        <Stack gap="md">
          {/* Basic info */}
          <TextInput
            label="Nombre de la receta"
            placeholder="Ej: Tortitas de avena y plátano"
            required
            {...form.getInputProps("name")}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Categoría"
              placeholder="Seleccionar categoría"
              data={RECIPE_CATEGORIES}
              clearable
              searchable
              {...form.getInputProps("category")}
            />
            <Select
              label="Dificultad"
              placeholder="Seleccionar dificultad"
              data={RECIPE_DIFFICULTIES}
              clearable
              {...form.getInputProps("difficulty")}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <NumberInput
              label="Porciones"
              min={1}
              max={50}
              leftSection={<IconUsers size={14} />}
              {...form.getInputProps("servings")}
            />
            <NumberInput
              label="Prep (min)"
              min={0}
              max={600}
              leftSection={<IconClock size={14} />}
              placeholder="--"
              {...form.getInputProps("prep_time_minutes")}
            />
            <NumberInput
              label="Cocción (min)"
              min={0}
              max={600}
              leftSection={<IconClock size={14} />}
              placeholder="--"
              {...form.getInputProps("cook_time_minutes")}
            />
            <Box pt={24}>
              {totalTime > 0 && (
                <Badge
                  color="blue"
                  variant="light"
                  size="lg"
                  leftSection={<IconClock size={12} />}
                  fullWidth
                  styles={{ root: { height: 36 } }}
                >
                  Total: {totalTime} min
                </Badge>
              )}
            </Box>
          </SimpleGrid>

          <Textarea
            label="Instrucciones de preparación"
            placeholder="Describe los pasos para preparar esta receta..."
            minRows={3}
            autosize
            maxRows={8}
            {...form.getInputProps("description")}
          />

          {/* Ingredients section */}
          <Divider
            label={
              <Group gap={6} style={{ cursor: "pointer" }} onClick={() => setShowIngredients(!showIngredients)}>
                <Text fw={600} size="sm">Ingredientes ({form.values.items.length})</Text>
                {showIngredients ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </Group>
            }
          />

          <Collapse in={showIngredients}>
            <Stack gap="xs">
              {form.values.items.length > 0 && (
                <Stack gap={4}>
                  {form.values.items.map((item, idx) => {
                    const ratio = (item.quantity_grams || 100) / 100;
                    return (
                      <Group
                        key={`${item.food_id}-${idx}`}
                        justify="space-between"
                        p="xs"
                        style={{
                          border: "1px solid var(--nv-border, #e0e0e0)",
                          borderRadius: 8,
                          backgroundColor: "var(--nv-surface, #fafafa)",
                        }}
                      >
                        <Group gap="xs" style={{ flex: 1 }}>
                          <IconGripVertical
                            size={14}
                            style={{ color: "var(--nv-slate, #999)", flexShrink: 0 }}
                          />
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Group gap={4}>
                              <Text size="sm" fw={500} lineClamp={1}>
                                {item.name}
                              </Text>
                              {item.type === "supplement" && (
                                <Badge size="xs" color="grape" variant="light">
                                  <IconPill size={8} style={{ marginRight: 2 }} />
                                  Supl.
                                </Badge>
                              )}
                            </Group>
                            <Group gap={4} mt={2}>
                              <Text size="xs" c="dimmed">
                                {Math.round((item.calories || 0) * ratio)} kcal
                              </Text>
                              <Text size="xs" c="green">
                                P:{Math.round((item.protein || 0) * ratio * 10) / 10}g
                              </Text>
                              <Text size="xs" c="orange">
                                C:{Math.round((item.carbs || 0) * ratio * 10) / 10}g
                              </Text>
                              <Text size="xs" c="grape">
                                G:{Math.round((item.fat || 0) * ratio * 10) / 10}g
                              </Text>
                            </Group>
                          </Box>
                        </Group>
                        <Group gap={4}>
                          <NumberInput
                            size="xs"
                            w={80}
                            min={1}
                            max={9999}
                            value={item.quantity_grams}
                            onChange={(v) => updateItemQuantity(idx, Number(v) || 1)}
                            suffix="g"
                            styles={{ input: { textAlign: "center" } }}
                          />
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size="sm"
                            onClick={() => removeItem(idx)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    );
                  })}
                </Stack>
              )}

              {/* Food search */}
              <Tabs defaultValue="foods" variant="outline" radius="md">
                <Tabs.List>
                  <Tabs.Tab value="foods" leftSection={<IconSearch size={12} />} style={{ fontSize: 12 }}>
                    Alimentos
                  </Tabs.Tab>
                  <Tabs.Tab value="supplements" leftSection={<IconPill size={12} />} style={{ fontSize: 12 }}>
                    Suplementos
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="foods" pt="xs">
                  <TextInput
                    leftSection={<IconSearch size={14} />}
                    placeholder="Buscar alimento para añadir..."
                    value={foodSearch}
                    onChange={(e) => {
                      setFoodSearch(e.target.value);
                      setSelectedFoods([]);
                    }}
                    size="sm"
                    mb="xs"
                  />
                  <ScrollArea h={180}>
                    {foodSearchResults.length > 0 ? (
                      <Stack gap={4}>
                        {foodSearchResults.map((food: any) => {
                          const isSelected = selectedFoods.some((f) => f.id === food.id);
                          return (
                            <Group
                              key={food.id}
                              p="xs"
                              style={{
                                cursor: "pointer",
                                borderRadius: 8,
                                border: isSelected
                                  ? "1px solid var(--mantine-color-teal-5)"
                                  : "1px solid transparent",
                                backgroundColor: isSelected
                                  ? "var(--mantine-color-teal-0)"
                                  : undefined,
                              }}
                              className="nv-card"
                              onClick={() => {
                                setSelectedFoods((prev) =>
                                  isSelected
                                    ? prev.filter((f) => f.id !== food.id)
                                    : [...prev, food]
                                );
                              }}
                            >
                              <Box style={{ flex: 1 }}>
                                <Text size="xs" fw={500}>
                                  {food.name}
                                </Text>
                                <Group gap={4}>
                                  <Text size="xs" c="dimmed">
                                    {Math.round(food.calories || 0)} kcal/100g
                                  </Text>
                                  <Text size="xs" c="green">
                                    P:{Math.round(food.protein_g || 0)}
                                  </Text>
                                  <Text size="xs" c="orange">
                                    C:{Math.round(food.carbs_g || 0)}
                                  </Text>
                                  <Text size="xs" c="grape">
                                    G:{Math.round(food.fat_g || 0)}
                                  </Text>
                                </Group>
                              </Box>
                              {isSelected && (
                                <Badge size="xs" color="teal" variant="filled">
                                  Seleccionado
                                </Badge>
                              )}
                            </Group>
                          );
                        })}
                      </Stack>
                    ) : foodSearch ? (
                      <Text c="dimmed" size="xs" ta="center" py="md">
                        Sin resultados para &quot;{foodSearch}&quot;
                      </Text>
                    ) : (
                      <Text c="dimmed" size="xs" ta="center" py="md">
                        Escribe para buscar alimentos...
                      </Text>
                    )}
                  </ScrollArea>
                  {selectedFoods.length > 0 && (
                    <Button
                      mt="xs"
                      size="xs"
                      fullWidth
                      leftSection={<IconPlus size={14} />}
                      variant="light"
                      color="teal"
                      onClick={addSelectedFoods}
                    >
                      Añadir {selectedFoods.length} seleccionado
                      {selectedFoods.length > 1 ? "s" : ""}
                    </Button>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="supplements" pt="xs">
                  <Text c="dimmed" size="xs" ta="center" py="md">
                    Los suplementos se pueden añadir desde la pestaña de alimentos buscando por nombre.
                  </Text>
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </Collapse>

          {/* Macro summary */}
          {form.values.items.length > 0 && (
            <>
              <Divider label={<Text fw={600} size="sm">Resumen nutricional</Text>} />
              <SimpleGrid cols={2} spacing="xs">
                <Box
                  p="sm"
                  style={{
                    borderRadius: 8,
                    backgroundColor: "var(--nv-surface, #fafafa)",
                    border: "1px solid var(--nv-border, #e0e0e0)",
                  }}
                >
                  <Text size="xs" c="dimmed" mb={2}>
                    Total (receta completa)
                  </Text>
                  <Group gap={6} wrap="wrap">
                    <Badge color="blue" variant="light" size="sm">
                      <IconFlame size={10} style={{ marginRight: 2 }} />
                      {Math.round(totals.calories)} kcal
                    </Badge>
                    <Badge color="green" variant="light" size="sm">
                      P: {Math.round(totals.protein * 10) / 10}g
                    </Badge>
                    <Badge color="orange" variant="light" size="sm">
                      C: {Math.round(totals.carbs * 10) / 10}g
                    </Badge>
                    <Badge color="grape" variant="light" size="sm">
                      G: {Math.round(totals.fat * 10) / 10}g
                    </Badge>
                  </Group>
                </Box>
                <Box
                  p="sm"
                  style={{
                    borderRadius: 8,
                    backgroundColor: "var(--nv-surface, #fafafa)",
                    border: "1px solid var(--nv-border, #e0e0e0)",
                  }}
                >
                  <Text size="xs" c="dimmed" mb={2}>
                    Por porción ({servings} porc.)
                  </Text>
                  <Group gap={6} wrap="wrap">
                    <Badge color="blue" variant="light" size="sm">
                      <IconFlame size={10} style={{ marginRight: 2 }} />
                      {Math.round(totals.calories / servings)} kcal
                    </Badge>
                    <Badge color="green" variant="light" size="sm">
                      P: {Math.round((totals.protein / servings) * 10) / 10}g
                    </Badge>
                    <Badge color="orange" variant="light" size="sm">
                      C: {Math.round((totals.carbs / servings) * 10) / 10}g
                    </Badge>
                    <Badge color="grape" variant="light" size="sm">
                      G: {Math.round((totals.fat / servings) * 10) / 10}g
                    </Badge>
                  </Group>
                </Box>
              </SimpleGrid>
            </>
          )}

          {/* Additional fields */}
          <Textarea
            label="Notas internas (solo visible para el entrenador)"
            placeholder="Notas privadas sobre esta receta..."
            minRows={2}
            autosize
            maxRows={4}
            {...form.getInputProps("notes")}
          />

          <Switch
            label="Visible para clientes"
            description="Los clientes podrán ver esta receta en su sección de nutrición"
            {...form.getInputProps("is_public", { type: "checkbox" })}
            styles={{
              body: { alignItems: "center" },
              label: { fontWeight: 600 },
            }}
          />

          {/* Actions */}
          <Divider />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              loading={loading}
              onClick={handleSubmit}
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                },
              }}
            >
              {recipe ? "Guardar Cambios" : "Crear Receta"}
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}
