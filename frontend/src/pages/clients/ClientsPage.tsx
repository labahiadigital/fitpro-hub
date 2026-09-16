import {
  Box,
  Button,
  ColorInput,
  Container,
  Group,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Badge,
  Avatar,
  ActionIcon,
  Menu,
  Table,
  SegmentedControl,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconTag,
  IconUsers,
  IconUserPlus,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconMail,
  IconPhone,
  IconCalendar,
  IconSend,
  IconCheck,
  IconUserCheck,
  IconTrashX,
  IconRestore,
  IconRefresh,
  IconKey,
  IconShoppingCartX,
  IconClipboardList,
  IconBellRinging,
  IconActivityHeartbeat,
  IconMailOpened,
  IconMailX,
  IconBan,
  IconTrophy,
  IconX,
} from "@tabler/icons-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClientCell,
  DataTable,
  StatusBadge,
  TagsList,
} from "../../components/common/DataTable";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import {
  useClients,
  useClientTags,
  useCreateClient,
  useCreateClientTag,
  useDeleteClient,
  usePermanentDeleteClient,
  useRestoreClient,
  useUpdateClient,
} from "../../hooks/useClients";
import { useCreateInvitation, useInvitations, useResendInvitation, useCancelInvitation } from "../../hooks/useInvitations";
import {
  usePendingSystemFormClients,
  useInactiveSubscriptionClients,
  useAbandonedCart,
  useDeleteAbandonedCart,
  useCancelPendingSystemForm,
  useInvitationsTracking,
  useResendSystemForm,
  useCampaignTemplates,
  useSendCampaign,
  type AbandonedCartFilter,
} from "../../hooks/useClientSegments";
import { useQuery } from "@tanstack/react-query";
import { api, productsApi } from "../../services/api";
import { useAuthStore } from "../../stores/auth";
import { BottomSheet } from "../../components/common/BottomSheet";
import { formatDecimal } from "../../utils/format";
import { useTranslation } from "react-i18next";

function getClientStatus(client: { is_active: boolean; has_user_account?: boolean }): string {
  if (!client.is_active) return "inactive";
  if (!client.has_user_account) return "pending";
  return "active";
}

// Componente de tarjeta de cliente para vista de grid
function ClientCard({
  client,
  onView,
  onResetPassword,
}: {
  client: any;
  onView: () => void;
  onResetPassword?: (client: any) => void;
}) {
  const { t } = useTranslation();
  return (
    <Box 
      className="nv-card" 
      p="lg"
      style={{ cursor: "pointer" }}
      onClick={onView}
    >
      <Group justify="space-between" mb="md">
        <Group gap="md">
          <Avatar 
            size={50} 
            radius="xl" 
            src={client.avatar_url}
            styles={{
              root: {
                border: "3px solid var(--nv-surface-subtle)",
                boxShadow: "var(--shadow-sm)"
              }
            }}
          >
            {client.first_name?.[0]}{client.last_name?.[0]}
          </Avatar>
          <Box>
            <Text fw={700} size="md" style={{ color: "var(--nv-dark)" }}>
              {client.first_name} {client.last_name}
            </Text>
            <Group gap="xs">
              <IconMail size={12} color="var(--nv-slate-light)" />
              <Text size="xs" c="dimmed">{client.email}</Text>
            </Group>
          </Box>
        </Group>
        <Menu position="bottom-end" withArrow shadow="lg">
          <Menu.Target>
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              radius="xl"
              onClick={(e) => e.stopPropagation()}
            >
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEye size={14} />} onClick={onView}>
              {t("clients.verPerfil")}
            </Menu.Item>
            <Menu.Item leftSection={<IconEdit size={14} />}>
              {"Editar"}
            </Menu.Item>
            {onResetPassword && client.email && !client.deleted_at && (
              <Menu.Item
                leftSection={<IconKey size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onResetPassword(client);
                }}
              >
                {t("clients.restablecerContrasena")}
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item leftSection={<IconTrash size={14} />} color="red">
              {"Eliminar"}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Group gap="xs" mb="md">
        {client.tags?.slice(0, 2).map((tag: any, i: number) => (
          <Badge 
            key={i} 
            size="sm" 
            variant="light"
            radius="xl"
            styles={{
              root: {
                backgroundColor: `${tag.color}15`,
                color: tag.color,
                border: `1px solid ${tag.color}30`,
              }
            }}
          >
            {tag.name}
          </Badge>
        ))}
        {client.tags?.length > 2 && (
          <Badge size="sm" variant="light" radius="xl" color="gray">
            +{client.tags.length - 2}
          </Badge>
        )}
      </Group>

      <Group justify="space-between" pt="sm" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <Group gap="xs">
          <IconPhone size={14} color="var(--nv-slate-light)" />
          <Text size="xs" c="dimmed">{client.phone || "Sin teléfono"}</Text>
        </Group>
        <StatusBadge status={getClientStatus(client)} />
      </Group>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Componentes auxiliares para los nuevos segmentos
// ---------------------------------------------------------------------------

interface SegmentClientItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  full_name: string;
  last_payment_at: string | null;
  subscription_cancelled_at: string | null;
  marketing_consent: boolean | null;
  pending_submission_id: string | null;
  last_email_sent_at?: string | null;
  last_email_subject?: string | null;
  last_email_status?: string | null;
  email_read?: boolean;
}

interface SegmentClientListProps {
  loading: boolean;
  items: SegmentClientItem[];
  emptyTitle: string;
  emptyDesc: string;
  extraColumn?: { title: string; render: (c: SegmentClientItem) => React.ReactNode };
  rowAction?: (c: SegmentClientItem) => React.ReactNode;
  headerExtras?: React.ReactNode;
  checkboxes?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (s: Set<string>) => void;
  onRowClick?: (c: SegmentClientItem) => void;
}

function SegmentClientList({
  loading,
  items,
  emptyTitle,
  emptyDesc,
  extraColumn,
  rowAction,
  headerExtras,
  checkboxes,
  selectedIds,
  onSelectionChange,
  onRowClick,
}: SegmentClientListProps) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Box className="nv-card" p="lg">
        <Group justify="center"><Text size="sm" c="dimmed">{t("clients.cargandoSegmento")}</Text></Group>
      </Box>
    );
  }
  if (items.length === 0) {
    return <EmptyState icon={<IconUsers size={48} />} title={emptyTitle} description={emptyDesc} />;
  }
  const allSelected = checkboxes && selectedIds && items.length > 0 && items.every((c) => selectedIds.has(c.id));
  return (
    <Box className="nv-card" style={{ border: "1px solid var(--border-subtle)" }}>
      {headerExtras && (
        <Group justify="flex-end" p="sm" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {headerExtras}
        </Group>
      )}
      <ScrollArea type="auto">
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              {checkboxes && (
                <Table.Th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected || false}
                    onChange={(e) => {
                      if (!onSelectionChange) return;
                      if (e.target.checked) {
                        onSelectionChange(new Set(items.map((c) => c.id)));
                      } else {
                        onSelectionChange(new Set());
                      }
                    }}
                  />
                </Table.Th>
              )}
              <Table.Th><Text fw={700} size="xs" tt="uppercase">{"Cliente"}</Text></Table.Th>
              <Table.Th visibleFrom="sm"><Text fw={700} size="xs" tt="uppercase">{"Email"}</Text></Table.Th>
              {extraColumn && <Table.Th visibleFrom="sm"><Text fw={700} size="xs" tt="uppercase">{extraColumn.title}</Text></Table.Th>}
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((c) => (
              <Table.Tr
                key={c.id}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName === "INPUT") return;
                  if ((e.target as HTMLElement).closest("button")) return;
                  if (onRowClick) onRowClick(c);
                }}
              >
                {checkboxes && (
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(c.id) || false}
                      onChange={(e) => {
                        if (!selectedIds || !onSelectionChange) return;
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(c.id);
                        else next.delete(c.id);
                        onSelectionChange(next);
                      }}
                    />
                  </Table.Td>
                )}
                <Table.Td>
                  <Group gap="sm">
                    <Avatar size={32} radius="xl" src={c.avatar_url || undefined}>
                      {(c.first_name[0] || "")}{(c.last_name[0] || "")}
                    </Avatar>
                    <Box>
                      <Text size="sm" fw={600}>{c.full_name}</Text>
                      {c.phone && <Text size="xs" c="dimmed">{c.phone}</Text>}
                    </Box>
                  </Group>
                </Table.Td>
                <Table.Td visibleFrom="sm"><Text size="sm">{c.email}</Text></Table.Td>
                {extraColumn && (
                  <Table.Td visibleFrom="sm"><Text size="sm">{extraColumn.render(c)}</Text></Table.Td>
                )}
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    {rowAction && rowAction(c)}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Box>
  );
}

