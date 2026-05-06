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
      title: (v) => (v.trim() ? null : "El título es obligatorio"),
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
        title: editing ? "Beneficio actualizado" : "Beneficio creado",
        message: "Ya está disponible para tus clientes",
        color: "green",
      });
      setEditing(null);
      close();
    },
    onError: (err: any) => {
      notifications.show({
        title: "No se pudo guardar",
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
        title: "Beneficio eliminado",
        message: "Ya no aparece a tus clientes.",
        color: "green",
      });
    },
  });

  const handleSubmit = form.onSubmit((values) => upsert.mutate(values));

  const formContent = (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <TextInput
          label="Título"
          placeholder="Ej. 10% en MyProtein"
          required
          {...form.getInputProps("title")}
        />
        <TextInput
          label="Marca / Tienda"
          placeholder="Ej. MyProtein"
          {...form.getInputProps("brand")}
        />
        <Textarea
          label="Descripción (opcional)"
          minRows={2}
          {...form.getInputProps("description")}
        />
        <TextInput
          label="URL de compra"
          placeholder="https://..."
          {...form.getInputProps("url")}
        />
        <TextInput
          label="Código de descuento"
          placeholder="TRACKFIZ10"
          {...form.getInputProps("discount_code")}
        />
        <Switch
          label="Visible para mis clientes"
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
            Cancelar
          </Button>
          <Button type="submit" loading={upsert.isPending}>
            {editing ? "Guardar cambios" : "Crear beneficio"}
          </Button>
        </Group>
      </Stack>
    </form>
  );

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        title="Beneficios"
        subtitle="Comparte códigos de descuento y URLs con tus clientes"
        action={{
          label: "Nuevo beneficio",
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
            <Text fw={600}>Aún no has creado ningún beneficio</Text>
            <Text size="sm" c="dimmed" ta="center" maw={420}>
              Comparte códigos de descuento de marcas con las que colaboras o
              URLs útiles para tus clientes. Cada beneficio aparecerá en su
              sección "Beneficios" con un botón para copiar el código y otro
              para ir a la URL.
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setEditing(null);
                open();
              }}
            >
              Crear el primero
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
                  <Tooltip label="Editar" withArrow>
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
                  <Tooltip label="Eliminar" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        if (window.confirm("¿Eliminar este beneficio?")) {
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
                          label={copied ? "Copiado" : "Copiar código"}
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
                    Abrir URL
                  </Button>
                )}
                {!b.is_active && (
                  <Badge variant="outline" color="gray" size="xs" mt={4}>
                    Inactivo
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
          title={editing ? "Editar beneficio" : "Nuevo beneficio"}
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
                  {editing ? "Editar beneficio" : "Nuevo beneficio"}
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
