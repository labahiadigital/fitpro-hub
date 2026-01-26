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
} from "@mantine/core";
import {
  IconDownload,
  IconEye,
  IconFile,
  IconFileText,
  IconPhoto,
  IconUpload,
} from "@tabler/icons-react";
// TODO: Will use auth when documents API is implemented
// import { useAuthStore } from "../../stores/auth";

// TODO: Replace with real API calls when documents API is implemented
// Currently using placeholder data
const mockDocumentsData = {
  documents: [
    {
      id: 1,
      name: "Plan de entrenamiento - Enero 2026",
      type: "pdf",
      size: "245 KB",
      date: "15 Ene 2026",
      category: "Entrenamientos",
    },
    {
      id: 2,
      name: "Plan nutricional personalizado",
      type: "pdf",
      size: "180 KB",
      date: "10 Ene 2026",
      category: "Nutrición",
    },
    {
      id: 3,
      name: "Consentimiento informado",
      type: "pdf",
      size: "95 KB",
      date: "1 Ene 2026",
      category: "Legal",
    },
    {
      id: 4,
      name: "Guía de ejercicios en casa",
      type: "pdf",
      size: "1.2 MB",
      date: "1 Ene 2026",
      category: "Recursos",
    },
    {
      id: 5,
      name: "Informe de progreso - Diciembre",
      type: "pdf",
      size: "320 KB",
      date: "31 Dic 2025",
      category: "Informes",
    },
  ],
  categories: ["Todos", "Entrenamientos", "Nutrición", "Informes", "Legal", "Recursos"],
};

function getFileIcon(type: string) {
  switch (type) {
    case "pdf":
      return IconFileText;
    case "image":
      return IconPhoto;
    default:
      return IconFile;
  }
}

export function MyDocumentsPage() {
  // TODO: In the future, filter documents by user when documents API is ready
  const data = mockDocumentsData;

  return (
    <Box p="xl">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={2}>Mis Documentos</Title>
          <Text c="dimmed">Documentos compartidos por tu entrenador</Text>
        </Box>
        <Button leftSection={<IconUpload size={16} />} variant="light">
          Subir documento
        </Button>
      </Group>

      {/* Categories */}
      <Group gap="xs" mb="xl">
        {data.categories.map((category, index) => (
          <Button
            key={index}
            variant={index === 0 ? "filled" : "light"}
            color={index === 0 ? "yellow" : "gray"}
            size="sm"
            radius="xl"
          >
            {category}
          </Button>
        ))}
      </Group>

      {/* Documents Table */}
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
            {data.documents.map((doc) => {
              const FileIcon = getFileIcon(doc.type);
              return (
                <Table.Tr key={doc.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <ThemeIcon variant="light" color="red" size="sm">
                        <FileIcon size={14} />
                      </ThemeIcon>
                      <Text fw={500}>{doc.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray">{doc.category}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{doc.size}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{doc.date}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <ActionIcon variant="light" color="blue">
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="green">
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
}
