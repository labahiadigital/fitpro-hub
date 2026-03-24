import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconClock,
  IconCopy,
  IconEdit,
  IconToolsKitchen2,
  IconUsers,
} from "@tabler/icons-react";
import type { Recipe } from "../../types/recipe";

interface RecipeDetailModalProps {
  opened: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onEdit?: (recipe: Recipe) => void;
  onDuplicate?: (recipe: Recipe) => void;
  readOnly?: boolean;
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: "Fácil", color: "green" },
  medium: { label: "Media", color: "yellow" },
  hard: { label: "Difícil", color: "red" },
};

export function RecipeDetailModal({
  opened,
  onClose,
  recipe,
  onEdit,
  onDuplicate,
  readOnly = false,
}: RecipeDetailModalProps) {
  if (!recipe) return null;

  const servings = recipe.servings || 1;
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
  const totalCal = Math.round(recipe.total_calories || 0);
  const perServingCal = Math.round(totalCal / servings);

  const macroTotal =
    (recipe.total_protein || 0) + (recipe.total_carbs || 0) + (recipe.total_fat || 0);
  const proteinPct = macroTotal > 0 ? ((recipe.total_protein || 0) / macroTotal) * 100 : 0;
  const carbsPct = macroTotal > 0 ? ((recipe.total_carbs || 0) / macroTotal) * 100 : 0;
  const fatPct = macroTotal > 0 ? ((recipe.total_fat || 0) / macroTotal) * 100 : 0;

  const diff = recipe.difficulty ? DIFFICULTY_MAP[recipe.difficulty] : null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="teal">
            <IconToolsKitchen2 size={18} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="lg" style={{ color: "var(--nv-dark)" }} lineClamp={1}>
              {recipe.name}
            </Text>
            {recipe.category && (
              <Badge size="xs" variant="light" color="blue">
                {recipe.category}
              </Badge>
            )}
          </Box>
        </Group>
      }
      size="lg"
      radius="lg"
    >
      <ScrollArea.Autosize mah="75vh" offsetScrollbars>
        <Stack gap="md">
          {/* Meta badges */}
          <Group gap="xs" wrap="wrap">
            {diff && (
              <Badge color={diff.color} variant="light" size="sm">
                {diff.label}
              </Badge>
            )}
            {recipe.servings > 0 && (
              <Badge
                color="blue"
                variant="light"
                size="sm"
                leftSection={<IconUsers size={10} />}
              >
                {recipe.servings} porcion{recipe.servings > 1 ? "es" : ""}
              </Badge>
            )}
            {totalTime > 0 && (
              <Badge
                color="orange"
                variant="light"
                size="sm"
                leftSection={<IconClock size={10} />}
              >
                {totalTime} min
                {recipe.prep_time_minutes && recipe.cook_time_minutes
                  ? ` (${recipe.prep_time_minutes} prep + ${recipe.cook_time_minutes} cocción)`
                  : ""}
              </Badge>
            )}
            {recipe.is_global && (
              <Badge color="violet" variant="light" size="sm">
                Sistema
              </Badge>
            )}
            {recipe.is_public && (
              <Badge color="cyan" variant="light" size="sm">
                Visible clientes
              </Badge>
            )}
            {recipe.tags?.map((tag) => (
              <Badge key={tag} color="gray" variant="outline" size="xs">
                {tag}
              </Badge>
            ))}
          </Group>

          {/* Macro summary */}
          <Box
            p="md"
            style={{
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--nv-surface, #fafafa) 0%, #f0f4fa 100%)",
              border: "1px solid var(--nv-border, #e0e0e0)",
            }}
          >
            <Group justify="space-between" mb="sm">
              <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }}>
                Información nutricional
              </Text>
              <Text size="xs" c="dimmed">
                por porción / total
              </Text>
            </Group>

            <SimpleGrid cols={4} spacing="xs" mb="sm">
              {[
                {
                  label: "Calorías",
                  per: perServingCal,
                  total: totalCal,
                  unit: "kcal",
                  color: "blue",
                },
                {
                  label: "Proteína",
                  per: Math.round(((recipe.total_protein || 0) / servings) * 10) / 10,
                  total: Math.round((recipe.total_protein || 0) * 10) / 10,
                  unit: "g",
                  color: "green",
                },
                {
                  label: "Carbos",
                  per: Math.round(((recipe.total_carbs || 0) / servings) * 10) / 10,
                  total: Math.round((recipe.total_carbs || 0) * 10) / 10,
                  unit: "g",
                  color: "orange",
                },
                {
                  label: "Grasa",
                  per: Math.round(((recipe.total_fat || 0) / servings) * 10) / 10,
                  total: Math.round((recipe.total_fat || 0) * 10) / 10,
                  unit: "g",
                  color: "grape",
                },
              ].map((macro) => (
                <Box key={macro.label} ta="center">
                  <Text size="xs" c="dimmed">
                    {macro.label}
                  </Text>
                  <Text fw={700} size="md" style={{ color: `var(--mantine-color-${macro.color}-6)` }}>
                    {macro.per}
                    <Text span size="xs" c="dimmed">
                      {macro.unit}
                    </Text>
                  </Text>
                  <Text size="xs" c="dimmed">
                    Total: {macro.total}
                    {macro.unit}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>

            {macroTotal > 0 && (
              <Box>
                <Progress.Root size="lg" radius="xl">
                  <Progress.Section value={proteinPct} color="green">
                    <Progress.Label>{Math.round(proteinPct)}% P</Progress.Label>
                  </Progress.Section>
                  <Progress.Section value={carbsPct} color="orange">
                    <Progress.Label>{Math.round(carbsPct)}% C</Progress.Label>
                  </Progress.Section>
                  <Progress.Section value={fatPct} color="grape">
                    <Progress.Label>{Math.round(fatPct)}% G</Progress.Label>
                  </Progress.Section>
                </Progress.Root>
              </Box>
            )}
          </Box>

          {/* Ingredients */}
          {recipe.items && recipe.items.length > 0 && (
            <>
              <Divider
                label={
                  <Text fw={600} size="sm">
                    Ingredientes ({recipe.items.length})
                  </Text>
                }
              />
              <Stack gap={4}>
                {recipe.items.map((item, idx) => {
                  const ratio = (item.quantity_grams || 100) / 100;
                  return (
                    <Group
                      key={`${item.food_id}-${idx}`}
                      justify="space-between"
                      p="xs"
                      style={{
                        borderRadius: 8,
                        backgroundColor: "var(--nv-surface, #fafafa)",
                      }}
                    >
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {item.name}
                        </Text>
                        <Badge size="xs" variant="light" color="gray">
                          {item.quantity_grams}g
                        </Badge>
                      </Group>
                      <Group gap={4}>
                        <Text size="xs" c="dimmed">
                          {Math.round((item.calories || 0) * ratio)} kcal
                        </Text>
                        <Text size="xs" c="green">
                          P:{Math.round((item.protein || 0) * ratio * 10) / 10}
                        </Text>
                        <Text size="xs" c="orange">
                          C:{Math.round((item.carbs || 0) * ratio * 10) / 10}
                        </Text>
                        <Text size="xs" c="grape">
                          G:{Math.round((item.fat || 0) * ratio * 10) / 10}
                        </Text>
                      </Group>
                    </Group>
                  );
                })}
              </Stack>
            </>
          )}

          {/* Instructions */}
          {recipe.description && (
            <>
              <Divider label={<Text fw={600} size="sm">Preparación</Text>} />
              <Box
                p="sm"
                style={{
                  borderRadius: 8,
                  backgroundColor: "var(--nv-surface, #fafafa)",
                  whiteSpace: "pre-wrap",
                }}
              >
                <Text size="sm" style={{ lineHeight: 1.6 }}>
                  {recipe.description}
                </Text>
              </Box>
            </>
          )}

          {/* Notes (trainer only) */}
          {!readOnly && recipe.notes && (
            <>
              <Divider label={<Text fw={600} size="sm">Notas internas</Text>} />
              <Box
                p="sm"
                style={{
                  borderRadius: 8,
                  backgroundColor: "var(--mantine-color-yellow-0)",
                  border: "1px dashed var(--mantine-color-yellow-4)",
                  whiteSpace: "pre-wrap",
                }}
              >
                <Text size="sm">{recipe.notes}</Text>
              </Box>
            </>
          )}

          {/* Actions */}
          {!readOnly && (onEdit || onDuplicate) && (
            <>
              <Divider />
              <Group justify="flex-end">
                {onDuplicate && (
                  <Button
                    variant="light"
                    leftSection={<IconCopy size={14} />}
                    onClick={() => onDuplicate(recipe)}
                    size="sm"
                  >
                    Duplicar
                  </Button>
                )}
                {onEdit && !recipe.is_global && (
                  <Button
                    leftSection={<IconEdit size={14} />}
                    onClick={() => onEdit(recipe)}
                    size="sm"
                    styles={{
                      root: {
                        background: "var(--nv-accent)",
                        color: "var(--nv-dark)",
                        fontWeight: 700,
                      },
                    }}
                  >
                    Editar
                  </Button>
                )}
              </Group>
            </>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}
