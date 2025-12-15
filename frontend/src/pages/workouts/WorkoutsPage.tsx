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
  MultiSelect,
  NumberInput,
  Drawer,
  ScrollArea,
  Divider,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBarbell,
  IconTemplate,
  IconSearch,
  IconEdit,
  IconTrash,
  IconCopy,
  IconEye,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'
import { WorkoutBuilder } from '../../components/workouts/WorkoutBuilder'
import {
  useExercises,
  useWorkoutPrograms,
  useCreateExercise,
  useCreateWorkoutProgram,
} from '../../hooks/useWorkouts'

// Mock exercises data
const mockExercises = [
  { id: '1', name: 'Press de Banca', muscle_groups: ['pecho', 'tríceps'], equipment: ['barra', 'banco'], image_url: '' },
  { id: '2', name: 'Sentadilla', muscle_groups: ['cuádriceps', 'glúteos'], equipment: ['barra'], image_url: '' },
  { id: '3', name: 'Peso Muerto', muscle_groups: ['espalda', 'isquiotibiales'], equipment: ['barra'], image_url: '' },
  { id: '4', name: 'Dominadas', muscle_groups: ['espalda', 'bíceps'], equipment: ['barra de dominadas'], image_url: '' },
  { id: '5', name: 'Press Militar', muscle_groups: ['hombros', 'tríceps'], equipment: ['barra'], image_url: '' },
  { id: '6', name: 'Curl de Bíceps', muscle_groups: ['bíceps'], equipment: ['mancuernas'], image_url: '' },
  { id: '7', name: 'Extensión de Tríceps', muscle_groups: ['tríceps'], equipment: ['mancuernas'], image_url: '' },
  { id: '8', name: 'Zancadas', muscle_groups: ['cuádriceps', 'glúteos'], equipment: ['mancuernas'], image_url: '' },
  { id: '9', name: 'Plancha', muscle_groups: ['core'], equipment: ['ninguno'], image_url: '' },
  { id: '10', name: 'Remo con Barra', muscle_groups: ['espalda', 'bíceps'], equipment: ['barra'], image_url: '' },
]

