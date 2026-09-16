import {
  Alert,
  Anchor,
  Avatar,
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
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/auth";
import { applyWorkspaceCssVars } from "../../theme/workspaceBranding";
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
import { useTranslation } from "react-i18next";

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

  // Datos de facturación (Persona Física / Jurídica). Sólo se piden en
  // el flujo público con producto, antes del pago, para poder emitir la
  // factura cuando se cobre.
  fiscalType: "individual" | "company";
  // Persona Física: name + lastName ya cubren el nombre fiscal; estos
  // tres son los nuevos campos que aparecen en la sección "Datos de
  // facturación".
  legalName: string; // sólo Persona Jurídica (Razón Social)
  taxId: string;
  billingAddress: string;
  billingCity: string;
  billingCountry: string;
  billingPostalCode: string;

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
  const { t } = useTranslation();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("product");
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [active, setActive] = useState(0);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaceInfo, setWorkspaceInfo] = useState<{
    name: string;
    id: string;
    logo_url?: string | null;
  } | null>(null);
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

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponResult, setCouponResult] = useState<{
    is_valid: boolean;
    discount_type?: string;
    discount_value?: number;
    message?: string;
  } | null>(null);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !workspaceInfo?.id) return;
    setCouponValidating(true);
    try {
      const res = await api.post("/products/coupons/public-validate", {
        code: couponCode.trim().toUpperCase(),
        product_id: productId || undefined,
      }, { params: { workspace_id: workspaceInfo.id } });
      setCouponResult(res.data);
    } catch {
      setCouponResult({ is_valid: false, message: t("onboarding.errorAlValidarElCupon") });
    } finally {
      setCouponValidating(false);
    }
  };

  const discountedPrice = useMemo(() => {
    if (!productInfo?.price || !couponResult?.is_valid) return productInfo?.price ?? 0;
    if (couponResult.discount_type === "percentage") {
      return Math.max(0, productInfo.price * (1 - (couponResult.discount_value || 0) / 100));
    }
    return Math.max(0, productInfo.price - (couponResult.discount_value || 0));
  }, [productInfo?.price, couponResult]);

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
            title: t("onboarding.error"),
            message: t("onboarding.elEnlaceDeRegistroNo"),
            color: "red",
          });
          navigate("/");
          return;
        }
        
        setWorkspaceInfo({
          name: data.name,
          id: data.id,
          logo_url: data.logo_url,
        });
        if (data.branding) {
          applyWorkspaceCssVars(data.branding);
        }

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
              title: t("onboarding.productoNoDisponible"),
              message: t("onboarding.elProductoAlQueIntentas"),
              color: "orange",
            });
          }
        }
      } catch {
        notifications.show({
          title: t("onboarding.error"),
          message: t("onboarding.elEnlaceDeRegistroNo"),
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
        title: t("onboarding.faltanDatos"),
        message: t("onboarding.completaTodosLosCamposObligatorios"),
        color: "red",
      });
      return;
    }

    const v = form.values;
    if (!v.acceptTerms || !v.acceptPrivacy) {
      notifications.show({
        title: t("onboarding.faltanConsentimientos"),
        message: t("onboarding.debesAceptarLosTerminosY"),
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
        fiscal_type: v.fiscalType,
        legal_name: v.fiscalType === "company" ? v.legalName.trim() : null,
        tax_id: v.taxId.trim(),
        billing_address: v.billingAddress.trim(),
        billing_city: v.billingCity.trim(),
        billing_country: v.billingCountry.trim(),
        billing_postal_code: v.billingPostalCode.trim(),
        coupon_code: couponResult?.is_valid ? couponCode.trim().toUpperCase() : undefined,
      });
      if (res.data?.invitation_token) {
        navigate(`/onboarding/invite/${res.data.invitation_token}`);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: t("onboarding.error"),
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
      fiscalType: "individual",
      legalName: "",
      taxId: "",
      billingAddress: "",
      billingCity: "",
      billingCountry: t("suppliers.espana"),
      billingPostalCode: "",
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
        const isCompany = values.fiscalType === "company";
        return {
          firstName: values.firstName.length < 2 ? t("clientOnboardingPage.nombreRequerido") : null,
          lastName: values.lastName.length < 2 ? t("clientOnboardingPage.apellidoRequerido") : null,
          email: /^\S+@\S+$/.test(values.email) ? null : t("auth.invalidEmail"),
          confirmEmail:
            values.confirmEmail !== values.email
              ? "Los emails no coinciden"
              : null,
          password: isStrongPassword(values.password)
            ? null
            : t("clientOnboardingPage.mínimo8CaracteresConMayúsculaMinús"),
          phone: phoneOk ? null : t("clientOnboardingPage.móvilObligatorio"),
          // Datos fiscales: todos obligatorios. Para Persona Jurídica
          // exigimos además ``legalName`` (Razón Social); en Persona
          // Física usamos ``firstName + lastName`` como nombre fiscal,
          // así que no se valida ``legalName``.
          legalName: isCompany && values.legalName.trim().length < 2
            ? t("clientOnboardingPage.razónSocialObligatoria")
            : null,
          taxId: values.taxId.trim().length < 5
            ? (isCompany ? "NIF/CIF obligatorio" : "NIF/DNI obligatorio")
            : null,
          billingAddress: values.billingAddress.trim().length < 4
            ? t("clientOnboardingPage.direcciónObligatoria")
            : null,
          billingCity: values.billingCity.trim().length < 2
            ? (isCompany ? t("clientOnboardingPage.ciudadOPoblaciónObligatoria") : t("clientOnboardingPage.poblaciónObligatoria"))
            : null,
          billingCountry: values.billingCountry.trim().length < 2
            ? t("clientOnboardingPage.paísObligatorio")
            : null,
          billingPostalCode: values.billingPostalCode.trim().length < 3
            ? t("clientOnboardingPage.códigoPostalObligatorio")
            : null,
          acceptTerms: values.acceptTerms ? null : t("auth.mustAcceptTerms"),
          acceptPrivacy: values.acceptPrivacy
            ? null
            : t("clientOnboardingPage.debesAceptarLaPolíticaDePrivacidad"),
        };
      }
      if (active === 0) {
        return {
          firstName: values.firstName.length < 2 ? t("clientOnboardingPage.nombreRequerido") : null,
          lastName: values.lastName.length < 2 ? t("clientOnboardingPage.apellidoRequerido") : null,
          email: /^\S+@\S+$/.test(values.email) ? null : t("auth.invalidEmail"),
          confirmEmail:
            values.confirmEmail !== values.email
              ? "Los emails no coinciden"
              : null,
          password: isStrongPassword(values.password)
            ? null
            : t("clientOnboardingPage.mínimo8CaracteresConMayúsculaMinús"),
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
          acceptTerms: values.acceptTerms ? null : t("auth.mustAcceptTerms"),
          acceptPrivacy: values.acceptPrivacy
            ? null
            : t("clientOnboardingPage.debesAceptarLaPolíticaDePrivacidad"),
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
        title: t("onboarding.registroCompletado"),
        message: t("onboarding.tuPerfilHaSidoCreado"),
        color: "green",
      });
      
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      notifications.show({
        title: t("onboarding.error"),
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
          <Text c="dimmed" mt="md">{t("onboarding.verificandoEnlaceDeRegistro")}</Text>
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
            {t("onboarding.enlaceNoValido")}
          </Title>
          <Text c="dimmed" mb="xl">
            {t("onboarding.elEnlaceDeRegistroNo")}
          </Text>
          <Button size="lg" onClick={() => navigate("/")}>{t("onboarding.irAlInicio")}</Button>
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
            {t("onboarding.teHasRegistradoConExito")}
          </Title>
          <Text c="dimmed" mb="md">
            {t("onboarding.tuOnboardingSeHaRealizado")}
          </Text>
          <Text c="dimmed" mb="xl">
            Gracias por completar tu registro en {workspaceInfo.name}. Tu entrenador revisará tu
            información y se pondrá en contacto contigo pronto.
          </Text>
          <Button size="lg" onClick={() => navigate("/dashboard")}>{t("onboarding.irAlDashboard")}</Button>
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
            {t("onboarding.productoNoDisponible")}
          </Title>
          <Text c="dimmed" mb="xl">
            {t("onboarding.elPlanAlQueIntentas")}
          </Text>
          <Button size="lg" onClick={() => navigate("/")}>{t("onboarding.irAlInicio")}</Button>
        </Paper>
      </Container>
    );
  }

  const handleWaitlistSubmit = async () => {
    if (!productId || !workspaceSlug) return;
    const email = waitlistData.email.trim();
    if (!/^\S+@\S+$/.test(email)) {
      notifications.show({ title: t("onboarding.emailNoValido"), message: t("onboarding.introduceUnEmailCorrecto"), color: "red" });
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
      notifications.show({ title: t("onboarding.error"), message: t("onboarding.noSePudoRegistrarEn"), color: "red" });
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
            <Group justify="center" mb="sm">
              {workspaceInfo.logo_url ? (
                <Avatar src={workspaceInfo.logo_url} size={64} radius="md" alt={workspaceInfo.name} />
              ) : null}
            </Group>
            <Title mb="xs" order={2} style={{ color: "var(--nv-primary)" }}>
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
                  productInfo.interval === "year" ? t("clientOnboardingPage.año") : "mes"
                }</Text>}
              </Text>
            </Box>

            <Alert
              icon={<IconAlertCircle size={16} />}
              color={soldOutState.action === "waitlist" ? "yellow" : "red"}
              mb="md"
              title={soldOutState.action === "waitlist" ? t("clientOnboardingPage.plazasAgotadas") : t("clientOnboardingPage.productoAgotado")}
            >
              {soldOutState.action === "waitlist"
                ? t("clientOnboardingPage.esteProductoEstáCompletoApúntateA")
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
                  label={t("onboarding.email")}
                  required
                  leftSection={<IconMail size={16} />}
                  value={waitlistData.email}
                  onChange={(e) => setWaitlistData((s) => ({ ...s, email: e.currentTarget.value }))}
                />
                <TextInput
                  label={t("onboarding.nombre")}
                  value={waitlistData.name}
                  onChange={(e) => setWaitlistData((s) => ({ ...s, name: e.currentTarget.value }))}
                />
                <TextInput
                  label={t("onboarding.telefonoOpcional")}
                  value={waitlistData.phone}
                  onChange={(e) => setWaitlistData((s) => ({ ...s, phone: e.currentTarget.value }))}
                />
                <Textarea
                  label={t("onboarding.comentarioOpcional")}
                  autosize
                  minRows={2}
                  value={waitlistData.message}
                  onChange={(e) => setWaitlistData((s) => ({ ...s, message: e.currentTarget.value }))}
                />
                <Button size="lg" fullWidth mt="xs" loading={waitlistSubmitting} onClick={handleWaitlistSubmit}>
                  {t("onboarding.apuntarmeALaListaDe")}
                </Button>
              </Stack>
            )}

            {soldOutState.action === "waitlist" && waitlistSubmitted && (
              <Alert color="green" icon={<IconCheck size={16} />}>
                {soldOutState.waitlist_success_message ||
                  t("onboarding.listoListaDeEspera")}
              </Alert>
            )}

            {soldOutState.action === "redirect" && soldOutState.redirect_url && (
              <Stack gap="sm" align="center">
                <Text size="sm" c="dimmed">{t("onboarding.teRedirigimosAlSitioConfigurado")}</Text>
                <Button size="lg" onClick={() => { window.location.href = soldOutState.redirect_url || "/"; }}>
                  {t("onboarding.continuar")}
                </Button>
              </Stack>
            )}

            {!soldOutState.action && (
              <Stack gap="sm" align="center">
                <Text size="sm" c="dimmed">{t("onboarding.vuelveAIntentarloMasTarde")}</Text>
              </Stack>
            )}
          </Paper>
        </Container>
      );
    }

    return (
      <Container py="xl" size="sm">
        <Box mb="xl" ta="center">
          {workspaceInfo.logo_url ? (
            <Group justify="center" mb="sm">
              <Avatar src={workspaceInfo.logo_url} size={64} radius="md" alt={workspaceInfo.name} />
            </Group>
          ) : null}
          <Title mb="xs" order={2} style={{ color: "var(--nv-primary)" }}>
            {workspaceInfo.name}
          </Title>
          <Text c="dimmed">
            {t("onboarding.registrateParaAccederATu")}
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
                productInfo.interval === "year" ? t("clientOnboardingPage.año") : "mes"
              }</Text>}
            </Text>
          </Box>

          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={t("onboarding.nombre")}
                placeholder={t("onboarding.tuNombre")}
                required
                {...form.getInputProps("firstName")}
              />
              <TextInput
                label={t("onboarding.apellidos")}
                placeholder={t("onboarding.tusApellidos")}
                required
                {...form.getInputProps("lastName")}
              />
            </SimpleGrid>
            <TextInput
              label={t("onboarding.email")}
              placeholder={t("onboarding.tuEmailCom")}
              required
              leftSection={<IconMail size={16} />}
              {...form.getInputProps("email")}
            />
            <TextInput
              label={t("onboarding.confirmaTuEmail")}
              placeholder={t("onboarding.repiteTuEmail")}
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
              label={t("onboarding.contrasena")}
              placeholder={t("onboarding.minimo8Caracteres")}
              required
              leftSection={<IconLock size={16} />}
              {...form.getInputProps("password")}
            />
            <PasswordRulesIndicator value={form.values.password} />
            <TextInput
              label={t("onboarding.movil")}
              placeholder="+34 600 000 000"
              required
              leftSection={<IconPhone size={16} />}
              description={t("onboarding.loNecesitamosParaContactartePor")}
              {...form.getInputProps("phone")}
            />

            <Divider my="xs" label={t("onboarding.datosDeFacturacion")} labelPosition="center" />
            <Text size="sm" fw={500}>
              {t("onboarding.paraRealizarTuFacturaNecesitamos")}
            </Text>
            <Radio.Group
              label={t("onboarding.tipoDeCliente")}
              required
              {...form.getInputProps("fiscalType")}
            >
              <Group mt="xs">
                <Radio value="individual" label={t("onboarding.personaFisica")} />
                <Radio value="company" label={t("onboarding.personaJuridica")} />
              </Group>
            </Radio.Group>

            {form.values.fiscalType === "individual" ? (
              <>
                <Text size="xs" c="dimmed">
                  {t("onboarding.tuNombreYApellidosDel")}
                </Text>
                <TextInput
                  label={t("onboarding.nifDniNieEtc")}
                  placeholder="12345678A"
                  required
                  {...form.getInputProps("taxId")}
                />
                <TextInput
                  label={t("onboarding.direccionCalleNumeroEtc")}
                  placeholder={t("onboarding.calleMayor123B")}
                  required
                  {...form.getInputProps("billingAddress")}
                />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label={t("onboarding.poblacion")}
                    placeholder={t("onboarding.madrid")}
                    required
                    {...form.getInputProps("billingCity")}
                  />
                  <TextInput
                    label={t("onboarding.pais")}
                    placeholder={t("onboarding.espana")}
                    required
                    {...form.getInputProps("billingCountry")}
                  />
                </SimpleGrid>
                <TextInput
                  label={t("onboarding.cpCodigoPostalZipCode")}
                  placeholder="28001"
                  required
                  {...form.getInputProps("billingPostalCode")}
                />
              </>
            ) : (
              <>
                <TextInput
                  label={t("onboarding.razonSocial")}
                  placeholder={t("onboarding.miEmpresaSL")}
                  required
                  {...form.getInputProps("legalName")}
                />
                <TextInput
                  label={t("onboarding.nifCifNrtEtc")}
                  placeholder="B12345678"
                  required
                  {...form.getInputProps("taxId")}
                />
                <TextInput
                  label={t("onboarding.direccionCalleNumeroEtc")}
                  placeholder={t("onboarding.calleMayor123B")}
                  required
                  {...form.getInputProps("billingAddress")}
                />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label={t("onboarding.ciudadOPoblacion")}
                    placeholder={t("onboarding.madrid")}
                    required
                    {...form.getInputProps("billingCity")}
                  />
                  <TextInput
                    label={t("onboarding.pais")}
                    placeholder={t("onboarding.espana")}
                    required
                    {...form.getInputProps("billingCountry")}
                  />
                </SimpleGrid>
                <TextInput
                  label={t("onboarding.cpCodigoPostalZipCode")}
                  placeholder="28001"
                  required
                  {...form.getInputProps("billingPostalCode")}
                />
              </>
            )}

            {/* Coupon Code */}
            {productInfo && productInfo.price > 0 && (
              <>
                <Divider my="xs" label={t("onboarding.tienesUnCuponDeDescuento")} labelPosition="center" />
                <Group align="flex-end" gap="xs">
                  <TextInput
                    label={t("onboarding.codigoDeCupon")}
                    placeholder={t("onboarding.ejDescuento20")}
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.currentTarget.value.toUpperCase());
                      setCouponResult(null);
                    }}
                    styles={{ input: { fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 } }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="light"
                    onClick={handleValidateCoupon}
                    loading={couponValidating}
                    disabled={!couponCode.trim()}
                  >
                    {t("onboarding.aplicar")}
                  </Button>
                </Group>
                {couponResult && (
                  <Alert
                    color={couponResult.is_valid ? "green" : "red"}
                    variant="light"
                    radius="md"
                  >
                    {couponResult.is_valid ? (
                      <Group gap="xs">
                        <IconCheck size={16} />
                        <Text size="sm" fw={500}>
                          {couponResult.message} — Descuento:{" "}
                          {couponResult.discount_type === "percentage"
                            ? `${couponResult.discount_value}%`
                            : `${couponResult.discount_value} €`}
                        </Text>
                      </Group>
                    ) : (
                      <Text size="sm">{couponResult.message}</Text>
                    )}
                  </Alert>
                )}
                {couponResult?.is_valid && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed" td="line-through">€{formatDecimal(productInfo.price, 2)}</Text>
                    <Text size="lg" fw={700} c="green">€{formatDecimal(discountedPrice, 2)}</Text>
                  </Group>
                )}
              </>
            )}

            <Divider my="xs" label={t("onboarding.consentimientos")} labelPosition="center" />

            <Checkbox
              label={
                <Text size="sm">
                  Acepto los{" "}
                  <Anchor href="#" size="sm">
                    {t("onboarding.terminosYCondiciones")}
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
                    {t("onboarding.politicaDePrivacidad")}
                  </Anchor>{" "}
                  y el tratamiento de mis datos *
                </Text>
              }
              {...form.getInputProps("acceptPrivacy", { type: "checkbox" })}
              error={form.errors.acceptPrivacy}
            />
            <Checkbox
              label={t("onboarding.deseoRecibirComunicacionesComercialesY")}
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
              {t("onboarding.continuarAlPago")}
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container py="xl" size="md">
      <Box mb="xl" ta="center">
        {workspaceInfo.logo_url ? (
          <Group justify="center" mb="sm">
            <Avatar src={workspaceInfo.logo_url} size={64} radius="md" alt={workspaceInfo.name} />
          </Group>
        ) : null}
        <Title mb="xs" order={2} style={{ color: "var(--nv-primary)" }}>
          {workspaceInfo.name}
        </Title>
        <Text c="dimmed">
          {t("onboarding.completaTuPerfilParaEmpezar")}
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
          description={t("onboarding.tuInformacionBasica")}
          icon={<IconUser size={18} />}
          label={t("onboarding.datosPersonales")}
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="lg" order={4}>
              {t("onboarding.informacionPersonal")}
            </Title>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label={t("onboarding.nombre")}
                  placeholder={t("onboarding.tuNombre")}
                  required
                  {...form.getInputProps("firstName")}
                />
                <TextInput
                  label={t("onboarding.apellidos")}
                  placeholder={t("onboarding.tusApellidos")}
                  required
                  {...form.getInputProps("lastName")}
                />
              </SimpleGrid>
              <TextInput
                label={t("onboarding.email")}
                placeholder={t("onboarding.tuEmailCom")}
                required
                leftSection={<IconMail size={16} />}
                {...form.getInputProps("email")}
              />
              <TextInput
                label={t("onboarding.confirmaTuEmail")}
                placeholder={t("onboarding.repiteTuEmail")}
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
                  label={t("onboarding.contrasena")}
                  placeholder={t("onboarding.minimo8Caracteres")}
                  required
                  leftSection={<IconLock size={16} />}
                  {...form.getInputProps("password")}
                />
                <PasswordRulesIndicator value={form.values.password} />
              </Box>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label={t("onboarding.telefono")}
                  placeholder="+34 600 000 000"
                  {...form.getInputProps("phone")}
                />
                <DatePickerInput
                  label={t("onboarding.fechaDeNacimiento")}
                  placeholder={t("onboarding.seleccionaFecha")}
                  {...form.getInputProps("birthDate")}
                />
              </SimpleGrid>
              <Select
                data={[
                  { value: "male", label: t("onboarding.masculino") },
                  { value: "female", label: t("onboarding.femenino") },
                  { value: "other", label: t("onboarding.otro") },
                  { value: "prefer_not", label: t("onboarding.prefieroNoDecir") },
                ]}
                label={t("onboarding.genero")}
                placeholder={t("onboarding.selecciona")}
                {...form.getInputProps("gender")}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <NumberInput
                  label={t("onboarding.alturaCm")}
                  placeholder="170"
                  min={100}
                  max={250}
                  {...form.getInputProps("height")}
                />
                <NumberInput
                  label={t("onboarding.pesoActualKg")}
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
          description={t("onboarding.queQuieresLograr")}
          icon={<IconTarget size={18} />}
          label={t("onboarding.objetivos")}
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="lg" order={4}>
              {t("onboarding.tusObjetivos")}
            </Title>
            <Stack gap="md">
              <Select
                data={[
                  { value: "lose_weight", label: t("onboarding.perderPeso") },
                  { value: "gain_muscle", label: t("onboarding.ganarMasaMuscular") },
                  {
                    value: "improve_fitness",
                    label: t("onboarding.mejorarCondicionFisica"),
                  },
                  { value: "maintain", label: t("onboarding.mantenerPesoActual") },
                  { value: "improve_health", label: t("onboarding.mejorarSaludGeneral") },
                  {
                    value: "sports_performance",
                    label: t("onboarding.rendimientoDeportivo"),
                  },
                  { value: "rehabilitation", label: t("onboarding.rehabilitacion") },
                ]}
                label={t("onboarding.objetivoPrincipal")}
                placeholder={t("onboarding.seleccionaTuObjetivo")}
                required
                {...form.getInputProps("primaryGoal")}
              />
              <MultiSelect
                data={[
                  { value: "flexibility", label: t("onboarding.mejorarFlexibilidad") },
                  { value: "strength", label: t("onboarding.aumentarFuerza") },
                  { value: "endurance", label: t("onboarding.mejorarResistencia") },
                  { value: "posture", label: t("onboarding.corregirPostura") },
                  { value: "stress", label: t("onboarding.reducirEstres") },
                  { value: "energy", label: t("onboarding.aumentarEnergia") },
                  { value: "sleep", label: t("onboarding.mejorarSueno") },
                ]}
                label={t("onboarding.objetivosSecundarios")}
                placeholder={t("onboarding.seleccionaTodosLosQueApliquen")}
                {...form.getInputProps("secondaryGoals")}
              />
              {(form.values.primaryGoal === "lose_weight" ||
                form.values.primaryGoal === "gain_muscle") && (
                <NumberInput
                  label={t("onboarding.pesoObjetivoKg")}
                  placeholder={t("onboarding.ej70")}
                  {...form.getInputProps("targetWeight")}
                />
              )}
              <Select
                data={[
                  {
                    value: "sedentary",
                    label: t("onboarding.sedentarioPocoONadaDe"),
                  },
                  { value: "light", label: t("onboarding.ligero12DiasSemana") },
                  { value: "moderate", label: t("onboarding.moderado34DiasSemana") },
                  { value: "active", label: t("onboarding.activo56DiasSemana") },
                  {
                    value: "very_active",
                    label: t("onboarding.muyActivoEjercicioIntensoDiario"),
                  },
                ]}
                label={t("onboarding.nivelDeActividadActual")}
                placeholder={t("onboarding.selecciona")}
                required
                {...form.getInputProps("activityLevel")}
              />
              <NumberInput
                label={t("onboarding.cuantosDiasALaSemana")}
                placeholder="3"
                min={1}
                max={7}
                {...form.getInputProps("trainingDaysPerWeek")}
              />
              <Textarea
                label={t("onboarding.cuentanosMasSobreTusObjetivos")}
                placeholder={t("onboarding.porEjemploQuieroPerder5kg")}
                minRows={3}
                {...form.getInputProps("goalsDescription")}
              />
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 3: Health */}
        <Stepper.Step
          description={t("onboarding.informacionMedica")}
          icon={<IconHeartbeat size={18} />}
          label={t("onboarding.salud")}
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="lg" order={4}>
              {t("onboarding.historialDeSalud")}
            </Title>
            <Stack gap="md">
              <MultiSelect
                label={t("onboarding.tienesAlgunaAlergiaAlimentaria")}
                placeholder={t("onboarding.seleccionaSiAplica")}
                data={ALLERGENS}
                searchable
                clearable
                {...form.getInputProps("allergies")}
              />
              <MultiSelect
                label={t("onboarding.tienesAlgunaIntoleranciaAlimentaria")}
                placeholder={t("onboarding.seleccionaSiAplica")}
                data={INTOLERANCES}
                searchable
                clearable
                {...form.getInputProps("intolerances")}
              />
              <Divider my="sm" />
              <Checkbox
                label={t("onboarding.tienesAlgunaLesionActualO")}
                {...form.getInputProps("hasInjuries", { type: "checkbox" })}
              />
              {form.values.hasInjuries && (
                <Textarea
                  label={t("onboarding.describeTusLesiones")}
                  placeholder={t("onboarding.ejLesionDeRodillaHace")}
                  {...form.getInputProps("injuries")}
                />
              )}
              <Checkbox
                label={t("onboarding.tienesAlgunaCondicionMedica")}
                {...form.getInputProps("hasMedicalConditions", {
                  type: "checkbox",
                })}
              />
              {form.values.hasMedicalConditions && (
                <Textarea
                  label={t("onboarding.describeTusCondicionesMedicas")}
                  placeholder={t("onboarding.ejDiabetesTipo2Hipertension")}
                  {...form.getInputProps("medicalConditions")}
                />
              )}
              <Textarea
                label={t("onboarding.medicamentosActuales")}
                placeholder={t("onboarding.listaLosMedicamentosQueTomas")}
                {...form.getInputProps("medications")}
              />
              <Paper p="md" radius="md" withBorder>
                <Group justify="space-between" align="center">
                  <Box>
                    <Text fw={600} size="sm">{t("onboarding.fotoInicialDeProgreso")}</Text>
                    <Text c="dimmed" size="xs">
                      {t("onboarding.opcionalPuedesSubirUnaFoto")}
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
                        {progressPhoto ? t("clientOnboardingPage.cambiarFoto") : t("clientOnboardingPage.subirFoto")}
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
          description={t("onboarding.cuestionarioDeAptitud")}
          icon={<IconFileText size={18} />}
          label="PAR-Q"
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="xs" order={4}>
              {t("onboarding.cuestionarioParQ")}
            </Title>
            <Text c="dimmed" mb="lg" size="sm">
              {t("onboarding.porFavorRespondeEstasPreguntas")}
            </Text>
            <Stack gap="md">
              <Radio.Group
                label={t("onboarding.1AlgunaVezUnMedico")}
                {...form.getInputProps("parqResponses.heartCondition")}
              >
                <Group mt="xs">
                  <Radio label={t("onboarding.si")} value="true" />
                  <Radio label={t("onboarding.no")} value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.heartCondition === "true" && (
                <Textarea
                  label={t("onboarding.describeLaCondicionCardiaca")}
                  placeholder={t("onboarding.ejArritmiaInsuficienciaCardiacaMarcapasos")}
                  minRows={2}
                  {...form.getInputProps("parqResponses.heartConditionDetails")}
                />
              )}

              <Radio.Group
                label={t("onboarding.2SientesDolorEnEl")}
                {...form.getInputProps("parqResponses.chestPain")}
              >
                <Group mt="xs">
                  <Radio label={t("onboarding.si")} value="true" />
                  <Radio label={t("onboarding.no")} value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.chestPain === "true" && (
                <Textarea
                  label={t("onboarding.describeElTipoDeDolor")}
                  placeholder={t("onboarding.ejDolorPunzanteAlCorrer")}
                  minRows={2}
                  {...form.getInputProps("parqResponses.chestPainDetails")}
                />
              )}

              <Radio.Group
                label={t("onboarding.3HasExperimentadoMareosO")}
                {...form.getInputProps("parqResponses.dizziness")}
              >
                <Group mt="xs">
                  <Radio label={t("onboarding.si")} value="true" />
                  <Radio label={t("onboarding.no")} value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.dizziness === "true" && (
                <Textarea
                  label={t("onboarding.describeLaFrecuenciaYCircunstancias")}
                  placeholder={t("onboarding.ejMeMareoAlLevantarme")}
                  minRows={2}
                  {...form.getInputProps("parqResponses.dizzinessDetails")}
                />
              )}

              <Radio.Group
                label={t("onboarding.4TienesAlgunProblemaOseo")}
                {...form.getInputProps("parqResponses.boneJoint")}
              >
                <Group mt="xs">
                  <Radio label={t("onboarding.si")} value="true" />
                  <Radio label={t("onboarding.no")} value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.boneJoint === "true" && (
                <Textarea
                  label={t("onboarding.describeTusLimitacionesFisicas")}
                  placeholder={t("onboarding.ejNoPuedoDoblarLa")}
                  minRows={2}
                  {...form.getInputProps("parqResponses.boneJointDetails")}
                />
              )}

              <Radio.Group
                label={t("onboarding.5TomasActualmenteMedicamentosPara")}
                {...form.getInputProps("parqResponses.bloodPressure")}
              >
                <Group mt="xs">
                  <Radio label={t("onboarding.si")} value="true" />
                  <Radio label={t("onboarding.no")} value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.bloodPressure === "true" && (
                <Textarea
                  label={t("onboarding.listaLosMedicamentosQueTomas")}
                  placeholder={t("onboarding.ejEnalapril10mgLosartan50mg")}
                  minRows={2}
                  {...form.getInputProps("parqResponses.bloodPressureDetails")}
                />
              )}

              <Radio.Group
                label={t("onboarding.6ConocesAlgunaOtraRazon")}
                {...form.getInputProps("parqResponses.otherReason")}
              >
                <Group mt="xs">
                  <Radio label={t("onboarding.si")} value="true" />
                  <Radio label={t("onboarding.no")} value="false" />
                </Group>
              </Radio.Group>

              {form.values.parqResponses.otherReason === "true" && (
                <Textarea
                  label={t("onboarding.explicaElMotivo")}
                  placeholder={t("onboarding.describeLaRazonPorLa")}
                  minRows={2}
                  {...form.getInputProps("parqResponses.otherReasonDetails")}
                />
              )}

              {hasParqRisk && (
                <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                  {t("onboarding.hasRespondidoSiAUna")}
                </Alert>
              )}
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 5: Consent */}
        <Stepper.Step
          description={t("onboarding.terminosYPrivacidad")}
          icon={<IconCheck size={18} />}
          label={t("onboarding.consentimiento")}
        >
          <Paper mt="xl" p="xl" radius="md" withBorder>
            <Title mb="lg" order={4}>
              {t("onboarding.consentimientos")}
            </Title>
            <Stack gap="md">
              <Checkbox
                label={
                  <Text size="sm">
                    Acepto los{" "}
                    <Text c="blue" component="a" href="#" inherit>
                      {t("onboarding.terminosYCondiciones")}
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
                      {t("onboarding.politicaDePrivacidad")}
                    </Text>{" "}
                    y el tratamiento de mis datos *
                  </Text>
                }
                {...form.getInputProps("acceptPrivacy", { type: "checkbox" })}
                error={form.errors.acceptPrivacy}
              />
              <Divider />
              <Checkbox
                label={t("onboarding.deseoRecibirComunicacionesComercialesY")}
                {...form.getInputProps("acceptMarketing", { type: "checkbox" })}
              />
            </Stack>
          </Paper>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button disabled={active === 0 || loading} onClick={prevStep} variant="default">
          {t("onboarding.anterior")}
        </Button>
        <Button onClick={nextStep} loading={loading}>
          {active === 4 ? "Completar Registro" : "Siguiente"}
        </Button>
      </Group>
    </Container>
  );
}
