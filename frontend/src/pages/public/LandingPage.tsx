import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  SimpleGrid,
  ThemeIcon,
  Paper,
  Box,
  Badge,
  List,
  Divider,
  Avatar,
} from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import {
  IconCalendarEvent,
  IconUsers,
  IconBarbell,
  IconSalad,
  IconMessage,
  IconCreditCard,
  IconRobot,
  IconChartBar,
  IconCheck,
  IconStar,
  IconArrowRight,
  IconBrandApple,
  IconBrandAndroid,
} from '@tabler/icons-react'

const features = [
  {
    icon: <IconUsers size={24} />,
    title: 'Gestión de Clientes',
    description: 'CRM completo con fichas, historial, tags y segmentación automática.',
  },
  {
    icon: <IconCalendarEvent size={24} />,
    title: 'Calendario Inteligente',
    description: 'Reservas online, lista de espera, recordatorios automáticos.',
  },
  {
    icon: <IconBarbell size={24} />,
    title: 'Entrenamientos',
    description: 'Constructor visual de rutinas, biblioteca de ejercicios con videos.',
  },
  {
    icon: <IconSalad size={24} />,
    title: 'Nutrición',
    description: 'Planes nutricionales personalizados, lista de la compra automática.',
  },
  {
    icon: <IconMessage size={24} />,
    title: 'Chat Integrado',
    description: 'Comunicación directa con clientes, mensajes programados.',
  },
  {
    icon: <IconCreditCard size={24} />,
    title: 'Pagos y Suscripciones',
    description: 'Cobros automáticos con Stripe, bonos de sesiones, facturación.',
  },
  {
    icon: <IconRobot size={24} />,
    title: 'Automatizaciones',
    description: 'Workflows automáticos para onboarding, recordatorios y seguimiento.',
  },
  {
    icon: <IconChartBar size={24} />,
    title: 'Reportes y Analytics',
    description: 'Dashboard con KPIs, ingresos, retención y métricas de negocio.',
  },
]

