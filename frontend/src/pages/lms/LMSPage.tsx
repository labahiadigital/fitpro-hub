import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  Image,
  Loader,
  Menu,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconAward,
  IconBook,
  IconChartBar,
  IconClock,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconFlame,
  IconPlus,
  IconSearch,
  IconStar,
  IconTarget,
  IconTrash,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  useSupabaseCertificates,
  useSupabaseChallenges,
  useSupabaseCourseEnrollments,
  useSupabaseCourses,
  useSupabaseInstructors,
} from "../../hooks/useSupabaseData";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  thumbnail_url: string;
  category: string;
  difficulty: string;
  is_free: boolean;
  price: number;
  currency: string;
  is_published: boolean;
  is_featured: boolean;
  estimated_duration_hours: number;
  total_lessons: number;
  enrolled_count: number;
  completed_count: number;
  average_rating: number;
  reviews_count: number;
  created_at: string;
}

interface Challenge {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  thumbnail_url: string;
  banner_url: string;
  challenge_type: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  is_free: boolean;
  price: number;
  is_published: boolean;
  has_leaderboard: boolean;
  participants_count: number;
  completed_count: number;
  created_at: string;
}

// Datos de ejemplo para demostración
const demoCourses: Course[] = [
  {
    id: "1",
    title: "Fundamentos del Entrenamiento de Fuerza",
    slug: "fundamentos-entrenamiento-fuerza",
    description: "Aprende los principios básicos del entrenamiento de fuerza",
    short_description: "Curso completo de entrenamiento de fuerza para principiantes",
    thumbnail_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400",
    category: "Entrenamiento",
    difficulty: "beginner",
    is_free: false,
    price: 49.99,
    currency: "EUR",
    is_published: true,
    is_featured: true,
    estimated_duration_hours: 12,
    total_lessons: 24,
    enrolled_count: 156,
    completed_count: 89,
    average_rating: 4.8,
    reviews_count: 45,
    created_at: "2025-01-01",
  },
  {
    id: "2",
    title: "Nutrición Deportiva Avanzada",
    slug: "nutricion-deportiva-avanzada",
    description: "Domina la nutrición para optimizar tu rendimiento",
    short_description: "Estrategias nutricionales para atletas y deportistas",
    thumbnail_url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400",
    category: "Nutrición",
    difficulty: "advanced",
    is_free: false,
    price: 79.99,
    currency: "EUR",
    is_published: true,
    is_featured: false,
    estimated_duration_hours: 18,
    total_lessons: 36,
    enrolled_count: 98,
    completed_count: 42,
    average_rating: 4.9,
    reviews_count: 28,
    created_at: "2025-01-10",
  },
  {
    id: "3",
    title: "Introducción al CrossFit",
    slug: "introduccion-crossfit",
    description: "Descubre los fundamentos del CrossFit",
    short_description: "Curso gratuito para iniciarte en CrossFit",
    thumbnail_url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400",
    category: "CrossFit",
    difficulty: "beginner",
    is_free: true,
    price: 0,
    currency: "EUR",
    is_published: true,
    is_featured: false,
    estimated_duration_hours: 4,
    total_lessons: 8,
    enrolled_count: 324,
    completed_count: 198,
    average_rating: 4.6,
    reviews_count: 67,
    created_at: "2025-01-15",
  },
];

const demoChallenges: Challenge[] = [
  {
    id: "1",
    title: "Reto 30 Días Transformación",
    slug: "reto-30-dias-transformacion",
    description: "Transforma tu cuerpo en 30 días con nuestro programa intensivo",
    short_description: "El reto definitivo de transformación física",
    thumbnail_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400",
    banner_url: "",
    challenge_type: "transformation",
    duration_days: 30,
    start_date: "2026-02-01",
    end_date: "2026-03-02",
    is_free: false,
    price: 29.99,
    is_published: true,
    has_leaderboard: true,
    participants_count: 87,
    completed_count: 0,
    created_at: "2025-12-15",
  },
  {
    id: "2",
    title: "Desafío Nutrición Limpia",
    slug: "desafio-nutricion-limpia",
    description: "21 días de alimentación saludable y consciente",
    short_description: "Mejora tu alimentación en 21 días",
    thumbnail_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
    banner_url: "",
    challenge_type: "nutrition",
    duration_days: 21,
    start_date: "2026-01-15",
    end_date: "2026-02-05",
    is_free: true,
    price: 0,
    is_published: true,
    has_leaderboard: false,
    participants_count: 156,
    completed_count: 45,
    created_at: "2025-12-20",
  },
];

