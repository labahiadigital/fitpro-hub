import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDatabase,
  IconEdit,
  IconExternalLink,
  IconPill,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EmptyState } from "../common/EmptyState";
import { supplementsApi } from "../../services/api";
import { BottomSheet } from "../common/BottomSheet";
import { useTranslation } from "react-i18next";

interface Supplement {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  serving_size?: number;
  serving_unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  usage_instructions?: string;
  warnings?: string;
  image_url?: string;
  purchase_url?: string;
  is_global: boolean;
}

const SUPPLEMENT_CATEGORIES = [
  { value: "proteina", label: "Proteína" },
  { value: "rendimiento", label: "Rendimiento" },
  { value: "salud", label: "Salud" },
  { value: "vitaminas", label: "Vitaminas" },
  { value: "minerales", label: "Minerales" },
  { value: "aminoacidos", label: "Aminoácidos" },
  { value: "carbohidratos", label: "Carbohidratos" },
  { value: "quemadores", label: "Quemadores" },
  { value: "otros", label: "Otros" },
];

function getCategoryLabel(value?: string) {
  return SUPPLEMENT_CATEGORIES.find((c) => c.value === value)?.label || value || "—";
}

export function SupplementLibrary() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: allSupplements = [], isLoading } = useQuery({
    queryKey: ["supplements", search],
    queryFn: async () => {
      const res = await supplementsApi.list({ search: search || undefined });
      return res.data as Supplement[];
    },
    staleTime: 30_000,
  });

  const supplements = useMemo(() => {
    if (sourceFilter === "system") return allSupplements.filter((s) => s.is_global);
    if (sourceFilter === "custom") return allSupplements.filter((s) => !s.is_global);
    return allSupplements;
  }, [allSupplements, sourceFilter]);

  const systemCount = useMemo(() => allSupplements.filter((s) => s.is_global).length, [allSupplements]);
  const customCount = useMemo(() => allSupplements.filter((s) => !s.is_global).length, [allSupplements]);

  const createMutation = useMutation({
    mutationFn: (data: object) => supplementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
      notifications.show({ title: t("supplementsComp.suplementoCreado"), message: t("supplementsComp.anadidoCorrectamente"), color: "green", icon: <IconCheck size={16} /> });
      closeModal();
      form.reset();
      setEditingSupplement(null);
    },
    onError: () => {
      notifications.show({ title: t("supplementsComp.error"), message: t("supplementsComp.noSePudoCrearEl"), color: "red" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => supplementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
      notifications.show({ title: t("supplementsComp.suplementoActualizado"), message: t("supplementsComp.guardadoCorrectamente"), color: "green", icon: <IconCheck size={16} /> });
      closeModal();
      form.reset();
      setEditingSupplement(null);
    },
    onError: () => {
      notifications.show({ title: t("supplementsComp.error"), message: t("supplementsComp.noSePudoActualizar"), color: "red" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supplementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
      notifications.show({ title: t("supplementsComp.suplementoEliminado"), message: t("supplementsComp.eliminadoCorrectamente"), color: "green" });
      setDeleteConfirmId(null);
    },
    onError: () => {
      notifications.show({ title: t("supplementsComp.error"), message: t("supplementsComp.noSePudoEliminar"), color: "red" });
    },
  });

  const form = useForm({
    initialValues: {
      name: "",
      brand: "",
      description: "",
      category: "",
      serving_size: null as number | null,
      serving_unit: "",
      calories: null as number | null,
      protein: null as number | null,
      carbs: null as number | null,
      fat: null as number | null,
      usage_instructions: "",
      image_url: "",
      purchase_url: "",
      warnings: "",
    },
    validate: {
      name: (v) => (v.length < 2 ? t("supplementLibrary.nombreRequerido") : null),
    },
  });

  const handleOpenModal = (supplement?: Supplement) => {
    if (supplement) {
      setEditingSupplement(supplement);
      form.setValues({
        name: supplement.name,
        brand: supplement.brand || "",
        description: supplement.description || "",
        category: supplement.category || "",
        serving_size: supplement.serving_size ?? null,
        serving_unit: supplement.serving_unit || "",
        calories: supplement.calories ?? null,
        protein: supplement.protein ?? null,
        carbs: supplement.carbs ?? null,
        fat: supplement.fat ?? null,
        usage_instructions: supplement.usage_instructions || "",
        image_url: supplement.image_url || "",
        purchase_url: supplement.purchase_url || "",
        warnings: supplement.warnings || "",
      });
    } else {
      setEditingSupplement(null);
      form.reset();
    }
    openModal();
  };

  const handleSubmit = (values: typeof form.values) => {
    const payload = {
      ...values,
      serving_size: values.serving_size || undefined,
      calories: values.calories || undefined,
      protein: values.protein || undefined,
      carbs: values.carbs || undefined,
      fat: values.fat || undefined,
    };

    if (editingSupplement) {
      updateMutation.mutate({ id: editingSupplement.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) {
    return (
      <Box py="xl" ta="center">
        <Loader size="sm" />
        <Text c="dimmed" size="sm" mt="sm">{t("supplementsComp.cargandoSuplementos")}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <TextInput
            placeholder={t("supplementsComp.buscarSuplementos")}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            w={260}
            radius="md"
          />
          <SegmentedControl
            value={sourceFilter}
            onChange={setSourceFilter}
            size="xs"
            radius="md"
            data={[
              { label: `Todos (${allSupplements.length})`, value: "all" },
              { label: `Sistema (${systemCount})`, value: "system" },
              { label: `Personalizados (${customCount})`, value: "custom" },
            ]}
          />
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()} radius="xl">
          {t("supplementsComp.nuevoSuplemento")}
        </Button>
      </Group>

      {supplements.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
          {supplements.map((supplement) => (
            <Card key={supplement.id} padding="lg" radius="lg" withBorder>
              <Group justify="space-between" mt={0} mb="xs">
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={6} wrap="nowrap">
                    <Text fw={600} lineClamp={1}>{supplement.name}</Text>
                    {supplement.is_global ? (
                      <Badge color="gray" variant="light" size="xs" leftSection={<IconDatabase size={10} />} style={{ flexShrink: 0 }}>{t("supplementsComp.sistema")}</Badge>
                    ) : (
                      <Badge color="teal" variant="light" size="xs" style={{ flexShrink: 0 }}>{t("supplementsComp.propio")}</Badge>
                    )}
                  </Group>
                  <Text c="dimmed" size="xs">{supplement.brand}</Text>
                </Box>
                {supplement.category && (
                  <Badge color="green" variant="light" size="sm" style={{ flexShrink: 0 }}>
                    {getCategoryLabel(supplement.category)}
                  </Badge>
                )}
              </Group>

              <Text c="dimmed" size="sm" lineClamp={2} mb="md">
                {supplement.description || t("supplementLibrary.sinDescripcion")}
              </Text>

              {(supplement.calories != null || supplement.protein != null) && (
                <Group gap="xs" mb="md">
                  {supplement.calories != null && (
                    <Badge color="blue" variant="light" size="xs">{supplement.calories} kcal</Badge>
                  )}
                  {supplement.protein != null && (
                    <Badge color="green" variant="light" size="xs">P: {supplement.protein}g</Badge>
                  )}
                  {supplement.carbs != null && (
                    <Badge color="orange" variant="light" size="xs">C: {supplement.carbs}g</Badge>
                  )}
                  {supplement.fat != null && (
                    <Badge color="grape" variant="light" size="xs">G: {supplement.fat}g</Badge>
                  )}
                </Group>
              )}

              {supplement.serving_size && (
                <Text size="xs" c="dimmed" mb="xs">
                  Porción: {supplement.serving_size}{supplement.serving_unit ? ` ${supplement.serving_unit}` : ""}
                </Text>
              )}

              <Group gap="xs">
                {!supplement.is_global && (
                  <Button
                    flex={1}
                    variant="light"
                    size="xs"
                    leftSection={<IconEdit size={14} />}
                    onClick={() => handleOpenModal(supplement)}
                    radius="md"
                  >
                    {t("supplementsComp.editar")}
                  </Button>
                )}
                {supplement.purchase_url && (
                  <ActionIcon
                    color="blue"
                    variant="light"
                    component="a"
                    href={supplement.purchase_url}
                    target="_blank"
                    radius="md"
                  >
                    <IconExternalLink size={16} />
                  </ActionIcon>
                )}
                {!supplement.is_global && (
                  <ActionIcon
                    color="red"
                    variant="light"
                    radius="md"
                    onClick={() => setDeleteConfirmId(supplement.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <EmptyState
          icon={<IconPill size={40} />}
          title={t("supplementsComp.noHaySuplementos")}
          description={t("supplementsComp.anadeSuplementosATuBiblioteca")}
          actionLabel={t("supplementsComp.anadirSuplemento")}
          onAction={() => handleOpenModal()}
        />
      )}

      {/* Modal crear/editar */}
      <BottomSheet
        opened={modalOpened}
        onClose={() => { closeModal(); setEditingSupplement(null); form.reset(); }}
        title={editingSupplement ? "Editar Suplemento" : "Nuevo Suplemento"}
        size="lg"
        radius="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Group grow>
              <TextInput label={t("supplementsComp.nombre")} placeholder={t("supplementsComp.wheyProtein")} required {...form.getInputProps("name")} />
              <TextInput label={t("supplementsComp.marca")} placeholder={t("supplementsComp.prozis")} {...form.getInputProps("brand")} />
            </Group>

            <Group grow>
              <Select
                label={t("supplementsComp.categoria")}
                placeholder={t("supplementsComp.selecciona")}
                data={SUPPLEMENT_CATEGORIES}
                clearable
                {...form.getInputProps("category")}
              />
              <Group grow>
                <NumberInput label={t("supplementsComp.porcion")} min={0} decimalScale={1} {...form.getInputProps("serving_size")} />
                <TextInput label={t("supplementsComp.unidad")} placeholder={t("supplementsComp.gMlCaps")} {...form.getInputProps("serving_unit")} />
              </Group>
            </Group>

            <Textarea
              label={t("supplementsComp.descripcion")}
              placeholder={t("supplementsComp.descripcionDelSuplemento")}
              minRows={2}
              {...form.getInputProps("description")}
            />

            <Group grow>
              <NumberInput label={t("supplementsComp.calorias")} min={0} {...form.getInputProps("calories")} />
              <NumberInput label={t("supplementsComp.proteinaG")} min={0} decimalScale={1} {...form.getInputProps("protein")} />
              <NumberInput label={t("supplementsComp.carbosG")} min={0} decimalScale={1} {...form.getInputProps("carbs")} />
              <NumberInput label={t("supplementsComp.grasasG")} min={0} decimalScale={1} {...form.getInputProps("fat")} />
            </Group>

            <Textarea
              label={t("supplementsComp.instruccionesDeUso")}
              placeholder={t("supplementsComp.comoTomarElSuplemento")}
              minRows={2}
              {...form.getInputProps("usage_instructions")}
            />

            <TextInput
              label={t("supplementsComp.urlDeCompra")}
              placeholder="https://prozis.com/..."
              {...form.getInputProps("purchase_url")}
            />

            <TextInput
              label={t("supplementsComp.urlDeImagen")}
              placeholder="https://..."
              {...form.getInputProps("image_url")}
            />

            <Textarea
              label={t("supplementsComp.advertencias")}
              placeholder={t("supplementsComp.alergenosContraindicaciones")}
              minRows={1}
              {...form.getInputProps("warnings")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => { closeModal(); setEditingSupplement(null); form.reset(); }} radius="xl">
                {t("supplementsComp.cancelar")}
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                radius="xl"
                styles={{ root: { background: "var(--nv-accent)", color: "var(--nv-dark)", fontWeight: 700 } }}
              >
                {editingSupplement ? "Guardar Cambios" : "Crear Suplemento"}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Confirmación de borrado */}
      <BottomSheet
        opened={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t("supplementsComp.confirmarEliminacion")}
        size="sm"
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t("supplementsComp.estasSeguroDeQueQuieres")}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteConfirmId(null)} radius="xl">{t("supplementsComp.cancelar")}</Button>
            <Button
              color="red"
              loading={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              radius="xl"
            >
              {t("supplementsComp.eliminar")}
            </Button>
          </Group>
        </Stack>
      </BottomSheet>
    </Box>
  );
}

export default SupplementLibrary;
