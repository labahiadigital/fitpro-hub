import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Checkbox,
  Group,
  Menu,
  Pagination,
  Skeleton,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconSearch,
  IconTrash,
  IconFilter,
} from "@tabler/icons-react";
import { useState } from "react";

interface Column<T> {
  key: string;
  title: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  selectable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
  };
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  selectable = false,
  searchable = false,
  searchPlaceholder = "Buscar...",
  onSearch,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  pagination,
  emptyMessage = "No hay datos disponibles",
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleRow = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds((current) =>
      current.length === data.length ? [] : data.map((item) => item.id)
    );
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const hasActions = onEdit || onDelete || onView;

  if (loading) {
    return (
      <Box className="nv-card" p="lg">
        {searchable && <Skeleton height={44} mb="lg" radius="xl" />}
        <Skeleton height={48} mb="sm" radius="md" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton height={64} key={i} mb="xs" radius="md" />
        ))}
      </Box>
    );
  }

  return (
    <Box 
      className="nv-card" 
      style={{ 
        overflow: "hidden",
        border: "1px solid var(--border-subtle)"
      }}
    >
      {searchable && (
        <Box
          p="lg"
          style={{ 
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--nv-surface-subtle)"
          }}
        >
          <Group justify="space-between">
            <TextInput
              leftSection={<IconSearch size={18} color="var(--nv-slate)" />}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              value={searchQuery}
              radius="xl"
              size="md"
              style={{ flex: 1, maxWidth: 400 }}
              styles={{
                input: {
                  backgroundColor: "var(--nv-surface)",
                  border: "1px solid var(--border-subtle)",
                  fontWeight: 500,
                  "&:focus": {
                    borderColor: "var(--nv-primary)",
                    boxShadow: "0 0 0 3px var(--nv-primary-glow)"
                  }
                },
              }}
            />
            <Tooltip label="Filtros avanzados">
              <ActionIcon 
                variant="default" 
                size="lg" 
                radius="xl"
                style={{ 
                  borderColor: "var(--border-subtle)",
                  color: "var(--nv-slate)"
                }}
              >
                <IconFilter size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Box>
      )}

      <Table.ScrollContainer minWidth={800}>
        <Table 
          verticalSpacing="md" 
          horizontalSpacing="lg"
          highlightOnHover
          highlightOnHoverColor="var(--nv-surface-subtle)"
          styles={{
            thead: {
              backgroundColor: "var(--nv-surface-subtle)",
            },
            th: {
              borderBottom: "2px solid var(--border-subtle) !important",
              padding: "16px 20px !important",
            },
            td: {
              borderBottom: "1px solid var(--border-subtle) !important",
              padding: "16px 20px !important",
            },
            tr: {
              transition: "background-color 0.15s ease",
            }
          }}
        >
          <Table.Thead>
            <Table.Tr>
              {selectable && (
                <Table.Th style={{ width: 50 }}>
                  <Checkbox
                    checked={
                      selectedIds.length === data.length && data.length > 0
                    }
                    indeterminate={
                      selectedIds.length > 0 && selectedIds.length < data.length
                    }
                    onChange={toggleAll}
                    color="yellow"
                    styles={{
                      input: {
                        cursor: "pointer",
                        "&:checked": {
                          backgroundColor: "var(--nv-accent)",
                          borderColor: "var(--nv-accent)"
                        }
                      }
                    }}
                  />
                </Table.Th>
              )}
              {columns.map((column) => (
                <Table.Th key={column.key} style={{ width: column.width }}>
                  <Text 
                    fw={700} 
                    size="xs" 
                    tt="uppercase"
                    style={{ 
                      letterSpacing: "0.08em",
                      color: "var(--nv-slate)"
                    }}
                  >
                    {column.title}
                  </Text>
                </Table.Th>
              ))}
              {hasActions && <Table.Th style={{ width: 80 }} />}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={
                    columns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)
                  }
                >
                  <Box py="xl" ta="center">
                    <Text c="dimmed" size="sm" fw={500}>
                      {emptyMessage}
                    </Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : (
              data.map((item) => (
                <Table.Tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  style={{ 
                    cursor: onRowClick ? "pointer" : "default",
                  }}
                >
                  {selectable && (
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleRow(item.id)}
                        color="yellow"
                        styles={{
                          input: {
                            cursor: "pointer",
                            "&:checked": {
                              backgroundColor: "var(--nv-accent)",
                              borderColor: "var(--nv-accent)"
                            }
                          }
                        }}
                      />
                    </Table.Td>
                  )}
                  {columns.map((column) => (
                    <Table.Td key={column.key}>
                      {column.render
                        ? column.render(item)
                        : (item as Record<string, unknown>)[
                            column.key
                          ]?.toString()}
                    </Table.Td>
                  ))}
                  {hasActions && (
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Menu position="bottom-end" withArrow shadow="lg">
                        <Menu.Target>
                          <ActionIcon 
                            color="gray" 
                            variant="subtle"
                            radius="xl"
                          >
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {onView && (
                            <Menu.Item
                              leftSection={<IconEye size={16} />}
                              onClick={() => onView(item)}
                            >
                              Ver detalles
                            </Menu.Item>
                          )}
                          {onEdit && (
                            <Menu.Item
                              leftSection={<IconEdit size={16} />}
                              onClick={() => onEdit(item)}
                            >
                              Editar
                            </Menu.Item>
                          )}
                          {onDelete && (
                            <>
                              <Menu.Divider />
                              <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={16} />}
                                onClick={() => onDelete(item)}
                              >
                                Eliminar
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {pagination && pagination.total > pagination.pageSize && (
        <Group
          justify="space-between"
          p="lg"
          style={{ 
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--nv-surface-subtle)"
          }}
        >
          <Text size="sm" c="dimmed">
            Mostrando {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
          </Text>
          <Pagination
            onChange={pagination.onChange}
            size="sm"
            total={Math.ceil(pagination.total / pagination.pageSize)}
            value={pagination.page}
            radius="xl"
            styles={{
              control: {
                fontWeight: 600,
                "&[data-active]": {
                  backgroundColor: "var(--nv-accent)",
                  borderColor: "var(--nv-accent)",
                  color: "var(--nv-dark)"
                }
              }
            }}
          />
        </Group>
      )}
    </Box>
  );
}

// Helper components for common column renders
export function ClientCell({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
}) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Avatar 
        radius="xl" 
        size={40} 
        src={avatarUrl}
        styles={{
          root: {
            border: "2px solid var(--border-subtle)"
          }
        }}
      >
        {name.charAt(0)}
      </Avatar>
      <Box>
        <Text fw={600} size="sm" style={{ color: "var(--nv-dark)" }}>
          {name}
        </Text>
        <Text size="xs" style={{ color: "var(--nv-slate)" }}>
          {email}
        </Text>
      </Box>
    </Group>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    active: { color: "var(--nv-success)", bg: "var(--nv-success-bg)", label: "Activo" },
    inactive: { color: "var(--nv-slate)", bg: "rgba(100, 116, 139, 0.1)", label: "Inactivo" },
    pending: { color: "var(--nv-warning)", bg: "var(--nv-warning-bg)", label: "Pendiente" },
    confirmed: { color: "var(--nv-primary)", bg: "var(--nv-primary-glow)", label: "Confirmado" },
    cancelled: { color: "var(--nv-error)", bg: "var(--nv-error-bg)", label: "Cancelado" },
    completed: { color: "var(--nv-success)", bg: "var(--nv-success-bg)", label: "Completado" },
    no_show: { color: "var(--nv-warning)", bg: "var(--nv-warning-bg)", label: "No asistió" },
  };

  const cfg = config[status] || { color: "var(--nv-slate)", bg: "rgba(100, 116, 139, 0.1)", label: status };

  return (
    <Badge 
      size="sm" 
      variant="filled"
      radius="xl"
      styles={{
        root: {
          backgroundColor: cfg.bg,
          color: cfg.color,
          fontWeight: 600,
          textTransform: "capitalize",
          padding: "4px 12px"
        }
      }}
    >
      {cfg.label}
    </Badge>
  );
}

export function TagsList({
  tags,
}: {
  tags: Array<{ name: string; color: string }>;
}) {
  return (
    <Group gap={6}>
      {tags.slice(0, 3).map((tag, index) => (
        <Badge 
          key={index} 
          size="sm" 
          variant="light"
          radius="xl"
          styles={{
            root: {
              backgroundColor: `${tag.color}15`,
              color: tag.color,
              border: `1px solid ${tag.color}30`,
              fontWeight: 600
            }
          }}
        >
          {tag.name}
        </Badge>
      ))}
      {tags.length > 3 && (
        <Badge 
          size="sm" 
          variant="light"
          radius="xl"
          styles={{
            root: {
              backgroundColor: "var(--nv-surface-subtle)",
              color: "var(--nv-slate)",
              fontWeight: 600
            }
          }}
        >
          +{tags.length - 3}
        </Badge>
      )}
    </Group>
  );
}
