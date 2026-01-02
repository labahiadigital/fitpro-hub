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
    positive: "rgba(16, 185, 129, 0.08)",
    negative: "rgba(239, 68, 68, 0.08)",
    stable: "rgba(100, 116, 139, 0.08)",
  };

  return (
    <Box className="premium-card" p="lg">
      <Group justify="space-between" align="flex-start" mb="xs">
        <Text className="text-label">{title}</Text>
        
        {/* Trend Pill */}
        {(change !== undefined || type === "stable") && (
          <Tooltip label={changeLabel || "Vs last period"} withArrow position="top">
            <Box
              className="pill-badge"
              style={{
                backgroundColor: bgColors[type],
                color: colors[type],
                cursor: "help"
              }}
            >
              {type === "positive" && <IconArrowUpRight size={12} stroke={2.5} style={{ marginRight: 4 }} />}
              {type === "negative" && <IconArrowDownRight size={12} stroke={2.5} style={{ marginRight: 4 }} />}
              {type === "stable" && <IconMinus size={12} stroke={2.5} style={{ marginRight: 4 }} />}
              <span style={{ fontFamily: "JetBrains Mono", letterSpacing: "-0.5px" }}>
                {type === "stable" ? "STABLE" : `${Math.abs(change || 0)}%`}
              </span>
            </Box>
          </Tooltip>
        )}
      </Group>

      <Group align="flex-end" justify="space-between" mt="md">
        <Box>
          <Text className="text-display" style={{ fontSize: "2.5rem" }}>
            <span style={{ fontSize: "0.6em", color: "var(--nv-slate-light)", verticalAlign: "top", marginRight: 2 }}>{prefix}</span>
            {value}
            <span style={{ fontSize: "0.5em", color: "var(--nv-slate-light)", verticalAlign: "baseline", marginLeft: 2 }}>{suffix}</span>
          </Text>
        </Box>

        {/* Micro Sparkline if data exists */}
        {chartData && (
          <Box w={80} h={30}>
            <Sparkline
              data={chartData}
              curveType="monotone"
              color={colors[type]}
              fillOpacity={0.1}
              strokeWidth={2}
              trendColors={{
                positive: colors.positive,
                negative: colors.negative,
                neutral: colors.stable,
                loss: colors.negative,
              }}
            />
          </Box>
        )}
      </Group>
      
      {/* Decorative background glow */}
      <Box
        style={{
          position: "absolute",
          bottom: "-40%",
          right: "-10%",
          width: "150px",
          height: "150px",
          background: `radial-gradient(circle, ${type === "positive" ? "rgba(16, 185, 129, 0.05)" : type === "negative" ? "rgba(239, 68, 68, 0.05)" : "transparent"} 0%, transparent 70%)`,
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
    </Box>
  );
}

// Deprecated old component compatibility wrapper
export const StatsCard = (props: any) => <KPICard {...props} />;
