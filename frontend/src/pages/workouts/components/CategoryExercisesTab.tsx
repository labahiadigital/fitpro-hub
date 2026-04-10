import {
  ActionIcon,
  Badge,
  Box,
  Group,
  HoverCard,
  Image,
  SegmentedControl,
  Select,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconEdit,
  IconSearch,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Table } from "@mantine/core";
import { EmptyState } from "../../../components/common/EmptyState";
import { RectificationButton } from "../../../components/common/RectificationButton";
import { ViewModeToggle } from "../../../components/common/ViewModeToggle";

interface CategoryConfig {
  category: string;
  placeholder: string;
  gradient: string;
  icon: ReactNode;
  color: string;
  emptyTitle: string;
  emptyDesc: string;
  emptyLabel: string;
  emptyIcon: ReactNode;
}

interface CategoryExercisesTabProps {
  config: CategoryConfig;
  items: any[];
  loadingExercises: boolean;
  favoritesSet: Set<string>;
  searchExercise: string;
  exerciseSourceFilter: string;
  muscleGroupFilter?: string;
  equipmentFilter?: string;
  muscleGroups?: Array<{ value: string; label: string }>;
  equipmentOptions?: Array<{ value: string; label: string }>;
  onSearchChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
  onMuscleGroupFilterChange?: (value: string | null) => void;
  onEquipmentFilterChange?: (value: string | null) => void;
  onEditExercise: (exercise: any) => void;
  onNewExercise: (category: string) => void;
  onToggleFavorite: (exerciseId: string, isFavorite: boolean) => void;
  onEnlargeImage: (image: { url: string; name: string }) => void;
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
}

