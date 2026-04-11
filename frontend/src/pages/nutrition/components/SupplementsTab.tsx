import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  SegmentedControl,
  SimpleGrid,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconEdit,
  IconEye,
  IconPill,
  IconSearch,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { EmptyState } from "../../../components/common/EmptyState";
import { RectificationButton } from "../../../components/common/RectificationButton";

interface SupplementsTabProps {
  filteredSupplements: any[];
  searchSupplement: string;
  debouncedSupplementSearch: string;
  supplementFilter: string;
  supplementSourceFilter: string;
  isSupplementFavorite: (id: string) => boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
  onToggleFavorite: (supplementId: string, e?: React.MouseEvent) => void;
  onEdit: (supplement: any) => void;
  onView: (supplement: any) => void;
  onNew: () => void;
  togglePending: boolean;
}

export function SupplementsTab({
  filteredSupplements,
  searchSupplement,
  debouncedSupplementSearch,
  supplementFilter,
  supplementSourceFilter,
  isSupplementFavorite,
  onSearchChange,
  onFilterChange,
  onSourceFilterChange,
  onToggleFavorite,
  onEdit,
  onView,
  onNew,
  togglePending,
}: SupplementsTabProps) {
  return (
    <>
      <Group mb="md" gap="sm">
        <TextInput
          leftSection={<IconSearch size={14} />}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar suplementos..."
          value={searchSupplement}
          radius="md"
          size="sm"
          style={{ flex: 1 }}
          styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        <SegmentedControl
          value={supplementFilter}
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
          value={supplementSourceFilter}
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
        <Button
          leftSection={<IconPill size={14} />}
          onClick={onNew}
          size="xs"
          radius="md"
          variant="light"
        >
          Añadir
        </Button>
      </Group>

      {filteredSupplements.length > 0 ? (
        <>
          <Group justify="space-between" mb="sm">
            <Text c="dimmed" size="xs">
              {filteredSupplements.length} suplemento{filteredSupplements.length !== 1 ? 's' : ''}
              {debouncedSupplementSearch && ` • "${debouncedSupplementSearch}"`}
              {supplementFilter === "favorites" && " • Solo favoritos"}
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md" className="stagger">
            {filteredSupplements.map((supp: any) => (
              <Box key={supp.id} className="food-card" style={{ borderColor: isSupplementFavorite(supp.id) ? "var(--mantine-color-violet-4)" : undefined }}>
                <Box className="food-card-header">
                  <Box
                    className="food-card-icon"
                    style={{
                      background: "var(--mantine-color-violet-light)",
                      color: "var(--mantine-color-violet-filled)",
                    }}
                  >
                    <IconPill size={20} />
                  </Box>
                  <Box className="food-card-info">
                    <Text className="food-card-name" title={supp.name}>{supp.name}</Text>
                    <Group gap={4}>
                      {supp.is_global && <Badge color="gray" variant="light" size="xs">Sistema</Badge>}
                      <Text className="food-card-serving">{supp.brand || supp.serving_size}</Text>
                    </Group>
                  </Box>
                  <Box className="food-card-actions">
                    <Tooltip label={isSupplementFavorite(supp.id) ? "Quitar de favoritos" : "Añadir a favoritos"}>
                      <ActionIcon
                        color={isSupplementFavorite(supp.id) ? "yellow" : "gray"}
                        onClick={(e) => onToggleFavorite(supp.id, e)}
                        size="sm"
                        variant="subtle"
                        radius="md"
                        loading={togglePending}
                      >
                        {isSupplementFavorite(supp.id) ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  </Box>
                </Box>

                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Badge color="violet" variant="light" radius="xl" size="sm">
                      {supp.serving_size}
                    </Badge>
                    {supp.calories > 0 && (
                      <Box className="food-card-calories" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
                        {supp.calories} kcal
                      </Box>
                    )}
                  </Group>
                  <Group gap={4}>
                    <Tooltip label="Ver detalle">
                      <ActionIcon color="gray" onClick={() => onView(supp)} size="sm" variant="subtle" radius="md">
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                    {!supp.is_global && (
                      <Tooltip label="Editar">
                        <ActionIcon color="gray" onClick={() => onEdit(supp)} size="sm" variant="subtle" radius="md">
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <RectificationButton entityType="supplement" entityId={supp.id} entityName={supp.name} size="sm" />
                  </Group>
                </Group>

                {(supp.protein > 0 || supp.carbs > 0 || supp.fat > 0) && (
                  <Box className="food-card-macros">
                    <Box className="food-card-macro protein">
                      <Text className="food-card-macro-value">{supp.protein || 0}g</Text>
                      <Text className="food-card-macro-label">Proteína</Text>
                    </Box>
                    <Box className="food-card-macro carbs">
                      <Text className="food-card-macro-value">{supp.carbs || 0}g</Text>
                      <Text className="food-card-macro-label">Carbos</Text>
                    </Box>
                    <Box className="food-card-macro fat">
                      <Text className="food-card-macro-value">{supp.fat || 0}g</Text>
                      <Text className="food-card-macro-label">Grasas</Text>
                    </Box>
                  </Box>
                )}

                {supp.how_to_take && (
                  <Text size="xs" c="dimmed" lineClamp={2} style={{ paddingTop: "var(--space-xs)", borderTop: "1px solid var(--border-subtle)" }}>
                    <Text component="span" fw={600} c="violet">Cómo tomar:</Text> {supp.how_to_take}
                  </Text>
                )}
              </Box>
            ))}
          </SimpleGrid>
        </>
      ) : supplementFilter === "favorites" ? (
        <EmptyState
          actionLabel="Ver todos"
          description="No tienes suplementos marcados como favoritos."
          icon={<IconStar size={40} />}
          onAction={() => onFilterChange("all")}
          title="Sin favoritos"
        />
      ) : debouncedSupplementSearch ? (
        <EmptyState
          actionLabel="Limpiar búsqueda"
          description={`No se encontraron suplementos que coincidan con "${debouncedSupplementSearch}"`}
          icon={<IconSearch size={40} />}
          onAction={() => onSearchChange("")}
          title="Sin resultados"
        />
      ) : (
        <EmptyState
          actionLabel="Añadir Suplemento"
          description="Los suplementos se cargan desde la base de datos. Añade suplementos para verlos aquí."
          icon={<IconPill size={40} />}
          onAction={onNew}
          title="No hay suplementos"
        />
      )}
    </>
  );
}
