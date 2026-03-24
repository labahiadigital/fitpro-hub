import {
  Box,
  Group,
  Modal,
  ScrollArea,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import {
  IconArrowRight,
  IconBarbell,
  IconBook,
  IconBulb,
  IconCalendarEvent,
  IconChartBar,
  IconFileText,
  IconForms,
  IconHome,
  IconMessage,
  IconPackage,
  IconReceipt,
  IconRobot,
  IconSalad,
  IconSearch,
  IconSettings,
  IconTrophy,
  IconUser,
  IconUsers,
  IconUsersGroup,
  IconVideo,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeText } from "../../utils/text";

interface CommandPaletteProps {
  opened: boolean;
  close: () => void;
}

const actions = [
  {
    group: "Navegación",
    items: [
      { icon: IconHome, label: "Panel Principal", description: "Vista general de métricas y KPIs", to: "/dashboard" },
      { icon: IconUsers, label: "Clientes", description: "Gestionar clientes, invitaciones y etiquetas", to: "/clients" },
      { icon: IconCalendarEvent, label: "Calendario", description: "Agenda y próximas sesiones", to: "/calendar" },
      { icon: IconBarbell, label: "Entrenamientos", description: "Programas de entrenamiento y ejercicios", to: "/workouts" },
      { icon: IconSalad, label: "Nutrición", description: "Planes de nutrición y recetas", to: "/nutrition" },
      { icon: IconForms, label: "Formularios", description: "Formularios y cuestionarios", to: "/forms" },
      { icon: IconFileText, label: "Documentos", description: "Documentos compartidos", to: "/documents" },
      { icon: IconMessage, label: "Chat", description: "Mensajes con clientes", to: "/chat" },
      { icon: IconPackage, label: "Catálogo", description: "Productos y servicios", to: "/catalog" },
      { icon: IconReceipt, label: "Facturación", description: "Pagos, facturas y suscripciones", to: "/billing" },
      { icon: IconTrophy, label: "Comunidad", description: "Retos y gamificación", to: "/community" },
      { icon: IconUsersGroup, label: "Equipo", description: "Gestionar colaboradores", to: "/team" },
      { icon: IconRobot, label: "Automatizaciones", description: "Flujos automáticos y triggers", to: "/automations" },
      { icon: IconChartBar, label: "Reportes", description: "Informes y analíticas", to: "/reports" },
      { icon: IconBook, label: "Academia / LMS", description: "Cursos y contenidos formativos", to: "/lms" },
      { icon: IconVideo, label: "Clases en Vivo", description: "Sesiones en directo", to: "/live-classes" },
      { icon: IconBulb, label: "Sugerencias", description: "Ideas y mejoras propuestas", to: "/suggestions" },
      { icon: IconSettings, label: "Configuración", description: "Ajustes de cuenta y preferencias", to: "/settings" },
    ],
  },
  {
    group: "Acciones Rápidas",
    items: [
      { icon: IconUser, label: "Crear Nuevo Cliente", description: "Invitar o registrar un nuevo cliente", to: "/clients?action=new" },
      { icon: IconCalendarEvent, label: "Nueva Reserva", description: "Crear una nueva sesión o cita", to: "/calendar?action=new" },
      { icon: IconBarbell, label: "Nuevo Entrenamiento", description: "Crear un programa de entrenamiento", to: "/workouts?action=new" },
    ],
  },
];

export function CommandPalette({ opened, close }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredActions = useMemo(
    () =>
      actions
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              normalizeText(item.label).includes(normalizeText(query)) ||
              normalizeText(item.description).includes(normalizeText(query))
          ),
        }))
        .filter((group) => group.items.length > 0),
    [query]
  );

  const flatItems = useMemo(
    () => filteredActions.flatMap((g) => g.items),
    [filteredActions]
  );

  const handleNavigate = (to: string) => {
    navigate(to);
    close();
    setQuery("");
  };

  useHotkeys([
    [
      "ArrowDown",
      () =>
        setActiveIndex((current) =>
          current < flatItems.length - 1 ? current + 1 : current
        ),
    ],
    [
      "ArrowUp",
      () => setActiveIndex((current) => (current > 0 ? current - 1 : current)),
    ],
    [
      "Enter",
      () => {
        if (flatItems[activeIndex]) {
          handleNavigate(flatItems[activeIndex].to);
        }
      },
    ],
  ]);

  return (
    <Modal
      opened={opened}
      onClose={close}
      withCloseButton={false}
      padding={0}
      size="lg"
      radius="lg"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      styles={{
        content: {
          backgroundColor: "#2A2822",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        },
      }}
      centered
    >
      {/* Search Input */}
      <Box
        p="md"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}
      >
        <TextInput
          placeholder="¿Qué necesitas hacer?..."
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setActiveIndex(0);
          }}
          leftSection={<IconSearch size={20} color="var(--nv-accent)" />}
          rightSection={
            <Box
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                fontSize: "10px",
                fontWeight: 600,
              }}
            >
              ESC
            </Box>
          }
          styles={{
            input: {
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              fontSize: "1.1rem",
              paddingLeft: 40,
              height: 40,
              "&::placeholder": {
                color: "rgba(255, 255, 255, 0.3)",
              },
            },
            section: { pointerEvents: "none" },
          }}
          autoFocus
        />
      </Box>

      {/* Results */}
      <ScrollArea.Autosize mah={400} type="always">
        {filteredActions.length > 0 ? (
          <Box p="xs">
            {filteredActions.map((group, groupIndex) => (
              <Box key={group.group} mb={groupIndex < filteredActions.length - 1 ? "xs" : 0}>
                <Text
                  size="xs"
                  c="dimmed"
                  fw={600}
                  px="sm"
                  py={4}
                  style={{ textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px" }}
                >
                  {group.group}
                </Text>
                {group.items.map((item) => {
                  // Calcular índice global para el resaltado
                  const globalIndex = flatItems.indexOf(item);
                  const isActive = globalIndex === activeIndex;

                  return (
                    <UnstyledButton
                      key={item.label}
                      onClick={() => handleNavigate(item.to)}
                      w="100%"
                      p="sm"
                      style={{
                        borderRadius: "8px",
                        backgroundColor: isActive
                          ? "rgba(231, 226, 71, 0.15)"
                          : "transparent",
                        transition: "all 0.1s ease",
                      }}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                    >
                      <Group justify="space-between">
                        <Group>
                          <Box
                            style={{
                              color: isActive ? "#E7E247" : "rgba(255, 255, 255, 0.5)",
                              display: "flex",
                            }}
                          >
                            <item.icon size={20} stroke={1.5} />
                          </Box>
                          <Box>
                            <Text
                              size="sm"
                              fw={500}
                              style={{
                                color: isActive ? "white" : "rgba(255, 255, 255, 0.9)",
                              }}
                            >
                              {item.label}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {item.description}
                            </Text>
                          </Box>
                        </Group>
                        {isActive && (
                          <IconArrowRight
                            size={16}
                            color="#E7E247"
                            style={{ opacity: 0.8 }}
                          />
                        )}
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Box>
            ))}
          </Box>
        ) : (
          <Box py="xl" ta="center">
            <Text c="dimmed">No se encontraron resultados</Text>
          </Box>
        )}
      </ScrollArea.Autosize>

      {/* Footer */}
      <Box
        p="xs"
        px="md"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <Group justify="flex-end" gap="lg">
          <Group gap={6}>
            <IconArrowRight size={12} color="rgba(255,255,255,0.4)" />
            <Text size="xs" c="dimmed">para seleccionar</Text>
          </Group>
          <Group gap={6}>
            <Box
              style={{
                display: "flex",
                gap: 2,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <IconArrowRight size={12} style={{ transform: "rotate(-90deg)" }} />
              <IconArrowRight size={12} style={{ transform: "rotate(90deg)" }} />
            </Box>
            <Text size="xs" c="dimmed">para navegar</Text>
          </Group>
        </Group>
      </Box>
    </Modal>
  );
}

