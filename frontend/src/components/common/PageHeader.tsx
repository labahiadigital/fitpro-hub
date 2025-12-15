import { Group, Title, Text, Button, Box, Breadcrumbs, Anchor } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface ActionButton {
  label: string
  icon?: React.ReactNode
  onClick: () => void
}

interface PageHeaderProps {
  title: string
  description?: string
  subtitle?: string // Alias for description
  breadcrumbs?: BreadcrumbItem[]
  action?: ActionButton | React.ReactNode
  secondaryAction?: ActionButton & { variant?: string }
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  subtitle,
  breadcrumbs,
  action,
  secondaryAction,
  children,
}: PageHeaderProps) {
  const displayDescription = description || subtitle

  // Check if action is a React element or an action object
  const isActionElement = action && typeof action === 'object' && 'type' in action
  const actionButton = !isActionElement ? action as ActionButton | undefined : undefined
  const actionElement = isActionElement ? action as React.ReactNode : undefined

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
          {displayDescription && (
            <Text size="sm" c="dimmed" mt={4}>
              {displayDescription}
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
          {actionElement}
          {actionButton && (
            <Button
              leftSection={actionButton.icon || <IconPlus size={16} />}
              onClick={actionButton.onClick}
            >
              {actionButton.label}
            </Button>
          )}
        </Group>
      </Group>
      
      {children && <Box mt="md">{children}</Box>}
    </Box>
  )
}
