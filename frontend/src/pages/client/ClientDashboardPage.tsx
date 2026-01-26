import {
  Box,
  Card,
  Grid,
  Group,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Badge,
  Paper,
  ThemeIcon,
  Timeline,
  Button,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconBarbell,
  IconCalendarEvent,
  IconChartLine,
  IconFlame,
  IconMessage,
  IconSalad,
  IconTarget,
  IconTrendingUp,
  IconClock,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useClientDashboard } from "../../hooks/useClientPortal";
import { useNavigate } from "react-router-dom";

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subvalue, 
  color = "yellow" 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subvalue?: string;
  color?: string;
}) {
  return (
    <Card shadow="sm" padding="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={500}>{label}</Text>
        <ThemeIcon variant="light" color={color} size="md" radius="md">
          <Icon size={16} />
        </ThemeIcon>
      </Group>
      <Text size="xl" fw={700}>{value}</Text>
      {subvalue && <Text size="xs" c="dimmed">{subvalue}</Text>}
    </Card>
  );
}

function NutrientProgress({ 
  label, 
  current, 
  target, 
  color, 
  unit = "g" 
}: { 
  label: string; 
  current: number; 
  target: number; 
  color: string;
  unit?: string;
}) {
  const percentage = Math.min((current / target) * 100, 100);
  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="sm" fw={500}>{label}</Text>
        <Text size="sm" c="dimmed">{current}/{target}{unit}</Text>
      </Group>
      <Progress value={percentage} color={color} size="sm" radius="xl" />
    </Box>
  );
}

