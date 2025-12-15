import { useState } from 'react'
import {
  Table,
  Checkbox,
  Group,
  Text,
  ActionIcon,
  Menu,
  Pagination,
  TextInput,
  Paper,
  Box,
  Badge,
  Avatar,
  Skeleton,
} from '@mantine/core'
import {
  IconSearch,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconEye,
} from '@tabler/icons-react'

interface Column<T> {
  key: string
  title: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  width?: number
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  selectable?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  onRowClick?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onView?: (item: T) => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onChange: (page: number) => void
  }
  emptyMessage?: string
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  selectable = false,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  onSearch,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  pagination,
  emptyMessage = 'No hay datos disponibles',
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const toggleRow = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  const toggleAll = () => {
    setSelectedIds((current) =>
      current.length === data.length ? [] : data.map((item) => item.id)
    )
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const hasActions = onEdit || onDelete || onView

  if (loading) {
    return (
      <Paper withBorder radius="md" p="md">
        {searchable && <Skeleton height={36} mb="md" />}
        <Skeleton height={40} mb="sm" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={50} mb="xs" />
        ))}
      </Paper>
    )
  }

  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      {searchable && (
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <TextInput
            placeholder={searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            styles={{
              input: {
                backgroundColor: 'var(--mantine-color-gray-0)',
                border: 'none',
              },
            }}
          />
        </Box>
      )}

      <Table.ScrollContainer minWidth={800}>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {selectable && (
                <Table.Th style={{ width: 40 }}>
                  <Checkbox
                    checked={selectedIds.length === data.length && data.length > 0}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < data.length}
                    onChange={toggleAll}
                  />
                </Table.Th>
              )}
              {columns.map((column) => (
                <Table.Th key={column.key} style={{ width: column.width }}>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    {column.title}
                  </Text>
                </Table.Th>
              ))}
              {hasActions && <Table.Th style={{ width: 60 }} />}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={columns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)}
                >
                  <Text ta="center" c="dimmed" py="xl">
                    {emptyMessage}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data.map((item) => (
                <Table.Tr
                  key={item.id}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleRow(item.id)}
                      />
                    </Table.Td>
                  )}
                  {columns.map((column) => (
                    <Table.Td key={column.key}>
                      {column.render
                        ? column.render(item)
                        : (item as Record<string, unknown>)[column.key]?.toString()}
                    </Table.Td>
                  ))}
                  {hasActions && (
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {onView && (
                            <Menu.Item
                              leftSection={<IconEye size={14} />}
                              onClick={() => onView(item)}
                            >
                              Ver detalles
                            </Menu.Item>
                          )}
                          {onEdit && (
                            <Menu.Item
                              leftSection={<IconEdit size={14} />}
                              onClick={() => onEdit(item)}
                            >
                              Editar
                            </Menu.Item>
                          )}
                          {onDelete && (
                            <Menu.Item
                              leftSection={<IconTrash size={14} />}
                              color="red"
                              onClick={() => onDelete(item)}
                            >
                              Eliminar
                            </Menu.Item>
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
        <Group justify="center" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Pagination
            value={pagination.page}
            onChange={pagination.onChange}
            total={Math.ceil(pagination.total / pagination.pageSize)}
            size="sm"
          />
        </Group>
      )}
    </Paper>
  )
}

// Helper components for common column renders
export function ClientCell({ name, email, avatarUrl }: { name: string; email: string; avatarUrl?: string }) {
  return (
    <Group gap="sm">
      <Avatar src={avatarUrl} radius="xl" size="sm">
        {name.charAt(0)}
      </Avatar>
      <Box>
        <Text size="sm" fw={500}>
          {name}
        </Text>
        <Text size="xs" c="dimmed">
          {email}
        </Text>
      </Box>
    </Group>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'green',
    inactive: 'gray',
    pending: 'yellow',
    confirmed: 'blue',
    cancelled: 'red',
    completed: 'green',
    no_show: 'orange',
  }

  const labels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    completed: 'Completado',
    no_show: 'No asistió',
  }

  return (
    <Badge color={colors[status] || 'gray'} variant="light" size="sm">
      {labels[status] || status}
    </Badge>
  )
}

export function TagsList({ tags }: { tags: Array<{ name: string; color: string }> }) {
  return (
    <Group gap={4}>
      {tags.slice(0, 3).map((tag, index) => (
        <Badge key={index} color={tag.color} variant="light" size="xs">
          {tag.name}
        </Badge>
      ))}
      {tags.length > 3 && (
        <Badge color="gray" variant="light" size="xs">
          +{tags.length - 3}
        </Badge>
      )}
    </Group>
  )
}

