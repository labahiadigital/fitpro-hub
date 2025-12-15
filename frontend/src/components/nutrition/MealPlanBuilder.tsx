import { useState } from 'react'
import {
  Paper,
  Group,
  Text,
  ActionIcon,
  Button,
  Box,
  Stack,
  Badge,
  Card,
  NumberInput,
  TextInput,
  Tabs,
  SimpleGrid,
  Modal,
  ScrollArea,
  ThemeIcon,
  Progress,
  Divider,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconTrash,
  IconSearch,
  IconApple,
  IconMeat,
  IconCoffee,
  IconSalad,
  IconCookie,
  IconShoppingCart,
  IconCopy,
} from '@tabler/icons-react'

export interface Food {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_size: string
  category: string
}

export interface MealItem {
  id: string
  food_id: string
  food: Food
  quantity: number
  unit: string
  notes?: string
}

export interface Meal {
  id: string
  name: string
  time: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  items: MealItem[]
}

export interface DayPlan {
  id: string
  day: number
  dayName: string
  meals: Meal[]
  notes?: string
}

interface MealPlanBuilderProps {
  days: DayPlan[]
  onChange: (days: DayPlan[]) => void
  availableFoods: Food[]
  targetCalories?: number
  targetProtein?: number
  targetCarbs?: number
  targetFat?: number
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
  const [activeDay, setActiveDay] = useState<string>(days[0]?.id || '')
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] = useDisclosure(false)
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [foodSearch, setFoodSearch] = useState('')
  const [shoppingListOpened, { open: openShoppingList, close: closeShoppingList }] = useDisclosure(false)

  const currentDay = days.find(d => d.id === activeDay)

  const getMealIcon = (type: Meal['type']) => {
    switch (type) {
      case 'breakfast': return IconCoffee
      case 'lunch': return IconSalad
      case 'dinner': return IconMeat
      case 'snack': return IconCookie
      default: return IconApple
    }
  }

  const getMealColor = (type: Meal['type']) => {
    switch (type) {
      case 'breakfast': return 'orange'
      case 'lunch': return 'green'
      case 'dinner': return 'blue'
      case 'snack': return 'grape'
      default: return 'gray'
    }
  }

  const calculateDayMacros = (day: DayPlan) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0

    day.meals.forEach(meal => {
      meal.items.forEach(item => {
        const multiplier = item.quantity
        calories += item.food.calories * multiplier
        protein += item.food.protein * multiplier
        carbs += item.food.carbs * multiplier
        fat += item.food.fat * multiplier
      })
    })

    return { calories, protein, carbs, fat }
  }

  const calculateMealMacros = (meal: Meal) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0

    meal.items.forEach(item => {
      const multiplier = item.quantity
      calories += item.food.calories * multiplier
      protein += item.food.protein * multiplier
      carbs += item.food.carbs * multiplier
      fat += item.food.fat * multiplier
    })

    return { calories, protein, carbs, fat }
  }

  const addMeal = (type: Meal['type']) => {
    if (!currentDay) return

    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      name: type === 'breakfast' ? 'Desayuno' :
            type === 'lunch' ? 'Almuerzo' :
            type === 'dinner' ? 'Cena' : 'Snack',
      time: type === 'breakfast' ? '08:00' :
            type === 'lunch' ? '13:00' :
            type === 'dinner' ? '20:00' : '16:00',
      type,
      items: [],
    }

    onChange(days.map(d =>
      d.id === activeDay
        ? { ...d, meals: [...d.meals, newMeal] }
        : d
    ))
  }

  const removeMeal = (mealId: string) => {
    onChange(days.map(d =>
      d.id === activeDay
        ? { ...d, meals: d.meals.filter(m => m.id !== mealId) }
        : d
    ))
  }

  const openAddFood = (mealId: string) => {
    setSelectedMealId(mealId)
    openFoodModal()
  }

  const addFoodToMeal = (food: Food) => {
    if (!selectedMealId || !currentDay) return

    const newItem: MealItem = {
      id: `item-${Date.now()}`,
      food_id: food.id,
      food,
      quantity: 1,
      unit: food.serving_size,
    }

    onChange(days.map(d =>
      d.id === activeDay
        ? {
            ...d,
            meals: d.meals.map(m =>
              m.id === selectedMealId
                ? { ...m, items: [...m.items, newItem] }
                : m
            ),
          }
        : d
    ))
    closeFoodModal()
  }

  const updateFoodQuantity = (mealId: string, itemId: string, quantity: number) => {
    onChange(days.map(d =>
      d.id === activeDay
        ? {
            ...d,
            meals: d.meals.map(m =>
              m.id === mealId
                ? {
                    ...m,
                    items: m.items.map(i =>
                      i.id === itemId ? { ...i, quantity } : i
                    ),
                  }
                : m
            ),
          }
        : d
    ))
  }

  const removeFoodFromMeal = (mealId: string, itemId: string) => {
    onChange(days.map(d =>
      d.id === activeDay
        ? {
            ...d,
            meals: d.meals.map(m =>
              m.id === mealId
                ? { ...m, items: m.items.filter(i => i.id !== itemId) }
                : m
            ),
          }
        : d
    ))
  }

  const copyDayToAll = () => {
    if (!currentDay) return

    onChange(days.map(d =>
      d.id === activeDay
        ? d
        : {
            ...d,
            meals: currentDay.meals.map(m => ({
              ...m,
              id: `meal-${Date.now()}-${Math.random()}`,
              items: m.items.map(i => ({
                ...i,
                id: `item-${Date.now()}-${Math.random()}`,
              })),
            })),
          }
    ))
  }

  const generateShoppingList = () => {
    const items: { [key: string]: { food: Food; totalQuantity: number } } = {}

    days.forEach(day => {
      day.meals.forEach(meal => {
        meal.items.forEach(item => {
          if (items[item.food_id]) {
            items[item.food_id].totalQuantity += item.quantity
          } else {
            items[item.food_id] = { food: item.food, totalQuantity: item.quantity }
          }
        })
      })
    })

    return Object.values(items)
  }

  const filteredFoods = availableFoods.filter(f =>
    f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
    f.category.toLowerCase().includes(foodSearch.toLowerCase())
  )

  const dayMacros = currentDay ? calculateDayMacros(currentDay) : { calories: 0, protein: 0, carbs: 0, fat: 0 }

  return (
    <>
      <Paper withBorder radius="lg" p="md" mb="md">
        <Group justify="space-between" mb="md">
          <Text fw={600}>Resumen del Día</Text>
          <Group gap="xs">
            <Button
              variant="light"
              size="xs"
              leftSection={<IconCopy size={14} />}
              onClick={copyDayToAll}
            >
              Copiar a todos los días
            </Button>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconShoppingCart size={14} />}
              onClick={openShoppingList}
            >
              Lista de Compra
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Calorías</Text>
              <Text size="xs" fw={500}>{Math.round(dayMacros.calories)} / {targetCalories}</Text>
            </Group>
            <Progress
              value={(dayMacros.calories / targetCalories) * 100}
              color={dayMacros.calories > targetCalories ? 'red' : 'blue'}
              size="sm"
              radius="xl"
            />
          </Box>
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Proteína</Text>
              <Text size="xs" fw={500}>{Math.round(dayMacros.protein)}g / {targetProtein}g</Text>
            </Group>
            <Progress
              value={(dayMacros.protein / targetProtein) * 100}
              color={dayMacros.protein > targetProtein ? 'red' : 'green'}
              size="sm"
              radius="xl"
            />
          </Box>
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Carbohidratos</Text>
              <Text size="xs" fw={500}>{Math.round(dayMacros.carbs)}g / {targetCarbs}g</Text>
            </Group>
            <Progress
              value={(dayMacros.carbs / targetCarbs) * 100}
              color={dayMacros.carbs > targetCarbs ? 'red' : 'orange'}
              size="sm"
              radius="xl"
            />
          </Box>
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Grasas</Text>
              <Text size="xs" fw={500}>{Math.round(dayMacros.fat)}g / {targetFat}g</Text>
            </Group>
            <Progress
              value={(dayMacros.fat / targetFat) * 100}
              color={dayMacros.fat > targetFat ? 'red' : 'grape'}
              size="sm"
              radius="xl"
            />
          </Box>
        </SimpleGrid>
      </Paper>

      <Tabs value={activeDay} onChange={(v) => setActiveDay(v || days[0]?.id)}>
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
                const mealMacros = calculateMealMacros(meal)
                const MealIcon = getMealIcon(meal.type)

                return (
                  <Paper key={meal.id} withBorder radius="lg" p="md">
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon
                          size="lg"
                          radius="md"
                          variant="light"
                          color={getMealColor(meal.type)}
                        >
                          <MealIcon size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={600}>{meal.name}</Text>
                          <Text size="xs" c="dimmed">{meal.time}</Text>
                        </Box>
                      </Group>
                      <Group gap="sm">
                        <Badge variant="light" color="blue">{Math.round(mealMacros.calories)} kcal</Badge>
                        <Badge variant="outline" color="green">P: {Math.round(mealMacros.protein)}g</Badge>
                        <Badge variant="outline" color="orange">C: {Math.round(mealMacros.carbs)}g</Badge>
                        <Badge variant="outline" color="grape">G: {Math.round(mealMacros.fat)}g</Badge>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => removeMeal(meal.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>

                    <Stack gap="xs">
                      {meal.items.map((item) => (
                        <Card key={item.id} withBorder padding="xs" radius="md">
                          <Group justify="space-between">
                            <Group gap="sm">
                              <Text size="sm" fw={500}>{item.food.name}</Text>
                              <Text size="xs" c="dimmed">
                                {Math.round(item.food.calories * item.quantity)} kcal
                              </Text>
                            </Group>
                            <Group gap="xs">
                              <NumberInput
                                value={item.quantity}
                                onChange={(v) => updateFoodQuantity(meal.id, item.id, Number(v))}
                                min={0.5}
                                max={10}
                                step={0.5}
                                w={70}
                                size="xs"
                              />
                              <Text size="xs" c="dimmed" w={60}>{item.unit}</Text>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => removeFoodFromMeal(meal.id, item.id)}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Group>
                        </Card>
                      ))}
                    </Stack>

                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      mt="sm"
                      onClick={() => openAddFood(meal.id)}
                    >
                      Añadir Alimento
                    </Button>
                  </Paper>
                )
              })}

              <Divider label="Añadir comida" labelPosition="center" />

              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <Button
                  variant="light"
                  color="orange"
                  leftSection={<IconCoffee size={16} />}
                  onClick={() => addMeal('breakfast')}
                >
                  Desayuno
                </Button>
                <Button
                  variant="light"
                  color="green"
                  leftSection={<IconSalad size={16} />}
                  onClick={() => addMeal('lunch')}
                >
                  Almuerzo
                </Button>
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<IconMeat size={16} />}
                  onClick={() => addMeal('dinner')}
                >
                  Cena
                </Button>
                <Button
                  variant="light"
                  color="grape"
                  leftSection={<IconCookie size={16} />}
                  onClick={() => addMeal('snack')}
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
        opened={foodModalOpened}
        onClose={closeFoodModal}
        title="Seleccionar Alimento"
        size="lg"
      >
        <TextInput
          placeholder="Buscar alimentos..."
          leftSection={<IconSearch size={16} />}
          mb="md"
          value={foodSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFoodSearch(e.target.value)}
        />
        <ScrollArea h={400}>
          <Stack gap="xs">
            {filteredFoods.map((food) => (
              <Card
                key={food.id}
                withBorder
                padding="sm"
                radius="md"
                style={{ cursor: 'pointer' }}
                onClick={() => addFoodToMeal(food)}
              >
                <Group justify="space-between">
                  <Box>
                    <Text fw={500} size="sm">{food.name}</Text>
                    <Group gap="xs">
                      <Badge size="xs" variant="light">{food.category}</Badge>
                      <Text size="xs" c="dimmed">{food.serving_size}</Text>
                    </Group>
                  </Box>
                  <Group gap="xs">
                    <Badge variant="light" color="blue">{food.calories} kcal</Badge>
                    <Badge variant="outline" size="xs">P: {food.protein}g</Badge>
                    <Badge variant="outline" size="xs">C: {food.carbs}g</Badge>
                    <Badge variant="outline" size="xs">G: {food.fat}g</Badge>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea>
      </Modal>

      {/* Shopping List Modal */}
      <Modal
        opened={shoppingListOpened}
        onClose={closeShoppingList}
        title="Lista de la Compra"
        size="md"
      >
        <ScrollArea h={400}>
          <Stack gap="xs">
            {generateShoppingList().map(({ food, totalQuantity }) => (
              <Card key={food.id} withBorder padding="sm" radius="md">
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
        <Button fullWidth mt="md" leftSection={<IconShoppingCart size={16} />}>
          Exportar Lista
        </Button>
      </Modal>
    </>
  )
}

