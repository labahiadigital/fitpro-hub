import {
  ActionIcon,
  Box,
  Group,
  Kbd,
  Modal,
  ScrollArea,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconHome,
  IconSearch,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CommandPaletteProps {
  opened: boolean;
  close: () => void;
}

const actions = [
  {
    group: "Navegación",
    items: [
      {
        icon: IconHome,
        label: "Ir al Dashboard",
        description: "Vista general de métricas",
        to: "/dashboard",
      },
      {
        icon: IconUsers,
        label: "Gestión de Clientes",
        description: "Lista de todos los clientes activos",
        to: "/clients",
      },
      {
        icon: IconCalendarEvent,
        label: "Calendario",
        description: "Ver agenda y próximas sesiones",
        to: "/calendar",
      },
      {
        icon: IconSettings,
        label: "Configuración",
        description: "Ajustes de cuenta y preferencias",
        to: "/settings",
      },
    ],
  },
  {
    group: "Acciones Rápidas",
    items: [
      {
        icon: IconUser,
        label: "Crear Nuevo Cliente",
        description: "Registrar un nuevo usuario",
        to: "/clients?action=new",
      },
    ],
  },
];

export function CommandPalette({ opened, close }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Filtrar acciones basado en la búsqueda
  const filteredActions = actions
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  const flatItems = filteredActions.flatMap((g) => g.items);

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
                {group.items.map((item, itemIndex) => {
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
      </ScrollArea>

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

