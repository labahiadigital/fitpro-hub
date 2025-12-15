import { useState } from 'react'
import {
  Container,
  Grid,
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
  Image,
  ActionIcon,
  SimpleGrid,
  MultiSelect,
  NumberInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconBarbell,
  IconTemplate,
  IconSearch,
  IconEdit,
  IconTrash,
  IconCopy,
  IconPlayerPlay,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'
import {
  useExercises,
  useWorkoutPrograms,
  useCreateExercise,
  useCreateWorkoutProgram,
} from '../../hooks/useWorkouts'

export function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('programs')
  const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
  const [programModalOpened, { open: openProgramModal, close: closeProgramModal }] = useDisclosure(false)
  const [searchExercise, setSearchExercise] = useState('')
  
  const { data: exercises, isLoading: loadingExercises } = useExercises({ search: searchExercise })
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
  
  const handleCreateProgram = async (values: typeof programForm.values) => {
    try {
      await createProgram.mutateAsync({
        ...values,
        template: { weeks: [] },
        is_template: true,
      })
      closeProgramModal()
      programForm.reset()
    } catch {
      // Error handled by mutation
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
  
  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Entrenamientos"
        description="Gestiona ejercicios y programas de entrenamiento"
        action={{
          label: activeTab === 'exercises' ? 'Nuevo Ejercicio' : 'Nuevo Programa',
          onClick: activeTab === 'exercises' ? openExerciseModal : openProgramModal,
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
              {programs.map((program: { id: string; name: string; description?: string; duration_weeks: number; difficulty: string; tags: string[] }) => (
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
                    >
                      Editar
                    </Button>
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
              onAction={openProgramModal}
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
          
          {exercises && exercises.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {exercises.map((exercise: { id: string; name: string; description?: string; muscle_groups: string[]; difficulty: string; image_url?: string }) => (
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
                      {exercise.image_url ? (
                        <Image src={exercise.image_url} h={120} fit="cover" />
                      ) : (
                        <IconBarbell size={40} color="var(--mantine-color-primary-6)" />
                      )}
                    </Box>
                  </Card.Section>
                  
                  <Box mt="sm">
                    <Text fw={600} size="sm" lineClamp={1}>
                      {exercise.name}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
                      {exercise.description || 'Sin descripción'}
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
      
      {/* Modal para crear programa */}
      <Modal
        opened={programModalOpened}
        onClose={closeProgramModal}
        title="Nuevo Programa"
        size="md"
      >
        <form onSubmit={programForm.onSubmit(handleCreateProgram)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Programa de Hipertrofia"
              required
              {...programForm.getInputProps('name')}
            />
            
            <Textarea
              label="Descripción"
              placeholder="Describe el programa..."
              minRows={3}
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
              creatable
              getCreateLabel={(query) => `+ Crear "${query}"`}
              {...programForm.getInputProps('tags')}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeProgramModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={createProgram.isPending}>
                Crear Programa
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}
