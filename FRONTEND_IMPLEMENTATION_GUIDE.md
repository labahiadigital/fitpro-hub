# Guía de Implementación Frontend - Sistema de Nutrición Mejorado

## Estado Actual vs Requerido

### ❌ Problemas Identificados

1. **No hay pestaña de Suplementos** en la página de nutrición
2. **No hay favoritos** visibles (estrellitas)
3. **Nombres de comidas fijos** (Desayuno, Almuerzo, Cena)
4. **Cantidades con multiplicador** (1x, 2x) en lugar de gramos específicos
5. **No se pueden agregar suplementos** a los planes nutricionales

### ✅ Soluciones a Implementar

## 1. Agregar Pestaña de Suplementos en Nutrición

### Archivo: `frontend/src/pages/nutrition/NutritionPage.tsx`

**Cambios necesarios:**

```typescript
// Línea 483: Actualizar Tabs.List para incluir suplementos

<Tabs.List mb="md" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
  <Tabs.Tab leftSection={<IconTemplate size={14} />} value="plans">
    Planes{" "}
    {mealPlans.length > 0 && (
      <Badge ml="xs" size="xs" radius="md" variant="light">
        {mealPlans.length}
      </Badge>
    )}
  </Tabs.Tab>
  
  <Tabs.Tab leftSection={<IconApple size={14} />} value="foods">
    Alimentos{" "}
    {(totalFoodsCount ?? 0) > 0 && (
      <Badge ml="xs" size="xs" radius="md" variant="light">
        {totalFoodsCount?.toLocaleString()}
      </Badge>
    )}
  </Tabs.Tab>
  
  {/* NUEVO: Pestaña de suplementos */}
  <Tabs.Tab leftSection={<IconPill size={14} />} value="supplements">
    Suplementos{" "}
    {(totalSupplementsCount ?? 0) > 0 && (
      <Badge ml="xs" size="xs" radius="md" variant="light">
        {totalSupplementsCount}
      </Badge>
    )}
  </Tabs.Tab>
</Tabs.List>
```

**Agregar imports necesarios:**

```typescript
import { IconPill } from "@tabler/icons-react";
```

**Agregar nuevo Tab.Panel:**

```typescript
<Tabs.Panel value="supplements">
  <SupplementsTab />
</Tabs.Panel>
```

**Crear componente SupplementsTab:**

```typescript
// frontend/src/components/nutrition/SupplementsTab.tsx

import { ActionIcon, Badge, Box, Button, Group, SimpleGrid, Text } from "@mantine/core";
import { IconStar, IconStarFilled, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

export function SupplementsTab() {
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const toggleFavorite = (supplementId: string) => {
    // TODO: Llamar a API POST /api/v1/supplements/favorites/{supplement_id}
    if (favorites.includes(supplementId)) {
      setFavorites(favorites.filter(id => id !== supplementId));
      // TODO: DELETE /api/v1/supplements/favorites/{supplement_id}
    } else {
      setFavorites([...favorites, supplementId]);
      // TODO: POST /api/v1/supplements/favorites/{supplement_id}
    }
  };
  
  return (
    <>
      {/* Lista de suplementos con botones de favoritos */}
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
        {supplements.map((supplement) => (
          <Box key={supplement.id} className="nv-card" p="md">
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm" lineClamp={1}>{supplement.name}</Text>
              <ActionIcon
                variant="subtle"
                color={favorites.includes(supplement.id) ? "yellow" : "gray"}
                onClick={() => toggleFavorite(supplement.id)}
              >
                {favorites.includes(supplement.id) ? (
                  <IconStarFilled size={16} />
                ) : (
                  <IconStar size={16} />
                )}
              </ActionIcon>
            </Group>
            {/* Resto de la card... */}
          </Box>
        ))}
      </SimpleGrid>
    </>
  );
}
```

## 2. Agregar Favoritos a Alimentos

### Archivo: `frontend/src/pages/nutrition/NutritionPage.tsx`

**Cambio en la línea 639-683 (renderizado de alimentos):**

