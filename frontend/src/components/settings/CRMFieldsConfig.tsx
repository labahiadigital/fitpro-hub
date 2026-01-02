import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  ColorInput,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// Types
interface CRMField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "date" | "number" | "select" | "multiselect" | "textarea" | "json";
  required: boolean;
  visible: boolean;
  options?: string[];
  isCustom?: boolean;
}

interface CRMFieldGroup {
  id: string;
  name: string;
  order: number;
  fields: string[];
  color?: string;
}

interface CRMConfig {
  groups: CRMFieldGroup[];
  fields: Record<string, CRMField>;
  customFields: CRMField[];
}

// Default configuration
const DEFAULT_CRM_CONFIG: CRMConfig = {
  groups: [
    {
      id: "personal",
      name: "Información Personal",
      order: 1,
      fields: ["first_name", "last_name", "email", "phone", "birth_date", "gender"],
      color: "#2D6A4F",
    },
    {
      id: "physical",
      name: "Datos Físicos",
      order: 2,
      fields: ["height_cm", "weight_kg"],
      color: "#40916C",
    },
    {
      id: "health",
      name: "Salud",
      order: 3,
      fields: ["allergies", "intolerances", "injuries"],
      color: "#F08A5D",
    },
    {
      id: "goals",
      name: "Objetivos y Notas",
      order: 4,
      fields: ["goals", "internal_notes"],
      color: "#2196F3",
    },
  ],
  fields: {
    first_name: { id: "first_name", label: "Nombre", type: "text", required: true, visible: true },
    last_name: { id: "last_name", label: "Apellidos", type: "text", required: true, visible: true },
    email: { id: "email", label: "Email", type: "email", required: true, visible: true },
    phone: { id: "phone", label: "Teléfono", type: "phone", required: false, visible: true },
    birth_date: { id: "birth_date", label: "Fecha de Nacimiento", type: "date", required: false, visible: true },
    gender: { id: "gender", label: "Género", type: "select", required: false, visible: true, options: ["Masculino", "Femenino", "Otro"] },
    height_cm: { id: "height_cm", label: "Altura (cm)", type: "number", required: false, visible: true },
    weight_kg: { id: "weight_kg", label: "Peso (kg)", type: "number", required: false, visible: true },
    allergies: { id: "allergies", label: "Alergias", type: "multiselect", required: false, visible: true },
    intolerances: { id: "intolerances", label: "Intolerancias", type: "multiselect", required: false, visible: true },
    injuries: { id: "injuries", label: "Lesiones", type: "json", required: false, visible: true },
    goals: { id: "goals", label: "Objetivos", type: "textarea", required: false, visible: true },
    internal_notes: { id: "internal_notes", label: "Notas Internas", type: "textarea", required: false, visible: true },
  },
  customFields: [],
};

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Teléfono" },
  { value: "date", label: "Fecha" },
  { value: "number", label: "Número" },
  { value: "select", label: "Selección" },
  { value: "multiselect", label: "Selección Múltiple" },
  { value: "textarea", label: "Texto Largo" },
];

interface CRMFieldsConfigProps {
  config?: CRMConfig;
  onChange?: (config: CRMConfig) => void;
}

/**
 * CRMFieldsConfig - Configurador de campos CRM editables y agrupables
 */