function CourseCard({ course }: { course: Course }) {
  const difficultyColors: Record<string, string> = {
    beginner: "green",
    intermediate: "yellow",
    advanced: "red",
  };

  const difficultyLabels: Record<string, string> = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src={course.thumbnail_url}
          height={160}
          alt={course.title}
          fallbackSrc="https://placehold.co/400x160?text=Curso"
        />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={600} lineClamp={1} style={{ flex: 1 }}>
          {course.title}
        </Text>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEye size={14} />}>Ver curso</Menu.Item>
            <Menu.Item leftSection={<IconEdit size={14} />}>Editar</Menu.Item>
            <Menu.Item leftSection={<IconChartBar size={14} />}>Estadísticas</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
              Eliminar
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Group gap="xs" mb="sm">
        <Badge color={difficultyColors[course.difficulty]} size="sm">
          {difficultyLabels[course.difficulty]}
        </Badge>
        {course.is_free ? (
          <Badge color="teal" size="sm">
            Gratis
          </Badge>
        ) : (
          <Badge color="blue" size="sm">
            {course.price}€
          </Badge>
        )}
        {course.is_featured && (
          <Badge color="orange" size="sm">
            Destacado
          </Badge>
        )}
        {!course.is_published && (
          <Badge color="gray" size="sm">
            Borrador
          </Badge>
        )}
      </Group>

      <Text size="sm" c="dimmed" lineClamp={2} mb="md">
        {course.short_description}
      </Text>

      <Group gap="lg" mb="md">
        <Group gap={4}>
          <IconClock size={14} color="gray" />
          <Text size="xs" c="dimmed">
            {course.estimated_duration_hours}h
          </Text>
        </Group>
        <Group gap={4}>
          <IconBook size={14} color="gray" />
          <Text size="xs" c="dimmed">
            {course.total_lessons} lecciones
          </Text>
        </Group>
        <Group gap={4}>
          <IconUsers size={14} color="gray" />
          <Text size="xs" c="dimmed">
            {course.enrolled_count}
          </Text>
        </Group>
      </Group>

      <Group gap={4}>
        <IconStar size={14} color="#fab005" fill="#fab005" />
        <Text size="sm" fw={500}>
          {course.average_rating.toFixed(1)}
        </Text>
        <Text size="xs" c="dimmed">
          ({course.reviews_count} reseñas)
        </Text>
      </Group>
    </Card>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const typeColors: Record<string, string> = {
    fitness: "blue",
    nutrition: "green",
    wellness: "violet",
    transformation: "orange",
    custom: "gray",
  };

  const typeLabels: Record<string, string> = {
    fitness: "Fitness",
    nutrition: "Nutrición",
    wellness: "Bienestar",
    transformation: "Transformación",
    custom: "Personalizado",
  };

  const isActive = challenge.start_date && new Date(challenge.start_date) <= new Date() && new Date(challenge.end_date) >= new Date();
  const isUpcoming = challenge.start_date && new Date(challenge.start_date) > new Date();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src={challenge.thumbnail_url}
          height={160}
          alt={challenge.title}
          fallbackSrc="https://placehold.co/400x160?text=Reto"
        />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={600} lineClamp={1} style={{ flex: 1 }}>
          {challenge.title}
        </Text>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEye size={14} />}>Ver reto</Menu.Item>
            <Menu.Item leftSection={<IconEdit size={14} />}>Editar</Menu.Item>
            <Menu.Item leftSection={<IconTrophy size={14} />}>Leaderboard</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
              Eliminar
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Group gap="xs" mb="sm">
        <Badge color={typeColors[challenge.challenge_type]} size="sm">
          {typeLabels[challenge.challenge_type]}
        </Badge>
        <Badge color="gray" size="sm" variant="outline">
          {challenge.duration_days} días
        </Badge>
        {isActive && (
          <Badge color="green" size="sm">
            En curso
          </Badge>
        )}
        {isUpcoming && (
          <Badge color="blue" size="sm">
            Próximamente
          </Badge>
        )}
        {challenge.is_free ? (
          <Badge color="teal" size="sm">
            Gratis
          </Badge>
        ) : (
          <Badge color="blue" size="sm">
            {challenge.price}€
          </Badge>
        )}
      </Group>

      <Text size="sm" c="dimmed" lineClamp={2} mb="md">
        {challenge.short_description}
      </Text>

      <Group gap="lg" mb="md">
        <Group gap={4}>
          <IconUsers size={14} color="gray" />
          <Text size="xs" c="dimmed">
            {challenge.participants_count} participantes
          </Text>
        </Group>
        {challenge.has_leaderboard && (
          <Group gap={4}>
            <IconTrophy size={14} color="orange" />
            <Text size="xs" c="dimmed">
              Leaderboard
            </Text>
          </Group>
        )}
      </Group>

      {challenge.start_date && (
        <Text size="xs" c="dimmed">
          Inicio: {new Date(challenge.start_date).toLocaleDateString("es-ES")}
        </Text>
      )}
    </Card>
  );
}

