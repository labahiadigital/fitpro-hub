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
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { EmptyState } from "../../../components/common/EmptyState";

interface ClientPlansTabProps {
  clientPlans: any[];
  isLoading: boolean;
  getDurationWeeks: (plan: any) => number;
  onEdit: (plan: any) => void;
  onView: (planId: string) => void;
  onDuplicate: (plan: any) => void;
  onDelete: (planId: string, planName: string) => void;
  onCreate: () => void;
  createPending: boolean;
  deletePending: boolean;
}

export function ClientPlansTab({
  clientPlans,
  isLoading,
  getDurationWeeks,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onCreate,
  createPending,
  deletePending,
}: ClientPlansTabProps) {
  if (isLoading) {
    return <Center py="xl"><Loader size="md" /></Center>;
  }

  if (clientPlans.length > 0) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
        {clientPlans.map((plan: any) => {
          const endDate = plan.end_date ? new Date(plan.end_date) : null;
          const isExpired = endDate && endDate < new Date();
          const showActive = plan.is_active && !isExpired;
          return (
            <Box key={plan.id} className="nv-card" p="md">
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="sm" style={{ color: "var(--nv-dark)" }} lineClamp={1}>{plan.name}</Text>
                <Group gap={4}>
                  <Badge color={showActive ? "green" : "gray"} variant="filled" radius="md" size="xs">
                    {showActive ? "Activo" : "Inactivo"}
                  </Badge>
                  <Badge color="blue" variant="light" radius="md" size="xs">{getDurationWeeks(plan)} sem</Badge>
                </Group>
              </Group>
              <Text c="dimmed" lineClamp={2} size="xs">{plan.description || "Sin descripción"}</Text>
              {plan.client_name && (
                <Badge color="blue" mt="xs" size="xs" variant="outline" radius="md">{plan.client_name}</Badge>
              )}
              {(plan.start_date || plan.end_date) && (
                <Group gap="xs" mt="xs">
                  {plan.start_date && (
                    <Text size="xs" c="dimmed">Inicio: {new Date(plan.start_date).toLocaleDateString('es-ES')}</Text>
                  )}
                  {plan.end_date && (
                    <Text size="xs" c="dimmed">Fin: {new Date(plan.end_date).toLocaleDateString('es-ES')}</Text>
                  )}
                </Group>
              )}
              <Stack gap={4} mt="sm">
                <Group justify="space-between">
                  <Text c="dimmed" size="xs">Calorías</Text>
                  <Text fw={600} size="xs" style={{ color: "var(--nv-dark)" }}>{Math.round(plan.target_calories || 0)} kcal</Text>
                </Group>
                <Group gap={4}>
                  <Badge color="green" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>P:{Math.round(plan.target_protein || 0)}g</Badge>
                  <Badge color="orange" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>C:{Math.round(plan.target_carbs || 0)}g</Badge>
                  <Badge color="grape" size="xs" variant="light" radius="md" styles={{ root: { padding: "2px 6px" } }}>G:{Math.round(plan.target_fat || 0)}g</Badge>
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
          );
        })}
      </SimpleGrid>
    );
  }

  return (
    <EmptyState
      actionLabel="Crear Plan"
      description="Crea un plan nutricional personalizado para un cliente."
      icon={<IconUsers size={36} />}
      onAction={onCreate}
      title="No hay planes de clientes"
    />
  );
}
