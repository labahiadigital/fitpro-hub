import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconBuildingStore,
  IconCheck,
  IconPlus,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { BottomSheet } from "../../components/common/BottomSheet";
import { DataTable } from "../../components/common/DataTable";
import { openDangerConfirm } from "../../utils/confirmModal";
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
  type Supplier,
  type SupplierBankAccount,
  type SupplierPayload,
} from "../../hooks/useSuppliers";
import { useTranslation } from "react-i18next";

const COUNTRIES = [
  { value: "España", label: "España" },
  { value: "Portugal", label: "Portugal" },
  { value: "Francia", label: "Francia" },
  { value: "Italia", label: "Italia" },
  { value: "Reino Unido", label: "Reino Unido" },
  { value: "Alemania", label: "Alemania" },
  { value: "México", label: "México" },
  { value: "Argentina", label: "Argentina" },
  { value: "Chile", label: "Chile" },
  { value: "Colombia", label: "Colombia" },
  { value: "Otro", label: "Otro" },
];

type FormValues = {
  tax_id: string;
  legal_name: string;
  address: string;
  postal_code: string;
  city: string;
  province: string;
  country: string;
  latitude: number | "";
  longitude: number | "";
  default_discount_pct: number | "";
  bank_accounts: SupplierBankAccount[];
  phone: string;
  mobile: string;
  fax: string;
  email: string;
  url: string;
  custom_field_1: string;
  custom_field_2: string;
  notes: string;
  tags: string[];
  is_active: boolean;
};

const EMPTY_VALUES: FormValues = {
  tax_id: "",
  legal_name: "",
  address: "",
  postal_code: "",
  city: "",
  province: "",
  country: "España",
  latitude: "",
  longitude: "",
  default_discount_pct: "",
  bank_accounts: [],
  phone: "",
  mobile: "",
  fax: "",
  email: "",
  url: "",
  custom_field_1: "",
  custom_field_2: "",
  notes: "",
  tags: [],
  is_active: true,
};

function toPayload(values: FormValues): SupplierPayload {
  const emptyToNull = (v: string | number | "") =>
    v === "" || v === null ? null : v;
  return {
    tax_id: (values.tax_id.trim() || null) as string | null,
    legal_name: values.legal_name.trim(),
    address: (values.address.trim() || null) as string | null,
    postal_code: (values.postal_code.trim() || null) as string | null,
    city: (values.city.trim() || null) as string | null,
    province: (values.province.trim() || null) as string | null,
    country: values.country || "España",
    latitude: emptyToNull(values.latitude) as number | null,
    longitude: emptyToNull(values.longitude) as number | null,
    default_discount_pct: emptyToNull(values.default_discount_pct) as number | null,
    bank_accounts: values.bank_accounts,
    phone: (values.phone.trim() || null) as string | null,
    mobile: (values.mobile.trim() || null) as string | null,
    fax: (values.fax.trim() || null) as string | null,
    email: (values.email.trim() || null) as string | null,
    url: (values.url.trim() || null) as string | null,
    custom_field_1: (values.custom_field_1.trim() || null) as string | null,
    custom_field_2: (values.custom_field_2.trim() || null) as string | null,
    notes: (values.notes.trim() || null) as string | null,
    tags: values.tags,
    is_active: values.is_active,
  };
}

function supplierToValues(s: Supplier): FormValues {
  const toNumOrEmpty = (v: number | string | null | undefined): number | "" => {
    if (v === null || v === undefined || v === "") return "";
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? (n as number) : "";
  };
  return {
    tax_id: s.tax_id ?? "",
    legal_name: s.legal_name,
    address: s.address ?? "",
    postal_code: s.postal_code ?? "",
    city: s.city ?? "",
    province: s.province ?? "",
    country: s.country || "España",
    latitude: toNumOrEmpty(s.latitude),
    longitude: toNumOrEmpty(s.longitude),
    default_discount_pct: toNumOrEmpty(s.default_discount_pct),
    bank_accounts: s.bank_accounts || [],
    phone: s.phone ?? "",
    mobile: s.mobile ?? "",
    fax: s.fax ?? "",
    email: s.email ?? "",
    url: s.url ?? "",
    custom_field_1: s.custom_field_1 ?? "",
    custom_field_2: s.custom_field_2 ?? "",
    notes: s.notes ?? "",
    tags: s.tags || [],
    is_active: s.is_active,
  };
}

