import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Pagination,
  SegmentedControl,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconApple,
  IconEdit,
  IconEye,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import type { Food } from "../../../components/nutrition/MealPlanBuilder";
import { formatDecimal } from "../../../utils/format";
import { EmptyState } from "../../../components/common/EmptyState";
import { RectificationButton } from "../../../components/common/RectificationButton";

const FOOD_CATEGORIES = [
  { value: "", label: "Todas las categorías" },
  { value: "Proteínas", label: "Proteínas" },
  { value: "Carbohidratos", label: "Carbohidratos" },
  { value: "Verduras", label: "Verduras" },
  { value: "Frutas", label: "Frutas" },
  { value: "Lácteos", label: "Lácteos" },
  { value: "Grasas", label: "Grasas" },
  { value: "Frutos Secos", label: "Frutos Secos" },
  { value: "Otros", label: "Otros" },
];

interface FoodsTabProps {
  paginatedFoodsList: Food[];
  isLoading: boolean;
  isFetching: boolean;
  searchFood: string;
  debouncedSearch: string;
  foodFilter: string;
  foodSourceFilter: string;
  foodCategoryFilter?: string;
  currentPage: number;
  totalPages: number;
  total: number;
  isFoodFavorite: (foodId: string) => boolean;
  getCategoryIcon: (category: string) => React.ComponentType<{ size: number }>;
  getCategoryColor: (category: string) => string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
  onCategoryFilterChange?: (value: string | null) => void;
  onPageChange: (page: number) => void;
  onToggleFavorite: (foodId: string, e?: React.MouseEvent) => void;
  onEdit: (food: any) => void;
  onView: (food: any) => void;
  onDelete: (foodId: string, foodName: string) => void;
  onNewFood: () => void;
  togglePending: boolean;
  foodsPerPage: number;
}