export function ClientDashboardPage() {
  const { data: dashboardData, isLoading } = useClientDashboard();
  const navigate = useNavigate();
  
  // Fallback data while loading or if no data
  const firstName = dashboardData?.full_name?.split(" ")[0] || "Cliente";
  
  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  // Use dashboard data or fallback defaults
  const data = {
    nextSession: dashboardData?.next_session,
    weekProgress: dashboardData?.week_progress || { workouts_completed: 0, workouts_total: 4, calories_burned: 0 },
    nutritionToday: dashboardData?.nutrition_today || {
      calories: { current: 0, target: 2000 },
      protein: { current: 0, target: 140 },
      carbs: { current: 0, target: 250 },
      fats: { current: 0, target: 70 },
    },
    goals: dashboardData?.goals || { primary: "Sin objetivo", progress: 0, start_weight: 0, current_weight: 0, target_weight: 0 },
    recentActivity: dashboardData?.recent_activity || [],
    upcomingSessions: dashboardData?.upcoming_sessions || [],
  };

  return (
    <Box p="xl">
      {/* Welcome Section */}
      <Box mb="xl">
        <Title order={2} mb={4}>
          ¡Hola, {firstName}! 👋
        </Title>
        <Text c="dimmed" size="lg">
          {data.weekProgress.workouts_completed > 0 
            ? "Tu progreso esta semana va genial. ¡Sigue así!"
            : "¡Comienza tu semana con energía!"}
        </Text>
      </Box>

      {/* Next Session Banner */}
      {data.nextSession && (
        <Paper
          p="lg"
          radius="lg"
          mb="xl"
          style={{
            background: "linear-gradient(135deg, #E7E247 0%, #D4CF2E 100%)",
            color: "#2A2822",
          }}
        >
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" fw={600} style={{ opacity: 0.8 }}>
                PRÓXIMA SESIÓN
              </Text>
              <Title order={3} mt={4}>{data.nextSession.title}</Title>
              <Group gap="xs" mt="xs">
                <IconClock size={16} />
                <Text size="sm" fw={500}>{new Date(data.nextSession.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                {data.nextSession.location && <Text size="sm">en {data.nextSession.location}</Text>}
              </Group>
            </Box>
            <Button 
              variant="white" 
              color="dark"
              leftSection={<IconPlayerPlay size={16} />}
              radius="md"
            >
              Ver detalles
            </Button>
          </Group>
        </Paper>
      )}

      <Grid gutter="lg">
        {/* Left Column - Stats & Progress */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          {/* Weekly Stats */}
          <SimpleGrid cols={{ base: 2, sm: 3 }} mb="lg">
            <StatCard
              icon={IconBarbell}
              label="Entrenamientos"
              value={`${data.weekProgress.workouts_completed}/${data.weekProgress.workouts_total}`}
              subvalue="esta semana"
              color="blue"
            />
            <StatCard
              icon={IconFlame}
              label="Calorías quemadas"
              value={data.weekProgress.calories_burned.toLocaleString()}
              subvalue="esta semana"
              color="orange"
            />
            <StatCard
              icon={IconTarget}
              label="Objetivo"
              value={`${data.goals.progress}%`}
              subvalue={data.goals.primary}
              color="green"
            />
          </SimpleGrid>

          {/* Nutrition Today */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder mb="lg">
            <Group justify="space-between" mb="lg">
              <Box>
                <Text fw={600} size="lg">Nutrición Hoy</Text>
                <Text size="sm" c="dimmed">Tu progreso diario de macros</Text>
              </Box>
              <RingProgress
                size={80}
                thickness={8}
                roundCaps
                sections={[
                  { value: (data.nutritionToday.calories.current / data.nutritionToday.calories.target) * 100, color: "yellow" }
                ]}
                label={
                  <Text ta="center" size="xs" fw={700}>
                    {Math.round((data.nutritionToday.calories.current / data.nutritionToday.calories.target) * 100)}%
                  </Text>
                }
              />
            </Group>
            
            <Stack gap="md">
              <NutrientProgress
                label="Calorías"
                current={data.nutritionToday.calories.current}
                target={data.nutritionToday.calories.target}
                color="yellow"
                unit=" kcal"
              />
              <NutrientProgress
                label="Proteínas"
                current={data.nutritionToday.protein.current}
                target={data.nutritionToday.protein.target}
                color="red"
              />
              <NutrientProgress
                label="Carbohidratos"
                current={data.nutritionToday.carbs.current}
                target={data.nutritionToday.carbs.target}
                color="blue"
              />
              <NutrientProgress
                label="Grasas"
                current={data.nutritionToday.fats.current}
                target={data.nutritionToday.fats.target}
                color="green"
              />
            </Stack>
          </Card>

          {/* Progress Card */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Group justify="space-between" mb="lg">
              <Box>
                <Text fw={600} size="lg">Mi Progreso</Text>
                <Text size="sm" c="dimmed">{data.goals.primary}</Text>
              </Box>
              <Badge color="green" variant="light" size="lg">
                <Group gap={4}>
                  <IconTrendingUp size={14} />
                  {data.goals.current_weight - data.goals.start_weight > 0 ? "+" : ""}{(data.goals.current_weight - data.goals.start_weight).toFixed(1)}kg
                </Group>
              </Badge>
            </Group>

            <Group justify="space-between" mb="sm">
              <Box>
                <Text size="xs" c="dimmed">Inicio</Text>
                <Text fw={600}>{data.goals.start_weight}kg</Text>
              </Box>
              <Box ta="center">
                <Text size="xs" c="dimmed">Actual</Text>
                <Text fw={700} size="xl" c="yellow.6">{data.goals.current_weight}kg</Text>
              </Box>
              <Box ta="right">
                <Text size="xs" c="dimmed">Objetivo</Text>
                <Text fw={600}>{data.goals.target_weight}kg</Text>
              </Box>
            </Group>

            <Progress 
              value={data.goals.progress} 
              size="lg" 
              radius="xl" 
              color="yellow"
              mb="xs"
            />
            <Text size="xs" c="dimmed" ta="center">
              {data.goals.progress}% completado - ¡Vas muy bien!
            </Text>
          </Card>
        </Grid.Col>

        {/* Right Column - Activity & Sessions */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          {/* Upcoming Sessions */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder mb="lg">
            <Text fw={600} size="lg" mb="md">Próximas Sesiones</Text>
            <Stack gap="sm">
              {data.upcomingSessions.length > 0 ? data.upcomingSessions.map((session, index) => (
                <Paper key={index} p="sm" radius="md" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <Box>
                      <Text size="sm" fw={600}>{session.type}</Text>
                      <Group gap={4}>
                        <IconClock size={12} />
                        <Text size="xs" c="dimmed">{new Date(session.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                      </Group>
                    </Box>
                    <Badge variant="light" color="gray" size="sm">
                      {session.duration}
                    </Badge>
                  </Group>
                </Paper>
              )) : (
                <Text size="sm" c="dimmed" ta="center">No hay sesiones programadas</Text>
              )}
            </Stack>
            <Button variant="light" fullWidth mt="md" color="yellow" onClick={() => navigate("/my-calendar")}>
              Ver calendario completo
            </Button>
          </Card>

          {/* Recent Activity */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder>
            <Text fw={600} size="lg" mb="md">Actividad Reciente</Text>
            {data.recentActivity.length > 0 ? (
              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                {data.recentActivity.map((activity, index) => (
                  <Timeline.Item
                    key={index}
                    bullet={<IconCalendarEvent size={12} />}
                    title={<Text size="sm" fw={500}>{activity.title}</Text>}
                  >
                    <Text size="xs" c="dimmed">{activity.time}</Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Text size="sm" c="dimmed" ta="center">Sin actividad reciente</Text>
            )}
          </Card>

          {/* Quick Actions */}
          <Card shadow="sm" padding="lg" radius="lg" withBorder mt="lg">
            <Text fw={600} size="lg" mb="md">Acciones Rápidas</Text>
            <Stack gap="sm">
              <Button 
                variant="light" 
                leftSection={<IconBarbell size={16} />}
                fullWidth
                justify="flex-start"
                onClick={() => navigate("/my-workouts")}
              >
                Ver mi entrenamiento de hoy
              </Button>
              <Button 
                variant="light" 
                leftSection={<IconSalad size={16} />}
                fullWidth
                justify="flex-start"
                color="green"
                onClick={() => navigate("/my-nutrition")}
              >
                Registrar comida
              </Button>
              <Button 
                variant="light" 
                leftSection={<IconMessage size={16} />}
                fullWidth
                justify="flex-start"
                color="blue"
                onClick={() => navigate("/chat")}
              >
                Mensaje a mi entrenador
              </Button>
              <Button 
                variant="light" 
                leftSection={<IconChartLine size={16} />}
                fullWidth
                justify="flex-start"
                color="violet"
                onClick={() => navigate("/my-progress")}
              >
                Registrar progreso
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