export default function SuppliersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const form = useForm<FormValues>({
    initialValues: { ...EMPTY_VALUES },
    validate: {
      legal_name: (v) => (v.trim().length < 2 ? t("suppliersPage.nombreObligatorio") : null),
      email: (v) =>
        v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? t("suppliersPage.emailInvalido") : null,
      default_discount_pct: (v) =>
        v === "" || v === null
          ? null
          : Number(v) < 0 || Number(v) > 100
            ? "Entre 0 y 100"
            : null,
    },
  });

  useEffect(() => {
    if (editing) {
      form.setValues(supplierToValues(editing));
    } else {
      form.setValues({ ...EMPTY_VALUES });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((s) =>
      [s.legal_name, s.tax_id, s.email, s.city, s.phone, s.mobile]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(term)),
    );
  }, [suppliers, search]);

  const handleOpenNew = () => {
    setEditing(null);
    form.setValues({ ...EMPTY_VALUES });
    openModal();
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditing(supplier);
    openModal();
  };

  const handleSubmit = async (values: FormValues) => {
    const payload = toPayload(values);
    try {
      if (editing) {
        await updateSupplier.mutateAsync({ id: editing.id, data: payload });
        notifications.show({
          title: t("suppliers.proveedorActualizado"),
          message: `${values.legal_name} se ha guardado correctamente`,
          color: "green",
        });
      } else {
        await createSupplier.mutateAsync(payload);
        notifications.show({
          title: t("suppliers.proveedorCreado"),
          message: `${values.legal_name} se ha creado correctamente`,
          color: "green",
        });
      }
      closeModal();
      setEditing(null);
      form.reset();
    } catch (error) {
      notifications.show({
        title: t("suppliers.error"),
        message: t("suppliers.noSePudoGuardarEl"),
        color: "red",
      });
    }
  };

  const handleDelete = (supplier: Supplier) => {
    openDangerConfirm({
      title: t("suppliers.eliminarProveedor"),
      message: `¿Seguro que quieres eliminar a ${supplier.legal_name}? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        try {
          await deleteSupplier.mutateAsync(supplier.id);
          notifications.show({
            title: t("suppliers.proveedorEliminado"),
            message: supplier.legal_name,
            color: "green",
          });
        } catch (error) {
          notifications.show({
            title: t("suppliers.error"),
            message: t("suppliers.noSePudoEliminarEl"),
            color: "red",
          });
        }
      },
    });
  };

  const addBankAccount = () => {
    form.setFieldValue("bank_accounts", [
      ...form.values.bank_accounts,
      { iban: "", bic: "", notes: "", is_default: form.values.bank_accounts.length === 0 },
    ]);
  };

  const removeBankAccount = (index: number) => {
    const next = form.values.bank_accounts.filter((_, i) => i !== index);
    if (next.length && !next.some((a) => a.is_default)) {
      next[0] = { ...next[0], is_default: true };
    }
    form.setFieldValue("bank_accounts", next);
  };

  const setDefaultBank = (index: number) => {
    form.setFieldValue(
      "bank_accounts",
      form.values.bank_accounts.map((a, i) => ({ ...a, is_default: i === index })),
    );
  };

  const updateBankField = (
    index: number,
    field: keyof SupplierBankAccount,
    value: string | boolean,
  ) => {
    form.setFieldValue(
      "bank_accounts",
      form.values.bank_accounts.map((a, i) =>
        i === index ? { ...a, [field]: value } : a,
      ),
    );
  };

  return (
    <Container size="xl" py="md">
      <PageHeader
        title={t("suppliers.proveedores")}
        description={t("suppliers.gestionaLosProveedoresDeStock")}
        action={
          <Button leftSection={<IconPlus size={18} />} onClick={handleOpenNew}>
            {t("suppliers.nuevoProveedor")}
          </Button>
        }
      />

      <Paper withBorder p="md" radius="md" mt="md">
        {filteredSuppliers.length === 0 && !isLoading ? (
          <EmptyState
            icon={<IconBuildingStore size={48} />}
            title={t("suppliers.sinProveedores")}
            description={t("suppliers.creaTuPrimerProveedorPara")}
            actionLabel={t("suppliers.nuevoProveedor")}
            onAction={handleOpenNew}
          />
        ) : (
          <DataTable<Supplier>
            data={filteredSuppliers}
            loading={isLoading}
            searchable
            searchPlaceholder={t("suppliers.buscar_por_nombre_nif_email")}
            onSearch={setSearch}
            columns={[
              {
                key: "legal_name",
                title: t("suppliers.nombre"),
                render: (s) => (
                  <Stack gap={2}>
                    <Text fw={600} size="sm">
                      {s.legal_name}
                    </Text>
                    {s.tags && s.tags.length > 0 && (
                      <Group gap={4}>
                        {s.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} size="xs" variant="light">
                            {tag}
                          </Badge>
                        ))}
                        {s.tags.length > 2 && (
                          <Badge size="xs" variant="light" color="gray">
                            +{s.tags.length - 2}
                          </Badge>
                        )}
                      </Group>
                    )}
                  </Stack>
                ),
              },
              {
                key: "tax_id",
                title: "NIF",
                hideOnMobile: true,
                render: (s) => (
                  <Text size="sm" c={s.tax_id ? undefined : "dimmed"}>
                    {s.tax_id || "—"}
                  </Text>
                ),
              },
              {
                key: "address",
                title: t("suppliers.direccion"),
                hideOnMobile: true,
                render: (s) => {
                  const parts = [s.address, s.postal_code, s.city, s.province, s.country]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <Text size="sm" c={parts ? undefined : "dimmed"} lineClamp={2}>
                      {parts || "—"}
                    </Text>
                  );
                },
              },
              {
                key: "phone",
                title: t("suppliers.telefono"),
                hideOnMobile: true,
                render: (s) => (
                  <Text size="sm" c={s.phone || s.mobile ? undefined : "dimmed"}>
                    {s.phone || s.mobile || "—"}
                  </Text>
                ),
              },
              {
                key: "email",
                title: t("suppliers.email"),
                hideOnMobile: true,
                render: (s) => (
                  <Text size="sm" c={s.email ? undefined : "dimmed"}>
                    {s.email || "—"}
                  </Text>
                ),
              },
              {
                key: "is_active",
                title: t("suppliers.estado"),
                render: (s) =>
                  s.is_active ? (
                    <Badge color="green" variant="light">
                      {t("suppliers.activo")}
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      {t("suppliers.inactivo")}
                    </Badge>
                  ),
              },
            ]}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onView={handleOpenEdit}
            getDeleteLabel={() => "Eliminar"}
          />
        )}
      </Paper>

      <BottomSheet
        opened={modalOpened}
        onClose={() => {
          closeModal();
          setEditing(null);
        }}
        title={editing ? `Editar: ${editing.legal_name}` : t("suppliersPage.nuevoProveedor")}
        size="xl"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            <Box>
              <Text fw={600} mb="xs">
                {t("suppliers.datosDeFacturacion")}
              </Text>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    label="NIF / CIF"
                    placeholder="B12345678"
                    {...form.getInputProps("tax_id")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 8 }}>
                  <TextInput
                    label={t("suppliers.nombreORazonSocial")}
                    placeholder={t("suppliers.miProveedorSl")}
                    required
                    {...form.getInputProps("legal_name")}
                  />
                </Grid.Col>
              </Grid>
            </Box>

            <Box>
              <Text fw={600} mb="xs">
                {t("suppliers.direccion")}
              </Text>
              <Stack gap="xs">
                <TextInput
                  label={t("suppliers.direccion")}
                  placeholder={t("suppliers.calleNumeroPiso")}
                  {...form.getInputProps("address")}
                />
                <Grid>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <TextInput
                      label={t("suppliers.codigoPostal")}
                      placeholder="46001"
                      {...form.getInputProps("postal_code")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <TextInput
                      label={t("suppliers.poblacion")}
                      placeholder={t("suppliers.valencia")}
                      {...form.getInputProps("city")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <TextInput
                      label={t("suppliers.provincia")}
                      placeholder={t("suppliers.valencia")}
                      {...form.getInputProps("province")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Select
                      label={t("suppliers.pais")}
                      data={COUNTRIES}
                      searchable
                      {...form.getInputProps("country")}
                    />
                  </Grid.Col>
                </Grid>
                <Grid>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <NumberInput
                      label={t("suppliers.latitud")}
                      placeholder="39.469"
                      decimalScale={6}
                      min={-90}
                      max={90}
                      {...form.getInputProps("latitude")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <NumberInput
                      label={t("suppliers.longitud")}
                      placeholder="-0.376"
                      decimalScale={6}
                      min={-180}
                      max={180}
                      {...form.getInputProps("longitude")}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Box>

            <Box>
              <Text fw={600} mb="xs">
                {t("suppliers.descuento")}
              </Text>
              <NumberInput
                label={t("suppliers.porcentajeDeDescuentoPorDefecto")}
                placeholder="0"
                suffix="%"
                min={0}
                max={100}
                w={{ base: "100%", sm: 260 }}
                {...form.getInputProps("default_discount_pct")}
              />
            </Box>

            <Box>
              <Group justify="space-between" align="flex-end" mb="xs">
                <Text fw={600}>{t("suppliers.cuentasBancarias")}</Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={addBankAccount}
                >
                  {t("suppliers.anadirCuenta")}
                </Button>
              </Group>
              {form.values.bank_accounts.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t("suppliers.noHayCuentasBancariasRegistradas")}
                </Text>
              ) : (
                <Stack gap="sm">
                  {form.values.bank_accounts.map((acc, idx) => (
                    <Paper key={idx} withBorder p="sm" radius="md">
                      <Grid>
                        <Grid.Col span={{ base: 12, sm: 5 }}>
                          <TextInput
                            label="IBAN"
                            placeholder="ES91 2100 0418 4502 0005 1332"
                            value={acc.iban}
                            onChange={(e) =>
                              updateBankField(idx, "iban", e.currentTarget.value)
                            }
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 6, sm: 3 }}>
                          <TextInput
                            label="BIC"
                            placeholder="BARCESMM"
                            value={acc.bic ?? ""}
                            onChange={(e) =>
                              updateBankField(idx, "bic", e.currentTarget.value)
                            }
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 6, sm: 4 }}>
                          <TextInput
                            label={t("suppliers.notas")}
                            placeholder={t("suppliers.opcional")}
                            value={acc.notes ?? ""}
                            onChange={(e) =>
                              updateBankField(idx, "notes", e.currentTarget.value)
                            }
                          />
                        </Grid.Col>
                        <Grid.Col span={12}>
                          <Group justify="space-between">
                            <Tooltip label={acc.is_default ? "Cuenta por defecto" : "Marcar como predeterminada"}>
                              <Button
                                size="xs"
                                variant={acc.is_default ? "filled" : "light"}
                                color={acc.is_default ? "yellow" : "gray"}
                                leftSection={
                                  acc.is_default ? (
                                    <IconCheck size={14} />
                                  ) : (
                                    <IconStar size={14} />
                                  )
                                }
                                onClick={() => setDefaultBank(idx)}
                              >
                                {acc.is_default ? "Predeterminada" : "Usar por defecto"}
                              </Button>
                            </Tooltip>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => removeBankAccount(idx)}
                              aria-label={t("suppliers.eliminarCuenta")}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Grid.Col>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Text fw={600} mb="xs">
                {t("suppliers.datosDeContacto")}
              </Text>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label={t("suppliers.telefono")} {...form.getInputProps("phone")} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label={t("suppliers.movil")} {...form.getInputProps("mobile")} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t("suppliers.email")}
                    type="email"
                    {...form.getInputProps("email")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput label={t("suppliers.fax")} {...form.getInputProps("fax")} />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    label={t("suppliers.sitioWeb")}
                    placeholder="https://..."
                    {...form.getInputProps("url")}
                  />
                </Grid.Col>
              </Grid>
            </Box>

            <Box>
              <Text fw={600} mb="xs">
                {t("suppliers.otros")}
              </Text>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t("suppliers.personalizado1")}
                    {...form.getInputProps("custom_field_1")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={t("suppliers.personalizado2")}
                    {...form.getInputProps("custom_field_2")}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Textarea
                    label={t("suppliers.notas")}
                    minRows={3}
                    autosize
                    {...form.getInputProps("notes")}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TagsInput
                    label={t("suppliers.etiquetas")}
                    placeholder={t("suppliers.pulsaEnterParaAnadir")}
                    {...form.getInputProps("tags")}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Switch
                    label={t("suppliers.proveedorActivo")}
                    {...form.getInputProps("is_active", { type: "checkbox" })}
                  />
                </Grid.Col>
              </Grid>
            </Box>

            <Divider />
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  closeModal();
                  setEditing(null);
                }}
              >
                {t("suppliers.cancelar")}
              </Button>
              <Button
                type="submit"
                loading={createSupplier.isPending || updateSupplier.isPending}
              >
                {editing ? t("suppliersPage.guardarCambios") : t("suppliersPage.crearProveedor")}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}