export function FoodsTab({
  paginatedFoodsList,
  isLoading,
  isFetching,
  searchFood,
  debouncedSearch,
  foodFilter,
  foodSourceFilter,
  currentPage,
  totalPages,
  total,
  isFoodFavorite,
  getCategoryIcon,
  getCategoryColor,
  onSearchChange,
  onFilterChange,
  onSourceFilterChange,
  onCategoryFilterChange,
  foodCategoryFilter,
  onPageChange,
  onToggleFavorite,
  onEdit,
  onView,
  onDelete,
  onNewFood,
  togglePending,
  foodsPerPage,
}: FoodsTabProps) {
  return (
    <>
      <Group mb="md" gap="sm">
        <TextInput
          leftSection={<IconSearch size={14} />}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar alimentos..."
          value={searchFood}
          radius="md"
          size="sm"
          style={{ flex: 1 }}
          styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        <SegmentedControl
          value={foodFilter}
          onChange={onFilterChange}
          size="xs"
          radius="md"
          data={[
            { label: "Todos", value: "all" },
            { label: "⭐ Favoritos", value: "favorites" },
          ]}
          styles={{ root: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        <SegmentedControl
          value={foodSourceFilter}
          onChange={onSourceFilterChange}
          size="xs"
          radius="md"
          data={[
            { label: "Todos", value: "all" },
            { label: "Sistema", value: "system" },
            { label: "Propios", value: "custom" },
          ]}
          styles={{ root: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        {onCategoryFilterChange && (
          <Select
            value={foodCategoryFilter || ""}
            onChange={onCategoryFilterChange}
            data={FOOD_CATEGORIES}
            size="xs"
            radius="md"
            w={180}
            placeholder="Categoría"
            clearable
            styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
          />
        )}
      </Group>

      {isLoading ? (
        <Center py="xl"><Loader size="md" /></Center>
      ) : paginatedFoodsList.length > 0 ? (
        <>
          <Group justify="space-between" mb="sm">
            <Text c="dimmed" size="xs">
              {(currentPage - 1) * foodsPerPage + 1} - {Math.min(currentPage * foodsPerPage, total)} de {total.toLocaleString()}
              {debouncedSearch && ` • "${debouncedSearch}"`}
            </Text>
            {isFetching && <Loader size="xs" />}
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md" className="stagger">
            {paginatedFoodsList.map((food) => {
              const CategoryIcon = getCategoryIcon(food.category);
              return (
                <Box key={food.id} className="food-card">
                  <Box className="food-card-header">
                    <Box
                      className="food-card-icon"
                      style={{
                        background: `var(--mantine-color-${getCategoryColor(food.category)}-light)`,
                        color: `var(--mantine-color-${getCategoryColor(food.category)}-filled)`,
                      }}
                    >
                      <CategoryIcon size={20} />
                    </Box>
                    <Box className="food-card-info">
                      <Group gap={4} wrap="nowrap">
                        <Text className="food-card-name">{food.name}</Text>
                        {food.is_global && <Badge color="gray" variant="light" size="xs" style={{ flexShrink: 0 }}>Sistema</Badge>}
                      </Group>
                      <Text className="food-card-serving">100g</Text>
                    </Box>
                    <Box className="food-card-actions">
                      <Tooltip label={isFoodFavorite(food.id) ? "Quitar de favoritos" : "Añadir a favoritos"}>
                        <ActionIcon
                          color={isFoodFavorite(food.id) ? "yellow" : "gray"}
                          onClick={(e) => onToggleFavorite(food.id, e)}
                          size="sm"
                          variant="subtle"
                          radius="md"
                          loading={togglePending}
                        >
                          {isFoodFavorite(food.id) ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Group justify="space-between" align="center">
                    <Box className="food-card-calories">
                      🔥 {formatDecimal(Number(food.calories || 0), 0)} kcal
                    </Box>
                    <Group gap={4}>
                      <Tooltip label="Ver detalle">
                        <ActionIcon color="gray" onClick={() => onView(food)} size="sm" variant="subtle" radius="md">
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {!food.is_global && (
                        <Tooltip label="Editar">
                          <ActionIcon color="gray" onClick={() => onEdit(food)} size="sm" variant="subtle" radius="md">
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {!food.is_global && (
                        <Tooltip label="Eliminar">
                          <ActionIcon color="red" onClick={() => onDelete(food.id, food.name)} size="sm" variant="subtle" radius="md">
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <RectificationButton entityType="food" entityId={food.id} entityName={food.name} size="sm" />
                    </Group>
                  </Group>

                  <Box className="food-card-macros">
                    <Box className="food-card-macro protein">
                      <Text className="food-card-macro-value">{formatDecimal(Number(food.protein || 0), 0)}g</Text>
                      <Text className="food-card-macro-label">Proteína</Text>
                    </Box>
                    <Box className="food-card-macro carbs">
                      <Text className="food-card-macro-value">{formatDecimal(Number(food.carbs || 0), 0)}g</Text>
                      <Text className="food-card-macro-label">Carbos</Text>
                    </Box>
                    <Box className="food-card-macro fat">
                      <Text className="food-card-macro-value">{formatDecimal(Number(food.fat || 0), 0)}g</Text>
                      <Text className="food-card-macro-label">Grasas</Text>
                    </Box>
                  </Box>
                  {food.serving_size && Number(food.serving_size) !== 100 && (
                    <Text size="xs" c="dimmed" mt={4} px={4}>
                      Aprox. una ración de este producto son {Math.round(Number(food.serving_size))}g
                    </Text>
                  )}
                </Box>
              );
            })}
          </SimpleGrid>

          {totalPages > 1 && (
            <Center mt="xl">
              <Pagination
                boundaries={1}
                onChange={onPageChange}
                siblings={1}
                total={totalPages}
                value={currentPage}
                withEdges
              />
            </Center>
          )}
        </>
      ) : debouncedSearch ? (
        <EmptyState
          actionLabel="Limpiar búsqueda"
          description={`No se encontraron alimentos que coincidan con "${debouncedSearch}"`}
          icon={<IconSearch size={40} />}
          onAction={() => onSearchChange("")}
          title="Sin resultados"
        />
      ) : (
        <EmptyState
          actionLabel="Añadir Alimento"
          description="Añade alimentos a tu biblioteca para usarlos en tus planes."
          icon={<IconApple size={40} />}
          onAction={onNewFood}
          title="No hay alimentos"
        />
      )}
    </>
  );
}
