import { Box, Group, Text, Tooltip } from "@mantine/core";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";

interface RevenueData {
  month: string;
  revenue: number;
  subscriptions: number;
  oneTime: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  currentMRR: number;
  previousMRR: number;
  currency?: string;
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box
        style={{
          backgroundColor: "rgba(42, 40, 34, 0.95)",
          color: "white",
          padding: "12px",
          borderRadius: "8px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(4px)"
        }}
      >
        <Text size="xs" c="dimmed" mb={4} style={{ textTransform: "uppercase", letterSpacing: "1px" }}>{label}</Text>
        <Group gap="xl">
          <Box>
            <Text size="xs" c="rgba(255,255,255,0.7)">Revenue</Text>
            <Text fw={700}>{currency}{payload[0].value.toLocaleString()}</Text>
          </Box>
        </Group>
      </Box>
    );
  }
  return null;
};

export function RevenueChart({
  data,
  currentMRR,
  previousMRR,
  currency = "€",
}: RevenueChartProps) {
  return (
    <Box className="premium-card" p="md" style={{ height: "100%", minHeight: 320 }}>
      {/* Header */}
      <Group justify="space-between" mb="md" align="flex-start" wrap="wrap" gap="sm">
        <Box>
          <Text className="stat-label" mb={4}>Crecimiento de Ingresos</Text>
          <Group align="baseline" gap="xs">
            <Text className="stat-value" style={{ color: "var(--nv-dark)" }}>
              {currency}{currentMRR.toLocaleString()}
            </Text>
            <Text size="xs" c="var(--nv-slate)" fw={500}>
              MRR
            </Text>
          </Group>
        </Box>
        
        {/* Legend */}
        <Group gap="md" className="hide-mobile">
          <Group gap={4}>
            <Box w={6} h={6} style={{ borderRadius: "50%", background: "var(--nv-primary)" }} />
            <Text size="xs" fw={500} c="var(--nv-slate)">Suscripciones</Text>
          </Group>
          <Group gap={4}>
            <Box w={6} h={6} style={{ borderRadius: "50%", background: "var(--nv-accent)" }} />
            <Text size="xs" fw={500} c="var(--nv-slate)">Únicos</Text>
          </Group>
        </Group>
      </Group>

      {/* Chart Area */}
      <Box h={220} w="100%">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--nv-primary)" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="var(--nv-primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--nv-slate)', fontSize: 11 }} 
              dy={8}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--nv-slate)', fontSize: 11 }} 
              tickFormatter={(value) => `${value / 1000}k`}
              width={40}
            />
            <RechartsTooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: 'var(--nv-slate-light)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="var(--nv-primary)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
