import { Paper, Title, Text, Group, Stack, Badge, useMantineTheme } from '@mantine/core'
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'

interface RevenueData {
  month: string
  revenue: number
  subscriptions: number
  oneTime: number
}

interface RevenueChartProps {
  data: RevenueData[]
  currentMRR: number
  previousMRR: number
  currency?: string
}

export function RevenueChart({ data, currentMRR, previousMRR, currency = '€' }: RevenueChartProps) {
  const theme = useMantineTheme()
  const change = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0
  const isPositive = change >= 0

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Text size="sm" c="dimmed" fw={500}>Ingresos Mensuales (MRR)</Text>
          <Group gap="xs" align="baseline">
            <Title order={2}>{currency}{currentMRR.toLocaleString()}</Title>
            <Badge 
              color={isPositive ? 'teal' : 'red'} 
              variant="light"
              leftSection={isPositive ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
            >
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </Badge>
          </Group>
        </div>
        <Group gap="lg">
          <Stack gap={2}>
            <Text size="xs" c="dimmed">Suscripciones</Text>
            <Text size="sm" fw={600} c="teal">{currency}{data.reduce((sum, d) => sum + d.subscriptions, 0).toLocaleString()}</Text>
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed">Pagos únicos</Text>
            <Text size="sm" fw={600} c="blue">{currency}{data.reduce((sum, d) => sum + d.oneTime, 0).toLocaleString()}</Text>
          </Stack>
        </Group>
      </Group>

      {/* Simple bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, marginTop: 16 }}>
        {data.map((item, index) => (
          <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              style={{ 
                width: '100%', 
                height: `${(item.revenue / maxRevenue) * 100}%`,
                minHeight: 4,
                background: `linear-gradient(180deg, ${theme.colors.teal[5]} 0%, ${theme.colors.teal[7]} 100%)`,
                borderRadius: 4,
                transition: 'height 0.3s ease'
              }} 
            />
            <Text size="xs" c="dimmed" mt={4}>{item.month}</Text>
          </div>
        ))}
      </div>
    </Paper>
  )
}

