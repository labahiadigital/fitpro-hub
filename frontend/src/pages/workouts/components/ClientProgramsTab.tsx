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
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { EmptyState } from "../../../components/common/EmptyState";

interface ClientProgramsTabProps {
  clientPrograms: any[];
  loadingPrograms: boolean;
  clientsMap: Map<string, string>;
  onEdit: (program: any) => void;
  onView: (program: any) => void;
  onDuplicate: (program: any) => void;
  onDelete: (programId: string) => void;
  createPending: boolean;
  deletePending: boolean;
}

export function ClientProgramsTab({
  clientPrograms,
  loadingPrograms,
  clientsMap,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  createPending,
  deletePending,
}: ClientProgramsTabProps) {
  if (clientPrograms.length > 0) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
        {clientPrograms.map((program: any) => {
          const endDate = program.end_date ? new Date(program.end_date) : null;
          const isExpired = endDate && endDate < new Date();
          const showActive = (program.is_active ?? false) && !isExpired;
          return (
            <Box key={program.id} className="nv-card" p="md">
              <Text fw={600} size="sm" style={{ color: "var(--nv-dark)", wordBreak: "break-word" }} lineClamp={2} mb={4} title={program.name}>{program.name}</Text>
              <Group gap={4} mb="xs">
                <Badge color={showActive ? "green" : isExpired ? "red" : "gray"} variant="filled" radius="md" size="xs">
                  {showActive ? "Activo" : isExpired ? "Expirado" : "Inactivo"}
                </Badge>
                <Badge color="blue" variant="light" radius="md" size="xs">
                  {program.duration_weeks}sem
                </Badge>
              </Group>

              <Text c="dimmed" lineClamp={2} size="xs">
                {program.description || "Sin descripción"}
              </Text>

              {program.client_id && (
                <Badge color="blue" mt="xs" size="xs" variant="outline" radius="md">
                  {clientsMap.get(program.client_id) || "Cliente"}
                </Badge>
              )}

              {(program.start_date || program.end_date) && (
                <Group gap="xs" mt="xs">
                  {program.start_date && (
                    <Text size="xs" c="dimmed">
                      Inicio: {new Date(program.start_date).toLocaleDateString('es-ES')}
                    </Text>
                  )}
                  {program.end_date && (
                    <Text size="xs" c="dimmed">
                      Fin: {new Date(program.end_date).toLocaleDateString('es-ES')}
                    </Text>
                  )}
                </Group>
              )}

              <Group gap={4} mt="sm">
                <Badge size="xs" variant="outline" radius="md">
                  {program.difficulty === "beginner"
                    ? "Principiante"
                    : program.difficulty === "intermediate"
                      ? "Intermedio"
                      : "Avanzado"}
                </Badge>
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
          );
        })}
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
      description="Asigna un programa a un cliente para verlo aquí."
      icon={<IconUsers size={36} />}
      onAction={() => onEdit(undefined)}
      title="No hay programas de clientes"
    />
  );
}
