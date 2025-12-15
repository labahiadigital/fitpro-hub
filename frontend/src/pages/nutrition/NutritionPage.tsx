import { useState } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  Modal,
  TextInput,
  Select,
  Stack,
  Textarea,
  Tabs,
  Box,
  Text,
  Badge,
  Card,
  ActionIcon,
  SimpleGrid,
  NumberInput,
  Drawer,
  ScrollArea,
  Divider,
  ThemeIcon,
  Progress,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconApple,
  IconTemplate,
  IconSearch,
  IconEdit,
  IconTrash,
  IconCopy,
  IconEye,
  IconSalad,
  IconMeat,
  IconBread,
  IconMilk,
  IconEgg,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'
import { MealPlanBuilder } from '../../components/nutrition/MealPlanBuilder'

// Mock foods data
const mockFoods = [
  { id: '1', name: 'Pechuga de Pollo', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: '100g', category: 'Proteínas' },
  { id: '2', name: 'Arroz Integral', calories: 112, protein: 2.6, carbs: 23, fat: 0.9, serving_size: '100g', category: 'Carbohidratos' },
  { id: '3', name: 'Brócoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, serving_size: '100g', category: 'Verduras' },
  { id: '4', name: 'Huevos', calories: 155, protein: 13, carbs: 1.1, fat: 11, serving_size: '2 unidades', category: 'Proteínas' },
  { id: '5', name: 'Avena', calories: 389, protein: 17, carbs: 66, fat: 7, serving_size: '100g', category: 'Carbohidratos' },
  { id: '6', name: 'Salmón', calories: 208, protein: 20, carbs: 0, fat: 13, serving_size: '100g', category: 'Proteínas' },
  { id: '7', name: 'Aguacate', calories: 160, protein: 2, carbs: 9, fat: 15, serving_size: '100g', category: 'Grasas' },
  { id: '8', name: 'Plátano', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, serving_size: '1 unidad', category: 'Frutas' },
  { id: '9', name: 'Yogur Griego', calories: 97, protein: 9, carbs: 3.6, fat: 5, serving_size: '100g', category: 'Lácteos' },
  { id: '10', name: 'Almendras', calories: 579, protein: 21, carbs: 22, fat: 50, serving_size: '100g', category: 'Frutos Secos' },
  { id: '11', name: 'Batata', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, serving_size: '100g', category: 'Carbohidratos' },
  { id: '12', name: 'Espinacas', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, serving_size: '100g', category: 'Verduras' },
]

// Mock meal plans
const mockMealPlans = [
  {
    id: '1',
    name: 'Plan Pérdida de Peso',
    description: 'Plan nutricional diseñado para déficit calórico controlado',
    duration_days: 7,
    target_calories: 1800,
    target_protein: 140,
    target_carbs: 180,
    target_fat: 60,
    tags: ['déficit', 'proteína alta'],
  },
  {
    id: '2',
    name: 'Plan Ganancia Muscular',
    description: 'Plan con superávit calórico para hipertrofia',
    duration_days: 7,
    target_calories: 2800,
    target_protein: 180,
    target_carbs: 320,
    target_fat: 90,
    tags: ['superávit', 'masa muscular'],
  },
]

const initialDays = [
  { id: 'day-1', day: 1, dayName: 'Lunes', meals: [], notes: '' },
  { id: 'day-2', day: 2, dayName: 'Martes', meals: [], notes: '' },
  { id: 'day-3', day: 3, dayName: 'Miércoles', meals: [], notes: '' },
  { id: 'day-4', day: 4, dayName: 'Jueves', meals: [], notes: '' },
  { id: 'day-5', day: 5, dayName: 'Viernes', meals: [], notes: '' },
  { id: 'day-6', day: 6, dayName: 'Sábado', meals: [], notes: '' },
  { id: 'day-7', day: 7, dayName: 'Domingo', meals: [], notes: '' },
]

export function NutritionPage() {
  const [activeTab, setActiveTab] = useState<string | null>('plans')
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] = useDisclosure(false)
  const [builderOpened, { open: openBuilder, close: closeBuilder }] = useDisclosure(false)
  const [searchFood, setSearchFood] = useState('')
  const [mealPlanDays, setMealPlanDays] = useState(initialDays)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [mealPlans, setMealPlans] = useState(mockMealPlans)
  
  const foodForm = useForm({
    initialValues: {
      name: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      serving_size: '100g',
      category: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })
  
  const planForm = useForm({
    initialValues: {
      name: '',
      description: '',
      duration_days: 7,
      target_calories: 2000,
      target_protein: 150,
      target_carbs: 200,
      target_fat: 70,
      tags: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })
  
  const handleCreateFood = async (values: typeof foodForm.values) => {
    console.log('Creating food:', values)
    closeFoodModal()
    foodForm.reset()
  }

  const openPlanBuilder = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan)
      planForm.setValues({
        name: plan.name,
        description: plan.description || '',
        duration_days: plan.duration_days,
        target_calories: plan.target_calories,
        target_protein: plan.target_protein,
        target_carbs: plan.target_carbs,
        target_fat: plan.target_fat,
        tags: plan.tags || [],
      })
    } else {
      setEditingPlan(null)
      setMealPlanDays(initialDays)
      planForm.reset()
    }
    openBuilder()
  }

  const handleSavePlan = () => {
    const values = planForm.values
    if (!values.name) return

    const newPlan = {
      id: editingPlan?.id || `plan-${Date.now()}`,
      ...values,
      days: mealPlanDays,
    }

    if (editingPlan) {
      setMealPlans(plans => plans.map(p => p.id === editingPlan.id ? newPlan : p))
    } else {
      setMealPlans(plans => [...plans, newPlan])
    }

    closeBuilder()
    planForm.reset()
    setMealPlanDays(initialDays)
    setEditingPlan(null)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Proteínas': return IconMeat
      case 'Carbohidratos': return IconBread
      case 'Verduras': return IconSalad
      case 'Frutas': return IconApple
      case 'Lácteos': return IconMilk
      case 'Grasas': return IconEgg
      default: return IconApple
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Proteínas': return 'red'
      case 'Carbohidratos': return 'orange'
      case 'Verduras': return 'green'
      case 'Frutas': return 'yellow'
      case 'Lácteos': return 'blue'
      case 'Grasas': return 'grape'
      default: return 'gray'
    }
  }

  const filteredFoods = mockFoods.filter(f =>
    f.name.toLowerCase().includes(searchFood.toLowerCase()) ||
    f.category.toLowerCase().includes(searchFood.toLowerCase())
  )
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Nutrición"
        description="Gestiona planes nutricionales y alimentos"
        action={{
          label: activeTab === 'foods' ? 'Nuevo Alimento' : 'Nuevo Plan',
          onClick: activeTab === 'foods' ? openFoodModal : () => openPlanBuilder(),
        }}
      />
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="plans" leftSection={<IconTemplate size={14} />}>
            Planes Nutricionales
          </Tabs.Tab>
          <Tabs.Tab value="foods" leftSection={<IconApple size={14} />}>
            Biblioteca de Alimentos
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="plans">
          {mealPlans.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {mealPlans.map((plan) => (
                <Card key={plan.id} withBorder radius="lg" padding="lg">
                  <Card.Section withBorder inheritPadding py="sm">
                    <Group justify="space-between">
                      <Text fw={600}>{plan.name}</Text>
                      <Badge color="green" variant="light">
                        {plan.duration_days} días
                      </Badge>
                    </Group>
                  </Card.Section>
                  
                  <Text size="sm" c="dimmed" mt="md" lineClamp={2}>
                    {plan.description || 'Sin descripción'}
                  </Text>

                  <Stack gap="xs" mt="md">
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Calorías objetivo</Text>
                      <Text size="xs" fw={500}>{plan.target_calories} kcal</Text>
                    </Group>
                    <Group gap="xs">
                      <Badge size="xs" variant="light" color="green">P: {plan.target_protein}g</Badge>
                      <Badge size="xs" variant="light" color="orange">C: {plan.target_carbs}g</Badge>
                      <Badge size="xs" variant="light" color="grape">G: {plan.target_fat}g</Badge>
                    </Group>
                  </Stack>
                  
                  <Group gap="xs" mt="md">
                    {plan.tags?.slice(0, 2).map((tag: string) => (
                      <Badge key={tag} size="sm" variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                  
                  <Group mt="md" gap="xs">
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconEdit size={14} />}
                      flex={1}
                      onClick={() => openPlanBuilder(plan)}
                    >
                      Editar
                    </Button>
                    <ActionIcon variant="light" color="blue">
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="gray">
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="red">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              icon={<IconTemplate size={40} />}
              title="No hay planes nutricionales"
              description="Crea tu primer plan nutricional para asignarlo a tus clientes."
              actionLabel="Crear Plan"
              onAction={() => openPlanBuilder()}
            />
          )}
        </Tabs.Panel>
        
        <Tabs.Panel value="foods">
          <TextInput
            placeholder="Buscar alimentos..."
            leftSection={<IconSearch size={16} />}
            mb="lg"
            value={searchFood}
            onChange={(e) => setSearchFood(e.target.value)}
          />
          
          {filteredFoods.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {filteredFoods.map((food) => {
                const CategoryIcon = getCategoryIcon(food.category)
                return (
                  <Card key={food.id} withBorder radius="md" padding="sm">
                    <Group gap="sm" mb="sm">
                      <ThemeIcon
                        size="lg"
                        radius="md"
                        variant="light"
                        color={getCategoryColor(food.category)}
                      >
                        <CategoryIcon size={18} />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text fw={600} size="sm" lineClamp={1}>
                          {food.name}
                        </Text>
                        <Badge size="xs" variant="light" color={getCategoryColor(food.category)}>
                          {food.category}
                        </Badge>
                      </Box>
                    </Group>

                    <Divider mb="sm" />

                    <Group justify="space-between" mb="xs">
                      <Text size="xs" c="dimmed">Por {food.serving_size}</Text>
                      <Badge variant="filled" color="blue">{food.calories} kcal</Badge>
                    </Group>

                    <SimpleGrid cols={3} spacing="xs">
                      <Box ta="center">
                        <Text size="xs" c="dimmed">Proteína</Text>
                        <Text size="sm" fw={500} c="green">{food.protein}g</Text>
                      </Box>
                      <Box ta="center">
                        <Text size="xs" c="dimmed">Carbos</Text>
                        <Text size="sm" fw={500} c="orange">{food.carbs}g</Text>
                      </Box>
                      <Box ta="center">
                        <Text size="xs" c="dimmed">Grasas</Text>
                        <Text size="sm" fw={500} c="grape">{food.fat}g</Text>
                      </Box>
                    </SimpleGrid>
                  </Card>
                )
              })}
            </SimpleGrid>
          ) : (
            <EmptyState
              icon={<IconApple size={40} />}
              title="No hay alimentos"
              description="Añade alimentos a tu biblioteca para usarlos en tus planes."
              actionLabel="Añadir Alimento"
              onAction={openFoodModal}
            />
          )}
        </Tabs.Panel>
      </Tabs>
      
      {/* Modal para crear alimento */}
      <Modal
        opened={foodModalOpened}
        onClose={closeFoodModal}
        title="Nuevo Alimento"
        size="md"
      >
        <form onSubmit={foodForm.onSubmit(handleCreateFood)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Pechuga de Pollo"
              required
              {...foodForm.getInputProps('name')}
            />
            
            <Group grow>
              <Select
                label="Categoría"
                placeholder="Selecciona"
                data={[
                  { value: 'Proteínas', label: 'Proteínas' },
                  { value: 'Carbohidratos', label: 'Carbohidratos' },
                  { value: 'Verduras', label: 'Verduras' },
                  { value: 'Frutas', label: 'Frutas' },
                  { value: 'Lácteos', label: 'Lácteos' },
                  { value: 'Grasas', label: 'Grasas' },
                  { value: 'Frutos Secos', label: 'Frutos Secos' },
                ]}
                {...foodForm.getInputProps('category')}
              />
              <TextInput
                label="Porción"
                placeholder="100g"
                {...foodForm.getInputProps('serving_size')}
              />
            </Group>
            
            <NumberInput
              label="Calorías"
              placeholder="0"
              min={0}
              {...foodForm.getInputProps('calories')}
            />
            
            <Group grow>
              <NumberInput
                label="Proteína (g)"
                placeholder="0"
                min={0}
                {...foodForm.getInputProps('protein')}
              />
              <NumberInput
                label="Carbohidratos (g)"
                placeholder="0"
                min={0}
                {...foodForm.getInputProps('carbs')}
              />
              <NumberInput
                label="Grasas (g)"
                placeholder="0"
                min={0}
                {...foodForm.getInputProps('fat')}
              />
            </Group>
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeFoodModal}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Alimento
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      
      {/* Drawer para el constructor de planes */}
      <Drawer
        opened={builderOpened}
        onClose={closeBuilder}
        title={editingPlan ? 'Editar Plan Nutricional' : 'Nuevo Plan Nutricional'}
        size="xl"
        position="right"
      >
        <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
          <Stack>
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <TextInput
                  label="Nombre del plan"
                  placeholder="Plan de Pérdida de Peso"
                  required
                  {...planForm.getInputProps('name')}
                />
                
                <Textarea
                  label="Descripción"
                  placeholder="Describe el plan..."
                  minRows={2}
                  {...planForm.getInputProps('description')}
                />
                
                <Group grow>
                  <NumberInput
                    label="Duración (días)"
                    min={1}
                    max={30}
                    {...planForm.getInputProps('duration_days')}
                  />
                  <NumberInput
                    label="Calorías objetivo"
                    min={1000}
                    max={5000}
                    step={50}
                    {...planForm.getInputProps('target_calories')}
                  />
                </Group>

                <Group grow>
                  <NumberInput
                    label="Proteína (g)"
                    min={0}
                    max={500}
                    {...planForm.getInputProps('target_protein')}
                  />
                  <NumberInput
                    label="Carbohidratos (g)"
                    min={0}
                    max={500}
                    {...planForm.getInputProps('target_carbs')}
                  />
                  <NumberInput
                    label="Grasas (g)"
                    min={0}
                    max={300}
                    {...planForm.getInputProps('target_fat')}
                  />
                </Group>
              </Stack>
            </Paper>

            <Divider label="Constructor de Plan" labelPosition="center" />

            <MealPlanBuilder
              days={mealPlanDays}
              onChange={setMealPlanDays}
              availableFoods={mockFoods}
              targetCalories={planForm.values.target_calories}
              targetProtein={planForm.values.target_protein}
              targetCarbs={planForm.values.target_carbs}
              targetFat={planForm.values.target_fat}
            />
          </Stack>
        </ScrollArea>

        <Group justify="flex-end" mt="md" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Button variant="default" onClick={closeBuilder}>
            Cancelar
          </Button>
          <Button onClick={handleSavePlan}>
            {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
          </Button>
        </Group>
      </Drawer>
    </Container>
  )
}

export default NutritionPage
