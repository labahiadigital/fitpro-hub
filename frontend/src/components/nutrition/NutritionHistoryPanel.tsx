import {
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconHistory,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import type { NutritionCalculationEntry } from "../../hooks/useClients";

interface NutritionHistoryPanelProps {
  history: NutritionCalculationEntry[];
  onClear: () => Promise<void> | void;
  isClearing?: boolean;
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentario",
  light: "Ligero",
  moderate: "Moderado",
  active: "Activo",
  very_active: "Muy activo",
};

const GOAL_LABELS: Record<string, string> = {
  fat_loss: "Pérdida de grasa",
  maintenance: "Mantenimiento",
  muscle_gain: "Ganancia muscular",
};

const FORMULA_LABELS: Record<string, string> = {
  mifflin: "Mifflin-St Jeor",
  harris: "Harris-Benedict",
  katch: "Katch-McArdle",
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function NutritionHistoryPanel({
  history,
  onClear,
  isClearing,
}: NutritionHistoryPanelProps) {
  const [open, setOpen] = useState(false);

  // Ordenar de más reciente a más antigua
  const sorted = [...history].sort((a, b) => {
    const tA = new Date(a.calculated_at).getTime();
    const tB = new Date(b.calculated_at).getTime();
    return tB - tA;
  });

  return (
    <Box mb="xl">
      <Button
        fullWidth
        variant="light"
        color="gray"
        radius="md"
        leftSection={
          <ThemeIcon size="sm" radius="xl" variant="light" color="indigo">
            <IconHistory size={14} />
          </ThemeIcon>
        }
        rightSection={
          open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />
        }
        onClick={() => setOpen((o) => !o)}
        styles={{
          root: {
            justifyContent: "space-between",
            height: 48,
            fontWeight: 600,
          },
          inner: { justifyContent: "space-between" },
          label: { flex: 1, textAlign: "left" },
        }}
      >
        Historia de objetivos nutricionales calculados
        {history.length > 0 && (
          <Badge ml="sm" size="sm" variant="filled" color="indigo" radius="xl">
            {history.length}
          </Badge>
        )}
      </Button>

      <Collapse expanded={open}>
        <Box
          mt="sm"
          className="nv-card"
          p="md"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          {sorted.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              Aún no hay objetivos nutricionales guardados en el histórico.
            </Text>
          ) : (
            <Stack gap="sm">
              <ScrollArea>
                <Table
                  striped
                  highlightOnHover
                  withTableBorder
                  withColumnBorders
                  verticalSpacing="xs"
                  horizontalSpacing="sm"
                  fz="xs"
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Fecha</Table.Th>
                      <Table.Th>Peso</Table.Th>
                      <Table.Th>% Grasa</Table.Th>
                      <Table.Th>Actividad</Table.Th>
                      <Table.Th>Objetivo</Table.Th>
                      <Table.Th>Fórmula</Table.Th>
                      <Table.Th>BMR</Table.Th>
                      <Table.Th>TDEE</Table.Th>
                      <Table.Th>Calorías</Table.Th>
                      <Table.Th>Proteínas</Table.Th>
                      <Table.Th>Carbos</Table.Th>
                      <Table.Th>Grasas</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sorted.map((e, idx) => (
                      <Table.Tr key={`${e.calculated_at}-${idx}`}>
                        <Table.Td>
                          <Text size="xs" fw={600}>
                            {formatDateTime(e.calculated_at)}
                          </Text>
                        </Table.Td>
                        <Table.Td>{e.weight_kg} kg</Table.Td>
                        <Table.Td>
                          {e.body_fat_pct != null ? `${e.body_fat_pct}%` : "—"}
                        </Table.Td>
                        <Table.Td>
                          {ACTIVITY_LABELS[e.activity_level] || e.activity_level}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="xs"
                            variant="light"
                            color={
                              e.goal_type === "fat_loss"
                                ? "red"
                                : e.goal_type === "muscle_gain"
                                  ? "green"
                                  : "blue"
                            }
                          >
                            {GOAL_LABELS[e.goal_type] || e.goal_type}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {FORMULA_LABELS[e.formula_used] || e.formula_used}
                        </Table.Td>
                        <Table.Td>{e.bmr}</Table.Td>
                        <Table.Td>{e.tdee}</Table.Td>
                        <Table.Td>
                          <Text fw={700} size="xs" c="blue">
                            {e.target_calories}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="xs" c="green">
                            {e.target_protein}g
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="xs" c="orange">
                            {e.target_carbs}g
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="xs" c="grape">
                            {e.target_fat}g
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>

              <Group justify="space-between" wrap="wrap">
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  loading={isClearing}
                  onClick={onClear}
                >
                  Vaciar histórico
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="gray"
                  leftSection={<IconChevronUp size={14} />}
                  onClick={() => setOpen(false)}
                >
                  Ocultar histórico
                </Button>
              </Group>
            </Stack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
