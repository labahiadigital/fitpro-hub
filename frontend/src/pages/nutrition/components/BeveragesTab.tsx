import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useBeverages, useCreateBeverage, useDeleteBeverage } from "../../../hooks/useSupabaseData";
import { BottomSheet } from "../../../components/common/BottomSheet";
import { RectificationButton } from "../../../components/common/RectificationButton";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";

const BEVERAGE_CATEGORIES = [
  { value: "", label: "Todas las categorías" },
  { value: "Aguas e Infusiones", label: "Aguas e Infusiones" },
  { value: "Café", label: "Café" },
  { value: "Té e Infusiones", label: "Té e Infusiones" },
  { value: "Lácteos", label: "Lácteos" },
  { value: "Lácteos / Fermentados", label: "Lácteos / Fermentados" },
  { value: "Lácteos / Dulces", label: "Lácteos / Dulces" },
  { value: "Bebidas Vegetales", label: "Bebidas Vegetales" },
  { value: "Zumos de Fruta", label: "Zumos de Fruta" },
  { value: "Refrescos", label: "Refrescos" },
  { value: "Bebidas Light / Zero", label: "Bebidas Light / Zero" },
  { value: "Bebidas Energéticas", label: "Bebidas Energéticas" },
  { value: "Bebidas Isotónicas", label: "Bebidas Isotónicas" },
  { value: "Suplementos Deportivos", label: "Suplementos Deportivos" },
  { value: "Bebidas de Cacao", label: "Bebidas de Cacao" },
  { value: "Bebidas Tradicionales", label: "Bebidas Tradicionales" },
  { value: "Fermentados", label: "Fermentados" },
  { value: "Bebidas Alcohólicas", label: "Bebidas Alcohólicas" },
];

