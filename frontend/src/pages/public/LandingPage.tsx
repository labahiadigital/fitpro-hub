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
  Transition,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBarbell,
  IconBrandAndroid,
  IconBrandApple,
  IconCalendarEvent,
  IconChartBar,
  IconCheck,
  IconChevronRight,
  IconCreditCard,
  IconMessage,
  IconPlayerPlay,
  IconRobot,
  IconSalad,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: <IconUsers size={24} />,
    title: "Gestión de Clientes",
    description:
      "CRM completo con fichas, historial, tags y segmentación automática.",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    icon: <IconCalendarEvent size={24} />,
    title: "Calendario Inteligente",
    description: "Reservas online, lista de espera, recordatorios automáticos.",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    icon: <IconBarbell size={24} />,
    title: "Entrenamientos",
    description:
      "Constructor visual de rutinas, biblioteca de ejercicios con videos.",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    icon: <IconSalad size={24} />,
    title: "Nutrición",
    description:
      "Planes nutricionales personalizados, lista de la compra automática.",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
  {
    icon: <IconMessage size={24} />,
    title: "Chat Integrado",
    description: "Comunicación directa con clientes, mensajes programados.",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    icon: <IconCreditCard size={24} />,
    title: "Pagos y Suscripciones",
    description:
      "Cobros automáticos con Stripe, bonos de sesiones, facturación.",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  },
  {
    icon: <IconRobot size={24} />,
    title: "Automatizaciones",
    description:
      "Workflows automáticos para onboarding, recordatorios y seguimiento.",
    gradient: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)",
  },
  {
    icon: <IconChartBar size={24} />,
    title: "Reportes y Analytics",
    description:
      "Dashboard con KPIs, ingresos, retención y métricas de negocio.",
    gradient: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
  },
];

const testimonials = [
  {
    name: "María García",
    role: "Entrenadora Personal",
    content:
      "Trackfiz ha transformado mi negocio. Ahora gestiono 50 clientes sin estrés y mis ingresos han crecido un 40%.",
    avatar: null,
    rating: 5,
    company: "FitMaria Studio",
  },
  {
    name: "Carlos Rodríguez",
    role: "Dueño de Gimnasio",
    content:
      "La mejor inversión para mi estudio. Los pagos automáticos me ahorran horas cada semana.",
    avatar: null,
    rating: 5,
    company: "CrossFit Málaga",
  },
  {
    name: "Ana Martínez",
    role: "Nutricionista",
    content:
      "Mis clientes adoran la app. La comunicación es fluida y profesional. Recomiendo Trackfiz al 100%.",
    avatar: null,
    rating: 5,
    company: "NutriVida",
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
    badge: null,
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
    badge: "Más Popular",
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
    badge: "Enterprise",
  },
];