export function CRMFieldsConfig({ config = DEFAULT_CRM_CONFIG, onChange }: CRMFieldsConfigProps) {
  const [crmConfig, setCrmConfig] = useState<CRMConfig>(config);
  const [fieldModalOpened, { open: openFieldModal, close: closeFieldModal }] = useDisclosure(false);
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const [editingField, setEditingField] = useState<CRMField | null>(null);
  const [editingGroup, setEditingGroup] = useState<CRMFieldGroup | null>(null);

  const fieldForm = useForm({
    initialValues: {
      label: "",
      type: "text" as CRMField["type"],
      required: false,
      visible: true,
      options: "",
    },
  });

  const groupForm = useForm({
    initialValues: {
      name: "",
      color: "#2D6A4F",
    },
  });

  const handleSaveConfig = (newConfig: CRMConfig) => {
    setCrmConfig(newConfig);
    onChange?.(newConfig);
    notifications.show({
      title: "Configuración guardada",
      message: "Los cambios se han guardado correctamente",
      color: "green",
      icon: <IconCheck size={16} />,
    });
  };

  const toggleFieldVisibility = (fieldId: string) => {
    const newConfig = {
      ...crmConfig,
      fields: {
        ...crmConfig.fields,
        [fieldId]: {
          ...crmConfig.fields[fieldId],
          visible: !crmConfig.fields[fieldId].visible,
        },
      },
    };
    handleSaveConfig(newConfig);
  };

  const handleOpenFieldModal = (field?: CRMField) => {
    if (field) {
      setEditingField(field);
      fieldForm.setValues({
        label: field.label,
        type: field.type,
        required: field.required,
        visible: field.visible,
        options: field.options?.join(", ") || "",
      });
    } else {
      setEditingField(null);
      fieldForm.reset();
    }
    openFieldModal();
  };

  const handleSaveField = (values: typeof fieldForm.values) => {
    const fieldId = editingField?.id || `custom_${Date.now()}`;
    const newField: CRMField = {
      id: fieldId,
      label: values.label,
      type: values.type,
      required: values.required,
      visible: values.visible,
      options: values.options ? values.options.split(",").map((o) => o.trim()) : undefined,
      isCustom: !editingField || editingField.isCustom,
    };

    const newConfig = {
      ...crmConfig,
      fields: {
        ...crmConfig.fields,
        [fieldId]: newField,
      },
    };

    // If new custom field, add to customFields and first group
    if (!editingField) {
      newConfig.customFields = [...crmConfig.customFields, newField];
      if (newConfig.groups.length > 0) {
        newConfig.groups[0].fields = [...newConfig.groups[0].fields, fieldId];
      }
    }

    handleSaveConfig(newConfig);
    closeFieldModal();
    fieldForm.reset();
  };

  const handleDeleteField = (fieldId: string) => {
    const field = crmConfig.fields[fieldId];
    if (!field?.isCustom) {
      notifications.show({
        title: "No se puede eliminar",
        message: "Los campos del sistema no se pueden eliminar",
        color: "red",
      });
      return;
    }

    const newFields = { ...crmConfig.fields };
    delete newFields[fieldId];

    const newConfig = {
      ...crmConfig,
      fields: newFields,
      customFields: crmConfig.customFields.filter((f) => f.id !== fieldId),
      groups: crmConfig.groups.map((g) => ({
        ...g,
        fields: g.fields.filter((f) => f !== fieldId),
      })),
    };

    handleSaveConfig(newConfig);
  };

  const handleOpenGroupModal = (group?: CRMFieldGroup) => {
    if (group) {
      setEditingGroup(group);
      groupForm.setValues({
        name: group.name,
        color: group.color || "#2D6A4F",
      });
    } else {
      setEditingGroup(null);
      groupForm.reset();
    }
    openGroupModal();
  };

  const handleSaveGroup = (values: typeof groupForm.values) => {
    if (editingGroup) {
      const newConfig = {
        ...crmConfig,
        groups: crmConfig.groups.map((g) =>
          g.id === editingGroup.id
            ? { ...g, name: values.name, color: values.color }
            : g
        ),
      };
      handleSaveConfig(newConfig);
    } else {
      const newGroup: CRMFieldGroup = {
        id: `group_${Date.now()}`,
        name: values.name,
        order: crmConfig.groups.length + 1,
        fields: [],
        color: values.color,
      };
      const newConfig = {
        ...crmConfig,
        groups: [...crmConfig.groups, newGroup],
      };
      handleSaveConfig(newConfig);
    }
    closeGroupModal();
    groupForm.reset();
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === "group") {
      const newGroups = Array.from(crmConfig.groups);
      const [removed] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, removed);

      // Update order
      newGroups.forEach((g, i) => {
        g.order = i + 1;
      });

      handleSaveConfig({ ...crmConfig, groups: newGroups });
    } else if (type === "field") {
      const sourceGroupId = source.droppableId;
      const destGroupId = destination.droppableId;

      const sourceGroup = crmConfig.groups.find((g) => g.id === sourceGroupId);
      const destGroup = crmConfig.groups.find((g) => g.id === destGroupId);

      if (!sourceGroup || !destGroup) return;

      const sourceFields = Array.from(sourceGroup.fields);
      const [removed] = sourceFields.splice(source.index, 1);

      if (sourceGroupId === destGroupId) {
        sourceFields.splice(destination.index, 0, removed);
        const newConfig = {
          ...crmConfig,
          groups: crmConfig.groups.map((g) =>
            g.id === sourceGroupId ? { ...g, fields: sourceFields } : g
          ),
        };
        handleSaveConfig(newConfig);
      } else {
        const destFields = Array.from(destGroup.fields);
        destFields.splice(destination.index, 0, removed);
        const newConfig = {
          ...crmConfig,
          groups: crmConfig.groups.map((g) => {
            if (g.id === sourceGroupId) return { ...g, fields: sourceFields };
            if (g.id === destGroupId) return { ...g, fields: destFields };
            return g;
          }),
        };
        handleSaveConfig(newConfig);
      }
    }
  };

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Box>
          <Text fw={600} size="lg">
            Configuración de Campos CRM
          </Text>
          <Text c="dimmed" size="sm">
            Personaliza los campos y grupos de la ficha de cliente
          </Text>
        </Box>
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => handleOpenFieldModal()}
          >
            Nuevo Campo
          </Button>
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => handleOpenGroupModal()}
          >
            Nuevo Grupo
          </Button>
        </Group>
      </Group>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="groups" type="group">
          {(provided) => (
            <Stack gap="md" ref={provided.innerRef} {...provided.droppableProps}>
              {crmConfig.groups
                .sort((a, b) => a.order - b.order)
                .map((group, index) => (
                  <Draggable key={group.id} draggableId={group.id} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        padding="md"
                        radius="md"
                        withBorder
                      >
                        <Group justify="space-between" mb="md">
                          <Group gap="xs">
                            <Box {...provided.dragHandleProps} style={{ cursor: "grab" }}>
                              <IconGripVertical size={18} color="var(--mantine-color-gray-5)" />
                            </Box>
                            <Box
                              w={4}
                              h={20}
                              style={{
                                backgroundColor: group.color,
                                borderRadius: 2,
                              }}
                            />
                            <Text fw={600}>{group.name}</Text>
                            <Badge size="xs" variant="light">
                              {group.fields.length} campos
                            </Badge>
                          </Group>
                          <Group gap="xs">
                            <ActionIcon
                              color="gray"
                              variant="subtle"
                              onClick={() => handleOpenGroupModal(group)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>

                        <Droppable droppableId={group.id} type="field">
                          {(provided) => (
                            <Stack
                              gap="xs"
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              style={{ minHeight: 40 }}
                            >
                              {group.fields.map((fieldId, fieldIndex) => {
                                const field = crmConfig.fields[fieldId];
                                if (!field) return null;

                                return (
                                  <Draggable
                                    key={fieldId}
                                    draggableId={fieldId}
                                    index={fieldIndex}
                                  >
                                    {(provided) => (
                                      <Paper
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        p="xs"
                                        withBorder
                                        radius="sm"
                                        style={{
                                          opacity: field.visible ? 1 : 0.5,
                                        }}
                                      >
                                        <Group justify="space-between">
                                          <Group gap="xs">
                                            <Box
                                              {...provided.dragHandleProps}
                                              style={{ cursor: "grab" }}
                                            >
                                              <IconGripVertical
                                                size={14}
                                                color="var(--mantine-color-gray-5)"
                                              />
                                            </Box>
                                            <Text size="sm">{field.label}</Text>
                                            <Badge size="xs" variant="light" color="gray">
                                              {field.type}
                                            </Badge>
                                            {field.required && (
                                              <Badge size="xs" variant="light" color="red">
                                                Requerido
                                              </Badge>
                                            )}
                                            {field.isCustom && (
                                              <Badge size="xs" variant="light" color="blue">
                                                Personalizado
                                              </Badge>
                                            )}
                                          </Group>
                                          <Group gap={4}>
                                            <Tooltip
                                              label={field.visible ? "Ocultar" : "Mostrar"}
                                            >
                                              <ActionIcon
                                                color={field.visible ? "gray" : "orange"}
                                                variant="subtle"
                                                size="sm"
                                                onClick={() => toggleFieldVisibility(fieldId)}
                                              >
                                                {field.visible ? (
                                                  <IconEye size={14} />
                                                ) : (
                                                  <IconEyeOff size={14} />
                                                )}
                                              </ActionIcon>
                                            </Tooltip>
                                            <ActionIcon
                                              color="gray"
                                              variant="subtle"
                                              size="sm"
                                              onClick={() => handleOpenFieldModal(field)}
                                            >
                                              <IconEdit size={14} />
                                            </ActionIcon>
                                            {field.isCustom && (
                                              <ActionIcon
                                                color="red"
                                                variant="subtle"
                                                size="sm"
                                                onClick={() => handleDeleteField(fieldId)}
                                              >
                                                <IconTrash size={14} />
                                              </ActionIcon>
                                            )}
                                          </Group>
                                        </Group>
                                      </Paper>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </Stack>
                          )}
                        </Droppable>
                      </Card>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </Stack>
          )}
        </Droppable>
      </DragDropContext>

      {/* Field Modal */}
      <Modal
        opened={fieldModalOpened}
        onClose={closeFieldModal}
        title={editingField ? "Editar Campo" : "Nuevo Campo"}
      >
        <form onSubmit={fieldForm.onSubmit(handleSaveField)}>
          <Stack>
            <TextInput
              label="Nombre del campo"
              placeholder="Ej: Objetivo de peso"
              required
              {...fieldForm.getInputProps("label")}
            />

            <Select
              label="Tipo de campo"
              data={FIELD_TYPES}
              {...fieldForm.getInputProps("type")}
            />

            {(fieldForm.values.type === "select" ||
              fieldForm.values.type === "multiselect") && (
              <TextInput
                label="Opciones (separadas por coma)"
                placeholder="Opción 1, Opción 2, Opción 3"
                {...fieldForm.getInputProps("options")}
              />
            )}

            <Checkbox
              label="Campo requerido"
              {...fieldForm.getInputProps("required", { type: "checkbox" })}
            />

            <Checkbox
              label="Visible en ficha"
              {...fieldForm.getInputProps("visible", { type: "checkbox" })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeFieldModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingField ? "Guardar" : "Crear Campo"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Group Modal */}
      <Modal
        opened={groupModalOpened}
        onClose={closeGroupModal}
        title={editingGroup ? "Editar Grupo" : "Nuevo Grupo"}
      >
        <form onSubmit={groupForm.onSubmit(handleSaveGroup)}>
          <Stack>
            <TextInput
              label="Nombre del grupo"
              placeholder="Ej: Información Adicional"
              required
              {...groupForm.getInputProps("name")}
            />

            <ColorInput
              label="Color"
              format="hex"
              swatches={[
                "#2D6A4F",
                "#40916C",
                "#F08A5D",
                "#2196F3",
                "#9C27B0",
                "#FF5722",
              ]}
              {...groupForm.getInputProps("color")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeGroupModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingGroup ? "Guardar" : "Crear Grupo"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}

export default CRMFieldsConfig;
