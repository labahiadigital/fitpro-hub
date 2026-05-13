import {
  Alert,
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
  IconAlertCircle,
  IconBarbell,
  IconCalendarEvent,
  IconChartLine,
  IconDownload,
  IconFlame,
  IconMessage,
  IconPill,
  IconSalad,
  IconTarget,
  IconTrendingUp,
  IconClock,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useClientDashboard, useClientProfile } from "../../hooks/useClientPortal";
import { useNavigate } from "react-router-dom";
import { generateClientPlanPDF } from "../../services/pdfGenerator";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/auth";
import { formatDecimal } from "../../utils/format";

// Shape mínima del item de la "Cesta de suplementos" que el endpoint
// ``GET /my/supplements`` devuelve. Definida aquí para no acoplar este
// dashboard con el archivo donde vive la pestaña completa.
interface DashboardSupplementItem {
  id: string;
  name: string;
  brand?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  is_active: boolean;
}

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
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
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
  const { data: profileData } = useClientProfile();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Suplementos asignados por el entrenador. Antes solo eran accesibles
  // bajo "Mi Nutrición → Cesta de suplementos" (pestaña terciaria) y los
  // clientes no se enteraban de que tenían suplementos pautados. Los
  // sacamos al dashboard como tarjeta destacada con un link directo a la
  // pestaña completa.
  const { data: supplementItems = [] } = useQuery<DashboardSupplementItem[]>({
    queryKey: ["my-supplements-cart", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardSupplementItem[]>(
        "/my/supplements"
      );
      return (data || []).filter((s) => s.is_active);
    },
    staleTime: 30 * 1000,
  });
  const supplementCount = supplementItems.length;
  const supplementsPreview = supplementItems.slice(0, 3);

  // Detectamos qué datos físicos faltan para mostrar un aviso al
  // cliente. Si su entrenador aún no puede calcularle la dieta
  // (objetivo calórico aleatorio), no es por error suyo: simplemente
  // faltan estos valores básicos en su ficha.
  const missingPhysical = (() => {
    if (!profileData) return [] as string[];
    const missing: string[] = [];
    if (!profileData.birth_date) missing.push("fecha de nacimiento");
    if (!profileData.gender) missing.push("género");
    const h = Number(profileData.height_cm);
    if (!Number.isFinite(h) || h <= 0) missing.push("altura");
    const w = Number(profileData.weight_kg);
    if (!Number.isFinite(w) || w <= 0) missing.push("peso");
    return missing;
  })();

  // Prefer the client's own name from the dashboard; fall back to the logged
  // user's name so the greeting never shows the generic "Cliente" label
  // while the /client/dashboard request is cached or if it returns empty.
  const rawName = dashboardData?.full_name?.trim() || user?.full_name?.trim() || "";
  const firstName = rawName ? rawName.split(" ")[0] : "";
  
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
    <Box p="xl" maw={1280} mx="auto">
      {/* Welcome Section */}
      <Box mb="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2} mb={4}>
              {firstName ? `¡Hola, ${firstName}! 👋` : "¡Hola! 👋"}
            </Title>
            <Text c="dimmed" size="lg">
              {data.weekProgress.workouts_completed > 0 
                ? "Tu progreso esta semana va genial. ¡Sigue así!"
                : "¡Comienza tu semana con energía!"}
            </Text>
          </Box>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            size="sm"
            onClick={async () => {
              const ws = useAuthStore.getState().currentWorkspace;
              await generateClientPlanPDF(null, null, {
                workspaceName: (ws as any)?.name || "Trackfiz",
                branding: (ws as any)?.branding,
                workspaceLogo: (ws as any)?.logo_url,
              });
            }}
          >
            Descargar Plan completo
          </Button>
        </Group>
      </Box>

      {/* Aviso de datos físicos incompletos. Es importante que el cliente
          vea esto en cuanto entra: sin estos datos su entrenador no puede
          calcularle la dieta y las calorías que aparecen en otras
          pantallas no son fiables. */}
      {missingPhysical.length > 0 && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="orange"
          variant="light"
          radius="md"
          mb="xl"
          title="Completa tus datos físicos"
        >
          <Stack gap="xs">
            <Text size="sm">
              Para que tu entrenador pueda calcular tu dieta nos faltan:{" "}
              <b>{missingPhysical.join(", ")}</b>.
            </Text>
            <Group>
              <Button
                size="xs"
                color="orange"
                radius="md"
                onClick={() => navigate("/my-profile")}
              >
                Completar ahora
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

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
                {data.nextSession.location && <Text size="sm">en {typeof data.nextSession.location === 'object' ? (data.nextSession.location as Record<string, unknown>)?.address as string || '' : data.nextSession.location}</Text>}
              </Group>
            </Box>
            <Button 
              variant="white" 
              color="dark"
              leftSection={<IconPlayerPlay size={16} />}
              radius="md"
              onClick={() => navigate(`/my-calendar?session=${data.nextSession?.id}`)}
            >
              Ver detalles
            </Button>
          </Group>
        </Paper>
      )}

      <Grid gap="lg">
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
              value={data.goals.target_weight > 0 ? `${data.goals.progress}%` : "—"}
              subvalue={data.goals.target_weight > 0 ? data.goals.primary : "Configura tu objetivo"}
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
                  { value: data.nutritionToday.calories.target > 0 ? Math.min((data.nutritionToday.calories.current / data.nutritionToday.calories.target) * 100, 100) : 0, color: "yellow" }
                ]}
                label={
                  <Text ta="center" size="xs" fw={700}>
                    {data.nutritionToday.calories.target > 0 ? Math.round((data.nutritionToday.calories.current / data.nutritionToday.calories.target) * 100) : 0}%
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
              {data.goals.current_weight > 0 && data.goals.start_weight > 0 && (
                <Badge
                  color={data.goals.current_weight - data.goals.start_weight === 0 ? "gray" : "green"}
                  variant="light"
                  size="lg"
                >
                  <Group gap={4}>
                    <IconTrendingUp size={14} />
                    {data.goals.current_weight - data.goals.start_weight > 0 ? "+" : ""}
                    {formatDecimal(data.goals.current_weight - data.goals.start_weight, 1)}kg
                  </Group>
                </Badge>
              )}
            </Group>

            {data.goals.current_weight > 0 ? (
              <>
                <Group justify="space-between" mb="sm">
                  <Box>
                    <Text size="xs" c="dimmed">Inicio</Text>
                    <Text fw={600}>{formatDecimal(data.goals.start_weight, 1)}kg</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xs" c="dimmed">Actual</Text>
                    <Text fw={700} size="xl" c="yellow.6">{formatDecimal(data.goals.current_weight, 1)}kg</Text>
                  </Box>
                  <Box ta="right">
                    <Text size="xs" c="dimmed">Objetivo</Text>
                    <Text fw={600}>
                      {data.goals.target_weight > 0 ? `${formatDecimal(data.goals.target_weight, 1)}kg` : "—"}
                    </Text>
                  </Box>
                </Group>

                {data.goals.target_weight > 0 ? (
                  <>
                    <Progress
                      value={data.goals.progress}
                      size="lg"
                      radius="xl"
                      color="yellow"
                      mb="xs"
                    />
                    <Text size="xs" c="dimmed" ta="center">
                      {data.goals.progress}% completado · {data.goals.progress >= 80 ? "¡Casi lo tienes!" : "¡Vas muy bien!"}
                    </Text>
                  </>
                ) : (
                  <Group justify="center" mt="sm">
                    <Button
                      variant="light"
                      color="yellow"
                      size="xs"
                      onClick={() => navigate("/my-progress")}
                    >
                      Define tu objetivo
                    </Button>
                  </Group>
                )}
              </>
            ) : (
              <Stack align="center" gap="xs" py="sm">
                <Text size="sm" c="dimmed" ta="center">
                  Aún no has registrado tu peso inicial.
                </Text>
                <Button
                  variant="light"
                  color="yellow"
                  size="sm"
                  leftSection={<IconChartLine size={14} />}
                  onClick={() => navigate("/my-progress")}
                >
                  Registrar primera medición
                </Button>
              </Stack>
            )}
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

          {/* Mis Suplementos — visible solo si el entrenador le ha asignado
              al menos uno. Antes los suplementos pautados solo se veían
              bajo "Mi Nutrición → Cesta de suplementos" y los clientes
              reportaban no encontrarlos. */}
          {supplementCount > 0 && (
            <Card shadow="sm" padding="lg" radius="lg" withBorder mb="lg">
              <Group justify="space-between" mb="sm" wrap="nowrap">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="grape" size="md" radius="md">
                    <IconPill size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">Mis Suplementos</Text>
                </Group>
                <Badge variant="light" color="grape" size="sm">
                  {supplementCount}
                </Badge>
              </Group>
              <Stack gap="xs" mb="sm">
                {supplementsPreview.map((s) => (
                  <Paper key={s.id} p="xs" radius="md" withBorder>
                    <Text size="sm" fw={600} lineClamp={1}>
                      {s.name}
                    </Text>
                    {(s.dosage || s.frequency) && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {[s.dosage, s.frequency].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </Paper>
                ))}
                {supplementCount > supplementsPreview.length && (
                  <Text size="xs" c="dimmed">
                    +{supplementCount - supplementsPreview.length} más
                  </Text>
                )}
              </Stack>
              <Button
                variant="light"
                color="grape"
                fullWidth
                leftSection={<IconPill size={16} />}
                onClick={() => navigate("/my-nutrition?tab=supplements")}
              >
                Ver detalle de suplementos
              </Button>
            </Card>
          )}

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
                onClick={() => navigate("/my-messages")}
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
              {supplementCount > 0 && (
                <Button
                  variant="light"
                  leftSection={<IconPill size={16} />}
                  fullWidth
                  justify="flex-start"
                  color="grape"
                  onClick={() => navigate("/my-nutrition?tab=supplements")}
                >
                  Mis suplementos
                </Button>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