```typescript
<Box key={food.id} className="nv-card-compact" p="xs">
  <Group gap="xs" mb="xs" wrap="nowrap">
    <ThemeIcon
      color={getCategoryColor(food.category)}
      radius="md"
      size="md"
      variant="light"
    >
      <CategoryIcon size={14} />
    </ThemeIcon>
    <Box style={{ flex: 1, minWidth: 0 }}>
      <Text fw={600} lineClamp={1} size="xs">
        {food.name}
      </Text>
      <Text size="xs" c="dimmed">{food.serving_size}</Text>
    </Box>
    
    {/* NUEVO: Botón de favorito */}
    <ActionIcon
      color={isFavorite(food.id) ? "yellow" : "gray"}
      onClick={() => toggleFoodFavorite(food.id)}
      size="xs"
      variant="subtle"
      radius="md"
    >
      {isFavorite(food.id) ? (
        <IconStarFilled size={12} />
      ) : (
        <IconStar size={12} />
      )}
    </ActionIcon>
    
    <ActionIcon
      color="red"
      onClick={() => handleDeleteFood(food.id, food.name)}
      size="xs"
      variant="subtle"
      radius="md"
    >
      <IconTrash size={12} />
    </ActionIcon>
  </Group>
  {/* Resto de la card... */}
</Box>
```

**Agregar funciones de favoritos:**

```typescript
const [foodFavorites, setFoodFavorites] = useState<string[]>([]);

const isFavorite = (foodId: string) => {
  return foodFavorites.includes(foodId);
};

const toggleFoodFavorite = async (foodId: string) => {
  try {
    if (isFavorite(foodId)) {
      // DELETE /api/v1/nutrition/favorites/{food_id}
      await api.delete(`/nutrition/favorites/${foodId}`);
      setFoodFavorites(foodFavorites.filter(id => id !== foodId));
    } else {
      // POST /api/v1/nutrition/favorites/{food_id}
      await api.post(`/nutrition/favorites/${foodId}`);
      setFoodFavorites([...foodFavorites, foodId]);
    }
  } catch (error) {
    // Manejar error
  }
};

// Al cargar la página, obtener favoritos:
useEffect(() => {
  const fetchFavorites = async () => {
    const response = await api.get('/nutrition/favorites');
    setFoodFavorites(response.data.map(f => f.id));
  };
  fetchFavorites();
}, []);
```

## 3. Cambiar Nombres de Comidas a "Comida 1, 2, 3" Editables

### Archivo: `frontend/src/components/nutrition/MealPlanBuilder.tsx`

**Cambio 1: Actualizar interfaz Meal**

```typescript
export interface Meal {
  id: string;
  name: string;  // Ya está, pero ahora será editable
  time: string;
  type: "meal" | "snack";  // Simplificar tipos
  items: MealItem[];
}
```

**Cambio 2: Actualizar función addMeal (línea 169)**

```typescript
const addMeal = (mealNumber: number) => {
  if (!currentDay) return;

  const newMeal: Meal = {
    id: `meal-${Date.now()}`,
    name: `Comida ${mealNumber}`,  // CAMBIO: Nombre genérico
    time: `${8 + (mealNumber - 1) * 3}:00`,  // 08:00, 11:00, 14:00, etc.
    type: "meal",
    items: [],
  };

  onChange(
    days.map((d) =>
      d.id === activeDay ? { ...d, meals: [...d.meals, newMeal] } : d
    )
  );
};
```

**Cambio 3: Hacer nombres editables (línea 450-467)**

```typescript
<Paper key={meal.id} p="md" radius="lg" withBorder>
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
        {/* CAMBIO: TextInput editable para el nombre */}
        <TextInput
          value={meal.name}
          onChange={(e) => updateMealName(meal.id, e.target.value)}
          variant="unstyled"
          styles={{
            input: { fontWeight: 600, padding: 0 }
          }}
        />
        
        {/* CAMBIO: TimeInput editable para la hora */}
        <TextInput
          value={meal.time}
          onChange={(e) => updateMealTime(meal.id, e.target.value)}
          placeholder="HH:MM"
          variant="unstyled"
          size="xs"
          styles={{
            input: { color: 'dimmed', padding: 0 }
          }}
        />
      </Box>
    </Group>
    {/* Resto igual... */}
  </Group>
  {/* Resto de la meal... */}
</Paper>
```

