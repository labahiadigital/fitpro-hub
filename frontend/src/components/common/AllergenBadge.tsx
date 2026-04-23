import { Badge, Group, Tooltip, ThemeIcon, Text, Box } from "@mantine/core";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { DIETARY_RESTRICTIONS } from "../../constants/allergens";

// Listado común (alergias + intolerancias) que comparte toda la app.
export const COMMON_ALLERGENS = DIETARY_RESTRICTIONS.map((r) => ({
  id: r.id,
  name: r.short_label,
  icon: r.icon ?? "⚠️",
}));

interface AllergenBadgeProps {
  allergen: string;
  isClientAllergen?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}

/**
 * AllergenBadge - Muestra un badge para un alérgeno
 * Si es un alérgeno del cliente, se muestra en rojo con alerta
 */
export function AllergenBadge({
  allergen,
  isClientAllergen = false,
  size = "sm",
}: AllergenBadgeProps) {
  const allergenInfo = COMMON_ALLERGENS.find(
    (a) => a.id.toLowerCase() === allergen.toLowerCase()
  );

  const displayName = allergenInfo?.name || allergen;
  const icon = allergenInfo?.icon || "⚠️";

  if (isClientAllergen) {
    return (
      <Tooltip
        label="¡ALERTA! El cliente es alérgico/intolerante a este ingrediente"
        withArrow
        color="red"
      >
        <Badge
          color="red"
          variant="filled"
          size={size}
          leftSection={<IconAlertTriangle size={12} />}
          style={{ cursor: "help" }}
        >
          {icon} {displayName}
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Badge color="gray" variant="light" size={size}>
      {icon} {displayName}
    </Badge>
  );
}

interface AllergenListProps {
  allergens: string[];
  clientAllergens?: string[];
  clientIntolerances?: string[];
  size?: "xs" | "sm" | "md" | "lg";
}

/**
 * AllergenList - Muestra una lista de alérgenos
 * Resalta en rojo los que coinciden con las alergias/intolerancias del cliente
 */
export function AllergenList({
  allergens,
  clientAllergens = [],
  clientIntolerances = [],
  size = "sm",
}: AllergenListProps) {
  const clientRestrictions = [
    ...clientAllergens.map((a) => a.toLowerCase()),
    ...clientIntolerances.map((a) => a.toLowerCase()),
  ];

  if (allergens.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        Sin alérgenos conocidos
      </Text>
    );
  }

  return (
    <Group gap="xs">
      {allergens.map((allergen) => (
        <AllergenBadge
          key={allergen}
          allergen={allergen}
          isClientAllergen={clientRestrictions.includes(allergen.toLowerCase())}
          size={size}
        />
      ))}
    </Group>
  );
}

interface FoodAllergenWarningProps {
  foodAllergens: string[];
  clientAllergens: string[];
  clientIntolerances: string[];
}

/**
 * FoodAllergenWarning - Muestra una advertencia si un alimento contiene alérgenos del cliente
 */
export function FoodAllergenWarning({
  foodAllergens,
  clientAllergens,
  clientIntolerances,
}: FoodAllergenWarningProps) {
  const clientRestrictions = [
    ...clientAllergens.map((a) => a.toLowerCase()),
    ...clientIntolerances.map((a) => a.toLowerCase()),
  ];

  const matchingAllergens = foodAllergens.filter((a) =>
    clientRestrictions.includes(a.toLowerCase())
  );

  if (matchingAllergens.length === 0) {
    return null;
  }

  return (
    <Box
      p="sm"
      style={{
        backgroundColor: "var(--mantine-color-red-0)",
        borderRadius: "var(--mantine-radius-md)",
        border: "1px solid var(--mantine-color-red-3)",
      }}
    >
      <Group gap="xs" align="flex-start">
        <ThemeIcon color="red" variant="light" size="sm">
          <IconAlertTriangle size={14} />
        </ThemeIcon>
        <Box>
          <Text c="red" fw={600} size="sm">
            ⚠️ ALERTA DE ALÉRGENOS
          </Text>
          <Text c="red.7" size="xs">
            Este alimento contiene:{" "}
            {matchingAllergens
              .map((a) => {
                const info = COMMON_ALLERGENS.find(
                  (c) => c.id.toLowerCase() === a.toLowerCase()
                );
                return info?.name || a;
              })
              .join(", ")}
          </Text>
        </Box>
      </Group>
    </Box>
  );
}

interface AllergenSelectorProps {
  selected: string[];
  onChange: (allergens: string[]) => void;
  label?: string;
}

/**
 * AllergenSelector - Selector de alérgenos para formularios
 */
export function AllergenSelector({
  selected,
  onChange,
  label = "Alergias e Intolerancias",
}: AllergenSelectorProps) {
  const toggleAllergen = (allergenId: string) => {
    if (selected.includes(allergenId)) {
      onChange(selected.filter((a) => a !== allergenId));
    } else {
      onChange([...selected, allergenId]);
    }
  };

  return (
    <Box>
      {label && (
        <Text fw={500} size="sm" mb="xs">
          {label}
        </Text>
      )}
      <Group gap="xs">
        {COMMON_ALLERGENS.map((allergen) => {
          const isSelected = selected.includes(allergen.id);
          return (
            <Badge
              key={allergen.id}
              color={isSelected ? "red" : "gray"}
              variant={isSelected ? "filled" : "outline"}
              size="lg"
              style={{ cursor: "pointer" }}
              onClick={() => toggleAllergen(allergen.id)}
              leftSection={isSelected ? <IconCheck size={12} /> : undefined}
            >
              {allergen.icon} {allergen.name}
            </Badge>
          );
        })}
      </Group>
    </Box>
  );
}

export default AllergenBadge;
