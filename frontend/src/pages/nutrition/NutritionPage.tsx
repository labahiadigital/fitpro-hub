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
  SimpleGrid,
  NumberInput,
  MultiSelect,
  Progress,
  ThemeIcon,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconSalad,
  IconApple,
  IconSearch,
  IconEdit,
  IconTrash,
  IconFlame,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'

export function NutritionPage() {
  const [activeTab, setActiveTab] = useState<string | null>('plans')
  const [planModalOpened, { open: openPlanModal, close: closePlanModal }] = useDisclosure(false)
  const [foodModalOpened, { open: openFoodModal, close: closeFoodModal }] = useDisclosure(false)
  const [searchFood, setSearchFood] = useState('')
  
  // Mock data - en producción vendría de hooks
  const mealPlans = [
    {
      id: '1',
      name: 'Plan Déficit Calórico',
      description: 'Plan para pérdida de peso con déficit moderado',
      target_calories: 1800,
      target_protein: 150,
      target_carbs: 180,
      target_fat: 60,
      dietary_tags: ['bajo en carbohidratos', 'alto en proteína'],
      clients_count: 5,
    },
    {
      id: '2',
      name: 'Plan Volumen',
      description: 'Plan hipercalórico para ganancia muscular',
      target_calories: 3000,
      target_protein: 180,
      target_carbs: 350,
      target_fat: 90,
      dietary_tags: ['alto en carbohidratos', 'alto en proteína'],
      clients_count: 3,
    },
  ]
  
  const foods = [
    { id: '1', name: 'Pechuga de Pollo', category: 'proteínas', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
    { id: '2', name: 'Arroz Integral', category: 'carbohidratos', calories: 111, protein_g: 2.6, carbs_g: 23, fat_g: 0.9 },
    { id: '3', name: 'Brócoli', category: 'verduras', calories: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4 },
    { id: '4', name: 'Aguacate', category: 'grasas', calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15 },
    { id: '5', name: 'Huevo Entero', category: 'proteínas', calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11 },
    { id: '6', name: 'Avena', category: 'carbohidratos', calories: 389, protein_g: 17, carbs_g: 66, fat_g: 7 },
  ]
  
  const planForm = useForm({
    initialValues: {
      name: '',
      description: '',
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
  
  const foodForm = useForm({
    initialValues: {
      name: '',
      category: '',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      serving_size: 100,
      serving_unit: 'g',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })
  
  const handleCreatePlan = async (values: typeof planForm.values) => {
    console.log('Create plan:', values)
    closePlanModal()
    planForm.reset()
  }
  
  const handleCreateFood = async (values: typeof foodForm.values) => {
    console.log('Create food:', values)
    closeFoodModal()
    foodForm.reset()
  }
  
  const getMacroColor = (macro: string) => {
    switch (macro) {
      case 'protein': return 'red'
      case 'carbs': return 'blue'
      case 'fat': return 'yellow'
      default: return 'gray'
    }
  }
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Nutrición"
        description="Gestiona planes de alimentación y base de datos de alimentos"
        action={{
          label: activeTab === 'foods' ? 'Nuevo Alimento' : 'Nuevo Plan',
          onClick: activeTab === 'foods' ? openFoodModal : openPlanModal,
        }}
      />
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="plans" leftSection={<IconSalad size={14} />}>
            Planes de Nutrición
          </Tabs.Tab>
          <Tabs.Tab value="foods" leftSection={<IconApple size={14} />}>
            Base de Alimentos
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="plans">
          {mealPlans.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {mealPlans.map((plan) => (
                <Card key={plan.id} withBorder radius="lg" padding="lg">
                  <Group justify="space-between" mb="md">
                    <Box>
                      <Text fw={600}>{plan.name}</Text>
                      <Text size="xs" c="dimmed">
                        {plan.clients_count} clientes asignados
                      </Text>
                    </Box>
                    <ThemeIcon size="lg" radius="xl" color="primary" variant="light">
                      <IconFlame size={18} />
                    </ThemeIcon>
                  </Group>
                  
                  <Text size="sm" c="dimmed" lineClamp={2} mb="md">
                    {plan.description}
                  </Text>
                  
                  {/* Macros */}
                  <Box mb="md">
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" fw={500}>Calorías objetivo</Text>
                      <Text size="xs" fw={600}>{plan.target_calories} kcal</Text>
                    </Group>
                    
                    <Stack gap={8}>
                      <Box>
                        <Group justify="space-between" mb={2}>
                          <Text size="xs" c="dimmed">Proteína</Text>
                          <Text size="xs">{plan.target_protein}g</Text>
                        </Group>
                        <Progress value={(plan.target_protein * 4 / plan.target_calories) * 100} size="xs" color="red" />
                      </Box>
                      <Box>
                        <Group justify="space-between" mb={2}>
                          <Text size="xs" c="dimmed">Carbohidratos</Text>
                          <Text size="xs">{plan.target_carbs}g</Text>
                        </Group>
                        <Progress value={(plan.target_carbs * 4 / plan.target_calories) * 100} size="xs" color="blue" />
                      </Box>
                      <Box>
                        <Group justify="space-between" mb={2}>
                          <Text size="xs" c="dimmed">Grasas</Text>
                          <Text size="xs">{plan.target_fat}g</Text>
                        </Group>
                        <Progress value={(plan.target_fat * 9 / plan.target_calories) * 100} size="xs" color="yellow" />
                      </Box>
                    </Stack>
                  </Box>
                  
                  <Group gap="xs" mb="md">
                    {plan.dietary_tags.map((tag) => (
                      <Badge key={tag} size="xs" variant="light">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                  
                  <Group gap="xs">
                    <Button variant="light" size="xs" flex={1} leftSection={<IconEdit size={14} />}>
                      Editar
                    </Button>
                    <Button variant="light" size="xs" color="red" leftSection={<IconTrash size={14} />}>
                      Eliminar
                    </Button>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState
              icon={<IconSalad size={40} />}
              title="No hay planes de nutrición"
              description="Crea tu primer plan de nutrición para asignarlo a tus clientes."
              actionLabel="Crear Plan"
              onAction={openPlanModal}
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
          
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
            {foods
              .filter((f) => f.name.toLowerCase().includes(searchFood.toLowerCase()))
              .map((food) => (
                <Card key={food.id} withBorder radius="md" padding="sm">
                  <Group justify="space-between" mb="xs">
                    <Text fw={500} size="sm">{food.name}</Text>
                    <Badge size="xs" variant="light">
                      {food.category}
                    </Badge>
                  </Group>
                  
                  <Group justify="center" my="sm">
                    <Box ta="center">
                      <Text size="xl" fw={700} c="primary">
                        {food.calories}
                      </Text>
                      <Text size="xs" c="dimmed">kcal</Text>
                    </Box>
                  </Group>
                  
                  <Group grow gap={4}>
                    <Box ta="center" p={4} style={{ background: 'var(--mantine-color-red-0)', borderRadius: 4 }}>
                      <Text size="xs" fw={600} c="red">{food.protein_g}g</Text>
                      <Text size="xs" c="dimmed">Prot</Text>
                    </Box>
                    <Box ta="center" p={4} style={{ background: 'var(--mantine-color-blue-0)', borderRadius: 4 }}>
                      <Text size="xs" fw={600} c="blue">{food.carbs_g}g</Text>
                      <Text size="xs" c="dimmed">Carbs</Text>
                    </Box>
                    <Box ta="center" p={4} style={{ background: 'var(--mantine-color-yellow-0)', borderRadius: 4 }}>
                      <Text size="xs" fw={600} c="yellow.8">{food.fat_g}g</Text>
                      <Text size="xs" c="dimmed">Grasas</Text>
                    </Box>
                  </Group>
                  
                  <Text size="xs" c="dimmed" ta="center" mt="xs">
                    por 100g
                  </Text>
                </Card>
              ))}
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
      
      {/* Modal para crear plan */}
      <Modal
        opened={planModalOpened}
        onClose={closePlanModal}
        title="Nuevo Plan de Nutrición"
        size="lg"
      >
        <form onSubmit={planForm.onSubmit(handleCreatePlan)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Plan de Definición"
              required
              {...planForm.getInputProps('name')}
            />
            
            <Textarea
              label="Descripción"
              placeholder="Describe el plan..."
              minRows={2}
              {...planForm.getInputProps('description')}
            />
            
            <NumberInput
              label="Calorías objetivo"
              suffix=" kcal"
              min={1000}
              max={5000}
              {...planForm.getInputProps('target_calories')}
            />
            
            <Group grow>
              <NumberInput
                label="Proteína (g)"
                min={0}
                {...planForm.getInputProps('target_protein')}
              />
              <NumberInput
                label="Carbohidratos (g)"
                min={0}
                {...planForm.getInputProps('target_carbs')}
              />
              <NumberInput
                label="Grasas (g)"
                min={0}
                {...planForm.getInputProps('target_fat')}
              />
            </Group>
            
            <MultiSelect
              label="Etiquetas dietéticas"
              placeholder="Selecciona"
              data={[
                { value: 'vegetariano', label: 'Vegetariano' },
                { value: 'vegano', label: 'Vegano' },
                { value: 'sin gluten', label: 'Sin Gluten' },
                { value: 'sin lactosa', label: 'Sin Lactosa' },
                { value: 'bajo en carbohidratos', label: 'Bajo en Carbohidratos' },
                { value: 'alto en proteína', label: 'Alto en Proteína' },
                { value: 'keto', label: 'Keto' },
              ]}
              searchable
              {...planForm.getInputProps('dietary_tags')}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closePlanModal}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Plan
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      
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
            
            <Select
              label="Categoría"
              placeholder="Selecciona"
              data={[
                { value: 'proteínas', label: 'Proteínas' },
                { value: 'carbohidratos', label: 'Carbohidratos' },
                { value: 'verduras', label: 'Verduras' },
                { value: 'frutas', label: 'Frutas' },
                { value: 'grasas', label: 'Grasas' },
                { value: 'lácteos', label: 'Lácteos' },
              ]}
              {...foodForm.getInputProps('category')}
            />
            
            <NumberInput
              label="Calorías"
              suffix=" kcal"
              min={0}
              {...foodForm.getInputProps('calories')}
            />
            
            <Group grow>
              <NumberInput
                label="Proteína (g)"
                min={0}
                decimalScale={1}
                {...foodForm.getInputProps('protein_g')}
              />
              <NumberInput
                label="Carbohidratos (g)"
                min={0}
                decimalScale={1}
                {...foodForm.getInputProps('carbs_g')}
              />
              <NumberInput
                label="Grasas (g)"
                min={0}
                decimalScale={1}
                {...foodForm.getInputProps('fat_g')}
              />
            </Group>
            
            <Group grow>
              <NumberInput
                label="Tamaño porción"
                min={1}
                {...foodForm.getInputProps('serving_size')}
              />
              <Select
                label="Unidad"
                data={[
                  { value: 'g', label: 'Gramos (g)' },
                  { value: 'ml', label: 'Mililitros (ml)' },
                  { value: 'unidad', label: 'Unidad' },
                ]}
                {...foodForm.getInputProps('serving_unit')}
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
    </Container>
  )
}
