import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconArrowDown,
  IconArrowUp,
  IconBox,
  IconDownload,
  IconEdit,
  IconLink,
  IconPackage,
  IconPlus,
  IconSearch,
  IconSwitch,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  type StockItem,
  useStockItems,
  useStockCategories,
  useStockSummary,
  useCreateStockItem,
  useUpdateStockItem,
  useDeleteStockItem,
  useRegisterMovement,
  useCreateStockCategory,
  useItemMovements,
  useLinkedProducts,
  useExportStock,
} from "../../hooks/useStock";
import { useBoxes } from "../../hooks/useBoxes";
import { useSuppliers } from "../../hooks/useSuppliers";

const UNITS = [
  { value: "ud", label: "Unidades" },
  { value: "caja", label: "Cajas" },
  { value: "pack", label: "Packs" },
  { value: "kg", label: "Kilogramos" },
  { value: "g", label: "Gramos" },
  { value: "mg", label: "Miligramos" },
  { value: "L", label: "Litros" },
  { value: "ml", label: "Mililitros" },
  { value: "cl", label: "Centilitros" },
  { value: "m", label: "Metros" },
  { value: "cm", label: "Centímetros" },
];

function getStatusBadge(item: StockItem) {
  if (item.current_stock <= item.min_stock) return <Badge color="red" variant="light" size="sm">Stock bajo</Badge>;
  if (item.max_stock > 0 && item.current_stock >= item.max_stock) return <Badge color="blue" variant="light" size="sm">Stock alto</Badge>;
  return <Badge color="green" variant="light" size="sm">Normal</Badge>;
}

