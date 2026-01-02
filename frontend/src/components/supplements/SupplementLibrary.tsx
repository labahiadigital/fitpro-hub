import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Image,
  Modal,
  NumberInput,
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
  IconCopy,
  IconEdit,
  IconExternalLink,
  IconPill,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { EmptyState } from "../common/EmptyState";

// Types
interface Supplement {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  serving_size: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  image_url?: string;
  purchase_url?: string;
  referral_code?: string;
  referral_url?: string;
  commission_percentage?: number;
  is_public: boolean;
}

// Mock data
const mockSupplements: Supplement[] = [
  {
    id: "1",
    name: "Whey Protein Isolate",
    brand: "MyProtein",
    description: "Proteína de suero aislada de alta calidad",
    category: "Proteína",
    serving_size: "30g",
    calories: 120,
    protein: 25,
    carbs: 2,
    fat: 1,
    image_url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300",
    purchase_url: "https://myprotein.com",
    referral_code: "TRACKFIZ10",
    referral_url: "https://myprotein.com?ref=trackfiz",
    commission_percentage: 10,
    is_public: true,
  },
  {
    id: "2",
    name: "Creatina Monohidrato",
    brand: "Optimum Nutrition",
    description: "Creatina pura micronizada para mejorar rendimiento",
    category: "Rendimiento",
    serving_size: "5g",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    image_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300",
    purchase_url: "https://optimumnutrition.com",
    referral_code: "TRACKFIZ15",
    referral_url: "https://optimumnutrition.com?ref=trackfiz",
    commission_percentage: 15,
    is_public: true,
  },
  {
    id: "3",
    name: "Omega 3 Fish Oil",
    brand: "NOW Foods",
    description: "Ácidos grasos esenciales EPA y DHA",
    category: "Salud",
    serving_size: "2 cápsulas",
    calories: 20,
    protein: 0,
    carbs: 0,
    fat: 2,
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300",
    purchase_url: "https://nowfoods.com",
    referral_code: "TRACKFIZ5",
    referral_url: "https://nowfoods.com?ref=trackfiz",
    commission_percentage: 5,
    is_public: true,
  },
];

const SUPPLEMENT_CATEGORIES = [
  { value: "proteina", label: "Proteína" },
  { value: "rendimiento", label: "Rendimiento" },
  { value: "salud", label: "Salud" },
  { value: "vitaminas", label: "Vitaminas" },
  { value: "minerales", label: "Minerales" },
  { value: "pre-entreno", label: "Pre-Entreno" },
  { value: "post-entreno", label: "Post-Entreno" },
  { value: "quemadores", label: "Quemadores" },
  { value: "otros", label: "Otros" },
];

