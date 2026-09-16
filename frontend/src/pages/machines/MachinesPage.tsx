import {
  Badge,
  Box,
  Button,
  ColorInput,
  Container,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconEdit,
  IconPlus,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { Divider } from "@mantine/core";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { BottomSheet } from "../../components/common/BottomSheet";
import { useMachines, useCreateMachine, useUpdateMachine, useDeleteMachine, useMachineStats, type MachineData } from "../../hooks/useMachines";
import { useBoxes } from "../../hooks/useBoxes";
import { useMachineSchedule, useUpdateMachineSchedule, defaultWeekSlots, type ScheduleSlot } from "../../hooks/useSchedules";
import { WeeklyScheduleGrid } from "../../components/common/WeeklyScheduleGrid";
import { useTranslation } from "react-i18next";

function MachineStatCard({ machineId }: { machineId: string }) {
  const { data: stats } = useMachineStats(machineId);
  if (!stats) return null;
  return (
    <Group gap="lg" mt="xs">
      <Box>
        <Text size="xl" fw={700} c="blue">{stats.today}</Text>
        <Text size="xs" c="dimmed">{"Hoy"}</Text>
      </Box>
      <Box>
        <Text size="xl" fw={700} c="green">{stats.upcoming}</Text>
        <Text size="xs" c="dimmed">{"Próximas"}</Text>
      </Box>
      <Box>
        <Text size="xl" fw={700}>{stats.total}</Text>
        <Text size="xs" c="dimmed">{"Total"}</Text>
      </Box>
      <Box>
        <Text size="xl" fw={700} c="red">{stats.cancel_rate}%</Text>
        <Text size="xs" c="dimmed">{"Cancelación"}</Text>
      </Box>
    </Group>
  );
}

export default function MachinesPage() {
  const { t } = useTranslation();
  const { data: machines } = useMachines();
  const { data: boxes } = useBoxes();
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editing, setEditing] = useState<MachineData | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>(defaultWeekSlots());
  const { data: machineScheduleData } = useMachineSchedule(editing?.id);
  const updateMachineSchedule = useUpdateMachineSchedule();

  useEffect(() => {
    if (machineScheduleData && machineScheduleData.length > 0) {
      setScheduleSlots(machineScheduleData);
    } else {
      setScheduleSlots(defaultWeekSlots());
    }
  }, [machineScheduleData, editing?.id]);

  const boxOptions = (boxes || []).map((b) => ({ value: b.id, label: b.name }));

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      color_hex: "#8B5CF6",
      is_active: true,
      fixed_box_id: "" as string,
    },
  });

  const handleOpen = (machine?: MachineData) => {
    if (machine) {
      setEditing(machine);
      form.setValues({
        name: machine.name,
        description: machine.description || "",
        color_hex: machine.color_hex,
        is_active: machine.is_active,
        fixed_box_id: machine.fixed_box_id || "",
      });
    } else {
      setEditing(null);
      form.reset();
    }
    openModal();
  };

  const handleSubmit = async (values: typeof form.values) => {
    const payload = { ...values, fixed_box_id: values.fixed_box_id || undefined };
    if (editing) {
      await updateMachine.mutateAsync({ id: editing.id, data: payload });
      updateMachineSchedule.mutate({ machineId: editing.id, slots: scheduleSlots });
    } else {
      const created = await createMachine.mutateAsync(payload);
      const createdId = (created as unknown as { id?: string })?.id || (created as unknown as { data?: { id?: string } })?.data?.id;
      if (createdId) {
        updateMachineSchedule.mutate({ machineId: createdId, slots: scheduleSlots });
      }
    }
    closeModal();
    form.reset();
    setEditing(null);
  };

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title={t("machines.maquinaria")}
        description={t("machines.gestionaElEquipamientoTecnicoY")}
        action={{ label: t("machines.nuevaMaquina"), icon: <IconPlus size={16} />, onClick: () => handleOpen() }}
      />

      {!machines || machines.length === 0 ? (
        <EmptyState
          icon={<IconSettings size={24} />}
          title={t("machines.sinMaquinaria")}
          description={t("machines.anadeTuPrimerEquipoPara")}
          actionLabel={t("machines.anadirMaquina")}
          onAction={() => handleOpen()}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {machines.map((machine) => (
            <Paper key={machine.id} shadow="xs" radius="lg" p="lg" withBorder>
              <Group justify="space-between" mb="sm">
                <Group gap="sm">
                  <ThemeIcon size="lg" radius="xl" color={machine.color_hex} variant="light">
                    <IconSettings size={18} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">{machine.name}</Text>
                    {machine.fixed_box_name && (
                      <Text size="xs" c="dimmed">{t("machines.fijaEn", { name: machine.fixed_box_name })}</Text>
                    )}
                  </div>
                </Group>
                <Badge color={machine.is_active ? "green" : "gray"} size="xs" variant="light">
                  {machine.is_active ? "Activa" : "Inactiva"}
                </Badge>
              </Group>
              <MachineStatCard machineId={machine.id} />
              <Group mt="md" gap="xs">
                <Button size="xs" variant="light" radius="xl" leftSection={<IconEdit size={14} />} onClick={() => handleOpen(machine)}>
                  {t("machines.editar")}
                </Button>
                <Button size="xs" variant="light" color="red" radius="xl" leftSection={<IconTrash size={14} />}
                  onClick={() => deleteMachine.mutate(machine.id)}
                >
                  {t("machines.eliminar")}
                </Button>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      <BottomSheet opened={modalOpened} onClose={closeModal} title={editing ? "Editar Máquina" : "Nueva Máquina"}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput label={t("machines.nombre")} placeholder={t("machines.laserDiodo")} required {...form.getInputProps("name")} radius="md" />
            <Textarea label={t("machines.descripcion")} placeholder={t("machines.caracteristicasDelEquipo")} {...form.getInputProps("description")} radius="md" />
            <ColorInput label={t("machines.color")} {...form.getInputProps("color_hex")} radius="md" />
            <Select
              label={t("machines.boxFijoOpcional")}
              placeholder={t("machines.sinBoxFijo")}
              data={boxOptions}
              clearable
              {...form.getInputProps("fixed_box_id")}
              radius="md"
            />
            <Switch label={t("machines.activa")} {...form.getInputProps("is_active", { type: "checkbox" })} />
            <Divider label={t("machines.horarioDeDisponibilidad")} labelPosition="center" />
            <WeeklyScheduleGrid slots={scheduleSlots} onChange={setScheduleSlots} compact />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeModal} radius="xl">{t("machines.cancelar")}</Button>
              <Button type="submit" radius="xl" loading={createMachine.isPending || updateMachine.isPending}>
                {editing ? "Guardar" : "Crear"}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}
