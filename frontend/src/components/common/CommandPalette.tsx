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
  IconChartLine,
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
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { normalizeText } from "../../utils/text";

interface CommandPaletteProps {
  opened: boolean;
  close: () => void;
  isClient?: boolean;
}

function useTrainerActions() {
  const { t } = useTranslation();
  return useMemo(() => [
    {
      group: t("cmd.navigation"),
      items: [
        { icon: IconHome, label: t("nav.dashboard"), description: t("cmd.dashboardDesc"), to: "/dashboard" },
        { icon: IconUsers, label: t("nav.clients"), description: t("cmd.clientsDesc"), to: "/clients" },
        { icon: IconCalendarEvent, label: t("nav.calendar"), description: t("cmd.calendarDesc"), to: "/calendar" },
        { icon: IconBarbell, label: t("nav.workouts"), description: t("cmd.workoutsDesc"), to: "/workouts" },
        { icon: IconSalad, label: t("nav.nutrition"), description: t("cmd.nutritionDesc"), to: "/nutrition" },
        { icon: IconForms, label: t("nav.forms"), description: t("cmd.formsDesc"), to: "/forms" },
        { icon: IconFileText, label: t("nav.documents"), description: t("cmd.documentsDesc"), to: "/documents" },
        { icon: IconMessage, label: t("nav.chat"), description: t("cmd.chatDesc"), to: "/chat" },
        { icon: IconPackage, label: t("nav.catalog"), description: t("cmd.catalogDesc"), to: "/catalog" },
        { icon: IconReceipt, label: t("nav.billing"), description: t("cmd.billingDesc"), to: "/billing" },
        { icon: IconTrophy, label: t("nav.community"), description: t("cmd.communityDesc"), to: "/community" },
        { icon: IconUsersGroup, label: t("nav.members"), description: t("cmd.teamDesc"), to: "/team" },
        { icon: IconRobot, label: t("nav.automations"), description: t("cmd.automationsDesc"), to: "/automations" },
        { icon: IconChartBar, label: t("nav.reports"), description: t("cmd.reportsDesc"), to: "/reports" },
        { icon: IconBook, label: t("nav.academy"), description: t("cmd.lmsDesc"), to: "/lms" },
        { icon: IconVideo, label: t("nav.liveClasses"), description: t("cmd.liveClassesDesc"), to: "/live-classes" },
        { icon: IconBulb, label: t("nav.suggestions"), description: t("cmd.suggestionsDesc"), to: "/suggestions" },
        { icon: IconSettings, label: t("nav.settings"), description: t("cmd.settingsDesc"), to: "/settings" },
      ],
    },
    {
      group: t("cmd.quickActions"),
      items: [
        { icon: IconUser, label: t("cmd.newClient"), description: t("cmd.newClientDesc"), to: "/clients?action=new" },
        { icon: IconCalendarEvent, label: t("cmd.newBooking"), description: t("cmd.newBookingDesc"), to: "/calendar?action=new" },
        { icon: IconBarbell, label: t("cmd.newWorkout"), description: t("cmd.newWorkoutDesc"), to: "/workouts?action=new" },
      ],
    },
  ], [t]);
}

function useClientActions() {
  const { t } = useTranslation();
  return useMemo(() => [
    {
      group: t("cmd.navigation"),
      items: [
        { icon: IconHome, label: t("nav.myPanel"), description: t("cmd.myPanelDesc"), to: "/dashboard" },
        { icon: IconBarbell, label: t("nav.myWorkouts"), description: t("cmd.myWorkoutsDesc"), to: "/my-workouts" },
        { icon: IconSalad, label: t("nav.myNutrition"), description: t("cmd.myNutritionDesc"), to: "/my-nutrition" },
        { icon: IconChartLine, label: t("nav.myProgress"), description: t("cmd.myProgressDesc"), to: "/my-progress" },
        { icon: IconCalendarEvent, label: t("nav.myAppointments"), description: t("cmd.myAppointmentsDesc"), to: "/my-calendar" },
        { icon: IconMessage, label: t("nav.myMessages"), description: t("cmd.myMessagesDesc"), to: "/my-messages" },
        { icon: IconFileText, label: t("nav.myDocuments"), description: t("cmd.myDocumentsDesc"), to: "/my-documents" },
        { icon: IconBook, label: t("nav.academy"), description: t("cmd.lmsDesc"), to: "/lms" },
        { icon: IconUser, label: t("nav.myProfile"), description: t("cmd.myProfileDesc"), to: "/my-profile" },
      ],
    },
  ], [t]);
}

export function CommandPalette({ opened, close, isClient }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const trainerActs = useTrainerActions();
  const clientActs = useClientActions();
  const actions = isClient ? clientActs : trainerActs;

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
    [query, actions]
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
          placeholder={t("cmd.placeholder")}
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
                              color: isActive ? "var(--nv-accent)" : "rgba(255, 255, 255, 0.5)",
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
                            color="var(--nv-accent)"
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
            <Text c="dimmed">{t("cmd.noResults")}</Text>
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
            <Text size="xs" c="dimmed">{t("cmd.toSelect")}</Text>
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
            <Text size="xs" c="dimmed">{t("cmd.toNavigate")}</Text>
          </Group>
        </Group>
      </Box>
    </Modal>
  );
}

