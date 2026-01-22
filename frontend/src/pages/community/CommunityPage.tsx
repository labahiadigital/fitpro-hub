import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Menu,
  Modal,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconDotsVertical,
  IconEdit,
  IconFlame,
  IconMedal,
  IconPlus,
  IconShare,
  IconStar,
  IconTarget,
  IconTrash,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: "workouts" | "steps" | "weight_loss" | "custom";
  goal: number;
  unit: string;
  startDate: string;
  endDate: string;
  participants: {
    id: string;
    name: string;
    avatar?: string;
    progress: number;
  }[];
  isActive: boolean;
}

interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  imageUrl?: string;
  isPrivate: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  score: number;
  streak: number;
}

export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<string | null>("challenges");
  const [
    challengeModalOpened,
    { open: openChallengeModal, close: closeChallengeModal },
  ] = useDisclosure(false);
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] =
    useDisclosure(false);

  // TODO: Replace with API call when backend endpoint is ready
  // const { data: challenges = [] } = useChallenges();
  // const { data: groups = [] } = useCommunityGroups();
  // const { data: leaderboard = [] } = useLeaderboard();
  const [challenges] = useState<Challenge[]>([]);
  const [groups] = useState<CommunityGroup[]>([]);
  const [leaderboard] = useState<LeaderboardEntry[]>([]);

  const challengeForm = useForm({
    initialValues: {
      name: "",
      description: "",
      type: "workouts",
      goal: 10,
      startDate: null as Date | null,
      endDate: null as Date | null,
    },
  });

  const groupForm = useForm({
    initialValues: {
      name: "",
      description: "",
      isPrivate: false,
    },
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <IconTrophy color="gold" size={20} />;
      case 2:
        return <IconMedal color="silver" size={20} />;
      case 3:
        return <IconMedal color="#cd7f32" size={20} />;
      default:
        return (
          <Text fw={600} size="sm">
            {rank}
          </Text>
        );
    }
  };

  const getChallengeTypeIcon = (type: string) => {
    switch (type) {
      case "workouts":
        return <IconTarget size={20} />;
      case "steps":
        return <IconFlame size={20} />;
      case "weight_loss":
        return <IconChartBar size={20} />;
      default:
        return <IconStar size={20} />;
    }
  };

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Nuevo Reto",
          icon: <IconPlus size={16} />,
          onClick: openChallengeModal,
        }}
        description="Gestiona retos, grupos y ranking de tus clientes"
        secondaryAction={{
          label: "Nuevo Grupo",
          icon: <IconUsers size={16} />,
          onClick: openGroupModal,
          variant: "default",
        }}
        title="Comunidad"
      />

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconTrophy size={16} />} value="challenges">
            Retos
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconUsers size={16} />} value="groups">
            Grupos
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconMedal size={16} />} value="leaderboard">
            Ranking
          </Tabs.Tab>
        </Tabs.List>

        {/* Challenges Tab */}
        <Tabs.Panel value="challenges">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {challenges.map((challenge) => (
              <Card key={challenge.id} p="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <ThemeIcon
                      color="primary"
                      radius="md"
                      size="lg"
                      variant="light"
                    >
                      {getChallengeTypeIcon(challenge.type)}
                    </ThemeIcon>
                    <div>
                      <Text fw={600}>{challenge.name}</Text>
                      <Text c="dimmed" size="xs">
                        {challenge.description}
                      </Text>
                    </div>
                  </Group>
                  <Menu shadow="md" width={150}>
                    <Menu.Target>
                      <ActionIcon color="gray" variant="subtle">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={14} />}>
                        Editar
                      </Menu.Item>
                      <Menu.Item leftSection={<IconShare size={14} />}>
                        Compartir
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                      >
                        Eliminar
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <Group justify="space-between" mb="sm">
                  <Text c="dimmed" size="sm">
                    Meta: {challenge.goal} {challenge.unit}
                  </Text>
                  <Badge color={challenge.isActive ? "green" : "gray"}>
                    {challenge.isActive ? "Activo" : "Finalizado"}
                  </Badge>
                </Group>

                <Divider my="sm" />

                <Text fw={500} mb="xs" size="sm">
                  Participantes ({challenge.participants.length})
                </Text>
                <Stack gap="xs">
                  {challenge.participants
                    .slice(0, 3)
                    .map((participant, index) => (
                      <Group justify="space-between" key={participant.id}>
                        <Group gap="xs">
                          <Text c="dimmed" fw={600} size="xs" w={20}>
                            #{index + 1}
                          </Text>
                          <Avatar color="blue" radius="xl" size="sm">
                            {participant.name.charAt(0)}
                          </Avatar>
                          <Text size="sm">{participant.name}</Text>
                        </Group>
                        <Group gap="xs">
                          <Progress
                            color="primary"
                            size="sm"
                            value={
                              (participant.progress / challenge.goal) * 100
                            }
                            w={80}
                          />
                          <Text c="dimmed" size="xs">
                            {Math.round(
                              (participant.progress / challenge.goal) * 100
                            )}
                            %
                          </Text>
                        </Group>
                      </Group>
                    ))}
                  {challenge.participants.length > 3 && (
                    <Text c="dimmed" size="xs" ta="center">
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
              <Card key={group.id} p="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Avatar color="blue" radius="md" size="lg">
                    <IconUsers size={24} />
                  </Avatar>
                  {group.isPrivate && (
                    <Badge color="gray" variant="light">
                      Privado
                    </Badge>
                  )}
                </Group>
                <Text fw={600} mb={4}>
                  {group.name}
                </Text>
                <Text c="dimmed" mb="md" size="sm">
                  {group.description}
                </Text>
                <Group justify="space-between">
                  <Group gap={4}>
                    <IconUsers size={14} />
                    <Text c="dimmed" size="sm">
                      {group.memberCount} miembros
                    </Text>
                  </Group>
                  <Button size="xs" variant="light">
                    Ver Grupo
                  </Button>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        {/* Leaderboard Tab */}
        <Tabs.Panel value="leaderboard">
          <Paper p="lg" radius="md" withBorder>
            <Title mb="lg" order={4}>
              Ranking General
            </Title>
            <Stack gap="sm">
              {leaderboard.map((entry) => (
                <Paper
                  key={entry.userId}
                  p="md"
                  radius="md"
                  style={{
                    background:
                      entry.rank <= 3
                        ? `var(--mantine-color-${entry.rank === 1 ? "yellow" : entry.rank === 2 ? "gray" : "orange"}-0)`
                        : undefined,
                  }}
                  withBorder
                >
                  <Group justify="space-between">
                    <Group gap="md">
                      <Box ta="center" w={30}>
                        {getRankIcon(entry.rank)}
                      </Box>
                      <Avatar color="blue" radius="xl">
                        {entry.userName.charAt(0)}
                      </Avatar>
                      <div>
                        <Text fw={500}>{entry.userName}</Text>
                        <Group gap={4}>
                          <IconFlame color="orange" size={12} />
                          <Text c="dimmed" size="xs">
                            {entry.streak} días de racha
                          </Text>
                        </Group>
                      </div>
                    </Group>
                    <Group gap="lg">
                      <div style={{ textAlign: "right" }}>
                        <Text fw={700} size="lg">
                          {entry.score.toLocaleString()}
                        </Text>
                        <Text c="dimmed" size="xs">
                          puntos
                        </Text>
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
      <Modal
        centered
        onClose={closeChallengeModal}
        opened={challengeModalOpened}
        title="Nuevo Reto"
      >
        <form
          onSubmit={challengeForm.onSubmit((values) => {
            console.log(values);
            closeChallengeModal();
          })}
        >
          <Stack>
            <TextInput
              label="Nombre del Reto"
              placeholder="Ej: Reto 30 Días"
              {...challengeForm.getInputProps("name")}
            />
            <Textarea
              label="Descripción"
              placeholder="Describe el reto..."
              {...challengeForm.getInputProps("description")}
            />
            <Select
              data={[
                { value: "workouts", label: "Entrenamientos completados" },
                { value: "steps", label: "Pasos caminados" },
                { value: "weight_loss", label: "Pérdida de peso" },
                { value: "custom", label: "Personalizado" },
              ]}
              label="Tipo de Reto"
              {...challengeForm.getInputProps("type")}
            />
            <NumberInput
              label="Meta"
              min={1}
              {...challengeForm.getInputProps("goal")}
            />
            <Group grow>
              <DatePickerInput
                label="Fecha Inicio"
                placeholder="Selecciona fecha"
                {...challengeForm.getInputProps("startDate")}
              />
              <DatePickerInput
                label="Fecha Fin"
                placeholder="Selecciona fecha"
                {...challengeForm.getInputProps("endDate")}
              />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button onClick={closeChallengeModal} variant="default">
                Cancelar
              </Button>
              <Button type="submit">Crear Reto</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Group Modal */}
      <Modal
        centered
        onClose={closeGroupModal}
        opened={groupModalOpened}
        title="Nuevo Grupo"
      >
        <form
          onSubmit={groupForm.onSubmit((values) => {
            console.log(values);
            closeGroupModal();
          })}
        >
          <Stack>
            <TextInput
              label="Nombre del Grupo"
              placeholder="Ej: Runners Club"
              {...groupForm.getInputProps("name")}
            />
            <Textarea
              label="Descripción"
              placeholder="Describe el grupo..."
              {...groupForm.getInputProps("description")}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeGroupModal} variant="default">
                Cancelar
              </Button>
              <Button type="submit">Crear Grupo</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
