import {
  Box,
  Card,
  Group,
  Text,
  Title,
  Badge,
  Button,
  Table,
  ThemeIcon,
  ActionIcon,
  Loader,
  Center,
  FileButton,
  Select,
  Stack,
} from "@mantine/core";
import {
  IconDownload,
  IconFile,
  IconFileText,
  IconPhoto,
  IconUpload,
  IconTrash,
  IconFileSpreadsheet,
} from "@tabler/icons-react";
import { clientPortalApi } from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { notifications } from "@mantine/notifications";

interface DocumentItem {
  id: string;
  name: string;
  original_filename: string;
  file_url: string;
  file_size: number | null;
  content_type: string | null;
  category: string;
  created_at: string;
}

const CATEGORIES = ["Todos", "Entrenamientos", "Nutrición", "Informes", "Legal", "Recursos", "general"];

function getFileIcon(contentType: string | null) {
  if (!contentType) return IconFile;
  if (contentType.startsWith("image/")) return IconPhoto;
  if (contentType.includes("spreadsheet") || contentType.includes("csv")) return IconFileSpreadsheet;
  if (contentType.includes("pdf") || contentType.includes("text")) return IconFileText;
  return IconFile;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MyDocumentsPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery<DocumentItem[]>({
    queryKey: ["my-documents", selectedCategory],
    queryFn: async () => {
      const res = await clientPortalApi.documents(
        selectedCategory !== "Todos" ? selectedCategory : undefined
      );
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientPortalApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
      notifications.show({ title: "Eliminado", message: "Documento eliminado", color: "blue" });
    },
    onError: () => {
      notifications.show({ title: "Error", message: "No se pudo eliminar", color: "red" });
    },
  });

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await clientPortalApi.uploadDocument(formData, "general", file.name);
      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
      notifications.show({
        title: "Subido",
        message: "Documento subido correctamente",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo subir el documento",
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mis Documentos</Title>
          <Text c="dimmed">Documentos compartidos por tu entrenador</Text>
        </Box>
        <FileButton onChange={handleUpload} accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt">
          {(props) => (
            <Button
              {...props}
              leftSection={<IconUpload size={16} />}
              variant="light"
              loading={uploading}
            >
              Subir documento
            </Button>
          )}
        </FileButton>
      </Group>

      <Group gap="xs" mb="xl" wrap="wrap">
        <Select
          value={selectedCategory}
          onChange={(v) => setSelectedCategory(v || "Todos")}
          data={CATEGORIES}
          size="sm"
          w={200}
        />
      </Group>

      {isLoading ? (
        <Center py="xl"><Loader /></Center>
      ) : documents.length === 0 ? (
        <Card shadow="sm" padding="xl" radius="lg" withBorder>
          <Stack align="center" gap="md" py="xl">
            <IconFile size={48} color="var(--mantine-color-dimmed)" />
            <Text fw={600}>No hay documentos</Text>
            <Text size="sm" c="dimmed">
              {selectedCategory !== "Todos"
                ? `No hay documentos en la categoría "${selectedCategory}".`
                : "Aún no tienes documentos. Sube uno o espera a que tu entrenador comparta archivos contigo."}
            </Text>
          </Stack>
        </Card>
      ) : (
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Documento</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Tamaño</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th ta="right">Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {documents.map((doc) => {
                const FileIcon = getFileIcon(doc.content_type);
                return (
                  <Table.Tr key={doc.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <ThemeIcon variant="light" color="red" size="sm">
                          <FileIcon size={14} />
                        </ThemeIcon>
                        <Text fw={500} lineClamp={1}>{doc.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray">{doc.category}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{formatSize(doc.file_size)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{formatDate(doc.created_at)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon
                          variant="light"
                          color="green"
                          component="a"
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            if (window.confirm("¿Eliminar este documento?")) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Box>
  );
}
