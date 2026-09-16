import {
  Badge,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLockOff, IconRefresh } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth";
import { clientPortalApi } from "../../services/api";

interface RenewalProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string | null;
  product_type: string;
}

interface RenewalOptions {
  client_name: string;
  workspace_name: string;
  products: RenewalProduct[];
}

const INTERVAL_KEYS: Record<string, string> = {
  week: "subscription.perWeek",
  biweekly: "subscription.perBiweekly",
  month: "subscription.perMonth",
  quarter: "subscription.perQuarter",
  semester: "subscription.perSemester",
  year: "subscription.perYear",
};

export default function SubscriptionExpiredPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [renewingProductId, setRenewingProductId] = useState<string | null>(null);

  const { data: options, isLoading, isError } = useQuery<RenewalOptions>({
    queryKey: ["renewal-options"],
    queryFn: async () => {
      const res = await clientPortalApi.renewalOptions();
      return res.data;
    },
    retry: 1,
    staleTime: 60_000,
  });

  const handleRenew = useCallback(
    async (product: RenewalProduct) => {
      setRenewingProductId(product.id);
      try {
        const res = await clientPortalApi.startRenewal(product.id);
        const { invitation_token } = res.data as { invitation_token: string };
        window.location.href = `/onboarding/invite/${invitation_token}`;
      } catch {
        notifications.show({
          title: t("common.error"),
          message: t("subscription.renewError"),
          color: "red",
        });
        setRenewingProductId(null);
      }
    },
    [],
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const hasProducts = options?.products && options.products.length > 0;

  return (
    <Container size="sm" py={80}>
      <Center>
        <Stack align="center" gap="xl" w="100%">
          <ThemeIcon size={80} radius="xl" variant="light" color="red">
            <IconLockOff size={40} />
          </ThemeIcon>

          <Text fw={700} size="xl" ta="center">
            {t("subscription.expired")}
          </Text>

          <Text c="dimmed" ta="center" size="md" maw={500}>
            {t("subscription.expiredDesc")}
            {hasProducts
              ? ` ${t("subscription.choosePlan")}`
              : ` ${t("subscription.contactTrainer")}`}
          </Text>

          {isLoading && (
            <Center py="xl">
              <Loader size="md" />
            </Center>
          )}

          {isError && (
            <Text c="dimmed" ta="center" size="sm">
              {t("subscription.loadError")}
            </Text>
          )}

          {hasProducts && (
            <>
              <Divider w="100%" label={t("subscription.availablePlans")} labelPosition="center" />
              <SimpleGrid cols={{ base: 1, sm: options.products.length === 1 ? 1 : 2 }} spacing="lg" w="100%">
                {options.products.map((product) => (
                  <Card key={product.id} padding="lg" radius="md" withBorder>
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text fw={600} size="lg">
                          {product.name}
                        </Text>
                        <Badge color="blue" variant="light" radius="xl">
                          {t("subscription.subscription")}
                        </Badge>
                      </Group>

                      {product.description && (
                        <Text c="dimmed" size="sm" lineClamp={3}>
                          {product.description.replace(/<[^>]*>/g, "")}
                        </Text>
                      )}

                      <Group gap="xs" align="baseline">
                        <Text fw={700} size="xl" c="teal">
                          {product.price === 0
                            ? t("subscription.free")
                            : `${product.price.toFixed(2)} €`}
                        </Text>
                        <Text c="dimmed" size="sm">
                          {product.interval && INTERVAL_KEYS[product.interval] ? t(INTERVAL_KEYS[product.interval]) : ""}
                        </Text>
                      </Group>

                      <Button
                        fullWidth
                        leftSection={<IconRefresh size={16} />}
                        loading={renewingProductId === product.id}
                        disabled={renewingProductId !== null && renewingProductId !== product.id}
                        onClick={() => handleRenew(product)}
                        mt="xs"
                      >
                        {t("subscription.renew")}
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </>
          )}

          <Divider w="100%" />

          <Button variant="outline" color="gray" onClick={handleLogout}>
            {t("auth.logout")}
          </Button>
        </Stack>
      </Center>
    </Container>
  );
}
