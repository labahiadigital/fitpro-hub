import { useState, useCallback } from 'react'
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
  Collapse,
  ThemeIcon,
  Divider,
  SimpleGrid,
  Modal,
  ScrollArea,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconGripVertical,
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconBarbell,
  IconClock,
  IconRepeat,
  IconSearch,
  IconCheck,
} from '@tabler/icons-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface Exercise {
  id: string
  name: string
  muscle_groups: string[]
  equipment: string[]
  image_url?: string
}

interface WorkoutExercise {
  id: string
  exercise_id: string
  exercise: Exercise
  sets: number
  reps: string
  rest_seconds: number
  notes?: string
  order: number
}

interface WorkoutBlock {
  id: string
  name: string
  type: 'warmup' | 'main' | 'cooldown' | 'superset' | 'circuit'
  exercises: WorkoutExercise[]
  rest_between_sets?: number
  rounds?: number
}

interface WorkoutBuilderProps {
  blocks: WorkoutBlock[]
  onChange: (blocks: WorkoutBlock[]) => void
  availableExercises: Exercise[]
}

export function WorkoutBuilder({ blocks, onChange, availableExercises }: WorkoutBuilderProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>(blocks.map(b => b.id))
  const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks(prev =>
      prev.includes(blockId)
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    )
  }

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, type } = result

    if (!destination) return

    if (type === 'block') {
      const newBlocks = Array.from(blocks)
      const [removed] = newBlocks.splice(source.index, 1)
      newBlocks.splice(destination.index, 0, removed)
      onChange(newBlocks)
      return
    }

    if (type === 'exercise') {
      const sourceBlockIndex = blocks.findIndex(b => b.id === source.droppableId)
      const destBlockIndex = blocks.findIndex(b => b.id === destination.droppableId)

      if (sourceBlockIndex === -1 || destBlockIndex === -1) return

      const newBlocks = [...blocks]

      if (sourceBlockIndex === destBlockIndex) {
        const block = { ...newBlocks[sourceBlockIndex] }
        const exercises = Array.from(block.exercises)
        const [removed] = exercises.splice(source.index, 1)
        exercises.splice(destination.index, 0, removed)
        block.exercises = exercises.map((e, i) => ({ ...e, order: i }))
        newBlocks[sourceBlockIndex] = block
      } else {
        const sourceBlock = { ...newBlocks[sourceBlockIndex] }
        const destBlock = { ...newBlocks[destBlockIndex] }
        const sourceExercises = Array.from(sourceBlock.exercises)
        const destExercises = Array.from(destBlock.exercises)
        const [removed] = sourceExercises.splice(source.index, 1)
        destExercises.splice(destination.index, 0, removed)
        sourceBlock.exercises = sourceExercises.map((e, i) => ({ ...e, order: i }))
        destBlock.exercises = destExercises.map((e, i) => ({ ...e, order: i }))
        newBlocks[sourceBlockIndex] = sourceBlock
        newBlocks[destBlockIndex] = destBlock
      }

      onChange(newBlocks)
    }
  }, [blocks, onChange])

  const addBlock = (type: WorkoutBlock['type']) => {
    const newBlock: WorkoutBlock = {
      id: `block-${Date.now()}`,
      name: type === 'warmup' ? 'Calentamiento' :
            type === 'main' ? 'Parte Principal' :
            type === 'cooldown' ? 'Vuelta a la calma' :
            type === 'superset' ? 'Superserie' : 'Circuito',
      type,
      exercises: [],
      rest_between_sets: 60,
      rounds: type === 'circuit' ? 3 : undefined,
    }
    onChange([...blocks, newBlock])
    setExpandedBlocks(prev => [...prev, newBlock.id])
  }

  const removeBlock = (blockId: string) => {
    onChange(blocks.filter(b => b.id !== blockId))
  }

  const duplicateBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    const newBlock: WorkoutBlock = {
      ...block,
      id: `block-${Date.now()}`,
      exercises: block.exercises.map(e => ({ ...e, id: `ex-${Date.now()}-${Math.random()}` })),
    }
    const index = blocks.findIndex(b => b.id === blockId)
    const newBlocks = [...blocks]
    newBlocks.splice(index + 1, 0, newBlock)
    onChange(newBlocks)
  }

  const updateBlock = (blockId: string, updates: Partial<WorkoutBlock>) => {
    onChange(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b))
  }

  const openAddExercise = (blockId: string) => {
    setSelectedBlockId(blockId)
    openExerciseModal()
  }

  const addExerciseToBlock = (exercise: Exercise) => {
    if (!selectedBlockId) return
    const block = blocks.find(b => b.id === selectedBlockId)
    if (!block) return

    const newExercise: WorkoutExercise = {
      id: `ex-${Date.now()}`,
      exercise_id: exercise.id,
      exercise,
      sets: 3,
      reps: '10-12',
      rest_seconds: 60,
      order: block.exercises.length,
    }

    updateBlock(selectedBlockId, {
      exercises: [...block.exercises, newExercise],
    })
    closeExerciseModal()
  }

  const updateExercise = (blockId: string, exerciseId: string, updates: Partial<WorkoutExercise>) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    updateBlock(blockId, {
      exercises: block.exercises.map(e =>
        e.id === exerciseId ? { ...e, ...updates } : e
      ),
    })
  }

  const removeExercise = (blockId: string, exerciseId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    updateBlock(blockId, {
      exercises: block.exercises.filter(e => e.id !== exerciseId),
    })
  }

  const getBlockColor = (type: WorkoutBlock['type']) => {
    switch (type) {
      case 'warmup': return 'orange'
      case 'main': return 'blue'
      case 'cooldown': return 'teal'
      case 'superset': return 'grape'
      case 'circuit': return 'pink'
      default: return 'gray'
    }
  }

  const filteredExercises = availableExercises.filter(e =>
    e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    e.muscle_groups.some(m => m.toLowerCase().includes(exerciseSearch.toLowerCase()))
  )

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="blocks" type="block">
          {(provided) => (
            <Stack gap="md" ref={provided.innerRef} {...provided.droppableProps}>
              {blocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(provided, snapshot) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      withBorder
                      radius="lg"
                      style={{
                        ...provided.draggableProps.style,
                        boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
                      }}
                    >
                      {/* Block Header */}
                      <Group
                        p="md"
                        justify="space-between"
                        style={{
                          backgroundColor: `var(--mantine-color-${getBlockColor(block.type)}-0)`,
                          borderBottom: expandedBlocks.includes(block.id)
                            ? '1px solid var(--mantine-color-gray-2)'
                            : undefined,
                          borderRadius: expandedBlocks.includes(block.id)
                            ? '16px 16px 0 0'
                            : '16px',
                        }}
                      >
                        <Group gap="sm">
                          <Box {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
                            <IconGripVertical size={18} color="var(--mantine-color-gray-5)" />
                          </Box>
                          <Badge color={getBlockColor(block.type)} variant="light" size="sm">
                            {block.type === 'warmup' ? 'Calentamiento' :
                             block.type === 'main' ? 'Principal' :
                             block.type === 'cooldown' ? 'Vuelta calma' :
                             block.type === 'superset' ? 'Superserie' : 'Circuito'}
                          </Badge>
                          <TextInput
                            value={block.name}
                            onChange={(e) => updateBlock(block.id, { name: e.target.value })}
                            variant="unstyled"
                            fw={600}
                            styles={{ input: { fontWeight: 600, fontSize: '1rem' } }}
                          />
                        </Group>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            {block.exercises.length} ejercicio{block.exercises.length !== 1 ? 's' : ''}
                          </Text>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => duplicateBlock(block.id)}
                          >
                            <IconCopy size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => removeBlock(block.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => toggleBlock(block.id)}
                          >
                            {expandedBlocks.includes(block.id) ? (
                              <IconChevronUp size={18} />
                            ) : (
                              <IconChevronDown size={18} />
                            )}
                          </ActionIcon>
                        </Group>
                      </Group>

                      {/* Block Content */}
                      <Collapse in={expandedBlocks.includes(block.id)}>
                        <Box p="md">
                          {/* Block Settings */}
                          {(block.type === 'circuit' || block.type === 'superset') && (
                            <Group mb="md" gap="md">
                              {block.type === 'circuit' && (
                                <NumberInput
                                  label="Rondas"
                                  value={block.rounds}
                                  onChange={(v) => updateBlock(block.id, { rounds: Number(v) })}
                                  min={1}
                                  max={10}
                                  w={100}
                                  size="xs"
                                />
                              )}
                              <NumberInput
                                label="Descanso entre series (seg)"
                                value={block.rest_between_sets}
                                onChange={(v) => updateBlock(block.id, { rest_between_sets: Number(v) })}
                                min={0}
                                max={300}
                                step={15}
                                w={180}
                                size="xs"
                              />
                            </Group>
                          )}

                          {/* Exercises */}
                          <Droppable droppableId={block.id} type="exercise">
                            {(provided) => (
                              <Stack gap="sm" ref={provided.innerRef} {...provided.droppableProps}>
                                {block.exercises.map((exercise, exIndex) => (
                                  <Draggable
                                    key={exercise.id}
                                    draggableId={exercise.id}
                                    index={exIndex}
                                  >
                                    {(provided, snapshot) => (
                                      <Card
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        withBorder
                                        padding="sm"
                                        radius="md"
                                        style={{
                                          ...provided.draggableProps.style,
                                          backgroundColor: snapshot.isDragging
                                            ? 'var(--mantine-color-gray-0)'
                                            : undefined,
                                        }}
                                      >
                                        <Group justify="space-between" wrap="nowrap">
                                          <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                                            <Box {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
                                              <IconGripVertical size={16} color="var(--mantine-color-gray-4)" />
                                            </Box>
                                            <ThemeIcon
                                              size="md"
                                              radius="md"
                                              variant="light"
                                              color={getBlockColor(block.type)}
                                            >
                                              <IconBarbell size={14} />
                                            </ThemeIcon>
                                            <Box style={{ flex: 1, minWidth: 0 }}>
                                              <Text fw={500} size="sm" truncate>
                                                {exercise.exercise.name}
                                              </Text>
                                              <Group gap={4}>
                                                {exercise.exercise.muscle_groups.slice(0, 2).map(m => (
                                                  <Badge key={m} size="xs" variant="outline" color="gray">
                                                    {m}
                                                  </Badge>
                                                ))}
                                              </Group>
                                            </Box>
                                          </Group>

                                          <Group gap="xs" wrap="nowrap">
                                            <NumberInput
                                              value={exercise.sets}
                                              onChange={(v) => updateExercise(block.id, exercise.id, { sets: Number(v) })}
                                              min={1}
                                              max={20}
                                              w={60}
                                              size="xs"
                                              leftSection={<IconRepeat size={12} />}
                                            />
                                            <TextInput
                                              value={exercise.reps}
                                              onChange={(e) => updateExercise(block.id, exercise.id, { reps: e.target.value })}
                                              w={70}
                                              size="xs"
                                              placeholder="Reps"
                                            />
                                            <NumberInput
                                              value={exercise.rest_seconds}
                                              onChange={(v) => updateExercise(block.id, exercise.id, { rest_seconds: Number(v) })}
                                              min={0}
                                              max={300}
                                              step={15}
                                              w={70}
                                              size="xs"
                                              leftSection={<IconClock size={12} />}
                                            />
                                            <ActionIcon
                                              variant="subtle"
                                              color="red"
                                              size="sm"
                                              onClick={() => removeExercise(block.id, exercise.id)}
                                            >
                                              <IconTrash size={14} />
                                            </ActionIcon>
                                          </Group>
                                        </Group>
                                      </Card>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </Stack>
                            )}
                          </Droppable>

                          <Button
                            variant="light"
                            leftSection={<IconPlus size={16} />}
                            mt="md"
                            fullWidth
                            onClick={() => openAddExercise(block.id)}
                          >
                            Añadir Ejercicio
                          </Button>
                        </Box>
                      </Collapse>
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Stack>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Block Buttons */}
      <Divider my="lg" label="Añadir bloque" labelPosition="center" />
      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm">
        <Button variant="light" color="orange" leftSection={<IconPlus size={14} />} onClick={() => addBlock('warmup')}>
          Calentamiento
        </Button>
        <Button variant="light" color="blue" leftSection={<IconPlus size={14} />} onClick={() => addBlock('main')}>
          Principal
        </Button>
        <Button variant="light" color="grape" leftSection={<IconPlus size={14} />} onClick={() => addBlock('superset')}>
          Superserie
        </Button>
        <Button variant="light" color="pink" leftSection={<IconPlus size={14} />} onClick={() => addBlock('circuit')}>
          Circuito
        </Button>
        <Button variant="light" color="teal" leftSection={<IconPlus size={14} />} onClick={() => addBlock('cooldown')}>
          Vuelta Calma
        </Button>
      </SimpleGrid>

      {/* Exercise Selection Modal */}
      <Modal
        opened={exerciseModalOpened}
        onClose={closeExerciseModal}
        title="Seleccionar Ejercicio"
        size="lg"
      >
        <TextInput
          placeholder="Buscar ejercicios..."
          leftSection={<IconSearch size={16} />}
          mb="md"
          value={exerciseSearch}
          onChange={(e) => setExerciseSearch(e.target.value)}
        />
        <ScrollArea h={400}>
          <Stack gap="xs">
            {filteredExercises.map((exercise) => (
              <Card
                key={exercise.id}
                withBorder
                padding="sm"
                radius="md"
                style={{ cursor: 'pointer' }}
                onClick={() => addExerciseToBlock(exercise)}
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <ThemeIcon size="lg" radius="md" variant="light" color="primary">
                      <IconBarbell size={18} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={500} size="sm">{exercise.name}</Text>
                      <Group gap={4}>
                        {exercise.muscle_groups.slice(0, 3).map(m => (
                          <Badge key={m} size="xs" variant="light">{m}</Badge>
                        ))}
                      </Group>
                    </Box>
                  </Group>
                  <ActionIcon variant="subtle" color="primary">
                    <IconCheck size={18} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
            {filteredExercises.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">
                No se encontraron ejercicios
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Modal>
    </>
  )
}

