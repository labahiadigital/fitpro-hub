import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Image,
  Menu,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Timeline,
  Tooltip,
  Card,
  FileButton,
  Progress,
  RingProgress,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBarbell,
  IconCalendarEvent,
  IconCamera,
  IconClipboard,
  IconCreditCard,
  IconDotsVertical,
  IconDownload,
  IconEdit,
  IconFile,
  IconFileText,
  IconHistory,
  IconMail,
  IconMessage,
  IconMessageOff,
  IconPhone,
  IconPhoto,
  IconPill,
  IconPlus,
  IconSalad,
  IconTrash,
  IconTrendingUp,
  IconUser,
  IconUpload,
  IconChevronRight,
  IconTarget,
  IconActivity,
  IconHeart,
  IconScale,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { useClient } from "../../hooks/useClients";
import { useClientMealPlans } from "../../hooks/useSupabaseData";
import { AllergenList } from "../../components/common/AllergenBadge";

// KPI Card Component
function StatCard({ icon, label, value, color, trend }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Box className="nv-card" p="lg">
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text className="text-label" mb="xs">{label}</Text>
          <Text 
            className="text-display" 
            style={{ fontSize: "1.75rem", color }}
          >
            {value}
          </Text>
          {trend && (
            <Group gap={4} mt="xs">
              <Badge 
                size="sm" 
                variant="light"
                color={trend.positive ? "green" : "red"}
                radius="xl"
              >
                {trend.positive ? "+" : ""}{trend.value}%
              </Badge>
            </Group>
          )}
        </Box>
        <ThemeIcon 
          size={48} 
          radius="xl" 
          variant="light"
          style={{ 
            backgroundColor: `${color}15`,
            color: color
          }}
        >
          {icon}
        </ThemeIcon>
      </Group>
    </Box>
  );
}

