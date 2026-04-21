import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBolt,
  IconCalculator,
  IconClock,
  IconDeviceFloppy,
  IconHistory,
  IconInfoCircle,
  IconTrash,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  ACTIVITY_MULTIPLIERS,
  type FormulaType,
  calculateBMR,
  calculateTDEE,
} from "../../utils/calories";
import type { NutritionCalculationEntry } from "../../hooks/useClients";

interface Client {
  id?: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string | null;
  gender?: string | null;
  weight_kg?: number | string | null;
  height_cm?: number | string | null;
  body_fat_pct?: number | null;
  health_data?: {
    activity_level?: string;
    goal_type?: string;
    fitness_goal?: string;
    formula_used?: string;
    nutrition_calculations_history?: NutritionCalculationEntry[];
    [key: string]: unknown;
  };
}

interface Measurement {
  measured_at?: string | null;
  created_at?: string;
  weight_kg?: number | null;
  body_fat_percentage?: number | null;
  muscle_mass_kg?: number | null;
}

interface NutritionCalculatorCardProps {
  client: Client;
  latestMeasurement?: Measurement | null;
  onSave: (entry: NutritionCalculationEntry) => Promise<void> | void;
  onClearHistory?: () => Promise<void> | void;
  isSaving?: boolean;
}

const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_MULTIPLIERS).map(([value, v]) => ({
  value,
  label: v.label,
}));

const GOAL_OPTIONS = [
  { value: "fat_loss", label: "Pérdida de grasa (−20%)" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "muscle_gain", label: "Ganancia muscular (+15%)" },
];

const GOAL_LABEL: Record<string, string> = {
  fat_loss: "Pérdida de grasa",
  maintenance: "Mantenimiento",
  muscle_gain: "Ganancia muscular",
};

const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: "Sedentario",
  light: "Ligero",
  moderate: "Moderado",
  active: "Activo",
  very_active: "Muy activo",
};

