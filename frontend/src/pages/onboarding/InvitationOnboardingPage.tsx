import {
  Alert,
  Badge,
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
  IconCalendarDollar,
  IconCheck,
  IconCreditCard,
  IconFileText,
  IconHeartbeat,
  IconLock,
  IconMail,
  IconShieldCheck,
  IconTarget,
  IconUser,
} from "@tabler/icons-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api, redsysApi, sequraApi } from "../../services/api";
import { useAuthStore } from "../../stores/auth";

interface ProductInfo {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval?: string;
  product_type: string;
}

interface InvitationData {
  valid: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  workspace_name?: string;
  workspace_slug?: string;
  message?: string;
  product?: ProductInfo;
  payment_completed?: boolean;
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
  const [searchParams] = useSearchParams();
  const { setUser, setTokens } = useAuthStore();
  const [active, setActive] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);

  // Payment state
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Payment method selection: "redsys" (card) or "sequra" (installments)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"redsys" | "sequra">("redsys");

  // SeQura state
  const [sequraAvailable, setSequraAvailable] = useState(false);
  const [sequraMethods, setSequraMethods] = useState<any[]>([]);
  const [sequraAgreements, setSequraAgreements] = useState<any[]>([]);
  const [sequraFormHtml, setSequraFormHtml] = useState<string | null>(null);
  const [showSequraForm, setShowSequraForm] = useState(false);
  const [sequraAssetKey, setSequraAssetKey] = useState("");
  const [sequraMerchant, setSequraMerchant] = useState("");
  const [sequraScriptUri, setSequraScriptUri] = useState("");
  const sequraFormRef = useRef<HTMLDivElement>(null);

  // Check if returning from payment
  const paymentParam = searchParams.get("payment");
  const gatewayParam = searchParams.get("gateway");
  const dsSignatureVersion = searchParams.get("Ds_SignatureVersion");
  const dsMerchantParameters = searchParams.get("Ds_MerchantParameters");
  const dsSignature = searchParams.get("Ds_Signature");

  // Check payment status after returning from payment gateway
  const checkPaymentStatus = useCallback(async () => {
    if (!token) return;
    setCheckingPayment(true);
    try {
      if (gatewayParam === "sequra") {
        // SeQura return: check via SeQura status endpoint
        const res = await sequraApi.getOnboardingPaymentStatus(token);
        if (res.data.payment_completed) {
          setPaymentCompleted(true);
          setPaymentRequired(false);
        } else if (res.data.status === "failed") {
          setPaymentError("El pago con SeQura no se ha completado. Puedes intentarlo de nuevo.");
        } else {
          // Might be pending IPN, poll a few times
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            try {
              const pollRes = await sequraApi.getOnboardingPaymentStatus(token);
              if (pollRes.data.payment_completed) {
                clearInterval(pollInterval);
                setPaymentCompleted(true);
                setPaymentRequired(false);
                setCheckingPayment(false);
              } else if (attempts >= 10) {
                clearInterval(pollInterval);
                setCheckingPayment(false);
              }
            } catch {
              if (attempts >= 10) {
                clearInterval(pollInterval);
                setCheckingPayment(false);
              }
            }
          }, 2000);
          return;
        }
      } else {
        // Redsys return: confirm via backend if params present
        if (dsSignatureVersion && dsMerchantParameters && dsSignature) {
          try {
            await redsysApi.confirmReturn({
              Ds_SignatureVersion: dsSignatureVersion,
              Ds_MerchantParameters: dsMerchantParameters,
              Ds_Signature: dsSignature,
            });
          } catch {
            // If confirm-return fails, still try checking status
          }
        }

        const res = await redsysApi.getOnboardingPaymentStatus(token);
        if (res.data.payment_completed) {
          setPaymentCompleted(true);
          setPaymentRequired(false);
        } else if (res.data.status === "failed") {
          setPaymentError("El pago no se ha completado. Puedes intentarlo de nuevo.");
        }
      }
    } catch {
      // Silently fail -- user can retry
    } finally {
      setCheckingPayment(false);
    }
  }, [token, gatewayParam, dsSignatureVersion, dsMerchantParameters, dsSignature]);

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

          // Determine if payment is required
          if (response.data.product && response.data.product.price > 0) {
            if (response.data.payment_completed) {
              setPaymentCompleted(true);
              setPaymentRequired(false);
            } else {
              setPaymentRequired(true);
            }
          }
        }
      } catch {
        setInvitationData({ valid: false });
      } finally {
        setLoadingInvitation(false);
      }
    };
    
    validateInvitation();
  }, [token]);

  // If returning from payment, check status
  useEffect(() => {
    if (paymentParam === "success" && !paymentCompleted) {
      checkPaymentStatus();
    } else if (paymentParam === "error") {
      setPaymentError("El pago no se ha completado. Puedes intentarlo de nuevo.");
    }
  }, [paymentParam, paymentCompleted, checkPaymentStatus]);

  // Fetch SeQura available methods when payment is required
  useEffect(() => {
    if (!paymentRequired || !token || paymentCompleted) return;

    const fetchSequraMethods = async () => {
      try {
        const res = await sequraApi.getAvailableMethods(token);
        if (res.data.available) {
          setSequraAvailable(true);
          setSequraMethods(res.data.methods || []);
          setSequraAgreements(res.data.credit_agreements || []);
          setSequraAssetKey(res.data.asset_key || "");
          setSequraMerchant(res.data.merchant || "");
          setSequraScriptUri(res.data.script_uri || "");
        }
      } catch (err) {
        console.warn("SeQura available-methods failed:", err);
      }
    };

    fetchSequraMethods();
  }, [paymentRequired, token, paymentCompleted]);

  // Handle Redsys payment initiation
  const handleStartRedsysPayment = async () => {
    if (!token) return;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await redsysApi.createOnboardingPayment(token);
      const { Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature, redsys_url } = res.data;

      const form_el = document.createElement("form");
      form_el.method = "POST";
      form_el.action = redsys_url;

      const addField = (name: string, value: string) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form_el.appendChild(input);
      };

      addField("Ds_SignatureVersion", Ds_SignatureVersion);
      addField("Ds_MerchantParameters", Ds_MerchantParameters);
      addField("Ds_Signature", Ds_Signature);

      document.body.appendChild(form_el);
      form_el.submit();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      setPaymentError(err.response?.data?.detail || err.message || "Error al iniciar el pago");
      setPaymentLoading(false);
    }
  };

  // Handle SeQura payment initiation
  const handleStartSequraPayment = async () => {
    if (!token) return;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const productCode = sequraMethods.length > 0 ? sequraMethods[0].code : "pp3";
      const res = await sequraApi.startOnboarding(token, productCode);
      const { form_html } = res.data;

      if (form_html) {
        setSequraFormHtml(form_html);
        setShowSequraForm(true);
      } else {
        setPaymentError("No se pudo cargar el formulario de SeQura. Inténtalo de nuevo.");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      setPaymentError(err.response?.data?.detail || err.message || "Error al iniciar el pago con SeQura");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Render SeQura form HTML and initialize it
  useEffect(() => {
    if (!showSequraForm || !sequraFormHtml || !sequraFormRef.current) return;

    const container = sequraFormRef.current;
    container.innerHTML = sequraFormHtml;

    // Execute any <script> tags in the HTML
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    // Set up the SeQura form instance callback
    const initSequraForm = () => {
      if ((window as any).SequraFormInstance) {
        (window as any).SequraFormInstance.setCloseCallback(() => {
          setShowSequraForm(false);
          setSequraFormHtml(null);
        });
        (window as any).SequraFormInstance.show();
      }
    };

    // Wait for SeQura scripts to load
    const timer = setTimeout(initSequraForm, 1000);
    return () => clearTimeout(timer);
  }, [showSequraForm, sequraFormHtml]);

  // Load SeQura promotional widget script when SeQura is selected
  useEffect(() => {
    if (!sequraAvailable || selectedPaymentMethod !== "sequra" || !sequraAssetKey || !sequraMerchant || !sequraScriptUri) return;

    // Check if script already loaded
    if ((window as any).SequraConfiguration) {
      // Just refresh components if already loaded
      if ((window as any).Sequra?.refreshComponents) {
        (window as any).Sequra.refreshComponents();
      }
      return;
    }

    // Set up SeQura configuration
    const sequraConfigParams = {
      merchant: sequraMerchant,
      assetKey: sequraAssetKey,
      products: sequraMethods.map((m: any) => m.code).filter(Boolean),
      scriptUri: sequraScriptUri,
      decimalSeparator: ",",
      thousandSeparator: ".",
      locale: "es-ES",
      currency: "EUR",
    };

    (window as any).SequraConfiguration = sequraConfigParams;
    (window as any).SequraOnLoad = [];
    (window as any).Sequra = {
      onLoad: (callback: () => void) => {
        (window as any).SequraOnLoad.push(callback);
      },
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = sequraScriptUri;
    document.head.appendChild(script);

    // Refresh components once loaded
    (window as any).Sequra.onLoad(() => {
      if ((window as any).Sequra?.refreshComponents) {
        (window as any).Sequra.refreshComponents();
      }
    });

    return () => {
      // Don't remove the script on cleanup to avoid re-loading
    };
  }, [sequraAvailable, selectedPaymentMethod, sequraAssetKey, sequraMerchant, sequraScriptUri, sequraMethods]);

  // Refresh SeQura widgets when the widget DOM elements change
  useEffect(() => {
    if (selectedPaymentMethod === "sequra" && (window as any).Sequra?.refreshComponents) {
      setTimeout(() => {
        (window as any).Sequra.refreshComponents();
      }, 300);
    }
  }, [selectedPaymentMethod]);

  // Dispatch payment based on selected method
  const handleStartPayment = () => {
    if (selectedPaymentMethod === "sequra") {
      handleStartSequraPayment();
    } else {
      handleStartRedsysPayment();
    }
  };

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

  const hasParqRisk = [
    form.values.parqResponses.heartCondition,
    form.values.parqResponses.chestPain,
    form.values.parqResponses.dizziness,
    form.values.parqResponses.boneJoint,
    form.values.parqResponses.bloodPressure,
    form.values.parqResponses.otherReason,
  ].some((v) => v === "true" || v === true);

  const handleSubmit = async () => {
    if (!invitationData || !token) return;
    
    setLoading(true);
    try {
      const values = form.values;
      
      // Call the backend to complete registration via invitation
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
      
      const response = await api.post(`/invitations/complete/${token}`, {
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
      });
      
      // Check if email verification is required
      if (response.data?.requires_email_verification || response.data?.access_token === "pending_email_confirmation") {
        setCompleted(true);
        notifications.show({
          title: "¡Registro completado!",
          message: "Por favor, revisa tu email para confirmar tu cuenta antes de iniciar sesión.",
          color: "blue",
          autoClose: 10000,
        });
      } else if (response.data?.access_token && response.data?.access_token !== "pending_confirmation") {
        // If registration succeeded and returned valid tokens, save them
        setUser({
          id: response.data.user?.id,
          email: values.email,
          full_name: `${values.firstName} ${values.lastName}`,
          is_active: true,
        });
        setTokens(response.data.access_token, response.data.refresh_token);
        
        setCompleted(true);
        notifications.show({
          title: "¡Registro completado!",
          message: "Tu perfil ha sido creado correctamente",
          color: "green",
        });
      } else {
        setCompleted(true);
        notifications.show({
          title: "¡Registro completado!",
          message: "Por favor, revisa tu email para confirmar tu cuenta.",
          color: "blue",
        });
      }
      
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
            ¡Te has registrado con ÉXITO!
          </Title>
          <Text c="dimmed" mb="md">
            Tu onboarding se ha realizado con éxito.
          </Text>
          <Text c="dimmed" mb="xl">
            Gracias por completar tu registro en {invitationData.workspace_name}. 
            <strong> Revisa tu email para confirmar tu cuenta</strong> y luego podrás iniciar sesión.
            Tu entrenador revisará tu información y se pondrá en contacto contigo pronto.
          </Text>
          <Button size="lg" onClick={() => navigate("/login")}>Ir a Iniciar Sesión</Button>
        </Paper>
      </Container>
    );
  }

  // Payment gate: show payment screen before the registration form
  if (paymentRequired && !paymentCompleted) {
    const product = invitationData.product!;
    const intervalLabel = product.interval === "month" ? "/mes" : product.interval === "year" ? "/año" : product.interval === "week" ? "/semana" : "";

    // If SeQura form is being shown, render it full-screen
    if (showSequraForm) {
      return (
        <Container py="xl" size="sm">
          <Box mb="md" ta="center">
            <Title mb="xs" order={3}>
              Completar pago con SeQura
            </Title>
            <Text c="dimmed" size="sm">
              Completa la verificación de identidad para finalizar el pago fraccionado
            </Text>
          </Box>

          <Paper p="md" radius="lg" withBorder>
            <div ref={sequraFormRef} />
          </Paper>

          <Group justify="center" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setShowSequraForm(false);
                setSequraFormHtml(null);
              }}
            >
              Cancelar y volver
            </Button>
          </Group>
        </Container>
      );
    }

    return (
      <Container py="xl" size="sm">
        <Box mb="xl" ta="center">
          <Title mb="xs" order={2}>
            {invitationData.workspace_name}
          </Title>
          <Text c="dimmed">
            Para completar tu registro, primero debes activar tu plan
          </Text>
        </Box>

        <Paper p="xl" radius="lg" withBorder>
          {checkingPayment ? (
            <Stack align="center" gap="md" py="xl">
              <Loader size="lg" />
              <Text c="dimmed">Verificando estado del pago...</Text>
            </Stack>
          ) : (
            <Stack gap="lg">
              {/* Product info */}
              <Stack align="center" gap="md">
                <div style={{ textAlign: "center" }}>
                  <Title order={3} mb="xs">{product.name}</Title>
                  {product.description && (
                    <Text c="dimmed" size="sm">{product.description}</Text>
                  )}
                </div>

                <Paper p="lg" radius="md" withBorder w="100%" style={{ background: "rgba(45, 106, 79, 0.03)" }}>
                  <Group justify="center" gap="xs">
                    <Title order={1} style={{ fontSize: "2.5rem" }}>
                      {product.price.toFixed(2)}€
                    </Title>
                    {intervalLabel && (
                      <Text c="dimmed" size="lg">{intervalLabel}</Text>
                    )}
                  </Group>
                  <Text c="dimmed" size="sm" ta="center" mt="xs">
                    {product.product_type === "subscription" ? "Suscripción recurrente" : "Pago único"}
                  </Text>
                </Paper>
              </Stack>

              <Divider label="Elige tu método de pago" labelPosition="center" />

              {/* Payment method selector */}
              <Stack gap="sm">
                {/* Redsys (Card) option */}
                <Paper
                  p="md"
                  radius="md"
                  withBorder
                  style={{
                    cursor: "pointer",
                    borderColor: selectedPaymentMethod === "redsys" ? "var(--mantine-color-blue-6)" : undefined,
                    borderWidth: selectedPaymentMethod === "redsys" ? 2 : 1,
                    background: selectedPaymentMethod === "redsys" ? "rgba(34, 139, 230, 0.04)" : undefined,
                  }}
                  onClick={() => setSelectedPaymentMethod("redsys")}
                >
                  <Group>
                    <Radio
                      checked={selectedPaymentMethod === "redsys"}
                      onChange={() => setSelectedPaymentMethod("redsys")}
                      styles={{ radio: { cursor: "pointer" } }}
                    />
                    <ThemeIcon color="blue" radius="md" size={40} variant="light">
                      <IconCreditCard size={22} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text fw={600} size="sm">Pagar con tarjeta</Text>
                      <Group gap={6} mt={2}>
                        <Badge variant="light" size="xs">Visa</Badge>
                        <Badge variant="light" size="xs">Mastercard</Badge>
                        <Badge variant="light" size="xs">Google Pay</Badge>
                      </Group>
                    </div>
                    <Text fw={700} size="lg">{product.price.toFixed(2)}€</Text>
                  </Group>
                </Paper>

                {/* SeQura (Installments) option */}
                {sequraAvailable && (
                  <Paper
                    p="md"
                    radius="md"
                    withBorder
                    style={{
                      cursor: "pointer",
                      borderColor: selectedPaymentMethod === "sequra" ? "var(--mantine-color-teal-6)" : undefined,
                      borderWidth: selectedPaymentMethod === "sequra" ? 2 : 1,
                      background: selectedPaymentMethod === "sequra" ? "rgba(18, 184, 134, 0.04)" : undefined,
                    }}
                    onClick={() => setSelectedPaymentMethod("sequra")}
                  >
                    <Group>
                      <Radio
                        checked={selectedPaymentMethod === "sequra"}
                        onChange={() => setSelectedPaymentMethod("sequra")}
                        styles={{ radio: { cursor: "pointer" } }}
                      />
                      <ThemeIcon color="teal" radius="md" size={40} variant="light">
                        <IconCalendarDollar size={22} />
                      </ThemeIcon>
                      <div style={{ flex: 1 }}>
                        <Text fw={600} size="sm">Pagar a plazos con SeQura</Text>
                        <Text c="dimmed" size="xs" mt={2}>
                          {sequraAgreements.length > 0
                            ? `Fracciona tu pago en cómodos plazos`
                            : "Paga en cuotas sin intereses"}
                        </Text>
                      </div>
                    </Group>

                    {/* SeQura promotional widget placeholder */}
                    {selectedPaymentMethod === "sequra" && sequraAssetKey && (
                      <Box mt="sm" ml={58}>
                        <div
                          className="sequra-promotion-widget"
                          data-amount={String(Math.round(product.price * 100))}
                          data-product={sequraMethods.length > 0 ? sequraMethods[0].code : "pp3"}
                          data-size="M"
                          data-alignment="left"
                          data-branding="default"
                          style={{ minHeight: 40 }}
                        />
                      </Box>
                    )}
                  </Paper>
                )}
              </Stack>

              {paymentError && (
                <Alert color="red" icon={<IconAlertCircle size={16} />} w="100%">
                  {paymentError}
                </Alert>
              )}

              <Button
                size="lg"
                fullWidth
                loading={paymentLoading}
                onClick={handleStartPayment}
                color={selectedPaymentMethod === "sequra" ? "teal" : "blue"}
                leftSection={
                  selectedPaymentMethod === "sequra"
                    ? <IconCalendarDollar size={20} />
                    : <IconCreditCard size={20} />
                }
              >
                {selectedPaymentMethod === "sequra"
                  ? "Continuar con SeQura"
                  : "Pagar con tarjeta"}
              </Button>

              <Group gap="xs" justify="center">
                <IconShieldCheck size={16} color="gray" />
                <Text c="dimmed" size="xs">
                  {selectedPaymentMethod === "sequra"
                    ? "Pago seguro procesado por SeQura"
                    : "Pago seguro procesado por Redsys"}
                </Text>
              </Group>
            </Stack>
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Container py="xl" size="md">
      <Box mb="xl" ta="center">
        <Title mb="xs" order={2}>
          {invitationData.workspace_name}
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
                label="3. ¿Has experimentado mareos o pérdida de conocimiento?"
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
                label="4. ¿Tienes algún problema óseo o articular?"
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
                label="5. ¿Tomas medicamentos para la presión arterial o el corazón?"
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
                label="6. ¿Conoces otra razón por la que no deberías hacer ejercicio?"
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
