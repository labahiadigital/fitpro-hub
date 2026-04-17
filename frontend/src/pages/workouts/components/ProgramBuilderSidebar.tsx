import {
  Button,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { IconTemplate, IconUser } from "@tabler/icons-react";

interface ProgramFormValues {
  name: string;
  description: string;
  duration_weeks: number;
  difficulty: string;
  tags: string[];
  client_id: string | null;
  start_date: string;
  end_date: string;
  review_interval_days: number | null;
}

interface ProgramBuilderSidebarProps {
  programForm: UseFormReturnType<ProgramFormValues>;
  clientOptions: Array<{ value: string; label: string }>;
  selectedClientId: string | null;
  isTemplateModeOn: boolean;
  clientId: string | null;
  canSaveProgram: boolean;
  isEditingTemplate?: boolean;
  isEditingClientProgram?: boolean;
  isSavingTemplate?: boolean;
  onClientChange: (value: string | null) => void;
  onTemplateModeChange: (checked: boolean) => void;
  onDurationChange: (value: number) => void;
  onSaveAsTemplate?: () => void;
}

export function ProgramBuilderSidebar({
  programForm,
  clientOptions,
  selectedClientId,
  isTemplateModeOn,
  clientId,
  canSaveProgram,
  isEditingTemplate = false,
  isEditingClientProgram = false,
  isSavingTemplate = false,
  onClientChange,
  onTemplateModeChange,
  onDurationChange,
  onSaveAsTemplate,
}: ProgramBuilderSidebarProps) {
  return (
    <Stack gap="md">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.05em" }}>
        Configuración
      </Text>

      {isEditingTemplate ? (
        <Group gap="xs" align="center" wrap="nowrap">
          <IconTemplate size={16} color="var(--mantine-color-teal-6)" />
          <Text size="sm" fw={600} c="teal">
            Editando plantilla reutilizable
          </Text>
        </Group>
      ) : (
        <Select
          label="Asignar a cliente"
          placeholder="Buscar cliente..."
          data={clientOptions}
          searchable
          clearable
          radius="md"
          size="sm"
          leftSection={<IconUser size={14} />}
          value={selectedClientId}
          onChange={onClientChange}
        />
      )}

      {!isEditingTemplate && (
        isEditingClientProgram ? (
          <Button
            variant="light"
            color="teal"
            size="sm"
            radius="md"
            leftSection={<IconTemplate size={16} />}
            loading={isSavingTemplate}
            disabled={!programForm.values.name}
            onClick={onSaveAsTemplate}
          >
            Crear como plantilla
          </Button>
        ) : (
          <Switch
            label="Crear como plantilla"
            description={selectedClientId || clientId
              ? "Guarda una copia reutilizable además del programa del cliente"
              : "Guarda como plantilla reutilizable"}
            checked={isTemplateModeOn}
            onChange={(e) => onTemplateModeChange(e.currentTarget.checked)}
            size="sm"
            color="teal"
          />
        )
      )}

      {!canSaveProgram && !isEditingClientProgram && !isEditingTemplate && (
        <Text size="xs" c="red">Asigna un cliente o marca &quot;Crear como plantilla&quot; para poder guardar</Text>
      )}

      <TextInput
        label="Nombre del programa"
        placeholder="Programa de Hipertrofia"
        required
        radius="md"
        size="sm"
        {...programForm.getInputProps("name")}
      />

      <Textarea
        label="Descripción"
        minRows={2}
        placeholder="Describe el programa..."
        radius="md"
        size="sm"
        {...programForm.getInputProps("description")}
      />

      <Group grow>
        <NumberInput
          label="Programación (semanal)"
          max={52}
          min={1}
          radius="md"
          size="sm"
          {...programForm.getInputProps("duration_weeks")}
          onChange={(v) => onDurationChange(Number(v) || 1)}
        />
        <Select
          data={[
            { value: "beginner", label: "Principiante" },
            { value: "intermediate", label: "Intermedio" },
            { value: "advanced", label: "Avanzado" },
          ]}
          label="Dificultad"
          radius="md"
          size="sm"
          {...programForm.getInputProps("difficulty")}
        />
      </Group>

      <MultiSelect
        data={[
          { value: "hipertrofia", label: "Hipertrofia" },
          { value: "fuerza", label: "Fuerza" },
          { value: "pérdida de peso", label: "Pérdida de peso" },
          { value: "tonificación", label: "Tonificación" },
          { value: "resistencia", label: "Resistencia" },
        ]}
        label="Etiquetas"
        placeholder="Añade etiquetas"
        searchable
        radius="md"
        size="sm"
        {...programForm.getInputProps("tags")}
      />

      {(selectedClientId || clientId) && !isEditingTemplate && (
        <>
          <Group grow>
            <TextInput
              label="Fecha de inicio"
              type="date"
              radius="md"
              size="sm"
              {...programForm.getInputProps("start_date")}
            />
            <TextInput
              label="Fecha de fin (opcional)"
              description="Si no se indica, las semanas se repiten indefinidamente"
              type="date"
              radius="md"
              size="sm"
              {...programForm.getInputProps("end_date")}
            />
          </Group>
          <NumberInput
            label="Intervalo de revisión (días)"
            description="Genera recordatorios automáticos para revisar el programa"
            placeholder="Ej: 15"
            min={1}
            max={365}
            radius="md"
            size="sm"
            {...programForm.getInputProps("review_interval_days")}
          />
        </>
      )}
    </Stack>
  );
}
