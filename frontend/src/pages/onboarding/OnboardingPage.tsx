import {
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Stepper,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconUser,
  IconTarget,
  IconHeart,
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconScale,
  IconRuler,
  IconCalendar,
  IconPhone,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth";
import { api } from "../../services/api";
import "dayjs/locale/es";

// Opciones de alérgenos
const ALLERGENS = [
  { value: "gluten", label: "Gluten" },
  { value: "lactosa", label: "Lactosa" },
  { value: "huevo", label: "Huevo" },
  { value: "pescado", label: "Pescado" },
  { value: "mariscos", label: "Mariscos" },
  { value: "frutos_secos", label: "Frutos secos" },
  { value: "cacahuete", label: "Cacahuete" },
  { value: "soja", label: "Soja" },
  { value: "apio", label: "Apio" },
  { value: "mostaza", label: "Mostaza" },
  { value: "sesamo", label: "Sésamo" },
  { value: "sulfitos", label: "Sulfitos" },
  { value: "moluscos", label: "Moluscos" },
];

// Opciones de intolerancias
const INTOLERANCES = [
  { value: "fructosa", label: "Fructosa" },
  { value: "sorbitol", label: "Sorbitol" },
  { value: "histamina", label: "Histamina" },
  { value: "fodmap", label: "FODMAP" },
  { value: "cafeina", label: "Cafeína" },
];

// Niveles de actividad
const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentario", description: "Poco o nada de ejercicio" },
  { value: "light", label: "Ligero", description: "Ejercicio 1-3 días/semana" },
  { value: "moderate", label: "Moderado", description: "Ejercicio 3-5 días/semana" },
  { value: "active", label: "Activo", description: "Ejercicio 6-7 días/semana" },
  { value: "very_active", label: "Muy activo", description: "Ejercicio intenso diario" },
];

// Objetivos fitness
const FITNESS_GOALS = [
  { value: "weight_loss", label: "Pérdida de peso", description: "Reducir grasa corporal" },
  { value: "muscle_gain", label: "Ganancia muscular", description: "Aumentar masa muscular" },
  { value: "maintenance", label: "Mantenimiento", description: "Mantener mi estado actual" },
  { value: "endurance", label: "Resistencia", description: "Mejorar capacidad cardiovascular" },
  { value: "strength", label: "Fuerza", description: "Aumentar fuerza máxima" },
  { value: "flexibility", label: "Flexibilidad", description: "Mejorar movilidad y flexibilidad" },
  { value: "general_health", label: "Salud general", description: "Mejorar mi bienestar" },
];

