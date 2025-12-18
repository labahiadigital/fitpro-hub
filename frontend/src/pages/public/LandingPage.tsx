import {
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBarbell,
  IconBrandAndroid,
  IconBrandApple,
  IconCalendarEvent,
  IconChartBar,
  IconCheck,
  IconCreditCard,
  IconMessage,
  IconRobot,
  IconSalad,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: <IconUsers size={24} />,
    title: "Gestión de Clientes",
    description:
      "CRM completo con fichas, historial, tags y segmentación automática.",
  },
  {
    icon: <IconCalendarEvent size={24} />,
    title: "Calendario Inteligente",
    description: "Reservas online, lista de espera, recordatorios automáticos.",
  },
  {
    icon: <IconBarbell size={24} />,
    title: "Entrenamientos",
    description:
      "Constructor visual de rutinas, biblioteca de ejercicios con videos.",
  },
  {
    icon: <IconSalad size={24} />,
    title: "Nutrición",
    description:
      "Planes nutricionales personalizados, lista de la compra automática.",
  },
  {
    icon: <IconMessage size={24} />,
    title: "Chat Integrado",
    description: "Comunicación directa con clientes, mensajes programados.",
  },
  {
    icon: <IconCreditCard size={24} />,
    title: "Pagos y Suscripciones",
    description:
      "Cobros automáticos con Stripe, bonos de sesiones, facturación.",
  },
  {
    icon: <IconRobot size={24} />,
    title: "Automatizaciones",
    description:
      "Workflows automáticos para onboarding, recordatorios y seguimiento.",
  },
  {
    icon: <IconChartBar size={24} />,
    title: "Reportes y Analytics",
    description:
      "Dashboard con KPIs, ingresos, retención y métricas de negocio.",
  },
];