const stats = [
  { value: "10K+", label: "Profesionales activos" },
  { value: "500K+", label: "Sesiones gestionadas" },
  { value: "€2M+", label: "Pagos procesados" },
  { value: "99.9%", label: "Uptime garantizado" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Box style={{ overflow: "hidden" }}>
      {/* Navigation */}
      <Box
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(26, 26, 38, 0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Container size="xl">
          <Group h={72} justify="space-between">
            <Group gap="xs">
              <Box
                style={{
                  width: 36,
                  height: 36,
                  background: "linear-gradient(135deg, var(--nv-accent) 0%, #E8C547 100%)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#1a1a2e",
                }}
              >
                T
              </Box>
              <Text fw={700} size="lg" c="white">
                Trackfiz
              </Text>
            </Group>
            <Group gap="xl" visibleFrom="md">
              <Text c="gray.4" size="sm" style={{ cursor: "pointer", transition: "color 0.2s" }}>
                Funcionalidades
              </Text>
              <Text c="gray.4" size="sm" style={{ cursor: "pointer", transition: "color 0.2s" }}>
                Precios
              </Text>
              <Text c="gray.4" size="sm" style={{ cursor: "pointer", transition: "color 0.2s" }}>
                Testimonios
              </Text>
              <Text c="gray.4" size="sm" style={{ cursor: "pointer", transition: "color 0.2s" }}>
                Blog
              </Text>
            </Group>
            <Group gap="sm">
              <Button
                variant="subtle"
                color="gray"
                onClick={() => navigate("/login")}
                style={{ color: "white" }}
              >
                Iniciar Sesión
              </Button>
              <Button
                onClick={() => navigate("/register")}
                style={{
                  background: "var(--nv-accent)",
                  color: "#1a1a2e",
                  fontWeight: 600,
                }}
              >
                Empezar Gratis
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)",
          position: "relative",
          paddingTop: 72,
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Animated background elements */}
        <Box
          style={{
            position: "absolute",
            top: "20%",
            left: "10%",
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <Box
          style={{
            position: "absolute",
            bottom: "20%",
            right: "10%",
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
            animation: "float 6s ease-in-out infinite reverse",
          }}
        />

        <Container size="xl" style={{ position: "relative", zIndex: 1 }}>
          <Transition mounted={mounted} transition="fade-up" duration={800}>
            {(styles) => (
              <Box style={styles}>
                <Stack align="center" gap="xl" py={60}>
                  {/* Badge */}
                  <Badge
                    size="lg"
                    variant="outline"
                    style={{
                      borderColor: "rgba(212, 175, 55, 0.3)",
                      color: "var(--nv-accent)",
                      background: "rgba(212, 175, 55, 0.1)",
                      padding: "8px 20px",
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                    }}
                  >
                    🚀 La plataforma #1 para profesionales fitness
                  </Badge>

                  {/* Main Title */}
                  <Title
                    order={1}
                    ta="center"
                    style={{
                      fontSize: "clamp(36px, 6vw, 72px)",
                      fontWeight: 800,
                      color: "white",
                      lineHeight: 1.1,
                      maxWidth: 900,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Gestiona tu negocio fitness{" "}
                    <Text
                      component="span"
                      style={{
                        background: "linear-gradient(135deg, var(--nv-accent) 0%, #E8C547 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      como un profesional
                    </Text>
                  </Title>

                  {/* Subtitle */}
                  <Text
                    size="xl"
                    c="gray.4"
                    ta="center"
                    maw={600}
                    style={{ lineHeight: 1.7, fontSize: 18 }}
                  >
                    Todo lo que necesitas para gestionar clientes, entrenamientos,
                    pagos y comunicaciones en una sola plataforma diseñada para el éxito.
                  </Text>

                  {/* CTA Buttons */}
                  <Group gap="md" mt="md">
                    <Button
                      size="lg"
                      onClick={() => navigate("/register")}
                      rightSection={<IconArrowRight size={18} />}
                      style={{
                        background: "var(--nv-accent)",
                        color: "#1a1a2e",
                        fontWeight: 600,
                        padding: "0 32px",
                        height: 52,
                        fontSize: 16,
                        boxShadow: "0 4px 24px rgba(212, 175, 55, 0.3)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      Empieza Gratis
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      leftSection={<IconPlayerPlay size={18} />}
                      style={{
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        color: "white",
                        padding: "0 32px",
                        height: 52,
                        fontSize: 16,
                      }}
                    >
                      Ver Demo
                    </Button>
                  </Group>

                  {/* App badges */}
                  <Group gap="xl" mt="lg">
                    <Group gap="xs" style={{ opacity: 0.7 }}>
                      <IconBrandApple size={20} color="white" />
                      <Text size="sm" c="gray.4">iOS App</Text>
                    </Group>
                    <Group gap="xs" style={{ opacity: 0.7 }}>
                      <IconBrandAndroid size={20} color="white" />
                      <Text size="sm" c="gray.4">Android App</Text>
                    </Group>
                  </Group>

                  {/* Dashboard Preview */}
                  <Box
                    mt={60}
                    style={{
                      width: "100%",
                      maxWidth: 1000,
                      perspective: "1000px",
                    }}
                  >
                    <Paper
                      radius="xl"
                      style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        overflow: "hidden",
                        transform: "rotateX(5deg)",
                        boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      <Box
                        style={{
                          height: 40,
                          background: "rgba(255, 255, 255, 0.05)",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 16px",
                          gap: 8,
                        }}
                      >
                        <Box style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
                        <Box style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
                        <Box style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
                      </Box>
                      <Box
                        style={{
                          height: 400,
                          background: "linear-gradient(135deg, rgba(45, 45, 60, 0.5) 0%, rgba(30, 30, 45, 0.5) 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        {/* Mock dashboard elements */}
                        <SimpleGrid cols={3} spacing="md" p="xl" style={{ width: "100%" }}>
                          {[1, 2, 3].map((i) => (
                            <Box
                              key={i}
                              style={{
                                background: "rgba(255, 255, 255, 0.05)",
                                borderRadius: 12,
                                padding: 20,
                                border: "1px solid rgba(255, 255, 255, 0.05)",
                              }}
                            >
                              <Text size="xs" c="gray.5" mb={8}>KPI {i}</Text>
                              <Text size="xl" c="white" fw={700}>€{(Math.random() * 10000).toFixed(0)}</Text>
                              <Text size="xs" c="green.4" mt={4}>+{(Math.random() * 20).toFixed(1)}%</Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                      </Box>
                    </Paper>
                  </Box>
                </Stack>
              </Box>
            )}
          </Transition>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box
        style={{
          background: "#0f0f1a",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Container size="xl" py={60}>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xl">
            {stats.map((stat) => (
              <Stack key={stat.label} align="center" gap={4}>
                <Text
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    background: "linear-gradient(135deg, var(--nv-accent) 0%, #E8C547 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {stat.value}
                </Text>
                <Text c="gray.5" size="sm">{stat.label}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box
        style={{
          background: "linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)",
        }}
      >
        <Container size="xl" py={100}>
          <Stack align="center" mb={60}>
            <Badge
              size="lg"
              variant="outline"
              style={{
                borderColor: "rgba(212, 175, 55, 0.3)",
                color: "var(--nv-accent)",
                background: "rgba(212, 175, 55, 0.1)",
              }}
            >
              Funcionalidades
            </Badge>
            <Title
              order={2}
              ta="center"
              c="white"
              style={{ fontSize: 40, fontWeight: 700 }}
            >
              Todo lo que necesitas para crecer
            </Title>
            <Text c="gray.4" maw={600} size="lg" ta="center">
              Una plataforma completa diseñada específicamente para profesionales
              del fitness, wellness y salud.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xl">
            {features.map((feature, index) => (
              <Paper
                key={feature.title}
                p="xl"
                radius="xl"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  animationDelay: `${index * 100}ms`,
                }}
                className="feature-card"
              >
                <Box
                  mb="lg"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: feature.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    boxShadow: `0 8px 24px ${feature.gradient.includes("#667eea") ? "rgba(102, 126, 234, 0.3)" : "rgba(0, 0, 0, 0.2)"}`,
                  }}
                >
                  {feature.icon}
                </Box>
                <Text c="white" fw={600} mb="xs" size="lg">
                  {feature.title}
                </Text>
                <Text c="gray.5" size="sm" style={{ lineHeight: 1.6 }}>
                  {feature.description}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box
        style={{
          background: "#1a1a2e",
          position: "relative",
        }}
      >
        <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />
        <Container size="xl" py={100} style={{ position: "relative", zIndex: 1 }}>
          <Stack align="center" mb={60}>
            <Badge
              size="lg"
              variant="outline"
              style={{
                borderColor: "rgba(212, 175, 55, 0.3)",
                color: "var(--nv-accent)",
                background: "rgba(212, 175, 55, 0.1)",
              }}
            >
              Precios
            </Badge>
            <Title
              order={2}
              ta="center"
              c="white"
              style={{ fontSize: 40, fontWeight: 700 }}
            >
              Planes para cada etapa de tu negocio
            </Title>
            <Text c="gray.4" maw={600} size="lg" ta="center">
              Empieza gratis y escala según crezcas. Sin compromisos, cancela cuando quieras.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
            {pricingPlans.map((plan) => (
              <Paper
                key={plan.name}
                p="xl"
                radius="xl"
                style={{
                  background: plan.highlighted
                    ? "linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.02) 100%)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: plan.highlighted
                    ? "2px solid var(--nv-accent)"
                    : "1px solid rgba(255, 255, 255, 0.05)",
                  position: "relative",
                  transform: plan.highlighted ? "scale(1.05)" : "none",
                  boxShadow: plan.highlighted
                    ? "0 20px 60px rgba(212, 175, 55, 0.2)"
                    : "none",
                }}
              >
                {plan.badge && (
                  <Badge
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: plan.highlighted ? "var(--nv-accent)" : "rgba(255, 255, 255, 0.1)",
                      color: plan.highlighted ? "#1a1a2e" : "white",
                      fontWeight: 600,
                      padding: "6px 16px",
                    }}
                  >
                    {plan.badge}
                  </Badge>
                )}
                <Stack gap="lg">
                  <div>
                    <Text c="white" fw={600} size="xl">
                      {plan.name}
                    </Text>
                    <Text c="gray.5" size="sm">
                      {plan.description}
                    </Text>
                  </div>
                  <Group align="baseline" gap={4}>
                    <Text
                      style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: plan.highlighted ? "var(--nv-accent)" : "white",
                      }}
                    >
                      €{plan.price}
                    </Text>
                    <Text c="gray.5">/mes</Text>
                  </Group>
                  <Divider color="rgba(255, 255, 255, 0.1)" />
                  <List
                    spacing="sm"
                    icon={
                      <ThemeIcon
                        size="sm"
                        radius="xl"
                        style={{
                          background: plan.highlighted ? "var(--nv-accent)" : "rgba(255, 255, 255, 0.1)",
                          color: plan.highlighted ? "#1a1a2e" : "white",
                        }}
                      >
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    {plan.features.map((feature) => (
                      <List.Item key={feature}>
                        <Text size="sm" c="gray.4">{feature}</Text>
                      </List.Item>
                    ))}
                  </List>
                  <Button
                    fullWidth
                    mt="auto"
                    size="lg"
                    rightSection={<IconChevronRight size={18} />}
                    style={{
                      background: plan.highlighted ? "var(--nv-accent)" : "rgba(255, 255, 255, 0.1)",
                      color: plan.highlighted ? "#1a1a2e" : "white",
                      fontWeight: 600,
                      border: plan.highlighted ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    }}
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
      <Box
        style={{
          background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)",
        }}
      >
        <Container size="xl" py={100}>
          <Stack align="center" mb={60}>
            <Badge
              size="lg"
              variant="outline"
              style={{
                borderColor: "rgba(212, 175, 55, 0.3)",
                color: "var(--nv-accent)",
                background: "rgba(212, 175, 55, 0.1)",
              }}
            >
              Testimonios
            </Badge>
            <Title
              order={2}
              ta="center"
              c="white"
              style={{ fontSize: 40, fontWeight: 700 }}
            >
              Lo que dicen nuestros usuarios
            </Title>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
            {testimonials.map((testimonial) => (
              <Paper
                key={testimonial.name}
                p="xl"
                radius="xl"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <Stack gap="lg">
                  <Group gap={4}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <IconStar
                        key={i}
                        size={18}
                        fill="var(--nv-accent)"
                        color="var(--nv-accent)"
                      />
                    ))}
                  </Group>
                  <Text c="gray.3" size="md" style={{ fontStyle: "italic", lineHeight: 1.7 }}>
                    "{testimonial.content}"
                  </Text>
                  <Group gap="sm" mt="auto">
                    <Avatar
                      radius="xl"
                      size="lg"
                      style={{
                        background: "linear-gradient(135deg, var(--nv-accent) 0%, #E8C547 100%)",
                        color: "#1a1a2e",
                        fontWeight: 700,
                      }}
                    >
                      {testimonial.name.charAt(0)}
                    </Avatar>
                    <div>
                      <Text c="white" fw={600} size="sm">
                        {testimonial.name}
                      </Text>
                      <Text c="gray.5" size="xs">
                        {testimonial.role} · {testimonial.company}
                      </Text>
                    </div>
                  </Group>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 800,
            height: 400,
            background: "radial-gradient(ellipse, rgba(212, 175, 55, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <Container size="md" py={100} ta="center" style={{ position: "relative", zIndex: 1 }}>
          <Title
            order={2}
            mb="md"
            c="white"
            style={{ fontSize: 44, fontWeight: 700 }}
          >
            ¿Listo para transformar tu negocio?
          </Title>
          <Text c="gray.4" size="lg" mb="xl" maw={500} mx="auto" style={{ lineHeight: 1.7 }}>
            Únete a miles de profesionales que ya usan Trackfiz para gestionar
            su negocio de forma eficiente y profesional.
          </Text>
          <Group gap="md" justify="center">
            <Button
              size="lg"
              onClick={() => navigate("/register")}
              rightSection={<IconArrowRight size={18} />}
              style={{
                background: "var(--nv-accent)",
                color: "#1a1a2e",
                fontWeight: 600,
                padding: "0 32px",
                height: 52,
                fontSize: 16,
                boxShadow: "0 4px 24px rgba(212, 175, 55, 0.3)",
              }}
            >
              Crear Cuenta Gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              style={{
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                padding: "0 32px",
                height: 52,
                fontSize: 16,
              }}
            >
              Contactar Ventas
            </Button>
          </Group>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        style={{
          background: "#0a0a14",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Container size="xl" py={60}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
            <Stack gap="md">
              <Group gap="xs">
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    background: "linear-gradient(135deg, var(--nv-accent) 0%, #E8C547 100%)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#1a1a2e",
                  }}
                >
                  T
                </Box>
                <Text fw={700} size="lg" c="white">
                  Trackfiz
                </Text>
              </Group>
              <Text c="gray.5" size="sm" style={{ lineHeight: 1.6 }}>
                CRM/ERP/LMS todo-en-uno para profesionales del fitness y bienestar.
              </Text>
              <Group gap="sm">
                <Box
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <IconBrandApple size={18} color="white" />
                </Box>
                <Box
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <IconBrandAndroid size={18} color="white" />
                </Box>
              </Group>
            </Stack>
            <Stack gap="xs">
              <Text fw={600} mb="xs" c="white">
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
              <Text fw={600} mb="xs" c="white">
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
              <Text fw={600} mb="xs" c="white">
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
          <Divider color="rgba(255, 255, 255, 0.05)" my="xl" />
          <Text c="gray.6" size="sm" ta="center">
            © 2026 Trackfiz by E13 Fitness. Todos los derechos reservados.
          </Text>
        </Container>
      </Box>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        .feature-card:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </Box>
  );
}