**Agregar funciones de actualización:**

```typescript
const updateMealName = (mealId: string, name: string) => {
  onChange(
    days.map((d) =>
      d.id === activeDay
        ? {
            ...d,
            meals: d.meals.map((m) =>
              m.id === mealId ? { ...m, name } : m
            ),
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
            meals: d.meals.map((m) =>
              m.id === mealId ? { ...m, time } : m
            ),
          }
        : d
    )
  );
};
```

**Cambio 4: Actualizar botones de agregar comida (línea 552-587)**

```typescript
<Divider label="Añadir comida" labelPosition="center" />

<SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
  <Button
    color="blue"
    leftSection={<IconPlus size={16} />}
    onClick={() => addMeal(1)}
    variant="light"
  >
    Comida 1
  </Button>
  <Button
    color="green"
    leftSection={<IconPlus size={16} />}
    onClick={() => addMeal(2)}
    variant="light"
  >
    Comida 2
  </Button>
  <Button
    color="orange"
    leftSection={<IconPlus size={16} />}
    onClick={() => addMeal(3)}
    variant="light"
  >
    Comida 3
  </Button>
  <Button
    color="grape"
    leftSection={<IconPlus size={16} />}
    onClick={() => addMeal(4)}
    variant="light"
  >
    Comida 4
  </Button>
  <Button
    color="red"
    leftSection={<IconPlus size={16} />}
    onClick={() => addMeal(5)}
    variant="light"
  >
    Comida 5
  </Button>
  <Button
    color="teal"
    leftSection={<IconCookie size={16} />}
    onClick={() => addMeal(999)}  // Número especial para snack
    variant="light"
  >
    Snack
  </Button>
</SimpleGrid>
```

## 4. Cambiar Cantidades a Gramos Específicos

### Archivo: `frontend/src/components/nutrition/MealPlanBuilder.tsx`

**Cambio 1: Actualizar interfaz MealItem**

```typescript
export interface MealItem {
  id: string;
  food_id: string;
  food: Food;
  quantity_grams: number;  // CAMBIO: Gramos específicos en lugar de multiplicador
  notes?: string;
}
```

**Cambio 2: Actualizar función addFoodToMeal (línea 216)**

```typescript
const addFoodToMeal = (food: Food) => {
  if (!(selectedMealId && currentDay)) return;

  const newItem: MealItem = {
    id: `item-${Date.now()}`,
    food_id: food.id,
    food,
    quantity_grams: 100,  // CAMBIO: Por defecto 100g
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
```

**Cambio 3: Actualizar cálculos de macros (línea 139-150)**

```typescript
const calculateDayMacros = (day: DayPlan) => {
  let calories = 0, protein = 0, carbs = 0, fat = 0;

  day.meals.forEach((meal) => {
    meal.items.forEach((item) => {
      // CAMBIO: Calcular basado en gramos
      const servingSizeGrams = parseFloat(item.food.serving_size) || 100;
      const factor = item.quantity_grams / servingSizeGrams;
      
      calories += item.food.calories * factor;
      protein += item.food.protein * factor;
      carbs += item.food.carbs * factor;
      fat += item.food.fat * factor;
    });
  });

  return { calories, protein, carbs, fat };
};
```

**Cambio 4: Actualizar UI de cantidad (línea 492-535)**

```typescript
{meal.items.map((item) => (
  <Card key={item.id} padding="xs" radius="md" withBorder>
    <Group justify="space-between">
      <Group gap="sm">
        <Text fw={500} size="sm">
          {item.food.name}
        </Text>
        <Text c="dimmed" size="xs">
          {/* CAMBIO: Mostrar calorías basadas en gramos */}
          {Math.round(
            item.food.calories * (item.quantity_grams / (parseFloat(item.food.serving_size) || 100))
          )} kcal
        </Text>
      </Group>
      <Group gap="xs">
        {/* CAMBIO: Input de gramos específicos */}
        <NumberInput
          value={item.quantity_grams}
          onChange={(v) =>
            updateFoodQuantityGrams(
              meal.id,
              item.id,
              Number(v)
            )
          }
          min={1}
          max={1000}
          step={10}
          size="xs"
          w={80}
          suffix="g"
        />
        <ActionIcon
          color="red"
          onClick={() => removeFoodFromMeal(meal.id, item.id)}
          size="sm"
          variant="subtle"
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
    </Group>
  </Card>
))}
```

