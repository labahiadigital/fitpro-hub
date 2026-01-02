import { Box, Group, RingProgress, Text } from "@mantine/core";

interface ClientGrowthChartProps {
  data: any[];
  totalClients: number;
  newThisMonth: number;
  churnedThisMonth: number;
}

export function ClientGrowthChart({
  totalClients,
  newThisMonth,
  churnedThisMonth,
}: ClientGrowthChartProps) {
  // Distribution Data Simulation
  const enterprise = 45;
  const pro = 35;
  const basic = 20;

  return (
    <Box className="premium-card" p="xl" style={{ height: "100%", minHeight: 400 }}>
      <Text className="text-label" mb="xl">Customer Segments</Text>

      <Group justify="center" align="center" style={{ height: 240, position: "relative" }}>
        {/* Multi-layered Ring Chart */}
        <Box style={{ position: "relative" }}>
          <RingProgress
            size={240}
            thickness={24}
            roundCaps
            sections={[
              { value: enterprise, color: "var(--nv-accent)" },
              { value: pro, color: "var(--nv-primary)" },
              { value: basic, color: "var(--nv-dark)" },
            ]}
            label={
              <Box style={{ textAlign: "center" }}>
                <Text size="xs" c="dimmed" tt="uppercase" ls={1}>Total</Text>
                <Text className="text-display" style={{ fontSize: "2.5rem" }}>{totalClients}</Text>
                <Text size="sm" c="var(--nv-success)" fw={600}>+{newThisMonth} new</Text>
              </Box>
            }
          />
          
          {/* Decorative outer glow ring */}
          <Box 
            style={{
              position: "absolute",
              top: -10, left: -10, right: -10, bottom: -10,
              border: "1px solid rgba(0,0,0,0.05)",
              borderRadius: "50%",
              zIndex: -1
            }}
          />
        </Box>
      </Group>

      {/* Legend Grid */}
      <Box mt="xl">
        <Group justify="space-between" px="lg">
          <Box style={{ textAlign: "center" }}>
            <Group gap={6} justify="center" mb={4}>
              <Box w={8} h={8} style={{ borderRadius: "2px", background: "var(--nv-accent)" }} />
              <Text size="sm" fw={600}>Enterprise</Text>
            </Group>
            <Text size="xl" fw={700}>{enterprise}%</Text>
          </Box>
          
          <Box style={{ width: 1, height: 40, background: "rgba(0,0,0,0.1)" }} />

          <Box style={{ textAlign: "center" }}>
            <Group gap={6} justify="center" mb={4}>
              <Box w={8} h={8} style={{ borderRadius: "2px", background: "var(--nv-primary)" }} />
              <Text size="sm" fw={600}>Pro</Text>
            </Group>
            <Text size="xl" fw={700}>{pro}%</Text>
          </Box>

          <Box style={{ width: 1, height: 40, background: "rgba(0,0,0,0.1)" }} />

          <Box style={{ textAlign: "center" }}>
            <Group gap={6} justify="center" mb={4}>
              <Box w={8} h={8} style={{ borderRadius: "2px", background: "var(--nv-dark)" }} />
              <Text size="sm" fw={600}>Basic</Text>
            </Group>
            <Text size="xl" fw={700}>{basic}%</Text>
          </Box>
        </Group>
      </Box>
    </Box>
  );
}

export const ClientTrendChart = ClientGrowthChart;
