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
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
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
import api from "../../services/api";
import { PageHeader } from "../../components/common/PageHeader";
import { BottomSheet } from "../../components/common/BottomSheet";
import { EmptyState } from "../../components/common/EmptyState";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<string | null>("documents");
  const [
    documentModalOpened,
    { open: openDocumentModal, close: closeDocumentModal },
  ] = useDisclosure(false);
  const [
    folderModalOpened,
    { open: openFolderModal, close: closeFolderModal },
  ] = useDisclosure(false);

  // Note: Document storage backend is not yet implemented
  // The tables for documents don't exist in the current DB schema
  const [documents] = useState<Document[]>([]);
  const [folders] = useState<DocumentFolder[]>([]);
  const isModuleDisabled = true; // Set to false when backend is ready

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
          label: t("documents.nuevoDocumento"),
          icon: <IconPlus size={16} />,
          onClick: openDocumentModal,
        }}
        description={t("documents.gestionaContratosConsentimientosYDocumentos")}
        secondaryAction={{
          label: t("documents.nuevaCarpeta"),
          icon: <IconFolder size={16} />,
          onClick: openFolderModal,
          variant: "default",
        }}
        title={t("documents.documentos")}
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl" spacing="lg">
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                {t("documents.totalDocumentos")}
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
                {t("documents.documentosFirmados")}
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
                {t("documents.pendientesDeFirma")}
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

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "documents", label: t("documents.documentos") },
            { value: "folders", label: t("documents.carpetas") },
            { value: "templates", label: t("documents.plantillas") },
            { value: "exports", label: t("documents.exportaciones") },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs onChange={setActiveTab} value={activeTab}>
        {!isMobile && (
        <Tabs.List mb="lg">
          <Tabs.Tab leftSection={<IconFileText size={16} />} value="documents">
            {t("documents.documentos")}
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconFolder size={16} />} value="folders">
            {t("documents.carpetas")}
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconSignature size={16} />} value="templates">
            {t("documents.plantillas")}
          </Tabs.Tab>
          <Tabs.Tab leftSection={<IconDownload size={16} />} value="exports">
            {t("documents.exportaciones")}
          </Tabs.Tab>
        </Tabs.List>
        )}

        {/* Documents Tab */}
        <Tabs.Panel value="documents">
          {isModuleDisabled ? (
            <EmptyState
              icon={<IconFileText size={48} />}
              title={t("documents.moduloEnDesarrollo")}
              description={t("documents.laGestionDeDocumentosEstara")}
            />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<IconFileText size={48} />}
              title={t("documents.noHayDocumentos")}
              description={t("documents.creaTuPrimerDocumentoPara")}
              actionLabel={t("documents.crearDocumento")}
              onAction={openDocumentModal}
            />
          ) : (
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
                            {t("documents.requiereFirma")}
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
                      <Tooltip label={t("documents.verDocumento")}>
                        <ActionIcon color="gray" variant="subtle">
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t("documents.enviar")}>
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
                            {t("documents.editar")}
                          </Menu.Item>
                          <Menu.Item leftSection={<IconDownload size={14} />}>
                            {t("documents.descargar")}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                          >
                            {t("documents.eliminar")}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
          )}
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
                        {t("documents.renombrar")}
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                      >
                        {t("documents.eliminar")}
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
                    {t("documents.usarPlantilla")}
                  </Button>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
        {/* Exports Tab */}
        <Tabs.Panel value="exports">
          <Stack gap="lg">
            <Text c="dimmed" size="sm">
              {t("documents.descargaLosDatosGeneradosPor")}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              <Card p="lg" radius="md" withBorder>
                <Group mb="sm">
                  <ThemeIcon size="lg" color="green" variant="light" radius="md">
                    <IconDownload size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">{t("documents.stockInventario")}</Text>
                    <Text size="xs" c="dimmed">{t("documents.exportaTodoElInventarioActual")}</Text>
                  </div>
                </Group>
                <Button size="sm" variant="light" color="green" fullWidth leftSection={<IconDownload size={14} />}
                  onClick={async () => {
                    try {
                      const response = await api.get("/stock/export", { responseType: "blob" });
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement("a");
                      link.href = url;
                      link.setAttribute("download", `stock_${new Date().toISOString().split("T")[0]}.xlsx`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                    } catch { /* ignore */ }
                  }}
                >
                  {t("documents.descargarExcel")}
                </Button>
              </Card>

              <Card p="lg" radius="md" withBorder>
                <Group mb="sm">
                  <ThemeIcon size="lg" color="blue" variant="light" radius="md">
                    <IconUsers size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">{t("documents.clientes")}</Text>
                    <Text size="xs" c="dimmed">{t("documents.exportaElListadoDeClientes")}</Text>
                  </div>
                </Group>
                <Tooltip label={t("documents.proximamente")}>
                  <Button size="sm" variant="light" fullWidth disabled leftSection={<IconDownload size={14} />}>
                    {t("documents.descargarExcel")}
                  </Button>
                </Tooltip>
              </Card>

              <Card p="lg" radius="md" withBorder>
                <Group mb="sm">
                  <ThemeIcon size="lg" color="orange" variant="light" radius="md">
                    <IconFileText size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">{t("documents.facturas")}</Text>
                    <Text size="xs" c="dimmed">{t("documents.exportaElRegistroDeFacturas")}</Text>
                  </div>
                </Group>
                <Tooltip label={t("documents.proximamente")}>
                  <Button size="sm" variant="light" fullWidth disabled leftSection={<IconDownload size={14} />}>
                    {t("documents.descargarExcel")}
                  </Button>
                </Tooltip>
              </Card>

              <Card p="lg" radius="md" withBorder>
                <Group mb="sm">
                  <ThemeIcon size="lg" color="violet" variant="light" radius="md">
                    <IconClock size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">{t("documents.registroHorario")}</Text>
                    <Text size="xs" c="dimmed">{t("documents.exportaFichajesDelEquipo")}</Text>
                  </div>
                </Group>
                <Tooltip label={t("documents.proximamente")}>
                  <Button size="sm" variant="light" fullWidth disabled leftSection={<IconDownload size={14} />}>
                    {t("documents.descargarExcel")}
                  </Button>
                </Tooltip>
              </Card>

              <Card p="lg" radius="md" withBorder>
                <Group mb="sm">
                  <ThemeIcon size="lg" color="teal" variant="light" radius="md">
                    <IconFileText size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">{t("documents.pdfsGenerados")}</Text>
                    <Text size="xs" c="dimmed">{t("documents.historialDePdfsDelSistema")}</Text>
                  </div>
                </Group>
                <Tooltip label={t("documents.proximamente")}>
                  <Button size="sm" variant="light" fullWidth disabled leftSection={<IconDownload size={14} />}>
                    {t("documents.verHistorial")}
                  </Button>
                </Tooltip>
              </Card>
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Document Modal */}
      <BottomSheet
        centered
        onClose={closeDocumentModal}
        opened={documentModalOpened}
        size="lg"
        title={t("documents.nuevoDocumento")}
      >
        <form
          onSubmit={documentForm.onSubmit((_values) => {
            closeDocumentModal();
          })}
        >
          <Stack>
            <TextInput
              label={t("documents.nombreDelDocumento")}
              placeholder={t("documents.ejContratoDeServicios")}
              {...documentForm.getInputProps("name")}
            />
            <Select
              data={[
                { value: "contract", label: t("documents.contrato") },
                { value: "consent", label: t("documents.consentimiento") },
                { value: "waiver", label: t("documents.exencionDeResponsabilidad") },
                { value: "custom", label: t("documents.personalizado") },
              ]}
              label={t("documents.tipoDeDocumento")}
              {...documentForm.getInputProps("type")}
            />
            <Textarea
              label={t("documents.contenido")}
              minRows={6}
              placeholder={t("documents.escribeElContenidoDelDocumento")}
              {...documentForm.getInputProps("content")}
            />
            <FileInput
              accept=".pdf,.doc,.docx"
              label={t("documents.oSubeUnArchivo")}
              leftSection={<IconUpload size={14} />}
              placeholder={t("documents.seleccionaUnArchivoPdf")}
              {...documentForm.getInputProps("file")}
            />
            <Divider />
            <Checkbox
              description={t("documents.losClientesDeberanFirmarEste")}
              label={t("documents.requiereFirmaDigital")}
              {...documentForm.getInputProps("requiresSignature", {
                type: "checkbox",
              })}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeDocumentModal} variant="default">
                {t("documents.cancelar")}
              </Button>
              <Button type="submit">{t("documents.crearDocumento")}</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Folder Modal */}
      <BottomSheet
        centered
        onClose={closeFolderModal}
        opened={folderModalOpened}
        title={t("documents.nuevaCarpeta")}
      >
        <form
          onSubmit={folderForm.onSubmit((_values) => {
            closeFolderModal();
          })}
        >
          <Stack>
            <TextInput
              label={t("documents.nombreDeLaCarpeta")}
              placeholder={t("documents.ejContratos2024")}
              {...folderForm.getInputProps("name")}
            />
            <Select
              data={[
                { value: "blue", label: t("documents.azul") },
                { value: "green", label: t("documents.verde") },
                { value: "violet", label: t("documents.violeta") },
                { value: "orange", label: t("documents.naranja") },
                { value: "red", label: t("documents.rojo") },
              ]}
              label={t("documents.color")}
              {...folderForm.getInputProps("color")}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={closeFolderModal} variant="default">
                {t("documents.cancelar")}
              </Button>
              <Button type="submit">{t("documents.crearCarpeta")}</Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}
