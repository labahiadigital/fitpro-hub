import { useState } from 'react'
import {
  Paper,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  Switch,
  Badge,
  ThemeIcon,
  CopyButton,
  ActionIcon,
  Tooltip,
  Alert,
} from '@mantine/core'
import {
  IconVideo,
  IconLink,
  IconCopy,
  IconCheck,
  IconBrandZoom,
  IconExternalLink,
  IconAlertCircle,
} from '@tabler/icons-react'

interface OnlineSessionSettingsProps {
  isZoomConnected: boolean
  onConnectZoom: () => void
  meetingLink?: string
  onGenerateLink: () => void
  onCustomLinkChange: (link: string) => void
}

export function OnlineSessionSettings({
  isZoomConnected,
  onConnectZoom,
  meetingLink,
  onGenerateLink,
  onCustomLinkChange,
}: OnlineSessionSettingsProps) {
  const [useCustomLink, setUseCustomLink] = useState(false)
  const [customLink, setCustomLink] = useState('')

  return (
    <Stack gap="md">
      {/* Zoom Integration */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconBrandZoom size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Integración con Zoom</Text>
              <Text size="xs" c="dimmed">Crea reuniones automáticamente</Text>
            </div>
          </Group>
          {isZoomConnected ? (
            <Badge color="green" variant="light">Conectado</Badge>
          ) : (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconBrandZoom size={14} />}
              onClick={onConnectZoom}
            >
              Conectar Zoom
            </Button>
          )}
        </Group>

        {isZoomConnected && (
          <Stack gap="sm">
            <Button
              variant="light"
              leftSection={<IconVideo size={16} />}
              onClick={onGenerateLink}
              fullWidth
            >
              Generar Enlace de Zoom
            </Button>
            {meetingLink && (
              <Paper withBorder p="sm" radius="sm" bg="gray.0">
                <Group justify="space-between">
                  <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                    {meetingLink}
                  </Text>
                  <Group gap="xs">
                    <CopyButton value={meetingLink}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copiado' : 'Copiar'}>
                          <ActionIcon
                            color={copied ? 'green' : 'gray'}
                            variant="subtle"
                            onClick={copy}
                          >
                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                    <Tooltip label="Abrir enlace">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        component="a"
                        href={meetingLink}
                        target="_blank"
                      >
                        <IconExternalLink size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Paper>
            )}
          </Stack>
        )}

        {!isZoomConnected && (
          <Alert color="blue" icon={<IconAlertCircle size={16} />}>
            Conecta tu cuenta de Zoom para crear reuniones automáticamente cuando programes sesiones online.
          </Alert>
        )}
      </Paper>

      {/* Custom Link Option */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="violet" variant="light">
              <IconLink size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Enlace Personalizado</Text>
              <Text size="xs" c="dimmed">Usa tu propio enlace de videollamada</Text>
            </div>
          </Group>
          <Switch
            checked={useCustomLink}
            onChange={(e) => setUseCustomLink(e.currentTarget.checked)}
          />
        </Group>

        {useCustomLink && (
          <TextInput
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            value={customLink}
            onChange={(e) => {
              setCustomLink(e.target.value)
              onCustomLinkChange(e.target.value)
            }}
            leftSection={<IconLink size={16} />}
          />
        )}
      </Paper>

      {/* On-Demand Content */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="orange" variant="light">
              <IconVideo size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Contenido On-Demand</Text>
              <Text size="xs" c="dimmed">Graba y comparte clases para ver después</Text>
            </div>
          </Group>
          <Badge color="orange" variant="light">Próximamente</Badge>
        </Group>
      </Paper>
    </Stack>
  )
}

