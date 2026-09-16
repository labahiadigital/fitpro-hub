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
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  type BoxAllocation,
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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  if (item.current_stock <= item.min_stock) return <Badge color="red" variant="light" size="sm">{t("stock.stockBajo")}</Badge>;
  if (item.max_stock > 0 && item.current_stock >= item.max_stock) return <Badge color="blue" variant="light" size="sm">{t("stock.stockAlto")}</Badge>;
  return <Badge color="green" variant="light" size="sm">{t("stock.normal")}</Badge>;
}

export function StockPage() {
  const { t } = useTranslation();
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
      box_id: null as string | null,
    },
    validate: {
      quantity: (v) => (v > 0 ? null : "Cantidad debe ser mayor a 0"),
      reason: (v) => (v.trim() ? null : "El motivo es obligatorio"),
    },
  });

  const [newCatName, setNewCatName] = useState("");
  const [boxAllocations, setBoxAllocations] = useState<BoxAllocation[]>([]);

  const totalAllocatedStock = useMemo(
    () => boxAllocations.reduce((acc, b) => acc + (Number(b.current_stock) || 0), 0),
    [boxAllocations]
  );

  const handleOpenCreate = () => {
    setEditMode(false);
    setSelectedItem(null);
    itemForm.reset();
    setBoxAllocations([]);
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
    setBoxAllocations(
      (item.box_allocations || []).map((a) => ({
        box_id: a.box_id,
        box_name: a.box_name ?? null,
        current_stock: Number(a.current_stock) || 0,
        min_stock: Number(a.min_stock) || 0,
        max_stock: Number(a.max_stock) || 0,
      }))
    );
    openItemModal();
  };

  const handleOpenMovement = (item: StockItem) => {
    setMovementItem(item);
    movementForm.reset();
    openMovementModal();
  };

  const handleDelete = (item: StockItem) => {
    modals.openConfirmModal({
      title: t("stock.eliminarElemento"),
      children: <Text size="sm">¿Estás seguro de que deseas eliminar "{item.name}"?</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteItem.mutate(item.id),
    });
  };

  const handleItemSubmit = itemForm.onSubmit((values) => {
    const cleanedAllocations = boxAllocations
      .filter((a) => a.box_id)
      .map((a) => ({
        box_id: a.box_id,
        current_stock: Number(a.current_stock) || 0,
        min_stock: Number(a.min_stock) || 0,
        max_stock: Number(a.max_stock) || 0,
      }));
    const payload: Partial<StockItem> & {
      category_id?: string;
      box_id?: string | null;
      supplier_id?: string | null;
      box_allocations?: typeof cleanedAllocations;
      current_stock?: number;
    } = {
      ...values,
      category_id: values.category_id || undefined,
      box_id: values.box_id || null,
      supplier_id: values.supplier_id || null,
    };
    if (cleanedAllocations.length > 0) {
      payload.box_allocations = cleanedAllocations;
      payload.current_stock = cleanedAllocations.reduce((acc, b) => acc + b.current_stock, 0);
    } else {
      payload.box_allocations = [];
    }
    if (editMode && selectedItem) {
      updateItem.mutate(
        { id: selectedItem.id, ...payload },
        { onSuccess: () => { closeItemModal(); setBoxAllocations([]); } }
      );
    } else {
      createItem.mutate(
        payload,
        { onSuccess: () => { closeItemModal(); itemForm.reset(); setBoxAllocations([]); } }
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
      <PageHeader title={t("stock.gestionDeStock")} subtitle={t("stock.inventarioYMovimientos")} />

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size="lg" color="blue" variant="light" radius="md"><IconPackage size={20} /></ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">{t("stock.totalElementos")}</Text>
              <Text size="xl" fw={700}>{summary?.total_items ?? 0}</Text>
            </Box>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size="lg" color="orange" variant="light" radius="md"><IconArrowDown size={20} /></ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">{t("stock.stockBajo")}</Text>
              <Text size="xl" fw={700} c="orange">{summary?.low_stock_count ?? 0}</Text>
            </Box>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size="lg" color="green" variant="light" radius="md"><IconTrendingUp size={20} /></ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">{t("stock.valorTotal")}</Text>
              <Text size="xl" fw={700}>{(summary?.total_value ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</Text>
            </Box>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap="sm">
            <ThemeIcon size="lg" color="violet" variant="light" radius="md"><IconSwitch size={20} /></ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">{t("stock.movimientosHoy")}</Text>
              <Text size="xl" fw={700}>{summary?.movements_today ?? 0}</Text>
            </Box>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Filters */}
      <Group mb="md" gap="sm">
        <TextInput
          leftSection={<IconSearch size={14} />}
          placeholder={t("stock.buscarElementos")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
          radius="md"
          size="sm"
        />
        <Select
          placeholder={t("stock.categoria")}
          data={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
          clearable
          size="sm"
          radius="md"
          w={180}
        />
        <Switch
          label={t("stock.soloStockBajo")}
          checked={lowStockOnly}
          onChange={(e) => setLowStockOnly(e.currentTarget.checked)}
          size="sm"
        />
        <Button leftSection={<IconPlus size={14} />} onClick={handleOpenCreate} radius="md" size="sm">
          {t("stock.anadirElemento")}
        </Button>
        <Tooltip label={t("stock.exportarAExcel")}>
          <Button leftSection={<IconDownload size={14} />} variant="light" color="green" radius="md" size="sm" onClick={exportToExcel}>
            {t("stock.exportar")}
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
                <Table.Th>{t("stock.elemento")}</Table.Th>
                <Table.Th>{t("stock.categoria")}</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>{t("stock.stock")}</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>{t("stock.precio")}</Table.Th>
                <Table.Th>{t("stock.ubicacion")}</Table.Th>
                <Table.Th>{t("stock.estado")}</Table.Th>
                <Table.Th>{t("stock.acciones")}</Table.Th>
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
                    {item.box_allocations && item.box_allocations.length > 0 && (
                      <Text size="xs" c="blue">
                        {item.box_allocations.length} box{item.box_allocations.length > 1 ? "es" : ""}
                      </Text>
                    )}
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
                      <Tooltip label={t("stock.registrarMovimiento")}>
                        <ActionIcon color="blue" variant="subtle" size="sm" onClick={() => handleOpenMovement(item)}>
                          <IconArrowUp size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t("stock.editar")}>
                        <ActionIcon color="gray" variant="subtle" size="sm" onClick={() => handleOpenEdit(item)}>
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t("stock.eliminar")}>
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
            <Title order={4}>{t("stock.sinElementos")}</Title>
            <Text c="dimmed" size="sm">{t("stock.anadeElementosATuInventario")}</Text>
            <Button leftSection={<IconPlus size={14} />} onClick={handleOpenCreate}>{t("stock.anadirElemento")}</Button>
          </Stack>
        </Center>
      )}

      {/* Add/Edit Item Modal */}
      <Modal
        opened={itemModalOpened}
        onClose={closeItemModal}
        title={editMode ? "Editar Elemento" : t("stock.anadirElemento")}
        size="lg"
        radius="lg"
      >
        <form onSubmit={handleItemSubmit}>
          <Stack>
            <TextInput label={t("stock.nombre")} placeholder={t("stock.nombreDelElemento")} required {...itemForm.getInputProps("name")} />
            <Group grow>
              <Select
                label={t("stock.categoria")}
                placeholder={t("stock.seleccionar")}
                data={categoryOptions}
                clearable
                searchable
                {...itemForm.getInputProps("category_id")}
              />
              <Select label={t("stock.unidad")} data={UNITS} {...itemForm.getInputProps("unit")} />
            </Group>
            <Group>
              <TextInput
                label={t("stock.nuevaCategoria")}
                placeholder={t("stock.nombre")}
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
                {t("stock.crear")}
              </Button>
            </Group>
            <Textarea label={t("stock.descripcion")} placeholder={t("stock.descripcionOpcional")} autosize minRows={2} {...itemForm.getInputProps("description")} />
            <Group grow>
              <NumberInput label={t("stock.stockActual")} min={0} {...itemForm.getInputProps("current_stock")} />
              <NumberInput label={t("stock.stockMinimo")} min={0} {...itemForm.getInputProps("min_stock")} />
              <NumberInput label={t("stock.stockMaximo")} min={0} {...itemForm.getInputProps("max_stock")} />
            </Group>
            <Group grow>
              <NumberInput label={t("stock.precioUnitario")} min={0} decimalScale={2} {...itemForm.getInputProps("price")} />
              <NumberInput label="IVA (%)" min={0} max={100} {...itemForm.getInputProps("tax_rate")} />
              <NumberInput label="IRPF (%)" min={0} max={100} {...itemForm.getInputProps("irpf_rate")} />
            </Group>
            <TextInput label={t("stock.ubicacion")} placeholder={t("stock.almacenEstanteria")} {...itemForm.getInputProps("location")} />
            <Paper p="sm" radius="md" withBorder>
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <div>
                    <Text fw={600} size="sm">{t("stock.distribucionPorBoxes")}</Text>
                    <Text size="xs" c="dimmed">
                      {t("stock.asignaUnidadesAUnoO")}
                    </Text>
                  </div>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={12} />}
                    disabled={boxOptions.length === 0}
                    onClick={() => {
                      const used = new Set(boxAllocations.map((a) => a.box_id));
                      const next = boxOptions.find((b) => !used.has(b.value));
                      setBoxAllocations((prev) => [
                        ...prev,
                        {
                          box_id: next?.value || "",
                          box_name: next?.label || null,
                          current_stock: 0,
                          min_stock: 0,
                          max_stock: 0,
                        },
                      ]);
                    }}
                  >
                    {t("stock.anadirBox")}
                  </Button>
                </Group>

                {boxAllocations.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="xs">
                    {t("stock.sinDistribucionPorBoxesModo")}
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {boxAllocations.map((alloc, idx) => (
                      <Group key={idx} gap="xs" align="flex-end" wrap="nowrap">
                        <Select
                          label={idx === 0 ? "Box" : undefined}
                          placeholder={t("stock.box")}
                          data={boxOptions}
                          searchable
                          value={alloc.box_id || null}
                          onChange={(val) =>
                            setBoxAllocations((prev) =>
                              prev.map((a, i) =>
                                i === idx
                                  ? {
                                      ...a,
                                      box_id: val || "",
                                      box_name:
                                        boxOptions.find((b) => b.value === val)?.label || null,
                                    }
                                  : a
                              )
                            )
                          }
                          style={{ flex: 1 }}
                          size="xs"
                        />
                        <NumberInput
                          label={idx === 0 ? "Unidades" : undefined}
                          min={0}
                          value={alloc.current_stock}
                          onChange={(val) =>
                            setBoxAllocations((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, current_stock: Number(val) || 0 } : a
                              )
                            )
                          }
                          size="xs"
                          w={110}
                        />
                        <NumberInput
                          label={idx === 0 ? t("stockPage.mín") : undefined}
                          min={0}
                          value={alloc.min_stock}
                          onChange={(val) =>
                            setBoxAllocations((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, min_stock: Number(val) || 0 } : a
                              )
                            )
                          }
                          size="xs"
                          w={80}
                        />
                        <NumberInput
                          label={idx === 0 ? t("stockPage.máx") : undefined}
                          min={0}
                          value={alloc.max_stock}
                          onChange={(val) =>
                            setBoxAllocations((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, max_stock: Number(val) || 0 } : a
                              )
                            )
                          }
                          size="xs"
                          w={80}
                        />
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          size="lg"
                          onClick={() =>
                            setBoxAllocations((prev) => prev.filter((_, i) => i !== idx))
                          }
                          title={t("stock.eliminar")}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                    <Group justify="space-between" pt="xs">
                      <Text size="xs" c="dimmed">
                        {t("stock.totalAsignadoABoxes")}
                      </Text>
                      <Badge variant="light" color="blue">
                        {totalAllocatedStock.toFixed(0)} {itemForm.values.unit}
                      </Badge>
                    </Group>
                  </Stack>
                )}
              </Stack>
            </Paper>
            <Select
              label={t("stock.proveedor")}
              placeholder={t("stock.seleccionaUnProveedor")}
              description={t("stock.asociaEsteArticuloAlProveedor")}
              data={supplierOptions}
              searchable
              clearable
              nothingFoundMessage={t("stock.no_hay_proveedores_activos")}
              value={itemForm.values.supplier_id}
              onChange={(val) => itemForm.setFieldValue("supplier_id", val)}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeItemModal}>{t("stock.cancelar")}</Button>
              <Button type="submit" loading={createItem.isPending || updateItem.isPending}>
                {editMode ? t("stockPage.guardarCambios") : t("stockPage.crearElemento")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Stock Detail / Linked Products Modal */}
      <Modal
        opened={detailModalOpened}
        onClose={closeDetailModal}
        title={detailItem?.name || t("stock.detalleDeStock")}
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
                <Text size="xs" c="dimmed">{t("stock.precioUnitario")}</Text>
                <Text fw={600}>{detailItem.price.toFixed(2)} €</Text>
              </Paper>
              <Paper p="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">{t("stock.valorTotal")}</Text>
                <Text fw={600}>{(detailItem.current_stock * detailItem.price).toFixed(2)} €</Text>
              </Paper>
              <Paper p="xs" radius="md" withBorder>
                <Text size="xs" c="dimmed">{t("stock.ubicacion")}</Text>
                <Text fw={600}>{detailItem.location || "—"}</Text>
              </Paper>
            </Group>

            {detailItem.box_allocations && detailItem.box_allocations.length > 0 && (
              <>
                <Divider label={t("stock.distribucionPorBoxes")} labelPosition="center" />
                <Stack gap={4}>
                  {detailItem.box_allocations.map((a) => (
                    <Group key={a.box_id} justify="space-between">
                      <Text size="sm" fw={500}>{a.box_name || "Box"}</Text>
                      <Badge variant="light" color="blue">
                        {a.current_stock} {detailItem.unit}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </>
            )}

            <Divider label={t("stock.productosServiciosVinculados")} labelPosition="center" />

            {linkedProducts.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {t("stock.esteElementoDeStockNo")}
              </Text>
            ) : (
              <Table striped withTableBorder style={{ fontSize: 13 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("stock.tipo")}</Table.Th>
                    <Table.Th>{t("stock.nombre")}</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>{t("stock.udsPorVenta")}</Table.Th>
                    <Table.Th>{t("stock.impacto")}</Table.Th>
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
                          <IconLink size={10} /> {t("stock.reduceStock")}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDetailModal}>{t("stock.cerrar")}</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Register Movement Modal */}
      <Modal
        opened={movementModalOpened}
        onClose={closeMovementModal}
        title={t("stock.registrarMovimiento")}
        size="md"
        radius="lg"
      >
        {movementItem && (
          <form onSubmit={handleMovementSubmit}>
            <Stack>
              <Paper p="sm" radius="md" bg="var(--mantine-color-blue-light)">
                <Group justify="space-between">
                  <Text fw={600}>{movementItem.name}</Text>
                  <Badge size="lg" variant="filled">{t("stock.stockActual", { stock: movementItem.current_stock, unit: movementItem.unit })}</Badge>
                </Group>
              </Paper>

              <Select
                label={t("stock.tipoDeMovimiento")}
                data={[
                  { value: "entry", label: t("stock.entradaAgregarStock") },
                  { value: "exit", label: t("stock.salidaReducirStock") },
                  { value: "adjustment", label: t("stock.ajusteCambiarStock") },
                ]}
                {...movementForm.getInputProps("movement_type")}
              />
              {movementItem.box_allocations && movementItem.box_allocations.length > 0 && (
                <Select
                  label={t("stock.boxOpcional")}
                  description={t("stock.siSeleccionasUnBoxEl")}
                  placeholder={t("stock.aplicarAlStockGlobal")}
                  data={movementItem.box_allocations.map((a) => ({
                    value: a.box_id,
                    label: `${a.box_name || "Box"} · ${a.current_stock} ${movementItem.unit}`,
                  }))}
                  clearable
                  {...movementForm.getInputProps("box_id")}
                />
              )}
              <NumberInput
                label={t("stock.cantidad")}
                min={0}
                {...movementForm.getInputProps("quantity")}
              />
              <Textarea
                label={t("stock.motivo")}
                placeholder={t("stock.motivoDelMovimientoObligatorioPara")}
                required
                autosize
                minRows={2}
                {...movementForm.getInputProps("reason")}
              />

              {movements.length > 0 && (
                <>
                  <Divider label={t("stock.ultimosMovimientos")} labelPosition="center" />
                  <Box style={{ maxHeight: 150, overflow: "auto" }}>
                    <Table striped withTableBorder style={{ fontSize: 12 }}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t("stock.tipo")}</Table.Th>
                          <Table.Th>{t("stock.cant")}</Table.Th>
                          <Table.Th>{t("stock.stock")}</Table.Th>
                          <Table.Th>{t("stock.motivo")}</Table.Th>
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
                <Button variant="default" onClick={closeMovementModal}>{t("stock.cancelar")}</Button>
                <Button type="submit" loading={registerMovement.isPending}>{t("stock.registrar")}</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Container>
  );
}
