import { useState, useMemo, useCallback } from 'react'
import {
  Container,
  Paper,
  Group,
  Button,
  Modal,
  TextInput,
  Select,
  Stack,
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
  Textarea,
  Loader,
  Center,
  Pagination,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
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
  IconCheck,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'
import { MealPlanBuilder, DayPlan, Meal, Food } from '../../components/nutrition/MealPlanBuilder'
import { 
  useSupabaseFoods, 
  useSupabaseFoodsPaginated,
  useSupabaseFoodsCount,
  useSupabaseMealPlans,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useCreateFood,
  useDeleteFood,
} from '../../hooks/useSupabaseData'

// Función para mapear categoría de la BD a categoría del frontend
function mapCategory(dbCategory: string | null): string {
  if (!dbCategory) return 'Otros'
  const cat = dbCategory.toLowerCase()
  if (cat.includes('carne') || cat.includes('pollo') || cat.includes('pescado') || cat.includes('huevo') || cat.includes('protein')) return 'Proteínas'
  if (cat.includes('arroz') || cat.includes('pasta') || cat.includes('pan') || cat.includes('cereal') || cat.includes('patata') || cat.includes('carbohidrat')) return 'Carbohidratos'
  if (cat.includes('verdura') || cat.includes('vegetal') || cat.includes('ensalada') || cat.includes('hortaliza')) return 'Verduras'
  if (cat.includes('fruta') || cat.includes('fruit')) return 'Frutas'
  if (cat.includes('leche') || cat.includes('queso') || cat.includes('yogur') || cat.includes('lácteo') || cat.includes('dairy')) return 'Lácteos'
  if (cat.includes('aceite') || cat.includes('grasa') || cat.includes('mantequilla') || cat.includes('oil')) return 'Grasas'
  if (cat.includes('fruto seco') || cat.includes('almendra') || cat.includes('nuez') || cat.includes('nut')) return 'Frutos Secos'
  return 'Otros'
}

// Función para mapear categoría del frontend a la BD
function categoryToDb(category: string): string {
  const mapping: Record<string, string> = {
    'Proteínas': 'en:meats',
    'Carbohidratos': 'en:cereals-and-potatoes',
    'Verduras': 'en:vegetables',
    'Frutas': 'en:fruits',
    'Lácteos': 'en:dairies',
    'Grasas': 'en:fats',
    'Frutos Secos': 'en:nuts',
    'Otros': 'en:other',
  }
  return mapping[category] || category
}

const initialDays: DayPlan[] = [
  { id: 'day-1', day: 1, dayName: 'Lunes', meals: [] as Meal[], notes: '' },
  { id: 'day-2', day: 2, dayName: 'Martes', meals: [] as Meal[], notes: '' },
  { id: 'day-3', day: 3, dayName: 'Miércoles', meals: [] as Meal[], notes: '' },
  { id: 'day-4', day: 4, dayName: 'Jueves', meals: [] as Meal[], notes: '' },
  { id: 'day-5', day: 5, dayName: 'Viernes', meals: [] as Meal[], notes: '' },
  { id: 'day-6', day: 6, dayName: 'Sábado', meals: [] as Meal[], notes: '' },
  { id: 'day-7', day: 7, dayName: 'Domingo', meals: [] as Meal[], notes: '' },
]

const FOODS_PER_PAGE = 50

export function NutritionPage() {
  const [activeTab, setActiveTab] = useState<string | null>('plans')
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] = useDisclosure(false)
  const [builderOpened, { open: openBuilder, close: closeBuilder }] = useDisclosure(false)
  const [searchFood, setSearchFood] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchFood, 300)
  const [currentPage, setCurrentPage] = useState(1)
  const [mealPlanDays, setMealPlanDays] = useState(initialDays)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  
  // Cargar datos desde Supabase
  const { data: supabaseFoods } = useSupabaseFoods() // Para el MealPlanBuilder (todos los alimentos)
  const { data: paginatedFoods, isLoading: isLoadingPaginatedFoods, isFetching: isFetchingFoods } = useSupabaseFoodsPaginated(currentPage, FOODS_PER_PAGE, debouncedSearch)
  const { data: totalFoodsCount } = useSupabaseFoodsCount()
  const { data: supabaseMealPlans, isLoading: isLoadingPlans } = useSupabaseMealPlans()
  
  // Resetear página cuando cambia la búsqueda
  const handleSearchChange = useCallback((value: string) => {
    setSearchFood(value)
    setCurrentPage(1)
  }, [])
  
  // Mutations
  const createMealPlan = useCreateMealPlan()
  const updateMealPlan = useUpdateMealPlan()
  const deleteMealPlan = useDeleteMealPlan()
  const createFood = useCreateFood()
  const deleteFood = useDeleteFood()
  
  // Mapear los datos de Supabase al formato del frontend
  const foods: Food[] = useMemo(() => {
    if (!supabaseFoods) return []
    return supabaseFoods.map((food: any) => ({
      id: food.id,
      name: food.name || 'Sin nombre',
      calories: food.calories || 0,
      protein: food.protein_g || 0,
      carbs: food.carbs_g || 0,
      fat: food.fat_g || 0,
      serving_size: food.quantity || '100g',
      category: mapCategory(food.category),
    }))
  }, [supabaseFoods])

  // Mapear planes nutricionales
  const mealPlans = useMemo(() => {
    if (!supabaseMealPlans) return []
    return supabaseMealPlans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      duration_days: plan.duration_days || 7,
      target_calories: plan.target_calories || 2000,
      target_protein: plan.target_protein || 150,
      target_carbs: plan.target_carbs || 200,
      target_fat: plan.target_fat || 70,
      dietary_tags: plan.dietary_tags || [],
      plan: plan.plan || { days: [] },
      client_name: plan.clients 
        ? `${plan.clients.first_name} ${plan.clients.last_name}`
        : null,
    }))
  }, [supabaseMealPlans])
  
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
      dietary_tags: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })
  
  const handleCreateFood = async (values: typeof foodForm.values) => {
    try {
      await createFood.mutateAsync({
        name: values.name,
        category: categoryToDb(values.category),
        calories: values.calories,
        protein_g: values.protein,
        carbs_g: values.carbs,
        fat_g: values.fat,
        quantity: values.serving_size,
      })
      notifications.show({
        title: 'Alimento creado',
        message: `${values.name} se ha añadido a tu biblioteca`,
        color: 'green',
        icon: <IconCheck size={16} />,
      })
      closeFoodModal()
      foodForm.reset()
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo crear el alimento',
        color: 'red',
      })
    }
  }

  const handleDeleteFood = async (foodId: string, foodName: string) => {
    try {
      await deleteFood.mutateAsync(foodId)
      notifications.show({
        title: 'Alimento eliminado',
        message: `${foodName} se ha eliminado de tu biblioteca`,
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo eliminar el alimento',
        color: 'red',
      })
    }
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
        dietary_tags: plan.dietary_tags || [],
      })
      // Cargar los días del plan si existen
      if (plan.plan?.days?.length > 0) {
        setMealPlanDays(plan.plan.days)
      } else {
        setMealPlanDays(initialDays)
      }
    } else {
      setEditingPlan(null)
      setMealPlanDays(initialDays)
      planForm.reset()
    }
    openBuilder()
  }

  const handleSavePlan = async () => {
    const values = planForm.values
    if (!values.name) return

    try {
      const planData = {
        name: values.name,
        description: values.description,
        duration_days: values.duration_days,
        target_calories: values.target_calories,
        target_protein: values.target_protein,
        target_carbs: values.target_carbs,
        target_fat: values.target_fat,
        dietary_tags: values.dietary_tags,
        plan: { days: mealPlanDays },
        is_template: true,
      }

      if (editingPlan) {
        await updateMealPlan.mutateAsync({ id: editingPlan.id, ...planData })
        notifications.show({
          title: 'Plan actualizado',
          message: `${values.name} se ha actualizado correctamente`,
          color: 'green',
          icon: <IconCheck size={16} />,
        })
      } else {
        await createMealPlan.mutateAsync(planData)
        notifications.show({
          title: 'Plan creado',
          message: `${values.name} se ha creado correctamente`,
          color: 'green',
          icon: <IconCheck size={16} />,
        })
      }

      closeBuilder()
      planForm.reset()
      setMealPlanDays(initialDays)
      setEditingPlan(null)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo guardar el plan',
        color: 'red',
      })
    }
  }

  const handleDeletePlan = async (planId: string, planName: string) => {
    try {
      await deleteMealPlan.mutateAsync(planId)
      notifications.show({
        title: 'Plan eliminado',
        message: `${planName} se ha eliminado correctamente`,
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo eliminar el plan',
        color: 'red',
      })
    }
  }

  const handleDuplicatePlan = async (plan: any) => {
    try {
      await createMealPlan.mutateAsync({
        name: `${plan.name} (copia)`,
        description: plan.description,
        duration_days: plan.duration_days,
        target_calories: plan.target_calories,
        target_protein: plan.target_protein,
        target_carbs: plan.target_carbs,
        target_fat: plan.target_fat,
        dietary_tags: plan.dietary_tags,
        plan: plan.plan,
        is_template: true,
      })
      notifications.show({
        title: 'Plan duplicado',
        message: `Se ha creado una copia de ${plan.name}`,
        color: 'green',
        icon: <IconCheck size={16} />,
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo duplicar el plan',
        color: 'red',
      })
    }
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
      case 'Frutos Secos': return 'teal'
      default: return 'gray'
    }
  }

  // Mapear alimentos paginados para la vista
  const paginatedFoodsList: Food[] = useMemo(() => {
    if (!paginatedFoods?.items) return []
    return paginatedFoods.items.map((food: any) => ({
      id: food.id,
      name: food.name || 'Sin nombre',
      calories: food.calories || 0,
      protein: food.protein_g || 0,
      carbs: food.carbs_g || 0,
      fat: food.fat_g || 0,
      serving_size: food.quantity || '100g',
      category: mapCategory(food.category),
    }))
  }, [paginatedFoods])
  
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
            Planes Nutricionales {mealPlans.length > 0 && <Badge size="xs" ml="xs">{mealPlans.length}</Badge>}
          </Tabs.Tab>
          <Tabs.Tab value="foods" leftSection={<IconApple size={14} />}>
            Biblioteca de Alimentos {(totalFoodsCount ?? 0) > 0 && <Badge size="xs" ml="xs">{totalFoodsCount?.toLocaleString()}</Badge>}
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="plans">
          {isLoadingPlans ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : mealPlans.length > 0 ? (
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

                  {plan.client_name && (
                    <Badge size="sm" variant="outline" color="blue" mt="sm">
                      Asignado a: {plan.client_name}
                    </Badge>
                  )}

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
                    {plan.dietary_tags?.slice(0, 2).map((tag: string) => (
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
                    <ActionIcon 
                      variant="light" 
                      color="gray"
                      onClick={() => handleDuplicatePlan(plan)}
                      loading={createMealPlan.isPending}
                    >
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="light" 
                      color="red"
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      loading={deleteMealPlan.isPending}
                    >
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
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          
          {isLoadingPaginatedFoods ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : paginatedFoodsList.length > 0 ? (
            <>
              {/* Info de resultados */}
              <Group justify="space-between" mb="md">
                <Text size="sm" c="dimmed">
                  Mostrando {((currentPage - 1) * FOODS_PER_PAGE) + 1} - {Math.min(currentPage * FOODS_PER_PAGE, paginatedFoods?.total || 0)} de {paginatedFoods?.total?.toLocaleString()} alimentos
                  {debouncedSearch && ` (filtrado por "${debouncedSearch}")`}
                </Text>
                {isFetchingFoods && <Loader size="xs" />}
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
                {paginatedFoodsList.map((food) => {
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
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleDeleteFood(food.id, food.name)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>

                      <Divider mb="sm" />

                      <Group justify="space-between" mb="xs">
                        <Text size="xs" c="dimmed">Por {food.serving_size}</Text>
                        <Badge variant="filled" color="blue">{food.calories?.toFixed(0) || 0} kcal</Badge>
                      </Group>

                      <SimpleGrid cols={3} spacing="xs">
                        <Box ta="center">
                          <Text size="xs" c="dimmed">Proteína</Text>
                          <Text size="sm" fw={500} c="green">{food.protein?.toFixed(1) || 0}g</Text>
                        </Box>
                        <Box ta="center">
                          <Text size="xs" c="dimmed">Carbos</Text>
                          <Text size="sm" fw={500} c="orange">{food.carbs?.toFixed(1) || 0}g</Text>
                        </Box>
                        <Box ta="center">
                          <Text size="xs" c="dimmed">Grasas</Text>
                          <Text size="sm" fw={500} c="grape">{food.fat?.toFixed(1) || 0}g</Text>
                        </Box>
                      </SimpleGrid>
                    </Card>
                  )
                })}
              </SimpleGrid>

              {/* Paginación */}
              {(paginatedFoods?.totalPages || 0) > 1 && (
                <Center mt="xl">
                  <Pagination
                    total={paginatedFoods?.totalPages || 1}
                    value={currentPage}
                    onChange={setCurrentPage}
                    withEdges
                    siblings={1}
                    boundaries={1}
                  />
                </Center>
              )}
            </>
          ) : debouncedSearch ? (
            <EmptyState
              icon={<IconSearch size={40} />}
              title="Sin resultados"
              description={`No se encontraron alimentos que coincidan con "${debouncedSearch}"`}
              actionLabel="Limpiar búsqueda"
              onAction={() => handleSearchChange('')}
            />
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
                decimalScale={1}
                {...foodForm.getInputProps('protein')}
              />
              <NumberInput
                label="Carbohidratos (g)"
                placeholder="0"
                min={0}
                decimalScale={1}
                {...foodForm.getInputProps('carbs')}
              />
              <NumberInput
                label="Grasas (g)"
                placeholder="0"
                min={0}
                decimalScale={1}
                {...foodForm.getInputProps('fat')}
              />
            </Group>
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeFoodModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={createFood.isPending}>
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
              availableFoods={foods}
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
          <Button 
            onClick={handleSavePlan}
            loading={createMealPlan.isPending || updateMealPlan.isPending}
          >
            {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
          </Button>
        </Group>
      </Drawer>
    </Container>
  )
}

export default NutritionPage
