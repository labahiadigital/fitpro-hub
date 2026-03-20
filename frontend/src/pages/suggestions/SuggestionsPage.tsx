import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBulb,
  IconChevronUp,
  IconEye,
  IconEyeOff,
  IconMessageCircle,
  IconPlus,
  IconSend,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuthStore } from "../../stores/auth";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  author: string;
  authorRole: "trainer" | "client";
  isPublic: boolean;
  votes: number;
  votedByMe: boolean;
  createdAt: string;
  status: "nueva" | "en_revisión" | "planificada" | "completada";
}

const INITIAL_SUGGESTIONS: Suggestion[] = [
  {
    id: "1",
    title: "Añadir temporizador de descanso entre series",
    description: "Sería muy útil tener un cronómetro configurable que me avise cuando termina el descanso entre series durante el entrenamiento.",
    author: "María García",
    authorRole: "client",
    isPublic: true,
    votes: 12,
    votedByMe: false,
    createdAt: "2026-03-15T10:30:00Z",
    status: "planificada",
  },
  {
    id: "2",
    title: "Exportar rutinas a PDF",
    description: "Poder descargar las rutinas asignadas en formato PDF para verlas offline o imprimirlas.",
    author: "Carlos López",
    authorRole: "client",
    isPublic: true,
    votes: 8,
    votedByMe: true,
    createdAt: "2026-03-12T14:00:00Z",
    status: "en_revisión",
  },
  {
    id: "3",
    title: "Integración con Apple Health / Google Fit",
    description: "Sincronizar datos de actividad y pasos desde las apps de salud del teléfono para tener todo centralizado.",
    author: "Ana Martínez",
    authorRole: "client",
    isPublic: true,
    votes: 15,
    votedByMe: false,
    createdAt: "2026-03-10T09:15:00Z",
    status: "nueva",
  },
  {
    id: "4",
    title: "Notificaciones push para recordatorios",
    description: "Recibir notificaciones push en el móvil cuando tengo una sesión programada o un recordatorio de entrenamiento.",
    author: "Pedro Sánchez",
    authorRole: "client",
    isPublic: true,
    votes: 6,
    votedByMe: false,
    createdAt: "2026-03-08T16:45:00Z",
    status: "nueva",
  },
  {
    id: "5",
    title: "Comparar progreso de fotos mes a mes",
    description: "Una vista tipo lado a lado para comparar las fotos de progreso de diferentes meses de forma visual.",
    author: "Laura Fernández",
    authorRole: "client",
    isPublic: true,
    votes: 10,
    votedByMe: false,
    createdAt: "2026-03-05T11:20:00Z",
    status: "completada",
  },
];

const STATUS_CONFIG: Record<Suggestion["status"], { color: string; label: string }> = {
  nueva: { color: "blue", label: "Nueva" },
  en_revisión: { color: "yellow", label: "En revisión" },
  planificada: { color: "violet", label: "Planificada" },
  completada: { color: "green", label: "Completada" },
};

