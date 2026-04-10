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
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { BottomSheet } from "../../components/common/BottomSheet";
import { useMachines, useCreateMachine, useUpdateMachine, useDeleteMachine, useMachineStats, type MachineData } from "../../hooks/useMachines";
import { useBoxes } from "../../hooks/useBoxes";

function MachineStatCard({ machineId }: { machineId: string }) {
  const { data: stats } = useMachineStats(machineId);
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

export default function MachinesPage() {
  const { data: machines } = useMachines();
  const { data: boxes } = useBoxes();
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editing, setEditing] = useState<MachineData | null>(null);

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
    } else {
      await createMachine.mutateAsync(payload);
    }
    closeModal();
    form.reset();
    setEditing(null);
  };

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title="Maquinaria"
        description="Gestiona el equipamiento técnico y sus reservas"
        action={{ label: "Nueva Máquina", icon: <IconPlus size={16} />, onClick: () => handleOpen() }}
      />

      {!machines || machines.length === 0 ? (
        <EmptyState
          icon={<IconSettings size={24} />}
          title="Sin maquinaria"
          description="Añade tu primer equipo para gestionar reservas de maquinaria"
          actionLabel="Añadir Máquina"
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
                      <Text size="xs" c="dimmed">Fija en: {machine.fixed_box_name}</Text>
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
                  Editar
                </Button>
                <Button size="xs" variant="light" color="red" radius="xl" leftSection={<IconTrash size={14} />}
                  onClick={() => deleteMachine.mutate(machine.id)}
                >
                  Eliminar
                </Button>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      <BottomSheet opened={modalOpened} onClose={closeModal} title={editing ? "Editar Máquina" : "Nueva Máquina"}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput label="Nombre" placeholder="Láser diodo" required {...form.getInputProps("name")} radius="md" />
            <Textarea label="Descripción" placeholder="Características del equipo" {...form.getInputProps("description")} radius="md" />
            <ColorInput label="Color" {...form.getInputProps("color_hex")} radius="md" />
            <Select
              label="Box fijo (opcional)"
              placeholder="Sin box fijo"
              data={boxOptions}
              clearable
              {...form.getInputProps("fixed_box_id")}
              radius="md"
            />
            <Switch label="Activa" {...form.getInputProps("is_active", { type: "checkbox" })} />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeModal} radius="xl">Cancelar</Button>
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