export function LMSPage() {
  const [activeTab, setActiveTab] = useState<string | null>("courses");
  const [searchQuery, setSearchQuery] = useState("");

  // Hooks de Supabase
  const { data: supabaseCourses, isLoading: isLoadingCourses } = useSupabaseCourses();
  const { data: supabaseChallenges, isLoading: isLoadingChallenges } = useSupabaseChallenges();
  const { data: enrollments } = useSupabaseCourseEnrollments();
  const { data: certificates } = useSupabaseCertificates();
  const { data: instructors } = useSupabaseInstructors();

  // Usar datos de Supabase o demo
  const courses = supabaseCourses?.length ? supabaseCourses : demoCourses;
  const challenges = supabaseChallenges?.length ? supabaseChallenges : demoChallenges;

  const isLoading = isLoadingCourses || isLoadingChallenges;

  // Filtrar por búsqueda
  const filteredCourses = courses.filter((course: Course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChallenges = challenges.filter((challenge: Challenge) =>
    challenge.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Estadísticas
  const stats = {
    totalCourses: courses.length,
    publishedCourses: courses.filter((c: Course) => c.is_published).length,
    totalChallenges: challenges.length,
    activeChallenges: challenges.filter((c: Challenge) => c.is_published).length,
    totalEnrollments: enrollments?.length || 0,
    totalCertificates: certificates?.length || 0,
  };

  return (
    <Container py="xl" size="xl">
      <PageHeader
        title="Academia / LMS"
        description="Gestiona tus cursos, formaciones y retos"
        action={
          <Group>
            <Button leftSection={<IconFlame size={16} />} variant="light" color="orange">
              Nuevo Reto
            </Button>
            <Button leftSection={<IconPlus size={16} />}>Nuevo Curso</Button>
          </Group>
        }
      />

      {/* Estadísticas */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} mb="xl">
        <Paper p="md" radius="md" withBorder>
          <Group gap="xs">
            <IconBook size={20} color="var(--mantine-color-blue-6)" />
            <div>
              <Text size="xl" fw={700}>
                {stats.totalCourses}
              </Text>
              <Text size="xs" c="dimmed">
                Cursos
              </Text>
            </div>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="xs">
            <IconTarget size={20} color="var(--mantine-color-orange-6)" />
            <div>
              <Text size="xl" fw={700}>
                {stats.totalChallenges}
              </Text>
              <Text size="xs" c="dimmed">
                Retos
              </Text>
            </div>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="xs">
            <IconUsers size={20} color="var(--mantine-color-green-6)" />
            <div>
              <Text size="xl" fw={700}>
                {stats.totalEnrollments}
              </Text>
              <Text size="xs" c="dimmed">
                Inscripciones
              </Text>
            </div>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="xs">
            <IconAward size={20} color="var(--mantine-color-violet-6)" />
            <div>
              <Text size="xl" fw={700}>
                {stats.totalCertificates}
              </Text>
              <Text size="xs" c="dimmed">
                Certificados
              </Text>
            </div>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="xs">
            <IconStar size={20} color="var(--mantine-color-yellow-6)" />
            <div>
              <Text size="xl" fw={700}>
                {instructors?.length || 0}
              </Text>
              <Text size="xs" c="dimmed">
                Instructores
              </Text>
            </div>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="xs">
            <IconChartBar size={20} color="var(--mantine-color-teal-6)" />
            <div>
              <Text size="xl" fw={700}>
                {stats.publishedCourses}
              </Text>
              <Text size="xs" c="dimmed">
                Publicados
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Búsqueda y filtros */}
      <Group mb="xl">
        <TextInput
          placeholder="Buscar cursos o retos..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
      </Group>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="xl">
          <Tabs.Tab value="courses" leftSection={<IconBook size={16} />}>
            Cursos ({courses.length})
          </Tabs.Tab>
          <Tabs.Tab value="challenges" leftSection={<IconFlame size={16} />}>
            Retos ({challenges.length})
          </Tabs.Tab>
          <Tabs.Tab value="enrollments" leftSection={<IconUsers size={16} />}>
            Inscripciones
          </Tabs.Tab>
          <Tabs.Tab value="certificates" leftSection={<IconAward size={16} />}>
            Certificados
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="courses">
          {isLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : filteredCourses.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconBook size={48} color="gray" />
                <Text c="dimmed">No hay cursos disponibles</Text>
                <Button leftSection={<IconPlus size={16} />}>Crear primer curso</Button>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {filteredCourses.map((course: Course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="challenges">
          {isLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : filteredChallenges.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconFlame size={48} color="gray" />
                <Text c="dimmed">No hay retos disponibles</Text>
                <Button leftSection={<IconPlus size={16} />} color="orange">
                  Crear primer reto
                </Button>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {filteredChallenges.map((challenge: Challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="enrollments">
          <Paper p="xl" radius="md" withBorder>
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconUsers size={48} color="gray" />
                <Text c="dimmed">
                  {enrollments?.length || 0} inscripciones totales
                </Text>
                <Text size="sm" c="dimmed">
                  Gestiona las inscripciones de tus alumnos en cursos y retos
                </Text>
              </Stack>
            </Center>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="certificates">
          <Paper p="xl" radius="md" withBorder>
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconAward size={48} color="gray" />
                <Text c="dimmed">
                  {certificates?.length || 0} certificados emitidos
                </Text>
                <Text size="sm" c="dimmed">
                  Gestiona y verifica los certificados de tus alumnos
                </Text>
              </Stack>
            </Center>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
