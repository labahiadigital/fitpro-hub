import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Timeline,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconBell,
  IconBolt,
  IconCalendarEvent,
  IconCheck,
  IconClockHour4,
  IconCopy,
  IconCreditCard,
  IconEdit,
  IconGitBranch,
  IconMail,
  IconMessage,
  IconRobot,
  IconSettings,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  useToggleAutomation,
  type Automation as ApiAutomation,
} from "../../hooks/useAutomations";

interface AutomationTrigger {
  type: string;
  config: Record<string, any>;
}

interface AutomationAction {
  id: string;
  type: string;
  config: Record<string, any>;
  delay?: number;
  delayUnit?: "minutes" | "hours" | "days";
}

interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  is_active: boolean;
  last_run?: string;
  run_count: number;
}

const triggerTypes = [
  {
    value: "client_created",
    label: "Nuevo cliente creado",
    icon: IconUser,
    color: "blue",
  },
  {
    value: "booking_created",
    label: "Nueva reserva creada",
    icon: IconCalendarEvent,
    color: "green",
  },
  {
    value: "booking_reminder",
    label: "Recordatorio de reserva",
    icon: IconClockHour4,
    color: "orange",
  },
  {
    value: "payment_received",
    label: "Pago recibido",
    icon: IconCreditCard,
    color: "teal",
  },
  {
    value: "payment_failed",
    label: "Pago fallido",
    icon: IconAlertCircle,
    color: "red",
  },
  {
    value: "subscription_renewal",
    label: "Renovación próxima",
    icon: IconBolt,
    color: "grape",
  },
  {
    value: "client_inactive",
    label: "Cliente inactivo",
    icon: IconClockHour4,
    color: "yellow",
  },
  {
    value: "form_submitted",
    label: "Formulario enviado",
    icon: IconCheck,
    color: "cyan",
  },
];

const actionTypes = [
  { value: "send_email", label: "Enviar email", icon: IconMail, color: "blue" },
  {
    value: "send_notification",
    label: "Enviar notificación",
    icon: IconBell,
    color: "orange",
  },
  {
    value: "send_message",
    label: "Enviar mensaje",
    icon: IconMessage,
    color: "green",
  },
  {
    value: "assign_form",
    label: "Asignar formulario",
    icon: IconCheck,
    color: "teal",
  },
  {
    value: "assign_program",
    label: "Asignar programa",
    icon: IconGitBranch,
    color: "grape",
  },
  {
    value: "create_task",
    label: "Crear tarea",
    icon: IconSettings,
    color: "cyan",
  },
  {
    value: "update_tags",
    label: "Actualizar etiquetas",
    icon: IconUser,
    color: "pink",
  },
];