**Agregar nueva función:**

```typescript
const updateFoodQuantityGrams = (
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
```

## 5. Integrar Suplementos en el MealPlanBuilder

### Archivo: `frontend/src/components/nutrition/MealPlanBuilder.tsx`

**Cambio 1: Actualizar interfaz MealItem para soportar suplementos**

```typescript
export interface MealItem {
  id: string;
  food_id?: string;
  supplement_id?: string;
  food?: Food;
  supplement?: Supplement;
  quantity_grams: number;
  notes?: string;
  type: "food" | "supplement";  // NUEVO
}

export interface Supplement {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  how_to_take?: string;
  timing?: string;
}
```

**Cambio 2: Agregar props para suplementos**

```typescript
interface MealPlanBuilderProps {
  days: DayPlan[];
  onChange: (days: DayPlan[]) => void;
  availableFoods: Food[];
  availableSupplements: Supplement[];  // NUEVO
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}
```

**Cambio 3: Actualizar modal de selección para incluir suplementos**

```typescript
{/* Food/Supplement Selection Modal */}
<Modal
  onClose={closeFoodModal}
  opened={foodModalOpened}
  size="lg"
  title="Agregar Alimento o Suplemento"
>
  <Tabs defaultValue="foods">
    <Tabs.List>
      <Tabs.Tab value="foods" leftSection={<IconApple size={14} />}>
        Alimentos
      </Tabs.Tab>
      <Tabs.Tab value="supplements" leftSection={<IconPill size={14} />}>
        Suplementos
      </Tabs.Tab>
    </Tabs.List>
    
    <Tabs.Panel value="foods" pt="md">
      <TextInput
        leftSection={<IconSearch size={16} />}
        mb="md"
        onChange={(e) => setFoodSearch(e.target.value)}
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
              style={{ cursor: "pointer" }}
              withBorder
            >
              {/* Card de alimento */}
            </Card>
          ))}
        </Stack>
      </ScrollArea>
    </Tabs.Panel>
    
    <Tabs.Panel value="supplements" pt="md">
      <TextInput
        leftSection={<IconSearch size={16} />}
        mb="md"
        onChange={(e) => setSupplementSearch(e.target.value)}
        placeholder="Buscar suplementos..."
        value={supplementSearch}
      />
      <ScrollArea h={400}>
        <Stack gap="xs">
          {filteredSupplements.map((supplement) => (
            <Card
              key={supplement.id}
              onClick={() => addSupplementToMeal(supplement)}
              padding="sm"
              style={{ cursor: "pointer" }}
              withBorder
            >
              <Box>
                <Text fw={500} size="sm">{supplement.name}</Text>
                {supplement.how_to_take && (
                  <Text size="xs" c="dimmed">{supplement.how_to_take}</Text>
                )}
                {supplement.timing && (
                  <Badge size="xs" mt="xs">{supplement.timing}</Badge>
                )}
              </Box>
              <Group gap="xs" mt="xs">
                <Badge color="blue">{supplement.calories} kcal</Badge>
                <Badge size="xs" variant="outline">P: {supplement.protein}g</Badge>
                <Badge size="xs" variant="outline">C: {supplement.carbs}g</Badge>
                <Badge size="xs" variant="outline">G: {supplement.fat}g</Badge>
              </Group>
            </Card>
          ))}
        </Stack>
      </ScrollArea>
    </Tabs.Panel>
  </Tabs>
</Modal>
```

**Cambio 4: Agregar función para añadir suplementos**

```typescript
const addSupplementToMeal = (supplement: Supplement) => {
  if (!(selectedMealId && currentDay)) return;

  const newItem: MealItem = {
    id: `item-${Date.now()}`,
    supplement_id: supplement.id,
    supplement,
    quantity_grams: 30,  // Por defecto 30g para suplementos
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
};
```