const testimonials = [
  {
    name: "María García",
    role: "Entrenadora Personal",
    content:
      "FitPro Hub ha transformado mi negocio. Ahora gestiono 50 clientes sin estrés.",
    avatar: null,
    rating: 5,
  },
  {
    name: "Carlos Rodríguez",
    role: "Dueño de Gimnasio",
    content:
      "La mejor inversión para mi estudio. Los pagos automáticos me ahorran horas.",
    avatar: null,
    rating: 5,
  },
  {
    name: "Ana Martínez",
    role: "Nutricionista",
    content:
      "Mis clientes adoran la app. La comunicación es fluida y profesional.",
    avatar: null,
    rating: 5,
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: 29,
    description: "Para profesionales que empiezan",
    features: [
      "Hasta 30 clientes",
      "Calendario y reservas",
      "Chat con clientes",
      "Entrenamientos básicos",
      "Soporte por email",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: 59,
    description: "Para profesionales establecidos",
    features: [
      "Clientes ilimitados",
      "Todo de Starter",
      "Automatizaciones",
      "Nutrición y planes",
      "Pagos con Stripe",
      "Reportes avanzados",
      "Soporte prioritario",
    ],
    highlighted: true,
  },
  {
    name: "Business",
    price: 99,
    description: "Para centros y equipos",
    features: [
      "Todo de Pro",
      "Multi-usuario (5 incluidos)",
      "Branding personalizado",
      "API access",
      "Onboarding dedicado",
      "Soporte 24/7",
    ],
    highlighted: false,
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero Section */}
      <Box
        style={{
          background:
            "linear-gradient(135deg, var(--mantine-color-primary-9) 0%, var(--mantine-color-primary-7) 100%)",
          color: "white",
          padding: "80px 0",
        }}
      >
        <Container size="lg">
          <SimpleGrid
            cols={{ base: 1, md: 2 }}
            spacing="xl"
            style={{ alignItems: "center" }}
          >
            <Stack gap="xl">
              <Badge color="white" size="lg" variant="light">
                🚀 La plataforma #1 para fitness professionals
              </Badge>
              <Title fw={800} order={1} size={48}>
                Gestiona tu negocio fitness como un profesional
              </Title>
              <Text size="xl" style={{ opacity: 0.9 }}>
                Todo lo que necesitas para gestionar clientes, entrenamientos,
                pagos y comunicaciones en una sola plataforma.
              </Text>
              <Group gap="md">
                <Button
                  color="dark"
                  onClick={() => navigate("/register")}
                  rightSection={<IconArrowRight size={18} />}
                  size="lg"
                  variant="white"
                >
                  Empieza Gratis
                </Button>
                <Button color="white" size="lg" variant="outline">
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
                p="md"
                radius="lg"
                shadow="xl"
                style={{
                  background: "white",
                  transform: "perspective(1000px) rotateY(-5deg)",
                }}
              >
                <Box
                  style={{
                    background: "var(--mantine-color-gray-1)",
                    borderRadius: 8,
                    height: 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
      <Container py={80} size="lg">
        <Stack align="center" mb={60}>
          <Badge size="lg" variant="light">
            Funcionalidades
          </Badge>
          <Title order={2} ta="center">
            Todo lo que necesitas para crecer
          </Title>
          <Text c="dimmed" maw={600} size="lg" ta="center">
            Una plataforma completa diseñada específicamente para profesionales
            del fitness, wellness y salud.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
          {features.map((feature) => (
            <Paper key={feature.title} p="lg" radius="md" withBorder>
              <ThemeIcon
                color="primary"
                mb="md"
                radius="md"
                size="xl"
                variant="light"
              >
                {feature.icon}
              </ThemeIcon>
              <Text fw={600} mb="xs">
                {feature.title}
              </Text>
              <Text c="dimmed" size="sm">
                {feature.description}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Container>

      {/* Pricing Section */}
      <Box bg="gray.0" py={80}>
        <Container size="lg">
          <Stack align="center" mb={60}>
            <Badge size="lg" variant="light">
              Precios
            </Badge>
            <Title order={2} ta="center">
              Planes para cada etapa de tu negocio
            </Title>
            <Text c="dimmed" maw={600} size="lg" ta="center">
              Empieza gratis y escala según crezcas. Sin compromisos.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
            {pricingPlans.map((plan) => (
              <Paper
                key={plan.name}
                p="xl"
                radius="lg"
                style={{
                  borderColor: plan.highlighted
                    ? "var(--mantine-color-primary-5)"
                    : undefined,
                  borderWidth: plan.highlighted ? 2 : 1,
                  position: "relative",
                }}
                withBorder
              >
                {plan.highlighted && (
                  <Badge
                    color="primary"
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    Más Popular
                  </Badge>
                )}
                <Stack gap="md">
                  <div>
                    <Text fw={600} size="lg">
                      {plan.name}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {plan.description}
                    </Text>
                  </div>
                  <Group align="baseline" gap={4}>
                    <Text fw={800} size="xl" style={{ fontSize: 40 }}>
                      €{plan.price}
                    </Text>
                    <Text c="dimmed">/mes</Text>
                  </Group>
                  <Divider />
                  <List
                    icon={
                      <ThemeIcon color="green" radius="xl" size="sm">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                    spacing="sm"
                  >
                    {plan.features.map((feature) => (
                      <List.Item key={feature}>
                        <Text size="sm">{feature}</Text>
                      </List.Item>
                    ))}
                  </List>
                  <Button
                    fullWidth
                    mt="auto"
                    variant={plan.highlighted ? "filled" : "outline"}
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
      <Container py={80} size="lg">
        <Stack align="center" mb={60}>
          <Badge size="lg" variant="light">
            Testimonios
          </Badge>
          <Title order={2} ta="center">
            Lo que dicen nuestros usuarios
          </Title>
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {testimonials.map((testimonial) => (
            <Paper key={testimonial.name} p="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group gap={4}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <IconStar color="gold" fill="gold" key={i} size={16} />
                  ))}
                </Group>
                <Text size="sm" style={{ fontStyle: "italic" }}>
                  "{testimonial.content}"
                </Text>
                <Group gap="sm">
                  <Avatar color="primary" radius="xl">
                    {testimonial.name.charAt(0)}
                  </Avatar>
                  <div>
                    <Text fw={500} size="sm">
                      {testimonial.name}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {testimonial.role}
                    </Text>
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
          background:
            "linear-gradient(135deg, var(--mantine-color-primary-9) 0%, var(--mantine-color-primary-7) 100%)",
          color: "white",
          padding: "80px 0",
        }}
      >
        <Container size="sm" ta="center">
          <Title mb="md" order={2}>
            ¿Listo para transformar tu negocio?
          </Title>
          <Text mb="xl" size="lg" style={{ opacity: 0.9 }}>
            Únete a miles de profesionales que ya usan FitPro Hub para gestionar
            su negocio de forma eficiente.
          </Text>
          <Group gap="md" justify="center">
            <Button
              color="dark"
              onClick={() => navigate("/register")}
              rightSection={<IconArrowRight size={18} />}
              size="lg"
              variant="white"
            >
              Crear Cuenta Gratis
            </Button>
            <Button color="white" size="lg" variant="outline">
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
              <Text fw={700} size="lg">
                FitPro Hub
              </Text>
              <Text c="gray.5" size="sm">
                La plataforma todo-en-uno para profesionales del fitness.
              </Text>
            </Stack>
            <Stack gap="xs">
              <Text fw={600} mb="xs">
                Producto
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Funcionalidades
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Precios
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Integraciones
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                API
              </Text>
            </Stack>
            <Stack gap="xs">
              <Text fw={600} mb="xs">
                Recursos
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Blog
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Guías
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Webinars
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Centro de Ayuda
              </Text>
            </Stack>
            <Stack gap="xs">
              <Text fw={600} mb="xs">
                Legal
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Términos
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Privacidad
              </Text>
              <Text c="gray.5" size="sm" style={{ cursor: "pointer" }}>
                Cookies
              </Text>
            </Stack>
          </SimpleGrid>
          <Divider color="gray.7" my="xl" />
          <Text c="gray.5" size="sm" ta="center">
            © 2024 FitPro Hub. Todos los derechos reservados.
          </Text>
        </Container>
      </Box>
    </Box>
  );
}
