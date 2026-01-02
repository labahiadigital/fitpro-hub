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
    <Box className="premium-card" p="md" style={{ height: "100%", minHeight: 280 }}>
      <Text className="stat-label" mb="sm">Segmentos de Clientes</Text>

      {/* Layout horizontal: gráfico a la izquierda, leyenda a la derecha */}
      <Group justify="space-between" align="center" gap="md" style={{ height: "calc(100% - 40px)" }}>
        {/* Ring Chart */}
        <Box style={{ flex: "0 0 auto" }}>
          <RingProgress
            size={140}
            thickness={14}
            roundCaps
            sections={[
              { value: enterprise, color: "var(--nv-accent)" },
              { value: pro, color: "var(--nv-primary)" },
              { value: basic, color: "var(--nv-dark)" },
            ]}
            label={
              <Box style={{ textAlign: "center" }}>
                <Text size="10px" c="dimmed" tt="uppercase" lts="0.05em">Total</Text>
                <Text fw={800} style={{ fontSize: "1.25rem", color: "var(--nv-dark)", lineHeight: 1.1 }}>
                  {totalClients.toLocaleString()}
                </Text>
                <Text size="xs" c="var(--nv-success)" fw={600}>+{newThisMonth}</Text>
              </Box>
            }
          />
        </Box>

        {/* Legend - Vertical a la derecha */}
        <Stack gap="sm" style={{ flex: 1 }}>
          <Group gap="xs">
            <Box w={8} h={8} style={{ borderRadius: "2px", background: "var(--nv-accent)", flexShrink: 0 }} />
            <Box style={{ flex: 1 }}>
              <Text size="xs" fw={500} c="var(--nv-slate)">Premium</Text>
            </Box>
            <Text size="sm" fw={700} style={{ color: "var(--nv-dark)" }}>{enterprise}%</Text>
          </Group>
          
          <Group gap="xs">
            <Box w={8} h={8} style={{ borderRadius: "2px", background: "var(--nv-primary)", flexShrink: 0 }} />
            <Box style={{ flex: 1 }}>
              <Text size="xs" fw={500} c="var(--nv-slate)">Pro</Text>
            </Box>
            <Text size="sm" fw={700} style={{ color: "var(--nv-dark)" }}>{pro}%</Text>
          </Group>

          <Group gap="xs">
            <Box w={8} h={8} style={{ borderRadius: "2px", background: "var(--nv-dark)", flexShrink: 0 }} />
            <Box style={{ flex: 1 }}>
              <Text size="xs" fw={500} c="var(--nv-slate)">Básico</Text>
            </Box>
            <Text size="sm" fw={700} style={{ color: "var(--nv-dark)" }}>{basic}%</Text>
          </Group>
        </Stack>
      </Group>
    </Box>
  );
}

export const ClientTrendChart = ClientGrowthChart;