export function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('programs')
  const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
  useDisclosure(false)
  const [builderOpened, { open: openBuilder, close: closeBuilder }] = useDisclosure(false)
  const [searchExercise, setSearchExercise] = useState('')
  const [workoutBlocks, setWorkoutBlocks] = useState<any[]>([])
  const [editingProgram, setEditingProgram] = useState<any>(null)
  
  const { data: exercises = mockExercises, isLoading: loadingExercises } = useExercises({ search: searchExercise })
  const { data: programs, isLoading: loadingPrograms } = useWorkoutPrograms(true)
  const createExercise = useCreateExercise()
  const createProgram = useCreateWorkoutProgram()
  
  const exerciseForm = useForm({
    initialValues: {
      name: '',
      description: '',
      instructions: '',
      muscle_groups: [] as string[],
      equipment: [] as string[],
      difficulty: 'intermediate',
      category: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })
  
  const programForm = useForm({
    initialValues: {
      name: '',
      description: '',
      duration_weeks: 4,
      difficulty: 'intermediate',
      tags: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
    },
  })
  
  const handleCreateExercise = async (values: typeof exerciseForm.values) => {
    try {
      await createExercise.mutateAsync(values)
      closeExerciseModal()
      exerciseForm.reset()
    } catch {
      // Error handled by mutation
    }
  }
  

  const openProgramBuilder = (program?: any) => {
    if (program) {
      setEditingProgram(program)
      setWorkoutBlocks(program.template?.blocks || [])
      programForm.setValues({
        name: program.name,
        description: program.description || '',
        duration_weeks: program.duration_weeks,
        difficulty: program.difficulty,
        tags: program.tags || [],
      })
    } else {
      setEditingProgram(null)
      setWorkoutBlocks([])
      programForm.reset()
    }
    openBuilder()
  }

  const handleSaveProgram = async () => {
    const values = programForm.values
    if (!values.name) return

    try {
      await createProgram.mutateAsync({
        ...values,
        template: { 
          weeks: workoutBlocks.map(block => ({
            days: block.days || [{
              exercises: block.exercises?.map((ex: any) => ({
                exercise_id: ex.exercise_id,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                notes: ex.notes,
              })) || []
            }]
          }))
        },
        is_template: true,
      })
      closeBuilder()
      programForm.reset()
      setWorkoutBlocks([])
      setEditingProgram(null)
    } catch {
      // Error handled
    }
  }
  
  const muscleGroups = [
    { value: 'pecho', label: 'Pecho' },
    { value: 'espalda', label: 'Espalda' },
    { value: 'hombros', label: 'Hombros' },
    { value: 'bíceps', label: 'Bíceps' },
    { value: 'tríceps', label: 'Tríceps' },
    { value: 'cuádriceps', label: 'Cuádriceps' },
    { value: 'isquiotibiales', label: 'Isquiotibiales' },
    { value: 'glúteos', label: 'Glúteos' },
    { value: 'core', label: 'Core' },
    { value: 'cardio', label: 'Cardio' },
  ]
  
  const equipmentOptions = [
    { value: 'ninguno', label: 'Sin equipo' },
    { value: 'mancuernas', label: 'Mancuernas' },
    { value: 'barra', label: 'Barra' },
    { value: 'kettlebell', label: 'Kettlebell' },
    { value: 'bandas', label: 'Bandas elásticas' },
    { value: 'máquina', label: 'Máquina' },
    { value: 'banco', label: 'Banco' },
    { value: 'barra de dominadas', label: 'Barra de dominadas' },
  ]

  const filteredExercises = (exercises || mockExercises).filter((e: any) =>
    e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
    e.muscle_groups?.some((m: string) => m.toLowerCase().includes(searchExercise.toLowerCase()))
  )
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Entrenamientos"
        description="Gestiona ejercicios y programas de entrenamiento"
        action={{
          label: activeTab === 'exercises' ? 'Nuevo Ejercicio' : 'Nuevo Programa',
          onClick: activeTab === 'exercises' ? openExerciseModal : () => openProgramBuilder(),
        }}
      />
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="programs" leftSection={<IconTemplate size={14} />}>
            Programas
          </Tabs.Tab>
          <Tabs.Tab value="exercises" leftSection={<IconBarbell size={14} />}>
            Biblioteca de Ejercicios
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="programs">
          {programs && programs.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {programs.map((program: any) => (
                <Card key={program.id} withBorder radius="lg" padding="lg">
                  <Card.Section withBorder inheritPadding py="sm">
                    <Group justify="space-between">
                      <Text fw={600}>{program.name}</Text>
                      <Badge color="primary" variant="light">
                        {program.duration_weeks} semanas
                      </Badge>
                    </Group>
                  </Card.Section>
                  
                  <Text size="sm" c="dimmed" mt="md" lineClamp={2}>
                    {program.description || 'Sin descripción'}
                  </Text>
                  
                  <Group gap="xs" mt="md">
                    <Badge size="sm" variant="outline">
                      {program.difficulty === 'beginner' ? 'Principiante' :
                       program.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                    </Badge>
                    {program.tags?.slice(0, 2).map((tag: string) => (
                      <Badge key={tag} size="sm" variant="light">
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
                      onClick={() => openProgramBuilder(program)}
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
          ) : !loadingPrograms ? (
            <EmptyState
              icon={<IconTemplate size={40} />}
              title="No hay programas"
              description="Crea tu primer programa de entrenamiento para asignarlo a tus clientes."
              actionLabel="Crear Programa"
              onAction={() => openProgramBuilder()}
            />
          ) : null}
        </Tabs.Panel>
        
        <Tabs.Panel value="exercises">
          <TextInput
            placeholder="Buscar ejercicios..."
            leftSection={<IconSearch size={16} />}
            mb="lg"
            value={searchExercise}
            onChange={(e) => setSearchExercise(e.target.value)}
          />
          
          {filteredExercises.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {filteredExercises.map((exercise: any) => (
                <Card key={exercise.id} withBorder radius="md" padding="sm">
                  <Card.Section>
                    <Box
                      h={120}
                      style={{
                        background: 'linear-gradient(135deg, var(--mantine-color-primary-1) 0%, var(--mantine-color-primary-2) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconBarbell size={40} color="var(--mantine-color-primary-6)" />
                    </Box>
                  </Card.Section>
                  
                  <Box mt="sm">
                    <Text fw={600} size="sm" lineClamp={1}>
                      {exercise.name}
                    </Text>
                    <Group gap={4} mt="xs">
                      {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                        <Badge key={muscle} size="xs" variant="light">
                          {muscle}
                        </Badge>
                      ))}
                    </Group>
                  </Box>
                </Card>
              ))}
            </SimpleGrid>
          ) : !loadingExercises ? (
            <EmptyState
              icon={<IconBarbell size={40} />}
              title="No hay ejercicios"
              description="Añade ejercicios a tu biblioteca para usarlos en tus programas."
              actionLabel="Añadir Ejercicio"
              onAction={openExerciseModal}
            />
          ) : null}
        </Tabs.Panel>
      </Tabs>
      
      {/* Modal para crear ejercicio */}
      <Modal
        opened={exerciseModalOpened}
        onClose={closeExerciseModal}
        title="Nuevo Ejercicio"
        size="lg"
      >
        <form onSubmit={exerciseForm.onSubmit(handleCreateExercise)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Press de Banca"
              required
              {...exerciseForm.getInputProps('name')}
            />
            
            <Textarea
              label="Descripción"
              placeholder="Breve descripción del ejercicio..."
              minRows={2}
              {...exerciseForm.getInputProps('description')}
            />
            
            <Textarea
              label="Instrucciones"
              placeholder="Pasos para realizar el ejercicio correctamente..."
              minRows={3}
              {...exerciseForm.getInputProps('instructions')}
            />
            
            <Group grow>
              <MultiSelect
                label="Grupos musculares"
                placeholder="Selecciona"
                data={muscleGroups}
                {...exerciseForm.getInputProps('muscle_groups')}
              />
              <MultiSelect
                label="Equipamiento"
                placeholder="Selecciona"
                data={equipmentOptions}
                {...exerciseForm.getInputProps('equipment')}
              />
            </Group>
            
            <Group grow>
              <Select
                label="Dificultad"
                data={[
                  { value: 'beginner', label: 'Principiante' },
                  { value: 'intermediate', label: 'Intermedio' },
                  { value: 'advanced', label: 'Avanzado' },
                ]}
                {...exerciseForm.getInputProps('difficulty')}
              />
              <Select
                label="Categoría"
                data={[
                  { value: 'fuerza', label: 'Fuerza' },
                  { value: 'cardio', label: 'Cardio' },
                  { value: 'flexibilidad', label: 'Flexibilidad' },
                  { value: 'core', label: 'Core' },
                ]}
                {...exerciseForm.getInputProps('category')}
              />
            </Group>
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeExerciseModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={createExercise.isPending}>
                Crear Ejercicio
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      
      {/* Drawer para el constructor de programas */}
      <Drawer
        opened={builderOpened}
        onClose={closeBuilder}
        title={editingProgram ? 'Editar Programa' : 'Nuevo Programa'}
        size="xl"
        position="right"
      >
        <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
          <Stack>
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <TextInput
                  label="Nombre del programa"
                  placeholder="Programa de Hipertrofia"
                  required
                  {...programForm.getInputProps('name')}
                />
                
                <Textarea
                  label="Descripción"
                  placeholder="Describe el programa..."
                  minRows={2}
                  {...programForm.getInputProps('description')}
                />
                
                <Group grow>
                  <NumberInput
                    label="Duración (semanas)"
                    min={1}
                    max={52}
                    {...programForm.getInputProps('duration_weeks')}
                  />
                  <Select
                    label="Dificultad"
                    data={[
                      { value: 'beginner', label: 'Principiante' },
                      { value: 'intermediate', label: 'Intermedio' },
                      { value: 'advanced', label: 'Avanzado' },
                    ]}
                    {...programForm.getInputProps('difficulty')}
                  />
                </Group>
                
                <MultiSelect
                  label="Etiquetas"
                  placeholder="Añade etiquetas"
                  data={[
                    { value: 'hipertrofia', label: 'Hipertrofia' },
                    { value: 'fuerza', label: 'Fuerza' },
                    { value: 'pérdida de peso', label: 'Pérdida de peso' },
                    { value: 'tonificación', label: 'Tonificación' },
                    { value: 'resistencia', label: 'Resistencia' },
                  ]}
                  searchable
                  {...programForm.getInputProps('tags')}
                />
              </Stack>
            </Paper>

            <Divider label="Constructor de Entrenamiento" labelPosition="center" />

            <WorkoutBuilder
              blocks={workoutBlocks}
              onChange={setWorkoutBlocks}
              availableExercises={mockExercises}
            />
          </Stack>
        </ScrollArea>

        <Group justify="flex-end" mt="md" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Button variant="default" onClick={closeBuilder}>
            Cancelar
          </Button>
          <Button onClick={handleSaveProgram} loading={createProgram.isPending}>
            {editingProgram ? 'Guardar Cambios' : 'Crear Programa'}
          </Button>
        </Group>
      </Drawer>
    </Container>
  )
}

export default WorkoutsPage
