import {
  Anchor,
  Box,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconCheck,
  IconLock,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../services/api";
import {
  PasswordRulesIndicator,
  passwordValidator,
} from "../../components/common/PasswordRulesIndicator";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const token = searchParams.get("token");

  const form = useForm({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validate: {
      password: passwordValidator,
      confirmPassword: (value, values) =>
        value === values.password ? null : t("auth.passwordsDoNotMatch"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (!token) {
      notifications.show({
        title: t("common.error"),
        message: t("auth.invalidToken"),
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, values.password);
      setSuccess(true);
      notifications.show({
        title: t("auth.passwordUpdated"),
        message: t("auth.passwordUpdatedDesc"),
        color: "green",
      });
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const message = err.response?.data?.detail || t("auth.resetPasswordError");
      notifications.show({
        title: t("common.error"),
        message,
        color: "red",
      });
    } finally {
      setLoading(false);
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

  if (!token) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Paper
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            maxWidth: 450,
            width: "100%",
          }}
        >
          <Stack align="center" gap="lg">
            <Title
              order={1}
              style={{
                background: "linear-gradient(135deg, var(--nv-primary) 0%, var(--nv-accent) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {t("auth.trackfiz")}
            </Title>

            <Text c="white" size="lg" fw={500} ta="center">
              {t("auth.invalidLink")}
            </Text>

            <Text c="gray.5" size="sm" ta="center">
              {t("auth.invalidLinkDesc")}
            </Text>

            <Anchor
              component={Link}
              to="/forgot-password"
              c="var(--nv-accent)"
              size="sm"
            >
              {t("auth.requestNewLink")}
            </Anchor>
          </Stack>
        </Paper>
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Paper
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            maxWidth: 450,
            width: "100%",
          }}
        >
          <Stack align="center" gap="lg">
            <Title
              order={1}
              style={{
                background: "linear-gradient(135deg, var(--nv-primary) 0%, var(--nv-accent) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {t("auth.trackfiz")}
            </Title>

            <ThemeIcon
              size={80}
              radius="xl"
              variant="gradient"
              gradient={{ from: "primary", to: "accent" }}
            >
              <IconCheck size={40} stroke={2} />
            </ThemeIcon>

            <Text c="white" size="lg" fw={500} ta="center">
              {t("auth.passwordUpdated")}
            </Text>

            <Text c="gray.5" size="sm" ta="center">
              {t("auth.passwordUpdatedFullDesc")}
            </Text>

            <Button
              fullWidth
              size="lg"
              onClick={() => navigate("/login")}
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
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Paper
        p="xl"
        radius="lg"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          maxWidth: 450,
          width: "100%",
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            <Box ta="center">
              <Title
                order={1}
                style={{
                  background: "linear-gradient(135deg, var(--nv-primary) 0%, var(--nv-accent) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: 32,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                {t("auth.trackfiz")}
              </Title>
              <Title order={2} c="white" fw={700}>
                {t("auth.newPassword")}
              </Title>
              <Text c="gray.5" size="sm" mt={8}>
                {t("auth.enterNewPassword")}
              </Text>
            </Box>

            <Box>
              <PasswordInput
                label={t("auth.newPassword")}
                placeholder={t("auth.passwordMinPlaceholder")}
                required
                leftSection={<IconLock size={18} />}
                styles={inputStyles}
                {...form.getInputProps("password")}
              />
              <PasswordRulesIndicator value={form.values.password} dark />
            </Box>

            <PasswordInput
              label={t("auth.confirmPassword")}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              required
              leftSection={<IconLock size={18} />}
              styles={inputStyles}
              {...form.getInputProps("confirmPassword")}
            />

            <Button
              fullWidth
              loading={loading}
              type="submit"
              size="lg"
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
              {t("auth.updatePassword")}
            </Button>

            <Anchor
              component={Link}
              to="/login"
              c="var(--nv-accent)"
              size="sm"
              ta="center"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <IconArrowLeft size={16} />
              {t("auth.backToLogin")}
            </Anchor>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
