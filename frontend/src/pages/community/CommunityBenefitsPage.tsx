/**
 * Página "Comunidad → Beneficios" (vista entrenador).
 *
 * Permite al entrenador crear, editar y desactivar los beneficios
 * (códigos de descuento + URLs con título) que aparecerán a sus
 * clientes en ``/my-community``.
 *
 * Diseño:
 *  - Cabecera con CTA "Nuevo beneficio".
 *  - Tarjetas en grid con título, marca, descripción, código y URL.
 *  - Modal/BottomSheet con formulario validado.
 */
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Container,
  CopyButton,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconExternalLink,
  IconGift,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { BottomSheet } from "../../components/common/BottomSheet";
import {
  communityBenefitsApi,
  type CommunityBenefit,
  type CommunityBenefitInput,
} from "../../services/api";
import { useTranslation } from "react-i18next";

type FormValues = {
  title: string;
  brand: string;
  description: string;
  url: string;
  discount_code: string;
  is_active: boolean;
};

const EMPTY: FormValues = {
  title: "",
  brand: "",
  description: "",
  url: "",
  discount_code: "",
  is_active: true,
};

export function CommunityBenefitsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [editing, setEditing] = useState<CommunityBenefit | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const { data: benefits = [], isLoading } = useQuery({
    queryKey: ["community-benefits"],
    queryFn: async () => {
      const res = await communityBenefitsApi.list();
      return res.data;
    },
  });

  const form = useForm<FormValues>({
    initialValues: EMPTY,
    validate: {
      title: (v) => (v.trim() ? null : t("communityBenefitsPage.elTítuloEsObligatorio")),
      url: (v, vals) => {
        if (!v && !vals.discount_code) {
          return "Indica al menos una URL o un código";
        }
        if (v && !/^https?:\/\//i.test(v)) {
          return "La URL debe empezar por http(s)://";
        }
        return null;
      },
    },
  });

  useEffect(() => {
    if (editing) {
      form.setValues({
        title: editing.title,
        brand: editing.brand || "",
        description: editing.description || "",
        url: editing.url || "",
        discount_code: editing.discount_code || "",
        is_active: editing.is_active,
      });
    } else {
      form.setValues(EMPTY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const upsert = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: CommunityBenefitInput = {
        title: values.title.trim(),
        brand: values.brand.trim() || null,
        description: values.description.trim() || null,
        url: values.url.trim() || null,
        discount_code: values.discount_code.trim() || null,
        is_active: values.is_active,
      };
      if (editing) {
        await communityBenefitsApi.update(editing.id, payload);
      } else {
        await communityBenefitsApi.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-benefits"] });
      notifications.show({
        title: editing ? t("communityBenefitsPage.beneficioActualizado") : t("communityBenefitsPage.beneficioCreado"),
        message: t("community.yaEstaDisponibleParaTus"),
        color: "green",
      });
      setEditing(null);
      close();
    },
    onError: (err: any) => {
      notifications.show({
        title: t("community.noSePudoGuardar"),
        message: err?.response?.data?.detail || "Inténtalo de nuevo.",
        color: "red",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await communityBenefitsApi.remove(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-benefits"] });
      notifications.show({
        title: t("community.beneficioEliminado"),
        message: t("community.yaNoApareceATus"),
        color: "green",
      });
    },
  });

  const handleSubmit = form.onSubmit((values) => upsert.mutate(values));

  const formContent = (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <TextInput
          label={t("community.titulo")}
          placeholder={t("community.ej10EnMyprotein")}
          required
          {...form.getInputProps("title")}
        />
        <TextInput
          label={t("community.marcaTienda")}
          placeholder={t("community.ejMyprotein")}
          {...form.getInputProps("brand")}
        />
        <Textarea
          label={t("community.descripcionOpcional")}
          minRows={2}
          {...form.getInputProps("description")}
        />
        <TextInput
          label={t("community.urlDeCompra")}
          placeholder="https://..."
          {...form.getInputProps("url")}
        />
        <TextInput
          label={t("community.codigoDeDescuento")}
          placeholder="TRACKFIZ10"
          {...form.getInputProps("discount_code")}
        />
        <Switch
          label={t("community.visibleParaMisClientes")}
          checked={form.values.is_active}
          onChange={(e) =>
            form.setFieldValue("is_active", e.currentTarget.checked)
          }
        />
        <Group justify="flex-end" mt="xs">
          <Button
            variant="subtle"
            onClick={() => {
              setEditing(null);
              close();
            }}
          >
            {t("community.cancelar")}
          </Button>
          <Button type="submit" loading={upsert.isPending}>
            {editing ? t("communityBenefitsPage.guardarCambios") : t("communityBenefitsPage.crearBeneficio")}
          </Button>
        </Group>
      </Stack>
    </form>
  );

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title={t("community.beneficios")}
        subtitle={t("community.comparteCodigosDeDescuentoY")}
        action={{
          label: t("community.nuevoBeneficio"),
          icon: <IconPlus size={16} />,
          onClick: () => {
            setEditing(null);
            open();
          },
        }}
      />

      {isLoading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : benefits.length === 0 ? (
        <Paper p="xl" withBorder radius="md">
          <Stack align="center" gap="sm">
            <IconGift size={32} color="var(--mantine-color-gray-5)" />
            <Text fw={600}>{t("community.aunNoHasCreadoNingun")}</Text>
            <Text size="sm" c="dimmed" ta="center" maw={420}>
              {t("community.comparteCodigosDeDescuentoDe")}
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setEditing(null);
                open();
              }}
            >
              {t("community.crearElPrimero")}
            </Button>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {benefits.map((b) => (
            <Paper
              key={b.id}
              p="md"
              withBorder
              radius="md"
              style={{ opacity: b.is_active ? 1 : 0.55 }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2} style={{ minWidth: 0 }}>
                  {b.brand && (
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      {b.brand}
                    </Text>
                  )}
                  <Text fw={700} lineClamp={2}>
                    {b.title}
                  </Text>
                </Stack>
                <Group gap={4} wrap="nowrap">
                  <Tooltip label={t("community.editar")} withArrow>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => {
                        setEditing(b);
                        open();
                      }}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t("community.eliminar")} withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        if (window.confirm(t("communityBenefitsPage.eliminarEsteBeneficio"))) {
                          remove.mutate(b.id);
                        }
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {b.description && (
                <Text size="sm" c="dimmed" mt={6} lineClamp={3}>
                  {b.description}
                </Text>
              )}

              <Stack gap={6} mt="md">
                {b.discount_code && (
                  <Group gap="xs" wrap="nowrap">
                    <Badge variant="light" color="yellow" size="lg" radius="sm">
                      {b.discount_code}
                    </Badge>
                    <CopyButton value={b.discount_code}>
                      {({ copied, copy }) => (
                        <Tooltip
                          label={copied ? "Copiado" : t("myNutrition.copiarCodigo")}
                          withArrow
                        >
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color={copied ? "teal" : "gray"}
                            onClick={copy}
                          >
                            {copied ? (
                              <IconCheck size={14} />
                            ) : (
                              <IconCopy size={14} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                )}
                {b.url && (
                  <Button
                    component="a"
                    href={b.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    size="xs"
                    variant="light"
                    rightSection={<IconExternalLink size={14} />}
                    fullWidth
                  >
                    {t("community.abrirUrl")}
                  </Button>
                )}
                {!b.is_active && (
                  <Badge variant="outline" color="gray" size="xs" mt={4}>
                    {t("community.inactivo")}
                  </Badge>
                )}
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      {/* Form modal */}
      {isMobile ? (
        <BottomSheet
          opened={opened}
          onClose={() => {
            setEditing(null);
            close();
          }}
          title={editing ? t("communityBenefitsPage.editarBeneficio") : t("communityBenefitsPage.nuevoBeneficio")}
        >
          <Box p="md">{formContent}</Box>
        </BottomSheet>
      ) : (
        opened && (
          <Box
            pos="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            style={{
              background: "rgba(0,0,0,0.45)",
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => {
              setEditing(null);
              close();
            }}
          >
            <Paper
              p="xl"
              radius="md"
              w="100%"
              maw={520}
              onClick={(e) => e.stopPropagation()}
            >
              <Group justify="space-between" mb="md">
                <Text fw={700} size="lg">
                  {editing ? t("communityBenefitsPage.editarBeneficio") : t("communityBenefitsPage.nuevoBeneficio")}
                </Text>
              </Group>
              {formContent}
            </Paper>
          </Box>
        )
      )}
    </Container>
  );
}
