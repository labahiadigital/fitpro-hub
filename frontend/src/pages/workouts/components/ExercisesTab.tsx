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
  IconBarbell,
  IconEdit,
  IconSearch,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { EmptyState } from "../../../components/common/EmptyState";
import { RectificationButton } from "../../../components/common/RectificationButton";

interface ExercisesTabProps {
  filteredExercises: any[];
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
  onNewExercise: (category?: string) => void;
  onToggleFavorite: (exerciseId: string, isFavorite: boolean) => void;
  onEnlargeImage: (image: { url: string; name: string }) => void;
}

export function ExercisesTab({
  filteredExercises,
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
}: ExercisesTabProps) {
  return (
    <>
      <Group gap="sm" mb="md">
        <TextInput
          leftSection={<IconSearch size={14} />}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar ejercicios..."
          value={searchExercise}
          radius="md"
          size="sm"
          style={{ flex: 1 }}
          styles={{
            input: {
              backgroundColor: "var(--nv-surface)",
              border: "1px solid var(--border-subtle)",
            }
          }}
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
      </Group>

      {filteredExercises.length > 0 ? (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing="sm" className="stagger">
          {filteredExercises.map((exercise: any) => (
            <Box key={exercise.id} className="nv-card-compact" p={0} style={{ overflow: "hidden", cursor: "pointer", position: "relative" }} onClick={() => onEditExercise(exercise)}>
              <ActionIcon
                size="xs"
                variant={favoritesSet.has(exercise.id) ? "filled" : "subtle"}
                color="yellow"
                style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(exercise.id, favoritesSet.has(exercise.id));
                }}
              >
                {favoritesSet.has(exercise.id) ? <IconStarFilled size={12} /> : <IconStar size={12} />}
              </ActionIcon>

              {exercise.image_url ? (
                <HoverCard width={320} shadow="lg" openDelay={300} position="right">
                  <HoverCard.Target>
                    <Box h={80} style={{ background: "var(--nv-surface-subtle)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <Image
                        src={exercise.image_url}
                        alt={exercise.name}
                        h={80}
                        w="100%"
                        fit="contain"
                        fallbackSrc={undefined}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEnlargeImage({ url: exercise.image_url, name: exercise.name }); }}
                        style={{ cursor: 'pointer' }}
                      />
                    </Box>
                  </HoverCard.Target>
                  <HoverCard.Dropdown p={0} style={{ overflow: "hidden", borderRadius: 12 }}>
                    <Image src={exercise.image_url} alt={exercise.name} fit="contain" h={280} />
                    <Box p="xs">
                      <Text fw={600} size="sm">{exercise.name}{exercise.alias ? ` (${exercise.alias})` : ""}</Text>
                      {exercise.muscle_groups?.length > 0 && (
                        <Group gap={4} mt={4}>
                          {exercise.muscle_groups.map((m: string) => (
                            <Badge key={m} size="xs" variant="light">{m}</Badge>
                          ))}
                        </Group>
                      )}
                    </Box>
                  </HoverCard.Dropdown>
                </HoverCard>
              ) : (
                <Box
                  h={80}
                  style={{
                    background: "linear-gradient(135deg, var(--nv-primary-glow) 0%, var(--nv-surface-subtle) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconBarbell color="var(--nv-primary)" size={28} />
                </Box>
              )}

              <Box p="xs">
                <Group gap={4} wrap="nowrap">
                  <Text fw={600} lineClamp={1} size="xs" style={{ color: "var(--nv-dark)" }}>
                    {exercise.name}{exercise.alias ? ` (${exercise.alias})` : ""}
                  </Text>
                  {exercise.is_global && <Badge color="gray" variant="light" size="xs" styles={{ root: { padding: "1px 4px", fontSize: "8px", flexShrink: 0 } }}>S</Badge>}
                </Group>
                <Group gap={4} mt={4} justify="space-between">
                  <Group gap={4}>
                    {exercise.muscle_groups?.slice(0, 2).map((muscle: string) => (
                      <Badge key={muscle} size="xs" variant="light" radius="md" styles={{ root: { padding: "1px 4px", fontSize: "9px" } }}>
                        {muscle}
                      </Badge>
                    ))}
                  </Group>
                  <Group gap={2}>
                    {!exercise.is_global && (
                      <ActionIcon size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); onEditExercise(exercise); }}>
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
      ) : loadingExercises ? null : (
        <EmptyState
          actionLabel="Añadir Ejercicio"
          description="Añade ejercicios a tu biblioteca para usarlos en tus programas."
          icon={<IconBarbell size={36} />}
          onAction={() => onNewExercise()}
          title="No hay ejercicios"
        />
      )}
    </>
  );
}
