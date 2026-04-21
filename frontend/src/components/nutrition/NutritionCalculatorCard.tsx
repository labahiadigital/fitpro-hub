import {
  Alert,
  Box,
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconCalculator,
  IconDeviceFloppy,
  IconInfoCircle,
  IconRefresh,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
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
  isSaving,
}: NutritionCalculatorCardProps) {
  const defaultAge = client.birth_date
    ? Math.floor(
        (Date.now() - new Date(client.birth_date).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : 30;

  const getInitialWeight = () =>
    Number(latestMeasurement?.weight_kg ?? client.weight_kg) || 70;
  const getInitialBodyFat = () => {
    const bf =
      latestMeasurement?.body_fat_percentage ?? client.body_fat_pct ?? null;
    return typeof bf === "number" ? bf : null;
  };

  const [weight, setWeight] = useState<number>(getInitialWeight());
  const [height, setHeight] = useState<number>(Number(client.height_cm) || 170);
  const [age, setAge] = useState<number>(defaultAge);
  const [gender, setGender] = useState<"male" | "female">(
    client.gender === "female" ? "female" : "male"
  );
  const [bodyFat, setBodyFat] = useState<number | null>(getInitialBodyFat());
  const [activity, setActivity] = useState<string>(
    client.health_data?.activity_level || "moderate"
  );
  const [goal, setGoal] = useState<string>(
    client.health_data?.goal_type || client.health_data?.fitness_goal || "maintenance"
  );
  const [formula, setFormula] = useState<FormulaType>(
    (client.health_data?.formula_used as FormulaType) || "mifflin"
  );

  // Cuando cambia el cliente o la última medida, re-sincronizamos el peso
  // pre-rellenado (siempre que el usuario no haya editado aún). Usamos una
  // clave estable para disparar el reset.
  const syncKey = `${client.id}|${latestMeasurement?.weight_kg ?? ""}|${
    latestMeasurement?.measured_at ?? latestMeasurement?.created_at ?? ""
  }`;
  useEffect(() => {
    setWeight(getInitialWeight());
    setBodyFat(getInitialBodyFat());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  const resetFromProgress = () => {
    setWeight(getInitialWeight());
    setHeight(Number(client.height_cm) || 170);
    setAge(defaultAge);
    setGender(client.gender === "female" ? "female" : "male");
    setBodyFat(getInitialBodyFat());
    setActivity(client.health_data?.activity_level || "moderate");
    setGoal(
      client.health_data?.goal_type ||
        client.health_data?.fitness_goal ||
        "maintenance"
    );
    setFormula((client.health_data?.formula_used as FormulaType) || "mifflin");
  };

  const preview = useMemo(
    () => computeTargets(weight, height, age, gender, bodyFat, activity, goal, formula),
    [weight, height, age, gender, bodyFat, activity, goal, formula]
  );

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
  };

  const usedFromMeasurement = !!latestMeasurement?.weight_kg;

  return (
    <Box className="nv-card" p="xl">
      <Group justify="space-between" mb="lg" wrap="nowrap">
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
          size="xs"
          variant="subtle"
          leftSection={<IconRefresh size={14} />}
          onClick={resetFromProgress}
          title="Volver a cargar desde el último progreso"
        >
          Reset
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="sm">
        Calcula nuevas calorías y macros a partir de los últimos datos de progreso del cliente.
      </Text>

      {usedFromMeasurement ? (
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="blue"
          variant="light"
          radius="md"
          mb="md"
        >
          <Text size="xs">
            Último registro de progreso:{" "}
            <b>{latestMeasurement?.weight_kg} kg</b>
            {latestMeasurement?.body_fat_percentage != null &&
              ` · ${latestMeasurement?.body_fat_percentage}% grasa`}
            {" · "}
            {formatDate(
              latestMeasurement?.measured_at ||
                latestMeasurement?.created_at ||
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
          mb="md"
        >
          <Text size="xs">
            No hay registros de progreso recientes. Se usarán los datos de la ficha.
          </Text>
        </Alert>
      )}

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
          <NumberInput
            label="Peso (kg)"
            value={weight}
            onChange={(v) => setWeight(Number(v) || 0)}
            decimalScale={1}
            min={20}
            max={400}
            suffix=" kg"
            size="xs"
          />
          <NumberInput
            label="Altura (cm)"
            value={height}
            onChange={(v) => setHeight(Number(v) || 0)}
            min={100}
            max={250}
            suffix=" cm"
            size="xs"
          />
          <NumberInput
            label="Edad"
            value={age}
            onChange={(v) => setAge(Number(v) || 0)}
            min={10}
            max={120}
            size="xs"
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
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
            size="xs"
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
            size="xs"
          />
        </SimpleGrid>

        <Select
          label="Nivel de actividad"
          value={activity}
          onChange={(v) => v && setActivity(v)}
          data={ACTIVITY_OPTIONS}
          size="xs"
        />

        <Select
          label="Objetivo"
          value={goal}
          onChange={(v) => v && setGoal(v)}
          data={GOAL_OPTIONS}
          size="xs"
        />

        <Box>
          <Text size="xs" fw={500} mb={4}>
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

        {/* Resultado del cálculo */}
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
            mb="xs"
            style={{ letterSpacing: "0.08em" }}
          >
            Resultado del cálculo
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <Box
              p="xs"
              ta="center"
              style={{ background: "rgba(255,255,255,0.9)", borderRadius: 8 }}
            >
              <Text size="xs" c="dimmed">Calorías</Text>
              <Text fw={700} size="lg" c="blue">{preview.targetCalories}</Text>
            </Box>
            <Box
              p="xs"
              ta="center"
              style={{ background: "rgba(255,255,255,0.9)", borderRadius: 8 }}
            >
              <Text size="xs" c="dimmed">Proteínas</Text>
              <Text fw={700} size="lg" c="green">{preview.targetProtein}g</Text>
            </Box>
            <Box
              p="xs"
              ta="center"
              style={{ background: "rgba(255,255,255,0.9)", borderRadius: 8 }}
            >
              <Text size="xs" c="dimmed">Carbos</Text>
              <Text fw={700} size="lg" c="orange">{preview.targetCarbs}g</Text>
            </Box>
            <Box
              p="xs"
              ta="center"
              style={{ background: "rgba(255,255,255,0.9)", borderRadius: 8 }}
            >
              <Text size="xs" c="dimmed">Grasas</Text>
              <Text fw={700} size="lg" c="grape">{preview.targetFat}g</Text>
            </Box>
          </SimpleGrid>
          <Group justify="center" gap="md" mt="xs">
            <Text size="xs" c="white">
              BMR: <b>{preview.bmr}</b> kcal
            </Text>
            <Text size="xs" c="white">
              TDEE: <b>{preview.tdee}</b> kcal
            </Text>
          </Group>
        </Box>

        <Button
          fullWidth
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={handleSave}
          loading={isSaving}
          disabled={formula === "katch" && !bodyFat}
        >
          Guardar y aplicar objetivos
        </Button>
      </Stack>
    </Box>
  );
}
