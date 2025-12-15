import { Paper, Text, Title, Group, Badge, useMantineTheme } from '@mantine/core'
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'

interface GrowthData {
  month: string
  total: number
  new: number
  churned: number
}

interface ClientGrowthChartProps {
  data: GrowthData[]
  totalClients: number
  newThisMonth: number
  churnedThisMonth: number
}

export function ClientGrowthChart({ data, totalClients, newThisMonth, churnedThisMonth }: ClientGrowthChartProps) {
  const theme = useMantineTheme()
  const netGrowth = newThisMonth - churnedThisMonth
  const isPositive = netGrowth >= 0

  const maxClients = Math.max(...data.map(d => d.total), 1)

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Text size="sm" c="dimmed" fw={500}>Clientes Activos</Text>
          <Group gap="xs" align="baseline">
            <Title order={2}>{totalClients}</Title>
            <Badge 
              color={isPositive ? 'teal' : 'red'} 
              variant="light"
              leftSection={isPositive ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
            >
              {isPositive ? '+' : ''}{netGrowth} este mes
            </Badge>
          </Group>
        </div>
        <Group gap="lg">
          <div style={{ textAlign: 'center' }}>
            <Text size="xs" c="dimmed">Nuevos</Text>
            <Text size="lg" fw={600} c="teal">+{newThisMonth}</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text size="xs" c="dimmed">Bajas</Text>
            <Text size="lg" fw={600} c="red">-{churnedThisMonth}</Text>
          </div>
        </Group>
      </Group>

      {/* Area chart simulation */}
      <div style={{ position: 'relative', height: 120, marginTop: 16 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="clientGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.colors.blue[5]} stopOpacity="0.3" />
              <stop offset="100%" stopColor={theme.colors.blue[5]} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 100 ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100
              const y = 100 - (d.total / maxClients) * 80
              return `L ${x} ${y}`
            }).join(' ')} L 100 100 Z`}
            fill="url(#clientGradient)"
          />
          <path
            d={`M ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100
              const y = 100 - (d.total / maxClients) * 80
              return `${i === 0 ? '' : 'L '}${x} ${y}`
            }).join(' ')}`}
            fill="none"
            stroke={theme.colors.blue[5]}
            strokeWidth="2"
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - (d.total / maxClients) * 80
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={theme.colors.blue[5]}
              />
            )
          })}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {data.map((item, index) => (
            <Text key={index} size="xs" c="dimmed">{item.month}</Text>
          ))}
        </div>
      </div>
    </Paper>
  )
}

