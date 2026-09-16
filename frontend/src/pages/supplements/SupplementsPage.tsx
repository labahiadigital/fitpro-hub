import { Container, Select, Tabs, Badge, Box, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconPill, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { SupplementLibrary } from "../../components/supplements/SupplementLibrary";
import { useTranslation } from "react-i18next";

export function SupplementsPage() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<string | null>("library");

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title={t("supplements.suplementacion")}
        description={t("supplements.gestionaTuBibliotecaDeSuplementos")}
      />

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "library", label: t("supplements.bibliotecaDeSuplementos") },
            { value: "recommendations", label: t("supplements.recomendacionesProximamente") },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs value={activeTab} onChange={setActiveTab}>
        {!isMobile && (
        <Tabs.List mb="lg">
          <Tabs.Tab value="library" leftSection={<IconPill size={14} />}>
            {t("supplements.bibliotecaDeSuplementos")}
          </Tabs.Tab>
          <Tabs.Tab value="recommendations" leftSection={<IconUsers size={14} />}>
            {t("supplements.recomendaciones")}
            <Badge ml="xs" size="xs" color="blue">
              {t("supplements.proximamente")}
            </Badge>
          </Tabs.Tab>
        </Tabs.List>
        )}

        <Tabs.Panel value="library">
          <SupplementLibrary />
        </Tabs.Panel>

        <Tabs.Panel value="recommendations">
          <Box p="xl" ta="center">
            <Text c="dimmed">{t("supplements.proximamenteGestionDeRecomendacionesDe")}</Text>
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

export default SupplementsPage;
