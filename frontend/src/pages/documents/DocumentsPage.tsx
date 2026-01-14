import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  FileInput,
  Group,
  Menu,
  Modal,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconClock,
  IconDotsVertical,
  IconDownload,
  IconEdit,
  IconEye,
  IconFileText,
  IconFolder,
  IconPlus,
  IconSend,
  IconSignature,
  IconTrash,
  IconUpload,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";

interface Document {
  id: string;
  name: string;
  type: "contract" | "consent" | "waiver" | "custom";
  status: "draft" | "sent" | "signed" | "expired";
  createdAt: string;
  sentTo?: string[];
  signedCount?: number;
  totalSent?: number;
  requiresSignature: boolean;
  fileUrl?: string;
}

interface DocumentFolder {
  id: string;
  name: string;
  documentCount: number;
  color: string;
}

export function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("documents");
  const [
    documentModalOpened,
    { open: openDocumentModal, close: closeDocumentModal },
  ] = useDisclosure(false);
  const [
    folderModalOpened,
    { open: openFolderModal, close: closeFolderModal },
  ] = useDisclosure(false);

  // Mock data
  const [documents] = useState<Document[]>([
    {
      id: "1",
      name: "Contrato de Servicios",
      type: "contract",
      status: "signed",
      createdAt: "2024-01-15",
      sentTo: ["maria@email.com", "carlos@email.com"],
      signedCount: 15,
      totalSent: 18,
      requiresSignature: true,
    },
    {
      id: "2",
      name: "Consentimiento RGPD",
      type: "consent",
      status: "sent",
      createdAt: "2024-01-10",
      sentTo: ["ana@email.com"],
      signedCount: 8,
      totalSent: 12,
      requiresSignature: true,
    },
    {
      id: "3",
      name: "Exención de Responsabilidad",
      type: "waiver",
      status: "draft",
      createdAt: "2024-01-20",
      requiresSignature: true,
    },
    {
      id: "4",
      name: "Guía de Nutrición",
      type: "custom",
      status: "signed",
      createdAt: "2024-01-05",
      requiresSignature: false,
      fileUrl: "/documents/nutrition-guide.pdf",
    },
  ]);

  const [folders] = useState<DocumentFolder[]>([
    { id: "1", name: "Contratos", documentCount: 5, color: "blue" },
    { id: "2", name: "Consentimientos", documentCount: 3, color: "green" },
    { id: "3", name: "Guías y Recursos", documentCount: 8, color: "violet" },
    { id: "4", name: "Facturas", documentCount: 12, color: "orange" },
  ]);

  const documentForm = useForm({
    initialValues: {
      name: "",
      type: "contract",
      content: "",
      requiresSignature: true,
      file: null as File | null,
    },
  });

  const folderForm = useForm({
    initialValues: {
      name: "",
      color: "blue",
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "gray";
      case "sent":
        return "blue";
      case "signed":
        return "green";
      case "expired":
        return "red";
      default:
        return "gray";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Borrador";
      case "sent":
        return "Enviado";
      case "signed":
        return "Firmado";
      case "expired":
        return "Expirado";
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "contract":
        return <IconFileText size={20} />;
      case "consent":
        return <IconCheck size={20} />;
      case "waiver":
        return <IconSignature size={20} />;
      default:
        return <IconFileText size={20} />;
    }
  };

  const totalDocuments = documents.length;
  const signedDocuments = documents.filter((d) => d.status === "signed").length;
  const pendingSignatures = documents.filter((d) => d.status === "sent").length;

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Nuevo Documento",
          icon: <IconPlus size={16} />,
          onClick: openDocumentModal,
        }}
        description="Gestiona contratos, consentimientos y documentos con firma digital"
        secondaryAction={{
          label: "Nueva Carpeta",
          icon: <IconFolder size={16} />,
          onClick: openFolderModal,
          variant: "default",
        }}
        title="Documentos"
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="lg">
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Total Documentos
              </Text>
              <Text fw={700} size="xl">
                {totalDocuments}
              </Text>
            </div>
            <ThemeIcon color="blue" radius="md" size="lg" variant="light">
              <IconFileText size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Documentos Firmados
              </Text>
              <Text fw={700} size="xl">
                {signedDocuments}
              </Text>
            </div>
            <ThemeIcon color="green" radius="md" size="lg" variant="light">
              <IconSignature size={20} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Pendientes de Firma
              </Text>
              <Text fw={700} size="xl">
                {pendingSignatures}
              </Text>
            </div>
            <ThemeIcon color="yellow" radius="md" size="lg" variant="light">
              <IconClock size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconFileText size={16} />} value="documents">
            Documentos
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconFolder size={16} />} value="folders">
            Carpetas
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconSignature size={16} />} value="templates">
            Plantillas
          </Tabs.Tab>
        </Tabs.List>

        {/* Documents Tab */}
        <Tabs.Panel value="documents">
          <Stack gap="md">
            {documents.map((doc) => (
              <Paper key={doc.id} p="md" radius="md" withBorder>
                <Group justify="space-between">
                  <Group gap="md">
                    <ThemeIcon
                      color="gray"
                      radius="md"
                      size="lg"
                      variant="light"
                    >
                      {getTypeIcon(doc.type)}
                    </ThemeIcon>
                    <div>
                      <Group gap="xs">
                        <Text fw={600}>{doc.name}</Text>
                        <Badge
                          color={getStatusColor(doc.status)}
                          size="xs"
                          variant="light"
                        >
                          {getStatusLabel(doc.status)}
                        </Badge>
                        {doc.requiresSignature && (
                          <Badge color="violet" size="xs" variant="outline">
                            Requiere firma
                          </Badge>
                        )}
                      </Group>
                      <Text c="dimmed" size="xs">
                        Creado el{" "}
                        {new Date(doc.createdAt).toLocaleDateString("es-ES")}
                      </Text>
                    </div>
                  </Group>
                  <Group gap="md">
                    {doc.totalSent && doc.totalSent > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <Group gap={4} justify="flex-end">
                          <IconUsers size={14} />
                          <Text fw={500} size="sm">
                            {doc.signedCount}/{doc.totalSent}
                          </Text>
                        </Group>
                        <Progress
                          color="green"
                          size="sm"
                          value={(doc.signedCount! / doc.totalSent) * 100}
                          w={100}
                        />
                      </div>
                    )}
                    <Group gap="xs">
                      <Tooltip label="Ver documento">
                        <ActionIcon color="gray" variant="subtle">
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Enviar">
                        <ActionIcon color="blue" variant="subtle">
                          <IconSend size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Menu shadow="md" width={150}>
                        <Menu.Target>
                          <ActionIcon color="gray" variant="subtle">
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEdit size={14} />}>
                            Editar
                          </Menu.Item>
                          <Menu.Item leftSection={<IconDownload size={14} />}>
                            Descargar
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                          >
                            Eliminar
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>

        {/* Folders Tab */}
        <Tabs.Panel value="folders">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                p="lg"
                radius="md"
                style={{ cursor: "pointer" }}
                withBorder
              >
                <Group justify="space-between" mb="md">
                  <ThemeIcon
                    color={folder.color}
                    radius="md"
                    size="xl"
                    variant="light"
                  >
                    <IconFolder size={24} />
                  </ThemeIcon>
                  <Menu shadow="md" width={150}>
                    <Menu.Target>
                      <ActionIcon color="gray" variant="subtle">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={14} />}>
                        Renombrar
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                      >
                        Eliminar
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
                <Text fw={600} mb={4}>
                  {folder.name}
                </Text>
                <Text c="dimmed" size="sm">
                  {folder.documentCount} documentos
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        {/* Templates Tab */}
        <Tabs.Panel value="templates">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {[
              { name: "Contrato de Entrenamiento", type: "contract", uses: 45 },
              { name: "Consentimiento RGPD", type: "consent", uses: 120 },
              { name: "Exención de Responsabilidad", type: "waiver", uses: 89 },
              { name: "Política de Cancelación", type: "custom", uses: 67 },
            ].map((template, index) => (
              <Card key={index} p="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <ThemeIcon
                    color="violet"
                    radius="md"
                    size="lg"
                    variant="light"
                  >
                    {getTypeIcon(template.type)}
                  </ThemeIcon>
                  <Badge color="gray" variant="light">
                    {template.uses} usos
                  </Badge>
                </Group>
                <Text fw={600} mb="xs">
                  {template.name}
                </Text>
                <Group gap="xs">
                  <Button fullWidth size="xs" variant="light">
                    Usar Plantilla
                  </Button>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>

      {/* Document Modal */}
      <Modal
        centered
        onClose={closeDocumentModal}
        opened={documentModalOpened}
        size="lg"
        title="Nuevo Documento"
      >
        <form
          onSubmit={documentForm.onSubmit((values) => {
            console.log(values);
            closeDocumentModal();
          })}
        >
          <Stack>
            <TextInput
              label="Nombre del Documento"
              placeholder="Ej: Contrato de Servicios"
              {...documentForm.getInputProps("name")}
            />
            <Select
              data={[
                { value: "contract", label: "Contrato" },
                { value: "consent", label: "Consentimiento" },
                { value: "waiver", label: "Exención de Responsabilidad" },
                { value: "custom", label: "Personalizado" },
              ]}
              label="Tipo de Documento"
              {...documentForm.getInputProps("type")}
            />
            <Textarea
              label="Contenido"
              minRows={6}
              placeholder="Escribe el contenido del documento..."
              {...documentForm.getInputProps("content")}
            />
            <FileInput
              accept=".pdf,.doc,.docx"
              label="O sube un archivo"
              leftSection={<IconUpload size={14} />}
              placeholder="Selecciona un archivo PDF"
              {...documentForm.getInputProps("file")}
            />
            <Divider />
            <Checkbox
              description="Los clientes deberán firmar este documento"
              label="Requiere firma digital"
              {...documentForm.getInputProps("requiresSignature", {
                type: "checkbox",
              })}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeDocumentModal} variant="default">
                Cancelar
              </Button>
              <Button type="submit">Crear Documento</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Folder Modal */}
      <Modal
        centered
        onClose={closeFolderModal}
        opened={folderModalOpened}
        title="Nueva Carpeta"
      >
        <form
          onSubmit={folderForm.onSubmit((values) => {
            console.log(values);
            closeFolderModal();
          })}
        >
          <Stack>
            <TextInput
              label="Nombre de la Carpeta"
              placeholder="Ej: Contratos 2024"
              {...folderForm.getInputProps("name")}
            />
            <Select
              data={[
                { value: "blue", label: "Azul" },
                { value: "green", label: "Verde" },
                { value: "violet", label: "Violeta" },
                { value: "orange", label: "Naranja" },
                { value: "red", label: "Rojo" },
              ]}
              label="Color"
              {...folderForm.getInputProps("color")}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeFolderModal} variant="default">
                Cancelar
              </Button>
              <Button type="submit">Crear Carpeta</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
