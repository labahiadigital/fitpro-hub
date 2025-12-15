import { Paper, Group, Text, ThemeIcon, Box } from '@mantine/core'
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  change?: number
  changeLabel?: string
  color?: string
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  change, 
  changeLabel,
  color = 'primary' 
}: StatsCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0
  
  return (
    <Paper 
      p="lg" 
      radius="lg" 
      withBorder
      style={{
        borderColor: 'var(--mantine-color-gray-2)',
        background: 'linear-gradient(135deg, var(--mantine-color-white) 0%, var(--mantine-color-gray-0) 100%)',
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
            {title}
          </Text>
          <Text size="xl" fw={700} style={{ fontSize: '1.75rem', lineHeight: 1.2 }}>
            {value}
          </Text>
          {change !== undefined && (
            <Group gap={4} mt={8}>
              {isPositive && (
                <ThemeIcon size="xs" color="green" variant="light" radius="xl">
                  <IconArrowUpRight size={12} />
                </ThemeIcon>
              )}
              {isNegative && (
                <ThemeIcon size="xs" color="red" variant="light" radius="xl">
                  <IconArrowDownRight size={12} />
                </ThemeIcon>
              )}
              <Text 
                size="xs" 
                c={isPositive ? 'green' : isNegative ? 'red' : 'dimmed'}
                fw={500}
              >
                {isPositive && '+'}{change}%
              </Text>
              {changeLabel && (
                <Text size="xs" c="dimmed">
                  {changeLabel}
                </Text>
              )}
            </Group>
          )}
        </Box>
        <ThemeIcon 
          size={48} 
          radius="xl" 
          color={color}
          variant="light"
        >
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  )
}

