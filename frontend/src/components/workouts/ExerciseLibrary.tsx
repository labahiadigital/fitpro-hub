import { useState } from 'react'
import {
  Modal,
  TextInput,
  Group,
  Stack,
  Text,
  Badge,
  Card,
  SimpleGrid,
  ActionIcon,
  Select,
  MultiSelect,
  ScrollArea,
  Image,
  ThemeIcon,
  Tabs,
  Button,
} from '@mantine/core'
import {
  IconSearch,
  IconFilter,
  IconPlus,
  IconHeart,
  IconHeartFilled,
  IconPlayerPlay,
  IconBarbell,
} from '@tabler/icons-react'

interface Exercise {
  id: string
  name: string
  description: string
  instructions: string[]
  muscleGroups: string[]
  equipment: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  videoUrl?: string
  thumbnailUrl?: string
  isFavorite: boolean
  isGlobal: boolean
}

interface ExerciseLibraryProps {
  opened: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
  exercises: Exercise[]
  onToggleFavorite: (exerciseId: string) => void
}

const muscleGroupOptions = [
  { value: 'chest', label: 'Pecho' },
  { value: 'back', label: 'Espalda' },
  { value: 'shoulders', label: 'Hombros' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'legs', label: 'Piernas' },
  { value: 'glutes', label: 'Glúteos' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Cuerpo Completo' },
]

const equipmentOptions = [
  { value: 'none', label: 'Sin equipo' },
  { value: 'dumbbells', label: 'Mancuernas' },
  { value: 'barbell', label: 'Barra' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'resistance_bands', label: 'Bandas elásticas' },
  { value: 'cable', label: 'Poleas' },
  { value: 'machine', label: 'Máquina' },
  { value: 'bench', label: 'Banco' },
  { value: 'pull_up_bar', label: 'Barra de dominadas' },
]

const difficultyColors: Record<string, string> = {
  beginner: 'green',
  intermediate: 'yellow',
  advanced: 'red',
}

const difficultyLabels: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export function ExerciseLibrary({
  opened,
  onClose,
  onSelect,
  exercises,
  onToggleFavorite,
}: ExerciseLibraryProps) {
  const [search, setSearch] = useState('')
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>('all')
  const [videoModalExercise, setVideoModalExercise] = useState<Exercise | null>(null)

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(search.toLowerCase()) ||
      exercise.description.toLowerCase().includes(search.toLowerCase())
    const matchesMuscles = selectedMuscles.length === 0 ||
      selectedMuscles.some(m => exercise.muscleGroups.includes(m))
    const matchesEquipment = selectedEquipment.length === 0 ||
      selectedEquipment.some(e => exercise.equipment.includes(e))
    const matchesDifficulty = !selectedDifficulty || exercise.difficulty === selectedDifficulty
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'favorites' && exercise.isFavorite) ||
      (activeTab === 'custom' && !exercise.isGlobal)

    return matchesSearch && matchesMuscles && matchesEquipment && matchesDifficulty && matchesTab
  })

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="Biblioteca de Ejercicios"
        size="xl"
        styles={{ body: { padding: 0 } }}
      >
        <Stack gap={0}>
          {/* Search and Filters */}
          <Stack gap="sm" p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <TextInput
              placeholder="Buscar ejercicios..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Group gap="sm">
              <MultiSelect
                placeholder="Músculos"
                data={muscleGroupOptions}
                value={selectedMuscles}
                onChange={setSelectedMuscles}
                leftSection={<IconFilter size={14} />}
                size="xs"
                w={180}
                clearable
              />
              <MultiSelect
                placeholder="Equipamiento"
                data={equipmentOptions}
                value={selectedEquipment}
                onChange={setSelectedEquipment}
                size="xs"
                w={180}
                clearable
              />
              <Select
                placeholder="Dificultad"
                data={[
                  { value: 'beginner', label: 'Principiante' },
                  { value: 'intermediate', label: 'Intermedio' },
                  { value: 'advanced', label: 'Avanzado' },
                ]}
                value={selectedDifficulty}
                onChange={setSelectedDifficulty}
                size="xs"
                w={140}
                clearable
              />
            </Group>
          </Stack>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List px="md">
              <Tabs.Tab value="all">Todos ({exercises.length})</Tabs.Tab>
              <Tabs.Tab value="favorites">
                Favoritos ({exercises.filter(e => e.isFavorite).length})
              </Tabs.Tab>
              <Tabs.Tab value="custom">
                Personalizados ({exercises.filter(e => !e.isGlobal).length})
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {/* Exercise Grid */}
          <ScrollArea h={400} p="md">
            {filteredExercises.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No se encontraron ejercicios
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {filteredExercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    withBorder
                    radius="md"
                    padding="sm"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelect(exercise)}
                  >
                    {/* Thumbnail */}
                    <Card.Section>
                      <div style={{ position: 'relative', height: 120, background: 'var(--mantine-color-gray-1)' }}>
                        {exercise.thumbnailUrl ? (
                          <Image
                            src={exercise.thumbnailUrl}
                            height={120}
                            alt={exercise.name}
                          />
                        ) : (
                          <div style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <ThemeIcon size="xl" variant="light" color="gray">
                              <IconBarbell size={24} />
                            </ThemeIcon>
                          </div>
                        )}
                        {exercise.videoUrl && (
                          <ActionIcon
                            variant="filled"
                            color="dark"
                            size="md"
                            radius="xl"
                            style={{ position: 'absolute', bottom: 8, right: 8 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setVideoModalExercise(exercise)
                            }}
                          >
                            <IconPlayerPlay size={14} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          variant="subtle"
                          color={exercise.isFavorite ? 'red' : 'gray'}
                          size="sm"
                          style={{ position: 'absolute', top: 8, right: 8 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleFavorite(exercise.id)
                          }}
                        >
                          {exercise.isFavorite ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                        </ActionIcon>
                      </div>
                    </Card.Section>

                    {/* Content */}
                    <Stack gap={4} mt="sm">
                      <Group justify="space-between" gap={4}>
                        <Text size="sm" fw={600} lineClamp={1}>{exercise.name}</Text>
                        <Badge size="xs" color={difficultyColors[exercise.difficulty]}>
                          {difficultyLabels[exercise.difficulty]}
                        </Badge>
                      </Group>
                      <Group gap={4}>
                        {exercise.muscleGroups.slice(0, 2).map((muscle) => (
                          <Badge key={muscle} size="xs" variant="outline">
                            {muscleGroupOptions.find(m => m.value === muscle)?.label || muscle}
                          </Badge>
                        ))}
                        {exercise.muscleGroups.length > 2 && (
                          <Badge size="xs" variant="outline" color="gray">
                            +{exercise.muscleGroups.length - 2}
                          </Badge>
                        )}
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </ScrollArea>

          {/* Footer */}
          <Group justify="space-between" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <Text size="sm" c="dimmed">
              {filteredExercises.length} ejercicios encontrados
            </Text>
            <Button variant="light" leftSection={<IconPlus size={16} />}>
              Crear Ejercicio
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Video Modal */}
      <Modal
        opened={!!videoModalExercise}
        onClose={() => setVideoModalExercise(null)}
        title={videoModalExercise?.name}
        size="lg"
      >
        {videoModalExercise && (
          <Stack>
            {videoModalExercise.videoUrl && (
              <video
                src={videoModalExercise.videoUrl}
                controls
                style={{ width: '100%', borderRadius: 8 }}
              />
            )}
            <Text size="sm">{videoModalExercise.description}</Text>
            {videoModalExercise.instructions.length > 0 && (
              <>
                <Text size="sm" fw={600}>Instrucciones:</Text>
                <Stack gap={4}>
                  {videoModalExercise.instructions.map((instruction, i) => (
                    <Text key={i} size="sm" c="dimmed">
                      {i + 1}. {instruction}
                    </Text>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </>
  )
}

