import { Paper, Title, SimpleGrid, UnstyledButton, Text, ThemeIcon, Group } from '@mantine/core'
import { 
  IconUserPlus, 
  IconCalendarPlus, 
  IconBarbell, 
  IconSalad,
  IconMessage,
  IconCreditCard,
  IconForms,
  IconRobot
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

interface QuickAction {
  icon: React.ElementType
  label: string
  description: string
  color: string
  path: string
}

const quickActions: QuickAction[] = [
  {
    icon: IconUserPlus,
    label: 'Nuevo Cliente',
    description: 'Añadir cliente',
    color: 'blue',
    path: '/clients?action=new'
  },
  {
    icon: IconCalendarPlus,
    label: 'Nueva Sesión',
    description: 'Programar sesión',
    color: 'teal',
    path: '/calendar?action=new'
  },
  {
    icon: IconBarbell,
    label: 'Crear Rutina',
    description: 'Nuevo entrenamiento',
    color: 'orange',
    path: '/workouts?action=new'
  },
  {
    icon: IconSalad,
    label: 'Plan Nutricional',
    description: 'Crear plan',
    color: 'green',
    path: '/nutrition?action=new'
  },
  {
    icon: IconMessage,
    label: 'Enviar Mensaje',
    description: 'Chat con cliente',
    color: 'violet',
    path: '/chat'
  },
  {
    icon: IconCreditCard,
    label: 'Nuevo Pago',
    description: 'Registrar pago',
    color: 'pink',
    path: '/payments?action=new'
  },
  {
    icon: IconForms,
    label: 'Enviar Formulario',
    description: 'Asignar formulario',
    color: 'cyan',
    path: '/forms?action=send'
  },
  {
    icon: IconRobot,
    label: 'Automatización',
    description: 'Crear workflow',
    color: 'grape',
    path: '/automations?action=new'
  },
]

export function QuickActionsWidget() {
  const navigate = useNavigate()

  return (
    <Paper p="md" radius="md" withBorder>
      <Title order={5} mb="md">Acciones Rápidas</Title>
      
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        {quickActions.map((action) => (
          <UnstyledButton
            key={action.path}
            onClick={() => navigate(action.path)}
            style={{
              padding: 12,
              borderRadius: 8,
              transition: 'background-color 0.2s',
            }}
            styles={{
              root: {
                '&:hover': {
                  backgroundColor: 'var(--mantine-color-gray-0)',
                }
              }
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon 
                size="lg" 
                radius="md" 
                color={action.color}
                variant="light"
              >
                <action.icon size={18} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={500}>{action.label}</Text>
                <Text size="xs" c="dimmed">{action.description}</Text>
              </div>
            </Group>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Paper>
  )
}

