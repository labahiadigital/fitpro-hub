import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Loader,
  MultiSelect,
  NumberInput,
  Paper,
  PasswordInput,
  Progress,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconFileText,
  IconHeartbeat,
  IconLock,
  IconMail,
  IconTarget,
  IconUser,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/auth";

interface InvitationData {
  valid: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  workspace_name?: string;
  workspace_slug?: string;
  message?: string;
}

interface OnboardingFormData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  birthDate: Date | null;
  gender: string;
  height: number | null;
  weight: number | null;

  // Goals
  primaryGoal: string;
  secondaryGoals: string[];
  targetWeight: number | null;
  activityLevel: string;
  trainingDaysPerWeek: number;
  goalsDescription: string;

  // Health
  hasInjuries: boolean;
  injuries: string;
  hasMedicalConditions: boolean;
  medicalConditions: string;
  medications: string;
  allergies: string[];
  intolerances: string[];

  // PAR-Q
  parqResponses: {
    heartCondition: boolean;
    chestPain: boolean;
    dizziness: boolean;
    boneJoint: boolean;
    bloodPressure: boolean;
    otherReason: boolean;
  };

  // Consent
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

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
];

// Opciones de intolerancias
const INTOLERANCES = [
  { value: "fructosa", label: "Fructosa" },
  { value: "sorbitol", label: "Sorbitol" },
  { value: "histamina", label: "Histamina" },
  { value: "fodmap", label: "FODMAP" },
  { value: "cafeina", label: "Cafeína" },
];

