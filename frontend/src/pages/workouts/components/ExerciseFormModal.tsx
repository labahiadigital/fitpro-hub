import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Image,
  MultiSelect,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconCopy,
  IconExchange,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconUpload,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { BottomSheet } from "../../../components/common/BottomSheet";
import {
  useExerciseAlternatives,
  useAddExerciseAlternative,
  useRemoveExerciseAlternative,
} from "../../../hooks/useExercises";
import { api } from "../../../services/api";

function ExerciseAlternativesSection({
  exerciseId,
  exerciseName,
  allExercises,
}: {
  exerciseId: string;
  exerciseName: string;
  allExercises: Array<{ id: string; name: string; muscle_groups?: string[]; category?: string }>;
}) {
  const { data: alternatives, isLoading } = useExerciseAlternatives(exerciseId);
  const addAlternative = useAddExerciseAlternative();
  const removeAlternative = useRemoveExerciseAlternative();
  const [search, setSearch] = useState("");

  const alternativeIds = new Set((alternatives || []).map((a) => a.alternative_exercise_id));
  const filtered = allExercises.filter(
    (e) =>
      e.id !== exerciseId &&
      !alternativeIds.has(e.id) &&
      e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box mt="xl" pt="md" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <Group gap="xs" mb="sm">
        <IconExchange size={16} />
        <Text fw={600} size="sm">Ejercicios alternativos para "{exerciseName}"</Text>
      </Group>
      <Text size="xs" c="dimmed" mb="sm">
        Define qué ejercicios puede usar el cliente como sustituto si la máquina no está disponible o tiene alguna lesión.
      </Text>

      {isLoading ? (
        <Text size="sm" c="dimmed">Cargando...</Text>
      ) : (alternatives || []).length > 0 ? (
        <Stack gap={4} mb="sm">
          {(alternatives || []).map((alt) => (
            <Group key={alt.id} justify="space-between" p="xs" style={{ borderRadius: 8, background: "var(--nv-surface-subtle)" }}>
              <Group gap="xs">
                <Badge size="xs" variant="light" color="blue">{alt.alternative_category || "—"}</Badge>
                <Text size="sm" fw={500}>{alt.alternative_name}</Text>
                {alt.alternative_muscle_groups?.slice(0, 2).map((m) => (
                  <Badge key={m} size="xs" variant="light" color="gray">{m}</Badge>
                ))}
              </Group>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => removeAlternative.mutate({ exerciseId, alternativeId: alt.id })}
              >
                <IconX size={12} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text size="xs" c="dimmed" mb="sm" ta="center" py="xs">
          Sin alternativas definidas. Añade ejercicios equivalentes para que el cliente pueda sustituir.
        </Text>
      )}

      <TextInput
        size="xs"
        placeholder="Buscar ejercicio para añadir como alternativa..."
        leftSection={<IconSearch size={12} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        mb="xs"
      />
      {search.length > 1 && (
        <ScrollArea h={150}>
          <Stack gap={2}>
            {filtered.slice(0, 10).map((e) => (
              <Group
                key={e.id}
                justify="space-between"
                p={4}
                px="xs"
                style={{ borderRadius: 6, cursor: "pointer", background: "var(--nv-surface)" }}
                onClick={() => {
                  addAlternative.mutate(
                    { exerciseId, alternativeExerciseId: e.id },
                    {
                      onSuccess: () => {
                        notifications.show({ title: "Alternativa añadida", message: `${e.name} añadido como alternativa`, color: "green" });
                        setSearch("");
                      },
                    }
                  );
                }}
              >
                <Group gap="xs">
                  <Text size="xs" fw={500}>{e.name}</Text>
                  {e.muscle_groups?.slice(0, 2).map((m) => (
                    <Badge key={m} size="xs" variant="light" color="gray" styles={{ root: { fontSize: "8px", padding: "0 4px" } }}>{m}</Badge>
                  ))}
                </Group>
                <ActionIcon size="xs" variant="light" color="green">
                  <IconPlus size={10} />
                </ActionIcon>
              </Group>
            ))}
            {filtered.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="xs">No se encontraron ejercicios</Text>
            )}
          </Stack>
        </ScrollArea>
      )}
    </Box>
  );
}

export interface ExerciseFormValues {
  name: string;
  alias: string;
  description: string;
  instructions: string;
  muscle_groups: string[];
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  image_url: string;
  video_url: string;
}

export const EXERCISE_FORM_INITIAL_VALUES: ExerciseFormValues = {
  name: "",
  alias: "",
  description: "",
  instructions: "",
  muscle_groups: [],
  equipment: [],
  difficulty: "intermediate",
  category: "",
  image_url: "",
  video_url: "",
};

interface ExerciseFormModalProps {
  opened: boolean;
  onClose: () => void;
  exerciseForm: UseFormReturnType<ExerciseFormValues>;
  editingExercise: any;
  exercises: any[];
  muscleGroups: Array<{ value: string; label: string }>;
  equipmentOptions: Array<{ value: string; label: string }>;
  onSubmit: (values: ExerciseFormValues) => void;
  onDelete: (exerciseId: string) => void;
  onCloneAsOwn?: (exercise: any) => void;
  createPending: boolean;
  updatePending: boolean;
  deletePending: boolean;
}

export function ExerciseFormModal({
  opened,
  onClose,
  exerciseForm,
  editingExercise,
  exercises,
  muscleGroups,
  equipmentOptions,
  onSubmit,
  onDelete,
  onCloneAsOwn,
  createPending,
  updatePending,
  deletePending,
}: ExerciseFormModalProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const isReadOnly = !!editingExercise?.is_global;

  const handleUploadImage = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      notifications.show({ color: "red", message: "La imagen no puede superar los 8 MB" });
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ image_url: string; url: string }>(
        "/exercises/upload-image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      exerciseForm.setFieldValue("image_url", res.data.image_url);
      notifications.show({ color: "green", message: "Imagen subida correctamente" });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      notifications.show({ color: "red", message: detail || "No se pudo subir la imagen" });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const previewImage =
    exerciseForm.values.image_url || editingExercise?.image_url || null;

  return (
    <BottomSheet
      onClose={onClose}
      opened={opened}
      desktopSize="lg"
      title={editingExercise?.is_global ? "Detalle del Ejercicio (Sistema)" : editingExercise ? "Editar Ejercicio" : "Nuevo Ejercicio"}
      radius="lg"
      styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
    >
      {previewImage && (
        <Image
          src={previewImage}
          alt={editingExercise?.name || exerciseForm.values.name || "Ejercicio"}
          h={200}
          fit="cover"
          radius="md"
          mb="md"
        />
      )}
      {editingExercise?.is_global && (
        <Group gap="sm" mb="sm">
          <Badge color="gray" variant="light" size="sm">Dato del sistema — solo lectura</Badge>
          {onCloneAsOwn && (
            <Button
              size="xs"
              variant="light"
              radius="md"
              leftSection={<IconCopy size={14} />}
              onClick={() => onCloneAsOwn(editingExercise)}
            >
              Crear copia propia
            </Button>
          )}
        </Group>
      )}
      <form onSubmit={exerciseForm.onSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Nombre"
            placeholder="Press de Banca"
            required
            disabled={editingExercise?.is_global}
            {...exerciseForm.getInputProps("name")}
          />

          <TextInput
            label="Alias"
            placeholder="Nombre alternativo (ej: Bench Press)"
            disabled={editingExercise?.is_global}
            {...exerciseForm.getInputProps("alias")}
          />

          <Textarea
            label="Descripción"
            minRows={2}
            placeholder="Breve descripción del ejercicio..."
            disabled={editingExercise?.is_global}
            {...exerciseForm.getInputProps("description")}
          />

          <Textarea
            label="Instrucciones"
            minRows={3}
            placeholder="Pasos para realizar el ejercicio correctamente..."
            disabled={editingExercise?.is_global}
            {...exerciseForm.getInputProps("instructions")}
          />

          <Group grow>
            <MultiSelect
              data={muscleGroups}
              label="Grupos musculares"
              placeholder="Selecciona"
              disabled={editingExercise?.is_global}
              {...exerciseForm.getInputProps("muscle_groups")}
            />
            <MultiSelect
              data={equipmentOptions}
              label="Equipamiento"
              placeholder="Selecciona"
              disabled={editingExercise?.is_global}
              {...exerciseForm.getInputProps("equipment")}
            />
          </Group>

          <Group grow>
            <Select
              data={[
                { value: "beginner", label: "Principiante" },
                { value: "intermediate", label: "Intermedio" },
                { value: "advanced", label: "Avanzado" },
              ]}
              label="Dificultad"
              disabled={editingExercise?.is_global}
              {...exerciseForm.getInputProps("difficulty")}
            />
            <Select
              data={[
                { value: "fuerza", label: "Fuerza" },
                { value: "cardio", label: "Cardio" },
                { value: "flexibilidad", label: "Flexibilidad" },
                { value: "core", label: "Core" },
                { value: "calentamiento", label: "Calentamiento" },
                { value: "estiramiento", label: "Estiramiento" },
              ]}
              label="Categoría"
              disabled={editingExercise?.is_global}
              {...exerciseForm.getInputProps("category")}
            />
          </Group>

          <Stack gap={4}>
            <Text size="sm" fw={500}>Imagen</Text>
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <TextInput
                placeholder="URL de la imagen o súbela con el botón"
                leftSection={<IconPhoto size={14} />}
                style={{ flex: 1 }}
                disabled={isReadOnly}
                {...exerciseForm.getInputProps("image_url")}
              />
              <Button
                variant="light"
                leftSection={<IconUpload size={14} />}
                loading={uploadingImage}
                disabled={isReadOnly}
                onClick={() => imageInputRef.current?.click()}
              >
                Subir
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadImage(f);
                }}
              />
            </Group>
            <Text size="xs" c="dimmed">
              La imagen se guarda en el almacenamiento privado de tu workspace (máx. 8 MB).
            </Text>
          </Stack>

          <TextInput
            label="Vídeo (URL)"
            placeholder="https://youtube.com/... o enlace directo a un .mp4"
            leftSection={<IconVideo size={14} />}
            disabled={isReadOnly}
            {...exerciseForm.getInputProps("video_url")}
          />

          {!editingExercise?.is_global && (
            <Group justify="flex-end" mt="md">
              {editingExercise && (
                <Button
                  color="red"
                  variant="subtle"
                  onClick={() => {
                    onDelete(editingExercise.id);
                    onClose();
                  }}
                  loading={deletePending}
                >
                  Eliminar
                </Button>
              )}
              <Box style={{ flex: 1 }} />
              <Button onClick={onClose} variant="default">
                Cancelar
              </Button>
              <Button loading={createPending || updatePending} type="submit">
                {editingExercise ? "Guardar Cambios" : "Crear Ejercicio"}
              </Button>
            </Group>
          )}
          {editingExercise?.is_global && (
            <Group justify="flex-end" mt="md">
              <Button onClick={onClose} variant="default">
                Cerrar
              </Button>
            </Group>
          )}
        </Stack>
      </form>

      {editingExercise && (
        <ExerciseAlternativesSection
          exerciseId={editingExercise.id}
          exerciseName={editingExercise.name}
          allExercises={exercises || []}
        />
      )}
    </BottomSheet>
  );
}