export function BeveragesTab() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const { data: beverages = [], isLoading } = useBeverages(search || undefined, categoryFilter || undefined);
  const createBeverage = useCreateBeverage();
  const deleteBeverage = useDeleteBeverage();
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [viewingBeverage, setViewingBeverage] = useState<any>(null);
  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] = useDisclosure(false);

  const form = useForm({
    initialValues: {
      name: "",
      category: "",
      serving_size_ml: 250,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    },
  });

  const handleCreate = (values: typeof form.values) => {
    createBeverage.mutate(
      { ...values, reference_ml: 100 },
      {
        onSuccess: () => {
          closeCreateModal();
          form.reset();
        },
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    modals.openConfirmModal({
      title: "Eliminar bebida",
      children: <Text size="sm">¿Estás seguro de que quieres eliminar "{name}"?</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteBeverage.mutate(id),
    });
  };

  return (
    <Stack gap="md">
      <Group gap="sm" wrap="wrap">
        <Button leftSection={<IconPlus size={14} />} size="xs" variant="light" onClick={openCreateModal}>
          Nueva Bebida
        </Button>
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder="Buscar bebidas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="xs"
          radius="md"
          style={{ flex: 1, minWidth: 180 }}
        />
        <Select
          data={BEVERAGE_CATEGORIES}
          value={categoryFilter}
          onChange={(v) => setCategoryFilter(v || "")}
          placeholder="Categoría"
          size="xs"
          radius="md"
          w={200}
          clearable
        />
      </Group>

      {isLoading ? (
        <Center py="xl"><Text c="dimmed">Cargando bebidas...</Text></Center>
      ) : beverages.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md">
          {beverages.map((bev: any) => (
            <Box
              key={bev.id}
              p="sm"
              style={{
                border: "1px solid var(--mantine-color-gray-2)",
                borderRadius: 12,
                background: "var(--mantine-color-body)",
              }}
            >
              <Text fw={600} size="sm" lineClamp={2} style={{ wordBreak: "break-word" }} title={bev.name} mb={2}>{bev.name}</Text>
              {bev.is_global && <Badge color="gray" variant="light" size="xs" mb={4}>Sistema</Badge>}
              <Group gap={4} mb={6}>
                {bev.category && <Badge size="xs" variant="light" color="cyan">{bev.category}</Badge>}
                {bev.serving_size_ml && Number(bev.serving_size_ml) !== 100 && (
                  <Badge size="xs" variant="light" color="gray">{Math.round(Number(bev.serving_size_ml))} ml/ración</Badge>
                )}
              </Group>
              <Group gap={4} mb={6}>
                <Badge size="xs" variant="light" color="gray">100 ml</Badge>
                <Badge size="xs" variant="light" color="blue">{Math.round(Number(bev.calories || 0))} kcal</Badge>
                <Badge size="xs" variant="light" color="green">P:{Math.round(Number(bev.protein || 0))}g</Badge>
                <Badge size="xs" variant="light" color="orange">C:{Math.round(Number(bev.carbs || 0))}g</Badge>
                <Badge size="xs" variant="light" color="grape">G:{Math.round(Number(bev.fat || 0))}g</Badge>
              </Group>
              <Group justify="flex-end" gap={4}>
                <Tooltip label="Ver detalle">
                  <ActionIcon
                    color="gray"
                    size="sm"
                    variant="subtle"
                    radius="md"
                    onClick={() => { setViewingBeverage(bev); openViewModal(); }}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                </Tooltip>
                {!bev.is_global && (
                  <Tooltip label="Eliminar">
                    <ActionIcon color="red" size="sm" variant="subtle" radius="md" onClick={() => handleDelete(bev.id, bev.name)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <RectificationButton entityType="beverage" entityId={bev.id} entityName={bev.name} size="sm" />
              </Group>
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <Center py="xl"><Text c="dimmed">No se encontraron bebidas</Text></Center>
      )}

      <BottomSheet opened={createModalOpened} onClose={closeCreateModal} title="Nueva Bebida" size="md">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <TextInput label="Nombre" placeholder="Agua mineral, Café con leche..." required {...form.getInputProps("name")} />
            <Select
              data={BEVERAGE_CATEGORIES.filter((c) => c.value !== "")}
              label="Categoría"
              placeholder="Selecciona"
              {...form.getInputProps("category")}
            />
            <NumberInput label="Ración sugerida (ml)" min={0} placeholder="250" {...form.getInputProps("serving_size_ml")} />
            <Text size="xs" c="dimmed" fw={500}>Los valores nutricionales se introducen por cada 100 ml</Text>
            <NumberInput label="Calorías (por 100ml)" min={0} placeholder="0" {...form.getInputProps("calories")} />
            <Group grow>
              <NumberInput label="Proteína (g)" min={0} decimalScale={1} placeholder="0" {...form.getInputProps("protein")} />
              <NumberInput label="Carbohidratos (g)" min={0} decimalScale={1} placeholder="0" {...form.getInputProps("carbs")} />
              <NumberInput label="Grasas (g)" min={0} decimalScale={1} placeholder="0" {...form.getInputProps("fat")} />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button onClick={closeCreateModal} variant="default">Cancelar</Button>
              <Button type="submit" loading={createBeverage.isPending}>Crear Bebida</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      <BottomSheet opened={viewModalOpened} onClose={closeViewModal} title={viewingBeverage?.name || "Detalle"} size="sm">
        {viewingBeverage && (
          <Stack gap="sm">
            {viewingBeverage.category && (
              <Badge variant="light" color="cyan" size="md">{viewingBeverage.category}</Badge>
            )}
            <Text size="sm">
              Ración sugerida: <strong>{Math.round(Number(viewingBeverage.serving_size_ml || 250))} ml</strong>
            </Text>
            <Text size="sm" fw={500}>Valores nutricionales por 100 ml:</Text>
            <Group gap="sm">
              <Badge color="blue" variant="light">
                {Math.round(Number(viewingBeverage.calories || 0))} kcal
              </Badge>
              <Badge color="green" variant="light">
                P: {Math.round(Number(viewingBeverage.protein || 0))}g
              </Badge>
              <Badge color="orange" variant="light">
                C: {Math.round(Number(viewingBeverage.carbs || 0))}g
              </Badge>
              <Badge color="grape" variant="light">
                G: {Math.round(Number(viewingBeverage.fat || 0))}g
              </Badge>
            </Group>
          </Stack>
        )}
      </BottomSheet>
    </Stack>
  );
}
