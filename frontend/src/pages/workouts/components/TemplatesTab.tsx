import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  SimpleGrid,
  Skeleton,
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

interface TemplatesTabProps {
  templates: any[];
  loadingPrograms: boolean;
  onEdit: (program: any) => void;
  onView: (program: any) => void;
  onDuplicate: (program: any) => void;
  onDelete: (programId: string) => void;
  createPending: boolean;
  deletePending: boolean;
}

export function TemplatesTab({
  templates,
  loadingPrograms,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  createPending,
  deletePending,
}: TemplatesTabProps) {
  if (templates.length > 0) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
        {templates.map((program: any) => (
          <Box key={program.id} className="nv-card" p="md">
            <Group justify="space-between" mb="sm">
              <Text fw={600} size="sm" style={{ color: "var(--nv-dark)" }} lineClamp={1}>{program.name}</Text>
              <Badge color="teal" variant="light" radius="md" size="xs">Plantilla</Badge>
            </Group>

            <Text c="dimmed" lineClamp={2} size="xs">
              {program.description || "Sin descripción"}
            </Text>

            <Group gap={4} mt="sm">
              <Badge size="xs" variant="outline" radius="md">
                {program.difficulty === "beginner"
                  ? "Principiante"
                  : program.difficulty === "intermediate"
                    ? "Intermedio"
                    : "Avanzado"}
              </Badge>
              {program.duration_weeks && (
                <Badge size="xs" variant="light" color="blue" radius="md">{program.duration_weeks}sem</Badge>
              )}
            </Group>

            <Divider my="sm" style={{ borderColor: "var(--border-subtle)" }} />

            <Group gap={6}>
              <Button flex={1} leftSection={<IconEdit size={12} />} onClick={() => onEdit(program)} size="xs" variant="light" radius="md" styles={{ root: { height: 28 } }}>
                Editar
              </Button>
              <ActionIcon color="blue" variant="light" radius="md" size="sm" onClick={() => onView(program)}>
                <IconEye size={14} />
              </ActionIcon>
              <ActionIcon color="gray" variant="light" radius="md" size="sm" onClick={() => onDuplicate(program)} loading={createPending} title="Duplicar programa">
                <IconCopy size={14} />
              </ActionIcon>
              <ActionIcon color="red" variant="light" radius="md" size="sm" onClick={() => onDelete(program.id)} loading={deletePending}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Box>
        ))}
      </SimpleGrid>
    );
  }

  if (loadingPrograms) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={160} radius="lg" />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <EmptyState
      actionLabel="Crear Programa"
      description="Crea tu primer programa de entrenamiento para asignarlo a tus clientes."
      icon={<IconTemplate size={36} />}
      onAction={() => onEdit(undefined)}
      title="No hay plantillas"
    />
  );
}
