import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Radio,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCalendarDollar,
  IconCreditCard,
  IconLock,
  IconMail,
  IconPhone,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api, redsysApi, sequraApi } from "../../services/api";
import { useAuthStore } from "../../stores/auth";
import { formatDecimal } from "../../utils/format";
import { sanitizeHtml } from "../../utils/safeHtml";

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
  // Datos públicos de soporte (Settings → Workspace → Soporte) que se
  // muestran al cliente en la pantalla post-pago si no recibe el email.
  support_phone?: string | null;
  support_email?: string | null;
  // Si es ``true``, la invitación trae móvil + contraseña + consentimientos
  // pre-rellenados (flujo público de producto). Tras el pago la pantalla
  // completa el registro automáticamente sin pedir un segundo formulario.
  data_complete?: boolean;
}

interface OnboardingFormData {
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  password: string;
  phone: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

const PHONE_REGEX = /^[+]?[\d\s().-]{6,}$/;

export function InvitationOnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setTokens } = useAuthStore();
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
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const paymentParam = searchParams.get("payment");
  const gatewayParam = searchParams.get("gateway");
  const dsSignatureVersion = searchParams.get("Ds_SignatureVersion");
  const dsMerchantParameters = searchParams.get("Ds_MerchantParameters");
  const dsSignature = searchParams.get("Ds_Signature");

  const checkPaymentStatus = useCallback(async () => {
    if (!token) return;
    setCheckingPayment(true);
    try {
      if (gatewayParam === "sequra") {
        const res = await sequraApi.getOnboardingPaymentStatus(token);
        if (res.data.payment_completed) {
          setPaymentCompleted(true);
          setPaymentRequired(false);
        } else if (res.data.status === "failed") {
          setPaymentError("El pago con SeQura no se ha completado. Puedes intentarlo de nuevo.");
        } else {
          let attempts = 0;
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = setInterval(async () => {
            attempts++;
            try {
              const pollRes = await sequraApi.getOnboardingPaymentStatus(token);
              if (pollRes.data.payment_completed) {
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
                setPaymentCompleted(true);
                setPaymentRequired(false);
                setCheckingPayment(false);
              } else if (attempts >= 10) {
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
                setCheckingPayment(false);
              }
            } catch {
              if (attempts >= 10) {
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
                setCheckingPayment(false);
              }
            }
          }, 2000);
          return;
        }
      } else {
        if (dsSignatureVersion && dsMerchantParameters && dsSignature) {
          try {
            await redsysApi.confirmReturn({
              Ds_SignatureVersion: dsSignatureVersion,
              Ds_MerchantParameters: dsMerchantParameters,
              Ds_Signature: dsSignature,
            });
          } catch {
            // ignore
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
      // ignore
    } finally {
      setCheckingPayment(false);
    }
  }, [token, gatewayParam, dsSignatureVersion, dsMerchantParameters, dsSignature]);

  // Validar invitación
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
          form.setValues({
            ...form.values,
            email: response.data.email || "",
            confirmEmail: response.data.email || "",
            firstName: response.data.first_name || "",
            lastName: response.data.last_name || "",
          });

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

  useEffect(() => {
    if (paymentParam === "success" && !paymentCompleted) {
      checkPaymentStatus();
    } else if (paymentParam === "error") {
      setPaymentError("El pago no se ha completado. Puedes intentarlo de nuevo.");
    }
  }, [paymentParam, paymentCompleted, checkPaymentStatus]);

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

  const handleStartSequraPayment = async () => {
    if (!token) return;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await sequraApi.startOnboarding(token, "pp6");
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

  const SEQURA_ALLOWED_DOMAINS = ["sequrapi.com", "sequra.es"];

  const isAllowedScriptSrc = (src: string): boolean => {
    try {
      const url = new URL(src, window.location.origin);
      return SEQURA_ALLOWED_DOMAINS.some(
        (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!showSequraForm || !sequraFormHtml || !sequraFormRef.current) return;

    const container = sequraFormRef.current;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = sequraFormHtml;

    let formElementId = "";
    let dynamicScriptSrc = "";

    const scriptElements = tempDiv.querySelectorAll("script");
    scriptElements.forEach((script) => {
      const text = script.textContent || "";

      const elementMatch = text.match(/window\.SequraFormElement\s*=\s*['"]([^'"]+)['"]/);
      if (elementMatch) {
        formElementId = elementMatch[1];
      }

      const srcMatch = text.match(/e\.setAttribute\s*\(\s*['"]src['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
      if (srcMatch && isAllowedScriptSrc(srcMatch[1])) {
        dynamicScriptSrc = srcMatch[1];
      }

      if (script.src && isAllowedScriptSrc(script.src)) {
        dynamicScriptSrc = dynamicScriptSrc || script.src;
      }

      script.remove();
    });

    tempDiv.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith("on") && attr.name.length > 2) {
          el.removeAttribute(attr.name);
        }
      });
    });

    container.innerHTML = tempDiv.innerHTML;

    if (formElementId) {
      (window as any).SequraFormElement = formElementId;
    }

    if (dynamicScriptSrc) {
      const newScript = document.createElement("script");
      newScript.src = dynamicScriptSrc;
      container.appendChild(newScript);
    }

    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = setInterval(() => {
      attempts++;
      if ((window as any).SequraFormInstance) {
        clearInterval(pollInterval);
        (window as any).SequraFormInstance.setCloseCallback(() => {
          setShowSequraForm(false);
          setSequraFormHtml(null);
        });
        (window as any).SequraFormInstance.show();
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [showSequraForm, sequraFormHtml]);

  useEffect(() => {
    if (!sequraAvailable || selectedPaymentMethod !== "sequra" || !sequraAssetKey || !sequraMerchant || !sequraScriptUri) return;

    if ((window as any).SequraConfiguration) {
      if ((window as any).Sequra?.refreshComponents) {
        (window as any).Sequra.refreshComponents();
      }
      return;
    }

    const sequraConfigParams = {
      merchant: sequraMerchant,
      assetKey: sequraAssetKey,
      products: ["pp6"],
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

    (window as any).Sequra.onLoad(() => {
      if ((window as any).Sequra?.refreshComponents) {
        (window as any).Sequra.refreshComponents();
      }
    });
  }, [sequraAvailable, selectedPaymentMethod, sequraAssetKey, sequraMerchant, sequraScriptUri, sequraMethods]);

  useEffect(() => {
    if (selectedPaymentMethod === "sequra" && (window as any).Sequra?.refreshComponents) {
      setTimeout(() => {
        (window as any).Sequra.refreshComponents();
      }, 300);
    }
  }, [selectedPaymentMethod]);

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
      confirmEmail: "",
      password: "",
      phone: "",
      acceptTerms: false,
      acceptPrivacy: false,
      acceptMarketing: false,
    },
    validate: (values) => {
      const emailPrefilled = !!invitationData?.email;
      return {
        firstName: values.firstName.trim().length < 2 ? "Nombre requerido" : null,
        lastName: values.lastName.trim().length < 2 ? "Apellido requerido" : null,
        email: /^\S+@\S+\.\S+$/.test(values.email) ? null : "Email inválido",
        confirmEmail: emailPrefilled
          ? null
          : values.confirmEmail !== values.email
            ? "Los emails no coinciden"
            : null,
        password: values.password.length < 8 ? "Mínimo 8 caracteres" : null,
        phone: PHONE_REGEX.test(values.phone.trim()) ? null : "Teléfono móvil obligatorio",
        acceptTerms: values.acceptTerms ? null : "Debes aceptar los términos",
        acceptPrivacy: values.acceptPrivacy ? null : "Debes aceptar la política de privacidad",
      };
    },
  });

  const handleSubmit = async () => {
    if (!invitationData || !token) return;
    if (loading || completed) return;
    if (form.validate().hasErrors) return;

    setLoading(true);
    try {
      const values = form.values;
      const response = await api.post(
        `/invitations/complete/${token}`,
        {
          email: values.email,
          password: values.password,
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          phone: values.phone.trim(),
          // Ya no enviamos health_data desde el onboarding: el cliente
          // rellenará el "Cuestionario Inicial Trackfiz" más adelante
          // siguiendo el enlace del email de bienvenida.
          consents: {
            data_processing: values.acceptTerms,
            health_data: values.acceptPrivacy,
            marketing: values.acceptMarketing,
            consent_date: new Date().toISOString(),
          },
        },
        { timeout: 90_000 },
      );

      if (response.data?.access_token && response.data.access_token !== "pending_email_confirmation") {
        setUser({
          id: response.data.user?.id,
          email: values.email,
          full_name: `${values.firstName.trim()} ${values.lastName.trim()}`,
          is_active: true,
        });
        setTokens(response.data.access_token, response.data.refresh_token);
      }

      setCompleted(true);
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

  // Auto-complete tras el pago cuando la invitación trae los datos
  // pre-rellenados (flujo público de producto). El cliente ya nos dio
  // móvil + contraseña + consentimientos antes del pago, así que tras
  // confirmar el pago no debe rellenar otra vez nada: simplemente
  // ejecutamos /invitations/complete con un body vacío y el backend
  // reutiliza los valores guardados en la invitación.
  const autoCompletedRef = useRef(false);
  useEffect(() => {
    if (autoCompletedRef.current) return;
    if (!invitationData?.data_complete) return;
    if (!paymentCompleted) return;
    if (completed || loading) return;
    if (!token) return;

    autoCompletedRef.current = true;
    setLoading(true);
    (async () => {
      try {
        const response = await api.post(
          `/invitations/complete/${token}`,
          {},
          { timeout: 90_000 },
        );
        if (response.data?.access_token && response.data.access_token !== "pending_email_confirmation") {
          setUser({
            id: response.data.user?.id,
            email: invitationData?.email || "",
            full_name: `${invitationData?.first_name || ""} ${invitationData?.last_name || ""}`.trim(),
            is_active: true,
          });
          setTokens(response.data.access_token, response.data.refresh_token);
        }
        setCompleted(true);
      } catch (error: unknown) {
        autoCompletedRef.current = false;
        const err = error as { response?: { data?: { detail?: string } }; message?: string };
        notifications.show({
          title: "Error",
          message: err.response?.data?.detail || err.message || "Error al completar el registro",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [invitationData, paymentCompleted, completed, loading, token, setUser, setTokens]);

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
          <ThemeIcon color="red" mb="lg" mx="auto" radius="xl" size={80} variant="light">
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

  // ── Pantalla post-pago / post-registro ────────────────────────────
  if (completed) {
    const supportPhone = invitationData.support_phone || null;
    const supportEmail = invitationData.support_email || null;
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <ThemeIcon color="green" mb="lg" mx="auto" radius="xl" size={80} variant="light">
            <IconMail size={40} />
          </ThemeIcon>
          <Title mb="sm" order={2}>
            ¡Pago completado!
          </Title>
          <Text mb="md">
            Te ha llegado un <strong>email de bienvenida</strong> a tu correo.
          </Text>
          <Text c="dimmed" mb="xl">
            Ábrelo y sigue desde ahí para continuar con tu primer cuestionario.
            Es el siguiente paso para que tu entrenador pueda diseñarte un plan a medida.
          </Text>

          {(supportPhone || supportEmail) && (
            <Paper p="md" radius="md" withBorder mb="lg" style={{ background: "rgba(45,106,79,0.04)" }}>
              <Text fw={600} size="sm" mb={6}>
                Si no recibes tu email o tienes algún problema
              </Text>
              <Text c="dimmed" size="sm" mb="xs">
                Los datos de contacto de soporte son:
              </Text>
              <Stack gap={4} align="center">
                {supportPhone && (
                  <Group gap="xs" justify="center">
                    <IconPhone size={14} />
                    <Anchor href={`tel:${supportPhone}`} size="sm">
                      {supportPhone}
                    </Anchor>
                  </Group>
                )}
                {supportEmail && (
                  <Group gap="xs" justify="center">
                    <IconMail size={14} />
                    <Anchor href={`mailto:${supportEmail}`} size="sm">
                      {supportEmail}
                    </Anchor>
                  </Group>
                )}
              </Stack>
            </Paper>
          )}

          <Button size="lg" onClick={() => navigate("/login")}>Ir a iniciar sesión</Button>
        </Paper>
      </Container>
    );
  }

  // ── Gate de pago ──────────────────────────────────────────────────
  if (paymentRequired && !paymentCompleted) {
    const product = invitationData.product!;
    const intervalLabel = product.interval === "week" ? "/semana" :
      product.interval === "biweekly" ? "/quincenal" :
      product.interval === "month" ? "/mes" :
      product.interval === "quarter" ? "/trimestre" :
      product.interval === "semester" ? "/semestre" :
      product.interval === "year" ? "/año" : "";

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
              <Stack align="center" gap="md">
                <div style={{ textAlign: "center" }}>
                  <Title order={3} mb="xs">{product.name}</Title>
                  {product.description && (
                    <Box
                      c="dimmed"
                      fz="sm"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                    />
                  )}
                </div>

                <Paper p="lg" radius="md" withBorder w="100%" style={{ background: "rgba(45, 106, 79, 0.03)" }}>
                  <Group justify="center" gap="xs">
                    <Title order={1} style={{ fontSize: "2.5rem" }}>
                      {formatDecimal(product.price, 2)}€
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

              <Stack gap="sm">
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
                    <Text fw={700} size="lg">{formatDecimal(product.price, 2)}€</Text>
                  </Group>
                </Paper>

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

                    {selectedPaymentMethod === "sequra" && sequraAssetKey && (
                      <Box mt="sm" ml={58}>
                        <div
                          className="sequra-promotion-widget"
                          data-amount={String(Math.round(product.price * 100))}
                          data-product="pp6"
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

  // Si la invitación viene del flujo público con datos pre-rellenados y
  // el pago acaba de completarse (o el producto era gratis y ya
  // saltamos la pasarela), enseñamos un loader mientras el useEffect de
  // auto-complete trabaja, en lugar del formulario completo.
  if (invitationData.data_complete) {
    return (
      <Container py="xl" size="sm">
        <Paper p="xl" radius="lg" ta="center" withBorder>
          <Loader size="lg" />
          <Text c="dimmed" mt="md">
            Estamos finalizando tu registro y enviándote el email de bienvenida...
          </Text>
        </Paper>
      </Container>
    );
  }

  // ── Formulario de registro reducido (un único paso) ───────────────
  return (
    <Container py="xl" size="sm">
      <Box mb="xl" ta="center">
        <Title mb="xs" order={2}>
          {invitationData.workspace_name}
        </Title>
        <Text c="dimmed">
          Crea tu cuenta para empezar tu transformación
        </Text>
        {invitationData.message && (
          <Paper p="md" mt="md" radius="md" withBorder style={{ background: "rgba(45, 106, 79, 0.05)" }}>
            <Text size="sm" c="dimmed" fs="italic">
              "{invitationData.message}"
            </Text>
          </Paper>
        )}
      </Box>

      <Paper p="xl" radius="lg" withBorder>
        <Group mb="lg" gap="sm">
          <ThemeIcon color="teal" radius="xl" size={36} variant="light">
            <IconUser size={18} />
          </ThemeIcon>
          <Title order={4}>Información personal</Title>
        </Group>

        <Stack gap="md">
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
          <TextInput
            label="Email"
            placeholder="tu@email.com"
            required
            disabled={!!invitationData.email}
            leftSection={<IconMail size={16} />}
            {...form.getInputProps("email")}
          />
          {!invitationData.email && (
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
          )}
          <PasswordInput
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            required
            leftSection={<IconLock size={16} />}
            {...form.getInputProps("password")}
          />
          <TextInput
            label="Móvil"
            placeholder="+34 600 000 000"
            required
            leftSection={<IconPhone size={16} />}
            description="Lo necesitamos para contactarte por WhatsApp"
            {...form.getInputProps("phone")}
          />

          <Divider my="sm" label="Consentimientos" labelPosition="center" />

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
                y el tratamiento de mis datos de salud *
              </Text>
            }
            {...form.getInputProps("acceptPrivacy", { type: "checkbox" })}
            error={form.errors.acceptPrivacy}
          />
          <Checkbox
            label="Deseo recibir comunicaciones comerciales y novedades (opcional)"
            {...form.getInputProps("acceptMarketing", { type: "checkbox" })}
          />
        </Stack>
      </Paper>

      <Group justify="flex-end" mt="xl">
        <Button onClick={handleSubmit} loading={loading} size="lg">
          Completar registro
        </Button>
      </Group>
    </Container>
  );
}