const testimonials = [
  {
    name: 'María García',
    role: 'Entrenadora Personal',
    content: 'FitPro Hub ha transformado mi negocio. Ahora gestiono 50 clientes sin estrés.',
    avatar: null,
    rating: 5,
  },
  {
    name: 'Carlos Rodríguez',
    role: 'Dueño de Gimnasio',
    content: 'La mejor inversión para mi estudio. Los pagos automáticos me ahorran horas.',
    avatar: null,
    rating: 5,
  },
  {
    name: 'Ana Martínez',
    role: 'Nutricionista',
    content: 'Mis clientes adoran la app. La comunicación es fluida y profesional.',
    avatar: null,
    rating: 5,
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Para profesionales que empiezan',
    features: [
      'Hasta 30 clientes',
      'Calendario y reservas',
      'Chat con clientes',
      'Entrenamientos básicos',
      'Soporte por email',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 59,
    description: 'Para profesionales establecidos',
    features: [
      'Clientes ilimitados',
      'Todo de Starter',
      'Automatizaciones',
      'Nutrición y planes',
      'Pagos con Stripe',
      'Reportes avanzados',
      'Soporte prioritario',
    ],
    highlighted: true,
  },
  {
    name: 'Business',
    price: 99,
    description: 'Para centros y equipos',
    features: [
      'Todo de Pro',
      'Multi-usuario (5 incluidos)',
      'Branding personalizado',
      'API access',
      'Onboarding dedicado',
      'Soporte 24/7',
    ],
    highlighted: false,
  },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <Box>
      {/* Hero Section */}
      <Box
        style={{
          background: 'linear-gradient(135deg, var(--mantine-color-primary-9) 0%, var(--mantine-color-primary-7) 100%)',
          color: 'white',
          padding: '80px 0',
        }}
      >
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" style={{ alignItems: 'center' }}>
            <Stack gap="xl">
              <Badge size="lg" variant="light" color="white">
                🚀 La plataforma #1 para fitness professionals
              </Badge>
              <Title order={1} size={48} fw={800}>
                Gestiona tu negocio fitness como un profesional
              </Title>
              <Text size="xl" style={{ opacity: 0.9 }}>
                Todo lo que necesitas para gestionar clientes, entrenamientos, pagos y
                comunicaciones en una sola plataforma.
              </Text>
              <Group gap="md">
                <Button
                  size="lg"
                  variant="white"
                  color="dark"
                  rightSection={<IconArrowRight size={18} />}
                  onClick={() => navigate('/register')}
                >
                  Empieza Gratis
                </Button>
                <Button size="lg" variant="outline" color="white">
                  Ver Demo
                </Button>
              </Group>
              <Group gap="xl">
                <Group gap="xs">
                  <IconBrandApple size={20} />
                  <Text size="sm">iOS App</Text>
                </Group>
                <Group gap="xs">
                  <IconBrandAndroid size={20} />
                  <Text size="sm">Android App</Text>
                </Group>
              </Group>
            </Stack>
            <Box visibleFrom="md">
              <Paper
                radius="lg"
                shadow="xl"
                p="md"
                style={{
                  background: 'white',
                  transform: 'perspective(1000px) rotateY(-5deg)',
                }}
              >
                <Box
                  style={{
                    background: 'var(--mantine-color-gray-1)',
                    borderRadius: 8,
                    height: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text c="dimmed">Dashboard Preview</Text>
                </Box>
              </Paper>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container size="lg" py={80}>
        <Stack align="center" mb={60}>
          <Badge size="lg" variant="light">Funcionalidades</Badge>
          <Title order={2} ta="center">
            Todo lo que necesitas para crecer
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={600}>
            Una plataforma completa diseñada específicamente para profesionales del fitness,
            wellness y salud.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
          {features.map((feature) => (
            <Paper key={feature.title} withBorder radius="md" p="lg">
              <ThemeIcon size="xl" radius="md" variant="light" color="primary" mb="md">
                {feature.icon}
              </ThemeIcon>
              <Text fw={600} mb="xs">{feature.title}</Text>
              <Text size="sm" c="dimmed">{feature.description}</Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Container>

      {/* Pricing Section */}
      <Box bg="gray.0" py={80}>
        <Container size="lg">
          <Stack align="center" mb={60}>
            <Badge size="lg" variant="light">Precios</Badge>
            <Title order={2} ta="center">
              Planes para cada etapa de tu negocio
            </Title>
            <Text size="lg" c="dimmed" ta="center" maw={600}>
              Empieza gratis y escala según crezcas. Sin compromisos.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
            {pricingPlans.map((plan) => (
              <Paper
                key={plan.name}
                withBorder
                radius="lg"
                p="xl"
                style={{
                  borderColor: plan.highlighted ? 'var(--mantine-color-primary-5)' : undefined,
                  borderWidth: plan.highlighted ? 2 : 1,
                  position: 'relative',
                }}
              >
                {plan.highlighted && (
                  <Badge
                    color="primary"
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    Más Popular
                  </Badge>
                )}
                <Stack gap="md">
                  <div>
                    <Text fw={600} size="lg">{plan.name}</Text>
                    <Text size="sm" c="dimmed">{plan.description}</Text>
                  </div>
                  <Group align="baseline" gap={4}>
                    <Text size="xl" fw={800} style={{ fontSize: 40 }}>€{plan.price}</Text>
                    <Text c="dimmed">/mes</Text>
                  </Group>
                  <Divider />
                  <List
                    spacing="sm"
                    icon={
                      <ThemeIcon size="sm" radius="xl" color="green">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    {plan.features.map((feature) => (
                      <List.Item key={feature}>
                        <Text size="sm">{feature}</Text>
                      </List.Item>
                    ))}
                  </List>
                  <Button
                    fullWidth
                    variant={plan.highlighted ? 'filled' : 'outline'}
                    mt="auto"
                  >
                    Empezar Ahora
                  </Button>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container size="lg" py={80}>
        <Stack align="center" mb={60}>
          <Badge size="lg" variant="light">Testimonios</Badge>
          <Title order={2} ta="center">
            Lo que dicen nuestros usuarios
          </Title>
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {testimonials.map((testimonial) => (
            <Paper key={testimonial.name} withBorder radius="md" p="lg">
              <Stack gap="md">
                <Group gap={4}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <IconStar key={i} size={16} fill="gold" color="gold" />
                  ))}
                </Group>
                <Text size="sm" style={{ fontStyle: 'italic' }}>
                  "{testimonial.content}"
                </Text>
                <Group gap="sm">
                  <Avatar radius="xl" color="primary">
                    {testimonial.name.charAt(0)}
                  </Avatar>
                  <div>
                    <Text size="sm" fw={500}>{testimonial.name}</Text>
                    <Text size="xs" c="dimmed">{testimonial.role}</Text>
                  </div>
                </Group>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Container>

      {/* CTA Section */}
      <Box
        style={{
          background: 'linear-gradient(135deg, var(--mantine-color-primary-9) 0%, var(--mantine-color-primary-7) 100%)',
          color: 'white',
          padding: '80px 0',
        }}
      >
        <Container size="sm" ta="center">
          <Title order={2} mb="md">
            ¿Listo para transformar tu negocio?
          </Title>
          <Text size="lg" mb="xl" style={{ opacity: 0.9 }}>
            Únete a miles de profesionales que ya usan FitPro Hub para gestionar
            su negocio de forma eficiente.
          </Text>
          <Group justify="center" gap="md">
            <Button
              size="lg"
              variant="white"
              color="dark"
              rightSection={<IconArrowRight size={18} />}
              onClick={() => navigate('/register')}
            >
              Crear Cuenta Gratis
            </Button>
            <Button size="lg" variant="outline" color="white">
              Contactar Ventas
            </Button>
          </Group>
        </Container>
      </Box>

      {/* Footer */}
      <Box bg="gray.9" c="white" py={60}>
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
            <Stack gap="sm">
              <Text fw={700} size="lg">FitPro Hub</Text>
              <Text size="sm" c="gray.5">
                La plataforma todo-en-uno para profesionales del fitness.
              </Text>
            </Stack>
            <Stack gap="xs">
              <Text fw={600} mb="xs">Producto</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Funcionalidades</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Precios</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Integraciones</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>API</Text>
            </Stack>
            <Stack gap="xs">
              <Text fw={600} mb="xs">Recursos</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Blog</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Guías</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Webinars</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Centro de Ayuda</Text>
            </Stack>
            <Stack gap="xs">
              <Text fw={600} mb="xs">Legal</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Términos</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Privacidad</Text>
              <Text size="sm" c="gray.5" style={{ cursor: 'pointer' }}>Cookies</Text>
            </Stack>
          </SimpleGrid>
          <Divider my="xl" color="gray.7" />
          <Text size="sm" c="gray.5" ta="center">
            © 2024 FitPro Hub. Todos los derechos reservados.
          </Text>
        </Container>
      </Box>
    </Box>
  )
}