**Cambio 5: Actualizar renderizado de items para distinguir suplementos**

```typescript
{meal.items.map((item) => (
  <Card key={item.id} padding="xs" radius="md" withBorder>
    <Group justify="space-between">
      <Group gap="sm">
        {item.type === "supplement" && (
          <ThemeIcon size="sm" color="grape" variant="light">
            <IconPill size={12} />
          </ThemeIcon>
        )}
        <Box>
          <Text fw={500} size="sm">
            {item.type === "food" ? item.food?.name : item.supplement?.name}
          </Text>
          {item.type === "supplement" && item.supplement?.how_to_take && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {item.supplement.how_to_take}
            </Text>
          )}
        </Box>
        <Text c="dimmed" size="xs">
          {Math.round(
            (item.type === "food" ? item.food?.calories : item.supplement?.calories || 0) *
            (item.quantity_grams / (parseFloat(item.type === "food" ? item.food?.serving_size : item.supplement?.serving_size) || 100))
          )} kcal
        </Text>
      </Group>
      <Group gap="xs">
        <NumberInput
          value={item.quantity_grams}
          onChange={(v) => updateFoodQuantityGrams(meal.id, item.id, Number(v))}
          min={1}
          max={1000}
          step={item.type === "supplement" ? 5 : 10}
          size="xs"
          w={80}
          suffix="g"
        />
        <ActionIcon
          color="red"
          onClick={() => removeFoodFromMeal(meal.id, item.id)}
          size="sm"
          variant="subtle"
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
    </Group>
  </Card>
))}
```

## Resumen de Imports Necesarios

```typescript
// Agregar a los imports existentes:
import { IconPill, IconStar, IconStarFilled } from "@tabler/icons-react";
```

## Hooks Necesarios para API

### Crear: `frontend/src/hooks/useFavorites.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useFoodFavorites() {
  return useQuery({
    queryKey: ['food-favorites'],
    queryFn: async () => {
      const response = await api.get('/nutrition/favorites');
      return response.data;
    },
  });
}

export function useToggleFoodFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ foodId, isFavorite }: { foodId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await api.delete(`/nutrition/favorites/${foodId}`);
      } else {
        await api.post(`/nutrition/favorites/${foodId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-favorites'] });
    },
  });
}

export function useSupplementFavorites() {
  return useQuery({
    queryKey: ['supplement-favorites'],
    queryFn: async () => {
      const response = await api.get('/supplements/favorites');
      return response.data;
    },
  });
}

export function useToggleSupplementFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ supplementId, isFavorite }: { supplementId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await api.delete(`/supplements/favorites/${supplementId}`);
      } else {
        await api.post(`/supplements/favorites/${supplementId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-favorites'] });
    },
  });
}
```

## Testing

### Checklist de Verificación

- [ ] Aparece pestaña "Suplementos" en página de nutrición
- [ ] Se pueden marcar alimentos como favoritos (estrella)
- [ ] Se pueden marcar suplementos como favoritos (estrella)
- [ ] Los favoritos se mantienen al recargar la página
- [ ] Los nombres de comidas se pueden editar ("Comida 1", "Pre-entreno", etc.)
- [ ] Los horarios de comidas se pueden editar
- [ ] Las cantidades se muestran en gramos (100g, 150g, etc.)
- [ ] Se pueden agregar suplementos a las comidas
- [ ] Los suplementos se distinguen visualmente de los alimentos
- [ ] Los cálculos de macros incluyen suplementos
- [ ] Se muestra "Cómo tomar" para los suplementos

## Prioridad de Implementación

1. **Crítico**: Cantidades en gramos (sin esto no se pueden usar correctamente)
2. **Alta**: Nombres de comidas editables (mejor UX)
3. **Alta**: Favoritos (productividad)
4. **Media**: Integración de suplementos
5. **Baja**: Pestaña de suplementos en nutrición (se puede acceder desde el menú principal)

---

**Nota**: Estos cambios deben hacerse de forma incremental, testeando cada uno antes de pasar al siguiente.
