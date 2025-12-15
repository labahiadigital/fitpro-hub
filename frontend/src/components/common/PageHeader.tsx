import { Group, Title, Text, Button, Box, Breadcrumbs, Anchor } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  action?: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: string
  }
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  secondaryAction,
  children,
}: PageHeaderProps) {
  return (
    <Box mb="xl">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs mb="sm" separator="›">
          {breadcrumbs.map((item, index) => (
            item.href ? (
              <Anchor
                key={index}
                component={Link}
                to={item.href}
                size="sm"
                c="dimmed"
              >
                {item.label}
              </Anchor>
            ) : (
              <Text key={index} size="sm" c="dimmed">
                {item.label}
              </Text>
            )
          ))}
        </Breadcrumbs>
      )}
      
      <Group justify="space-between" align="flex-start">
        <Box>
          <Title order={2} fw={700}>
            {title}
          </Title>
          {description && (
            <Text size="sm" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </Box>
        
        <Group gap="sm">
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant as 'default' | 'outline' || 'default'}
              leftSection={secondaryAction.icon}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              leftSection={action.icon || <IconPlus size={16} />}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </Group>
      </Group>
      
      {children && <Box mt="md">{children}</Box>}
    </Box>
  )
}

