import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { IconError404 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Center h="80vh">
      <Stack align="center" gap="md" maw={420}>
        <IconError404 size={64} color="var(--nv-slate-light)" stroke={1} />
        <Title order={2}>{t("errors.pageNotFound")}</Title>
        <Text c="dimmed" ta="center" size="sm">
          {t("errors.pageNotFoundDesc")}
        </Text>
        <Button
          variant="filled"
          color="var(--nv-primary)"
          onClick={() => navigate("/dashboard")}
        >
          {t("errors.backToHome")}
        </Button>
      </Stack>
    </Center>
  );
}

export default NotFoundPage;