export function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL_SUGGESTIONS);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuthStore();

  const form = useForm({
    initialValues: {
      title: "",
      description: "",
      isPublic: true,
    },
    validate: {
      title: (v) => (v.length < 3 ? "El título debe tener al menos 3 caracteres" : null),
      description: (v) => (v.length < 10 ? "La descripción debe tener al menos 10 caracteres" : null),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    const newSuggestion: Suggestion = {
      id: Date.now().toString(),
      title: values.title,
      description: values.description,
      author: user?.full_name || "Usuario",
      authorRole: user?.role === "client" ? "client" : "trainer",
      isPublic: values.isPublic,
      votes: 0,
      votedByMe: false,
      createdAt: new Date().toISOString(),
      status: "nueva",
    };
    setSuggestions((prev) => [newSuggestion, ...prev]);
    form.reset();
    setShowForm(false);
  };

  const handleVote = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, votes: s.votedByMe ? s.votes - 1 : s.votes + 1, votedByMe: !s.votedByMe }
          : s
      )
    );
  };

  const sortedSuggestions = [...suggestions]
    .filter((s) => s.isPublic)
    .sort((a, b) => b.votes - a.votes);

  const totalSuggestions = suggestions.length;
  const publicSuggestions = suggestions.filter((s) => s.isPublic).length;
  const plannedOrDone = suggestions.filter((s) => s.status === "planificada" || s.status === "completada").length;

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setShowForm(!showForm)}
          >
            Nueva Sugerencia
          </Button>
        }
        description="Propón ideas y vota las sugerencias de la comunidad"
        title="Buzón de Sugerencias"
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="md">
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Total Sugerencias</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-primary)" }}>
                {totalSuggestions}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
              <IconBulb size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Sugerencias Públicas</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-brand)" }}>
                {publicSuggestions}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "rgba(190, 75, 219, 0.1)", color: "var(--nv-brand)" }}>
              <IconMessageCircle size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">Planificadas / Completadas</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-success)" }}>
                {plannedOrDone}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "var(--nv-success-bg)", color: "var(--nv-success)" }}>
              <IconSparkles size={24} />
            </ThemeIcon>
          </Group>
        </Box>
      </SimpleGrid>

      {/* Submit Form */}
      {showForm && (
        <Box className="nv-card" p="lg" mb="xl">
          <Group gap="sm" mb="md">
            <ThemeIcon size="lg" radius="xl" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
              <IconBulb size={20} />
            </ThemeIcon>
            <Text fw={600} size="lg" style={{ color: "var(--nv-text-primary)" }}>
              Enviar nueva sugerencia
            </Text>
          </Group>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Título"
                placeholder="¿Qué te gustaría proponer?"
                {...form.getInputProps("title")}
              />
              <Textarea
                label="Descripción"
                placeholder="Describe tu idea con detalle para que podamos entenderla mejor..."
                minRows={3}
                {...form.getInputProps("description")}
              />
              <Group justify="space-between">
                <Switch
                  label="Hacer pública"
                  description="Las sugerencias públicas pueden ser votadas por otros usuarios"
                  {...form.getInputProps("isPublic", { type: "checkbox" })}
                />
                <Group gap="sm">
                  <Button variant="default" onClick={() => { setShowForm(false); form.reset(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" leftSection={<IconSend size={16} />}>
                    Enviar
                  </Button>
                </Group>
              </Group>
            </Stack>
          </form>
        </Box>
      )}

      {/* Suggestions List */}
      <Stack gap="md">
        {sortedSuggestions.map((suggestion) => {
          const statusConfig = STATUS_CONFIG[suggestion.status];
          return (
            <Box key={suggestion.id} className="nv-card" p="lg">
              <Group align="flex-start" gap="lg" wrap="nowrap">
                {/* Vote Column */}
                <Stack align="center" gap={2} style={{ minWidth: 48 }}>
                  <ActionIcon
                    variant={suggestion.votedByMe ? "filled" : "light"}
                    color={suggestion.votedByMe ? "var(--nv-primary)" : "gray"}
                    radius="xl"
                    size="lg"
                    onClick={() => handleVote(suggestion.id)}
                    style={suggestion.votedByMe ? { backgroundColor: "var(--nv-primary)", color: "#fff" } : {}}
                  >
                    <IconChevronUp size={18} />
                  </ActionIcon>
                  <Text fw={700} size="lg" style={{ color: suggestion.votedByMe ? "var(--nv-primary)" : "var(--nv-text-primary)" }}>
                    {suggestion.votes}
                  </Text>
                </Stack>

                {/* Content */}
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group justify="space-between" mb={4} wrap="wrap">
                    <Group gap="xs">
                      <Text fw={600} size="md" style={{ color: "var(--nv-text-primary)" }}>
                        {suggestion.title}
                      </Text>
                      <Badge
                        color={statusConfig.color}
                        variant="light"
                        size="sm"
                        radius="xl"
                      >
                        {statusConfig.label}
                      </Badge>
                    </Group>
                    <Group gap={4}>
                      {suggestion.isPublic ? (
                        <IconEye size={14} color="var(--nv-text-tertiary)" />
                      ) : (
                        <IconEyeOff size={14} color="var(--nv-text-tertiary)" />
                      )}
                      <Text size="xs" c="dimmed">
                        {suggestion.isPublic ? "Pública" : "Privada"}
                      </Text>
                    </Group>
                  </Group>

                  <Text size="sm" c="dimmed" mb="sm" style={{ lineHeight: 1.5 }}>
                    {suggestion.description}
                  </Text>

                  <Group gap="md">
                    <Text size="xs" c="dimmed">
                      Por <Text span fw={500} size="xs" style={{ color: "var(--nv-text-secondary)" }}>{suggestion.author}</Text>
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(suggestion.createdAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </Group>
                </Box>
              </Group>
            </Box>
          );
        })}

        {sortedSuggestions.length === 0 && (
          <Box className="nv-card" p="xl" ta="center">
            <ThemeIcon size={64} radius="xl" variant="light" mx="auto" mb="md" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
              <IconBulb size={32} />
            </ThemeIcon>
            <Text fw={600} size="lg" mb="xs" style={{ color: "var(--nv-text-primary)" }}>
              Sin sugerencias todavía
            </Text>
            <Text c="dimmed" size="sm" mb="lg">
              Sé el primero en proponer una idea para mejorar la plataforma
            </Text>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setShowForm(true)}>
              Nueva Sugerencia
            </Button>
          </Box>
        )}
      </Stack>
    </Container>
  );
}

export default SuggestionsPage;