export function OnboardingPage() {
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const form = useForm({
    initialValues: {
      // Paso 1: Datos personales
      first_name: user?.full_name?.split(" ")[0] || "",
      last_name: user?.full_name?.split(" ").slice(1).join(" ") || "",
      phone: "",
      birth_date: null as Date | null,
      gender: "male",
      
      // Paso 2: Datos físicos
      height_cm: 170,
      weight_kg: 70,
      activity_level: "moderate",
      
      // Paso 3: Objetivos
      fitness_goal: "general_health",
      goals_description: "",
      training_days_per_week: 3,
      
      // Paso 4: Salud
      allergies: [] as string[],
      intolerances: [] as string[],
      injuries: "",
      medical_conditions: "",
      
      // Paso 5: Consentimientos
      consent_data_processing: false,
      consent_health_data: false,
      consent_marketing: false,
    },
    validate: {
      first_name: (value) => (value.length < 2 ? "Nombre requerido" : null),
      last_name: (value) => (value.length < 2 ? "Apellido requerido" : null),
      consent_data_processing: (value) => (!value ? "Debes aceptar el tratamiento de datos" : null),
      consent_health_data: (value) => (!value ? "Debes aceptar el tratamiento de datos de salud" : null),
    },
  });

  const totalSteps = 5;
  const progress = ((active + 1) / totalSteps) * 100;

  const nextStep = () => {
    // Validación por paso
    if (active === 0) {
      const errors = form.validate();
      if (errors.hasErrors && (errors.errors.first_name || errors.errors.last_name)) {
        return;
      }
    }
    
    if (active < totalSteps - 1) {
      setActive((current) => current + 1);
    }
  };

  const prevStep = () => {
    if (active > 0) {
      setActive((current) => current - 1);
    }
  };

  const handleSubmit = async () => {
    const errors = form.validate();
    if (errors.hasErrors) {
      notifications.show({
        title: "Error",
        message: "Por favor completa todos los campos requeridos",
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      const values = form.values;
      
      // Enviar datos al backend
      await api.post("/clients/onboarding", {
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        birth_date: values.birth_date?.toISOString().split("T")[0],
        gender: values.gender,
        height_cm: values.height_cm,
        weight_kg: values.weight_kg,
        goals: values.goals_description,
        health_data: {
          activity_level: values.activity_level,
          fitness_goal: values.fitness_goal,
          training_days_per_week: values.training_days_per_week,
          allergies: values.allergies,
          intolerances: values.intolerances,
          injuries: values.injuries ? [{ name: values.injuries, status: "active" }] : [],
          medical_conditions: values.medical_conditions,
        },
        consents: {
          data_processing: values.consent_data_processing,
          health_data: values.consent_health_data,
          marketing: values.consent_marketing,
          consent_date: new Date().toISOString(),
        },
      });

      notifications.show({
        title: "¡Perfil completado!",
        message: "Tu información ha sido guardada correctamente",
        color: "green",
      });

      navigate("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al guardar tu información",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (active) {
      case 0:
        return <StepPersonalInfo form={form} />;
      case 1:
        return <StepPhysicalData form={form} />;
      case 2:
        return <StepGoals form={form} />;
      case 3:
        return <StepHealth form={form} />;
      case 4:
        return <StepConsents form={form} />;
      default:
        return null;
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <Container size="md" w="100%">
        <Paper
          radius="xl"
          p={{ base: "md", sm: "xl", lg: 40 }}
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Header */}
          <Box ta="center" mb="xl">
            <Title order={2} c="white" mb="xs">
              Completa tu perfil
            </Title>
            <Text c="gray.5" size="sm">
              Esta información ayudará a tu entrenador a personalizar tu experiencia
            </Text>
          </Box>

          {/* Progress */}
          <Progress
            value={progress}
            size="sm"
            radius="xl"
            mb="xl"
            color="var(--nv-accent)"
            style={{ background: "rgba(255, 255, 255, 0.1)" }}
          />

          {/* Stepper indicators */}
          <Stepper
            active={active}
            onStepClick={setActive}
            size="sm"
            mb="xl"
            color="var(--nv-accent)"
            styles={{
              step: { padding: 0 },
              stepIcon: {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "rgba(255, 255, 255, 0.5)",
                "&[data-progress]": {
                  borderColor: "var(--nv-accent)",
                  backgroundColor: "var(--nv-accent)",
                  color: "#1a1a2e",
                },
                "&[data-completed]": {
                  borderColor: "var(--nv-accent)",
                  backgroundColor: "var(--nv-accent)",
                  color: "#1a1a2e",
                },
              },
              stepLabel: { color: "rgba(255, 255, 255, 0.7)", fontSize: 12 },
              stepDescription: { color: "rgba(255, 255, 255, 0.5)" },
              separator: { backgroundColor: "rgba(255, 255, 255, 0.1)" },
            }}
          >
            <Stepper.Step icon={<IconUser size={16} />} label="Personal" />
            <Stepper.Step icon={<IconScale size={16} />} label="Físico" />
            <Stepper.Step icon={<IconTarget size={16} />} label="Objetivos" />
            <Stepper.Step icon={<IconHeart size={16} />} label="Salud" />
            <Stepper.Step icon={<IconCheck size={16} />} label="Confirmar" />
          </Stepper>

          {/* Step content */}
          <Box mb="xl">{renderStep()}</Box>

          {/* Navigation */}
          <Group justify="space-between">
            <Button
              variant="subtle"
              leftSection={<IconChevronLeft size={16} />}
              onClick={prevStep}
              disabled={active === 0}
              c="white"
            >
              Anterior
            </Button>

            {active < totalSteps - 1 ? (
              <Button
                rightSection={<IconChevronRight size={16} />}
                onClick={nextStep}
                style={{
                  background: "var(--nv-accent)",
                  color: "#1a1a2e",
                }}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                rightSection={<IconCheck size={16} />}
                onClick={handleSubmit}
                loading={loading}
                style={{
                  background: "var(--nv-accent)",
                  color: "#1a1a2e",
                }}
              >
                Completar Perfil
              </Button>
            )}
          </Group>
        </Paper>
      </Container>
    </Box>
  );
}

// Step 1: Datos personales
function StepPersonalInfo({ form }: { form: any }) {
  const inputStyles = {
    input: {
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "white",
      borderRadius: 12,
      "&:focus": {
        borderColor: "var(--nv-accent)",
      },
      "&::placeholder": {
        color: "rgba(255, 255, 255, 0.4)",
      },
    },
    label: {
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: 6,
    },
  };

  return (
    <Stack gap="md">
      <Group align="center" gap="sm" mb="md">
        <ThemeIcon
          size={40}
          radius="xl"
          style={{ background: "rgba(212, 175, 55, 0.2)" }}
        >
          <IconUser size={20} color="var(--nv-accent)" />
        </ThemeIcon>
        <Box>
          <Text c="white" fw={600}>Datos Personales</Text>
          <Text c="gray.5" size="sm">Información básica sobre ti</Text>
        </Box>
      </Group>

      <Group grow>
        <TextInput
          label="Nombre"
          placeholder="Tu nombre"
          required
          styles={inputStyles}
          {...form.getInputProps("first_name")}
        />
        <TextInput
          label="Apellidos"
          placeholder="Tus apellidos"
          required
          styles={inputStyles}
          {...form.getInputProps("last_name")}
        />
      </Group>

      <TextInput
        label="Teléfono"
        placeholder="+34 600 000 000"
        leftSection={<IconPhone size={16} color="rgba(255,255,255,0.4)" />}
        styles={inputStyles}
        {...form.getInputProps("phone")}
      />

      <DateInput
        label="Fecha de nacimiento"
        placeholder="Selecciona tu fecha"
        leftSection={<IconCalendar size={16} color="rgba(255,255,255,0.4)" />}
        locale="es"
        styles={inputStyles}
        popoverProps={{ styles: { dropdown: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" } } }}
        {...form.getInputProps("birth_date")}
      />

      <Box>
        <Text size="sm" c="rgba(255, 255, 255, 0.8)" mb="xs">Género</Text>
        <SegmentedControl
          fullWidth
          data={[
            { label: "Masculino", value: "male" },
            { label: "Femenino", value: "female" },
            { label: "Otro", value: "other" },
          ]}
          styles={{
            root: {
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            },
            label: {
              color: "rgba(255, 255, 255, 0.7)",
              "&[data-active]": {
                color: "#1a1a2e",
              },
            },
            indicator: {
              background: "var(--nv-accent)",
            },
          }}
          {...form.getInputProps("gender")}
        />
      </Box>
    </Stack>
  );
}

// Step 2: Datos físicos
function StepPhysicalData({ form }: { form: any }) {
  const inputStyles = {
    input: {
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "white",
      borderRadius: 12,
      "&:focus": {
        borderColor: "var(--nv-accent)",
      },
    },
    label: {
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: 6,
    },
  };

  return (
    <Stack gap="md">
      <Group align="center" gap="sm" mb="md">
        <ThemeIcon
          size={40}
          radius="xl"
          style={{ background: "rgba(212, 175, 55, 0.2)" }}
        >
          <IconScale size={20} color="var(--nv-accent)" />
        </ThemeIcon>
        <Box>
          <Text c="white" fw={600}>Datos Físicos</Text>
          <Text c="gray.5" size="sm">Tu estado físico actual</Text>
        </Box>
      </Group>

      <Group grow>
        <NumberInput
          label="Altura (cm)"
          placeholder="170"
          min={100}
          max={250}
          leftSection={<IconRuler size={16} color="rgba(255,255,255,0.4)" />}
          styles={inputStyles}
          {...form.getInputProps("height_cm")}
        />
        <NumberInput
          label="Peso (kg)"
          placeholder="70"
          min={30}
          max={300}
          decimalScale={1}
          leftSection={<IconScale size={16} color="rgba(255,255,255,0.4)" />}
          styles={inputStyles}
          {...form.getInputProps("weight_kg")}
        />
      </Group>

      <Box>
        <Text size="sm" c="rgba(255, 255, 255, 0.8)" mb="md">Nivel de actividad física</Text>
        <Stack gap="xs">
          {ACTIVITY_LEVELS.map((level) => (
            <Paper
              key={level.value}
              p="md"
              radius="md"
              style={{
                background: form.values.activity_level === level.value
                  ? "rgba(212, 175, 55, 0.15)"
                  : "rgba(255, 255, 255, 0.03)",
                border: form.values.activity_level === level.value
                  ? "1px solid var(--nv-accent)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => form.setFieldValue("activity_level", level.value)}
            >
              <Group justify="space-between">
                <Box>
                  <Text c="white" fw={500}>{level.label}</Text>
                  <Text c="gray.5" size="sm">{level.description}</Text>
                </Box>
                {form.values.activity_level === level.value && (
                  <ThemeIcon
                    size="sm"
                    radius="xl"
                    style={{ background: "var(--nv-accent)", color: "#1a1a2e" }}
                  >
                    <IconCheck size={12} />
                  </ThemeIcon>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

// Step 3: Objetivos
function StepGoals({ form }: { form: any }) {
  const inputStyles = {
    input: {
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "white",
      borderRadius: 12,
      "&:focus": {
        borderColor: "var(--nv-accent)",
      },
      "&::placeholder": {
        color: "rgba(255, 255, 255, 0.4)",
      },
    },
    label: {
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: 6,
    },
  };

  return (
    <Stack gap="md">
      <Group align="center" gap="sm" mb="md">
        <ThemeIcon
          size={40}
          radius="xl"
          style={{ background: "rgba(212, 175, 55, 0.2)" }}
        >
          <IconTarget size={20} color="var(--nv-accent)" />
        </ThemeIcon>
        <Box>
          <Text c="white" fw={600}>Tus Objetivos</Text>
          <Text c="gray.5" size="sm">¿Qué quieres conseguir?</Text>
        </Box>
      </Group>

      <Box>
        <Text size="sm" c="rgba(255, 255, 255, 0.8)" mb="md">Objetivo principal</Text>
        <Stack gap="xs">
          {FITNESS_GOALS.map((goal) => (
            <Paper
              key={goal.value}
              p="md"
              radius="md"
              style={{
                background: form.values.fitness_goal === goal.value
                  ? "rgba(212, 175, 55, 0.15)"
                  : "rgba(255, 255, 255, 0.03)",
                border: form.values.fitness_goal === goal.value
                  ? "1px solid var(--nv-accent)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => form.setFieldValue("fitness_goal", goal.value)}
            >
              <Group justify="space-between">
                <Box>
                  <Text c="white" fw={500}>{goal.label}</Text>
                  <Text c="gray.5" size="sm">{goal.description}</Text>
                </Box>
                {form.values.fitness_goal === goal.value && (
                  <ThemeIcon
                    size="sm"
                    radius="xl"
                    style={{ background: "var(--nv-accent)", color: "#1a1a2e" }}
                  >
                    <IconCheck size={12} />
                  </ThemeIcon>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      </Box>

      <NumberInput
        label="¿Cuántos días a la semana puedes entrenar?"
        min={1}
        max={7}
        styles={inputStyles}
        {...form.getInputProps("training_days_per_week")}
      />

      <Textarea
        label="Cuéntanos más sobre tus objetivos"
        placeholder="Por ejemplo: Quiero perder 5kg en 3 meses, mejorar mi resistencia para correr una media maratón..."
        minRows={3}
        styles={inputStyles}
        {...form.getInputProps("goals_description")}
      />
    </Stack>
  );
}

// Step 4: Salud
function StepHealth({ form }: { form: any }) {
  const inputStyles = {
    input: {
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "white",
      borderRadius: 12,
      "&:focus": {
        borderColor: "var(--nv-accent)",
      },
      "&::placeholder": {
        color: "rgba(255, 255, 255, 0.4)",
      },
    },
    label: {
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: 6,
    },
  };

  return (
    <Stack gap="md">
      <Group align="center" gap="sm" mb="md">
        <ThemeIcon
          size={40}
          radius="xl"
          style={{ background: "rgba(212, 175, 55, 0.2)" }}
        >
          <IconHeart size={20} color="var(--nv-accent)" />
        </ThemeIcon>
        <Box>
          <Text c="white" fw={600}>Información de Salud</Text>
          <Text c="gray.5" size="sm">Para personalizar tu plan de forma segura</Text>
        </Box>
      </Group>

      <MultiSelect
        label="¿Tienes alguna alergia alimentaria?"
        placeholder="Selecciona si aplica"
        data={ALLERGENS}
        searchable
        clearable
        styles={{
          ...inputStyles,
          pill: {
            background: "var(--nv-accent)",
            color: "#1a1a2e",
          },
        }}
        {...form.getInputProps("allergies")}
      />

      <MultiSelect
        label="¿Tienes alguna intolerancia alimentaria?"
        placeholder="Selecciona si aplica"
        data={INTOLERANCES}
        searchable
        clearable
        styles={{
          ...inputStyles,
          pill: {
            background: "var(--nv-accent)",
            color: "#1a1a2e",
          },
        }}
        {...form.getInputProps("intolerances")}
      />

      <Textarea
        label="¿Tienes alguna lesión o problema físico?"
        placeholder="Por ejemplo: Dolor de espalda, lesión de rodilla, tendinitis..."
        minRows={2}
        styles={inputStyles}
        {...form.getInputProps("injuries")}
      />

      <Textarea
        label="¿Tienes alguna condición médica que debamos conocer?"
        placeholder="Por ejemplo: Diabetes, hipertensión, asma..."
        minRows={2}
        styles={inputStyles}
        {...form.getInputProps("medical_conditions")}
      />
    </Stack>
  );
}

// Step 5: Consentimientos
function StepConsents({ form }: { form: any }) {
  return (
    <Stack gap="md">
      <Group align="center" gap="sm" mb="md">
        <ThemeIcon
          size={40}
          radius="xl"
          style={{ background: "rgba(212, 175, 55, 0.2)" }}
        >
          <IconCheck size={20} color="var(--nv-accent)" />
        </ThemeIcon>
        <Box>
          <Text c="white" fw={600}>Consentimientos</Text>
          <Text c="gray.5" size="sm">Para poder ofrecerte el mejor servicio</Text>
        </Box>
      </Group>

      <Paper
        p="md"
        radius="md"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Stack gap="md">
          <Checkbox
            label={
              <Box>
                <Text c="white" size="sm" fw={500}>Tratamiento de datos personales *</Text>
                <Text c="gray.5" size="xs">
                  Acepto que mis datos personales sean tratados para la prestación del servicio de entrenamiento personal.
                </Text>
              </Box>
            }
            styles={{
              input: {
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                "&:checked": {
                  background: "var(--nv-accent)",
                  borderColor: "var(--nv-accent)",
                },
              },
            }}
            {...form.getInputProps("consent_data_processing", { type: "checkbox" })}
          />

          <Divider color="rgba(255, 255, 255, 0.1)" />

          <Checkbox
            label={
              <Box>
                <Text c="white" size="sm" fw={500}>Tratamiento de datos de salud *</Text>
                <Text c="gray.5" size="xs">
                  Acepto que mis datos de salud (alergias, lesiones, condiciones médicas) sean tratados para personalizar mi plan de entrenamiento y nutrición.
                </Text>
              </Box>
            }
            styles={{
              input: {
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                "&:checked": {
                  background: "var(--nv-accent)",
                  borderColor: "var(--nv-accent)",
                },
              },
            }}
            {...form.getInputProps("consent_health_data", { type: "checkbox" })}
          />

          <Divider color="rgba(255, 255, 255, 0.1)" />

          <Checkbox
            label={
              <Box>
                <Text c="white" size="sm" fw={500}>Comunicaciones comerciales</Text>
                <Text c="gray.5" size="xs">
                  Acepto recibir comunicaciones sobre novedades, promociones y consejos de entrenamiento.
                </Text>
              </Box>
            }
            styles={{
              input: {
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                "&:checked": {
                  background: "var(--nv-accent)",
                  borderColor: "var(--nv-accent)",
                },
              },
            }}
            {...form.getInputProps("consent_marketing", { type: "checkbox" })}
          />
        </Stack>
      </Paper>

      <Text c="gray.5" size="xs" ta="center">
        * Campos obligatorios para continuar
      </Text>
    </Stack>
  );
}

export default OnboardingPage;
