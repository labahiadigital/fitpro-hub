import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  SegmentedControl,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCopy,
  IconEdit,
  IconSearch,
  IconToolsKitchen2,
  IconTrash,
} from "@tabler/icons-react";
import type { Recipe } from "../../../types/recipe";
import { RECIPE_CATEGORIES, RECIPE_DIFFICULTIES } from "../../../types/recipe";
import { EmptyState } from "../../../components/common/EmptyState";
import { RectificationButton } from "../../../components/common/RectificationButton";

interface RecipesTabProps {
  recipes: Recipe[];
  isLoading: boolean;
  recipeSearch: string;
  recipeCategoryFilter: string;
  recipeDifficultyFilter: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  onEdit: (recipe: Recipe) => void;
  onView: (recipe: Recipe) => void;
  onDuplicate: (recipe: Recipe) => Promise<void>;
  onDelete: (recipe: Recipe) => Promise<void>;
  onCreate: () => void;
  duplicatePending: boolean;
  deletePending: boolean;
}

export function RecipesTab({
  recipes,
  isLoading,
  recipeSearch,
  recipeCategoryFilter,
  recipeDifficultyFilter,
  onSearchChange,
  onCategoryChange,
  onDifficultyChange,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onCreate,
  duplicatePending,
  deletePending,
}: RecipesTabProps) {
  const hasFilters = !!(recipeSearch || recipeCategoryFilter || recipeDifficultyFilter);

  return (
    <>
      <Group mb="md" gap="sm" wrap="wrap">
        <TextInput
          leftSection={<IconSearch size={14} />}
          placeholder="Buscar recetas..."
          value={recipeSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          size="sm"
          style={{ flex: 1, minWidth: 200 }}
          styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        <Select
          placeholder="Categoría"
          data={RECIPE_CATEGORIES}
          value={recipeCategoryFilter}
          onChange={(v) => onCategoryChange(v || "")}
          clearable
          size="sm"
          w={160}
          styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        <SegmentedControl
          size="xs"
          data={[
            { value: "", label: "Todas" },
            ...RECIPE_DIFFICULTIES.map((d) => ({ value: d.value, label: d.label })),
          ]}
          value={recipeDifficultyFilter}
          onChange={onDifficultyChange}
          radius="md"
          styles={{ root: { backgroundColor: "var(--nv-surface)" } }}
        />
      </Group>

      {isLoading ? (
        <Center py="xl"><Loader size="md" /></Center>
      ) : recipes.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" className="stagger">
          {recipes.map((recipe: Recipe) => {
            const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
            const diffLabel = recipe.difficulty === "easy" ? "Fácil" : recipe.difficulty === "medium" ? "Media" : recipe.difficulty === "hard" ? "Difícil" : null;
            const diffColor = recipe.difficulty === "easy" ? "green" : recipe.difficulty === "medium" ? "yellow" : recipe.difficulty === "hard" ? "red" : "gray";
            const perServing = recipe.servings > 0 ? Math.round((recipe.total_calories || 0) / recipe.servings) : Math.round(recipe.total_calories || 0);
            return (
              <Box
                key={recipe.id}
                className="nv-card"
                p="md"
                style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                onClick={() => onView(recipe)}
              >
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} size="sm" style={{ color: "var(--nv-dark)" }} lineClamp={1}>
                      {recipe.name}
                    </Text>
                  </Box>
                  <Group gap={4} wrap="nowrap">
                    {recipe.is_global && (
                      <Badge size="xs" variant="light" color="violet" radius="md">Sistema</Badge>
                    )}
                    {recipe.is_public && (
                      <Badge size="xs" variant="light" color="cyan" radius="md">Público</Badge>
                    )}
                  </Group>
                </Group>

                <Group gap={6} mb="xs" wrap="wrap">
                  {recipe.category && (
                    <Badge size="xs" variant="light" color="blue" radius="md">{recipe.category}</Badge>
                  )}
                  {diffLabel && (
                    <Badge size="xs" variant="light" color={diffColor} radius="md">{diffLabel}</Badge>
                  )}
                  {totalTime > 0 && (
                    <Badge size="xs" variant="light" color="orange" radius="md" leftSection={<span style={{ fontSize: 9 }}>&#9201;</span>}>
                      {totalTime} min
                    </Badge>
                  )}
                  {recipe.servings > 1 && (
                    <Badge size="xs" variant="light" color="gray" radius="md">
                      {recipe.servings} porc.
                    </Badge>
                  )}
                  <Badge size="xs" variant="light" color="teal" radius="md">
                    {recipe.items?.length || 0} ingr.
                  </Badge>
                </Group>

                {recipe.description && (
                  <Text c="dimmed" lineClamp={2} size="xs" mb="xs">{recipe.description}</Text>
                )}

                <Group gap={4} mt="xs">
                  <Badge color="blue" size="xs" variant="light" radius="md">
                    {Math.round(recipe.total_calories || 0)} kcal
                  </Badge>
                  <Badge color="green" size="xs" variant="light" radius="md">
                    P:{Math.round(recipe.total_protein || 0)}g
                  </Badge>
                  <Badge color="orange" size="xs" variant="light" radius="md">
                    C:{Math.round(recipe.total_carbs || 0)}g
                  </Badge>
                  <Badge color="grape" size="xs" variant="light" radius="md">
                    G:{Math.round(recipe.total_fat || 0)}g
                  </Badge>
                </Group>
                {recipe.servings > 1 && (
                  <Text size="xs" c="dimmed" mt={4}>
                    {perServing} kcal/porción
                  </Text>
                )}

                <Divider my="sm" style={{ borderColor: "var(--border-subtle)" }} />
                <Group gap={6} onClick={(e) => e.stopPropagation()}>
                  {!recipe.is_global && (
                    <Button
                      flex={1}
                      leftSection={<IconEdit size={12} />}
                      onClick={() => onEdit(recipe)}
                      size="xs"
                      variant="light"
                      radius="md"
                      styles={{ root: { height: 28 } }}
                    >
                      Editar
                    </Button>
                  )}
                  <Tooltip label="Duplicar">
                    <ActionIcon
                      color="blue"
                      variant="light"
                      radius="md"
                      size="sm"
                      loading={duplicatePending}
                      onClick={async () => {
                        await onDuplicate(recipe);
                        notifications.show({ title: "Receta duplicada", message: `${recipe.name} (copia)`, color: "teal" });
                      }}
                    >
                      <IconCopy size={14} />
                    </ActionIcon>
                  </Tooltip>
                  {!recipe.is_global && (
                    <Tooltip label="Eliminar">
                      <ActionIcon
                        color="red"
                        loading={deletePending}
                        onClick={async () => {
                          await onDelete(recipe);
                          notifications.show({ title: "Receta eliminada", message: recipe.name, color: "green" });
                        }}
                        variant="light"
                        radius="md"
                        size="sm"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <RectificationButton entityType="recipe" entityId={recipe.id} entityName={recipe.name} size="sm" />
                </Group>
              </Box>
            );
          })}
        </SimpleGrid>
      ) : (
        <EmptyState
          actionLabel="Crear Receta"
          description={
            hasFilters
              ? "No se encontraron recetas con los filtros seleccionados."
              : "Crea recetas reutilizables combinando alimentos y suplementos."
          }
          icon={<IconToolsKitchen2 size={36} />}
          onAction={onCreate}
          title={hasFilters ? "Sin resultados" : "No hay recetas"}
        />
      )}
    </>
  );
}
