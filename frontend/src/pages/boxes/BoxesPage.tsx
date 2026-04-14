import {
  Badge,
  Box,
  Button,
  ColorInput,
  Container,
  Group,
  NumberInput,
  Paper,
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
  IconBuilding,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { Divider } from "@mantine/core";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { BottomSheet } from "../../components/common/BottomSheet";
import { useBoxes, useCreateBox, useUpdateBox, useDeleteBox, useBoxStats, type BoxData } from "../../hooks/useBoxes";
import { useBoxSchedule, useUpdateBoxSchedule, defaultWeekSlots, type ScheduleSlot } from "../../hooks/useSchedules";
import { WeeklyScheduleGrid } from "../../components/common/WeeklyScheduleGrid";

function BoxStatCard({ boxId }: { boxId: string }) {
  const { data: stats } = useBoxStats(boxId);
  if (!stats) return null;
  return (
    <Group gap="lg" mt="xs">
      <Box>
        <Text size="xl" fw={700} c="blue">{stats.today}</Text>
        <Text size="xs" c="dimmed">Hoy</Text>
      </Box>
      <Box>
        <Text size="xl" fw={700} c="green">{stats.upcoming}</Text>
        <Text size="xs" c="dimmed">Próximas</Text>
      </Box>
      <Box>
        <Text size="xl" fw={700}>{stats.total}</Text>
        <Text size="xs" c="dimmed">Total</Text>
      </Box>
      <Box>
        <Text size="xl" fw={700} c="red">{stats.cancel_rate}%</Text>
        <Text size="xs" c="dimmed">Cancelación</Text>
      </Box>
    </Group>
  );
}

export default function BoxesPage() {
  const { data: boxes } = useBoxes();
  const createBox = useCreateBox();
  const updateBox = useUpdateBox();
  const deleteBox = useDeleteBox();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingBox, setEditingBox] = useState<BoxData | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>(defaultWeekSlots());
  const { data: boxScheduleData } = useBoxSchedule(editingBox?.id);
  const updateBoxSchedule = useUpdateBoxSchedule();

  useEffect(() => {
    if (boxScheduleData && boxScheduleData.length > 0) {
      setScheduleSlots(boxScheduleData);
    } else {
      setScheduleSlots(defaultWeekSlots());
    }
  }, [boxScheduleData, editingBox?.id]);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      color_hex: "#3B82F6",
      is_active: true,
      sort_order: 0,
    },
  });

  const handleOpen = (box?: BoxData) => {
    if (box) {
      setEditingBox(box);
      form.setValues({
        name: box.name,
        description: box.description || "",
        color_hex: box.color_hex,
        is_active: box.is_active,
        sort_order: box.sort_order,
      });
    } else {
      setEditingBox(null);
      form.reset();
    }
    openModal();
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (editingBox) {
      await updateBox.mutateAsync({ id: editingBox.id, data: values });
      updateBoxSchedule.mutate({ boxId: editingBox.id, slots: scheduleSlots });
    } else {
      const created = await createBox.mutateAsync(values);
      const createdId = (created as unknown as { id?: string })?.id || (created as unknown as { data?: { id?: string } })?.data?.id;
      if (createdId) {
        updateBoxSchedule.mutate({ boxId: createdId, slots: scheduleSlots });
      }
    }
    closeModal();
    form.reset();
    setEditingBox(null);
  };

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title="Boxes / Consultas"
        description="Gestiona los espacios físicos donde se realizan los servicios"
        action={{ label: "Nuevo Box", icon: <IconPlus size={16} />, onClick: () => handleOpen() }}
      />

      {!boxes || boxes.length === 0 ? (
        <EmptyState
          icon={<IconBuilding size={24} />}
          title="Sin boxes"
          description="Crea tu primer espacio para empezar a gestionar reservas"
          actionLabel="Crear Box"
          onAction={() => handleOpen()}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {boxes.map((box) => (
            <Paper key={box.id} shadow="xs" radius="lg" p="lg" withBorder>
              <Group justify="space-between" mb="sm">
                <Group gap="sm">
                  <ThemeIcon size="lg" radius="xl" color={box.color_hex} variant="light">
                    <IconBuilding size={18} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">{box.name}</Text>
                    {box.description && <Text size="xs" c="dimmed" lineClamp={1}>{box.description}</Text>}
                  </div>
                </Group>
                <Group gap={4}>
                  <Badge color={box.is_active ? "green" : "gray"} size="xs" variant="light">
                    {box.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </Group>
              </Group>
              <BoxStatCard boxId={box.id} />
              <Group mt="md" gap="xs">
                <Button size="xs" variant="light" radius="xl" leftSection={<IconEdit size={14} />} onClick={() => handleOpen(box)}>
                  Editar
                </Button>
                <Button size="xs" variant="light" color="red" radius="xl" leftSection={<IconTrash size={14} />}
                  onClick={() => deleteBox.mutate(box.id)}
                >
                  Eliminar
                </Button>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      <BottomSheet opened={modalOpened} onClose={closeModal} title={editingBox ? "Editar Box" : "Nuevo Box"}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput label="Nombre" placeholder="Consulta 1" required {...form.getInputProps("name")} radius="md" />
            <Textarea label="Descripción" placeholder="Descripción del espacio" {...form.getInputProps("description")} radius="md" />
            <ColorInput label="Color" {...form.getInputProps("color_hex")} radius="md" />
            <NumberInput label="Orden" {...form.getInputProps("sort_order")} radius="md" />
            <Switch label="Activo" {...form.getInputProps("is_active", { type: "checkbox" })} />
            <Divider label="Horario de disponibilidad" labelPosition="center" />
            <WeeklyScheduleGrid slots={scheduleSlots} onChange={setScheduleSlots} compact />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeModal} radius="xl">Cancelar</Button>
              <Button type="submit" radius="xl" loading={createBox.isPending || updateBox.isPending}>
                {editingBox ? "Guardar" : "Crear"}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}
