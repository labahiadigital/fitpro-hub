import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FileButton,
  Group,
  Image,
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
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconFileText,
  IconHeartbeat,
  IconLock,
  IconMail,
  IconPhone,
  IconPhoto,
  IconTarget,
  IconUser,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/auth";
import { formatDecimal } from "../../utils/format";
import { sanitizeHtml } from "../../utils/safeHtml";
import {
  ALLERGENS_SELECT_DATA,
  INTOLERANCES_SELECT_DATA,
} from "../../constants/allergens";
import {
  PasswordRulesIndicator,
  isStrongPassword,
} from "../../components/common/PasswordRulesIndicator";

interface OnboardingFormData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
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
    heartCondition: string; // "true" | "false"
    heartConditionDetails: string;
    chestPain: string;
    chestPainDetails: string;
    dizziness: string;
    dizzinessDetails: string;
    boneJoint: string;
    boneJointDetails: string;
    bloodPressure: string;
    bloodPressureDetails: string;
    otherReason: string;
    otherReasonDetails: string;
  };

  // Consent
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

const ALLERGENS = ALLERGENS_SELECT_DATA;
const INTOLERANCES = INTOLERANCES_SELECT_DATA;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ClientOnboardingPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("product");
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [active, setActive] = useState(0);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaceInfo, setWorkspaceInfo] = useState<{ name: string; id: string } | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [productInfo, setProductInfo] = useState<{ name: string; description?: string; price: number; interval?: string } | null>(null);
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [soldOutState, setSoldOutState] = useState<{
    action: "redirect" | "message" | "waitlist" | null;
    redirect_url?: string;
    message_html?: string;
    waitlist_success_message?: string;
  } | null>(null);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistData, setWaitlistData] = useState({ email: "", name: "", phone: "", message: "" });
  const [progressPhoto, setProgressPhoto] = useState<File | null>(null);
  const [progressPhotoPreview, setProgressPhotoPreview] = useState<string | null>(null);

  // Verificar que el workspace existe
  useEffect(() => {
    const checkWorkspace = async () => {
      if (!workspaceSlug) {
        setLoadingWorkspace(false);
        return;
      }
      
      try {
        const response = await api.get(`/workspaces/by-slug/${workspaceSlug}`);
        const data = response.data;
        
        if (!data) {
          notifications.show({
            title: "Error",
            message: "El enlace de registro no es válido",
            color: "red",
          });
          navigate("/");
          return;
        }
        
        setWorkspaceInfo({ name: data.name, id: data.id });

        if (productId) {
          try {
            const prodRes = await api.get(`/products/public/${productId}`);
            if (prodRes.data) {
              setProductInfo({
                name: prodRes.data.name,
                description: prodRes.data.description,
                price: prodRes.data.price,
                interval: prodRes.data.interval,
              });
            }
            // Also check availability to detect sold-out state up front and
            // apply the configured action (redirect now, or show custom pop-up).
            try {
              const availRes = await api.get(`/products/public/${productId}/availability`);
              if (availRes.data?.is_full) {
                const soldOut = availRes.data?.sold_out || {};
                const action = (soldOut.action as "redirect" | "message" | "waitlist" | null) || null;
                if (action === "redirect" && soldOut.redirect_url) {
                  window.location.href = soldOut.redirect_url;
                  return;
                }
                setSoldOutState({
                  action,
                  redirect_url: soldOut.redirect_url,
                  message_html: soldOut.message_html,
                  waitlist_success_message: soldOut.waitlist_success_message,
                });
              }
            } catch {
              /* availability check is best-effort */
            }
          } catch {
            notifications.show({
              title: "Producto no disponible",
              message: "El producto al que intentas acceder no está disponible",
              color: "orange",
            });
          }
        }
      } catch {
        notifications.show({
          title: "Error",
          message: "El enlace de registro no es válido",
          color: "red",
        });
        navigate("/");
      } finally {
        setLoadingWorkspace(false);
      }
    };
    
    checkWorkspace();
  }, [workspaceSlug, productId, navigate]);

  const handleProductSignup = async () => {
    if (!workspaceSlug || !productId) return;

    // Cuando el producto está agotado, esta pantalla no muestra el form
    // de signup (lo intercepta el render principal mostrando solo la
    // configuración de sold-out). Como guarda extra, si por cualquier
    // motivo se llamara a este handler, lo abortamos.
    if (soldOutState) return;

    // Validamos todos los campos del form de "Datos Personales" antes
    // del pago: el cliente nos da nombre + email + móvil + contraseña +
    // los 3 consentimientos en una sola pantalla y luego pasa al pago.
    const errors = form.validate();
    if (errors.hasErrors) {
      notifications.show({
        title: "Faltan datos",
        message: "Completa todos los campos obligatorios para continuar",
        color: "red",
      });
      return;
    }

    const v = form.values;
    if (!v.acceptTerms || !v.acceptPrivacy) {
      notifications.show({
        title: "Faltan consentimientos",
        message: "Debes aceptar los términos y la política de privacidad",
        color: "red",
      });
      return;
    }

    setCreatingInvitation(true);
    try {
      const res = await api.post(`/invitations/public-signup/${workspaceSlug}/${productId}`, {
        email: v.email,
        first_name: v.firstName,
        last_name: v.lastName,
        phone: v.phone,
        password: v.password,
        consents: {
          data_processing: v.acceptTerms,
          health_data: v.acceptPrivacy,
          marketing: v.acceptMarketing,
          consent_date: new Date().toISOString(),
        },
      });
      if (res.data?.invitation_token) {
        navigate(`/onboarding/invite/${res.data.invitation_token}`);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: "Error",
        message: err?.response?.data?.detail || "Error al iniciar el registro",
        color: "red",
      });
    } finally {
      setCreatingInvitation(false);
    }
  };

  const form = useForm<OnboardingFormData>({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      confirmEmail: "",
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
        heartCondition: "",
        heartConditionDetails: "",
        chestPain: "",
        chestPainDetails: "",
        dizziness: "",
        dizzinessDetails: "",
        boneJoint: "",
        boneJointDetails: "",
        bloodPressure: "",
        bloodPressureDetails: "",
        otherReason: "",
        otherReasonDetails: "",
      },
      acceptTerms: false,
      acceptPrivacy: false,
      acceptMarketing: false,
    },
    validate: (values) => {
      // Cuando entramos por la URL pública con producto el formulario es
      // de un único paso (Datos personales + móvil + 3 checkboxes de
      // consentimiento) y se valida todo a la vez antes de redirigir al
      // pago. Cuando entramos por el flujo legacy (workspaceSlug sin
      // product) se mantiene el validador por pasos del Stepper.
      if (productId) {
        const phoneOk = /^[+]?[\d\s().-]{6,}$/.test(values.phone || "");
        return {
          firstName: values.firstName.length < 2 ? "Nombre requerido" : null,
          lastName: values.lastName.length < 2 ? "Apellido requerido" : null,
          email: /^\S+@\S+$/.test(values.email) ? null : "Email inválido",
          confirmEmail:
            values.confirmEmail !== values.email
              ? "Los emails no coinciden"
              : null,
          password: isStrongPassword(values.password)
            ? null
            : "Mínimo 8 caracteres con mayúscula, minúscula y número",
          phone: phoneOk ? null : "Móvil obligatorio",
          acceptTerms: values.acceptTerms ? null : "Debes aceptar los términos",
          acceptPrivacy: values.acceptPrivacy
            ? null
            : "Debes aceptar la política de privacidad",
        };
      }
      if (active === 0) {
        return {
          firstName: values.firstName.length < 2 ? "Nombre requerido" : null,
          lastName: values.lastName.length < 2 ? "Apellido requerido" : null,
          email: /^\S+@\S+$/.test(values.email) ? null : "Email inválido",
          confirmEmail:
            values.confirmEmail !== values.email
              ? "Los emails no coinciden"
              : null,
          password: isStrongPassword(values.password)
            ? null
            : "Mínimo 8 caracteres con mayúscula, minúscula y número",
        };
      }
      if (active === 1) {
        return {
          primaryGoal: values.primaryGoal ? null : "Selecciona un objetivo",
          activityLevel: values.activityLevel
            ? null
            : "Selecciona tu nivel de actividad",
        };
      }
      if (active === 4) {
        return {
          acceptTerms: values.acceptTerms ? null : "Debes aceptar los términos",
          acceptPrivacy: values.acceptPrivacy
            ? null
            : "Debes aceptar la política de privacidad",
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

  const hasParqRisk = [
    form.values.parqResponses.heartCondition,
    form.values.parqResponses.chestPain,
    form.values.parqResponses.dizziness,
    form.values.parqResponses.boneJoint,
    form.values.parqResponses.bloodPressure,
    form.values.parqResponses.otherReason,
  ].some((v) => v === "true" || (typeof v === "boolean" && v));

  const handleSubmit = async () => {
    if (!workspaceInfo) return;
    
    setLoading(true);
    try {
      const values = form.values;
      
      // Call the backend to complete client onboarding
      // Handle birthDate - could be Date object or string
      let birthDateStr: string | undefined;
      const birthDateValue = values.birthDate as Date | string | null;
      if (birthDateValue) {
        if (birthDateValue instanceof Date) {
          birthDateStr = birthDateValue.toISOString().split("T")[0];
        } else if (typeof birthDateValue === "string") {
          birthDateStr = birthDateValue.split("T")[0];
        }
      }
      
      const progressPhotoDataUrl = progressPhoto ? await fileToDataUrl(progressPhoto) : undefined;
      const response = await api.post(`/auth/register-client`, {
        workspace_id: workspaceInfo.id,
        email: values.email,
        password: values.password,
        first_name: values.firstName,
        last_name: values.lastName,
        phone: values.phone,
        birth_date: birthDateStr,
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
        progress_photo_data_url: progressPhotoDataUrl,
        progress_photo_type: "front",
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

  if (loadingWorkspace) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <Loader size="lg" />
          <Text c="dimmed" mt="md">Verificando enlace de registro...</Text>
        </Paper>
      </Container>
    );
  }

  if (!workspaceInfo) {
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
            Enlace no válido
          </Title>
          <Text c="dimmed" mb="xl">
            El enlace de registro no es válido o ha expirado.
            Contacta con tu entrenador para obtener un nuevo enlace.
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
            ¡Te has registrado con ÉXITO!
          </Title>
          <Text c="dimmed" mb="md">
            Tu onboarding se ha realizado con éxito.
          </Text>
          <Text c="dimmed" mb="xl">
            Gracias por completar tu registro en {workspaceInfo.name}. Tu entrenador revisará tu
            información y se pondrá en contacto contigo pronto.
          </Text>
          <Button size="lg" onClick={() => navigate("/dashboard")}>Ir al Dashboard</Button>
        </Paper>
      </Container>
    );
  }

  if (productId && !productInfo) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <ThemeIcon
            color="orange"
            mb="lg"
            mx="auto"
            radius="xl"
            size={80}
            variant="light"
          >
            <IconAlertCircle size={40} />
          </ThemeIcon>
          <Title mb="sm" order={2}>
            Producto no disponible
          </Title>
          <Text c="dimmed" mb="xl">
            El plan al que intentas acceder no está disponible en este momento.
            Contacta con tu entrenador para más información.
          </Text>
          <Button size="lg" onClick={() => navigate("/")}>Ir al inicio</Button>
        </Paper>
      </Container>
    );
  }

  const handleWaitlistSubmit = async () => {
    if (!productId || !workspaceSlug) return;
    const email = waitlistData.email.trim();
    if (!/^\S+@\S+$/.test(email)) {
      notifications.show({ title: "Email no válido", message: "Introduce un email correcto", color: "red" });
      return;
    }
    setWaitlistSubmitting(true);
    try {
      await api.post(`/products/public/${productId}/waitlist`, {
        email,
        name: waitlistData.name || null,
        phone: waitlistData.phone || null,
        message: waitlistData.message || null,
      });
      setWaitlistSubmitted(true);
    } catch {
      notifications.show({ title: "Error", message: "No se pudo registrar en la waitlist", color: "red" });
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  if (productId && productInfo) {
    // Cuando el producto ha alcanzado su límite de usuarios, NO se debe
    // permitir iniciar el onboarding (ni siquiera rellenar nombre/email).
    // En su lugar, aplicamos la configuración del producto:
    //  - "redirect" (ya redirige el efecto inicial)
    //  - "waitlist" → formulario público de waitlist inline
    //  - "message"  → mensaje HTML configurado por el coach
    //  - sin acción → mensaje genérico de agotado
    if (soldOutState) {
      return (
        <Container py="xl" size="sm">
          <Box mb="xl" ta="center">
            <Title mb="xs" order={2}>
              {workspaceInfo.name}
            </Title>
            <Text c="dimmed">{productInfo.name}</Text>
          </Box>

          <Paper p="xl" radius="lg" withBorder>
            <Box mb="lg" p="md" style={{ backgroundColor: "var(--mantine-color-blue-light)", borderRadius: "var(--mantine-radius-md)" }}>
              <Text fw={700} size="lg" mb={4}>{productInfo.name}</Text>
              {productInfo.description && (
                <Box
                  c="dimmed"
                  fz="sm"
                  mb="xs"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(productInfo.description) }}
                />
              )}
              <Text fw={700} size="xl" c="blue">
                €{formatDecimal(Number(productInfo.price), 2)}
                {productInfo.interval && <Text span size="sm" c="dimmed" fw={400}>/{
                  productInfo.interval === "week" ? "semana" :
                  productInfo.interval === "biweekly" ? "quincenal" :
                  productInfo.interval === "quarter" ? "trimestre" :
                  productInfo.interval === "semester" ? "semestre" :
                  productInfo.interval === "year" ? "año" : "mes"
                }</Text>}
              </Text>
            </Box>

            <Alert
              icon={<IconAlertCircle size={16} />}
              color={soldOutState.action === "waitlist" ? "yellow" : "red"}
              mb="md"
              title={soldOutState.action === "waitlist" ? "Plazas agotadas" : "Producto agotado"}
            >
              {soldOutState.action === "waitlist"
                ? "Este producto está completo. Apúntate a la lista de espera y te avisaremos cuando haya una plaza disponible."
                : "Este producto no tiene plazas disponibles en este momento."}
            </Alert>

            {soldOutState.action === "message" && soldOutState.message_html && (
              <Box
                p="md"
                mb="md"
                style={{
                  border: "1px solid var(--mantine-color-gray-3)",
                  borderRadius: "var(--mantine-radius-md)",
                  background: "var(--mantine-color-gray-0)",
                }}
                dangerouslySetInnerHTML={{ __html: soldOutState.message_html }}
              />
            )}

            {soldOutState.action === "waitlist" && !waitlistSubmitted && (
              <Stack gap="sm">
                <TextInput
                  label="Email"
                  required
                  leftSection={<IconMail size={16} />}
                  value={waitlistData.email}
                  onChange={(e) => setWaitlistData((s) => ({ ...s, email: e.currentTarget.value }))}
                />
                <TextInput
                  label="Nombre"
                  value={waitlistData.name}
                  onChange={(e) => setWaitlistData((s) => ({ ...s, name: e.currentTarget.value }))}
                />
                <TextInput
                  label="Teléfono (opcional)"
                  value={waitlistData.phone}
                  onChange={(e) => setWaitlistData((s) => ({ ...s, phone: e.currentTarget.value }))}
                />
                <Textarea
                  label="Comentario (opcional)"
                  autosize
                  minRows={2}
                  value={waitlistData.message}
                  onChange={(e) => setWaitlistData((s) => ({ ...s, message: e.currentTarget.value }))}
                />
                <Button size="lg" fullWidth mt="xs" loading={waitlistSubmitting} onClick={handleWaitlistSubmit}>
                  Apuntarme a la lista de espera
                </Button>
              </Stack>
            )}

            {soldOutState.action === "waitlist" && waitlistSubmitted && (
              <Alert color="green" icon={<IconCheck size={16} />}>
                {soldOutState.waitlist_success_message ||
                  "¡Listo! Te hemos añadido a la lista de espera. Te avisaremos cuando haya una plaza disponible."}
              </Alert>
            )}

            {soldOutState.action === "redirect" && soldOutState.redirect_url && (
              <Stack gap="sm" align="center">
                <Text size="sm" c="dimmed">Te redirigimos al sitio configurado por el entrenador.</Text>
                <Button size="lg" onClick={() => { window.location.href = soldOutState.redirect_url || "/"; }}>
                  Continuar
                </Button>
              </Stack>
            )}

            {!soldOutState.action && (
              <Stack gap="sm" align="center">
                <Text size="sm" c="dimmed">Vuelve a intentarlo más tarde o contacta con tu entrenador.</Text>
              </Stack>
            )}
          </Paper>
        </Container>
      );
    }

    return (
      <Container py="xl" size="sm">
        <Box mb="xl" ta="center">
          <Title mb="xs" order={2}>
            {workspaceInfo.name}
          </Title>
          <Text c="dimmed">
            Regístrate para acceder a tu plan
          </Text>
        </Box>

        <Paper p="xl" radius="lg" withBorder>
          <Box mb="lg" p="md" style={{ backgroundColor: "var(--mantine-color-blue-light)", borderRadius: "var(--mantine-radius-md)" }}>
            <Text fw={700} size="lg" mb={4}>{productInfo.name}</Text>
            {productInfo.description && (
              <Box
                c="dimmed"
                fz="sm"
                mb="xs"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(productInfo.description) }}
              />
            )}
            <Text fw={700} size="xl" c="blue">
              €{formatDecimal(Number(productInfo.price), 2)}
              {productInfo.interval && <Text span size="sm" c="dimmed" fw={400}>/{
                productInfo.interval === "week" ? "semana" :
                productInfo.interval === "biweekly" ? "quincenal" :
                productInfo.interval === "quarter" ? "trimestre" :
                productInfo.interval === "semester" ? "semestre" :
                productInfo.interval === "year" ? "año" : "mes"
              }</Text>}
            </Text>
          </Box>

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
              leftSection={<IconMail size={16} />}
              {...form.getInputProps("email")}
            />
            <TextInput
              label="Confirma tu email"
              placeholder="Repite tu email"
              required
              leftSection={<IconMail size={16} />}
              {...form.getInputProps("confirmEmail")}
              error={
                form.values.confirmEmail &&
                form.values.confirmEmail !== form.values.email
                  ? "Los emails no coinciden"
                  : undefined
              }
            />
            <PasswordInput
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              required
              leftSection={<IconLock size={16} />}
              {...form.getInputProps("password")}
            />
            <PasswordRulesIndicator value={form.values.password} />
            <TextInput
              label="Móvil"
              placeholder="+34 600 000 000"
              required
              leftSection={<IconPhone size={16} />}
              description="Lo necesitamos para contactarte por WhatsApp"
              {...form.getInputProps("phone")}
            />

            <Divider my="xs" label="Consentimientos" labelPosition="center" />

            <Checkbox
              label={
                <Text size="sm">
                  Acepto los{" "}
                  <Anchor href="#" size="sm">
                    Términos y Condiciones
                  </Anchor>{" "}
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
                  <Anchor href="#" size="sm">
                    Política de Privacidad
                  </Anchor>{" "}
                  y el tratamiento de mis datos *
                </Text>
              }
              {...form.getInputProps("acceptPrivacy", { type: "checkbox" })}
              error={form.errors.acceptPrivacy}
            />
            <Checkbox
              label="Deseo recibir comunicaciones comerciales y novedades (opcional)"
              {...form.getInputProps("acceptMarketing", { type: "checkbox" })}
            />

            <Button
              size="lg"
              fullWidth
              mt="md"
              loading={creatingInvitation}
              onClick={handleProductSignup}
              disabled={
                !!form.values.confirmEmail &&
                form.values.confirmEmail !== form.values.email
              }
            >
              Continuar al pago
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container py="xl" size="md">
      <Box mb="xl" ta="center">
        <Title mb="xs" order={2}>
          {workspaceInfo.name}
        </Title>
        <Text c="dimmed">
          Completa tu perfil para empezar tu transformación
        </Text>
      </Box>

      <Progress mb={isMobile ? "sm" : "xl"} radius="xl" size="sm" value={(active / 4) * 100} />
      {isMobile && (
        <Text size="xs" c="dimmed" ta="center" mb="md" fw={500}>
          Paso {active + 1} de 5 · {[
            "Datos Personales",
            "Objetivos",
            "Salud",
            "PAR-Q",
            "Consentimiento",
          ][active]}
        </Text>
      )}

      <Stepper
        active={active}
        allowNextStepsSelect={false}
        onStepClick={setActive}
        size={isMobile ? "xs" : "sm"}
        iconSize={isMobile ? 28 : undefined}
        orientation="horizontal"
        styles={isMobile ? {
          steps: { flexWrap: "nowrap", gap: 4 },
          stepBody: { display: "none" },
          separator: { marginLeft: 4, marginRight: 4, minWidth: 0 },
        } : undefined}
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
                leftSection={<IconMail size={16} />}
                {...form.getInputProps("email")}
              />
              <TextInput
                label="Confirma tu email"
                placeholder="Repite tu email"
                required
                leftSection={<IconMail size={16} />}
                {...form.getInputProps("confirmEmail")}
                error={
                  form.values.confirmEmail &&
                  form.values.confirmEmail !== form.values.email
                    ? "Los emails no coinciden"
                    : undefined
                }
              />
              <Box>
                <PasswordInput
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  required
                  leftSection={<IconLock size={16} />}
                  {...form.getInputProps("password")}
                />
                <PasswordRulesIndicator value={form.values.password} />
              </Box>
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
                  {
                    value: "improve_fitness",
                    label: "Mejorar condición física",
                  },
                  { value: "maintain", label: "Mantener peso actual" },
                  { value: "improve_health", label: "Mejorar salud general" },
                  {
                    value: "sports_performance",
                    label: "Rendimiento deportivo",
                  },
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
                  {
                    value: "sedentary",
                    label: "Sedentario (poco o nada de ejercicio)",
                  },
                  { value: "light", label: "Ligero (1-2 días/semana)" },
                  { value: "moderate", label: "Moderado (3-4 días/semana)" },
                  { value: "active", label: "Activo (5-6 días/semana)" },
                  {
                    value: "very_active",
                    label: "Muy activo (ejercicio intenso diario)",
                  },
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
                {...form.getInputProps("hasMedicalConditions", {
                  type: "checkbox",
                })}
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
              <Paper p="md" radius="md" withBorder>
                <Group justify="space-between" align="center">
                  <Box>
                    <Text fw={600} size="sm">Foto inicial de progreso</Text>
                    <Text c="dimmed" size="xs">
                      Opcional. Puedes subir una foto frontal para que tu entrenador tenga un primer punto de referencia.
                    </Text>
                  </Box>
                  <FileButton
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(file) => {
                      setProgressPhoto(file);
                      setProgressPhotoPreview(file ? URL.createObjectURL(file) : null);
                    }}
                  >
                    {(props) => (
                      <Button {...props} variant="light" leftSection={<IconPhoto size={16} />} radius="xl" size="xs">
                        {progressPhoto ? "Cambiar foto" : "Subir foto"}
                      </Button>
                    )}
                  </FileButton>
                </Group>
                {progressPhotoPreview && (
                  <Image src={progressPhotoPreview} alt="Foto inicial de progreso" radius="md" mt="md" mah={220} fit="cover" />
                )}
              </Paper>
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
                label="1. ¿Alguna vez un médico te ha dicho que tienes una condición cardíaca y que solo debes hacer actividad física recomendada por un médico?"
                {...form.getInputProps("parqResponses.heartCondition")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.heartCondition === "true" && (
                <Textarea
                  label="Describe la condición cardíaca"
                  placeholder="Ej: Arritmia, insuficiencia cardíaca, marcapasos..."
                  minRows={2}
                  {...form.getInputProps("parqResponses.heartConditionDetails")}
                />
              )}

              <Radio.Group
                label="2. ¿Sientes dolor en el pecho cuando realizas actividad física?"
                {...form.getInputProps("parqResponses.chestPain")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.chestPain === "true" && (
                <Textarea
                  label="Describe el tipo de dolor y cuándo ocurre"
                  placeholder="Ej: Dolor punzante al correr, presión en el pecho al subir escaleras..."
                  minRows={2}
                  {...form.getInputProps("parqResponses.chestPainDetails")}
                />
              )}

              <Radio.Group
                label="3. ¿Has experimentado mareos o pérdida de conocimiento en el último mes?"
                {...form.getInputProps("parqResponses.dizziness")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.dizziness === "true" && (
                <Textarea
                  label="Describe la frecuencia y circunstancias"
                  placeholder="Ej: Me mareo al levantarme rápido, he perdido el conocimiento 2 veces..."
                  minRows={2}
                  {...form.getInputProps("parqResponses.dizzinessDetails")}
                />
              )}

              <Radio.Group
                label="4. ¿Tienes algún problema óseo o articular que pueda empeorar con el ejercicio?"
                {...form.getInputProps("parqResponses.boneJoint")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.boneJoint === "true" && (
                <Textarea
                  label="Describe tus limitaciones físicas"
                  placeholder="Ej: No puedo doblar la rodilla derecha completamente, tengo dolor lumbar al agacharme..."
                  minRows={2}
                  {...form.getInputProps("parqResponses.boneJointDetails")}
                />
              )}

              <Radio.Group
                label="5. ¿Tomas actualmente medicamentos para la presión arterial o el corazón?"
                {...form.getInputProps("parqResponses.bloodPressure")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.bloodPressure === "true" && (
                <Textarea
                  label="Lista los medicamentos que tomas"
                  placeholder="Ej: Enalapril 10mg, Losartán 50mg..."
                  minRows={2}
                  {...form.getInputProps("parqResponses.bloodPressureDetails")}
                />
              )}

              <Radio.Group
                label="6. ¿Conoces alguna otra razón por la que no deberías hacer ejercicio?"
                {...form.getInputProps("parqResponses.otherReason")}
              >
                <Group mt="xs">
                  <Radio label="Sí" value="true" />
                  <Radio label="No" value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.otherReason === "true" && (
                <Textarea
                  label="Explica el motivo"
                  placeholder="Describe la razón por la que crees que no deberías hacer ejercicio..."
                  minRows={2}
                  {...form.getInputProps("parqResponses.otherReasonDetails")}
                />
              )}

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
                    y el tratamiento de mis datos *
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
