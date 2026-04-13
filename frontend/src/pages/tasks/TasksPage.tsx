import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Menu,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconArchive,
  IconCalendar,
  IconCheck,
  IconDotsVertical,
  IconFilter,
  IconGripVertical,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { PageHeader } from "../../components/common/PageHeader";
import { BottomSheet } from "../../components/common/BottomSheet";
import {
  type Task,
  type TaskFilters,
  type TaskPriority,
  type TaskState,
  type TaskStatus,
  useArchiveTask,
  useCreateTask,
  useDeleteTask,
  useTasksList,
  useUpdateTask,
  useUpdateTaskStatus,
} from "../../hooks/useTasks";
import { useTeamMembers } from "../../hooks/useTeam";
import { useTeamGroupsList } from "../../hooks/useTeamGroups";
import { useClients } from "../../hooks/useClients";

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: "Alta", color: "red" },
  medium: { label: "Media", color: "yellow" },
  low: { label: "Baja", color: "blue" },
};

const COLUMN_CONFIG: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "Por Hacer", color: "gray" },
  { id: "in_progress", label: "En Progreso", color: "blue" },
  { id: "done", label: "Completadas", color: "green" },
];

function TaskCard({
  task,
  index,
  memberMap,
  onEdit,
  onArchive,
  onDelete,
}: {
  task: Task;
  index: number;
  memberMap: Map<string, { name: string; email: string }>;
  onEdit: (t: Task) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const assignee = task.assigned_to ? memberMap.get(task.assigned_to) : null;
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="nv-card"
          p="sm"
          mb="xs"
          style={{
            ...provided.draggableProps.style,
            boxShadow: snapshot.isDragging
              ? "0 8px 24px rgba(0,0,0,0.15)"
              : undefined,
          }}
        >
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Group gap="xs" wrap="nowrap" align="flex-start" style={{ flex: 1 }}>
              <Box
                {...provided.dragHandleProps}
                style={{ cursor: "grab", paddingTop: 2 }}
              >
                <IconGripVertical size={14} style={{ opacity: 0.4 }} />
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} lineClamp={2}>
                  {task.title}
                </Text>
                {task.description && (
                  <Text size="xs" c="dimmed" lineClamp={2} mt={2}>
                    {task.description}
                  </Text>
                )}
                <Group gap="xs" mt="xs">
                  <Badge size="xs" variant="light" color={priorityCfg.color}>
                    {priorityCfg.label}
                  </Badge>
                  {task.due_date && (
                    <Badge
                      size="xs"
                      variant="light"
                      color={isOverdue ? "red" : "gray"}
                      leftSection={<IconCalendar size={10} />}
                    >
                      {new Date(task.due_date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Badge>
                  )}
                </Group>
              </Box>
            </Group>
            <Group gap={4} wrap="nowrap">
              {assignee && (
                <Avatar size="sm" radius="xl" color="blue">
                  {assignee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </Avatar>
              )}
              <Menu shadow="md" width={160} position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" size="sm">
                    <IconDotsVertical size={14} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconCheck size={14} />}
                    onClick={() => onEdit(task)}
                  >
                    Editar
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconArchive size={14} />}
                    onClick={() => onArchive(task.id)}
                  >
                    Archivar
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => onDelete(task.id)}
                  >
                    Eliminar
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Paper>
      )}
    </Draggable>
  );
}

