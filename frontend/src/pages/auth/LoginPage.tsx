import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconAlertCircle,
  IconChevronRight,
  IconMail,
  IconLock,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function LoginPage() {
  const { t } = useTranslation();
  const { login, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const isInvited = searchParams.get("invited") === "1";
  const invitedWorkspace = searchParams.get("workspace");
  const nextPath = searchParams.get("next") || undefined;

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      remember: true,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t("auth.invalidEmail")),
      password: (value) => (value.length >= 6 ? null : t("auth.minChars", { count: 6 })),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    try {
      await login(values.email, values.password, nextPath);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(errObj.response?.data?.detail || errObj.message || t("auth.loginError"));
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
    <Stack gap="lg">
      <Box ta="center">
        <Title
          order={2}
          c="white"
          fw={700}
          style={{ letterSpacing: "-0.02em" }}
        >
          {t("auth.loginTitle")}
        </Title>
        <Text c="gray.5" size="sm" mt={4}>
          {t("auth.loginSubtitle")}
        </Text>
      </Box>

      {isInvited && (
        <Alert
          color="teal"
          variant="light"
          radius="lg"
          style={{
            background: "rgba(56, 178, 172, 0.1)",
            border: "1px solid rgba(56, 178, 172, 0.2)",
          }}
        >
          <Text size="sm" c="teal.4">
            {t("auth.hasSidoInvitadoA")} <Text span fw={700}>{invitedWorkspace || "un equipo"}</Text>.
            Inicia sesiÃ³n para acceder.
          </Text>
        </Alert>
      )}

      {error && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          variant="light"
          radius="lg"
          style={{
            background: "rgba(255, 87, 87, 0.1)",
            border: "1px solid rgba(255, 87, 87, 0.2)",
          }}
        >
          <Text size="sm" c="red.4">{error}</Text>
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t("auth.email")}
            placeholder={t("auth.emailPlaceholder")}
            required
            leftSection={<IconMail size={18} />}
            styles={inputStyles}
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label={t("auth.password")}
            placeholder={t("auth.passwordPlaceholder")}
            required
            leftSection={<IconLock size={18} />}
            styles={inputStyles}
            {...form.getInputProps("password")}
          />

          <Group justify="space-between">
            <Checkbox
              label={t("auth.rememberMe")}
              styles={{
                label: { color: "rgba(255, 255, 255, 0.6)", fontSize: 13 },
                input: {
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  "&:checked": {
                    background: "var(--nv-accent)",
                    borderColor: "var(--nv-accent)",
                  },
                },
              }}
              {...form.getInputProps("remember", { type: "checkbox" })}
            />
            <Anchor
              component={Link}
              size="sm"
              to="/forgot-password"
              c="var(--nv-accent)"
              style={{ fontSize: 13 }}
            >
              {t("auth.forgotPassword")}
            </Anchor>
          </Group>

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
            }}
          >
            {t("auth.loginButton")}
          </Button>

          <Text c="gray.5" size="sm" ta="center" mt="md">
            {t("auth.noAccount")}{" "}
            <Anchor
              component={Link}
              fw={600}
              to="/register"
              c="var(--nv-accent)"
            >
              {t("auth.registerLink")}
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Stack>
  );
}
