import { Container, Tabs, Badge, Box, Text } from "@mantine/core";
import { IconPill, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { SupplementLibrary } from "../../components/supplements/SupplementLibrary";

export function SupplementsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("library");

  return (
    <Container py="xl" size="xl">
      <PageHeader
        title="Suplementación"
        description="Gestiona tu biblioteca de suplementos y recomendaciones"
      />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="library" leftSection={<IconPill size={14} />}>
            Biblioteca de Suplementos
          </Tabs.Tab>
          <Tabs.Tab value="recommendations" leftSection={<IconUsers size={14} />}>
            Recomendaciones
            <Badge ml="xs" size="xs" color="blue">
              Próximamente
            </Badge>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="library">
          <SupplementLibrary />
        </Tabs.Panel>

        <Tabs.Panel value="recommendations">
          <Box p="xl" ta="center">
            <Text c="dimmed">Próximamente: Gestión de recomendaciones de suplementos por cliente</Text>
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

export default SupplementsPage;
