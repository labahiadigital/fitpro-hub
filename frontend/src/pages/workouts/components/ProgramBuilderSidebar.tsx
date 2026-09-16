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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <Stack gap="md">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.05em" }}>
        {"Configuración"}
      </Text>

      {isEditingTemplate ? (
        <Group gap="xs" align="center" wrap="nowrap">
          <IconTemplate size={16} color="var(--mantine-color-teal-6)" />
          <Text size="sm" fw={600} c="teal">
            {t("programBuilder.editandoPlantilla")}
          </Text>
        </Group>
      ) : (
        <Select
          label={t("programBuilder.asignarACliente")}
          placeholder={t("programBuilder.buscarCliente")}
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
            {t("programBuilder.crearComoPlantilla")}
          </Button>
        ) : (
          <Switch
            label={t("programBuilder.crearComoPlantillaLabel")}
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
        <Text size="xs" c="red">{t("programBuilder.asignaUnCliente")}</Text>
      )}

      <TextInput
        label={t("programBuilder.nombreDelPrograma")}
        placeholder={t("programBuilder.programaHipertrofia")}
        required
        radius="md"
        size="sm"
        {...programForm.getInputProps("name")}
      />

      <Textarea
        label={t("common.descripcion")}
        minRows={2}
        placeholder={t("programBuilder.describeElPrograma")}
        radius="md"
        size="sm"
        {...programForm.getInputProps("description")}
      />

      <Group grow>
        <NumberInput
          label={t("workouts.programacionSemanal")}
          max={52}
          min={1}
          radius="md"
          size="sm"
          {...programForm.getInputProps("duration_weeks")}
          onChange={(v) => onDurationChange(Number(v) || 1)}
        />
        <Select
          data={[
            { value: "beginner", label: t("workouts.principiante") },
            { value: "intermediate", label: t("workouts.intermedio") },
            { value: "advanced", label: t("workouts.avanzado") },
          ]}
          label={t("common.dificultad")}
          radius="md"
          size="sm"
          {...programForm.getInputProps("difficulty")}
        />
      </Group>

      <MultiSelect
        data={[
          { value: "hipertrofia", label: t("workouts.hipertrofia") },
          { value: "fuerza", label: t("workouts.fuerza") },
          { value: "pérdida de peso", label: t("workouts.perdidaDePeso") },
          { value: "tonificación", label: t("workouts.tonificacion") },
          { value: "resistencia", label: t("workouts.resistenciaTag") },
        ]}
        label={t("common.etiquetas")}
        placeholder={t("programBuilder.anadeEtiquetas")}
        searchable
        radius="md"
        size="sm"
        {...programForm.getInputProps("tags")}
      />

      {(selectedClientId || clientId) && !isEditingTemplate && (
        <>
          <Group grow>
            <TextInput
              label={t("programBuilder.fechaDeInicio")}
              type="date"
              radius="md"
              size="sm"
              {...programForm.getInputProps("start_date")}
            />
            <TextInput
              label={t("programBuilder.fechaDeFin")}
              description={t("programBuilder.siNoSeIndica")}
              type="date"
              radius="md"
              size="sm"
              {...programForm.getInputProps("end_date")}
            />
          </Group>
          <NumberInput
            label={t("programBuilder.intervaloRevision")}
            description={t("programBuilder.generaRecordatorios")}
            placeholder={t("workouts.ej15")}
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
