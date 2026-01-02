import {
  Avatar,
  Box,
  Button,
  Grid,
  Group,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowUpRight,
  IconCalendarEvent,
  IconCreditCard,
  IconDots,
  IconUsers,
} from "@tabler/icons-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { SpotlightCard } from "../../components/common/SpotlightCard";
import { useAuthStore } from "../../stores/auth";

// --- WIDGETS REFINADOS (Light Mode Optimized) ---

// 1. Hero KPI Refined
function HeroKPI({ title, value, change, data }: any) {
  return (
    <SpotlightCard p="xl" style={{ minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700} style={{ letterSpacing: "0.1em" }}>
            {title}
          </Text>
          <Text style={{ fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text-primary)" }}>
            {value}
          </Text>
        </Stack>
        <Box
          style={{
            background: change > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: change > 0 ? "#10B981" : "#EF4444",
            padding: "6px 14px",
            borderRadius: "50px",
            fontSize: "13px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {change > 0 ? <IconArrowUpRight size={14} /> : null}
          {change}%
        </Box>
      </Group>

      {/* Mini Chart - Using Brand Blue for better contrast on white */}
      <Box style={{ height: 60, marginTop: 20, marginLeft: -20, marginRight: -20, opacity: 0.8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5C80BC" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#5C80BC" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#5C80BC"
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </SpotlightCard>
  );
}

// 2. Daily Briefing Card (The "Focus" section) - Dark Olive Background for Contrast
function DailyBriefing() {
  return (
    <SpotlightCard p="xl" style={{ background: "var(--bg-sidebar)", color: "white", border: "none" }}>
      <Group justify="space-between" align="flex-start" mb="lg">
        <Group gap="md">
          <ThemeIcon size={48} radius="xl" variant="light" style={{ background: "rgba(231, 226, 71, 0.2)", color: "#E7E247" }}>
            <IconCreditCard size={24} />
          </ThemeIcon>
          <Box>
            <Text size="lg" fw={700} c="white">Objetivo Mensual</Text>
            <Text size="sm" c="dimmed">Estás a un 12% de tu meta</Text>
          </Box>
        </Group>
        <Button variant="outline" color="yellow" size="xs" radius="xl" styles={{ root: { borderColor: "#E7E247", color: "#E7E247" } }}>
          Ver Detalles
        </Button>
      </Group>
      
      <Box mt="md">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={600} c="dimmed">Progreso Actual</Text>
          <Text size="sm" fw={700} c="white">€8,420 / €10,000</Text>
        </Group>
        <Box style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
          <Box style={{ width: "84%", height: "100%", background: "#E7E247", borderRadius: 4, boxShadow: "0 0 10px rgba(231, 226, 71, 0.3)" }} />
        </Box>
      </Box>
    </SpotlightCard>
  );
}

// 3. Activity Feed
function ActivityFeed() {
  const activities = [
    { user: "Ana García", action: "reservó una clase", time: "Hace 2 min", avatar: "A", type: "booking" },
    { user: "Carlos Ruiz", action: "renovó su plan", time: "Hace 45 min", avatar: "C", type: "payment" },
    { user: "Laura M.", action: "completó una rutina", time: "Hace 2h", avatar: "L", type: "workout" },
  ];

  return (
    <SpotlightCard p="xl" h="100%">
      <Group justify="space-between" mb="xl">
        <Text size="lg" fw={700} className="font-heading">Actividad en Vivo</Text>
        <UnstyledButton>
          <IconDots size={20} color="var(--text-secondary)" />
        </UnstyledButton>
      </Group>
      <Stack gap="lg">
        {activities.map((item, i) => (
          <Group key={i} wrap="nowrap" align="flex-start">
            <Box style={{ position: "relative" }}>
              <Avatar radius="xl" size="sm" src={null} style={{ background: "#F5F5F4", color: "var(--text-primary)", border: "1px solid rgba(0,0,0,0.05)" }}>
                {item.avatar}
              </Avatar>
              <Box 
                style={{ 
                  position: "absolute", 
                  bottom: -2, 
                  right: -2, 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  background: item.type === 'payment' ? '#10B981' : '#E7E247',
                  border: "1px solid white"
                }} 
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="sm" c="var(--text-primary)">
                <Text span fw={600}>{item.user}</Text> {item.action}
              </Text>
              <Text size="xs" c="dimmed">{item.time}</Text>
            </Box>
          </Group>
        ))}
      </Stack>
    </SpotlightCard>
  );
}

// 4. Quick Actions "Dock"
function QuickActionDock() {
  const actions = [
    { label: "Nuevo Cliente", icon: <IconUsers size={20} />, color: "blue" },
    { label: "Agendar", icon: <IconCalendarEvent size={20} />, color: "yellow" },
    { label: "Crear Rutina", icon: <IconCreditCard size={20} />, color: "green" },
  ];

  return (
    <SimpleGrid cols={3} spacing="md">
      {actions.map((action) => (
        <SpotlightCard 
          key={action.label} 
          p="md" 
          style={{ 
            cursor: "pointer", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: 12,
            textAlign: "center"
          }}
        >
          <ThemeIcon 
            size="xl" 
            radius="xl" 
            variant="light" 
            color={action.color === 'yellow' ? 'yellow' : action.color === 'green' ? 'teal' : 'blue'}
            style={{ background: action.color === 'yellow' ? 'rgba(231, 226, 71, 0.15)' : undefined }}
          >
            {action.icon}
          </ThemeIcon>
          <Text size="xs" fw={600} c="var(--text-primary)">{action.label}</Text>
        </SpotlightCard>
      ))}
    </SimpleGrid>
  );
}

// --- MAIN PAGE ---

export function DashboardPage() {
  const { user } = useAuthStore();
  const chartData1 = [{ value: 30 }, { value: 40 }, { value: 35 }, { value: 50 }, { value: 45 }, { value: 70 }, { value: 90 }];
  const chartData2 = [{ value: 60 }, { value: 55 }, { value: 70 }, { value: 65 }, { value: 80 }, { value: 75 }, { value: 85 }];

  return (
    <Box pb={40}>
      {/* 1. Header Section "Editorial" */}
      <Box mb={50} pt="md" className="animate-entry">
        <Text c="dimmed" tt="uppercase" fw={700} size="xs" mb="xs" style={{ letterSpacing: "0.2em" }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <Text 
          className="font-heading"
          style={{ 
            fontSize: "clamp(2.5rem, 5vw, 4rem)", 
            fontWeight: 800, 
            lineHeight: 1, 
            color: "var(--text-primary)",
            maxWidth: 900
          }}
        >
          Buenos días, {user?.full_name?.split(" ")[0] || "Entrenador"}.
        </Text>
        <Text size="xl" c="dimmed" mt="md" style={{ maxWidth: 600, fontWeight: 300 }}>
          Hoy tienes <Text span c="var(--text-primary)" fw={600}>4 sesiones</Text> programadas y <Text span c="var(--text-primary)" fw={600}>2 nuevos clientes</Text> potenciales esperando respuesta.
        </Text>
      </Box>

      {/* 2. Main Bento Grid */}
      <Grid gutter="lg">
        
        {/* Left Column: KPIs & Charts */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="lg">
            {/* Top Row: Hero KPIs */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <HeroKPI 
                title="Ingresos Mensuales" 
                value="€12.4k" 
                change={14.2} 
                data={chartData1} 
              />
              <HeroKPI 
                title="Clientes Activos" 
                value="84" 
                change={5.1} 
                data={chartData2} 
              />
            </SimpleGrid>

            {/* Middle Row: Briefing & Actions */}
            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 7 }}>
                 <DailyBriefing />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 5 }}>
                 <QuickActionDock />
              </Grid.Col>
            </Grid>

            {/* Bottom: Revenue Chart */}
            <SpotlightCard p="xl" style={{ minHeight: 300 }}>
              <Group justify="space-between" mb="lg">
                <Box>
                  <Text size="lg" fw={700} c="var(--text-primary)">Análisis de Ingresos</Text>
                  <Text size="sm" c="dimmed">Comparativa vs mes anterior</Text>
                </Box>
                <Group>
                  <Button variant="subtle" color="gray" size="xs">Semana</Button>
                  <Button variant="light" color="blue" size="xs" bg="rgba(92, 128, 188, 0.1)" c="#5C80BC">Mes</Button>
                  <Button variant="subtle" color="gray" size="xs">Año</Button>
                </Group>
              </Group>
              
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={[
                  { name: 'Lun', curr: 400, prev: 240 },
                  { name: 'Mar', curr: 300, prev: 139 },
                  { name: 'Mie', curr: 500, prev: 980 },
                  { name: 'Jue', curr: 200, prev: 390 },
                  { name: 'Vie', curr: 600, prev: 480 },
                  { name: 'Sab', curr: 700, prev: 380 },
                  { name: 'Dom', curr: 800, prev: 430 },
                ]}>
                  <defs>
                    <linearGradient id="colorCurr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5C80BC" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#5C80BC" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.1)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#3D3B30' }}
                  />
                  <Area type="monotone" dataKey="curr" stroke="#5C80BC" strokeWidth={3} fillOpacity={1} fill="url(#colorCurr)" />
                  <Area type="monotone" dataKey="prev" stroke="#4D5061" strokeWidth={2} strokeDasharray="5 5" fill="transparent" opacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </SpotlightCard>
          </Stack>
        </Grid.Col>

        {/* Right Column: Activity & Notifications */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="lg" h="100%">
            {/* Notifications */}
            <SpotlightCard p="xl">
               <Group justify="space-between" mb="md">
                 <Text size="md" fw={700} c="var(--text-primary)">Alertas</Text>
                 <Text size="xs" c="blue" fw={600} style={{ cursor: 'pointer' }}>Ver todas</Text>
               </Group>
               <Stack gap="md">
                 <Group wrap="nowrap">
                    <ThemeIcon color="red" variant="light" radius="md" bg="rgba(239, 68, 68, 0.1)"><IconCreditCard size={18} /></ThemeIcon>
                    <Box>
                      <Text size="sm" fw={600} c="var(--text-primary)">Pago fallido</Text>
                      <Text size="xs" c="dimmed">Suscripción de Marcos P.</Text>
                    </Box>
                 </Group>
                 <Group wrap="nowrap">
                    <ThemeIcon color="blue" variant="light" radius="md" bg="rgba(92, 128, 188, 0.1)"><IconCalendarEvent size={18} /></ThemeIcon>
                    <Box>
                      <Text size="sm" fw={600} c="var(--text-primary)">Sesión en 30min</Text>
                      <Text size="xs" c="dimmed">Entrenamiento con Clara</Text>
                    </Box>
                 </Group>
               </Stack>
            </SpotlightCard>

            <Box style={{ flex: 1 }}>
              <ActivityFeed />
            </Box>

            {/* Retention Stat */}
            <SpotlightCard p="lg" style={{ background: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.1)" }}>
              <Group>
                <RingProgress
                  size={60}
                  thickness={6}
                  roundCaps
                  sections={[{ value: 92, color: '#10B981' }]}
                />
                <Box>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">Retención</Text>
                  <Text size="xl" fw={800} c="#10B981">92%</Text>
                </Box>
              </Group>
            </SpotlightCard>
          </Stack>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
