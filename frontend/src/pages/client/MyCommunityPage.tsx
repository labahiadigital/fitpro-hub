/**
 * Página "Beneficios" del cliente (``/my-community``).
 *
 * Lista los beneficios activos compartidos por su entrenador. Cada
 * tarjeta muestra título / marca / descripción opcional, un botón
 * "Comprar aquí" cuando hay URL y el código de descuento copiable.
 */
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Container,
  CopyButton,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconGift,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../../components/common/PageHeader";
import {
  communityBenefitsApi,
  type CommunityBenefit,
} from "../../services/api";
import { useTranslation } from "react-i18next";

export function MyCommunityPage() {
  const { t } = useTranslation();
  const { data: benefits = [], isLoading } = useQuery({
    queryKey: ["my-community-benefits"],
    queryFn: async () => {
      const res = await communityBenefitsApi.listMine();
      return res.data;
    },
  });

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title={t("myCommunity.beneficios")}
        subtitle={t("myCommunity.codigosYDescuentosCompartidosPor")}
      />

      {isLoading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : benefits.length === 0 ? (
        <Paper p="xl" withBorder radius="md">
          <Stack align="center" gap="sm">
            <IconGift size={36} color="var(--mantine-color-gray-5)" />
            <Text fw={600}>{t("myCommunity.aunNoHayBeneficiosDisponibles")}</Text>
            <Text size="sm" c="dimmed" ta="center" maw={420}>
              {t("myCommunity.cuandoTuEntrenadorCompartaCodigos")}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {benefits.map((b: CommunityBenefit) => (
            <Paper key={b.id} p="md" withBorder radius="md">
              <Stack gap={4}>
                {b.brand && (
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                    {b.brand}
                  </Text>
                )}
                <Text fw={700} lineClamp={2}>
                  {b.title}
                </Text>
              </Stack>

              {b.description && (
                <Text size="sm" c="dimmed" mt={6} lineClamp={3}>
                  {b.description}
                </Text>
              )}

              <Stack gap={8} mt="md">
                {b.discount_code && (
                  <Group gap="xs" wrap="nowrap">
                    <Badge
                      variant="light"
                      color="yellow"
                      size="lg"
                      radius="sm"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      {b.discount_code}
                    </Badge>
                    <CopyButton value={b.discount_code}>
                      {({ copied, copy }) => (
                        <Tooltip
                          label={copied ? "Copiado" : t("myNutrition.copiarCodigo")}
                          withArrow
                        >
                          <ActionIcon
                            variant="light"
                            color={copied ? "teal" : "gray"}
                            onClick={copy}
                            size="lg"
                            radius="md"
                            aria-label={t("myCommunity.copiarCodigo")}
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
                  </Group>
                )}
                {b.url && (
                  <Button
                    component="a"
                    href={b.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    color="yellow"
                    rightSection={<IconExternalLink size={16} />}
                  >
                    {t("myCommunity.comprarAqui")}
                  </Button>
                )}
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      <Box mt="xl">
        <Text size="xs" c="dimmed" ta="center">
          {t("myCommunity.estosBeneficiosEstanDisponiblesGracias")}
        </Text>
      </Box>
    </Container>
  );
}
