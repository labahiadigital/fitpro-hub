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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
            <Title order={4}>{t("branding.identidadDeMarca")}</Title>
            <Text c="dimmed" size="sm">
              {t("branding.personalizaApariencia")}
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t("branding.nombreDelNegocio")}
              onChange={(e) => updateConfig("workspaceName", e.target.value)}
              placeholder={t("branding.miEstudioFitness")}
              value={config.workspaceName}
            />
            <TextInput
              label={t("branding.eslogan")}
              onChange={(e) => updateConfig("tagline", e.target.value)}
              placeholder={t("settings.tuMejorVersionComienzaAqui")}
              value={config.tagline}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <ColorInput
              label={t("branding.colorPrincipal")}
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
              label={t("branding.colorSecundario")}
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
                label={t("branding.logo")}
                leftSection={<IconPhoto size={14} />}
                onChange={setLogoFile}
                placeholder={t("branding.subeTuLogo")}
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
                label={t("branding.favicon")}
                leftSection={<IconPhoto size={14} />}
                onChange={setFaviconFile}
                placeholder={t("branding.subeTuFavicon")}
                value={faviconFile}
              />
              <Text c="dimmed" mt={4} size="xs">
                {"Recomendado: 32x32px o 64x64px"}
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
              <Title order={4}>{"White Label"}</Title>
              <Text c="dimmed" size="sm">
                {t("branding.eliminaBranding")}
              </Text>
            </div>
          </Group>
          {!isPro && (
            <Badge color="yellow" variant="light">
              {"Plan Business requerido"}
            </Badge>
          )}
        </Group>

        {isPro ? (
          <Stack gap="md">
            <Switch
              checked={config.enableWhiteLabel}
              description={t("branding.eliminaReferencias")}
              label={t("branding.habilitarWhiteLabel")}
              onChange={(e) =>
                updateConfig("enableWhiteLabel", e.currentTarget.checked)
              }
            />
            <Switch
              checked={config.hideFooterBranding}
              description={t("settings.eliminaPoweredByTrackfizDel")}
              disabled={!config.enableWhiteLabel}
              label={t("branding.ocultarBrandingFooter")}
              onChange={(e) =>
                updateConfig("hideFooterBranding", e.currentTarget.checked)
              }
            />
            <TextInput
              disabled={!config.enableWhiteLabel}
              label={t("branding.dominioPersonalizado")}
              leftSection={<IconWorld size={14} />}
              onChange={(e) => updateConfig("customDomain", e.target.value)}
              placeholder={t("branding.appTudominio")}
              value={config.customDomain}
            />
          </Stack>
        ) : (
          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
{t("settings.upgradeToBusinessWhiteLabel")}
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
            <Title order={4}>{t("branding.personalizacionEmails")}</Title>
            <Text c="dimmed" size="sm">
              {t("branding.configuraComo")}
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <TextInput
            label={t("branding.emailDeSoporte")}
            leftSection={<IconMail size={14} />}
            onChange={(e) => updateConfig("supportEmail", e.target.value)}
            placeholder={t("branding.soporteTudominio")}
            value={config.supportEmail}
          />
          <TextInput
            disabled={!isPro}
            label={t("branding.remitenteDeEmails")}
            onChange={(e) => updateConfig("customEmailFrom", e.target.value)}
            placeholder={t("branding.tuNombreNoreply")}
            value={config.customEmailFrom}
          />
          <Textarea
            label={t("branding.firmaDeEmail")}
            minRows={3}
            onChange={(e) => updateConfig("emailSignature", e.target.value)}
            placeholder={t("branding.escribeTuFirma")}
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
              <Title order={4}>{"App Móvil Personalizada"}</Title>
              <Text c="dimmed" size="sm">
                {t("branding.tuPropiaApp")}
              </Text>
            </div>
          </Group>
          <Badge color="orange" variant="light">
            {"Próximamente"}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card p="md" radius="md" withBorder>
            <Group gap="sm" mb="sm">
              <IconBrandApple size={24} />
              <Text fw={600}>iOS App</Text>
            </Group>
            <Text c="dimmed" mb="md" size="sm">
              {t("branding.tuAppIos")}
            </Text>
            <Button disabled fullWidth variant="light">
              {"Solicitar App iOS"}
            </Button>
          </Card>
          <Card p="md" radius="md" withBorder>
            <Group gap="sm" mb="sm">
              <IconBrandAndroid size={24} />
              <Text fw={600}>{"Android App"}</Text>
            </Group>
            <Text c="dimmed" mb="md" size="sm">
              {t("branding.tuAppAndroid")}
            </Text>
            <Button disabled fullWidth variant="light">
              {"Solicitar App Android"}
            </Button>
          </Card>
        </SimpleGrid>
      </Paper>

      {/* Save Button */}
      <Group justify="flex-end">
        <Button leftSection={<IconCheck size={16} />} onClick={onSave}>
          {"Guardar Cambios"}
        </Button>
      </Group>
    </Stack>
  );
}