export function SupplementLibrary() {
  const [supplements] = useState<Supplement[]>(mockSupplements);
  const [search, setSearch] = useState("");
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);

  const form = useForm({
    initialValues: {
      name: "",
      brand: "",
      description: "",
      category: "",
      serving_size: "30g",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      image_url: "",
      purchase_url: "",
      referral_code: "",
      referral_url: "",
      commission_percentage: 0,
      is_public: false,
    },
  });

  const filteredSupplements = supplements.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.brand?.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (supplement?: Supplement) => {
    if (supplement) {
      setEditingSupplement(supplement);
      form.setValues({
        name: supplement.name,
        brand: supplement.brand || "",
        description: supplement.description || "",
        category: supplement.category || "",
        serving_size: supplement.serving_size,
        calories: supplement.calories || 0,
        protein: supplement.protein || 0,
        carbs: supplement.carbs || 0,
        fat: supplement.fat || 0,
        image_url: supplement.image_url || "",
        purchase_url: supplement.purchase_url || "",
        referral_code: supplement.referral_code || "",
        referral_url: supplement.referral_url || "",
        commission_percentage: supplement.commission_percentage || 0,
        is_public: supplement.is_public,
      });
    } else {
      setEditingSupplement(null);
      form.reset();
    }
    openModal();
  };

  const handleSubmit = (values: typeof form.values) => {
    notifications.show({
      title: editingSupplement ? "Suplemento actualizado" : "Suplemento creado",
      message: `${values.name} se ha ${editingSupplement ? "actualizado" : "añadido"} correctamente`,
      color: "green",
      icon: <IconCheck size={16} />,
    });
    closeModal();
    form.reset();
  };

  const copyReferralCode = (code: string) => {
    navigator.clipboard.writeText(code);
    notifications.show({
      title: "Código copiado",
      message: `Código ${code} copiado al portapapeles`,
      color: "green",
    });
  };

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <TextInput
          placeholder="Buscar suplementos..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          w={300}
        />
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Nuevo Suplemento
        </Button>
      </Group>

      {filteredSupplements.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
          {filteredSupplements.map((supplement) => (
            <Card key={supplement.id} padding="lg" radius="lg" withBorder>
              {supplement.image_url && (
                <Card.Section>
                  <Image
                    src={supplement.image_url}
                    height={160}
                    alt={supplement.name}
                    fallbackSrc="https://placehold.co/300x160?text=Suplemento"
                  />
                </Card.Section>
              )}

              <Group justify="space-between" mt="md" mb="xs">
                <Box>
                  <Text fw={600} lineClamp={1}>
                    {supplement.name}
                  </Text>
                  <Text c="dimmed" size="xs">
                    {supplement.brand}
                  </Text>
                </Box>
                {supplement.category && (
                  <Badge color="green" variant="light" size="sm">
                    {supplement.category}
                  </Badge>
                )}
              </Group>

              <Text c="dimmed" size="sm" lineClamp={2} mb="md">
                {supplement.description || "Sin descripción"}
              </Text>

              {/* Nutritional info */}
              <Group gap="xs" mb="md">
                <Badge color="blue" variant="light" size="xs">
                  {supplement.calories || 0} kcal
                </Badge>
                <Badge color="green" variant="light" size="xs">
                  P: {supplement.protein || 0}g
                </Badge>
                <Badge color="orange" variant="light" size="xs">
                  C: {supplement.carbs || 0}g
                </Badge>
                <Badge color="grape" variant="light" size="xs">
                  G: {supplement.fat || 0}g
                </Badge>
              </Group>

              {/* Referral code */}
              {supplement.referral_code && (
                <Box
                  p="xs"
                  mb="md"
                  style={{
                    backgroundColor: "var(--mantine-color-green-0)",
                    borderRadius: "var(--mantine-radius-sm)",
                    border: "1px dashed var(--mantine-color-green-4)",
                  }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Text size="xs" c="dimmed">
                        Código de referido
                      </Text>
                      <Text fw={600} c="green">
                        {supplement.referral_code}
                      </Text>
                    </Box>
                    <ActionIcon
                      color="green"
                      variant="light"
                      onClick={() => copyReferralCode(supplement.referral_code!)}
                    >
                      <IconCopy size={16} />
                    </ActionIcon>
                  </Group>
                  {supplement.commission_percentage && (
                    <Text size="xs" c="green" mt={4}>
                      Comisión: {supplement.commission_percentage}%
                    </Text>
                  )}
                </Box>
              )}

              <Group gap="xs">
                <Button
                  flex={1}
                  variant="light"
                  size="xs"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => handleOpenModal(supplement)}
                >
                  Editar
                </Button>
                {supplement.purchase_url && (
                  <ActionIcon
                    color="blue"
                    variant="light"
                    component="a"
                    href={supplement.referral_url || supplement.purchase_url}
                    target="_blank"
                  >
                    <IconExternalLink size={16} />
                  </ActionIcon>
                )}
                <ActionIcon color="red" variant="light">
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <EmptyState
          icon={<IconPill size={40} />}
          title="No hay suplementos"
          description="Añade suplementos a tu biblioteca para recomendarlos a tus clientes"
          actionLabel="Añadir Suplemento"
          onAction={() => handleOpenModal()}
        />
      )}

      {/* Modal for creating/editing supplements */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingSupplement ? "Editar Suplemento" : "Nuevo Suplemento"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Group grow>
              <TextInput
                label="Nombre"
                placeholder="Whey Protein"
                required
                {...form.getInputProps("name")}
              />
              <TextInput
                label="Marca"
                placeholder="MyProtein"
                {...form.getInputProps("brand")}
              />
            </Group>

            <Group grow>
              <Select
                label="Categoría"
                placeholder="Selecciona"
                data={SUPPLEMENT_CATEGORIES}
                {...form.getInputProps("category")}
              />
              <TextInput
                label="Porción"
                placeholder="30g"
                {...form.getInputProps("serving_size")}
              />
            </Group>

            <Textarea
              label="Descripción"
              placeholder="Descripción del suplemento..."
              minRows={2}
              {...form.getInputProps("description")}
            />

            <Group grow>
              <NumberInput
                label="Calorías"
                min={0}
                {...form.getInputProps("calories")}
              />
              <NumberInput
                label="Proteína (g)"
                min={0}
                decimalScale={1}
                {...form.getInputProps("protein")}
              />
              <NumberInput
                label="Carbos (g)"
                min={0}
                decimalScale={1}
                {...form.getInputProps("carbs")}
              />
              <NumberInput
                label="Grasas (g)"
                min={0}
                decimalScale={1}
                {...form.getInputProps("fat")}
              />
            </Group>

            <TextInput
              label="URL de imagen"
              placeholder="https://..."
              {...form.getInputProps("image_url")}
            />

            <Text fw={600} size="sm" mt="md">
              Información de Referidos
            </Text>

            <Group grow>
              <TextInput
                label="URL de compra"
                placeholder="https://tienda.com/producto"
                {...form.getInputProps("purchase_url")}
              />
              <TextInput
                label="Código de referido"
                placeholder="TRACKFIZ10"
                {...form.getInputProps("referral_code")}
              />
            </Group>

            <Group grow>
              <TextInput
                label="URL con referido"
                placeholder="https://tienda.com?ref=trackfiz"
                {...form.getInputProps("referral_url")}
              />
              <NumberInput
                label="Comisión (%)"
                min={0}
                max={100}
                {...form.getInputProps("commission_percentage")}
              />
            </Group>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSupplement ? "Guardar Cambios" : "Crear Suplemento"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}

export default SupplementLibrary;
