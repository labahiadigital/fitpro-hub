import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import { BottomSheet } from "../../../components/common/BottomSheet";

interface ViewProgramModalProps {
  opened: boolean;
  program: any;
  clientsMap: Map<string, string>;
  onClose: () => void;
  onEdit: (program: any) => void;
}

export function ViewProgramModal({
  opened,
  program,
  clientsMap,
  onClose,
  onEdit,
}: ViewProgramModalProps) {
  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title={program?.name || "Programa de Entrenamiento"}
      desktopSize="lg"
    >
      {program && (
        <Stack gap="md">
          {program.description && (
            <Text size="sm" c="dimmed">{program.description}</Text>
          )}
          <Group gap="md" wrap="wrap">
            {program.duration_weeks && (
              <Badge variant="light" color="blue">{program.duration_weeks} semanas</Badge>
            )}
            {program.difficulty && (
              <Badge variant="light" color="gray">
                {program.difficulty === "beginner" ? "Principiante" : program.difficulty === "intermediate" ? "Intermedio" : "Avanzado"}
              </Badge>
            )}
            {program.client_id && (
              <Badge variant="outline" color="blue">{clientsMap.get(program.client_id) || "Cliente"}</Badge>
            )}
            {program.start_date && (
              <Text size="xs" c="dimmed">Inicio: {new Date(program.start_date).toLocaleDateString('es-ES')}</Text>
            )}
            {program.end_date && (
              <Text size="xs" c="dimmed">Fin: {new Date(program.end_date).toLocaleDateString('es-ES')}</Text>
            )}
          </Group>

          <Divider my="sm" label="Ejercicios" labelPosition="center" />

          {(() => {
            const tmpl = program.template as any;
            const weeksList = tmpl?.weeks as Array<{ week: number; days: Array<{ dayName?: string; isRestDay?: boolean; blocks?: Array<{ name: string; type?: string; exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }> }> }> | undefined;
            const daysList = tmpl?.days as Array<{ dayName?: string; isRestDay?: boolean; blocks?: Array<{ name: string; type?: string; exercises?: Array<{ exercise?: { name?: string }; name?: string; sets?: number; reps?: string; rest_seconds?: number; notes?: string }> }> }> | undefined;
            const allWeeks = weeksList && weeksList.length > 0
              ? weeksList
              : daysList && daysList.length > 0
                ? [{ week: 1, days: daysList }]
                : [];

            if (allWeeks.length === 0) {
              return <Text c="dimmed" ta="center" py="md">No hay ejercicios definidos</Text>;
            }

            return allWeeks.map((wk) => (
              <Box key={wk.week}>
                {allWeeks.length > 1 && (
                  <Text fw={700} mb="xs">Semana {wk.week}</Text>
                )}
                <Stack gap="xs">
                  {wk.days.map((day, dayIdx) => (
                    <Box key={dayIdx} p="sm" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
                      <Group gap="xs" mb="xs">
                        <Text fw={600} size="sm">{day.dayName || `Día ${dayIdx + 1}`}</Text>
                        {day.isRestDay && <Badge variant="light" color="orange" size="xs">Descanso</Badge>}
                      </Group>
                      {!day.isRestDay && day.blocks?.map((block, bi) => (
                        <Box key={bi} ml="sm" mb="xs">
                          <Text size="xs" fw={600} c="dimmed" mb={2}>
                            {block.type === "warmup" ? "Calentamiento" : block.type === "cooldown" ? "Enfriamiento" : "Principal"}: {block.name}
                          </Text>
                          {block.exercises?.map((ex, ei) => (
                            <Group key={ei} gap="xs" ml="sm">
                              <Text size="xs">• {ex.exercise?.name || ex.name || "Ejercicio"}</Text>
                              <Badge size="xs" variant="light" color="blue">{ex.sets || 3}x{ex.reps || "10-12"}</Badge>
                              {ex.rest_seconds && <Badge size="xs" variant="light" color="gray">{ex.rest_seconds}s</Badge>}
                            </Group>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ));
          })()}

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={onClose}>Cerrar</Button>
            <Button
              leftSection={<IconEdit size={16} />}
              onClick={() => {
                onClose();
                onEdit(program);
              }}
            >
              Editar programa
            </Button>
          </Group>
        </Stack>
      )}
    </BottomSheet>
  );
}
