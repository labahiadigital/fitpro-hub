import { Box, Group, RingProgress, Stack, Text } from "@mantine/core";

interface ClientGrowthChartProps {
  data?: any[];
  totalClients: number;
  newThisMonth: number;
  churnedThisMonth: number;
}

export function ClientGrowthChart({
  totalClients,
  newThisMonth,
}: ClientGrowthChartProps) {
  // Distribution Data Simulation
  const enterprise = 45;
  const pro = 35;
  const basic = 20;

  return (
    <Box className="premium-card" p="sm" style={{ height: "100%" }}>
      <Text className="stat-label" mb="xs" style={{ fontSize: "10px" }}>Segmentos de Clientes</Text>

      {/* Layout horizontal: gráfico a la izquierda, leyenda a la derecha */}
      <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
        {/* Ring Chart */}
        <Box style={{ flex: "0 0 auto" }}>
          <RingProgress
            size={100}
            thickness={10}
            roundCaps
            sections={[
              { value: enterprise, color: "var(--nv-accent)" },
              { value: pro, color: "var(--nv-primary)" },
              { value: basic, color: "var(--nv-dark)" },
            ]}
            label={
              <Box style={{ textAlign: "center" }}>
                <Text size="8px" c="dimmed" tt="uppercase" lts="0.05em">Total</Text>
                <Text fw={800} style={{ fontSize: "0.9rem", color: "var(--nv-dark)", lineHeight: 1.1 }}>
                  {totalClients.toLocaleString()}
                </Text>
                <Text size="10px" c="var(--nv-success)" fw={600}>+{newThisMonth}</Text>
              </Box>
            }
          />
        </Box>

        {/* Legend - Vertical a la derecha */}
        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap={4}>
            <Box w={6} h={6} style={{ borderRadius: "2px", background: "var(--nv-accent)", flexShrink: 0 }} />
            <Text size="xs" fw={500} c="var(--nv-slate)" style={{ flex: 1 }}>Premium</Text>
            <Text size="xs" fw={700} style={{ color: "var(--nv-dark)" }}>{enterprise}%</Text>
          </Group>
          
          <Group gap={4}>
            <Box w={6} h={6} style={{ borderRadius: "2px", background: "var(--nv-primary)", flexShrink: 0 }} />
            <Text size="xs" fw={500} c="var(--nv-slate)" style={{ flex: 1 }}>Pro</Text>
            <Text size="xs" fw={700} style={{ color: "var(--nv-dark)" }}>{pro}%</Text>
          </Group>

          <Group gap={4}>
            <Box w={6} h={6} style={{ borderRadius: "2px", background: "var(--nv-dark)", flexShrink: 0 }} />
            <Text size="xs" fw={500} c="var(--nv-slate)" style={{ flex: 1 }}>Básico</Text>
            <Text size="xs" fw={700} style={{ color: "var(--nv-dark)" }}>{basic}%</Text>
          </Group>
        </Stack>
      </Group>
    </Box>
  );
}

export const ClientTrendChart = ClientGrowthChart;
