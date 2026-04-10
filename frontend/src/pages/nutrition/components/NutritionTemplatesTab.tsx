import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconCopy,
  IconEdit,
  IconEye,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
import { EmptyState } from "../../../components/common/EmptyState";

interface NutritionTemplatesTabProps {
  templates: any[];
  isLoading: boolean;
  onEdit: (plan: any) => void;
  onView: (planId: string) => void;
  onDuplicate: (plan: any) => void;
  onDelete: (planId: string, planName: string) => void;
  onCreate: () => void;
  createPending: boolean;
  deletePending: boolean;
}

export function NutritionTemplatesTab({
  templates,
  isLoading,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onCreate,
  createPending,
  deletePending,
}: NutritionTemplatesTabProps) {
  if (isLoading) {
    return <Center py="xl"><Loader size="md" /></Center>;
  }

  if (templates.length > 0) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
        {templates.map((plan: any) => (
          <Box key={plan.id} className="nv-card" p="md">
            <Group justify="space-between" mb="sm">
              <Text fw={600} size="sm" style={{ color: "var(--nv-dark)" }} lineClamp={1}>{plan.name}</Text>
              <Badge color="teal" variant="light" radius="md" size="xs">Plantilla</Badge>
            </Group>
            <Text c="dimmed" lineClamp={2} size="xs">{plan.description || "Sin descripción"}</Text>
            <Stack gap={4} mt="sm">
              <Group justify="space-between">
                <Text c="dimmed" size="xs">Calorías</Text>
                <Text fw={600} size="xs" style={{ color: "var(--nv-dark)" }}>{plan.target_calories} kcal</Text>
              </Group>
              <Group gap={4}>
                <Badge color="green" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>P:{plan.target_protein}g</Badge>
                <Badge color="orange" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>C:{plan.target_carbs}g</Badge>
                <Badge color="grape" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>G:{plan.target_fat}g</Badge>
              </Group>
            </Stack>
            <Divider my="sm" style={{ borderColor: "var(--border-subtle)" }} />
            <Group gap={6}>
              <Button flex={1} leftSection={<IconEdit size={12} />} onClick={() => onEdit(plan)} size="xs" variant="light" radius="md" styles={{ root: { height: 28 } }}>Editar</Button>
              <ActionIcon color="blue" variant="light" radius="md" size="sm" onClick={() => onView(plan.id)}><IconEye size={14} /></ActionIcon>
              <ActionIcon color="gray" loading={createPending} onClick={() => onDuplicate(plan)} variant="light" radius="md" size="sm"><IconCopy size={14} /></ActionIcon>
              <ActionIcon color="red" loading={deletePending} onClick={() => onDelete(plan.id, plan.name)} variant="light" radius="md" size="sm"><IconTrash size={14} /></ActionIcon>
            </Group>
          </Box>
        ))}
      </SimpleGrid>
    );
  }

  return (
    <EmptyState
      actionLabel="Crear Plantilla"
      description="Crea tu primera plantilla nutricional reutilizable para asignarla a tus clientes."
      icon={<IconTemplate size={36} />}
      onAction={onCreate}
      title="No hay plantillas"
    />
  );
}
