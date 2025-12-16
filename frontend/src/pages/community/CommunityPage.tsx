import { useState } from 'react'
import {
  Container,
  Tabs,
  Paper,
  Group,
  Stack,
  Text,
  Title,
  Avatar,
  Badge,
  Button,
  Card,
  SimpleGrid,
  Progress,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  ThemeIcon,
  Box,
  Divider,
  Menu,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { DatePickerInput } from '@mantine/dates'
import {
  IconPlus,
  IconTrophy,
  IconUsers,
  IconFlame,
  IconTarget,
  IconMedal,
  IconChartBar,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconShare,
  IconStar,
} from '@tabler/icons-react'
import { PageHeader } from '../../components/common/PageHeader'

interface Challenge {
  id: string
  name: string
  description: string
  type: 'workouts' | 'steps' | 'weight_loss' | 'custom'
  goal: number
  unit: string
  startDate: string
  endDate: string
  participants: {
    id: string
    name: string
    avatar?: string
    progress: number
  }[]
  isActive: boolean
}

interface CommunityGroup {
  id: string
  name: string
  description: string
  memberCount: number
  imageUrl?: string
  isPrivate: boolean
}

interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  avatar?: string
  score: number
  streak: number
}

export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<string | null>('challenges')
  const [challengeModalOpened, { open: openChallengeModal, close: closeChallengeModal }] = useDisclosure(false)
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false)

  // Mock data
  const [challenges] = useState<Challenge[]>([
    {
      id: '1',
      name: 'Reto 30 Días Fitness',
      description: 'Completa 30 entrenamientos en 30 días',
      type: 'workouts',
      goal: 30,
      unit: 'entrenamientos',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      participants: [
        { id: '1', name: 'María García', progress: 24 },
        { id: '2', name: 'Carlos López', progress: 20 },
        { id: '3', name: 'Ana Martínez', progress: 18 },
        { id: '4', name: 'Pedro Sánchez', progress: 15 },
      ],
      isActive: true,
    },
    {
      id: '2',
      name: 'Desafío 10K Pasos',
      description: 'Camina 10,000 pasos diarios durante 2 semanas',
      type: 'steps',
      goal: 140000,
      unit: 'pasos',
      startDate: '2024-01-15',
      endDate: '2024-01-29',
      participants: [
        { id: '1', name: 'María García', progress: 98000 },
        { id: '3', name: 'Ana Martínez', progress: 85000 },
      ],
      isActive: true,
    },
  ])

  const [groups] = useState<CommunityGroup[]>([
    {
      id: '1',
      name: 'Runners Club',
      description: 'Grupo para amantes del running',
      memberCount: 25,
      isPrivate: false,
    },
    {
      id: '2',
      name: 'Pérdida de Peso',
      description: 'Apoyo mutuo para perder peso',
      memberCount: 18,
      isPrivate: true,
    },
    {
      id: '3',
      name: 'Yoga & Mindfulness',
      description: 'Práctica de yoga y meditación',
      memberCount: 32,
      isPrivate: false,
    },
  ])

  const [leaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, userId: '1', userName: 'María García', score: 2450, streak: 15 },
    { rank: 2, userId: '2', userName: 'Carlos López', score: 2280, streak: 12 },
    { rank: 3, userId: '3', userName: 'Ana Martínez', score: 2100, streak: 10 },
    { rank: 4, userId: '4', userName: 'Pedro Sánchez', score: 1950, streak: 8 },
    { rank: 5, userId: '5', userName: 'Laura Fernández', score: 1800, streak: 7 },
  ])

  const challengeForm = useForm({
    initialValues: {
      name: '',
      description: '',
      type: 'workouts',
      goal: 10,
      startDate: null as Date | null,
      endDate: null as Date | null,
    },
  })

  const groupForm = useForm({
    initialValues: {
      name: '',
      description: '',
      isPrivate: false,
    },
  })

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <IconTrophy size={20} color="gold" />
      case 2:
        return <IconMedal size={20} color="silver" />
      case 3:
        return <IconMedal size={20} color="#cd7f32" />
      default:
        return <Text size="sm" fw={600}>{rank}</Text>
    }
  }

  const getChallengeTypeIcon = (type: string) => {
    switch (type) {
      case 'workouts':
        return <IconTarget size={20} />
      case 'steps':
        return <IconFlame size={20} />
      case 'weight_loss':
        return <IconChartBar size={20} />
      default:
        return <IconStar size={20} />
    }
  }

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Comunidad"
        description="Gestiona retos, grupos y ranking de tus clientes"
        action={{
          label: 'Nuevo Reto',
          icon: <IconPlus size={16} />,
          onClick: openChallengeModal,
        }}
        secondaryAction={{
          label: 'Nuevo Grupo',
          icon: <IconUsers size={16} />,
          onClick: openGroupModal,
          variant: 'default',
        }}
      />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="challenges" leftSection={<IconTrophy size={16} />}>
            Retos
          </Tabs.Tab>
          <Tabs.Tab value="groups" leftSection={<IconUsers size={16} />}>
            Grupos
          </Tabs.Tab>
          <Tabs.Tab value="leaderboard" leftSection={<IconMedal size={16} />}>
            Ranking
          </Tabs.Tab>
        </Tabs.List>

        {/* Challenges Tab */}
        <Tabs.Panel value="challenges">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {challenges.map((challenge) => (
              <Card key={challenge.id} withBorder radius="md" p="lg">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <ThemeIcon size="lg" radius="md" color="primary" variant="light">
                      {getChallengeTypeIcon(challenge.type)}
                    </ThemeIcon>
                    <div>
                      <Text fw={600}>{challenge.name}</Text>
                      <Text size="xs" c="dimmed">{challenge.description}</Text>
                    </div>
                  </Group>
                  <Menu shadow="md" width={150}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={14} />}>Editar</Menu.Item>
                      <Menu.Item leftSection={<IconShare size={14} />}>Compartir</Menu.Item>
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red">Eliminar</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <Group justify="space-between" mb="sm">
                  <Text size="sm" c="dimmed">
                    Meta: {challenge.goal} {challenge.unit}
                  </Text>
                  <Badge color={challenge.isActive ? 'green' : 'gray'}>
                    {challenge.isActive ? 'Activo' : 'Finalizado'}
                  </Badge>
                </Group>

                <Divider my="sm" />

                <Text size="sm" fw={500} mb="xs">
                  Participantes ({challenge.participants.length})
                </Text>
                <Stack gap="xs">
                  {challenge.participants.slice(0, 3).map((participant, index) => (
                    <Group key={participant.id} justify="space-between">
                      <Group gap="xs">
                        <Text size="xs" fw={600} c="dimmed" w={20}>
                          #{index + 1}
                        </Text>
                        <Avatar size="sm" radius="xl" color="blue">
                          {participant.name.charAt(0)}
                        </Avatar>
                        <Text size="sm">{participant.name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Progress
                          value={(participant.progress / challenge.goal) * 100}
                          size="sm"
                          w={80}
                          color="primary"
                        />
                        <Text size="xs" c="dimmed">
                          {Math.round((participant.progress / challenge.goal) * 100)}%
                        </Text>
                      </Group>
                    </Group>
                  ))}
                  {challenge.participants.length > 3 && (
                    <Text size="xs" c="dimmed" ta="center">
                      +{challenge.participants.length - 3} más
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        {/* Groups Tab */}
        <Tabs.Panel value="groups">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {groups.map((group) => (
              <Card key={group.id} withBorder radius="md" p="lg">
                <Group justify="space-between" mb="md">
                  <Avatar size="lg" radius="md" color="blue">
                    <IconUsers size={24} />
                  </Avatar>
                  {group.isPrivate && (
                    <Badge variant="light" color="gray">Privado</Badge>
                  )}
                </Group>
                <Text fw={600} mb={4}>{group.name}</Text>
                <Text size="sm" c="dimmed" mb="md">{group.description}</Text>
                <Group justify="space-between">
                  <Group gap={4}>
                    <IconUsers size={14} />
                    <Text size="sm" c="dimmed">{group.memberCount} miembros</Text>
                  </Group>
                  <Button size="xs" variant="light">Ver Grupo</Button>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        {/* Leaderboard Tab */}
        <Tabs.Panel value="leaderboard">
          <Paper withBorder radius="md" p="lg">
            <Title order={4} mb="lg">Ranking General</Title>
            <Stack gap="sm">
              {leaderboard.map((entry) => (
                <Paper
                  key={entry.userId}
                  withBorder
                  p="md"
                  radius="md"
                  style={{
                    background: entry.rank <= 3 ? `var(--mantine-color-${entry.rank === 1 ? 'yellow' : entry.rank === 2 ? 'gray' : 'orange'}-0)` : undefined,
                  }}
                >
                  <Group justify="space-between">
                    <Group gap="md">
                      <Box w={30} ta="center">
                        {getRankIcon(entry.rank)}
                      </Box>
                      <Avatar radius="xl" color="blue">
                        {entry.userName.charAt(0)}
                      </Avatar>
                      <div>
                        <Text fw={500}>{entry.userName}</Text>
                        <Group gap={4}>
                          <IconFlame size={12} color="orange" />
                          <Text size="xs" c="dimmed">{entry.streak} días de racha</Text>
                        </Group>
                      </div>
                    </Group>
                    <Group gap="lg">
                      <div style={{ textAlign: 'right' }}>
                        <Text size="lg" fw={700}>{entry.score.toLocaleString()}</Text>
                        <Text size="xs" c="dimmed">puntos</Text>
                      </div>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Challenge Modal */}
      <Modal opened={challengeModalOpened} onClose={closeChallengeModal} title="Nuevo Reto" centered>
        <form onSubmit={challengeForm.onSubmit((values) => {
          console.log(values)
          closeChallengeModal()
        })}>
          <Stack>
            <TextInput
              label="Nombre del Reto"
              placeholder="Ej: Reto 30 Días"
              {...challengeForm.getInputProps('name')}
            />
            <Textarea
              label="Descripción"
              placeholder="Describe el reto..."
              {...challengeForm.getInputProps('description')}
            />
            <Select
              label="Tipo de Reto"
              data={[
                { value: 'workouts', label: 'Entrenamientos completados' },
                { value: 'steps', label: 'Pasos caminados' },
                { value: 'weight_loss', label: 'Pérdida de peso' },
                { value: 'custom', label: 'Personalizado' },
              ]}
              {...challengeForm.getInputProps('type')}
            />
            <NumberInput
              label="Meta"
              min={1}
              {...challengeForm.getInputProps('goal')}
            />
            <Group grow>
              <DatePickerInput
                label="Fecha Inicio"
                placeholder="Selecciona fecha"
                {...challengeForm.getInputProps('startDate')}
              />
              <DatePickerInput
                label="Fecha Fin"
                placeholder="Selecciona fecha"
                {...challengeForm.getInputProps('endDate')}
              />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeChallengeModal}>Cancelar</Button>
              <Button type="submit">Crear Reto</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Group Modal */}
      <Modal opened={groupModalOpened} onClose={closeGroupModal} title="Nuevo Grupo" centered>
        <form onSubmit={groupForm.onSubmit((values) => {
          console.log(values)
          closeGroupModal()
        })}>
          <Stack>
            <TextInput
              label="Nombre del Grupo"
              placeholder="Ej: Runners Club"
              {...groupForm.getInputProps('name')}
            />
            <Textarea
              label="Descripción"
              placeholder="Describe el grupo..."
              {...groupForm.getInputProps('description')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeGroupModal}>Cancelar</Button>
              <Button type="submit">Crear Grupo</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}

