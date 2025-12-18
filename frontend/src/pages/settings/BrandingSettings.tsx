import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  ColorInput,
  Divider,
  FileInput,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBrandAndroid,
  IconBrandApple,
  IconCheck,
  IconMail,
  IconPalette,
  IconPhoto,
  IconWorld,
} from "@tabler/icons-react";
import { useState } from "react";

interface BrandingConfig {
  workspaceName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  customDomain: string;
  supportEmail: string;
  enableWhiteLabel: boolean;
  hideFooterBranding: boolean;
  customEmailFrom: string;
  emailSignature: string;
}

interface BrandingSettingsProps {
  config: BrandingConfig;
  onChange: (config: BrandingConfig) => void;
  onSave: () => void;
  isPro: boolean;
}

export function BrandingSettings({
  config,
  onChange,
  onSave,
  isPro,
}: BrandingSettingsProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  const updateConfig = <K extends keyof BrandingConfig>(
    key: K,
    value: BrandingConfig[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <Stack gap="xl">
      {/* Basic Branding */}
      <Paper p="lg" radius="md" withBorder>
        <Group gap="sm" mb="lg">
          <ThemeIcon color="primary" radius="md" size="lg" variant="light">
            <IconPalette size={20} />
          </ThemeIcon>
          <div>
            <Title order={4}>Identidad de Marca</Title>
            <Text c="dimmed" size="sm">
              Personaliza la apariencia de tu plataforma
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Nombre del Negocio"
              onChange={(e) => updateConfig("workspaceName", e.target.value)}
              placeholder="Mi Estudio Fitness"
              value={config.workspaceName}
            />
            <TextInput
              label="Eslogan"
              onChange={(e) => updateConfig("tagline", e.target.value)}
              placeholder="Tu mejor versión comienza aquí"
              value={config.tagline}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <ColorInput
              label="Color Principal"
              onChange={(value) => updateConfig("primaryColor", value)}
              placeholder="#10B981"
              swatches={[
                "#10B981",
                "#3B82F6",
                "#8B5CF6",
                "#F59E0B",
                "#EF4444",
                "#EC4899",
              ]}
              value={config.primaryColor}
            />
            <ColorInput
              label="Color Secundario"
              onChange={(value) => updateConfig("secondaryColor", value)}
              placeholder="#1F2937"
              swatches={["#1F2937", "#374151", "#4B5563", "#6B7280", "#9CA3AF"]}
              value={config.secondaryColor}
            />
          </SimpleGrid>

          <Divider my="sm" />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <div>
              <FileInput
                accept="image/*"
                label="Logo"
                leftSection={<IconPhoto size={14} />}
                onChange={setLogoFile}
                placeholder="Sube tu logo"
                value={logoFile}
              />
              {config.logoUrl && (
                <Box bg="gray.0" mt="xs" p="sm" style={{ borderRadius: 8 }}>
                  <Image fit="contain" h={60} src={config.logoUrl} />
                </Box>
              )}
            </div>
            <div>
              <FileInput
                accept="image/*"
                label="Favicon"
                leftSection={<IconPhoto size={14} />}
                onChange={setFaviconFile}
                placeholder="Sube tu favicon"
                value={faviconFile}
              />
              <Text c="dimmed" mt={4} size="xs">
                Recomendado: 32x32px o 64x64px
              </Text>
            </div>
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* White Label */}
      <Paper p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ThemeIcon color="violet" radius="md" size="lg" variant="light">
              <IconWorld size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>White Label</Title>
              <Text c="dimmed" size="sm">
                Elimina el branding de FitPro Hub
              </Text>
            </div>
          </Group>
          {!isPro && (
            <Badge color="yellow" variant="light">
              Plan Business requerido
            </Badge>
          )}
        </Group>

        {isPro ? (
          <Stack gap="md">
            <Switch
              checked={config.enableWhiteLabel}
              description="Elimina todas las referencias a FitPro Hub"
              label="Habilitar White Label"
              onChange={(e) =>
                updateConfig("enableWhiteLabel", e.currentTarget.checked)
              }
            />
            <Switch
              checked={config.hideFooterBranding}
              description="Elimina 'Powered by FitPro Hub' del pie de página"
              disabled={!config.enableWhiteLabel}
              label="Ocultar branding en footer"
              onChange={(e) =>
                updateConfig("hideFooterBranding", e.currentTarget.checked)
              }
            />
            <TextInput
              disabled={!config.enableWhiteLabel}
              label="Dominio Personalizado"
              leftSection={<IconWorld size={14} />}
              onChange={(e) => updateConfig("customDomain", e.target.value)}
              placeholder="app.tudominio.com"
              value={config.customDomain}
            />
          </Stack>
        ) : (
          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
            Actualiza a Business para acceder a las opciones de white label y
            personalizar completamente tu plataforma.
          </Alert>
        )}
      </Paper>

      {/* Email Customization */}
      <Paper p="lg" radius="md" withBorder>
        <Group gap="sm" mb="lg">
          <ThemeIcon color="blue" radius="md" size="lg" variant="light">
            <IconMail size={20} />
          </ThemeIcon>
          <div>
            <Title order={4}>Personalización de Emails</Title>
            <Text c="dimmed" size="sm">
              Configura cómo se envían los emails a tus clientes
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <TextInput
            label="Email de Soporte"
            leftSection={<IconMail size={14} />}
            onChange={(e) => updateConfig("supportEmail", e.target.value)}
            placeholder="soporte@tudominio.com"
            value={config.supportEmail}
          />
          <TextInput
            disabled={!isPro}
            label="Remitente de Emails"
            onChange={(e) => updateConfig("customEmailFrom", e.target.value)}
            placeholder="Tu Nombre <noreply@tudominio.com>"
            value={config.customEmailFrom}
          />
          <Textarea
            label="Firma de Email"
            minRows={3}
            onChange={(e) => updateConfig("emailSignature", e.target.value)}
            placeholder="Escribe tu firma personalizada..."
            value={config.emailSignature}
          />
        </Stack>
      </Paper>

      {/* Mobile App */}
      <Paper p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ThemeIcon color="gray" radius="md" size="lg" variant="light">
              <IconBrandApple size={20} />
            </ThemeIcon>
            <div>
              <Title order={4}>App Móvil Personalizada</Title>
              <Text c="dimmed" size="sm">
                Tu propia app en las tiendas
              </Text>
            </div>
          </Group>
          <Badge color="orange" variant="light">
            Próximamente
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card p="md" radius="md" withBorder>
            <Group gap="sm" mb="sm">
              <IconBrandApple size={24} />
              <Text fw={600}>iOS App</Text>
            </Group>
            <Text c="dimmed" mb="md" size="sm">
              Tu app personalizada en la App Store con tu marca y colores.
            </Text>
            <Button disabled fullWidth variant="light">
              Solicitar App iOS
            </Button>
          </Card>
          <Card p="md" radius="md" withBorder>
            <Group gap="sm" mb="sm">
              <IconBrandAndroid size={24} />
              <Text fw={600}>Android App</Text>
            </Group>
            <Text c="dimmed" mb="md" size="sm">
              Tu app personalizada en Google Play con tu marca y colores.
            </Text>
            <Button disabled fullWidth variant="light">
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
  );
}