export function AutomationsPage() {
  // API hooks
  const { data: automationsData = [] } = useAutomations();
  const createAutomation = useCreateAutomation();
  const updateAutomationMutation = useUpdateAutomation();
  const deleteAutomationMutation = useDeleteAutomation();
  const toggleAutomationMutation = useToggleAutomation();
  
  // Map API data to UI format
  const automations: Automation[] = Array.isArray(automationsData) 
    ? automationsData.map((a: ApiAutomation) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        trigger: {
          type: a.trigger_type,
          config: a.trigger_config || {},
        },
        actions: (a.actions || []).map((action: { type: string; config?: Record<string, unknown> }, index: number) => ({
          id: `action-${index}`,
          type: action.type,
          config: action.config || {},
        })),
        is_active: a.is_active,
        last_run: a.stats?.last_run_at,
        run_count: a.stats?.total_runs || 0,
      }))
    : [];
  const [builderOpened, { open: openBuilder, close: closeBuilder }] =
    useDisclosure(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(
    null
  );
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [actions, setActions] = useState<AutomationAction[]>([]);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      trigger_type: "",
      trigger_config: {} as Record<string, any>,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
      trigger_type: (value) => (value ? null : "Selecciona un disparador"),
    },
  });

  const openAutomationBuilder = (automation?: Automation) => {
    if (automation) {
      setEditingAutomation(automation);
      form.setValues({
        name: automation.name,
        description: automation.description || "",
        trigger_type: automation.trigger.type,
        trigger_config: automation.trigger.config,
      });
      setSelectedTrigger(automation.trigger.type);
      setActions(automation.actions);
    } else {
      setEditingAutomation(null);
      form.reset();
      setSelectedTrigger(null);
      setActions([]);
    }
    setActiveStep(0);
    openBuilder();
  };

  const addAction = (type: string) => {
    const newAction: AutomationAction = {
      id: `action-${Date.now()}`,
      type,
      config: {},
    };
    setActions([...actions, newAction]);
  };

  const removeAction = (actionId: string) => {
    setActions(actions.filter((a) => a.id !== actionId));
  };

  const updateAction = (
    actionId: string,
    updates: Partial<AutomationAction>
  ) => {
    setActions(
      actions.map((a) => (a.id === actionId ? { ...a, ...updates } : a))
    );
  };

  const handleSaveAutomation = async () => {
    const values = form.values;
    if (!(values.name && values.trigger_type)) return;

    const automationData = {
      name: values.name,
      description: values.description,
      trigger_type: values.trigger_type,
      trigger_config: values.trigger_config,
      actions: actions.map((a) => ({
        type: a.type as "send_email" | "send_in_app" | "create_task" | "update_tag" | "webhook" | "send_form",
        config: a.config,
      })),
      is_active: editingAutomation?.is_active ?? true,
    };

    try {
      if (editingAutomation) {
        await updateAutomationMutation.mutateAsync({
          id: editingAutomation.id,
          data: automationData,
        });
        notifications.show({
          title: "Automatización actualizada",
          message: "La automatización se ha actualizado correctamente",
          color: "green",
        });
      } else {
        await createAutomation.mutateAsync(automationData);
        notifications.show({
          title: "Automatización creada",
          message: "La automatización se ha creado correctamente",
          color: "green",
        });
      }

      closeBuilder();
      form.reset();
      setActions([]);
      setSelectedTrigger(null);
      setEditingAutomation(null);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudo guardar la automatización",
        color: "red",
      });
    }
  };

  const toggleAutomation = async (automationId: string) => {
    const automation = automations.find((a) => a.id === automationId);
    if (automation) {
      try {
        await toggleAutomationMutation.mutateAsync({
          id: automationId,
          is_active: !automation.is_active,
        });
      } catch (error) {
        notifications.show({
          title: "Error",
          message: "No se pudo actualizar el estado",
          color: "red",
        });
      }
    }
  };

  const deleteAutomation = async (automationId: string) => {
    try {
      await deleteAutomationMutation.mutateAsync(automationId);
      notifications.show({
        title: "Automatización eliminada",
        message: "La automatización se ha eliminado correctamente",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudo eliminar la automatización",
        color: "red",
      });
    }
  };

  const getTriggerInfo = (type: string) =>
    triggerTypes.find((t) => t.value === type);

  const getActionInfo = (type: string) =>
    actionTypes.find((a) => a.value === type);

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Nueva Automatización",
          onClick: () => openAutomationBuilder(),
        }}
        description="Configura workflows automáticos para tu negocio"
        title="Automatizaciones"
      />

      {automations.length > 0 ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {automations.map((automation) => {
            const triggerInfo = getTriggerInfo(automation.trigger.type);
            const TriggerIcon = triggerInfo?.icon || IconBolt;

            return (
              <Card key={automation.id} padding="lg" radius="lg" withBorder>
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <ThemeIcon
                      color={triggerInfo?.color || "gray"}
                      radius="md"
                      size="lg"
                      variant="light"
                    >
                      <TriggerIcon size={18} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={600}>{automation.name}</Text>
                      <Text c="dimmed" size="xs">
                        {triggerInfo?.label}
                      </Text>
                    </Box>
                  </Group>
                  <Switch
                    checked={automation.is_active}
                    color="green"
                    onChange={() => toggleAutomation(automation.id)}
                  />
                </Group>

                {automation.description && (
                  <Text c="dimmed" lineClamp={2} mb="md" size="sm">
                    {automation.description}
                  </Text>
                )}

                <Box mb="md">
                  <Text c="dimmed" mb="xs" size="xs">
                    Acciones ({automation.actions.length})
                  </Text>
                  <Group gap="xs">
                    {automation.actions.slice(0, 4).map((action) => {
                      const actionInfo = getActionInfo(action.type);
                      const ActionIconComponent = actionInfo?.icon || IconBolt;
                      return (
                        <ThemeIcon
                          color={actionInfo?.color || "gray"}
                          key={action.id}
                          radius="md"
                          size="sm"
                          variant="light"
                        >
                          <ActionIconComponent size={12} />
                        </ThemeIcon>
                      );
                    })}
                    {automation.actions.length > 4 && (
                      <Badge size="xs" variant="light">
                        +{automation.actions.length - 4}
                      </Badge>
                    )}
                  </Group>
                </Box>

                <Divider mb="md" />

                <Group justify="space-between">
                  <Group gap="xs">
                    <Badge
                      color={automation.is_active ? "green" : "gray"}
                      size="sm"
                      variant={automation.is_active ? "filled" : "outline"}
                    >
                      {automation.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    <Text c="dimmed" size="xs">
                      {automation.run_count} ejecuciones
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      color="blue"
                      onClick={() => openAutomationBuilder(automation)}
                      variant="light"
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon color="gray" variant="light">
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      onClick={() => deleteAutomation(automation.id)}
                      variant="light"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      ) : (
        <EmptyState
          actionLabel="Crear Automatización"
          description="Crea tu primera automatización para optimizar tu negocio."
          icon={<IconRobot size={40} />}
          onAction={() => openAutomationBuilder()}
          title="No hay automatizaciones"
        />
      )}

      {/* Automation Builder Drawer */}
      <Drawer
        onClose={closeBuilder}
        opened={builderOpened}
        position="right"
        size="xl"
        title={
          editingAutomation ? "Editar Automatización" : "Nueva Automatización"
        }
      >
        <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
          <Stepper active={activeStep} mb="xl" onStepClick={setActiveStep}>
            <Stepper.Step
              description="Nombre y descripción"
              label="Información"
            >
              <Stack mt="md">
                <TextInput
                  label="Nombre de la automatización"
                  placeholder="Ej: Onboarding de nuevos clientes"
                  required
                  {...form.getInputProps("name")}
                />
                <Textarea
                  label="Descripción"
                  minRows={2}
                  placeholder="Describe qué hace esta automatización..."
                  {...form.getInputProps("description")}
                />
              </Stack>
            </Stepper.Step>

            <Stepper.Step description="Cuándo se activa" label="Disparador">
              <Stack mt="md">
                <Text fw={500} mb="xs" size="sm">
                  ¿Cuándo debe activarse esta automatización?
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {triggerTypes.map((trigger) => {
                    const TriggerIcon = trigger.icon;
                    const isSelected = selectedTrigger === trigger.value;
                    return (
                      <Card
                        key={trigger.value}
                        onClick={() => {
                          setSelectedTrigger(trigger.value);
                          form.setFieldValue("trigger_type", trigger.value);
                        }}
                        padding="sm"
                        radius="md"
                        style={{
                          cursor: "pointer",
                          borderColor: isSelected
                            ? `var(--mantine-color-${trigger.color}-5)`
                            : undefined,
                          backgroundColor: isSelected
                            ? `var(--mantine-color-${trigger.color}-0)`
                            : undefined,
                        }}
                        withBorder
                      >
                        <Group gap="sm">
                          <ThemeIcon
                            color={trigger.color}
                            radius="md"
                            size="md"
                            variant={isSelected ? "filled" : "light"}
                          >
                            <TriggerIcon size={16} />
                          </ThemeIcon>
                          <Text fw={isSelected ? 600 : 400} size="sm">
                            {trigger.label}
                          </Text>
                        </Group>
                      </Card>
                    );
                  })}
                </SimpleGrid>

                {selectedTrigger === "booking_reminder" && (
                  <Select
                    data={[
                      { value: "1", label: "1 hora antes" },
                      { value: "2", label: "2 horas antes" },
                      { value: "24", label: "24 horas antes" },
                      { value: "48", label: "48 horas antes" },
                    ]}
                    label="¿Cuánto tiempo antes?"
                    mt="md"
                  />
                )}

                {selectedTrigger === "client_inactive" && (
                  <Select
                    data={[
                      { value: "7", label: "7 días" },
                      { value: "14", label: "14 días" },
                      { value: "30", label: "30 días" },
                      { value: "60", label: "60 días" },
                    ]}
                    label="¿Después de cuántos días?"
                    mt="md"
                  />
                )}
              </Stack>
            </Stepper.Step>

            <Stepper.Step description="Qué hacer" label="Acciones">
              <Stack mt="md">
                <Text fw={500} size="sm">
                  Acciones a ejecutar
                </Text>

                {actions.length > 0 && (
                  <Timeline
                    active={actions.length}
                    bulletSize={24}
                    lineWidth={2}
                  >
                    {actions.map((action, actionIndex) => {
                      const actionInfo = getActionInfo(action.type);
                      const ActionIconComponent = actionInfo?.icon || IconBolt;
                      return (
                        <Timeline.Item
                          bullet={
                            <ThemeIcon
                              color={actionInfo?.color || "gray"}
                              radius="xl"
                              size={24}
                            >
                              <ActionIconComponent size={12} />
                            </ThemeIcon>
                          }
                          key={action.id}
                          title={
                            <Group justify="space-between">
                              <Text fw={500} size="sm">
                                {actionInfo?.label}
                              </Text>
                              <ActionIcon
                                color="red"
                                onClick={() => removeAction(action.id)}
                                size="xs"
                                variant="subtle"
                              >
                                <IconTrash size={12} />
                              </ActionIcon>
                            </Group>
                          }
                        >
                          <Stack gap="xs" mt="xs">
                            {action.type === "send_email" && (
                              <Select
                                data={[
                                  { value: "welcome", label: "Bienvenida" },
                                  {
                                    value: "booking_reminder",
                                    label: "Recordatorio de reserva",
                                  },
                                  {
                                    value: "payment_reminder",
                                    label: "Recordatorio de pago",
                                  },
                                  {
                                    value: "reactivation",
                                    label: "Reactivación",
                                  },
                                ]}
                                onChange={(v) =>
                                  updateAction(action.id, {
                                    config: { ...action.config, template: v },
                                  })
                                }
                                placeholder="Selecciona plantilla"
                                size="xs"
                                value={action.config.template}
                              />
                            )}
                            {action.type === "send_message" && (
                              <Textarea
                                minRows={2}
                                onChange={(e) =>
                                  updateAction(action.id, {
                                    config: {
                                      ...action.config,
                                      message: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Escribe el mensaje..."
                                size="xs"
                                value={action.config.message || ""}
                              />
                            )}
                            {actionIndex > 0 && (
                              <Group gap="xs">
                                <Text c="dimmed" size="xs">
                                  Esperar
                                </Text>
                                <Select
                                  data={[
                                    { value: "0", label: "0" },
                                    { value: "1", label: "1" },
                                    { value: "2", label: "2" },
                                    { value: "5", label: "5" },
                                    { value: "10", label: "10" },
                                    { value: "24", label: "24" },
                                  ]}
                                  onChange={(v) =>
                                    updateAction(action.id, {
                                      delay: Number(v),
                                    })
                                  }
                                  size="xs"
                                  value={String(action.delay || 0)}
                                  w={80}
                                />
                                <Select
                                  data={[
                                    { value: "minutes", label: "minutos" },
                                    { value: "hours", label: "horas" },
                                    { value: "days", label: "días" },
                                  ]}
                                  onChange={(v) =>
                                    updateAction(action.id, {
                                      delayUnit: v as any,
                                    })
                                  }
                                  size="xs"
                                  value={action.delayUnit || "hours"}
                                  w={100}
                                />
                              </Group>
                            )}
                          </Stack>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                )}

                <Divider label="Añadir acción" labelPosition="center" />

                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                  {actionTypes.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        color={action.color}
                        key={action.value}
                        leftSection={<ActionIcon size={16} />}
                        onClick={() => addAction(action.value)}
                        size="sm"
                        variant="light"
                      >
                        {action.label}
                      </Button>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Alert
                color="green"
                icon={<IconCheck />}
                mt="md"
                title="¡Automatización lista!"
              >
                Tu automatización está configurada. Revisa los detalles y
                guárdala.
              </Alert>

              <Paper mt="md" p="md" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      Nombre
                    </Text>
                    <Text fw={500} size="sm">
                      {form.values.name || "-"}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      Disparador
                    </Text>
                    <Text fw={500} size="sm">
                      {getTriggerInfo(form.values.trigger_type)?.label || "-"}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      Acciones
                    </Text>
                    <Text fw={500} size="sm">
                      {actions.length} acciones
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            </Stepper.Completed>
          </Stepper>
        </ScrollArea>

        <Group
          justify="space-between"
          mt="md"
          p="md"
          style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
        >
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            variant="default"
          >
            Anterior
          </Button>
          <Group>
            <Button onClick={closeBuilder} variant="default">
              Cancelar
            </Button>
            {activeStep < 3 ? (
              <Button
                onClick={() => setActiveStep(Math.min(3, activeStep + 1))}
              >
                Siguiente
              </Button>
            ) : (
              <Button color="green" onClick={handleSaveAutomation}>
                {editingAutomation ? "Guardar Cambios" : "Crear Automatización"}
              </Button>
            )}
          </Group>
        </Group>
      </Drawer>
    </Container>
  );
}

export default AutomationsPage;
