import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  CopyButton,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBrandZoom,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconVideo,
} from "@tabler/icons-react";
import { useState } from "react";

interface OnlineSessionSettingsProps {
  isZoomConnected: boolean;
  onConnectZoom: () => void;
  meetingLink?: string;
  onGenerateLink: () => void;
  onCustomLinkChange: (link: string) => void;
}

export function OnlineSessionSettings({
  isZoomConnected,
  onConnectZoom,
  meetingLink,
  onGenerateLink,
  onCustomLinkChange,
}: OnlineSessionSettingsProps) {
  const [useCustomLink, setUseCustomLink] = useState(false);
  const [customLink, setCustomLink] = useState("");

  return (
    <Stack gap="md">
      {/* Zoom Integration */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <ThemeIcon color="blue" radius="md" size="lg" variant="light">
              <IconBrandZoom size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Integración con Zoom</Text>
              <Text c="dimmed" size="xs">
                Crea reuniones automáticamente
              </Text>
            </div>
          </Group>
          {isZoomConnected ? (
            <Badge color="green" variant="light">
              Conectado
            </Badge>
          ) : (
            <Button
              leftSection={<IconBrandZoom size={14} />}
              onClick={onConnectZoom}
              size="xs"
              variant="light"
            >
              Conectar Zoom
            </Button>
          )}
        </Group>

        {isZoomConnected && (
          <Stack gap="sm">
            <Button
              fullWidth
              leftSection={<IconVideo size={16} />}
              onClick={onGenerateLink}
              variant="light"
            >
              Generar Enlace de Zoom
            </Button>
            {meetingLink && (
              <Paper bg="gray.0" p="sm" radius="sm" withBorder>
                <Group justify="space-between">
                  <Text lineClamp={1} size="sm" style={{ flex: 1 }}>
                    {meetingLink}
                  </Text>
                  <Group gap="xs">
                    <CopyButton value={meetingLink}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "Copiado" : "Copiar"}>
                          <ActionIcon
                            color={copied ? "green" : "gray"}
                            onClick={copy}
                            variant="subtle"
                          >
                            {copied ? (
                              <IconCheck size={16} />
                            ) : (
                              <IconCopy size={16} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                    <Tooltip label="Abrir enlace">
                      <ActionIcon
                        color="blue"
                        component="a"
                        href={meetingLink}
                        target="_blank"
                        variant="subtle"
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
            Conecta tu cuenta de Zoom para crear reuniones automáticamente
            cuando programes sesiones online.
          </Alert>
        )}
      </Paper>

      {/* Custom Link Option */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <ThemeIcon color="violet" radius="md" size="lg" variant="light">
              <IconLink size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Enlace Personalizado</Text>
              <Text c="dimmed" size="xs">
                Usa tu propio enlace de videollamada
              </Text>
            </div>
          </Group>
          <Switch
            checked={useCustomLink}
            onChange={(e) => setUseCustomLink(e.currentTarget.checked)}
          />
        </Group>

        {useCustomLink && (
          <TextInput
            leftSection={<IconLink size={16} />}
            onChange={(e) => {
              setCustomLink(e.target.value);
              onCustomLinkChange(e.target.value);
            }}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            value={customLink}
          />
        )}
      </Paper>

      {/* On-Demand Content */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon color="orange" radius="md" size="lg" variant="light">
              <IconVideo size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Contenido On-Demand</Text>
              <Text c="dimmed" size="xs">
                Graba y comparte clases para ver después
              </Text>
            </div>
          </Group>
          <Badge color="orange" variant="light">
            Próximamente
          </Badge>
        </Group>
      </Paper>
    </Stack>
  );
}