export function CategoryExercisesTab({
  config: cfg,
  items,
  loadingExercises,
  favoritesSet,
  searchExercise,
  exerciseSourceFilter,
  onSearchChange,
  onSourceFilterChange,
  muscleGroupFilter,
  equipmentFilter,
  muscleGroups,
  equipmentOptions,
  onMuscleGroupFilterChange,
  onEquipmentFilterChange,
  onEditExercise,
  onNewExercise,
  onToggleFavorite,
  onEnlargeImage,
  viewMode = "grid",
  onViewModeChange,
}: CategoryExercisesTabProps) {
  return (
    <>
      <Group gap="sm" mb="md">
        <TextInput
          leftSection={<IconSearch size={14} />}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={cfg.placeholder}
          value={searchExercise}
          radius="md"
          size="sm"
          style={{ flex: 1 }}
          styles={{ input: { backgroundColor: "var(--nv-surface)", border: "1px solid var(--border-subtle)" } }}
        />
        <SegmentedControl
          value={exerciseSourceFilter}
          onChange={onSourceFilterChange}
          size="xs"
          radius="md"
          data={[
            { label: "Todos", value: "all" },
            { label: "⭐ Favoritos", value: "favorites" },
            { label: "Sistema", value: "system" },
            { label: "Propios", value: "custom" },
          ]}
        />
        {muscleGroups && onMuscleGroupFilterChange && (
          <Select
            value={muscleGroupFilter || null}
            onChange={onMuscleGroupFilterChange}
            data={muscleGroups}
            placeholder="Grupo muscular"
            size="xs"
            radius="md"
            w={160}
            clearable
          />
        )}
        {equipmentOptions && onEquipmentFilterChange && (
          <Select
            value={equipmentFilter || null}
            onChange={onEquipmentFilterChange}
            data={equipmentOptions}
            placeholder="Equipamiento"
            size="xs"
            radius="md"
            w={160}
            clearable
          />
        )}
        {onViewModeChange && <ViewModeToggle value={viewMode} onChange={onViewModeChange} />}
      </Group>

      {items.length > 0 ? (
        viewMode === "list" ? (
          <Table striped highlightOnHover withTableBorder style={{ borderRadius: 8, overflow: "hidden" }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Músculos</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((exercise: any) => (
                <Table.Tr key={exercise.id} style={{ cursor: "pointer" }} onClick={() => onEditExercise(exercise)}>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm" fw={500} lineClamp={1} style={{ minWidth: 0 }}>
                        {exercise.name}{exercise.alias ? ` (${exercise.alias})` : ""}
                      </Text>
                      {exercise.is_global && <Badge color="gray" variant="light" size="xs" style={{ flexShrink: 0 }}>S</Badge>}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {exercise.muscle_groups?.slice(0, 3).map((m: string) => (
                        <Badge key={m} size="xs" variant="light" color={cfg.color}>{m}</Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {!exercise.is_global && <ActionIcon size="xs" variant="subtle" color={cfg.color} onClick={(e) => { e.stopPropagation(); onEditExercise(exercise); }}><IconEdit size={12} /></ActionIcon>}
                      <RectificationButton entityType="exercise" entityId={exercise.id} entityName={exercise.name} size="xs" />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing="sm" className="stagger">
          {items.map((exercise: any) => (
            <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => onEditExercise(exercise)}>
              <ActionIcon
                size="xs"
                variant={favoritesSet.has(exercise.id) ? "filled" : "subtle"}
                color="yellow"
                style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(exercise.id, favoritesSet.has(exercise.id)); }}
              >
                {favoritesSet.has(exercise.id) ? <IconStarFilled size={12} /> : <IconStar size={12} />}
              </ActionIcon>
              {exercise.image_url ? (
                <HoverCard width={320} shadow="lg" openDelay={300} position="right">
                  <HoverCard.Target>
                    <Box h={80} style={{ background: "var(--nv-surface-subtle)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <Image src={exercise.image_url} alt={exercise.name} h={80} w="100%" fit="contain" fallbackSrc={undefined} onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEnlargeImage({ url: exercise.image_url, name: exercise.name }); }} style={{ cursor: "pointer" }} />
                    </Box>
                  </HoverCard.Target>
                  <HoverCard.Dropdown p={0} style={{ overflow: "hidden", borderRadius: 12 }}>
                    <Image src={exercise.image_url} alt={exercise.name} fit="contain" h={280} />
                    <Box p="xs"><Text fw={600} size="sm">{exercise.name}</Text></Box>
                  </HoverCard.Dropdown>
                </HoverCard>
              ) : (
                <Box h={80} style={{ background: `linear-gradient(135deg, ${cfg.gradient} 0%, var(--nv-surface-subtle) 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cfg.icon}
                </Box>
              )}
              <Box p="xs">
                <Group gap={4} wrap="nowrap">
                  <Text fw={600} lineClamp={1} size="xs" style={{ color: "var(--nv-dark)" }}>{exercise.name}{exercise.alias ? ` (${exercise.alias})` : ""}</Text>
                  {exercise.is_global && <Badge color="gray" variant="light" size="xs" styles={{ root: { padding: "1px 4px", fontSize: "8px", flexShrink: 0 } }}>S</Badge>}
                </Group>
                <Group gap={4} mt={4} justify="space-between">
                  <Group gap={4}>
                    {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                      <Badge key={muscle} size="xs" variant="light" color={cfg.color} radius="md" styles={{ root: { padding: "1px 4px", fontSize: "9px" } }}>{muscle}</Badge>
                    ))}
                  </Group>
                  <Group gap={2}>
                    {!exercise.is_global && (
                      <ActionIcon size="xs" variant="subtle" color={cfg.color} onClick={(e) => { e.stopPropagation(); onEditExercise(exercise); }}>
                        <IconEdit size={12} />
                      </ActionIcon>
                    )}
                    <RectificationButton entityType="exercise" entityId={exercise.id} entityName={exercise.name} size="xs" />
                  </Group>
                </Group>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
        )
      ) : loadingExercises ? null : (
        <EmptyState
          actionLabel={cfg.emptyLabel}
          description={cfg.emptyDesc}
          icon={cfg.emptyIcon}
          onAction={() => onNewExercise(cfg.category)}
          title={cfg.emptyTitle}
        />
      )}
    </>
  );
}
