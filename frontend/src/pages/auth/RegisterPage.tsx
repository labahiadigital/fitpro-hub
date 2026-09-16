import {
  Anchor,
  Box,
  Button,
  Checkbox,
  Divider,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBuilding,
  IconChevronRight,
  IconLock,
  IconMail,
  IconUser,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  PasswordRulesIndicator,
  passwordValidator,
} from "../../components/common/PasswordRulesIndicator";

const REGISTRATION_ENABLED = false;

export function RegisterPage() {
  const { t } = useTranslation();
  const { register, loading } = useAuth();

  if (!REGISTRATION_ENABLED) {
    return (
      <Stack gap="lg" ta="center">
        <Title order={2} c="white" fw={700} style={{ letterSpacing: "-0.02em" }}>
          {t("auth.registrationDisabled")}
        </Title>
        <Text c="gray.5" size="sm">
          {t("auth.registrationDisabledDesc")}
        </Text>
        <Button
          component={Link}
          to="/login"
          size="lg"
          style={{
            background: "var(--nv-accent)",
            color: t("auth.1a1a2e"),
            fontWeight: 600,
            height: 48,
            borderRadius: 12,
          }}
        >
          {t("auth.goToLogin")}
        </Button>
      </Stack>
    );
  }

  const form = useForm({
    initialValues: {
      full_name: "",
      email: "",
      confirm_email: "",
      password: "",
      workspace_name: "",
      terms: false,
    },
    validate: {
      full_name: (value) => (value.length < 2 ? t("auth.nameRequired") : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t("auth.invalidEmail")),
      confirm_email: (value, values) =>
        value !== values.email ? t("auth.emailsDoNotMatch") : null,
      password: passwordValidator,
      workspace_name: (value) =>
        value.length < 2 ? t("auth.workspaceNameRequired") : null,
      terms: (value) => (value ? null : t("auth.mustAcceptTerms")),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await register(
        values.email,
        values.password,
        values.full_name,
        values.workspace_name
      );
    } catch {
      // Error handled by useAuth hook
    }
  };

  const inputStyles = {
    input: {
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: t("auth.white"),
      borderRadius: 12,
      padding: "12px 16px",
      paddingLeft: 44,
      height: 48,
      fontSize: 14,
      transition: "all 0.2s ease",
      "&:focus": {
        borderColor: "var(--nv-accent)",
        background: "rgba(255, 255, 255, 0.05)",
      },
      "&::placeholder": {
        color: "rgba(255, 255, 255, 0.4)",
      },
    },
    label: {
      color: "rgba(255, 255, 255, 0.7)",
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 6,
    },
    section: {
      color: "rgba(255, 255, 255, 0.4)",
    },
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="lg">
        <Box ta="center">
          <Title
            order={2}
            c="white"
            fw={700}
            style={{ letterSpacing: "-0.02em" }}
          >
            {t("auth.createAccount")}
          </Title>
          <Text c="gray.5" size="sm" mt={4}>
            {t("auth.registerSubtitle")}
          </Text>
        </Box>

        <Stack gap="md">
          <TextInput
            label={t("auth.fullName")}
            leftSection={<IconUser size={18} />}
            placeholder={t("auth.fullNamePlaceholder")}
            required
            styles={inputStyles}
            {...form.getInputProps("full_name")}
          />

          <TextInput
            label={t("auth.email")}
            leftSection={<IconMail size={18} />}
            placeholder={t("auth.emailPlaceholder")}
            required
            styles={inputStyles}
            {...form.getInputProps("email")}
          />

          <TextInput
            label={t("auth.confirmEmail")}
            leftSection={<IconMail size={18} />}
            placeholder={t("auth.confirmEmailPlaceholder")}
            required
            styles={inputStyles}
            {...form.getInputProps("confirm_email")}
          />

          <Box>
            <PasswordInput
              label={t("auth.password")}
              leftSection={<IconLock size={18} />}
              placeholder={t("auth.passwordMinPlaceholder")}
              required
              styles={inputStyles}
              {...form.getInputProps("password")}
            />
            <PasswordRulesIndicator value={form.values.password} dark />
          </Box>

          <TextInput
            label={t("auth.workspaceName")}
            leftSection={<IconBuilding size={18} />}
            placeholder={t("auth.workspaceNamePlaceholder")}
            required
            styles={inputStyles}
            {...form.getInputProps("workspace_name")}
          />

          <Checkbox
            label={
              <Text size="xs" c="gray.5">
                {t("auth.acceptThe")}{" "}
                <Anchor size="xs" href="https://trackfiz.com/terms" target="_blank" c="var(--nv-accent)">
                  {t("auth.termsAndConditions")}
                </Anchor>{" "}
                {t("auth.andThe")}{" "}
                <Anchor size="xs" href="https://trackfiz.com/privacy" target="_blank" c="var(--nv-accent)">
                  {t("auth.privacyPolicy")}
                </Anchor>
              </Text>
            }
            styles={{
              input: {
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                "&:checked": {
                  background: "var(--nv-accent)",
                  borderColor: "var(--nv-accent)",
                },
              },
            }}
            {...form.getInputProps("terms", { type: "checkbox" })}
          />

          <Button
            fullWidth
            loading={loading}
            type="submit"
            size="lg"
            rightSection={<IconChevronRight size={18} />}
            style={{
              background: "var(--nv-accent)",
              color: t("auth.1a1a2e"),
              fontWeight: 600,
              height: 48,
              borderRadius: 12,
              fontSize: 15,
              boxShadow: "0 4px 16px rgba(212, 175, 55, 0.25)",
              marginTop: 8,
            }}
          >
            {t("auth.createAccountButton")}
          </Button>
        </Stack>

        <Divider label="o" labelPosition="center" color="rgba(255, 255, 255, 0.1)" />

        <Text size="sm" ta="center" c="gray.5">
          {t("auth.haveAccount")}{" "}
          <Anchor component={Link} fw={600} to="/login" c="var(--nv-accent)">
            {t("auth.loginLink")}
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}
