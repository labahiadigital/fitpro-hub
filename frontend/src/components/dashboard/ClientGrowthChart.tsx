import {
  Badge,
  Group,
  Paper,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

interface GrowthData {
  month: string;
  total: number;
  new: number;
  churned: number;
}

interface ClientGrowthChartProps {
  data: GrowthData[];
  totalClients: number;
  newThisMonth: number;
  churnedThisMonth: number;
}

export function ClientGrowthChart({
  data,
  totalClients,
  newThisMonth,
  churnedThisMonth,
}: ClientGrowthChartProps) {
  const theme = useMantineTheme();
  const netGrowth = newThisMonth - churnedThisMonth;
  const isPositive = netGrowth >= 0;

  const maxClients = Math.max(...data.map((d) => d.total), 1);

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Text c="dimmed" fw={500} size="sm">
            Clientes Activos
          </Text>
          <Group align="baseline" gap="xs">
            <Title order={2}>{totalClients}</Title>
            <Badge
              color={isPositive ? "teal" : "red"}
              leftSection={
                isPositive ? (
                  <IconTrendingUp size={12} />
                ) : (
                  <IconTrendingDown size={12} />
                )
              }
              variant="light"
            >
              {isPositive ? "+" : ""}
              {netGrowth} este mes
            </Badge>
          </Group>
        </div>
        <Group gap="lg">
          <div style={{ textAlign: "center" }}>
            <Text c="dimmed" size="xs">
              Nuevos
            </Text>
            <Text c="teal" fw={600} size="lg">
              +{newThisMonth}
            </Text>
          </div>
          <div style={{ textAlign: "center" }}>
            <Text c="dimmed" size="xs">
              Bajas
            </Text>
            <Text c="red" fw={600} size="lg">
              -{churnedThisMonth}
            </Text>
          </div>
        </Group>
      </Group>

      {/* Area chart simulation */}
      <div style={{ position: "relative", height: 120, marginTop: 16 }}>
        <svg
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          width="100%"
        >
          <defs>
            <linearGradient
              id="clientGradient"
              x1="0%"
              x2="0%"
              y1="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={theme.colors.blue[5]}
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor={theme.colors.blue[5]}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path
            d={`M 0 100 ${data
              .map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = 100 - (d.total / maxClients) * 80;
                return `L ${x} ${y}`;
              })
              .join(" ")} L 100 100 Z`}
            fill="url(#clientGradient)"
          />
          <path
            d={`M ${data
              .map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = 100 - (d.total / maxClients) * 80;
                return `${i === 0 ? "" : "L "}${x} ${y}`;
              })
              .join(" ")}`}
            fill="none"
            stroke={theme.colors.blue[5]}
            strokeWidth="2"
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d.total / maxClients) * 80;
            return (
              <circle cx={x} cy={y} fill={theme.colors.blue[5]} key={i} r="3" />
            );
          })}
        </svg>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          {data.map((item, index) => (
            <Text c="dimmed" key={index} size="xs">
              {item.month}
            </Text>
          ))}
        </div>
      </div>
    </Paper>
  );
}
