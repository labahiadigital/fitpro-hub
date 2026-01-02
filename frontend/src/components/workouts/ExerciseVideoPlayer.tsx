import {
  ActionIcon,
  Box,
  Group,
  Modal,
  Paper,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlayerPlay,
  IconVideo,
  IconInfoCircle,
  IconAlertTriangle,
  IconCheck,
} from "@tabler/icons-react";
import { useState } from "react";

interface ExerciseVideoPlayerProps {
  exerciseName: string;
  videoUrl?: string;
  executionVideoUrl?: string;
  thumbnailUrl?: string;
  instructions?: string;
  commonMistakes?: string[];
  tips?: string[];
}

/**
 * ExerciseVideoPlayer - Componente para mostrar videos de ejecución de ejercicios
 */
export function ExerciseVideoPlayer({
  exerciseName,
  videoUrl,
  executionVideoUrl,
  thumbnailUrl,
  instructions,
  commonMistakes = [],
  tips = [],
}: ExerciseVideoPlayerProps) {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [activeVideo, setActiveVideo] = useState<"main" | "execution">("main");

  const hasVideo = videoUrl || executionVideoUrl;

  if (!hasVideo) {
    return (
      <Paper
        p="md"
        withBorder
        style={{
          backgroundColor: "var(--mantine-color-gray-0)",
          textAlign: "center",
        }}
      >
        <ThemeIcon color="gray" size={40} variant="light" radius="xl" mb="sm">
          <IconVideo size={20} />
        </ThemeIcon>
        <Text c="dimmed" size="sm">
          No hay video disponible
        </Text>
      </Paper>
    );
  }

  const handleOpenVideo = (type: "main" | "execution") => {
    setActiveVideo(type);
    openModal();
  };

  return (
    <>
      <Group gap="xs">
        {videoUrl && (
          <Tooltip label="Ver demostración">
            <ActionIcon
              color="blue"
              variant="light"
              size="lg"
              onClick={() => handleOpenVideo("main")}
            >
              <IconPlayerPlay size={18} />
            </ActionIcon>
          </Tooltip>
        )}
        {executionVideoUrl && (
          <Tooltip label="Ver ejecución correcta">
            <ActionIcon
              color="green"
              variant="filled"
              size="lg"
              onClick={() => handleOpenVideo("execution")}
            >
              <IconVideo size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={exerciseName}
        size="xl"
      >
        <Box>
          {/* Video tabs */}
          {videoUrl && executionVideoUrl && (
            <Group mb="md" gap="xs">
              <ActionIcon
                color={activeVideo === "main" ? "blue" : "gray"}
                variant={activeVideo === "main" ? "filled" : "light"}
                onClick={() => setActiveVideo("main")}
              >
                <IconPlayerPlay size={16} />
              </ActionIcon>
              <Text
                size="sm"
                fw={activeVideo === "main" ? 600 : 400}
                c={activeVideo === "main" ? "blue" : "dimmed"}
                style={{ cursor: "pointer" }}
                onClick={() => setActiveVideo("main")}
              >
                Demostración
              </Text>
              <Text c="dimmed">|</Text>
              <ActionIcon
                color={activeVideo === "execution" ? "green" : "gray"}
                variant={activeVideo === "execution" ? "filled" : "light"}
                onClick={() => setActiveVideo("execution")}
              >
                <IconVideo size={16} />
              </ActionIcon>
              <Text
                size="sm"
                fw={activeVideo === "execution" ? 600 : 400}
                c={activeVideo === "execution" ? "green" : "dimmed"}
                style={{ cursor: "pointer" }}
                onClick={() => setActiveVideo("execution")}
              >
                Ejecución Correcta
              </Text>
            </Group>
          )}

          {/* Video player */}
          <Box
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              overflow: "hidden",
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: "black",
            }}
          >
            <video
              src={activeVideo === "main" ? videoUrl : executionVideoUrl}
              poster={thumbnailUrl}
              controls
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            />
          </Box>

          {/* Instructions */}
          {instructions && (
            <Box mt="md">
              <Group gap="xs" mb="xs">
                <IconInfoCircle size={16} color="var(--mantine-color-blue-6)" />
                <Text fw={600} size="sm">
                  Instrucciones
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {instructions}
              </Text>
            </Box>
          )}

          {/* Common mistakes */}
          {commonMistakes.length > 0 && (
            <Box mt="md">
              <Group gap="xs" mb="xs">
                <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
                <Text fw={600} size="sm" c="red">
                  Errores Comunes a Evitar
                </Text>
              </Group>
              {commonMistakes.map((mistake, index) => (
                <Group key={index} gap="xs" mb={4}>
                  <Text c="red" size="sm">
                    ✗
                  </Text>
                  <Text size="sm">{mistake}</Text>
                </Group>
              ))}
            </Box>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <Box mt="md">
              <Group gap="xs" mb="xs">
                <IconCheck size={16} color="var(--mantine-color-green-6)" />
                <Text fw={600} size="sm" c="green">
                  Consejos para una Ejecución Correcta
                </Text>
              </Group>
              {tips.map((tip, index) => (
                <Group key={index} gap="xs" mb={4}>
                  <Text c="green" size="sm">
                    ✓
                  </Text>
                  <Text size="sm">{tip}</Text>
                </Group>
              ))}
            </Box>
          )}
        </Box>
      </Modal>
    </>
  );
}

/**
 * ExerciseVideoCard - Tarjeta compacta con video de ejercicio
 */
interface ExerciseVideoCardProps {
  exerciseName: string;
  videoUrl?: string;
  executionVideoUrl?: string;
  thumbnailUrl?: string;
  onClick?: () => void;
}

export function ExerciseVideoCard({
  exerciseName,
  videoUrl,
  executionVideoUrl,
  thumbnailUrl,
  onClick,
}: ExerciseVideoCardProps) {
  const hasVideo = videoUrl || executionVideoUrl;

  return (
    <Paper
      p="xs"
      withBorder
      style={{
        cursor: hasVideo ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={hasVideo ? onClick : undefined}
    >
      <Box
        style={{
          position: "relative",
          paddingBottom: "56.25%",
          backgroundColor: "var(--mantine-color-gray-1)",
          borderRadius: "var(--mantine-radius-sm)",
          overflow: "hidden",
        }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={exerciseName}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Box
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <ThemeIcon color="gray" size={40} variant="light" radius="xl">
              <IconVideo size={20} />
            </ThemeIcon>
          </Box>
        )}

        {hasVideo && (
          <Box
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <ThemeIcon
              color="white"
              size={50}
              radius="xl"
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
              }}
            >
              <IconPlayerPlay size={24} />
            </ThemeIcon>
          </Box>
        )}

        {executionVideoUrl && (
          <Box
            style={{
              position: "absolute",
              top: 8,
              right: 8,
            }}
          >
            <Tooltip label="Video de ejecución correcta disponible">
              <ThemeIcon color="green" size="sm" radius="xl">
                <IconCheck size={12} />
              </ThemeIcon>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Text size="xs" fw={500} mt="xs" lineClamp={1}>
        {exerciseName}
      </Text>
    </Paper>
  );
}

export default ExerciseVideoPlayer;
