import { useState } from 'react'
import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  Textarea,
  ColorInput,
  FileInput,
  Switch,
  Divider,
  SimpleGrid,
  ThemeIcon,
  Badge,
  Box,
  Image,
  Card,
  Alert,
} from '@mantine/core'
import {
  IconPalette,
  IconBrandApple,
  IconBrandAndroid,
  IconWorld,
  IconMail,
  IconPhoto,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react'

interface BrandingConfig {
  workspaceName: string
  tagline: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  faviconUrl: string | null
  customDomain: string
  supportEmail: string
  enableWhiteLabel: boolean
  hideFooterBranding: boolean
  customEmailFrom: string
  emailSignature: string
}

interface BrandingSettingsProps {
  config: BrandingConfig
  onChange: (config: BrandingConfig) => void
  onSave: () => void
  isPro: boolean
}

export function BrandingSettings({ config, onChange, onSave, isPro }: BrandingSettingsProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)

  const updateConfig = <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <Stack gap="xl">
      {/* Basic Branding */}
      <Paper withBorder radius="md" p="lg">
        <Group gap="sm" mb="lg">
          <ThemeIcon size="lg" radius="md" color="primary" variant="light">
            <IconPalette size={20} />
          </ThemeIcon>
          <div>
            <Title order={4}>Identidad de Marca</Title>
            <Text size="sm" c="dimmed">Personaliza la apariencia de tu plataforma</Text>
          </div>
        </Group>

        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Nombre del Negocio"
              placeholder="Mi Estudio Fitness"
              value={config.workspaceName}
              onChange={(e) => updateConfig('workspaceName', e.target.value)}
            />
            <TextInput
              label="Eslogan"
              placeholder="Tu mejor versión comienza aquí"
              value={config.tagline}
              onChange={(e) => updateConfig('tagline', e.target.value)}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <ColorInput
              label="Color Principal"
              placeholder="#10B981"
              value={config.primaryColor}
              onChange={(value) => updateConfig('primaryColor', value)}
              swatches={['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899']}
            />
            <ColorInput
              label="Color Secundario"
              placeholder="#1F2937"
              value={config.secondaryColor}
              onChange={(value) => updateConfig('secondaryColor', value)}
              swatches={['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF']}
            />
          </SimpleGrid>

          <Divider my="sm" />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <div>
              <FileInput
                label="Logo"
                placeholder="Sube tu logo"
                accept="image/*"
                leftSection={<IconPhoto size={14} />}
                value={logoFile}
                onChange={setLogoFile}
              />
              {config.logoUrl && (
                <Box mt="xs" p="sm" bg="gray.0" style={{ borderRadius: 8 }}>
                  <Image src={config.logoUrl} h={60} fit="contain" />
                </Box>
              )}
            </div>
            <div>
              <FileInput
                label="Favicon"
                placeholder="Sube tu favicon"
                accept="image/*"
                leftSection={<IconPhoto size={14} />}
                value={faviconFile}
                onChange={setFaviconFile}
              />
              <Text size="xs" c="dimmed" mt={4}>
                Recomendado: 32x32px o 64x64px
              </Text>
            </div>
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* White Label */}
      <Paper withBorder radius="md" p="lg">
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="violet" variant="light">
              <IconWorld size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>White Label</Title>
              <Text size="sm" c="dimmed">Elimina el branding de FitPro Hub</Text>
            </div>
          </Group>
          {!isPro && (
            <Badge color="yellow" variant="light">Plan Business requerido</Badge>
          )}
        </Group>

        {!isPro ? (
          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
            Actualiza a Business para acceder a las opciones de white label y personalizar
            completamente tu plataforma.
          </Alert>
        ) : (
          <Stack gap="md">
            <Switch
              label="Habilitar White Label"
              description="Elimina todas las referencias a FitPro Hub"
              checked={config.enableWhiteLabel}
              onChange={(e) => updateConfig('enableWhiteLabel', e.currentTarget.checked)}
            />
            <Switch
              label="Ocultar branding en footer"
              description="Elimina 'Powered by FitPro Hub' del pie de página"
              checked={config.hideFooterBranding}
              onChange={(e) => updateConfig('hideFooterBranding', e.currentTarget.checked)}
              disabled={!config.enableWhiteLabel}
            />
            <TextInput
              label="Dominio Personalizado"
              placeholder="app.tudominio.com"
              leftSection={<IconWorld size={14} />}
              value={config.customDomain}
              onChange={(e) => updateConfig('customDomain', e.target.value)}
              disabled={!config.enableWhiteLabel}
            />
          </Stack>
        )}
      </Paper>

      {/* Email Customization */}
      <Paper withBorder radius="md" p="lg">
        <Group gap="sm" mb="lg">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light">
            <IconMail size={20} />
          </ThemeIcon>
          <div>
            <Title order={4}>Personalización de Emails</Title>
            <Text size="sm" c="dimmed">Configura cómo se envían los emails a tus clientes</Text>
          </div>
        </Group>

        <Stack gap="md">
          <TextInput
            label="Email de Soporte"
            placeholder="soporte@tudominio.com"
            leftSection={<IconMail size={14} />}
            value={config.supportEmail}
            onChange={(e) => updateConfig('supportEmail', e.target.value)}
          />
          <TextInput
            label="Remitente de Emails"
            placeholder="Tu Nombre <noreply@tudominio.com>"
            value={config.customEmailFrom}
            onChange={(e) => updateConfig('customEmailFrom', e.target.value)}
            disabled={!isPro}
          />
          <Textarea
            label="Firma de Email"
            placeholder="Escribe tu firma personalizada..."
            minRows={3}
            value={config.emailSignature}
            onChange={(e) => updateConfig('emailSignature', e.target.value)}
          />
        </Stack>
      </Paper>

      {/* Mobile App */}
      <Paper withBorder radius="md" p="lg">
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="gray" variant="light">
              <IconBrandApple size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>App Móvil Personalizada</Title>
              <Text size="sm" c="dimmed">Tu propia app en las tiendas</Text>
            </div>
          </Group>
          <Badge color="orange" variant="light">Próximamente</Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card withBorder radius="md" p="md">
            <Group gap="sm" mb="sm">
              <IconBrandApple size={24} />
              <Text fw={600}>iOS App</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="md">
              Tu app personalizada en la App Store con tu marca y colores.
            </Text>
            <Button variant="light" fullWidth disabled>
              Solicitar App iOS
            </Button>
          </Card>
          <Card withBorder radius="md" p="md">
            <Group gap="sm" mb="sm">
              <IconBrandAndroid size={24} />
              <Text fw={600}>Android App</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="md">
              Tu app personalizada en Google Play con tu marca y colores.
            </Text>
            <Button variant="light" fullWidth disabled>
              Solicitar App Android
            </Button>
          </Card>
        </SimpleGrid>
      </Paper>

      {/* Save Button */}
      <Group justify="flex-end">
        <Button leftSection={<IconCheck size={16} />} onClick={onSave}>
          Guardar Cambios
        </Button>
      </Group>
    </Stack>
  )
}