const FORMULA_LABEL: Record<string, string> = {
  mifflin: "Mifflin-St Jeor",
  harris: "Harris-Benedict",
  katch: "Katch-McArdle",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function computeTargets(
  weight: number,
  height: number,
  age: number,
  gender: "male" | "female",
  bodyFatPct: number | null | undefined,
  activity: string,
  goal: string,
  formula: FormulaType
) {
  const bmr = Math.round(
    calculateBMR(
      {
        weight_kg: weight,
        height_cm: height,
        age,
        gender,
        body_fat_pct: bodyFatPct ?? undefined,
      },
      formula
    )
  );
  const tdee = Math.round(calculateTDEE(bmr, activity));
  let targetCalories = tdee;
  if (goal === "fat_loss") targetCalories = Math.round(tdee * 0.8);
  else if (goal === "muscle_gain") targetCalories = Math.round(tdee * 1.15);

  const proteinMultiplier = goal === "maintenance" ? 1.8 : 2.2;
  const targetProtein = Math.round(weight * proteinMultiplier);
  const fatCalories = targetCalories * 0.28;
  const targetFat = Math.round(fatCalories / 9);
  const proteinCalories = targetProtein * 4;
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const targetCarbs = Math.max(0, Math.round(remainingCalories / 4));
  return { bmr, tdee, targetCalories, targetProtein, targetCarbs, targetFat };
}

export function NutritionCalculatorCard({
  client,
  latestMeasurement,
  onSave,
  onClearHistory,
  isSaving,
}: NutritionCalculatorCardProps) {
  const [modalOpened, { open, close }] = useDisclosure(false);

  // Cálculo de edad a partir de fecha de nacimiento.
  const defaultAge = client.birth_date
    ? Math.floor(
        (Date.now() - new Date(client.birth_date).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : 30;

  const initialWeight = Number(
    latestMeasurement?.weight_kg ?? client.weight_kg ?? 0
  );
  const initialBodyFat =
    latestMeasurement?.body_fat_percentage ?? client.body_fat_pct ?? null;

  // Estado del formulario dentro del modal.
  const [weight, setWeight] = useState<number>(initialWeight || 70);
  const [height, setHeight] = useState<number>(
    Number(client.height_cm) || 170
  );
  const [age, setAge] = useState<number>(defaultAge);
  const [gender, setGender] = useState<"male" | "female">(
    client.gender === "female" ? "female" : "male"
  );
  const [bodyFat, setBodyFat] = useState<number | null>(
    typeof initialBodyFat === "number" ? initialBodyFat : null
  );
  const [activity, setActivity] = useState<string>(
    client.health_data?.activity_level || "moderate"
  );
  const [goal, setGoal] = useState<string>(
    client.health_data?.goal_type || client.health_data?.fitness_goal || "maintenance"
  );
  const [formula, setFormula] = useState<FormulaType>(
    (client.health_data?.formula_used as FormulaType) || "mifflin"
  );

  // Cuando se abre el modal, volvemos a sincronizar con los últimos registros.
  const openModal = () => {
    setWeight(Number(latestMeasurement?.weight_kg ?? client.weight_kg) || 70);
    setHeight(Number(client.height_cm) || 170);
    setAge(defaultAge);
    setGender(client.gender === "female" ? "female" : "male");
    const bf = latestMeasurement?.body_fat_percentage ?? client.body_fat_pct ?? null;
    setBodyFat(typeof bf === "number" ? bf : null);
    setActivity(client.health_data?.activity_level || "moderate");
    setGoal(
      client.health_data?.goal_type ||
        client.health_data?.fitness_goal ||
        "maintenance"
    );
    setFormula((client.health_data?.formula_used as FormulaType) || "mifflin");
    open();
  };

  const preview = useMemo(
    () =>
      computeTargets(
        weight,
        height,
        age,
        gender,
        bodyFat,
        activity,
        goal,
        formula
      ),
    [weight, height, age, gender, bodyFat, activity, goal, formula]
  );

  const history = client.health_data?.nutrition_calculations_history || [];

  const handleSave = async () => {
    const entry: NutritionCalculationEntry = {
      calculated_at: new Date().toISOString(),
      weight_kg: weight,
      height_cm: height,
      age,
      gender,
      body_fat_pct: bodyFat,
      activity_level: activity,
      goal_type: goal,
      formula_used: formula,
      bmr: preview.bmr,
      tdee: preview.tdee,
      target_calories: preview.targetCalories,
      target_protein: preview.targetProtein,
      target_carbs: preview.targetCarbs,
      target_fat: preview.targetFat,
    };
    await onSave(entry);
    close();
  };

  const usedFromMeasurement = !!latestMeasurement?.weight_kg;

  return (
    <>
      <Box className="nv-card" p="xl">
        <Group justify="space-between" mb="lg">
          <Group gap="xs">
            <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
              <IconCalculator size={18} />
            </ThemeIcon>
            <Text
              fw={700}
              size="lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Calculadora Nutricional
            </Text>
          </Group>
          <Button
            size="sm"
            leftSection={<IconBolt size={16} />}
            radius="xl"
            onClick={openModal}
          >
            Calcular objetivos
          </Button>
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          Calcula nuevas calorías y macros a partir de los últimos datos de progreso del cliente.
        </Text>

        {latestMeasurement?.weight_kg ? (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
            radius="md"
          >
            <Text size="xs">
              Último registro de progreso:{" "}
              <b>{latestMeasurement.weight_kg} kg</b>
              {latestMeasurement.body_fat_percentage != null &&
                ` · ${latestMeasurement.body_fat_percentage}% grasa`}
              {" · "}
              {formatDate(
                latestMeasurement.measured_at ||
                  latestMeasurement.created_at ||
                  ""
              )}
            </Text>
          </Alert>
        ) : (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="gray"
            variant="light"
            radius="md"
          >
            <Text size="xs">
              No hay registros de progreso recientes. Se usarán los datos de la ficha.
            </Text>
          </Alert>
        )}

        {/* Acordeón con historial */}
        <Accordion variant="separated" mt="lg" radius="md">
          <Accordion.Item value="history">
            <Accordion.Control icon={<IconHistory size={16} />}>
              <Group gap="xs">
                <Text size="sm" fw={600}>
                  Histórico de objetivos nutricionales calculados
                </Text>
                <Badge size="xs" variant="light" color="gray">
                  {history.length}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              {history.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  Aún no hay cálculos guardados. Pulsa "Calcular objetivos" para crear el primero.
                </Text>
              ) : (
                <>
                  <ScrollArea>
                    <Table
                      striped
                      highlightOnHover
                      verticalSpacing="xs"
                      fz="xs"
                      style={{ minWidth: 900 }}
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Fecha</Table.Th>
                          <Table.Th>Peso</Table.Th>
                          <Table.Th>% Grasa</Table.Th>
                          <Table.Th>Actividad</Table.Th>
                          <Table.Th>Objetivo</Table.Th>
                          <Table.Th>Fórmula</Table.Th>
                          <Table.Th ta="right">BMR</Table.Th>
                          <Table.Th ta="right">TDEE</Table.Th>
                          <Table.Th ta="right">Kcal</Table.Th>
                          <Table.Th ta="right">P</Table.Th>
                          <Table.Th ta="right">C</Table.Th>
                          <Table.Th ta="right">G</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {[...history]
                          .sort(
                            (a, b) =>
                              new Date(b.calculated_at).getTime() -
                              new Date(a.calculated_at).getTime()
                          )
                          .map((entry, idx) => (
                            <Table.Tr key={`${entry.calculated_at}-${idx}`}>
                              <Table.Td>
                                <Group gap={4} wrap="nowrap">
                                  <IconClock size={12} />
                                  <Text size="xs">
                                    {formatDateTime(entry.calculated_at)}
                                  </Text>
                                </Group>
                              </Table.Td>
                              <Table.Td>{entry.weight_kg} kg</Table.Td>
                              <Table.Td>
                                {entry.body_fat_pct != null
                                  ? `${entry.body_fat_pct}%`
                                  : "—"}
                              </Table.Td>
                              <Table.Td>
                                <Badge size="xs" variant="light" color="gray">
                                  {ACTIVITY_LABEL[entry.activity_level] ||
                                    entry.activity_level}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={
                                    entry.goal_type === "fat_loss"
                                      ? "red"
                                      : entry.goal_type === "muscle_gain"
                                        ? "green"
                                        : "blue"
                                  }
                                >
                                  {GOAL_LABEL[entry.goal_type] ||
                                    entry.goal_type}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="xs">
                                  {FORMULA_LABEL[entry.formula_used] ||
                                    entry.formula_used}
                                </Text>
                              </Table.Td>
                              <Table.Td ta="right">{entry.bmr}</Table.Td>
                              <Table.Td ta="right">{entry.tdee}</Table.Td>
                              <Table.Td ta="right">
                                <Text fw={700} size="xs" c="blue">
                                  {entry.target_calories}
                                </Text>
                              </Table.Td>
                              <Table.Td ta="right">
                                <Text size="xs" c="green.7">
                                  {entry.target_protein}g
                                </Text>
                              </Table.Td>
                              <Table.Td ta="right">
                                <Text size="xs" c="orange.7">
                                  {entry.target_carbs}g
                                </Text>
                              </Table.Td>
                              <Table.Td ta="right">
                                <Text size="xs" c="grape.7">
                                  {entry.target_fat}g
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                  {onClearHistory && history.length > 0 && (
                    <Group justify="flex-end" mt="xs">
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        leftSection={<IconTrash size={12} />}
                        onClick={() => {
                          if (
                            typeof window !== "undefined" &&
                            window.confirm(
                              "¿Eliminar todo el histórico de cálculos?"
                            )
                          ) {
                            onClearHistory();
                          }
                        }}
                      >
                        Vaciar histórico
                      </Button>
                    </Group>
                  )}
                </>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Box>

      {/* Modal de cálculo */}
      <Modal
        opened={modalOpened}
        onClose={close}
        title={
          <Group gap="xs">
            <IconCalculator size={18} />
            <Text fw={700}>Calcular nuevos objetivos nutricionales</Text>
          </Group>
        }
        size="lg"
        centered
      >
        <Stack gap="md">
          {usedFromMeasurement && (
            <Alert color="blue" variant="light" radius="md">
              <Text size="xs">
                Datos pre-rellenados desde el último registro de progreso del cliente. Ajústalos si lo necesitas.
              </Text>
            </Alert>
          )}

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <NumberInput
              label="Peso (kg)"
              value={weight}
              onChange={(v) => setWeight(Number(v) || 0)}
              decimalScale={1}
              min={20}
              max={400}
              suffix=" kg"
            />
            <NumberInput
              label="Altura (cm)"
              value={height}
              onChange={(v) => setHeight(Number(v) || 0)}
              min={100}
              max={250}
              suffix=" cm"
            />
            <NumberInput
              label="Edad"
              value={age}
              onChange={(v) => setAge(Number(v) || 0)}
              min={10}
              max={120}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Género"
              value={gender}
              onChange={(v) =>
                setGender((v === "female" ? "female" : "male") as typeof gender)
              }
              data={[
                { value: "male", label: "Hombre" },
                { value: "female", label: "Mujer" },
              ]}
            />
            <NumberInput
              label="% Grasa corporal (opcional)"
              value={bodyFat ?? undefined}
              onChange={(v) => {
                if (v === "" || v == null) setBodyFat(null);
                else setBodyFat(Number(v) || 0);
              }}
              decimalScale={1}
              min={0}
              max={80}
              suffix=" %"
              placeholder="—"
            />
          </SimpleGrid>

          <Select
            label="Nivel de actividad"
            value={activity}
            onChange={(v) => v && setActivity(v)}
            data={ACTIVITY_OPTIONS}
          />

          <Select
            label="Objetivo"
            value={goal}
            onChange={(v) => v && setGoal(v)}
            data={GOAL_OPTIONS}
          />

          <Box>
            <Text size="sm" fw={500} mb={4}>
              Fórmula BMR
            </Text>
            <SegmentedControl
              fullWidth
              value={formula}
              onChange={(v) => setFormula(v as FormulaType)}
              data={[
                { label: "Mifflin-St Jeor", value: "mifflin" },
                { label: "Harris-Benedict", value: "harris" },
                {
                  label: "Katch-McArdle",
                  value: "katch",
                  disabled: !bodyFat,
                },
              ]}
              size="xs"
            />
            {formula === "katch" && !bodyFat && (
              <Text size="xs" c="red" mt={4}>
                Katch-McArdle requiere % grasa corporal.
              </Text>
            )}
          </Box>

          {/* Preview */}
          <Box
            p="md"
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #10B981 100%)",
              borderRadius: 12,
            }}
          >
            <Text
              size="xs"
              tt="uppercase"
              fw={700}
              c="white"
              mb="sm"
              style={{ letterSpacing: "0.08em" }}
            >
              Resultado del cálculo
            </Text>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
              <Box
                p="xs"
                ta="center"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 8,
                }}
              >
                <Text size="xs" c="dimmed">
                  Calorías
                </Text>
                <Text fw={700} size="lg" c="blue">
                  {preview.targetCalories}
                </Text>
              </Box>
              <Box
                p="xs"
                ta="center"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 8,
                }}
              >
                <Text size="xs" c="dimmed">
                  Proteínas
                </Text>
                <Text fw={700} size="lg" c="green">
                  {preview.targetProtein}g
                </Text>
              </Box>
              <Box
                p="xs"
                ta="center"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 8,
                }}
              >
                <Text size="xs" c="dimmed">
                  Carbos
                </Text>
                <Text fw={700} size="lg" c="orange">
                  {preview.targetCarbs}g
                </Text>
              </Box>
              <Box
                p="xs"
                ta="center"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 8,
                }}
              >
                <Text size="xs" c="dimmed">
                  Grasas
                </Text>
                <Text fw={700} size="lg" c="grape">
                  {preview.targetFat}g
                </Text>
              </Box>
            </SimpleGrid>
            <Group justify="center" gap="md" mt="sm">
              <Text size="xs" c="white">
                BMR: <b>{preview.bmr}</b> kcal
              </Text>
              <Text size="xs" c="white">
                TDEE: <b>{preview.tdee}</b> kcal
              </Text>
            </Group>
          </Box>

          <Group justify="flex-end" gap="xs" mt="sm">
            <Button variant="subtle" onClick={close}>
              Cancelar
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              loading={isSaving}
              disabled={formula === "katch" && !bodyFat}
            >
              Guardar y aplicar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