interface AbandonedCartItemView {
  invitation_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  product_name: string | null;
  product_amount: number | null;
  invited_at: string;
  expires_at: string;
  last_email_sent_at: string | null;
  last_email_subject: string | null;
  last_email_status: string | null;
  marketing_consent: boolean | null;
  won: boolean;
  invitation_status: string;
  email_read: boolean;
}

function AbandonedCartList({
  loading,
  items,
  marketingFilter,
  onMarketingFilterChange,
  statusFilter,
  onStatusFilterChange,
  selectedRecipients,
  onSelectionChange,
  onSendCampaign,
  onDelete,
  isDeleting,
  onRowClick,
}: {
  loading: boolean;
  items: AbandonedCartItemView[];
  marketingFilter: null | true | false;
  onMarketingFilterChange: (v: null | true | false) => void;
  statusFilter: AbandonedCartFilter;
  onStatusFilterChange: (v: AbandonedCartFilter) => void;
  selectedRecipients: Set<string>;
  onSelectionChange: (s: Set<string>) => void;
  onSendCampaign: () => void;
  onDelete: (invitationId: string) => void;
  isDeleting: boolean;
  onRowClick: (invId: string) => void;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Box className="nv-card" p="lg"><Text size="sm" c="dimmed">{t("clients.cargandoCarrito")}</Text></Box>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconShoppingCartX size={48} />}
        title={t("clients.noHayCarritos")}
        description={t("clients.aquiApareceranLasInvitacionesCon")}
      />
    );
  }
  // Sólo dejamos seleccionar abandonados para enviar recordatorio: no
  // tiene sentido enviar otro email a quien ya pagó.
  const selectableItems = items.filter((i) => !i.won);
  const allSelected =
    selectedRecipients.size > 0 &&
    selectableItems.length > 0 &&
    selectableItems.every((i) => selectedRecipients.has(i.invitation_id));
  return (
    <Box className="nv-card" style={{ border: "1px solid var(--border-subtle)" }}>
      <Group justify="space-between" p="sm" style={{ borderBottom: "1px solid var(--border-subtle)" }} wrap="wrap">
        <Group gap="xs" wrap="wrap">
          <SegmentedControl
            size="xs"
            radius="xl"
            value={statusFilter}
            onChange={(value) => onStatusFilterChange(value as AbandonedCartFilter)}
            data={[
              { label: "Abandonados", value: "abandoned" },
              { label: "Ganados", value: "won" },
              { label: "Todos", value: "all" },
            ]}
          />
          <SegmentedControl
            size="xs"
            radius="xl"
            value={marketingFilter === null ? "all" : marketingFilter ? "yes" : "no"}
            onChange={(value) =>
              onMarketingFilterChange(value === "all" ? null : value === "yes" ? true : false)
            }
            data={[
              { label: "Todos", value: "all" },
              { label: "Acepta marketing", value: "yes" },
              { label: "No acepta", value: "no" },
            ]}
          />
        </Group>
        <Button
          size="xs"
          variant="filled"
          color="orange"
          radius="xl"
          leftSection={<IconSend size={14} />}
          disabled={selectedRecipients.size === 0}
          onClick={onSendCampaign}
        >
          Enviar recordatorio ({selectedRecipients.size})
        </Button>
      </Group>
      <ScrollArea type="auto">
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked) onSelectionChange(new Set(selectableItems.map((i) => i.invitation_id)));
                    else onSelectionChange(new Set());
                  }}
                />
              </Table.Th>
              <Table.Th><Text fw={700} size="xs" tt="uppercase">{"Email"}</Text></Table.Th>
              <Table.Th visibleFrom="sm"><Text fw={700} size="xs" tt="uppercase">{"Producto"}</Text></Table.Th>
              <Table.Th visibleFrom="sm"><Text fw={700} size="xs" tt="uppercase">{"Invitado"}</Text></Table.Th>
              <Table.Th><Text fw={700} size="xs" tt="uppercase">{"Email"}</Text></Table.Th>
              <Table.Th><Text fw={700} size="xs" tt="uppercase">{"Estado"}</Text></Table.Th>
              <Table.Th visibleFrom="md"><Text fw={700} size="xs" tt="uppercase">{"Marketing"}</Text></Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((i) => (
              <Table.Tr
                key={i.invitation_id}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName === "INPUT") return;
                  onRowClick(i.invitation_id);
                }}
              >
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedRecipients.has(i.invitation_id)}
                    disabled={i.won}
                    onChange={(e) => {
                      const next = new Set(selectedRecipients);
                      if (e.target.checked) next.add(i.invitation_id);
                      else next.delete(i.invitation_id);
                      onSelectionChange(next);
                    }}
                  />
                </Table.Td>
                <Table.Td>
                  <Box>
                    <Text size="sm" fw={600}>{i.email}</Text>
                    {(i.first_name || i.last_name) && (
                      <Text size="xs" c="dimmed">{i.first_name || ""} {i.last_name || ""}</Text>
                    )}
                  </Box>
                </Table.Td>
                <Table.Td visibleFrom="sm">
                  {i.product_name ? (
                    <Box>
                      <Text size="sm">{i.product_name}</Text>
                      {i.product_amount != null && (
                        <Text size="xs" c="dimmed">{i.product_amount.toFixed(2)} €</Text>
                      )}
                    </Box>
                  ) : (
                    <Text size="sm" c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td visibleFrom="sm">
                  <Text size="sm" c="dimmed">
                    {new Date(i.invited_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {i.last_email_sent_at ? (
                    <Stack gap={2}>
                      <Group gap={4} wrap="nowrap">
                        <Tooltip label={t("clients.emailEnviado")} withArrow>
                          <Badge
                            size="xs"
                            color="blue"
                            variant="light"
                            leftSection={<IconSend size={10} />}
                          >
                            {new Date(i.last_email_sent_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                          </Badge>
                        </Tooltip>
                        {i.email_read ? (
                          <Tooltip label={t("clients.leidoPorElDestinatario")} withArrow>
                            <Badge
                              size="xs"
                              color="teal"
                              variant="filled"
                              leftSection={<IconMailOpened size={10} />}
                            >
                              {"Leído"}
                            </Badge>
                          </Tooltip>
                        ) : i.last_email_status === "delivered" ? (
                          <Tooltip label={t("clients.entregadoSinAbrirAun")} withArrow>
                            <Badge size="xs" color="gray" variant="light">{t("clients.sinLeer")}</Badge>
                          </Tooltip>
                        ) : i.last_email_status && i.last_email_status.includes("bounce") ? (
                          <Tooltip label={t("clients.reboteDelServidor")} withArrow>
                            <Badge size="xs" color="red" variant="light" leftSection={<IconMailX size={10} />}>
                              {"Rebote"}
                            </Badge>
                          </Tooltip>
                        ) : null}
                      </Group>
                      {i.last_email_subject && (
                        <Text size="10px" c="dimmed" lineClamp={1} style={{ maxWidth: 220 }}>
                          {i.last_email_subject}
                        </Text>
                      )}
                    </Stack>
                  ) : (
                    <Tooltip label={t("clients.aunNoSeHaEnviado")} withArrow>
                      <Badge size="xs" color="gray" variant="light">{t("clients.sinEnviar")}</Badge>
                    </Tooltip>
                  )}
                </Table.Td>
                <Table.Td>
                  {i.won ? (
                    <Badge size="xs" color="green" variant="filled" leftSection={<IconTrophy size={10} />}>
                      {"Ganado"}
                    </Badge>
                  ) : i.invitation_status === "expired" ? (
                    <Badge size="xs" color="red" variant="light">{"Expirado"}</Badge>
                  ) : i.invitation_status === "cancelled" ? (
                    <Badge size="xs" color="gray" variant="light">{"Cancelado"}</Badge>
                  ) : (
                    <Badge size="xs" color="orange" variant="light">{"Pendiente"}</Badge>
                  )}
                </Table.Td>
                <Table.Td visibleFrom="md">
                  {i.marketing_consent === true ? (
                    <Badge color="green" variant="light" size="xs">{t("clients.si")}</Badge>
                  ) : i.marketing_consent === false ? (
                    <Badge color="gray" variant="light" size="xs">{t("clients.no")}</Badge>
                  ) : (
                    <Text size="xs" c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  {!i.won && (
                    <Tooltip label={t("clients.eliminarCarrito")} withArrow>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="subtle"
                        loading={isDeleting}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar el carrito abandonado de ${i.email}? Esta acción no se puede deshacer.`,
                            )
                          ) {
                            onDelete(i.invitation_id);
                          }
                        }}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Box>
  );
}

interface InvitedListInvitation {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  status: string;
  expires_at: string;
}

function InvitedList({
  invitations,
  onResend,
  onCancel,
  isPending,
}: {
  invitations: InvitedListInvitation[];
  onResend: (id: string) => void;
  onCancel: (id: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={<IconMail size={48} />}
        title={t("clients.sinInvitacionesPendientes")}
        description={t("clients.cuandoClienteAcepte")}
      />
    );
  }
  return (
    <Box className="nv-card" style={{ border: "1px solid var(--border-subtle)" }}>
      <ScrollArea type="auto">
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th><Text fw={700} size="xs" tt="uppercase">{"Email"}</Text></Table.Th>
              <Table.Th visibleFrom="sm"><Text fw={700} size="xs" tt="uppercase">{"Nombre"}</Text></Table.Th>
              <Table.Th visibleFrom="sm"><Text fw={700} size="xs" tt="uppercase">{"Expira"}</Text></Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {invitations.map((inv) => (
              <Table.Tr key={inv.id}>
                <Table.Td><Text size="sm" fw={500}>{inv.email}</Text></Table.Td>
                <Table.Td visibleFrom="sm"><Text size="sm">{inv.first_name || ""} {inv.last_name || ""}</Text></Table.Td>
                <Table.Td visibleFrom="sm">
                  <Text size="sm" c="dimmed">
                    {new Date(inv.expires_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <Button size="xs" variant="light" radius="xl" leftSection={<IconRefresh size={14} />} onClick={() => onResend(inv.id)} loading={isPending}>
                      {"Reenviar"}
                    </Button>
                    <ActionIcon size="sm" variant="subtle" color="red" onClick={() => onCancel(inv.id)} title={t("clients.cancelarInvitacion")}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Box>
  );
}

interface TrackingListItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  last_email_sent_at: string | null;
  last_email_subject: string | null;
  last_email_status: string | null;
  last_email_event_at: string | null;
}

function TrackingList({
  loading,
  items,
  onResend,
  onCancel,
  isResending,
  isCancelling,
}: {
  loading: boolean;
  items: TrackingListItem[];
  onResend: (id: string) => void;
  onCancel: (id: string) => void;
  isResending: boolean;
  isCancelling: boolean;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Box className="nv-card" p="lg"><Text size="sm" c="dimmed">{t("clients.cargandoSeguimiento")}</Text></Box>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconMailOpened size={48} />}
        title={t("clients.noHayInvitacionesSeguir")}
        description={t("clients.aquiVerasEstado")}
      />
    );
  }
  return (
    <Box className="nv-card" style={{ border: "1px solid var(--border-subtle)" }}>
      <ScrollArea type="auto">
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th><Text fw={700} size="xs" tt="uppercase">{"Email"}</Text></Table.Th>
              <Table.Th visibleFrom="sm"><Text fw={700} size="xs" tt="uppercase">{t("clients.ultimoEmail")}</Text></Table.Th>
              <Table.Th><Text fw={700} size="xs" tt="uppercase">{"Estado"}</Text></Table.Th>
              <Table.Th visibleFrom="sm"><Text fw={700} size="xs" tt="uppercase">{"Asunto"}</Text></Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => {
              const isClosedStatus =
                item.status === "accepted" || item.status === "cancelled";
              // Mapeo legible de estados de Brevo. ``request`` es el
              // evento de envío inicial; significa "enviado, sin
              // respuesta del servidor todavía".
              const rawStatus = item.last_email_status;
              const status = rawStatus || (item.last_email_sent_at ? "request" : null);
              const color =
                status === "clicked" ? "green"
                : status === "opened" || status === "unique_opened" ? "teal"
                : status === "delivered" ? "blue"
                : status && status.includes("bounce") ? "red"
                : status === "request" ? "yellow"
                : "gray";
              const statusLabel =
                status === "request" ? "Enviado"
                : status === "delivered" ? "Entregado"
                : status === "opened" || status === "unique_opened" ? "Leído"
                : status === "clicked" ? "Click"
                : status === "soft_bounce" ? "Rebote leve"
                : status === "hard_bounce" ? "Rebote fuerte"
                : status || "—";
              return (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Box>
                      <Text size="sm" fw={600}>{item.email}</Text>
                      {(item.first_name || item.last_name) && (
                        <Text size="xs" c="dimmed">{item.first_name || ""} {item.last_name || ""}</Text>
                      )}
                    </Box>
                  </Table.Td>
                  <Table.Td visibleFrom="sm">
                    {item.last_email_sent_at ? (
                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          {new Date(item.last_email_sent_at).toLocaleDateString("es-ES", {
                            day: "numeric", month: "short", year: "2-digit",
                          })}
                        </Text>
                        {item.last_email_event_at && (
                          <Text size="10px" c="dimmed">
                            Último evento: {new Date(item.last_email_event_at).toLocaleString("es-ES", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </Text>
                        )}
                      </Stack>
                    ) : (
                      <Text size="xs" c="dimmed">{t("clients.sinEnvios")}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={4}>
                      {status ? (
                        <Tooltip
                          label={
                            status === "request" ? "Enviado al servidor de Brevo"
                            : status === "delivered" ? t("clients.entregadoDestinatario")
                            : status === "opened" || status === "unique_opened" ? "El destinatario abrió el email"
                            : status === "clicked" ? "El destinatario hizo click en un enlace"
                            : status === "soft_bounce" ? "Rebote temporal: bandeja llena u otro problema reversible"
                            : status === "hard_bounce" ? "Rebote permanente: dirección inexistente"
                            : status
                          }
                          withArrow
                        >
                          <Badge size="xs" variant="light" color={color}>{statusLabel}</Badge>
                        </Tooltip>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                      {item.status === "accepted" && (
                        <Badge size="xs" variant="filled" color="green">{"Aceptada"}</Badge>
                      )}
                      {item.status === "cancelled" && (
                        <Badge size="xs" variant="light" color="gray">{"Cancelada"}</Badge>
                      )}
                      {item.status === "expired" && (
                        <Badge size="xs" variant="light" color="orange">{"Expirada"}</Badge>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td visibleFrom="sm">
                    <Text size="xs" lineClamp={1} style={{ maxWidth: 280 }}>
                      {item.last_email_subject || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip
                        label={
                          isClosedStatus
                            ? "No puedes reenviar una invitación cerrada"
                            : "Reenviar invitación"
                        }
                        withArrow
                      >
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          disabled={isClosedStatus}
                          loading={isResending}
                          onClick={() => onResend(item.id)}
                        >
                          <IconRefresh size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip
                        label={
                          isClosedStatus
                            ? "Esta invitación ya está cerrada"
                            : "Cancelar invitación (no se podrá usar el enlace)"
                        }
                        withArrow
                      >
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          disabled={isClosedStatus}
                          loading={isCancelling}
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Cancelar la invitación a ${item.email}? El enlace dejará de funcionar y no se podrá enviar más emails sobre esta invitación.`,
                              )
                            ) {
                              onCancel(item.id);
                            }
                          }}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Box>
  );
}

// KPI Card - Compact
function KPICard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <Box className="nv-card-compact" p="sm" style={{ minHeight: "auto" }}>
      <Text className="stat-label" mb={2} style={{ fontSize: "10px" }}>{title}</Text>
      <Text 
        fw={800} 
        style={{ fontSize: "1.25rem", color, lineHeight: 1.1, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {value}
      </Text>
      {subtitle && (
        <Text size="xs" c="dimmed" mt={2} style={{ fontSize: "11px" }}>{subtitle}</Text>
      )}
    </Box>
  );
}

export function ClientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewMode] = useState<"table" | "grid">("table");
  const [activeTab, setActiveTab] = useState<string | null>("all");
  // Filtro consentimiento marketing para "Carrito abandonado" e "Inactivo".
  // null = todos, true = sólo opt-in, false = sólo opt-out.
  const [marketingFilter, setMarketingFilter] = useState<null | true | false>(null);
  // Filtro de estado para "Carrito abandonado": abandoned (default) /
  // won / all. Permite revisar el histórico de conversión sin perder
  // de vista los abandonados activos.
  const [abandonedStatusFilter, setAbandonedStatusFilter] = useState<AbandonedCartFilter>("abandoned");
  // Selección de destinatarios y modal para envío de campañas.
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [campaignModalOpen, setCampaignModalOpen] = useState<false | "abandoned_cart" | "inactive">(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [
    clientModalOpened,
    { open: openClientModal, close: closeClientModal },
  ] = useDisclosure(false);
  const [tagModalOpened, { open: openTagModal, close: closeTagModal }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Sólo las tabs "legacy" usan el listado paginado de clientes. Las
  // tabs nuevas (pending_form, abandoned_cart, inactive_sub, invited,
  // tracking) usan sus propios endpoints y renderizan tablas
  // específicas del segmento.
  const showLegacyTable = activeTab === "all" || activeTab === "active" || activeTab === "deleted";
  const statusFilter = activeTab === "active" ? "active" : activeTab === "deleted" ? "deleted" : undefined;
  const { data: clientsData, isLoading, isError, refetch } = useClients(
    { page, search, status: statusFilter },
    { enabled: showLegacyTable },
  );
  useClientTags();
  const createClient = useCreateClient();
  const createTag = useCreateClientTag();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const permanentDeleteClient = usePermanentDeleteClient();
  const restoreClient = useRestoreClient();
  const createInvitation = useCreateInvitation();
  const { data: invitations } = useInvitations();
  const resendInvitation = useResendInvitation();
  const cancelInvitation = useCancelInvitation();

  // Segmentos nuevos. Las queries se ejecutan al cargar la página
  // para que los contadores de cada tab se vean correctos sin tener
  // que entrar en ellas (similar a "stats").
  const pendingFormQuery = usePendingSystemFormClients();
  const abandonedCartQuery = useAbandonedCart(marketingFilter, abandonedStatusFilter);
  const inactiveSubQuery = useInactiveSubscriptionClients(marketingFilter);
  const trackingQuery = useInvitationsTracking();
  const resendSystemForm = useResendSystemForm();
  const cancelPendingSystemForm = useCancelPendingSystemForm();
  const deleteAbandonedCart = useDeleteAbandonedCart();
  const sendCampaign = useSendCampaign();
  const campaignTemplatesQuery = useCampaignTemplates(
    campaignModalOpen === "abandoned_cart"
      ? "abandoned_cart"
      : campaignModalOpen === "inactive"
      ? "inactive"
      : undefined,
  );

  // Estado para el modal de edición
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  // Estado para invitación
  const [inviteModalOpened, { open: openInviteModal, close: closeInviteModal }] = useDisclosure(false);
  const [lastInvitationUrl, setLastInvitationUrl] = useState<string | null>(null);

  // Estado para confirmación de borrado permanente
  const [deleteConfirmOpened, { open: openDeleteConfirm, close: closeDeleteConfirm }] = useDisclosure(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  
  // Products for invite selector. Sólo se usa dentro del modal de "Invitar
  // cliente", así que lo cargamos de forma perezosa y mantenemos un staleTime
  // alto para no re-pedirlo entre aperturas sucesivas del modal.
  const { currentWorkspace } = useAuthStore();
  const { data: productOptions = [] } = useQuery({
    queryKey: ["products-invite-options", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const res = await productsApi.list(currentWorkspace.id);
      return (res.data?.items || res.data || [])
        .filter((p: any) => p.is_active)
        .map((p: any) => ({
          value: p.id,
          label: `${p.name} - ${formatDecimal(Number(p.price), 2)}€/${p.interval || "mes"}`,
        })) as { value: string; label: string }[];
    },
    enabled: !!currentWorkspace?.id && inviteModalOpened,
    staleTime: 5 * 60 * 1000,
  });

  const clientForm = useForm({
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      goals: "",
    },
    validate: {
      first_name: (value) => (value.length < 2 ? t("clientsPage.nombreRequerido") : null),
      last_name: (value) => (value.length < 2 ? t("clientsPage.apellidoRequerido") : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t("auth.invalidEmail")),
    },
  });

  const inviteForm = useForm({
    initialValues: {
      email: "",
      first_name: "",
      last_name: "",
      message: "",
      product_id: "" as string,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t("auth.invalidEmail")),
    },
  });

  const tagForm = useForm({
    initialValues: {
      name: "",
      color: "#5C80BC",
    },
    validate: {
      name: (value) => (value.length < 2 ? t("clientsPage.nombreRequerido") : null),
    },
  });

  const editForm = useForm({
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      goals: "",
    },
    validate: {
      first_name: (value) => (value.length < 2 ? t("clientsPage.nombreRequerido") : null),
      last_name: (value) => (value.length < 2 ? t("clientsPage.apellidoRequerido") : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t("auth.invalidEmail")),
    },
  });

  const handleCreateClient = async (values: typeof clientForm.values) => {
    try {
      await createClient.mutateAsync(values);
      closeClientModal();
      clientForm.reset();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCreateTag = async (values: typeof tagForm.values) => {
    try {
      await createTag.mutateAsync(values);
      closeTagModal();
      tagForm.reset();
    } catch {
      // Error handled by mutation
    }
  };

  const handleInviteClient = async (values: typeof inviteForm.values) => {
    try {
      await createInvitation.mutateAsync({
        email: values.email,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        message: values.message || undefined,
        product_id: values.product_id || undefined,
      });
      setLastInvitationUrl("sent");
      inviteForm.reset();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCloseInviteModal = () => {
    closeInviteModal();
    setLastInvitationUrl(null);
    inviteForm.reset();
  };

  // @ts-expect-error — kept for future use when re-enabling invite actions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleResendInvitation = async (client: any) => {
    const existingInvitation = invitations?.find(
      (inv: any) => inv.email === client.email && (inv.status === "pending" || inv.status === "expired")
    );

    if (existingInvitation) {
      try {
        await resendInvitation.mutateAsync(existingInvitation.id);
        notifications.show({
          title: t("clients.invitacionReenviada"),
          message: `Se ha reenviado la invitación a ${client.email}`,
          color: "green",
        });
      } catch {
        notifications.show({
          title: t("clients.error"),
          message: t("clients.noSePudoReenviarLa"),
          color: "red",
        });
      }
    } else {
      inviteForm.setValues({
        email: client.email,
        first_name: client.first_name || "",
        last_name: client.last_name || "",
        message: "",
        product_id: "",
      });
      openInviteModal();
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    editForm.setValues({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      email: client.email || "",
      phone: client.phone || "",
      goals: client.goals || "",
    });
    openEditModal();
  };

  const handleUpdateClient = async (values: typeof editForm.values) => {
    if (!editingClient) return;
    
    // Para clientes demo, solo mostramos mensaje y cerramos
    if (editingClient.id.startsWith("demo-client-")) {
      notifications.show({
        title: t("clients.modoDemo"),
        message: t("clients.enModoDemoLosCambios"),
        color: "yellow",
      });
      closeEditModal();
      editForm.reset();
      setEditingClient(null);
      return;
    }
    
    try {
      await updateClient.mutateAsync({
        id: editingClient.id,
        data: values,
      });
      closeEditModal();
      editForm.reset();
      setEditingClient(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleSendPasswordReset = async (client: any) => {
    if (!client?.id || client.id.startsWith("demo-client-")) return;
    try {
      await api.post(`/clients/${client.id}/send-password-reset`);
      notifications.show({
        title: t("clients.emailEnviado"),
        message: `Se ha enviado un email para restablecer la contraseña a ${client.email}`,
        color: "green",
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      notifications.show({
        title: t("clients.error"),
        message:
          e.response?.data?.detail ||
          e.message ||
          "No se pudo enviar el email de restablecimiento",
        color: "red",
      });
    }
  };

  const handleReactivate = async (client: any) => {
    try {
      await updateClient.mutateAsync({ id: client.id, data: { is_active: true } });
      notifications.show({
        title: t("clients.clienteReactivado"),
        message: `${client.first_name} ${client.last_name} ha sido reactivado`,
        color: "green",
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleSoftDelete = async (client: any) => {
    if (client.id.startsWith("demo-client-")) return;
    try {
      await deleteClient.mutateAsync(client.id);
      notifications.show({
        title: t("clients.clienteDesasignado"),
        message: `${client.first_name} ${client.last_name} ha sido desactivado`,
        color: "yellow",
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handlePermanentDelete = async (client: any) => {
    if (!client || client.id.startsWith("demo-client-")) return;
    const wasAlreadyDeleted = Boolean(client.deleted_at);
    try {
      await permanentDeleteClient.mutateAsync(client.id);
      notifications.show({
        title: wasAlreadyDeleted ? t("clients.clienteEliminadoDef") : t("clients.clienteMovidoEliminados"),
        message: wasAlreadyDeleted
          ? `${client.first_name} ${client.last_name} y todos sus datos se han borrado`
          : `${client.first_name} ${client.last_name} se ha movido a Eliminados (puedes restaurarlo)`,
        color: wasAlreadyDeleted ? "red" : "yellow",
      });
      closeDeleteConfirm();
      setClientToDelete(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRestore = async (client: any) => {
    if (!client || client.id.startsWith("demo-client-")) return;
    try {
      await restoreClient.mutateAsync(client.id);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = (client: any) => {
    // Activo → desasignar (soft). Inactivo o ya en Eliminados → modal de confirmación
    // (primera vez soft a Eliminados; si ya tiene deleted_at → hard delete).
    if (client.is_active && !client.deleted_at) {
      handleSoftDelete(client);
    } else {
      setClientToDelete(client);
      openDeleteConfirm();
    }
  };

  // Hide the Etiquetas column entirely if no visible client has tags: otherwise
  // it looks like dead real-estate full of dashes.
  const hasAnyTags = useMemo(
    () => (clientsData?.items || []).some((c: any) => Array.isArray(c.tags) && c.tags.length > 0),
    [clientsData]
  );

  const columns = [
    {
      key: "name",
      title: t("clients.cliente"),
      render: (client: {
        first_name: string;
        last_name: string;
        email: string;
        avatar_url?: string;
      }) => (
        <ClientCell
          avatarUrl={client.avatar_url}
          email={client.email}
          name={`${client.first_name} ${client.last_name}`}
        />
      ),
    },
    {
      key: "phone",
      title: t("clients.telefono"),
      hideOnMobile: true,
      render: (client: { phone?: string }) => (
        <Text size="sm" fw={500} style={{ color: client.phone ? "var(--nv-dark)" : "var(--nv-slate-light)" }}>
          {client.phone || "—"}
        </Text>
      ),
    },
    ...(hasAnyTags
      ? [
          {
            key: "tags",
            title: t("clients.etiquetas"),
            hideOnMobile: true,
            render: (client: { tags?: Array<{ name: string; color: string }> }) =>
              client.tags && client.tags.length > 0 ? (
                <TagsList tags={client.tags} />
              ) : (
                <Text c="dimmed" size="sm">—</Text>
              ),
          },
        ]
      : []),
    {
      key: "is_active",
      title: t("clients.estado"),
      render: (client: { is_active: boolean; has_user_account?: boolean }) => (
        <StatusBadge status={getClientStatus(client)} />
      ),
    },
    {
      key: "actions_custom",
      title: "",
      render: (client: any) => {
        // Destructive actions (Desasignar) live inside the row menu (⋮) so the
        // table doesn't feel like a wall of red buttons. We only surface
        // recovery actions (Restaurar/Reactivar) directly because they're
        // positive and quick.
        if (client.deleted_at) {
          return (
            <Button
              size="xs"
              variant="light"
              color="green"
              radius="xl"
              leftSection={<IconRestore size={14} />}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleRestore(client);
              }}
              styles={{ root: { fontSize: "11px" } }}
            >
              {t("clients.restaurar")}
            </Button>
          );
        }
        if (!client.is_active) {
          return (
            <Button
              size="xs"
              variant="light"
              color="green"
              radius="xl"
              leftSection={<IconUserCheck size={14} />}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleReactivate(client);
              }}
              styles={{ root: { fontSize: "11px" } }}
            >
              {t("clients.reactivar")}
            </Button>
          );
        }
        return null;
      },
    },
    {
      key: "created_at",
      title: t("clients.registro"),
      hideOnMobile: true,
      render: (client: { created_at: string }) => (
        <Group gap="xs">
          <IconCalendar size={14} color="var(--nv-slate-light)" />
          <Text size="sm" style={{ color: "var(--nv-slate)" }}>
            {new Date(client.created_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}
          </Text>
        </Group>
      ),
    },
  ];

  const stats = useMemo(() => {
    const backendStats = (clientsData as any)?.stats;
    if (backendStats) {
      return {
        total: backendStats.total,
        active: backendStats.active,
        pending: backendStats.pending,
        inactive: backendStats.inactive,
        deleted: backendStats.deleted || 0,
        newThisMonth: backendStats.new_this_month,
      };
    }
    return { total: 0, active: 0, pending: 0, inactive: 0, deleted: 0, newThisMonth: 0 };
  }, [clientsData]);

  return (
    <Container py="lg" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: t("clients.invitarCliente"),
          icon: <IconSend size={16} />,
          onClick: openInviteModal,
        }}
        description={t("clients.gestionaTuCarteraDeClientes")}
        secondaryAction={{
          label: t("clients.crearManual"),
          icon: <IconUserPlus size={14} />,
          onClick: openClientModal,
          variant: "default",
        }}
        title={t("clients.clientes")}
      />

      {/* KPIs */}
      <SimpleGrid cols={{ base: 2, sm: 5, xl: 6 }} mb="lg" spacing="sm" className="stagger">
        <KPICard 
          title={t("clients.totalClientes")} 
          value={stats.total} 
          subtitle={t("clients.enTuCartera")}
          color="var(--nv-dark)"
        />
        <KPICard 
          title={t("clients.activos")} 
          value={stats.active} 
          subtitle={t("clients.conPlanActivo")}
          color="var(--nv-success)"
        />
        <KPICard 
          title={t("clients.pendientes")} 
          value={stats.pending} 
          subtitle={t("clients.sinCuentaCreada")}
          color="var(--nv-primary)"
        />
        <KPICard 
          title={t("clients.inactivos")} 
          value={stats.inactive} 
          subtitle={t("clients.sinActividad")}
          color="var(--nv-slate)"
        />
        <KPICard 
          title={t("clients.nuevos")} 
          value={stats.newThisMonth} 
          subtitle={t("clients.esteMes")}
          color="var(--nv-primary)"
        />
      </SimpleGrid>

      {/* Tabs y Filtros */}
      <Box mb="md">
        {isMobile ? (
          <Select
            value={activeTab}
            onChange={(value) => {
              if (value === "tags") { openTagModal(); return; }
              setActiveTab(value);
              setPage(1);
            }}
            data={[
              { value: "all", label: `Todos (${stats.total})` },
              { value: "active", label: `Activos (${stats.active})` },
              { value: "pending_form", label: `Pendiente formulario (${pendingFormQuery.data?.length ?? 0})` },
              { value: "abandoned_cart", label: `Carrito abandonado (${abandonedCartQuery.data?.length ?? 0})` },
              { value: "inactive_sub", label: `Inactivo (${inactiveSubQuery.data?.length ?? 0})` },
              { value: "invited", label: `Invitados (${(invitations || []).filter((i) => i.status === "pending").length})` },
              { value: "tracking", label: `Seguimiento (${trackingQuery.data?.length ?? 0})` },
              ...(stats.deleted > 0 ? [{ value: "deleted", label: `Eliminados (${stats.deleted})` }] : []),
              { value: "tags", label: t("clients.etiquetas") },
            ]}
            size="sm"
            radius="md"
          />
        ) : (
          <Tabs value={activeTab} onChange={(value) => { setActiveTab(value); setPage(1); setSelectedRecipients(new Set()); }}>
            <Tabs.List style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <Tabs.Tab
                leftSection={<IconUsers size={14} />}
                value="all"
                style={{ fontWeight: 600, fontSize: "13px" }}
              >
                Todos ({stats.total})
              </Tabs.Tab>
              <Tabs.Tab value="active" leftSection={<IconUserCheck size={14} />} style={{ fontWeight: 600, fontSize: "13px" }}>
                Activos ({stats.active})
              </Tabs.Tab>
              <Tabs.Tab
                value="pending_form"
                leftSection={<IconClipboardList size={14} />}
                style={{ fontWeight: 600, fontSize: "13px" }}
              >
                Pendiente formulario ({pendingFormQuery.data?.length ?? 0})
              </Tabs.Tab>
              <Tabs.Tab
                value="abandoned_cart"
                leftSection={<IconShoppingCartX size={14} />}
                style={{ fontWeight: 600, fontSize: "13px" }}
                color="orange"
              >
                Carrito abandonado ({abandonedCartQuery.data?.length ?? 0})
              </Tabs.Tab>
              <Tabs.Tab
                value="inactive_sub"
                leftSection={<IconActivityHeartbeat size={14} />}
                style={{ fontWeight: 600, fontSize: "13px" }}
                color="grape"
              >
                Inactivo ({inactiveSubQuery.data?.length ?? 0})
              </Tabs.Tab>
              <Tabs.Tab
                value="invited"
                leftSection={<IconMail size={14} />}
                style={{ fontWeight: 600, fontSize: "13px" }}
              >
                Invitados ({(invitations || []).filter((i) => i.status === "pending").length})
              </Tabs.Tab>
              <Tabs.Tab
                value="tracking"
                leftSection={<IconMailOpened size={14} />}
                style={{ fontWeight: 600, fontSize: "13px" }}
                color="teal"
              >
                Seguimiento ({trackingQuery.data?.length ?? 0})
              </Tabs.Tab>
              {stats.deleted > 0 && (
                <Tabs.Tab
                  leftSection={<IconTrashX size={14} />}
                  value="deleted"
                  style={{ fontWeight: 600, fontSize: "13px" }}
                  color="red"
                >
                  Eliminados ({stats.deleted})
                </Tabs.Tab>
              )}
              <Tabs.Tab
                leftSection={<IconTag size={14} />}
                value="tags"
                onClick={openTagModal}
                style={{ fontWeight: 600, fontSize: "13px" }}
              >
                {t("clients.etiquetas")}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        )}
      </Box>

      {/* Contenido — vistas específicas para cada segmento */}
      {activeTab === "pending_form" && (
        <SegmentClientList
          loading={pendingFormQuery.isLoading}
          items={pendingFormQuery.data || []}
          emptyTitle={t("clients.nadiePendienteDelFormulario")}
          emptyDesc={t("clients.todosTusClientesPagadosYa")}
          extraColumn={{
            title: t("clients.emailCuestionario"),
            render: (c) => {
              if (!c.last_email_sent_at) {
                return (
                  <Tooltip label={t("clients.aunNoSeHaEnviado")} withArrow>
                    <Badge size="xs" color="gray" variant="light">{t("clients.sinEnviar")}</Badge>
                  </Tooltip>
                );
              }
              return (
                <Stack gap={4}>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label={t("clients.emailEnviado")} withArrow>
                      <Badge size="xs" color="blue" variant="light" leftSection={<IconSend size={10} />}>
                        {new Date(c.last_email_sent_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </Badge>
                    </Tooltip>
                    {c.email_read ? (
                      <Tooltip label={t("clients.clienteAbrioElEmail")} withArrow>
                        <Badge size="xs" color="teal" variant="filled" leftSection={<IconMailOpened size={10} />}>
                          {t("clients.leido")}
                        </Badge>
                      </Tooltip>
                    ) : c.last_email_status === "delivered" ? (
                      <Tooltip label={t("clients.entregadoSinAbrir")} withArrow>
                        <Badge size="xs" color="gray" variant="light">{t("clients.sinLeer")}</Badge>
                      </Tooltip>
                    ) : c.last_email_status && c.last_email_status.includes("bounce") ? (
                      <Tooltip label={t("clients.reboteDelServidor")} withArrow>
                        <Badge size="xs" color="red" variant="light" leftSection={<IconMailX size={10} />}>
                          {t("clients.rebote")}
                        </Badge>
                      </Tooltip>
                    ) : null}
                  </Group>
                  {c.last_payment_at && (
                    <Text size="10px" c="dimmed">
                      Pago: {new Date(c.last_payment_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" })}
                    </Text>
                  )}
                </Stack>
              );
            },
          }}
          rowAction={(c) => (
            <Group gap={4} wrap="nowrap">
              <Tooltip label={t("clients.reenviarEmailDelCuestionario")} withArrow>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  radius="xl"
                  leftSection={<IconBellRinging size={14} />}
                  loading={resendSystemForm.isPending && resendSystemForm.variables === c.id}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    resendSystemForm.mutate(c.id);
                  }}
                >
                  {t("clients.reenviar")}
                </Button>
              </Tooltip>
              <Tooltip label={t("clients.cancelarLaSolicitudDelCuestionario")} withArrow>
                <ActionIcon
                  size="lg"
                  variant="subtle"
                  color="red"
                  radius="xl"
                  loading={cancelPendingSystemForm.isPending && cancelPendingSystemForm.variables === c.id}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `¿Cancelar la solicitud del cuestionario inicial para ${c.full_name}? El cliente dejará de verlo en su panel.`,
                      )
                    ) {
                      cancelPendingSystemForm.mutate(c.id);
                    }
                  }}
                >
                  <IconBan size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
          onRowClick={(c) => navigate(`/clients/${c.id}`)}
        />
      )}

      {activeTab === "abandoned_cart" && (
        <AbandonedCartList
          loading={abandonedCartQuery.isLoading}
          items={abandonedCartQuery.data || []}
          marketingFilter={marketingFilter}
          onMarketingFilterChange={setMarketingFilter}
          statusFilter={abandonedStatusFilter}
          onStatusFilterChange={setAbandonedStatusFilter}
          selectedRecipients={selectedRecipients}
          onSelectionChange={setSelectedRecipients}
          onSendCampaign={() => setCampaignModalOpen("abandoned_cart")}
          onDelete={(invitationId) => deleteAbandonedCart.mutate(invitationId)}
          isDeleting={deleteAbandonedCart.isPending}
          onRowClick={(invId) => {
            const inv = invitations?.find((i) => i.id === invId);
            if (inv) {
              notifications.show({
                title: inv.email,
                message: `Invitación enviada el ${new Date(inv.created_at).toLocaleDateString("es-ES")}`,
                color: "blue",
              });
            }
          }}
        />
      )}

      {activeTab === "inactive_sub" && (
        <SegmentClientList
          loading={inactiveSubQuery.isLoading}
          items={inactiveSubQuery.data || []}
          emptyTitle={t("clients.noHayClientesInactivos")}
          emptyDesc={t("clients.aquiApareceranLosClientesQue")}
          headerExtras={
            <Group gap="xs">
              <SegmentedControl
                size="xs"
                radius="xl"
                value={marketingFilter === null ? "all" : marketingFilter ? "yes" : "no"}
                onChange={(value) =>
                  setMarketingFilter(value === "all" ? null : value === "yes" ? true : false)
                }
                data={[
                  { label: t("clients.todos"), value: "all" },
                  { label: t("clients.aceptaMarketing"), value: "yes" },
                  { label: t("clients.noAcepta"), value: "no" },
                ]}
              />
              <Button
                size="xs"
                variant="filled"
                color="grape"
                radius="xl"
                leftSection={<IconSend size={14} />}
                disabled={selectedRecipients.size === 0}
                onClick={() => setCampaignModalOpen("inactive")}
              >
                Enviar email descuento ({selectedRecipients.size})
              </Button>
            </Group>
          }
          extraColumn={{
            title: t("clients.cancelada"),
            render: (c) =>
              c.subscription_cancelled_at
                ? new Date(c.subscription_cancelled_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
                : "—",
          }}
          checkboxes
          selectedIds={selectedRecipients}
          onSelectionChange={setSelectedRecipients}
          rowAction={(c) =>
            c.marketing_consent === true ? (
              <Badge color="green" variant="light" size="xs">
                {t("clients.marketingOk")}
              </Badge>
            ) : c.marketing_consent === false ? (
              <Badge color="gray" variant="light" size="xs">
                {t("clients.sinConsentimiento")}
              </Badge>
            ) : null
          }
          onRowClick={(c) => navigate(`/clients/${c.id}`)}
        />
      )}

      {activeTab === "invited" && (
        <InvitedList
          invitations={(invitations || []).filter((i) => i.status === "pending")}
          onResend={(id) => resendInvitation.mutate(id)}
          onCancel={(id) => cancelInvitation.mutate(id)}
          isPending={resendInvitation.isPending}
        />
      )}

      {activeTab === "tracking" && (
        <TrackingList
          loading={trackingQuery.isLoading}
          items={trackingQuery.data || []}
          onResend={(id) => resendInvitation.mutate(id)}
          onCancel={(id) => cancelInvitation.mutate(id)}
          isResending={resendInvitation.isPending}
          isCancelling={cancelInvitation.isPending}
        />
      )}

      {/* Contenido legacy (Todos / Activos / Eliminados) */}
      {showLegacyTable && clientsData?.items && clientsData.items.length > 0 ? (
        viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={clientsData.items}
            loading={isLoading}
            onDelete={handleDelete}
            onEdit={(client) => handleEditClient(client)}
            onSearch={setSearch}
            onView={(client: { id: string }) => navigate(`/clients/${client.id}`)}
            onRowClick={(client: { id: string }) => navigate(`/clients/${client.id}`)}
            extraActions={[
              {
                label: t("clients.restablecerContrasena"),
                icon: <IconKey size={16} />,
                onClick: (client: any) => handleSendPasswordReset(client),
                // Sólo tiene sentido para clientes con cuenta (no descartados y con email)
                visible: (client: any) =>
                  Boolean(client?.email) && !client?.deleted_at,
              },
            ]}
            getDeleteLabel={(client: any) =>
              client.deleted_at
                ? t("clientsPage.eliminarDefinitivamente")
                : client.is_active
                ? "Desasignar"
                : t("clientsPage.borrarPermanentemente")
            }
            pagination={{
              page,
              pageSize: 10,
              total: clientsData.total,
              onChange: setPage,
            }}
            searchable
            searchPlaceholder={t("clients.buscar_por_nombre_email_o_telefono")}
          />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
            {clientsData.items.map((client: any) => (
              <ClientCard
                key={client.id}
                client={client}
                onView={() => navigate(`/clients/${client.id}`)}
                onResetPassword={handleSendPasswordReset}
              />
            ))}
          </SimpleGrid>
        )
      ) : showLegacyTable && isError ? (
        <EmptyState
          icon={<IconUsers size={48} />}
          title={t("clients.errorAlCargarClientes")}
          description={t("clients.noSePudieronObtenerLos")}
          actionLabel={t("clients.reintentar")}
          onAction={() => refetch()}
        />
      ) : showLegacyTable && isLoading ? null : showLegacyTable ? (
        <EmptyState
          actionLabel={activeTab === "all" ? t("clientsPage.añadirCliente") : undefined}
          description={
            activeTab === "active" ? "No hay clientes activos con cuenta creada."
            : t("clientsPage.empiezaAñadiendoTuPrimerClientePara")
          }
          icon={<IconUsers size={48} />}
          onAction={activeTab === "all" ? openClientModal : undefined}
          title={
            activeTab === "active" ? "No hay clientes activos"
            : t("clients.noHayClientes")
          }
        />
      ) : null}

      {/* Modal de envío de campaña (carrito abandonado / inactivos) */}
      <BottomSheet
        opened={!!campaignModalOpen}
        onClose={() => { setCampaignModalOpen(false); setSelectedTemplateId(null); }}
        size="md"
        title={campaignModalOpen === "abandoned_cart" ? "Email recordatorio de pago" : t("clientsPage.emailDescuentoReactivación")}
        radius="lg"
      >
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              Selecciona la plantilla a enviar a {selectedRecipients.size} destinatario(s).
            </Text>
            <Button
              size="xs"
              variant="subtle"
              radius="xl"
              onClick={() => navigate("/email-templates")}
            >
              {t("clients.gestionarPlantillas")}
            </Button>
          </Group>
          {(campaignTemplatesQuery.data || []).length === 0 && !campaignTemplatesQuery.isLoading && (
            <Text size="xs" c="orange">
              {t("clients.noTienesPlantillasParaEste")}
            </Text>
          )}
          <Select
            label={t("clients.plantilla")}
            placeholder={campaignTemplatesQuery.isLoading ? t("common.cargando") : t("clients.seleccionaPlantilla")}
            data={(campaignTemplatesQuery.data || []).map((t) => ({
              value: t.id,
              label: t.discount_value
                ? `${t.name} (${t.discount_type === "percent" ? `${t.discount_value}%` : `${t.discount_value}€`})`
                : t.name,
            }))}
            value={selectedTemplateId}
            onChange={setSelectedTemplateId}
            disabled={campaignTemplatesQuery.isLoading}
            radius="md"
            searchable
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { setCampaignModalOpen(false); setSelectedTemplateId(null); }} radius="xl">
              {t("clients.cancelar")}
            </Button>
            <Button
              loading={sendCampaign.isPending}
              radius="xl"
              leftSection={<IconSend size={14} />}
              disabled={!selectedTemplateId || selectedRecipients.size === 0}
              onClick={async () => {
                if (!selectedTemplateId) return;
                const ids = Array.from(selectedRecipients);
                const payload = campaignModalOpen === "abandoned_cart"
                  ? { template_id: selectedTemplateId, recipient_invitation_ids: ids }
                  : { template_id: selectedTemplateId, recipient_client_ids: ids };
                await sendCampaign.mutateAsync(payload);
                setCampaignModalOpen(false);
                setSelectedTemplateId(null);
                setSelectedRecipients(new Set());
              }}
            >
              {t("clients.enviar")}
            </Button>
          </Group>
        </Stack>
      </BottomSheet>

      {/* Modal para crear cliente */}
      <BottomSheet
        onClose={closeClientModal}
        opened={clientModalOpened}
        size="lg"
        title={t("clients.nuevoCliente")}
        radius="lg"
      >
        <form onSubmit={clientForm.onSubmit(handleCreateClient)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label={t("clients.nombre")}
                placeholder={t("clients.juan")}
                required
                radius="md"
                {...clientForm.getInputProps("first_name")}
              />
              <TextInput
                label={t("clients.apellido")}
                placeholder={t("clients.garcia")}
                required
                radius="md"
                {...clientForm.getInputProps("last_name")}
              />
            </Group>
            <TextInput
              label={t("clients.email")}
              placeholder={t("clients.juanEmailCom")}
              required
              radius="md"
              {...clientForm.getInputProps("email")}
            />
            <TextInput
              label={t("clients.telefono")}
              placeholder="+34 600 000 000"
              radius="md"
              {...clientForm.getInputProps("phone")}
            />
            <Textarea
              label={t("clients.objetivos")}
              minRows={3}
              placeholder={t("clients.describeLosObjetivosDelCliente")}
              radius="md"
              {...clientForm.getInputProps("goals")}
            />
            <Group justify="flex-end" mt="md">
              <Button 
                onClick={closeClientModal} 
                variant="default"
                radius="xl"
              >
                {t("clients.cancelar")}
              </Button>
              <Button 
                loading={createClient.isPending} 
                type="submit"
                radius="xl"
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": {
                      background: "var(--nv-accent-hover)"
                    }
                  }
                }}
              >
                {t("clients.crearCliente")}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Modal para crear etiqueta */}
      <BottomSheet
        onClose={closeTagModal}
        opened={tagModalOpened}
        size="sm"
        title={t("clients.nuevaEtiqueta")}
        radius="lg"
      >
        <form onSubmit={tagForm.onSubmit(handleCreateTag)}>
          <Stack gap="md">
            <TextInput
              label={t("clients.nombre")}
              placeholder={t("clients.vipPremiumNuevo")}
              required
              radius="md"
              {...tagForm.getInputProps("name")}
            />
            <ColorInput
              format="hex"
              label={t("clients.color")}
              radius="md"
              swatches={[
                "#5C80BC",
                "#10B981",
                "#F59E0B",
                "#EF4444",
                "#8B5CF6",
                "#EC4899",
                "#06B6D4",
                "#84CC16",
              ]}
              {...tagForm.getInputProps("color")}
            />
            <Group justify="flex-end" mt="md">
              <Button 
                onClick={closeTagModal} 
                variant="default"
                radius="xl"
              >
                {t("clients.cancelar")}
              </Button>
              <Button 
                loading={createTag.isPending} 
                type="submit"
                radius="xl"
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": {
                      background: "var(--nv-accent-hover)"
                    }
                  }
                }}
              >
                {t("clients.crearEtiqueta")}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Modal para editar cliente */}
      <BottomSheet
        onClose={closeEditModal}
        opened={editModalOpened}
        size="lg"
        title={`Editar Cliente: ${editingClient?.first_name || ''} ${editingClient?.last_name || ''}`}
        radius="lg"
      >
        <form onSubmit={editForm.onSubmit(handleUpdateClient)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label={t("clients.nombre")}
                placeholder={t("clients.juan")}
                required
                radius="md"
                {...editForm.getInputProps("first_name")}
              />
              <TextInput
                label={t("clients.apellido")}
                placeholder={t("clients.garcia")}
                required
                radius="md"
                {...editForm.getInputProps("last_name")}
              />
            </Group>
            <TextInput
              label={t("clients.email")}
              placeholder={t("clients.juanEmailCom")}
              required
              radius="md"
              {...editForm.getInputProps("email")}
            />
            <TextInput
              label={t("clients.telefono")}
              placeholder="+34 600 000 000"
              radius="md"
              {...editForm.getInputProps("phone")}
            />
            <Textarea
              label={t("clients.objetivos")}
              minRows={3}
              placeholder={t("clients.describeLosObjetivosDelCliente")}
              radius="md"
              {...editForm.getInputProps("goals")}
            />
            <Group justify="flex-end" mt="md">
              <Button 
                onClick={closeEditModal} 
                variant="default"
                radius="xl"
              >
                {t("clients.cancelar")}
              </Button>
              <Button 
                loading={updateClient.isPending} 
                type="submit"
                radius="xl"
                styles={{
                  root: {
                    background: "var(--nv-accent)",
                    color: "var(--nv-dark)",
                    fontWeight: 700,
                    "&:hover": {
                      background: "var(--nv-accent-hover)"
                    }
                  }
                }}
              >
                {t("clients.guardarCambios")}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Modal para invitar cliente */}
      <BottomSheet
        onClose={handleCloseInviteModal}
        opened={inviteModalOpened}
        size="md"
        title={t("clients.invitarCliente")}
        radius="lg"
      >
        {lastInvitationUrl ? (
          <Stack gap="md">
            <Box 
              p="lg" 
              style={{ 
                background: "#10B98115", 
                borderRadius: "12px",
                border: "1px solid #10B981"
              }}
            >
              <Group gap="sm" mb="sm">
                <IconCheck size={20} color="#10B981" />
                <Text fw={600} style={{ color: "#10B981" }}>
                  {t("clients.invitacionEnviada")}
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {t("clients.seHaEnviadoUnEmail")}
              </Text>
            </Box>
            
            <Text size="sm" c="dimmed">
              {t("clients.elClienteRecibiraUnCorreo")}
            </Text>

            <Button 
              onClick={handleCloseInviteModal}
              fullWidth
              radius="xl"
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                }
              }}
            >
              {t("clients.cerrar")}
            </Button>
          </Stack>
        ) : (
          <form onSubmit={inviteForm.onSubmit(handleInviteClient)}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {t("clients.enviaUnaInvitacionPorEmail")}
              </Text>
              
              <TextInput
                label={t("clients.emailDelCliente")}
                placeholder={t("clients.clienteEmailCom")}
                required
                radius="md"
                leftSection={<IconMail size={16} />}
                {...inviteForm.getInputProps("email")}
              />
              
              <Group grow>
                <TextInput
                  label={t("clients.nombreOpcional")}
                  placeholder={t("clients.juan")}
                  radius="md"
                  {...inviteForm.getInputProps("first_name")}
                />
                <TextInput
                  label={t("clients.apellidoOpcional")}
                  placeholder={t("clients.garcia")}
                  radius="md"
                  {...inviteForm.getInputProps("last_name")}
                />
              </Group>
              
              <Textarea
                label={t("clients.mensajePersonalizadoOpcional")}
                placeholder={t("clients.holaTeInvitoAUnirte")}
                minRows={3}
                radius="md"
                {...inviteForm.getInputProps("message")}
              />

              <Select
                label={t("clients.planDeSuscripcion")}
                placeholder={t("clients.seleccionaUnPlan")}
                data={[
                  { value: "", label: t("clients.gratuitoSinPlanDePago") },
                  ...productOptions,
                ]}
                clearable
                radius="md"
                description={t("clients.seleccionaGratuitoParaClientesQue")}
                {...inviteForm.getInputProps("product_id")}
              />

              <Group justify="flex-end" mt="md">
                <Button 
                  onClick={handleCloseInviteModal} 
                  variant="default"
                  radius="xl"
                >
                  {t("clients.cancelar")}
                </Button>
                <Button 
                  loading={createInvitation.isPending} 
                  type="submit"
                  radius="xl"
                  leftSection={<IconSend size={16} />}
                  styles={{
                    root: {
                      background: "var(--nv-accent)",
                      color: "var(--nv-dark)",
                      fontWeight: 700,
                      "&:hover": {
                        background: "var(--nv-accent-hover)"
                      }
                    }
                  }}
                >
                  {t("clients.enviarInvitacion")}
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </BottomSheet>

      {/* Modal de confirmación de eliminación permanente */}
      <BottomSheet
        opened={deleteConfirmOpened}
        onClose={() => { closeDeleteConfirm(); setClientToDelete(null); }}
        title={
          clientToDelete?.deleted_at
            ? t("clientsPage.confirmarEliminaciónDefinitiva")
            : t("clientsPage.moverAEliminados")
        }
        radius="lg"
        size="sm"
      >
        <Stack gap="md">
          {clientToDelete?.deleted_at ? (
            <>
              <Text size="sm">
                ¿Eliminar definitivamente a{" "}
                <Text span fw={700}>{clientToDelete?.first_name} {clientToDelete?.last_name}</Text>?
              </Text>
              <Text size="xs" c="red">
                {t("clients.estaAccionNoSePuede")}
              </Text>
            </>
          ) : (
            <>
              <Text size="sm">
                ¿Mover a Eliminados a{" "}
                <Text span fw={700}>{clientToDelete?.first_name} {clientToDelete?.last_name}</Text>?
              </Text>
              <Text size="xs" c="dimmed">
                {t("clients.podrasRestaurarloDesdeLaPestana")}
              </Text>
            </>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { closeDeleteConfirm(); setClientToDelete(null); }} radius="xl">
              {t("clients.cancelar")}
            </Button>
            <Button
              color="red"
              loading={permanentDeleteClient.isPending}
              onClick={() => handlePermanentDelete(clientToDelete)}
              radius="xl"
            >
              {clientToDelete?.deleted_at ? t("clientsPage.eliminarDefinitivamente") : t("clientsPage.moverAEliminados")}
            </Button>
          </Group>
        </Stack>
      </BottomSheet>
    </Container>
  );
}
