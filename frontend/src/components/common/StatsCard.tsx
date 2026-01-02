import { Box, Group, Text, Tooltip } from "@mantine/core";
import { Sparkline } from "@mantine/charts";
import { IconArrowDownRight, IconArrowUpRight, IconMinus } from "@tabler/icons-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "positive" | "negative" | "stable";
  changeLabel?: string;
  prefix?: string;
  suffix?: string;
  chartData?: number[];
}

export function KPICard({
  title,
  value,
  change,
  changeType,
  changeLabel,
  prefix = "",
  suffix = "",
  chartData,
}: KPICardProps) {
  const type = changeType || (change && change > 0 ? "positive" : change && change < 0 ? "negative" : "stable");

  const colors = {
    positive: "var(--nv-success)",
    negative: "var(--nv-error)",
    stable: "var(--nv-slate)",
  };

  const bgColors = {
    positive: "var(--nv-success-bg)",
    negative: "var(--nv-error-bg)",
    stable: "rgba(100, 116, 139, 0.08)",
  };

  return (
    <Box className="premium-card" p="md" style={{ position: "relative", overflow: "hidden" }}>
      <Group justify="space-between" align="flex-start" mb="sm">
        <Text className="stat-label">{title}</Text>
        
        {/* Trend Pill */}
        {(change !== undefined || type === "stable") && (
          <Tooltip label={changeLabel || "Vs mes anterior"} withArrow position="top">
            <Box
              className="pill-badge"
              style={{
                backgroundColor: bgColors[type],
                color: colors[type],
                cursor: "help",
                fontSize: "10px",
                padding: "2px 8px"
              }}
            >
              {type === "positive" && <IconArrowUpRight size={10} stroke={2.5} />}
              {type === "negative" && <IconArrowDownRight size={10} stroke={2.5} />}
              {type === "stable" && <IconMinus size={10} stroke={2.5} />}
              <span style={{ fontFamily: "JetBrains Mono", marginLeft: 2 }}>
                {type === "stable" ? "—" : `${Math.abs(change || 0)}%`}
              </span>
            </Box>
          </Tooltip>
        )}
      </Group>

      <Group align="flex-end" justify="space-between" gap="sm">
        <Box>
          <Text className="stat-value" style={{ color: "var(--nv-dark)" }}>
            {prefix && <span style={{ fontSize: "0.5em", color: "var(--nv-slate-light)", marginRight: 2 }}>{prefix}</span>}
            {value}
            {suffix && <span style={{ fontSize: "0.5em", color: "var(--nv-slate-light)", marginLeft: 2 }}>{suffix}</span>}
          </Text>
        </Box>

        {/* Micro Sparkline if data exists */}
        {chartData && (
          <Box w={60} h={24} style={{ flexShrink: 0 }}>
            <Sparkline
              data={chartData}
              curveType="monotone"
              color={colors[type]}
              fillOpacity={0.1}
              strokeWidth={1.5}
              trendColors={{
                positive: colors.positive,
                negative: colors.negative,
                neutral: colors.stable,
              }}
            />
          </Box>
        )}
      </Group>
    </Box>
  );
}

// Deprecated old component compatibility wrapper
export const StatsCard = (props: any) => <KPICard {...props} />;