export function StockPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [itemModalOpened, { open: openItemModal, close: closeItemModal }] = useDisclosure(false);
  const [movementModalOpened, { open: openMovementModal, close: closeMovementModal }] = useDisclosure(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [movementItem, setMovementItem] = useState<StockItem | null>(null);

  const [detailItem, setDetailItem] = useState<StockItem | null>(null);
  const [detailModalOpened, { open: openDetailModal, close: closeDetailModal }] = useDisclosure(false);

  const { data: items = [], isLoading } = useStockItems(debouncedSearch, categoryFilter || undefined, lowStockOnly);
  const { data: categories = [] } = useStockCategories();
  const { data: summary } = useStockSummary();
  const { data: movements = [] } = useItemMovements(movementItem?.id);
  const { data: linkedProducts = [] } = useLinkedProducts(detailItem?.id);
  const { exportToExcel } = useExportStock();
  const createItem = useCreateStockItem();
  const updateItem = useUpdateStockItem();
  const deleteItem = useDeleteStockItem();
  const registerMovement = useRegisterMovement();
  const createCategory = useCreateStockCategory();

  const handleOpenDetail = (item: StockItem) => {
    setDetailItem(item);
    openDetailModal();
  };

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const { data: boxesData } = useBoxes();
  const boxOptions = useMemo(
    () => (boxesData ?? []).map((b: any) => ({ value: b.id, label: b.name })),
    [boxesData]
  );

  const { data: suppliersData } = useSuppliers({ is_active: true });
  const supplierOptions = useMemo(
    () => (suppliersData ?? []).map((s: any) => ({ value: s.id, label: s.legal_name })),
    [suppliersData]
  );

  const itemForm = useForm({
    initialValues: {
      name: "",
      category_id: null as string | null,
      description: "",
      unit: "ud",
      current_stock: 0,
      min_stock: 0,
      max_stock: 0,
      price: 0,
      location: "",
      tax_rate: 21,
      irpf_rate: 0,
      box_id: null as string | null,
      supplier_id: null as string | null,
    },
    validate: {
      name: (v) => (v.trim() ? null : "El nombre es obligatorio"),
    },
  });

  const movementForm = useForm({
    initialValues: {
      movement_type: "entry" as string,
      quantity: 0,
      reason: "",
    },
    validate: {
      quantity: (v) => (v > 0 ? null : "Cantidad debe ser mayor a 0"),
      reason: (v) => (v.trim() ? null : "El motivo es obligatorio"),
    },
  });

  const [newCatName, setNewCatName] = useState("");

  const handleOpenCreate = () => {
    setEditMode(false);
    setSelectedItem(null);
    itemForm.reset();
    openItemModal();
  };

  const handleOpenEdit = (item: StockItem) => {
    setEditMode(true);
    setSelectedItem(item);
    itemForm.setValues({
      name: item.name,
      category_id: item.category_id || null,
      description: item.description || "",
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      price: item.price,
      location: item.location || "",
      tax_rate: item.tax_rate,
      irpf_rate: item.irpf_rate,
      box_id: item.box_id || null,
      supplier_id: item.supplier_id || null,
    });
    openItemModal();
  };

  const handleOpenMovement = (item: StockItem) => {
    setMovementItem(item);
    movementForm.reset();
    openMovementModal();
  };

  const handleDelete = (item: StockItem) => {
    modals.openConfirmModal({
      title: "Eliminar elemento",
      children: <Text size="sm">¿Estás seguro de que deseas eliminar "{item.name}"?</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteItem.mutate(item.id),
    });
  };

  const handleItemSubmit = itemForm.onSubmit((values) => {
    const payload = {
      ...values,
      category_id: values.category_id || undefined,
      box_id: values.box_id || null,
      supplier_id: values.supplier_id || null,
    };
    if (editMode && selectedItem) {
      updateItem.mutate(
        { id: selectedItem.id, ...payload },
        { onSuccess: () => { closeItemModal(); } }
      );
    } else {
      createItem.mutate(
        payload,
        { onSuccess: () => { closeItemModal(); itemForm.reset(); } }
      );
    }
  });

  const handleMovementSubmit = movementForm.onSubmit((values) => {
    if (!movementItem) return;
    registerMovement.mutate(
      { itemId: movementItem.id, ...values },
      { onSuccess: () => { closeMovementModal(); } }
    );
  });

  return (
    <Container size="xl" px={{ base: "sm", sm: "md" }}>
      <PageHeader title="Gestión de Stock" subtitle="Inventario y movimientos" />

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size="lg" color="blue" variant="light" radius="md"><IconPackage size={20} /></ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">Total Elementos</Text>
              <Text size="xl" fw={700}>{summary?.total_items ?? 0}</Text>
            </Box>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size="lg" color="orange" variant="light" radius="md"><IconArrowDown size={20} /></ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">Stock Bajo</Text>
              <Text size="xl" fw={700} c="orange">{summary?.low_stock_count ?? 0}</Text>
            </Box>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size="lg" color="green" variant="light" radius="md"><IconTrendingUp size={20} /></ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">Valor Total</Text>
              <Text size="xl" fw={700}>{(summary?.total_value ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</Text>
            </Box>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size="lg" color="violet" variant="light" radius="md"><IconSwitch size={20} /></ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">Movimientos Hoy</Text>
              <Text size="xl" fw={700}>{summary?.movements_today ?? 0}</Text>
            </Box>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Filters */}
      <Group mb="md" gap="sm">
        <TextInput
          leftSection={<IconSearch size={14} />}
          placeholder="Buscar elementos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
          radius="md"
          size="sm"
        />
        <Select
          placeholder="Categoría"
          data={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
          clearable
          size="sm"
          radius="md"
          w={180}
        />
        <Switch
          label="Solo stock bajo"
          checked={lowStockOnly}
          onChange={(e) => setLowStockOnly(e.currentTarget.checked)}
          size="sm"
        />
        <Button leftSection={<IconPlus size={14} />} onClick={handleOpenCreate} radius="md" size="sm">
          Añadir Elemento
        </Button>
        <Tooltip label="Exportar a Excel">
          <Button leftSection={<IconDownload size={14} />} variant="light" color="green" radius="md" size="sm" onClick={exportToExcel}>
            Exportar
          </Button>
        </Tooltip>
      </Group>

      {/* Items Table */}
      {isLoading ? (
        <Center py="xl"><Loader /></Center>
      ) : items.length > 0 ? (
        <Card padding={0} radius="md" withBorder style={{ overflow: "hidden" }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Elemento</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Stock</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Precio</Table.Th>
                <Table.Th>Ubicación</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Text size="sm" fw={500} style={{ cursor: "pointer" }} c="blue" onClick={() => handleOpenDetail(item)}>{item.name}</Text>
                    {item.description && <Text size="xs" c="dimmed" lineClamp={1}>{item.description}</Text>}
                  </Table.Td>
                  <Table.Td>
                    {item.category_name ? (
                      <Badge variant="light" size="sm">{item.category_name}</Badge>
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="sm" fw={600}>{item.current_stock} {item.unit}</Text>
                    <Text size="xs" c="dimmed">min: {item.min_stock} / max: {item.max_stock}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="sm">{item.price.toFixed(2)} €</Text>
                    <Text size="xs" c="dimmed">{(item.current_stock * item.price).toFixed(2)} € total</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{item.location || "—"}</Text>
                  </Table.Td>
                  <Table.Td>{getStatusBadge(item)}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Tooltip label="Registrar movimiento">
                        <ActionIcon color="blue" variant="subtle" size="sm" onClick={() => handleOpenMovement(item)}>
                          <IconArrowUp size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Editar">
                        <ActionIcon color="gray" variant="subtle" size="sm" onClick={() => handleOpenEdit(item)}>
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar">
                        <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleDelete(item)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      ) : (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <ThemeIcon size={48} color="gray" variant="light" radius="xl"><IconBox size={28} /></ThemeIcon>
            <Title order={4}>Sin elementos</Title>
            <Text c="dimmed" size="sm">Añade elementos a tu inventario para comenzar</Text>
            <Button leftSection={<IconPlus size={14} />} onClick={handleOpenCreate}>Añadir Elemento</Button>
          </Stack>
        </Center>
      )}

      {/* Add/Edit Item Modal */}
      <Modal
        opened={itemModalOpened}
        onClose={closeItemModal}
        title={editMode ? "Editar Elemento" : "Añadir Elemento"}
        size="lg"
        radius="lg"
      >
        <form onSubmit={handleItemSubmit}>
          <Stack>
            <TextInput label="Nombre" placeholder="Nombre del elemento" required {...itemForm.getInputProps("name")} />
            <Group grow>
              <Select
                label="Categoría"
                placeholder="Seleccionar"
                data={categoryOptions}
                clearable
                searchable
                {...itemForm.getInputProps("category_id")}
              />
              <Select label="Unidad" data={UNITS} {...itemForm.getInputProps("unit")} />
            </Group>
            <Group>
              <TextInput
                label="Nueva categoría"
                placeholder="Nombre"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                variant="light"
                mt={24}
                disabled={!newCatName.trim()}
                loading={createCategory.isPending}
                onClick={() => {
                  createCategory.mutate({ name: newCatName }, {
                    onSuccess: () => setNewCatName(""),
                  });
                }}
              >
                Crear
              </Button>
            </Group>
            <Textarea label="Descripción" placeholder="Descripción opcional" autosize minRows={2} {...itemForm.getInputProps("description")} />
            <Group grow>
              <NumberInput label="Stock Actual" min={0} {...itemForm.getInputProps("current_stock")} />
              <NumberInput label="Stock Mínimo" min={0} {...itemForm.getInputProps("min_stock")} />
              <NumberInput label="Stock Máximo" min={0} {...itemForm.getInputProps("max_stock")} />
            </Group>
            <Group grow>
              <NumberInput label="Precio unitario (€)" min={0} decimalScale={2} {...itemForm.getInputProps("price")} />
              <NumberInput label="IVA (%)" min={0} max={100} {...itemForm.getInputProps("tax_rate")} />
              <NumberInput label="IRPF (%)" min={0} max={100} {...itemForm.getInputProps("irpf_rate")} />
            </Group>
            <TextInput label="Ubicación" placeholder="Almacén, estantería..." {...itemForm.getInputProps("location")} />
            <Select
              label="Box"
              placeholder="Selecciona un box"
              description="Asigna este stock a uno de tus boxes"
              data={boxOptions}
              searchable
              clearable
              nothingFoundMessage="No hay boxes creados"
              value={itemForm.values.box_id}
              onChange={(val) => itemForm.setFieldValue("box_id", val)}
            />
            <Select
              label="Proveedor"
              placeholder="Selecciona un proveedor"
              description="Asocia este artículo al proveedor que lo suministra"
              data={supplierOptions}
              searchable
              clearable
              nothingFoundMessage="No hay proveedores activos"
              value={itemForm.values.supplier_id}
              onChange={(val) => itemForm.setFieldValue("supplier_id", val)}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeItemModal}>Cancelar</Button>
              <Button type="submit" loading={createItem.isPending || updateItem.isPending}>
                {editMode ? "Guardar cambios" : "Crear Elemento"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Stock Detail / Linked Products Modal */}
      <Modal
        opened={detailModalOpened}
        onClose={closeDetailModal}
        title={detailItem?.name || "Detalle de stock"}
        size="md"
        radius="lg"
      >
        {detailItem && (
          <Stack>
            <Paper p="sm" radius="md" bg="var(--mantine-color-blue-light)">
              <Group justify="space-between">
                <Text fw={600}>{detailItem.name}</Text>
                <Badge size="lg" variant="filled">Stock: {detailItem.current_stock} {detailItem.unit}</Badge>
              </Group>
            </Paper>

            {detailItem.description && <Text size="sm" c="dimmed">{detailItem.description}</Text>}

            <Group grow>
              <Paper p="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">Precio unitario</Text>
                <Text fw={600}>{detailItem.price.toFixed(2)} €</Text>
              </Paper>
              <Paper p="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">Valor total</Text>
                <Text fw={600}>{(detailItem.current_stock * detailItem.price).toFixed(2)} €</Text>
              </Paper>
              <Paper p="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">Ubicación</Text>
                <Text fw={600}>{detailItem.location || "—"}</Text>
              </Paper>
            </Group>

            <Divider label="Productos / Servicios vinculados" labelPosition="center" />

            {linkedProducts.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                Este elemento de stock no está vinculado a ningún producto o servicio.
              </Text>
            ) : (
              <Table striped withTableBorder style={{ fontSize: 13 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Tipo</Table.Th>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Uds. por venta</Table.Th>
                    <Table.Th>Impacto</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {linkedProducts.map((lp) => (
                    <Table.Tr key={`${lp.type}-${lp.id}`}>
                      <Table.Td>
                        <Badge size="xs" color={lp.type === "product" ? "blue" : "green"} variant="light">
                          {lp.type === "product" ? "Producto" : "Servicio"}
                        </Badge>
                      </Table.Td>
                      <Table.Td><Text size="sm" fw={500}>{lp.name}</Text></Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text size="sm" fw={600}>{lp.quantity_per_sale} {detailItem.unit}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" color="orange" variant="light">
                          <IconLink size={10} /> Reduce stock
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDetailModal}>Cerrar</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Register Movement Modal */}
      <Modal
        opened={movementModalOpened}
        onClose={closeMovementModal}
        title="Registrar Movimiento"
        size="md"
        radius="lg"
      >
        {movementItem && (
          <form onSubmit={handleMovementSubmit}>
            <Stack>
              <Paper p="sm" radius="md" bg="var(--mantine-color-blue-light)">
                <Group justify="space-between">
                  <Text fw={600}>{movementItem.name}</Text>
                  <Badge size="lg" variant="filled">Stock actual: {movementItem.current_stock} {movementItem.unit}</Badge>
                </Group>
              </Paper>

              <Select
                label="Tipo de movimiento"
                data={[
                  { value: "entry", label: "📥 Entrada - Agregar stock" },
                  { value: "exit", label: "📤 Salida - Reducir stock" },
                  { value: "adjustment", label: "🔄 Ajuste - Cambiar stock" },
                ]}
                {...movementForm.getInputProps("movement_type")}
              />
              <NumberInput
                label="Cantidad"
                min={0}
                {...movementForm.getInputProps("quantity")}
              />
              <Textarea
                label="Motivo"
                placeholder="Motivo del movimiento (obligatorio para auditoría)"
                required
                autosize
                minRows={2}
                {...movementForm.getInputProps("reason")}
              />

              {movements.length > 0 && (
                <>
                  <Divider label="Últimos movimientos" labelPosition="center" />
                  <Box style={{ maxHeight: 150, overflow: "auto" }}>
                    <Table striped withTableBorder style={{ fontSize: 12 }}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Tipo</Table.Th>
                          <Table.Th>Cant.</Table.Th>
                          <Table.Th>Stock</Table.Th>
                          <Table.Th>Motivo</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {movements.slice(0, 5).map((m) => (
                          <Table.Tr key={m.id}>
                            <Table.Td>
                              <Badge size="xs" color={m.movement_type === "entry" ? "green" : m.movement_type === "exit" ? "red" : "blue"} variant="light">
                                {m.movement_type === "entry" ? "Entrada" : m.movement_type === "exit" ? "Salida" : "Ajuste"}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{m.quantity}</Table.Td>
                            <Table.Td>{m.previous_stock} → {m.new_stock}</Table.Td>
                            <Table.Td><Text size="xs" lineClamp={1}>{m.reason}</Text></Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Box>
                </>
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeMovementModal}>Cancelar</Button>
                <Button type="submit" loading={registerMovement.isPending}>Registrar</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Container>
  );
}