// Info Row Component
function InfoRow({ label, value, icon }: { label: string; value: string | React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Group justify="space-between" py="sm" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <Group gap="sm">
        {icon && <Box style={{ color: "var(--nv-slate-light)" }}>{icon}</Box>}
        <Text size="sm" c="dimmed">{label}</Text>
      </Group>
      <Text size="sm" fw={600} style={{ color: "var(--nv-dark)" }}>{value}</Text>
    </Group>
  );
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  
  const { data: fetchedClient, isLoading } = useClient(id || "");
  const { data: clientMealPlans } = useClientMealPlans(id || "");

  // Mock client data as fallback
  const mockClient = {
    id: id || "1",
    first_name: "María",
    last_name: "García",
    email: "maria@email.com",
    phone: "+34 600 123 456",
    avatar_url: null,
    birth_date: "1990-05-15",
    gender: "female",
    height_cm: 165,
    weight_kg: 62,
    goals: "Tonificación y mejora de resistencia cardiovascular",
    internal_notes: "Lesión antigua en rodilla derecha, evitar impacto alto",
    is_active: true,
    chat_enabled: true,
    allergies: ["gluten", "lactosa"],
    intolerances: ["fructosa"],
    injuries: [
      { name: "Lesión de rodilla derecha", date: "2020-03-15", notes: "Evitar impacto alto", status: "recovered" }
    ],
    tags: [
      { name: "VIP", color: "#8B5CF6" },
      { name: "Presencial", color: "#10B981" },
    ],
    created_at: "2023-06-15",
    consents: {
      data_processing: true,
      marketing: true,
      health_data: true,
      consent_date: "2023-06-15",
    },
  };

  // Mock data
  const documents = [
    { id: "1", name: "Plan Nutricional Enero.pdf", type: "diet_plan", direction: "outbound", created_at: "2024-01-15", is_read: true },
    { id: "2", name: "Contrato de Servicios.pdf", type: "contract", direction: "outbound", created_at: "2023-06-15", is_read: true },
    { id: "3", name: "Análisis de Sangre.pdf", type: "medical", direction: "inbound", created_at: "2024-01-10", is_read: false },
  ];

  const progressPhotos = [
    { id: "1", photo_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300", photo_type: "front", photo_date: "2024-01-01", weight_kg: "62" },
    { id: "2", photo_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300", photo_type: "side", photo_date: "2024-01-01", weight_kg: "62" },
  ];

  const mealPlans = clientMealPlans?.length ? clientMealPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    target_calories: plan.target_calories || 2000,
    status: plan.is_template === "N" ? "active" : "inactive",
    created_at: plan.created_at,
  })) : [
    { id: "1", name: "Plan Definición Q1", target_calories: 1800, status: "active", created_at: "2024-01-01" },
  ];

  const supplements = [
    { id: "1", name: "Whey Protein", dosage: "30g post-entreno", frequency: "Días de entrenamiento" },
    { id: "2", name: "Omega 3", dosage: "2 cápsulas", frequency: "Diario con comida" },
  ];

  const client = fetchedClient || mockClient;
  
  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader size="lg" color="yellow" />
      </Center>
    );
  }

  const stats = {
    total_sessions: 48,
    sessions_this_month: 8,
    adherence: 92,
    mrr: 149,
    lifetime_value: 1788,
    days_as_client: 214,
  };

  const activities = [
    { id: "1", type: "session", title: "Sesión completada", description: "Entrenamiento de fuerza", date: "2024-01-15 10:00" },
    { id: "2", type: "payment", title: "Pago recibido", description: "Plan Premium - Enero", date: "2024-01-01 06:00" },
    { id: "3", type: "message", title: "Mensaje enviado", description: "Recordatorio de objetivos", date: "2023-12-28 14:30" },
  ];

  const sessions = [
    { id: "1", date: "2024-01-15", time: "10:00", type: "Personal Training", status: "completed", notes: "Buen progreso" },
    { id: "2", date: "2024-01-18", time: "10:00", type: "Personal Training", status: "confirmed", notes: "" },
  ];

  const measurements = [
    { date: "2024-01-01", weight: 62, body_fat: 24, muscle_mass: 26 },
    { date: "2023-12-01", weight: 63, body_fat: 25, muscle_mass: 25.5 },
    { date: "2023-11-01", weight: 64, body_fat: 26, muscle_mass: 25 },
  ];

  const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      session: <IconCalendarEvent size={14} />,
      payment: <IconCreditCard size={14} />,
      message: <IconMessage size={14} />,
      workout: <IconBarbell size={14} />,
      form: <IconClipboard size={14} />,
    };
    return icons[type] || <IconHistory size={14} />;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      session: "var(--nv-primary)",
      payment: "var(--nv-success)",
      message: "#8B5CF6",
      workout: "var(--nv-warning)",
      form: "#06B6D4",
    };
    return colors[type] || "var(--nv-slate)";
  };

  return (
    <Container py="xl" size="xl">
      <PageHeader
        breadcrumbs={[
          { label: "Clientes", href: "/clients" },
          { label: `${client.first_name} ${client.last_name}` },
        ]}
        title=""
      />

      {/* Header del cliente - Premium Design */}
      <Box className="nv-card" p="xl" mb="xl">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <Group gap="xl" wrap="nowrap">
            <Box style={{ position: "relative" }}>
              <Avatar 
                size={100} 
                radius="xl" 
                src={client.avatar_url}
                styles={{
                  root: {
                    border: "4px solid var(--nv-surface)",
                    boxShadow: "var(--shadow-lg)"
                  }
                }}
              >
                <Text size="xl" fw={700}>
                  {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                </Text>
              </Avatar>
              <Box
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 4,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: client.is_active ? "var(--nv-success)" : "var(--nv-slate)",
                  border: "3px solid var(--nv-surface)",
                }}
              />
            </Box>
            
            <Box>
              <Group gap="sm" mb="xs">
                <Text 
                  style={{ 
                    fontSize: "1.75rem", 
                    fontWeight: 800, 
                    letterSpacing: "-0.02em",
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "var(--nv-dark)"
                  }}
                >
                  {client.first_name} {client.last_name}
                </Text>
                {client.tags.map((tag: { name: string; color: string }, index: number) => (
                  <Badge
                    key={index}
                    size="md"
                    variant="light"
                    radius="xl"
                    styles={{
                      root: {
                        backgroundColor: `${tag.color}15`,
                        color: tag.color,
                        border: `1px solid ${tag.color}30`,
                        fontWeight: 600
                      }
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </Group>
              
              <Group gap="xl" mt="md">
                <Group gap="xs">
                  <IconMail size={16} color="var(--nv-slate)" />
                  <Text size="sm" c="dimmed">{client.email}</Text>
                </Group>
                <Group gap="xs">
                  <IconPhone size={16} color="var(--nv-slate)" />
                  <Text size="sm" c="dimmed">{client.phone}</Text>
                </Group>
                <Group gap="xs">
                  <IconCalendarEvent size={16} color="var(--nv-slate)" />
                  <Text size="sm" c="dimmed">
                    Cliente desde {new Date(client.created_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  </Text>
                </Group>
              </Group>
            </Box>
          </Group>

          <Group gap="sm">
            <Button 
              leftSection={<IconMessage size={18} />} 
              variant="default"
              radius="xl"
              styles={{
                root: {
                  borderColor: "var(--border-medium)",
                  fontWeight: 600
                }
              }}
            >
              Mensaje
            </Button>
            <Button 
              leftSection={<IconCalendarEvent size={18} />}
              radius="xl"
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                  "&:hover": {
                    background: "var(--nv-accent-hover)"
                  }
                }
              }}
            >
              Nueva Sesión
            </Button>
            <Menu position="bottom-end" withArrow shadow="lg">
              <Menu.Target>
                <ActionIcon size="lg" variant="default" radius="xl">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={16} />}>Editar cliente</Menu.Item>
                <Menu.Item leftSection={<IconBarbell size={16} />}>Asignar programa</Menu.Item>
                <Menu.Item leftSection={<IconSalad size={16} />}>Asignar plan nutricional</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={16} />}>Eliminar cliente</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      {/* KPIs del cliente */}
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} mb="xl" spacing="md" className="stagger">
        <StatCard 
          icon={<IconCalendarEvent size={24} />} 
          label="Sesiones Totales" 
          value={stats.total_sessions}
          color="var(--nv-primary)"
        />
        <StatCard 
          icon={<IconActivity size={24} />} 
          label="Este Mes" 
          value={stats.sessions_this_month}
          color="var(--nv-success)"
        />
        <StatCard 
          icon={<IconTarget size={24} />} 
          label="Adherencia" 
          value={`${stats.adherence}%`}
          color="var(--nv-success)"
          trend={{ value: 5, positive: true }}
        />
        <StatCard 
          icon={<IconCreditCard size={24} />} 
          label="MRR" 
          value={`€${stats.mrr}`}
          color="var(--nv-warning)"
        />
        <StatCard 
          icon={<IconHeart size={24} />} 
          label="LTV" 
          value={`€${stats.lifetime_value}`}
          color="#8B5CF6"
        />
        <StatCard 
          icon={<IconHistory size={24} />} 
          label="Días como cliente" 
          value={stats.days_as_client}
          color="var(--nv-slate)"
        />
      </SimpleGrid>

      {/* Tabs con información detallada */}
      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="xl">
          <Tabs.Tab leftSection={<IconUser size={16} />} value="overview">Resumen</Tabs.Tab>
          <Tabs.Tab leftSection={<IconSalad size={16} />} value="nutrition">Nutrición</Tabs.Tab>
          <Tabs.Tab leftSection={<IconFileText size={16} />} value="documents">Documentos</Tabs.Tab>
          <Tabs.Tab leftSection={<IconPhoto size={16} />} value="photos">Fotos</Tabs.Tab>
          <Tabs.Tab leftSection={<IconCalendarEvent size={16} />} value="sessions">Sesiones</Tabs.Tab>
          <Tabs.Tab leftSection={<IconTrendingUp size={16} />} value="progress">Progreso</Tabs.Tab>
          <Tabs.Tab leftSection={<IconBarbell size={16} />} value="programs">Programas</Tabs.Tab>
          <Tabs.Tab leftSection={<IconCreditCard size={16} />} value="payments">Pagos</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {/* Información personal */}
            <Box className="nv-card" p="xl">
              <Group justify="space-between" mb="lg">
                <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Información Personal
                </Text>
                <ActionIcon variant="subtle" color="gray" radius="xl">
                  <IconEdit size={18} />
                </ActionIcon>
              </Group>

              <Stack gap={0}>
                <InfoRow label="Fecha de nacimiento" value={new Date(client.birth_date).toLocaleDateString("es-ES")} />
                <InfoRow label="Género" value={client.gender === "female" ? "Femenino" : "Masculino"} />
                <InfoRow label="Altura" value={`${client.height_cm} cm`} icon={<IconScale size={14} />} />
                <InfoRow label="Peso actual" value={`${client.weight_kg} kg`} icon={<IconScale size={14} />} />
              </Stack>

              <Divider my="lg" />

              <Box>
                <Text size="sm" c="dimmed" mb="xs">Objetivos</Text>
                <Text size="sm" fw={500}>{client.goals}</Text>
              </Box>

              {client.internal_notes && (
                <Box mt="md" p="md" style={{ backgroundColor: "var(--nv-warning-bg)", borderRadius: "var(--radius-md)" }}>
                  <Group gap="xs" mb="xs">
                    <IconAlertTriangle size={16} color="var(--nv-warning)" />
                    <Text size="sm" fw={600} style={{ color: "var(--nv-warning)" }}>Notas internas</Text>
                  </Group>
                  <Text size="sm">{client.internal_notes}</Text>
                </Box>
              )}
            </Box>

            {/* Actividad reciente */}
            <Box className="nv-card" p="xl">
              <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Actividad Reciente
              </Text>

              <Timeline active={activities.length} bulletSize={28} lineWidth={2}>
                {activities.map((activity) => (
                  <Timeline.Item
                    bullet={
                      <ThemeIcon
                        size={28}
                        radius="xl"
                        variant="light"
                        style={{ 
                          backgroundColor: `${getActivityColor(activity.type)}15`,
                          color: getActivityColor(activity.type)
                        }}
                      >
                        {getActivityIcon(activity.type)}
                      </ThemeIcon>
                    }
                    key={activity.id}
                    title={<Text fw={600} size="sm">{activity.title}</Text>}
                  >
                    <Text c="dimmed" size="xs">{activity.description}</Text>
                    <Text c="dimmed" mt={4} size="xs">
                      {new Date(activity.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Box>

            {/* Alergias e Intolerancias */}
            <Box className="nv-card" p="xl">
              <Group justify="space-between" mb="lg">
                <Group gap="xs">
                  <IconAlertTriangle size={20} color="var(--nv-error)" />
                  <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Alergias e Intolerancias
                  </Text>
                </Group>
                <ActionIcon variant="subtle" color="gray" radius="xl">
                  <IconEdit size={18} />
                </ActionIcon>
              </Group>

              {(client.allergies?.length > 0 || client.intolerances?.length > 0) ? (
                <Stack gap="md">
                  {client.allergies?.length > 0 && (
                    <Box>
                      <Text size="sm" c="dimmed" mb="xs">Alergias</Text>
                      <AllergenList 
                        allergens={client.allergies} 
                        clientAllergens={client.allergies}
                        clientIntolerances={client.intolerances}
                      />
                    </Box>
                  )}
                  {client.intolerances?.length > 0 && (
                    <Box>
                      <Text size="sm" c="dimmed" mb="xs">Intolerancias</Text>
                      <AllergenList 
                        allergens={client.intolerances} 
                        clientAllergens={client.allergies}
                        clientIntolerances={client.intolerances}
                      />
                    </Box>
                  )}
                </Stack>
              ) : (
                <Text c="dimmed" size="sm">Sin alergias ni intolerancias registradas</Text>
              )}

              {client.injuries?.length > 0 && (
                <Box mt="lg">
                  <Divider mb="lg" />
                  <Text size="sm" c="dimmed" mb="xs">Lesiones</Text>
                  <Stack gap="xs">
                    {client.injuries.map((injury: any, idx: number) => (
                      <Badge 
                        key={idx} 
                        size="lg" 
                        variant="light"
                        radius="xl"
                        styles={{
                          root: {
                            backgroundColor: "var(--nv-warning-bg)",
                            color: "var(--nv-warning)"
                          }
                        }}
                      >
                        {injury.name}
                      </Badge>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Configuración de Chat */}
            <Box className="nv-card" p="xl">
              <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Configuración de Chat
              </Text>

              <Group justify="space-between">
                <Group gap="sm">
                  {client.chat_enabled ? (
                    <ThemeIcon size={40} radius="xl" variant="light" color="green">
                      <IconMessage size={20} />
                    </ThemeIcon>
                  ) : (
                    <ThemeIcon size={40} radius="xl" variant="light" color="gray">
                      <IconMessageOff size={20} />
                    </ThemeIcon>
                  )}
                  <Box>
                    <Text size="sm" fw={600}>Chat habilitado</Text>
                    <Text c="dimmed" size="xs">
                      {client.chat_enabled 
                        ? "El cliente puede enviar y recibir mensajes"
                        : "El chat está deshabilitado"}
                    </Text>
                  </Box>
                </Group>
                <Switch
                  checked={client.chat_enabled}
                  onChange={() => {}}
                  color="green"
                  size="lg"
                />
              </Group>
            </Box>
          </SimpleGrid>
        </Tabs.Panel>

        {/* Nutrición */}
        <Tabs.Panel value="nutrition">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Box className="nv-card" p="xl">
              <Group justify="space-between" mb="lg">
                <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Planes Nutricionales
                </Text>
                <Button 
                  size="sm" 
                  leftSection={<IconPlus size={16} />}
                  radius="xl"
                  styles={{
                    root: {
                      background: "var(--nv-accent)",
                      color: "var(--nv-dark)",
                      fontWeight: 600,
                      "&:hover": { background: "var(--nv-accent-hover)" }
                    }
                  }}
                >
                  Asignar Plan
                </Button>
              </Group>

              <Stack gap="sm">
                {mealPlans.map((plan) => (
                  <Box 
                    key={plan.id} 
                    p="md" 
                    style={{ 
                      border: "1px solid var(--border-subtle)", 
                      borderRadius: "var(--radius-md)",
                      transition: "all 0.2s",
                      cursor: "pointer"
                    }}
                    className="hover-lift"
                  >
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600} size="sm">{plan.name}</Text>
                        <Text c="dimmed" size="xs">{plan.target_calories} kcal/día</Text>
                      </Box>
                      <Group gap="xs">
                        <Badge 
                          size="sm" 
                          variant="light"
                          radius="xl"
                          color={plan.status === "active" ? "green" : "gray"}
                        >
                          {plan.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                        <ActionIcon variant="subtle" color="gray" radius="xl">
                          <IconDownload size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box className="nv-card" p="xl">
              <Group justify="space-between" mb="lg">
                <Group gap="xs">
                  <IconPill size={20} color="var(--nv-success)" />
                  <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Suplementos
                  </Text>
                </Group>
                <Button 
                  size="sm" 
                  variant="light" 
                  leftSection={<IconPlus size={16} />}
                  radius="xl"
                >
                  Añadir
                </Button>
              </Group>

              <Stack gap="sm">
                {supplements.map((supp) => (
                  <Box 
                    key={supp.id} 
                    p="md" 
                    style={{ 
                      border: "1px solid var(--border-subtle)", 
                      borderRadius: "var(--radius-md)" 
                    }}
                  >
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600} size="sm">{supp.name}</Text>
                        <Text c="dimmed" size="xs">{supp.dosage}</Text>
                      </Box>
                      <Badge size="sm" variant="light" radius="xl" color="blue">
                        {supp.frequency}
                      </Badge>
                    </Group>
                  </Box>
                ))}
              </Stack>
            </Box>
          </SimpleGrid>
        </Tabs.Panel>

        {/* Documentos */}
        <Tabs.Panel value="documents">
          <Box className="nv-card" p="xl">
            <Group justify="space-between" mb="lg">
              <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Documentos
              </Text>
              <FileButton onChange={() => {}} accept="application/pdf,image/*">
                {(props) => (
                  <Button 
                    {...props} 
                    size="sm" 
                    leftSection={<IconUpload size={16} />}
                    radius="xl"
                    styles={{
                      root: {
                        background: "var(--nv-accent)",
                        color: "var(--nv-dark)",
                        fontWeight: 600,
                        "&:hover": { background: "var(--nv-accent-hover)" }
                      }
                    }}
                  >
                    Subir Documento
                  </Button>
                )}
              </FileButton>
            </Group>

            <Table
              verticalSpacing="md"
              styles={{
                th: { 
                  fontWeight: 700, 
                  fontSize: 11, 
                  letterSpacing: "0.08em", 
                  textTransform: "uppercase",
                  color: "var(--nv-slate)"
                }
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Documento</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Dirección</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {documents.map((doc) => (
                  <Table.Tr key={doc.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <ThemeIcon size="sm" variant="light" radius="xl" color="blue">
                          <IconFile size={12} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>{doc.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" radius="xl">
                        {doc.type === "diet_plan" ? "Plan Nutricional" :
                         doc.type === "contract" ? "Contrato" : "Médico"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        size="sm" 
                        variant="light"
                        radius="xl"
                        color={doc.direction === "outbound" ? "blue" : "green"}
                      >
                        {doc.direction === "outbound" ? "Enviado" : "Recibido"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        size="sm" 
                        variant="light"
                        radius="xl"
                        color={doc.is_read ? "green" : "orange"}
                      >
                        {doc.is_read ? "Leído" : "No leído"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" radius="xl">
                          <IconDownload size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" radius="xl">
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>

        {/* Fotos */}
        <Tabs.Panel value="photos">
          <Box className="nv-card" p="xl">
            <Group justify="space-between" mb="lg">
              <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Fotos de Evolución
              </Text>
              <FileButton onChange={() => {}} accept="image/*" multiple>
                {(props) => (
                  <Button 
                    {...props} 
                    size="sm" 
                    leftSection={<IconCamera size={16} />}
                    radius="xl"
                    styles={{
                      root: {
                        background: "var(--nv-accent)",
                        color: "var(--nv-dark)",
                        fontWeight: 600,
                        "&:hover": { background: "var(--nv-accent-hover)" }
                      }
                    }}
                  >
                    Subir Fotos
                  </Button>
                )}
              </FileButton>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
              {progressPhotos.map((photo) => (
                <Card key={photo.id} padding="xs" radius="lg" withBorder>
                  <Card.Section>
                    <Image
                      src={photo.photo_url}
                      height={200}
                      alt="Foto de progreso"
                      fallbackSrc="https://placehold.co/300x200?text=Foto"
                    />
                  </Card.Section>
                  <Group justify="space-between" mt="sm">
                    <Box>
                      <Badge size="xs" variant="light" radius="xl">
                        {photo.photo_type === "front" ? "Frontal" : "Lateral"}
                      </Badge>
                      <Text size="xs" c="dimmed" mt={2}>
                        {new Date(photo.photo_date).toLocaleDateString("es-ES")}
                      </Text>
                    </Box>
                    {photo.weight_kg && (
                      <Text size="xs" fw={600}>{photo.weight_kg} kg</Text>
                    )}
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        </Tabs.Panel>

        {/* Sesiones */}
        <Tabs.Panel value="sessions">
          <Box className="nv-card" style={{ overflow: "hidden" }}>
            <Table verticalSpacing="md" horizontalSpacing="lg">
              <Table.Thead style={{ backgroundColor: "var(--nv-surface-subtle)" }}>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Hora</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Notas</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sessions.map((session) => (
                  <Table.Tr key={session.id}>
                    <Table.Td>
                      <Text fw={600} size="sm">
                        {new Date(session.date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{session.time}</Text></Table.Td>
                    <Table.Td><Text size="sm">{session.type}</Text></Table.Td>
                    <Table.Td>
                      <Badge
                        color={session.status === "completed" ? "green" : "blue"}
                        size="sm"
                        variant="light"
                        radius="xl"
                      >
                        {session.status === "completed" ? "Completada" : "Confirmada"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">{session.notes || "—"}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>

        {/* Progreso */}
        <Tabs.Panel value="progress">
          <Box className="nv-card" p="xl">
            <Text fw={700} size="lg" mb="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Evolución de Medidas
            </Text>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Peso (kg)</Table.Th>
                  <Table.Th>% Grasa</Table.Th>
                  <Table.Th>Masa Muscular (kg)</Table.Th>
                  <Table.Th>Variación</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {measurements.map((m, index) => {
                  const prevWeight = measurements[index + 1]?.weight || m.weight;
                  const weightChange = m.weight - prevWeight;
                  return (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {new Date(m.date).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                        </Text>
                      </Table.Td>
                      <Table.Td><Text size="sm">{m.weight} kg</Text></Table.Td>
                      <Table.Td><Text size="sm">{m.body_fat}%</Text></Table.Td>
                      <Table.Td><Text size="sm">{m.muscle_mass} kg</Text></Table.Td>
                      <Table.Td>
                        {index < measurements.length - 1 && (
                          <Badge
                            color={weightChange <= 0 ? "green" : "red"}
                            size="sm"
                            variant="light"
                            radius="xl"
                          >
                            {weightChange <= 0 ? "" : "+"}{weightChange} kg
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>

        {/* Programas */}
        <Tabs.Panel value="programs">
          <Box className="nv-card" p={60} ta="center">
            <ThemeIcon size={80} radius="xl" variant="light" color="gray" mb="lg">
              <IconBarbell size={40} />
            </ThemeIcon>
            <Text fw={700} size="lg" mb="xs">Sin programas asignados</Text>
            <Text c="dimmed" mb="lg" maw={400} mx="auto">
              Asigna un programa de entrenamiento para este cliente
            </Text>
            <Button 
              leftSection={<IconPlus size={18} />}
              radius="xl"
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                  "&:hover": { background: "var(--nv-accent-hover)" }
                }
              }}
            >
              Asignar Programa
            </Button>
          </Box>
        </Tabs.Panel>

        {/* Pagos */}
        <Tabs.Panel value="payments">
          <Box className="nv-card" p="xl">
            <Group justify="space-between" mb="lg">
              <Text fw={700} size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Historial de Pagos
              </Text>
              <Badge size="lg" variant="light" radius="xl" color="green">
                Plan Premium - €149/mes
              </Badge>
            </Group>

            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Concepto</Table.Th>
                  <Table.Th>Importe</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Text size="sm">01/01/2024</Text></Table.Td>
                  <Table.Td><Text size="sm">Plan Premium - Enero 2024</Text></Table.Td>
                  <Table.Td><Text fw={600} size="sm">€149.00</Text></Table.Td>
                  <Table.Td>
                    <Badge color="green" size="sm" variant="light" radius="xl">Pagado</Badge>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text size="sm">01/12/2023</Text></Table.Td>
                  <Table.Td><Text size="sm">Plan Premium - Diciembre 2023</Text></Table.Td>
                  <Table.Td><Text fw={600} size="sm">€149.00</Text></Table.Td>
                  <Table.Td>
                    <Badge color="green" size="sm" variant="light" radius="xl">Pagado</Badge>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Box>
        </Tabs.Panel>
      </Tabs>

      <style>{`
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-medium);
        }
      `}</style>
    </Container>
  );
}