export function TasksPage() {
  const [createOpened, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [filterState, setFilterState] = useState<TaskState>("created");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterAssigned, setFilterAssigned] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);

  const filters: TaskFilters = useMemo(
    () => ({
      state: filterState,
      priority: filterPriority as TaskPriority | undefined,
      assigned_to: filterAssigned || undefined,
      search: debouncedSearch || undefined,
    }),
    [filterState, filterPriority, filterAssigned, debouncedSearch]
  );

  const { data: tasks = [], isLoading } = useTasksList(filters);
  const { data: members = [] } = useTeamMembers();
  const { data: groups = [] } = useTeamGroupsList();
  const { data: clientsData } = useClients({ page: 1, search: "", page_size: 200 });
  const clientOptions = useMemo(
    () =>
      (clientsData?.items || []).map((c: any) => ({
        value: c.id,
        label: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email,
      })),
    [clientsData]
  );
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const statusMutation = useUpdateTaskStatus();
  const archiveMutation = useArchiveTask();
  const deleteMutation = useDeleteTask();

  const memberMap = useMemo(() => {
    const m = new Map<string, { name: string; email: string }>();
    for (const member of members) {
      m.set(member.user_id || member.id, {
        name: member.full_name || member.name || member.email,
        email: member.email,
      });
    }
    return m;
  }, [members]);

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.user_id || m.id,
        label: m.full_name || m.name || m.email,
      })),
    [members]
  );

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of tasks) {
      const col = grouped[task.status as TaskStatus];
      if (col) col.push(task);
    }
    return grouped;
  }, [tasks]);

  const createForm = useForm({
    initialValues: {
      title: "",
      description: "",
      priority: "medium" as TaskPriority,
      assigned_to: null as string | null,
      team_group_id: null as string | null,
      client_id: null as string | null,
      due_date: null as Date | null,
      due_time: "" as string,
    },
    validate: {
      title: (v) => (v.trim() ? null : "El título es obligatorio"),
    },
  });

  const editForm = useForm({
    initialValues: {
      title: "",
      description: "",
      priority: "medium" as TaskPriority,
      assigned_to: null as string | null,
      team_group_id: null as string | null,
      client_id: null as string | null,
      due_date: null as Date | null,
      due_time: "" as string,
    },
    validate: {
      title: (v) => (v.trim() ? null : "El título es obligatorio"),
    },
  });

  const groupOptions = useMemo(
    () => groups.map((g: any) => ({ value: g.id, label: g.name })),
    [groups]
  );

  const handleCreate = createForm.onSubmit((values) => {
    createMutation.mutate(
      {
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        assigned_to: values.assigned_to || undefined,
        team_group_id: values.team_group_id || undefined,
        client_id: values.client_id || undefined,
        due_date: values.due_date?.toISOString(),
        due_time: values.due_time || undefined,
      },
      {
        onSuccess: () => {
          closeCreate();
          createForm.reset();
        },
      }
    );
  });

  const handleEdit = editForm.onSubmit((values) => {
    if (!editingTask) return;
    updateMutation.mutate(
      {
        id: editingTask.id,
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        assigned_to: values.assigned_to || undefined,
        team_group_id: values.team_group_id || undefined,
        client_id: values.client_id || undefined,
        due_date: values.due_date?.toISOString(),
        due_time: values.due_time || undefined,
      },
      {
        onSuccess: () => {
          closeEdit();
          setEditingTask(null);
        },
      }
    );
  });

  const openEditTask = useCallback(
    (task: Task) => {
      setEditingTask(task);
      editForm.setValues({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        assigned_to: task.assigned_to || null,
        team_group_id: (task as any).team_group_id || null,
        client_id: task.client_id || null,
        due_date: task.due_date ? new Date(task.due_date) : null,
        due_time: task.due_time || "",
      });
      openEdit();
    },
    [editForm, openEdit]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const newStatus = result.destination.droppableId as TaskStatus;
      const taskId = result.draggableId;
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;
      statusMutation.mutate({ id: taskId, status: newStatus });
    },
    [tasks, statusMutation]
  );

  const hasFilters = !!filterPriority || !!filterAssigned || !!debouncedSearch;

  const clearFilters = () => {
    setFilterPriority(null);
    setFilterAssigned(null);
    setSearchQuery("");
  };

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: "Nueva Tarea",
          icon: <IconPlus size={16} />,
          onClick: openCreate,
        }}
        description="Gestiona las tareas de tu equipo"
        title="Tareas"
      />

      {/* Filters */}
      <Group mb="lg" gap="sm" wrap="wrap">
        <SegmentedControl
          value={filterState}
          onChange={(v) => setFilterState(v as TaskState)}
          data={[
            { value: "created", label: "Activas" },
            { value: "archived", label: "Archivadas" },
            { value: "deleted", label: "Eliminadas" },
          ]}
          size="sm"
        />
        <Select
          placeholder="Prioridad"
          clearable
          size="sm"
          w={140}
          leftSection={<IconFilter size={14} />}
          value={filterPriority}
          onChange={setFilterPriority}
          data={[
            { value: "high", label: "Alta" },
            { value: "medium", label: "Media" },
            { value: "low", label: "Baja" },
          ]}
        />
        <Select
          placeholder="Asignado a"
          clearable
          searchable
          size="sm"
          w={180}
          value={filterAssigned}
          onChange={setFilterAssigned}
          data={memberOptions}
        />
        <TextInput
          placeholder="Buscar tareas..."
          size="sm"
          leftSection={<IconSearch size={14} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        {hasFilters && (
          <Button
            variant="subtle"
            size="sm"
            leftSection={<IconX size={14} />}
            onClick={clearFilters}
          >
            Limpiar
          </Button>
        )}
      </Group>

      {/* Kanban Board */}
      {isLoading ? (
        <Box ta="center" py="xl">
          <Loader size="lg" />
        </Box>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--mantine-spacing-md)",
              minHeight: 400,
            }}
          >
            {COLUMN_CONFIG.map((col) => (
              <Box key={col.id}>
                <Group justify="space-between" mb="sm" px="xs">
                  <Group gap="xs">
                    <Badge variant="dot" color={col.color} size="lg">
                      {col.label}
                    </Badge>
                    <Badge variant="light" color="gray" size="sm" circle>
                      {columns[col.id].length}
                    </Badge>
                  </Group>
                </Group>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: 200,
                        padding: "var(--mantine-spacing-xs)",
                        borderRadius: "var(--mantine-radius-md)",
                        backgroundColor: snapshot.isDraggingOver
                          ? "var(--mantine-color-blue-light)"
                          : "var(--mantine-color-gray-light)",
                        transition: "background-color 150ms ease",
                      }}
                    >
                      {columns[col.id].length === 0 && !snapshot.isDraggingOver && (
                        <Text
                          ta="center"
                          c="dimmed"
                          size="sm"
                          py="xl"
                          style={{ opacity: 0.6 }}
                        >
                          Sin tareas
                        </Text>
                      )}
                      {columns[col.id].map((task, idx) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={idx}
                          memberMap={memberMap}
                          onEdit={openEditTask}
                          onArchive={(id) => archiveMutation.mutate(id)}
                          onDelete={(id) => deleteMutation.mutate(id)}
                        />
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Box>
            ))}
          </Box>
        </DragDropContext>
      )}

      {/* Create Task Modal */}
      <BottomSheet
        opened={createOpened}
        onClose={closeCreate}
        title="Nueva Tarea"
        centered
        size="lg"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        <form onSubmit={handleCreate}>
          <Stack>
            <TextInput
              label="Título"
              placeholder="¿Qué hay que hacer?"
              required
              {...createForm.getInputProps("title")}
            />
            <Textarea
              label="Descripción"
              placeholder="Detalles adicionales (opcional)"
              autosize
              minRows={2}
              maxRows={6}
              {...createForm.getInputProps("description")}
            />
            <Group grow>
              <Select
                label="Prioridad"
                data={[
                  { value: "high", label: "Alta" },
                  { value: "medium", label: "Media" },
                  { value: "low", label: "Baja" },
                ]}
                {...createForm.getInputProps("priority")}
              />
              <Select
                label="Asignar a"
                placeholder="Sin asignar"
                clearable
                searchable
                data={memberOptions}
                {...createForm.getInputProps("assigned_to")}
              />
            </Group>
            <Group grow>
              <Select
                label="Asignar a equipo"
                placeholder="Sin equipo"
                clearable
                searchable
                data={groupOptions}
                {...createForm.getInputProps("team_group_id")}
              />
              <Select
                label="Vincular a cliente"
                placeholder="Sin cliente"
                clearable
                searchable
                data={clientOptions}
                {...createForm.getInputProps("client_id")}
              />
            </Group>
            <Group grow>
              <DatePickerInput
                label="Fecha límite"
                placeholder="Sin fecha límite"
                clearable
                valueFormat="DD MMM YYYY"
                locale="es"
                leftSection={<IconCalendar size={14} />}
                {...createForm.getInputProps("due_date")}
              />
              <TextInput
                label="Hora"
                placeholder="HH:MM"
                type="time"
                {...createForm.getInputProps("due_time")}
              />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeCreate}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="nv-button"
                loading={createMutation.isPending}
                leftSection={<IconPlus size={14} />}
              >
                Crear Tarea
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Edit Task Modal */}
      <BottomSheet
        opened={editOpened}
        onClose={() => {
          closeEdit();
          setEditingTask(null);
        }}
        title="Editar Tarea"
        centered
        size="lg"
        styles={{
          header: { borderBottom: "1px solid var(--nv-border)" },
          title: { fontFamily: "var(--font-heading)", fontWeight: 600 },
        }}
      >
        <form onSubmit={handleEdit}>
          <Stack>
            <TextInput
              label="Título"
              placeholder="¿Qué hay que hacer?"
              required
              {...editForm.getInputProps("title")}
            />
            <Textarea
              label="Descripción"
              placeholder="Detalles adicionales (opcional)"
              autosize
              minRows={2}
              maxRows={6}
              {...editForm.getInputProps("description")}
            />
            <Group grow>
              <Select
                label="Prioridad"
                data={[
                  { value: "high", label: "Alta" },
                  { value: "medium", label: "Media" },
                  { value: "low", label: "Baja" },
                ]}
                {...editForm.getInputProps("priority")}
              />
              <Select
                label="Asignar a"
                placeholder="Sin asignar"
                clearable
                searchable
                data={memberOptions}
                {...editForm.getInputProps("assigned_to")}
              />
            </Group>
            <Group grow>
              <Select
                label="Asignar a equipo"
                placeholder="Sin equipo"
                clearable
                searchable
                data={groupOptions}
                {...editForm.getInputProps("team_group_id")}
              />
              <Select
                label="Vincular a cliente"
                placeholder="Sin cliente"
                clearable
                searchable
                data={clientOptions}
                {...editForm.getInputProps("client_id")}
              />
            </Group>
            <Group grow>
              <DatePickerInput
                label="Fecha límite"
                placeholder="Sin fecha límite"
                clearable
                valueFormat="DD MMM YYYY"
                locale="es"
                leftSection={<IconCalendar size={14} />}
                {...editForm.getInputProps("due_date")}
              />
              <TextInput
                label="Hora"
                placeholder="HH:MM"
                type="time"
                {...editForm.getInputProps("due_time")}
              />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  closeEdit();
                  setEditingTask(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="nv-button"
                loading={updateMutation.isPending}
              >
                Guardar Cambios
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>
    </Container>
  );
}

export default TasksPage;