export function InvitationOnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [active, setActive] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);

  // Verificar invitación
  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        setLoadingInvitation(false);
        return;
      }
      
      try {
        const response = await api.get(`/invitations/validate/${token}`);
        setInvitationData(response.data);
        
        if (response.data.valid) {
          // Pre-fill form with invitation data
          form.setValues({
            ...form.values,
            email: response.data.email || "",
            firstName: response.data.first_name || "",
            lastName: response.data.last_name || "",
          });
        }
      } catch {
        setInvitationData({ valid: false });
      } finally {
        setLoadingInvitation(false);
      }
    };
    
    validateInvitation();
  }, [token]);

  const form = useForm<OnboardingFormData>({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      birthDate: null,
      gender: "",
      height: null,
      weight: null,
      primaryGoal: "",
      secondaryGoals: [],
      targetWeight: null,
      activityLevel: "",
      trainingDaysPerWeek: 3,
      goalsDescription: "",
      hasInjuries: false,
      injuries: "",
      hasMedicalConditions: false,
      medicalConditions: "",
      medications: "",
      allergies: [],
      intolerances: [],
      parqResponses: {
        heartCondition: false,
        chestPain: false,
        dizziness: false,
        boneJoint: false,
        bloodPressure: false,
        otherReason: false,
      },
      acceptTerms: false,
      acceptPrivacy: false,
      acceptMarketing: false,
    },
    validate: (values) => {
      if (active === 0) {
        return {
          firstName: values.firstName.length < 2 ? "Nombre requerido" : null,
          lastName: values.lastName.length < 2 ? "Apellido requerido" : null,
          email: /^\S+@\S+$/.test(values.email) ? null : "Email inválido",
          password: values.password.length < 8 ? "Mínimo 8 caracteres" : null,
        };
      }
      if (active === 1) {
        return {
          primaryGoal: values.primaryGoal ? null : "Selecciona un objetivo",
          activityLevel: values.activityLevel ? null : "Selecciona tu nivel de actividad",
        };
      }
      if (active === 4) {
        return {
          acceptTerms: values.acceptTerms ? null : "Debes aceptar los términos",
          acceptPrivacy: values.acceptPrivacy ? null : "Debes aceptar la política de privacidad",
        };
      }
      return {};
    },
  });

  const nextStep = () => {
    if (form.validate().hasErrors) return;
    if (active === 4) {
      handleSubmit();
    } else {
      setActive((current) => current + 1);
    }
  };

  const prevStep = () => setActive((current) => current - 1);

  const hasParqRisk = Object.values(form.values.parqResponses).some((v) => v);

  const handleSubmit = async () => {
    if (!invitationData || !token) return;
    
    setLoading(true);
    try {
      const values = form.values;
      
      // Call the backend to complete registration via invitation
      const response = await api.post(`/invitations/complete/${token}`, {
        email: values.email,
        password: values.password,
        first_name: values.firstName,
        last_name: values.lastName,
        phone: values.phone,
        birth_date: values.birthDate?.toISOString().split("T")[0],
        gender: values.gender,
        height_cm: values.height,
        weight_kg: values.weight,
        goals: values.goalsDescription || values.primaryGoal,
        health_data: {
          activity_level: values.activityLevel,
          fitness_goal: values.primaryGoal,
          secondary_goals: values.secondaryGoals,
          target_weight: values.targetWeight,
          training_days_per_week: values.trainingDaysPerWeek,
          allergies: values.allergies,
          intolerances: values.intolerances,
          injuries: values.hasInjuries ? [{ name: values.injuries, status: "active" }] : [],
          medical_conditions: values.hasMedicalConditions ? values.medicalConditions : "",
          medications: values.medications,
          parq_responses: values.parqResponses,
          parq_risk: hasParqRisk,
        },
        consents: {
          data_processing: values.acceptTerms,
          health_data: values.acceptPrivacy,
          marketing: values.acceptMarketing,
          consent_date: new Date().toISOString(),
        },
      });
      
      // If registration succeeded and returned tokens, save them
      if (response.data?.access_token) {
        setUser({
          id: response.data.user?.id,
          email: values.email,
          full_name: `${values.firstName} ${values.lastName}`,
          is_active: true,
        });
        setTokens(response.data.access_token, response.data.refresh_token);
      }
      
      setCompleted(true);
      
      notifications.show({
        title: "¡Registro completado!",
        message: "Tu perfil ha sido creado correctamente",
        color: "green",
      });
      
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || err.message || "Error al completar el registro",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvitation) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <Loader size="lg" />
          <Text c="dimmed" mt="md">Verificando invitación...</Text>
        </Paper>
      </Container>
    );
  }

  if (!invitationData || !invitationData.valid) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <ThemeIcon
            color="red"
            mb="lg"
            mx="auto"
            radius="xl"
            size={80}
            variant="light"
          >
            <IconAlertCircle size={40} />
          </ThemeIcon>
          <Title mb="sm" order={2}>
            Invitación no válida
          </Title>
          <Text c="dimmed" mb="xl">
            Esta invitación no es válida o ha expirado.
            Contacta con tu entrenador para obtener una nueva invitación.
          </Text>
          <Button size="lg" onClick={() => navigate("/")}>Ir al inicio</Button>
        </Paper>
      </Container>
    );
  }

  if (completed) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <ThemeIcon
            color="green"
            mb="lg"
            mx="auto"
            radius="xl"
            size={80}
            variant="light"
          >
            <IconCheck size={40} />
          </ThemeIcon>
          <Title mb="sm" order={2}>
            ¡Registro Completado!
          </Title>
          <Text c="dimmed" mb="xl">
            Gracias por completar tu registro en {invitationData.workspace_name}. 
            Tu entrenador revisará tu información y se pondrá en contacto contigo pronto.
          </Text>
          <Button size="lg" onClick={() => navigate("/dashboard")}>Ir al Dashboard</Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container py="xl" size="md">
      <Box mb="xl" ta="center">
        <Title mb="xs" order={2}>
          Bienvenido a {invitationData.workspace_name}
        </Title>
        <Text c="dimmed">
          Completa tu perfil para empezar tu transformación
        </Text>
        {invitationData.message && (
          <Paper p="md" mt="md" radius="md" withBorder style={{ background: "rgba(45, 106, 79, 0.05)" }}>
            <Text size="sm" c="dimmed" fs="italic">
              "{invitationData.message}"
            </Text>
          </Paper>
        )}
      </Box>

      <Progress mb="xl" radius="xl" size="sm" value={(active / 4) * 100} />

      <Stepper
        active={active}
        allowNextStepsSelect={false}
        onStepClick={setActive}
      >
        {/* Step 1: Personal Info */}
        <Stepper.Step
          description="Tu información básica"
          icon={<IconUser size={18} />}
          label="Datos Personales"
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="lg" order={4}>
              Información Personal
            </Title>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Nombre"
                  placeholder="Tu nombre"
                  required
                  {...form.getInputProps("firstName")}
                />
                <TextInput
                  label="Apellidos"
                  placeholder="Tus apellidos"
                  required
                  {...form.getInputProps("lastName")}
                />
              </SimpleGrid>
              <TextInput
                label="Email"
                placeholder="tu@email.com"
                required
                disabled={!!invitationData.email}
                leftSection={<IconMail size={16} />}
                {...form.getInputProps("email")}
              />
              <PasswordInput
                label="Contraseña"
                placeholder="Mínimo 8 caracteres"
                required
                leftSection={<IconLock size={16} />}
                {...form.getInputProps("password")}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Teléfono"
                  placeholder="+34 600 000 000"
                  {...form.getInputProps("phone")}
                />
                <DatePickerInput
                  label="Fecha de Nacimiento"
                  placeholder="Selecciona fecha"
                  {...form.getInputProps("birthDate")}
                />
              </SimpleGrid>
              <Select
                data={[
                  { value: "male", label: "Masculino" },
                  { value: "female", label: "Femenino" },
                  { value: "other", label: "Otro" },
                  { value: "prefer_not", label: "Prefiero no decir" },
                ]}
                label="Género"
                placeholder="Selecciona"
                {...form.getInputProps("gender")}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <NumberInput
                  label="Altura (cm)"
                  placeholder="170"
                  min={100}
                  max={250}
                  {...form.getInputProps("height")}
                />
                <NumberInput
                  label="Peso actual (kg)"
                  placeholder="70"
                  min={30}
                  max={300}
                  decimalScale={1}
                  {...form.getInputProps("weight")}
                />
              </SimpleGrid>
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 2: Goals */}
        <Stepper.Step
          description="¿Qué quieres lograr?"
          icon={<IconTarget size={18} />}
          label="Objetivos"
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="lg" order={4}>
              Tus Objetivos
            </Title>
            <Stack gap="md">
              <Select
                data={[
                  { value: "lose_weight", label: "Perder peso" },
                  { value: "gain_muscle", label: "Ganar masa muscular" },
                  { value: "improve_fitness", label: "Mejorar condición física" },
                  { value: "maintain", label: "Mantener peso actual" },
                  { value: "improve_health", label: "Mejorar salud general" },
                  { value: "sports_performance", label: "Rendimiento deportivo" },
                  { value: "rehabilitation", label: "Rehabilitación" },
                ]}
                label="Objetivo Principal"
                placeholder="Selecciona tu objetivo"
                required
                {...form.getInputProps("primaryGoal")}
              />
              <MultiSelect
                data={[
                  { value: "flexibility", label: "Mejorar flexibilidad" },
                  { value: "strength", label: "Aumentar fuerza" },
                  { value: "endurance", label: "Mejorar resistencia" },
                  { value: "posture", label: "Corregir postura" },
                  { value: "stress", label: "Reducir estrés" },
                  { value: "energy", label: "Aumentar energía" },
                  { value: "sleep", label: "Mejorar sueño" },
                ]}
                label="Objetivos Secundarios"
                placeholder="Selecciona todos los que apliquen"
                {...form.getInputProps("secondaryGoals")}
              />
              {(form.values.primaryGoal === "lose_weight" ||
                form.values.primaryGoal === "gain_muscle") && (
                <NumberInput
                  label="Peso Objetivo (kg)"
                  placeholder="Ej: 70"
                  {...form.getInputProps("targetWeight")}
                />
              )}
              <Select
                data={[
                  { value: "sedentary", label: "Sedentario (poco o nada de ejercicio)" },
                  { value: "light", label: "Ligero (1-2 días/semana)" },
                  { value: "moderate", label: "Moderado (3-4 días/semana)" },
                  { value: "active", label: "Activo (5-6 días/semana)" },
                  { value: "very_active", label: "Muy activo (ejercicio intenso diario)" },
                ]}
                label="Nivel de Actividad Actual"
                placeholder="Selecciona"
                required
                {...form.getInputProps("activityLevel")}
              />
              <NumberInput
                label="¿Cuántos días a la semana puedes entrenar?"
                placeholder="3"
                min={1}
                max={7}
                {...form.getInputProps("trainingDaysPerWeek")}
              />
              <Textarea
                label="Cuéntanos más sobre tus objetivos"
                placeholder="Por ejemplo: Quiero perder 5kg en 3 meses, mejorar mi resistencia..."
                minRows={3}
                {...form.getInputProps("goalsDescription")}
              />
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 3: Health */}
        <Stepper.Step
          description="Información médica"
          icon={<IconHeartbeat size={18} />}
          label="Salud"
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="lg" order={4}>
              Historial de Salud
            </Title>
            <Stack gap="md">
              <MultiSelect
                label="¿Tienes alguna alergia alimentaria?"
                placeholder="Selecciona si aplica"
                data={ALLERGENS}
                searchable
                clearable
                {...form.getInputProps("allergies")}
              />
              <MultiSelect
                label="¿Tienes alguna intolerancia alimentaria?"
                placeholder="Selecciona si aplica"
                data={INTOLERANCES}
                searchable
                clearable
                {...form.getInputProps("intolerances")}
              />
              <Divider my="sm" />
              <Checkbox
                label="¿Tienes alguna lesión actual o pasada?"
                {...form.getInputProps("hasInjuries", { type: "checkbox" })}
              />
              {form.values.hasInjuries && (
                <Textarea
                  label="Describe tus lesiones"
                  placeholder="Ej: Lesión de rodilla hace 2 años..."
                  {...form.getInputProps("injuries")}
                />
              )}
              <Checkbox
                label="¿Tienes alguna condición médica?"
                {...form.getInputProps("hasMedicalConditions", { type: "checkbox" })}
              />
              {form.values.hasMedicalConditions && (
                <Textarea
                  label="Describe tus condiciones médicas"
                  placeholder="Ej: Diabetes tipo 2, hipertensión..."
                  {...form.getInputProps("medicalConditions")}
                />
              )}
              <Textarea
                label="Medicamentos actuales"
                placeholder="Lista los medicamentos que tomas actualmente (si aplica)"
                {...form.getInputProps("medications")}
              />
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 4: PAR-Q */}
        <Stepper.Step
          description="Cuestionario de aptitud"
          icon={<IconFileText size={18} />}
          label="PAR-Q"
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="xs" order={4}>
              Cuestionario PAR-Q
            </Title>
            <Text c="dimmed" mb="lg" size="sm">
              Por favor responde estas preguntas con honestidad. Si respondes
              "Sí" a alguna, te recomendamos consultar con un médico antes de
              comenzar un programa de ejercicio.
            </Text>
            <Stack gap="md">
              <Radio.Group
                label="1. ¿Alguna vez un médico te ha dicho que tienes una condición cardíaca?"
                {...form.getInputProps("parqResponses.heartCondition")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="2. ¿Sientes dolor en el pecho cuando realizas actividad física?"
                {...form.getInputProps("parqResponses.chestPain")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="3. ¿Has experimentado mareos o pérdida de conocimiento?"
                {...form.getInputProps("parqResponses.dizziness")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="4. ¿Tienes algún problema óseo o articular?"
                {...form.getInputProps("parqResponses.boneJoint")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="5. ¿Tomas medicamentos para la presión arterial o el corazón?"
                {...form.getInputProps("parqResponses.bloodPressure")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="6. ¿Conoces otra razón por la que no deberías hacer ejercicio?"
                {...form.getInputProps("parqResponses.otherReason")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              {hasParqRisk && (
                <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                  Has respondido "Sí" a una o más preguntas. Te recomendamos
                  consultar con un médico antes de comenzar cualquier programa
                  de ejercicio.
                </Alert>
              )}
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 5: Consent */}
        <Stepper.Step
          description="Términos y privacidad"
          icon={<IconCheck size={18} />}
          label="Consentimiento"
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="lg" order={4}>
              Consentimientos
            </Title>
            <Stack gap="md">
              <Checkbox
                label={
                  <Text size="sm">
                    Acepto los{" "}
                    <Text c="blue" component="a" href="#" inherit>
                      Términos y Condiciones
                    </Text>{" "}
                    del servicio *
                  </Text>
                }
                {...form.getInputProps("acceptTerms", { type: "checkbox" })}
                error={form.errors.acceptTerms}
              />
              <Checkbox
                label={
                  <Text size="sm">
                    Acepto la{" "}
                    <Text c="blue" component="a" href="#" inherit>
                      Política de Privacidad
                    </Text>{" "}
                    y el tratamiento de mis datos de salud *
                  </Text>
                }
                {...form.getInputProps("acceptPrivacy", { type: "checkbox" })}
                error={form.errors.acceptPrivacy}
              />
              <Divider />
              <Checkbox
                label="Deseo recibir comunicaciones comerciales y novedades (opcional)"
                {...form.getInputProps("acceptMarketing", { type: "checkbox" })}
              />
            </Stack>
          </Paper>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button disabled={active === 0 || loading} onClick={prevStep} variant="default">
          Anterior
        </Button>
        <Button onClick={nextStep} loading={loading}>
          {active === 4 ? "Completar Registro" : "Siguiente"}
        </Button>
      </Group>
    </Container>
  );
}
