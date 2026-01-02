import {
  ActionIcon,
  Box,
  Group,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useClickOutside, useDisclosure } from "@mantine/hooks";
import { IconCheck, IconEdit, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";

// Default meal names that can be customized
export const DEFAULT_MEAL_NAMES: Record<string, string> = {
  meal_1: "Desayuno",
  meal_2: "Media Mañana",
  meal_3: "Almuerzo",
  meal_4: "Merienda",
  meal_5: "Cena",
  meal_6: "Pre-entreno",
  meal_7: "Post-entreno",
  snack: "Snack",
};

interface EditableMealNameProps {
  mealId: string;
  defaultName?: string;
  customName?: string;
  onSave: (mealId: string, newName: string) => void;
  editable?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}

/**
 * EditableMealName - Componente para nombres de comidas editables
 * Permite al cliente o entrenador personalizar el nombre de cada comida
 */
export function EditableMealName({
  mealId,
  defaultName,
  customName,
  onSave,
  editable = true,
  size = "sm",
}: EditableMealNameProps) {
  const [editing, { open: startEdit, close: stopEdit }] = useDisclosure(false);
  const [value, setValue] = useState(customName || defaultName || DEFAULT_MEAL_NAMES[mealId] || "Comida");
  const ref = useClickOutside(() => handleCancel());

  const displayName = customName || defaultName || DEFAULT_MEAL_NAMES[mealId] || "Comida";

  useEffect(() => {
    setValue(displayName);
  }, [displayName]);

  const handleSave = () => {
    if (value.trim()) {
      onSave(mealId, value.trim());
    }
    stopEdit();
  };

  const handleCancel = () => {
    setValue(displayName);
    stopEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!editable) {
    return (
      <Text fw={600} size={size}>
        {displayName}
      </Text>
    );
  }

  if (editing) {
    return (
      <Group gap="xs" ref={ref}>
        <TextInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          size="xs"
          autoFocus
          styles={{
            input: {
              minWidth: 120,
              fontWeight: 600,
            },
          }}
        />
        <ActionIcon
          color="green"
          variant="light"
          size="sm"
          onClick={handleSave}
        >
          <IconCheck size={14} />
        </ActionIcon>
        <ActionIcon
          color="gray"
          variant="light"
          size="sm"
          onClick={handleCancel}
        >
          <IconX size={14} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Group gap={4}>
      <Text fw={600} size={size}>
        {displayName}
      </Text>
      <Tooltip label="Editar nombre">
        <ActionIcon
          color="gray"
          variant="subtle"
          size="xs"
          onClick={startEdit}
        >
          <IconEdit size={12} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

interface MealNameManagerProps {
  mealNames: Record<string, string>;
  onChange: (mealNames: Record<string, string>) => void;
}

/**
 * MealNameManager - Gestor de nombres de comidas para configuración del workspace
 */
export function MealNameManager({ mealNames, onChange }: MealNameManagerProps) {
  const handleSave = (mealId: string, newName: string) => {
    onChange({
      ...mealNames,
      [mealId]: newName,
    });
  };

  const handleReset = (mealId: string) => {
    const newNames = { ...mealNames };
    delete newNames[mealId];
    onChange(newNames);
  };

  return (
    <Box>
      <Text fw={600} size="sm" mb="md">
        Nombres de Comidas
      </Text>
      <Text c="dimmed" size="xs" mb="md">
        Personaliza los nombres de las comidas para tus clientes
      </Text>

      {Object.entries(DEFAULT_MEAL_NAMES).map(([mealId, defaultName]) => (
        <Group key={mealId} justify="space-between" mb="xs">
          <Text size="sm" c="dimmed" w={100}>
            {defaultName}
          </Text>
          <Group gap="xs">
            <TextInput
              value={mealNames[mealId] || defaultName}
              onChange={(e) => handleSave(mealId, e.target.value)}
              size="xs"
              w={150}
            />
            {mealNames[mealId] && mealNames[mealId] !== defaultName && (
              <Tooltip label="Restaurar nombre por defecto">
                <ActionIcon
                  color="gray"
                  variant="subtle"
                  size="sm"
                  onClick={() => handleReset(mealId)}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      ))}
    </Box>
  );
}

export default EditableMealName;
