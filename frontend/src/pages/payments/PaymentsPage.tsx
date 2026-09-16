import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  CopyButton,
  Container,
  Divider,
  Group,
  Menu,
  NumberInput,
  PasswordInput,
  RingProgress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconArrowUpRight,
  IconCash,
  IconCheck,
  IconClock,
  IconCopy,
  IconCreditCard,
  IconDotsVertical,
  IconDownload,
  IconEdit,
  IconEye,
  IconFileInvoice,
  IconFilter,
  IconLink,
  IconLock,
  IconMail,
  IconPackage,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconSettings,
  IconShieldCheck,
  IconTrash,
  IconTrendingUp,
  IconUpload,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { openConfirm, openDangerConfirm } from "../../utils/confirmModal";
import { PageHeader } from "../../components/common/PageHeader";
import {
  usePayments,
  useSubscriptions,
  useProducts,
  usePaymentKPIs,
  useStripeStatus,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useToggleProductActive,
  useCreatePayment,
  useMarkPaymentPaid,
  useDeletePayment,
  useCancelSubscription,
  type Payment,
  type Subscription,
  type Product,
} from "../../hooks/usePayments";
import {
  useInvoices,
  useInvoiceStats,
  useInvoiceSettings,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useFinalizeInvoice,
  useMarkInvoicePaid,
  useSendInvoiceEmail,
  useDuplicateInvoice,
  useCreateRectificative,
  useUpdateInvoiceSettings,
  useInvoiceAuditLog,
  useNextInvoiceNumber,
  useTestVerifactu,
  useCertificateStatus,
  useUploadCertificate,
  useRevokeCertificate,
  type Invoice,
  type VeriFactuTestResult,
} from "../../hooks/useInvoices";
import { erpApi } from "../../services/api";
import { useClients } from "../../hooks/useClients";
import { useAuthStore } from "../../stores/auth";
import { formatDecimal } from "../../utils/format";
import { BottomSheet } from "../../components/common/BottomSheet";
import { useTranslation } from "react-i18next";

export function PaymentsPage() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [
    productModalOpened,
    { open: openProductModal, close: closeProductModal },
  ] = useDisclosure(false);
  const [
    chargeModalOpened,
    { open: openChargeModal, close: closeChargeModal },
  ] = useDisclosure(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [
    paymentDetailOpened,
    { open: openPaymentDetail, close: closePaymentDetail },
  ] = useDisclosure(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const { currentWorkspace } = useAuthStore();

  // Invoice state
  const [invoiceModalOpened, { open: openInvoiceModal, close: closeInvoiceModal }] = useDisclosure(false);
  const [invoicePreviewOpened, { open: openInvoicePreview, close: closeInvoicePreview }] = useDisclosure(false);
  const [settingsModalOpened, { open: openSettingsModal, close: closeSettingsModal }] = useDisclosure(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string | null>(null);

  // Fetch real data
  const { data: payments = [] } = usePayments();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: products = [] } = useProducts();
  const { data: kpisData } = usePaymentKPIs();
  useStripeStatus();
  const { data: clientsData } = useClients({ page: 1 });

  // Invoice data
  const { data: invoices = [] } = useInvoices(invoiceStatusFilter ? { status: invoiceStatusFilter } : undefined);
  const { data: invoiceStatsData } = useInvoiceStats();
  const { data: invoiceSettingsData } = useInvoiceSettings();
  const { data: auditLog = [] } = useInvoiceAuditLog(previewInvoice?.id || null);

  // Invoice mutations
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const finalizeInvoice = useFinalizeInvoice();
  const markInvoicePaid = useMarkInvoicePaid();
  const sendInvoiceEmail = useSendInvoiceEmail();
  const duplicateInvoice = useDuplicateInvoice();
  const createRectificative = useCreateRectificative();
  const updateInvoiceSettings = useUpdateInvoiceSettings();
  const testVerifactu = useTestVerifactu();
  const [verifactuTestResult, setVerifactuTestResult] = useState<VeriFactuTestResult | null>(null);

  // Certificate
  const { data: certStatus } = useCertificateStatus();
  const uploadCertificate = useUploadCertificate();
  const revokeCertificate = useRevokeCertificate();
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // Mutations
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const toggleProductActive = useToggleProductActive();
  const createPayment = useCreatePayment();
  const markPaymentPaid = useMarkPaymentPaid();
  const deletePayment = useDeletePayment();
  const cancelSubscription = useCancelSubscription();

  const productForm = useForm({
    initialValues: {
      name: "",
      description: "",
      price: 0,
      type: "subscription",
      interval: "month",
      sessions_included: 0,
    },
    validate: {
      name: (value) => (value.length < 2 ? "Nombre requerido" : null),
      price: (value) => (value < 0 ? "Precio no puede ser negativo" : null),
    },
  });

  const chargeForm = useForm({
    initialValues: {
      client_id: "",
      product_id: "",
      amount: 0,
      description: "",
    },
  });

  const invoiceForm = useForm({
    initialValues: {
      invoice_series: "F",
      invoice_type: "F1",
      client_id: "",
      client_name: "",
      client_tax_id: "",
      client_address: "",
      client_city: "",
      client_postal_code: "",
      client_email: "",
      issue_date: new Date(),
      due_date: null as Date | null,
      tax_rate: 21,
      tax_name: "IVA",
      discount_type: "percentage",
      discount_value: 0,
      notes: "",
      internal_notes: "",
      payment_method: "transferencia",
      items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 21, tax_name: "IVA", discount_type: "percentage", discount_value: 0 }] as Array<{
        description: string; quantity: number; unit_price: number; tax_rate: number | null; tax_name: string | null; discount_type: string; discount_value: number;
      }>,
    },
    validate: {
      client_name: (v) => (!v ? "Nombre del cliente requerido" : null),
      items: {
        description: (v) => (!v ? "Descripción requerida" : null),
        unit_price: (v) => (v <= 0 ? "Precio requerido" : null),
      },
    },
  });

  const { data: nextNumberData } = useNextInvoiceNumber(invoiceForm.values.invoice_series);

  const settingsForm = useForm({
    initialValues: {
      business_name: "",
      tax_id: "",
      nif_type: "NIF",
      address: "",
      city: "",
      postal_code: "",
      province: "",
      country: "España",
      phone: "",
      email: "",
      invoice_prefix: "F",
      rectificative_prefix: "R",
      default_tax_rate: 21,
      default_tax_name: "IVA",
      payment_terms_days: 30,
      default_payment_method: "transferencia",
      bank_account: "",
      bank_name: "",
      footer_text: "",
      terms_and_conditions: "",
      verifactu_enabled: false,
      verifactu_mode: "none",
      software_company_name: "",
      software_company_nif: "",
      software_name: "E13Fitness",
      software_id: "EF",
      software_version: "1.0",
      software_install_number: "00001",
    },
  });

  // Invoice line item calculations
  const invoiceLineTotals = useMemo(() => {
    const items = invoiceForm.values.items;
    let subtotal = 0;
    let taxTotal = 0;
    const taxBreakdown: Record<string, { base: number; tax: number }> = {};

    for (const item of items) {
      const lineSubtotal = item.quantity * item.unit_price;
      let discount = 0;
      if (item.discount_type === "percentage") {
        discount = lineSubtotal * (item.discount_value / 100);
      } else {
        discount = item.discount_value;
      }
      const base = lineSubtotal - discount;
      const rate = item.tax_rate ?? 21;
      const tax = base * (rate / 100);
      subtotal += base;
      taxTotal += tax;

      const key = `${rate}%`;
      if (!taxBreakdown[key]) taxBreakdown[key] = { base: 0, tax: 0 };
      taxBreakdown[key].base += base;
      taxBreakdown[key].tax += tax;
    }

    const globalDisc = invoiceForm.values.discount_type === "percentage"
      ? subtotal * (invoiceForm.values.discount_value / 100)
      : invoiceForm.values.discount_value;
    const total = subtotal + taxTotal - globalDisc;

    return { subtotal, taxTotal, globalDisc, total, taxBreakdown };
  }, [invoiceForm.values.items, invoiceForm.values.discount_type, invoiceForm.values.discount_value]);

  // Invoice handlers
  const handleOpenNewInvoice = useCallback(() => {
    setEditingInvoice(null);
    invoiceForm.reset();
    if (invoiceSettingsData) {
      invoiceForm.setFieldValue("tax_rate", invoiceSettingsData.default_tax_rate);
      invoiceForm.setFieldValue("payment_method", invoiceSettingsData.default_payment_method);
    }
    openInvoiceModal();
  }, [invoiceForm, invoiceSettingsData, openInvoiceModal]);

  const handleOpenEditInvoice = useCallback((inv: Invoice) => {
    setEditingInvoice(inv);
    invoiceForm.setValues({
      invoice_series: inv.invoice_series || "F",
      invoice_type: inv.invoice_type || "F1",
      client_id: inv.client_id || "",
      client_name: inv.client_name,
      client_tax_id: inv.client_tax_id || "",
      client_address: inv.client_address || "",
      client_city: inv.client_city || "",
      client_postal_code: inv.client_postal_code || "",
      client_email: inv.client_email || "",
      issue_date: inv.issue_date ? new Date(inv.issue_date) : new Date(),
      due_date: inv.due_date ? new Date(inv.due_date) : null,
      tax_rate: inv.tax_rate,
      tax_name: inv.tax_name,
      discount_type: inv.discount_type,
      discount_value: inv.discount_value,
      notes: inv.notes || "",
      internal_notes: inv.internal_notes || "",
      payment_method: inv.payment_method || "",
      items: inv.items.length > 0
        ? inv.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate,
            tax_name: it.tax_name || null,
            discount_type: it.discount_type,
            discount_value: it.discount_value,
          }))
        : [{ description: "", quantity: 1, unit_price: 0, tax_rate: 21, tax_name: "IVA", discount_type: "percentage", discount_value: 0 }],
    });
    openInvoiceModal();
  }, [invoiceForm, openInvoiceModal]);

  const handleSaveInvoice = useCallback(async (values: typeof invoiceForm.values) => {
    const payload = {
      ...values,
      issue_date: values.issue_date ? values.issue_date.toISOString().split("T")[0] : undefined,
      due_date: values.due_date ? values.due_date.toISOString().split("T")[0] : undefined,
      client_id: values.client_id || undefined,
    };
    try {
      if (editingInvoice) {
        await updateInvoice.mutateAsync({ id: editingInvoice.id, data: payload });
      } else {
        await createInvoice.mutateAsync(payload);
      }
      closeInvoiceModal();
      invoiceForm.reset();
      setEditingInvoice(null);
    } catch { /* handled by mutation */ }
  }, [editingInvoice, updateInvoice, createInvoice, closeInvoiceModal, invoiceForm]);

  const handleViewInvoice = useCallback((inv: Invoice) => {
    setPreviewInvoice(inv);
    openInvoicePreview();
  }, [openInvoicePreview]);

  const handleFinalizeInvoice = useCallback((inv: Invoice) => {
    openConfirm({
      title: t("payments.finalizarFactura"),
      message: `¿Finalizar la factura ${inv.invoice_number}? Una vez emitida no se podrá editar.`,
      confirmLabel: "Finalizar",
      color: "blue",
      onConfirm: async () => { try { await finalizeInvoice.mutateAsync(inv.id); } catch { /* handled */ } },
    });
  }, [finalizeInvoice]);

  const handleMarkInvoicePaid = useCallback((inv: Invoice) => {
    openConfirm({
      title: t("payments.marcarComoPagada"),
      message: `¿Marcar como pagada la factura ${inv.invoice_number} (${formatDecimal(Number(inv.total), 2)} €)?`,
      confirmLabel: "Marcar pagada",
      color: "green",
      onConfirm: async () => { try { await markInvoicePaid.mutateAsync({ id: inv.id }); } catch { /* handled */ } },
    });
  }, [markInvoicePaid]);

  const handleDeleteInvoice = useCallback((inv: Invoice) => {
    openDangerConfirm({
      title: t("payments.eliminarFactura"),
      message: `¿Eliminar la factura en borrador ${inv.invoice_number}?`,
      onConfirm: async () => { try { await deleteInvoice.mutateAsync(inv.id); } catch { /* handled */ } },
    });
  }, [deleteInvoice]);

  const handleDuplicateInvoice = useCallback(async (inv: Invoice) => {
    try { await duplicateInvoice.mutateAsync(inv.id); } catch { /* handled */ }
  }, [duplicateInvoice]);

  const handleRectifyInvoice = useCallback((inv: Invoice) => {
    openConfirm({
      title: t("payments.facturaRectificativa"),
      message: `¿Crear una factura rectificativa para ${inv.invoice_number}?`,
      confirmLabel: "Crear rectificativa",
      color: "orange",
      onConfirm: async () => { try { await createRectificative.mutateAsync(inv.id); } catch { /* handled */ } },
    });
  }, [createRectificative]);

  const handleSendInvoiceEmail = useCallback((inv: Invoice) => {
    if (!inv.client_email) {
      notifications.show({ title: t("payments.sinEmail"), message: t("payments.elClienteNoTieneEmail"), color: "orange" });
      return;
    }
    openConfirm({
      title: t("payments.enviarFactura"),
      message: `¿Enviar factura ${inv.invoice_number} a ${inv.client_email}?`,
      confirmLabel: "Enviar",
      color: "blue",
      onConfirm: async () => { try { await sendInvoiceEmail.mutateAsync(inv.id); } catch { /* handled */ } },
    });
  }, [sendInvoiceEmail]);

  const handleDownloadPdf = useCallback((inv: Invoice) => {
    const url = erpApi.getInvoicePdfUrl(inv.id);
    const token = useAuthStore.getState().accessToken;
    const wsId = useAuthStore.getState().currentWorkspace?.id;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Workspace-ID": wsId || "",
      },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `Factura_${inv.invoice_number}.pdf`;
        link.click();
        URL.revokeObjectURL(blobUrl);
      });
  }, []);

  const handleOpenSettings = useCallback(() => {
    if (invoiceSettingsData) {
      settingsForm.setValues({
        business_name: invoiceSettingsData.business_name || "",
        tax_id: invoiceSettingsData.tax_id || "",
        nif_type: invoiceSettingsData.nif_type || "NIF",
        address: invoiceSettingsData.address || "",
        city: invoiceSettingsData.city || "",
        postal_code: invoiceSettingsData.postal_code || "",
        province: invoiceSettingsData.province || "",
        country: invoiceSettingsData.country || "España",
        phone: invoiceSettingsData.phone || "",
        email: invoiceSettingsData.email || "",
        invoice_prefix: invoiceSettingsData.invoice_prefix || "F",
        rectificative_prefix: invoiceSettingsData.rectificative_prefix || "R",
        default_tax_rate: invoiceSettingsData.default_tax_rate || 21,
        default_tax_name: invoiceSettingsData.default_tax_name || "IVA",
        payment_terms_days: invoiceSettingsData.payment_terms_days || 30,
        default_payment_method: invoiceSettingsData.default_payment_method || "transferencia",
        bank_account: invoiceSettingsData.bank_account || "",
        bank_name: invoiceSettingsData.bank_name || "",
        footer_text: invoiceSettingsData.footer_text || "",
        terms_and_conditions: invoiceSettingsData.terms_and_conditions || "",
        verifactu_enabled: invoiceSettingsData.verifactu_enabled || false,
        verifactu_mode: invoiceSettingsData.verifactu_mode || "none",
        software_company_name: invoiceSettingsData.software_company_name || "",
        software_company_nif: invoiceSettingsData.software_company_nif || "",
        software_name: invoiceSettingsData.software_name || "E13Fitness",
        software_id: invoiceSettingsData.software_id || "EF",
        software_version: invoiceSettingsData.software_version || "1.0",
        software_install_number: invoiceSettingsData.software_install_number || "00001",
      });
    }
    openSettingsModal();
  }, [invoiceSettingsData, settingsForm, openSettingsModal]);

  const handleSaveSettings = useCallback(async (values: typeof settingsForm.values) => {
    try {
      await updateInvoiceSettings.mutateAsync(values);
      closeSettingsModal();
    } catch { /* handled */ }
  }, [updateInvoiceSettings, closeSettingsModal]);

  const handleClientSelectForInvoice = useCallback((clientId: string | null) => {
    invoiceForm.setFieldValue("client_id", clientId || "");
    if (clientId) {
      const client = (clientsData?.items || []).find((c: any) => c.id === clientId);
      if (client) {
        invoiceForm.setFieldValue("client_name", client.full_name || `${client.first_name} ${client.last_name}`);
        invoiceForm.setFieldValue("client_email", client.email || "");
      }
    }
  }, [invoiceForm, clientsData]);

  const invoiceStatusColor = (s: string) => {
    switch (s) {
      case "draft": return "gray";
      case "finalized": return "blue";
      case "sent": return "indigo";
      case "paid": return "green";
      case "overdue": return "red";
      case "cancelled": return "gray";
      case "rectified": return "orange";
      default: return "gray";
    }
  };
  const invoiceStatusLabel = (s: string) => {
    switch (s) {
      case "draft": return "Borrador";
      case "finalized": return "Emitida";
      case "sent": return "Enviada";
      case "paid": return "Pagada";
      case "overdue": return "Vencida";
      case "cancelled": return "Anulada";
      case "rectified": return "Rectificada";
      default: return s;
    }
  };

  const auditActionLabel = (a: string) => {
    const map: Record<string, string> = { created: "Creada", updated: "Editada", finalized: "Emitida", sent: "Enviada", paid: "Pagada", cancelled: "Anulada", rectified: "Rectificada", email_sent: "Email enviado", pdf_generated: "PDF generado" };
    return map[a] || a;
  };

  const handleOpenNewProduct = useCallback(() => {
    setEditingProduct(null);
    productForm.reset();
    openProductModal();
  }, [productForm, openProductModal]);

  const handleOpenEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    productForm.setValues({
      name: product.name,
      description: product.description || "",
      price: product.price,
      type: product.type,
      interval: product.interval || "month",
      sessions_included: product.sessions_included || 0,
    });
    openProductModal();
  }, [productForm, openProductModal]);

  const handleSaveProduct = useCallback(async (values: typeof productForm.values) => {
    const data = {
      name: values.name,
      description: values.description || undefined,
      price: values.price,
      product_type: values.type,
      interval: values.type === "subscription" ? values.interval : undefined,
    };
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data });
      } else {
        await createProduct.mutateAsync(data);
      }
      closeProductModal();
      productForm.reset();
      setEditingProduct(null);
    } catch {
      // Error handled by mutation
    }
  }, [editingProduct, updateProduct, createProduct, closeProductModal, productForm]);

  const handleDeleteProduct = useCallback((product: Product) => {
    openDangerConfirm({
      title: t("payments.eliminarProducto"),
      message: `¿Estás seguro de que quieres eliminar "${product.name}"?`,
      onConfirm: async () => { try { await deleteProduct.mutateAsync(product.id); } catch { /* handled */ } },
    });
  }, [deleteProduct]);

  const handleToggleActive = useCallback((product: Product) => {
    toggleProductActive.mutate({ id: product.id, is_active: !product.is_active });
  }, [toggleProductActive]);

  const handleViewPayment = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    openPaymentDetail();
  }, [openPaymentDetail]);

  const handleMarkPaid = useCallback((payment: Payment) => {
    openConfirm({
      title: t("payments.marcarComoPagado"),
      message: `¿Marcar el cobro de €${formatDecimal(Number(payment.amount), 2)} como pagado?`,
      confirmLabel: "Marcar pagado",
      color: "green",
      onConfirm: async () => { try { await markPaymentPaid.mutateAsync(payment.id); } catch { /* handled */ } },
    });
  }, [markPaymentPaid]);

  const handleDeletePaymentAction = useCallback((payment: Payment) => {
    openDangerConfirm({
      title: t("payments.eliminarCobro"),
      message: `¿Eliminar este cobro de €${formatDecimal(Number(payment.amount), 2)}?`,
      onConfirm: async () => { try { await deletePayment.mutateAsync(payment.id); } catch { /* handled */ } },
    });
  }, [deletePayment]);

  const handleCancelSubscription = useCallback((sub: Subscription) => {
    openDangerConfirm({
      title: t("payments.cancelarSuscripcion"),
      message: `¿Cancelar la suscripción "${sub.plan_name || sub.name}" de ${sub.client_name || "este cliente"}?`,
      confirmLabel: "Cancelar suscripción",
      onConfirm: async () => { try { await cancelSubscription.mutateAsync(sub.id); } catch { /* handled */ } },
    });
  }, [cancelSubscription]);

  const handleCreateCharge = useCallback(async (values: typeof chargeForm.values) => {
    const selectedProduct = values.product_id ? products.find(p => p.id === values.product_id) : null;
    const amount = values.amount || selectedProduct?.price || 0;
    if (amount <= 0) return;
    try {
      await createPayment.mutateAsync({
        client_id: values.client_id || undefined,
        product_id: values.product_id || undefined,
        amount,
        description: values.description || selectedProduct?.name || "Cobro manual",
        payment_type: selectedProduct?.type || "one_time",
      });
      closeChargeModal();
      chargeForm.reset();
    } catch {
      // Error handled by mutation
    }
  }, [createPayment, closeChargeModal, chargeForm, products]);

  const getPublicLink = useCallback((product: Product) => {
    const slug = currentWorkspace?.slug || currentWorkspace?.id || "";
    return `${window.location.origin}/onboarding/${slug}?product=${product.id}`;
  }, [currentWorkspace]);

  // Use real KPIs or default values
  const kpis = {
    mrr: kpisData?.mrr || 0,
    mrrChange: kpisData?.mrr_change || 0,
    activeSubscriptions: kpisData?.active_subscriptions || 0,
    newSubsThisMonth: kpisData?.new_subs_this_month || 0,
    pendingPayments: kpisData?.pending_payments || 0,
    pendingAmount: kpisData?.pending_amount || 0,
    thisMonthRevenue: kpisData?.this_month_revenue || 0,
    revenueChange: kpisData?.revenue_change || 0,
  };

  // Client options for select
  const clientOptions = (clientsData?.items || []).map((c: { id: string; full_name?: string; first_name: string; last_name: string }) => ({
    value: c.id,
    label: c.full_name || `${c.first_name} ${c.last_name}`,
  }));

  const getStatusColor = (
    status: Payment["status"] | Subscription["status"]
  ) => {
    switch (status) {
      case "completed":
      case "active":
        return "green";
      case "pending":
      case "trialing":
        return "yellow";
      case "failed":
      case "past_due":
        return "red";
      case "refunded":
      case "cancelled":
        return "gray";
      default:
        return "gray";
    }
  };

  const getStatusLabel = (
    status: Payment["status"] | Subscription["status"]
  ) => {
    switch (status) {
      case "completed":
        return "Completado";
      case "pending":
        return "Pendiente";
      case "failed":
        return "Fallido";
      case "refunded":
        return "Reembolsado";
      case "active":
        return "Activa";
      case "trialing":
        return "Prueba";
      case "past_due":
        return "Vencida";
      case "cancelled":
        return "Cancelada";
      default:
        return status;
    }
  };

  const getPaymentTypeIcon = (type: Payment["payment_type"]) => {
    switch (type) {
      case "subscription":
        return IconRefresh;
      case "package":
        return IconPackage;
      case "one_time":
        return IconCash;
      default:
        return IconCreditCard;
    }
  };

  return (
    <Container py="xl" fluid px={{ base: "md", sm: "lg", lg: "xl", xl: 48 }}>
      <PageHeader
        action={{
          label: t("payments.nuevoCobro"),
          onClick: openChargeModal,
        }}
        description={t("payments.gestionaIngresosSuscripcionesYProductos")}
        secondaryAction={{
          label: t("payments.nuevoProducto"),
          icon: <IconPlus size={16} />,
          onClick: handleOpenNewProduct,
          variant: "default",
        }}
        title={t("payments.pagosYSuscripciones")}
      />

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl" spacing="md" className="stagger">
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">MRR</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-success)" }}>
                €{kpis.mrr.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </Text>
              <Group gap={4} mt="xs">
                <Badge size="sm" variant="light" color="green" radius="xl">
                  +{kpis.mrrChange}%
                </Badge>
                <Text size="xs" c="dimmed">{t("payments.vs_mes_anterior")}</Text>
              </Group>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "var(--nv-success-bg)", color: "var(--nv-success)" }}>
              <IconTrendingUp size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">{t("payments.ingresosDelMes")}</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-primary)" }}>
                €{kpis.thisMonthRevenue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </Text>
              <Group gap={4} mt="xs">
                <Badge size="sm" variant="light" color="blue" radius="xl">
                  +{kpis.revenueChange}%
                </Badge>
                <Text size="xs" c="dimmed">{t("payments.vs_mes_anterior")}</Text>
              </Group>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
              <IconCash size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">{t("payments.suscripcionesActivas")}</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-brand)" }}>
                {kpis.activeSubscriptions}
              </Text>
              <Group gap={4} mt="xs">
                <Text size="xs" c="dimmed">{kpis.newSubsThisMonth} nueva{kpis.newSubsThisMonth !== 1 ? "s" : ""} este mes</Text>
              </Group>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "rgba(190, 75, 219, 0.1)", color: "var(--nv-brand)" }}>
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
        </Box>
        <Box className="nv-card" p="lg">
          <Group align="flex-start" justify="space-between">
            <Box>
              <Text className="text-label" mb="xs">{t("payments.pagosPendientes")}</Text>
              <Text className="text-display" style={{ fontSize: "2rem", color: "var(--nv-warning)" }}>
                {kpis.pendingPayments}
              </Text>
              <Text c="orange" fw={500} mt="xs" size="sm">
                €{kpis.pendingAmount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} por cobrar
              </Text>
            </Box>
            <ThemeIcon size={48} radius="xl" style={{ backgroundColor: "var(--nv-warning-bg)", color: "var(--nv-warning)" }}>
              <IconClock size={24} />
            </ThemeIcon>
          </Group>
        </Box>
      </SimpleGrid>

      {isMobile && (
        <Select
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { value: "overview", label: t("payments.resumen") },
            { value: "payments", label: t("payments.historial") },
            { value: "invoices", label: t("payments.facturas") },
            { value: "subscriptions", label: t("payments.suscripciones") },
            { value: "products", label: t("payments.productos") },
          ]}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs onChange={setActiveTab} value={activeTab}>
        {!isMobile && (
          <Tabs.List mb="lg" style={{ borderBottom: "1px solid var(--nv-border)" }}>
            <Tabs.Tab leftSection={<IconCreditCard size={14} />} value="overview" style={{ fontWeight: 500 }}>
              {t("payments.resumen")}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconReceipt size={14} />} value="payments" style={{ fontWeight: 500 }}>
              {t("payments.historial")}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconFileInvoice size={14} />} value="invoices" style={{ fontWeight: 500 }}>
              {t("payments.facturas")}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconRefresh size={14} />} value="subscriptions" style={{ fontWeight: 500 }}>
              {t("payments.suscripciones")}
            </Tabs.Tab>
            <Tabs.Tab leftSection={<IconPackage size={14} />} value="products" style={{ fontWeight: 500 }}>
              {t("payments.productos")}
            </Tabs.Tab>
          </Tabs.List>
        )}

        <Tabs.Panel value="overview">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg" className="stagger">
            {/* Revenue Distribution */}
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" style={{ color: "var(--nv-text-primary)" }}>
                {t("payments.distribucionDeIngresos")}
              </Text>
              {(() => {
                const subRevenue = payments.filter(p => p.payment_type === "subscription" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
                const otherRevenue = payments.filter(p => p.payment_type !== "subscription" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
                const total = subRevenue + otherRevenue;
                const subPct = total > 0 ? Math.round((subRevenue / total) * 100) : 100;
                const otherPct = total > 0 ? 100 - subPct : 0;
                return (
                  <>
                    <Group justify="center" mb="md">
                      <RingProgress
                        label={
                          <Box ta="center">
                            <Text fw={700} size="lg" style={{ color: "var(--nv-text-primary)" }}>
                              €{kpis.thisMonthRevenue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                            </Text>
                            <Text c="dimmed" size="xs">{t("payments.esteMes")}</Text>
                          </Box>
                        }
                        roundCaps
                        sections={total > 0 ? [
                          { value: subPct, color: "var(--nv-primary)", tooltip: `Suscripciones: ${subPct}%` },
                          { value: otherPct, color: "var(--nv-success)", tooltip: `Otros: ${otherPct}%` },
                        ] : [{ value: 100, color: "var(--nv-border)", tooltip: "Sin datos" }]}
                        size={180}
                        thickness={20}
                      />
                    </Group>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <Group gap="xs" justify="center">
                        <Box h={12} w={12} style={{ borderRadius: "50%", backgroundColor: "var(--nv-primary)" }} />
                        <Text size="xs">Suscripciones ({subPct}%)</Text>
                      </Group>
                      <Group gap="xs" justify="center">
                        <Box h={12} w={12} style={{ borderRadius: "50%", backgroundColor: "var(--nv-success)" }} />
                        <Text size="xs">Otros ({otherPct}%)</Text>
                      </Group>
                    </SimpleGrid>
                  </>
                );
              })()}
            </Box>

            {/* Recent Payments */}
            <Box className="nv-card" p="lg">
              <Group justify="space-between" mb="lg">
                <Text fw={600} style={{ color: "var(--nv-text-primary)" }}>{t("payments.pagosRecientes")}</Text>
                <Button
                  rightSection={<IconArrowUpRight size={14} />}
                  size="xs"
                  variant="subtle"
                  style={{ color: "var(--nv-primary)" }}
                  onClick={() => setActiveTab("payments")}
                >
                  {t("payments.verTodos")}
                </Button>
              </Group>
              <Stack gap="sm">
                {payments.length === 0 && (
                  <Text c="dimmed" ta="center" py="lg" size="sm">{t("payments.noHayPagosRegistrados")}</Text>
                )}
                {payments.slice(0, 5).map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type);
                  return (
                    <Group 
                      justify="space-between" 
                      key={payment.id}
                      p="sm"
                      style={{ 
                        borderRadius: "var(--radius-item)", 
                        transition: "background 0.2s",
                        cursor: "pointer"
                      }}
                      className="hover-lift"
                    >
                      <Group gap="sm">
                        <ThemeIcon
                          color={getStatusColor(payment.status)}
                          radius="xl"
                          size="lg"
                          variant="light"
                        >
                          <PaymentIcon size={16} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                            {payment.client_name || "Cliente"}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {payment.description}
                          </Text>
                        </Box>
                      </Group>
                      <Box ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{formatDecimal(Number(payment.amount), 2)}
                        </Text>
                        <Badge
                          color={getStatusColor(payment.status)}
                          size="xs"
                          variant="light"
                          radius="xl"
                        >
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </Box>
                    </Group>
                  );
                })}
              </Stack>
            </Box>

            {/* Upcoming Renewals */}
            <Box className="nv-card" p="lg">
              <Text fw={600} mb="lg" style={{ color: "var(--nv-text-primary)" }}>
                {t("payments.proximasRenovaciones")}
              </Text>
              <Stack gap="sm">
                {subscriptions.filter((s) => s.status === "active").length === 0 && (
                  <Text c="dimmed" ta="center" py="lg" size="sm">{t("payments.noHayRenovacionesPendientes")}</Text>
                )}
                {subscriptions
                  .filter((s) => s.status === "active")
                  .slice(0, 4)
                  .map((sub) => (
                    <Group 
                      justify="space-between" 
                      key={sub.id}
                      p="sm"
                      style={{ borderRadius: "var(--radius-item)" }}
                    >
                      <Box>
                        <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          {sub.client_name || "Cliente"}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {sub.plan_name}
                        </Text>
                      </Box>
                      <Box ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{formatDecimal(Number(sub.amount), 2)}
                        </Text>
                        <Text c="dimmed" size="xs">
                          {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("es-ES") : "—"}
                        </Text>
                      </Box>
                    </Group>
                  ))}
              </Stack>
            </Box>

            {/* Redsys Integration */}
            <Box className="nv-card" p="lg">
              <Group justify="space-between" mb="lg">
                <Group gap="sm">
                  <ThemeIcon
                    color="blue"
                    radius="xl"
                    size="lg"
                    variant="light"
                  >
                    <IconCreditCard size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} style={{ color: "var(--nv-text-primary)" }}>{t("payments.redsysTpv")}</Text>
                    <Text c="dimmed" size="xs">
                      {t("payments.pasarelaDePagoConfigurada")}
                    </Text>
                  </Box>
                </Group>
                <Badge color="green" variant="light" radius="xl">
                  {t("payments.activo")}
                </Badge>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">{t("payments.ingresosEsteMes")}</Text>
                  <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>€{formatDecimal(kpis.thisMonthRevenue, 2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">{t("payments.suscripcionesActivas")}</Text>
                  <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>{kpis.activeSubscriptions}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">{t("payments.cobrosPendientes")}</Text>
                  <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>€{formatDecimal(kpis.pendingAmount, 2)}</Text>
                </Group>
              </Stack>
            </Box>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="payments">
          <Box className="nv-card" p={0}>
            <ScrollArea type="auto">
              <Table style={{ minWidth: 700 }}>
              <Table.Thead style={{ backgroundColor: "var(--nv-surface)" }}>
                <Table.Tr>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.cliente")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.descripcion")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.tipo")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.estado")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.fecha")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>{t("payments.importe")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>{t("payments.acciones")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {payments.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center" py="xl" size="sm">{t("payments.noHayPagosRegistrados")}</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {payments.map((payment) => {
                  const PaymentIcon = getPaymentTypeIcon(payment.payment_type);
                  return (
                    <Table.Tr key={payment.id} style={{ transition: "background 0.2s" }}>
                      <Table.Td>
                        <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          {payment.client_name || "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{payment.description}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ThemeIcon color="gray" size="sm" variant="light" radius="xl">
                            <PaymentIcon size={12} />
                          </ThemeIcon>
                          <Text size="xs">
                            {payment.payment_type === "subscription"
                              ? "Suscripción"
                              : payment.payment_type === "package"
                                ? "Bono"
                                : "Puntual"}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(payment.status)} variant="light" radius="xl">
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text c="dimmed" size="sm">{payment.paid_at ? new Date(payment.paid_at).toLocaleDateString("es-ES") : payment.created_at ? new Date(payment.created_at).toLocaleDateString("es-ES") : "—"}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                          €{formatDecimal(Number(payment.amount), 2)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <Tooltip label={t("payments.verDetalle")}>
                            <ActionIcon color="blue" variant="subtle" radius="xl" onClick={() => handleViewPayment(payment)}>
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          {payment.status === "pending" && (
                            <Tooltip label={t("payments.marcarComoPagado")}>
                              <ActionIcon
                                color="green"
                                variant="subtle"
                                radius="xl"
                                onClick={() => handleMarkPaid(payment)}
                                loading={markPaymentPaid.isPending}
                              >
                                <IconCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {payment.status === "pending" && (
                            <Tooltip label={t("payments.eliminarCobro")}>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                radius="xl"
                                onClick={() => handleDeletePaymentAction(payment)}
                                loading={deletePayment.isPending}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
            </ScrollArea>
          </Box>
        </Tabs.Panel>

        {/* ═══════════════ INVOICES TAB ═══════════════ */}
        <Tabs.Panel value="invoices">
          {/* Invoice KPIs */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg" spacing="md">
            <Box className="nv-card" p="lg">
              <Group align="flex-start" justify="space-between">
                <Box>
                  <Text className="text-label" mb="xs">{t("payments.totalFacturado")}</Text>
                  <Text className="text-display" style={{ fontSize: "1.75rem", color: "var(--nv-primary)" }}>
                    {(invoiceStatsData?.total_invoiced || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                  </Text>
                </Box>
                <ThemeIcon size={44} radius="xl" style={{ backgroundColor: "var(--nv-primary-glow)", color: "var(--nv-primary)" }}>
                  <IconFileInvoice size={22} />
                </ThemeIcon>
              </Group>
            </Box>
            <Box className="nv-card" p="lg">
              <Group align="flex-start" justify="space-between">
                <Box>
                  <Text className="text-label" mb="xs">{t("payments.pendienteDeCobro")}</Text>
                  <Text className="text-display" style={{ fontSize: "1.75rem", color: "var(--nv-warning)" }}>
                    {(invoiceStatsData?.total_pending || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                  </Text>
                </Box>
                <ThemeIcon size={44} radius="xl" style={{ backgroundColor: "var(--nv-warning-bg)", color: "var(--nv-warning)" }}>
                  <IconClock size={22} />
                </ThemeIcon>
              </Group>
            </Box>
            <Box className="nv-card" p="lg">
              <Group align="flex-start" justify="space-between">
                <Box>
                  <Text className="text-label" mb="xs">{t("payments.vencidas")}</Text>
                  <Text className="text-display" style={{ fontSize: "1.75rem", color: "var(--nv-error)" }}>
                    {(invoiceStatsData?.total_overdue || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                  </Text>
                </Box>
                <ThemeIcon size={44} radius="xl" style={{ backgroundColor: "var(--nv-error-bg)", color: "var(--nv-error)" }}>
                  <IconX size={22} />
                </ThemeIcon>
              </Group>
            </Box>
            <Box className="nv-card" p="lg">
              <Group align="flex-start" justify="space-between">
                <Box>
                  <Text className="text-label" mb="xs">{t("payments.facturasEsteMes")}</Text>
                  <Text className="text-display" style={{ fontSize: "1.75rem", color: "var(--nv-success)" }}>
                    {invoiceStatsData?.invoices_this_month || 0}
                  </Text>
                </Box>
                <ThemeIcon size={44} radius="xl" style={{ backgroundColor: "var(--nv-success-bg)", color: "var(--nv-success)" }}>
                  <IconReceipt size={22} />
                </ThemeIcon>
              </Group>
            </Box>
          </SimpleGrid>

          {/* Toolbar */}
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <Select
                placeholder={t("payments.todosLosEstados")}
                data={[
                  { value: "", label: t("payments.todos") },
                  { value: "draft", label: t("payments.borrador") },
                  { value: "finalized", label: t("payments.emitida") },
                  { value: "sent", label: t("payments.enviada") },
                  { value: "paid", label: t("payments.pagada") },
                  { value: "overdue", label: t("payments.vencida") },
                  { value: "rectified", label: t("payments.rectificada") },
                ]}
                value={invoiceStatusFilter || ""}
                onChange={(v) => setInvoiceStatusFilter(v || null)}
                clearable
                size="sm"
                leftSection={<IconFilter size={14} />}
                style={{ width: 180 }}
              />
            </Group>
            <Group gap="sm">
              <Tooltip label={t("payments.configuracionDeFacturacion")}>
                <ActionIcon variant="default" radius="md" size="lg" onClick={handleOpenSettings}>
                  <IconSettings size={18} />
                </ActionIcon>
              </Tooltip>
              <Button leftSection={<IconPlus size={16} />} size="sm" onClick={handleOpenNewInvoice}>
                {t("payments.nuevaFactura")}
              </Button>
            </Group>
          </Group>

          {/* Invoice Table */}
          <Box className="nv-card" p={0}>
            <ScrollArea type="auto">
              <Table style={{ minWidth: 700 }}>
              <Table.Thead style={{ backgroundColor: "var(--nv-surface)" }}>
                <Table.Tr>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>N.º</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.cliente")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.fecha")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.vencimiento")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.estado")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>{t("payments.total")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>{t("payments.acciones")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {invoices.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center" py="xl" size="sm">{t("payments.noHayFacturasCreaTu")}</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {invoices.map((inv) => (
                  <Table.Tr key={inv.id} style={{ transition: "background 0.2s", cursor: "pointer" }} onClick={() => handleViewInvoice(inv)}>
                    <Table.Td>
                      <Group gap={6}>
                        <Text fw={600} size="sm" style={{ color: "var(--nv-primary)" }}>{inv.invoice_number}</Text>
                        {inv.verifactu_hash && (
                          <Tooltip label={t("payments.verifactuVerificada")}>
                            <ThemeIcon size={16} radius="xl" variant="light" color="green"><IconShieldCheck size={10} /></ThemeIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>{inv.client_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("es-ES") : "—"}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("es-ES") : "—"}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={invoiceStatusColor(inv.status)} variant="light" radius="xl">{invoiceStatusLabel(inv.status)}</Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>{Number(inv.total).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text>
                    </Table.Td>
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Group gap={4} justify="flex-end">
                        <Menu shadow="md" width={200} position="bottom-end">
                          <Menu.Target>
                            <ActionIcon variant="subtle" radius="xl" color="gray"><IconDotsVertical size={16} /></ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEye size={14} />} onClick={() => handleViewInvoice(inv)}>{t("payments.verDetalle")}</Menu.Item>
                            {inv.status === "draft" && (
                              <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => handleOpenEditInvoice(inv)}>{t("payments.editar")}</Menu.Item>
                            )}
                            {inv.status === "draft" && (
                              <Menu.Item leftSection={<IconLock size={14} />} color="blue" onClick={() => handleFinalizeInvoice(inv)}>{t("payments.emitirFactura")}</Menu.Item>
                            )}
                            {["finalized", "sent", "overdue"].includes(inv.status) && (
                              <Menu.Item leftSection={<IconCheck size={14} />} color="green" onClick={() => handleMarkInvoicePaid(inv)}>{t("payments.marcarPagada")}</Menu.Item>
                            )}
                            <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => handleDownloadPdf(inv)}>{t("payments.descargarPdf")}</Menu.Item>
                            {inv.status !== "draft" && (
                              <Menu.Item leftSection={<IconMail size={14} />} onClick={() => handleSendInvoiceEmail(inv)}>{t("payments.enviarPorEmail")}</Menu.Item>
                            )}
                            <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => handleDuplicateInvoice(inv)}>{t("payments.duplicar")}</Menu.Item>
                            {inv.status !== "draft" && inv.status !== "rectified" && inv.status !== "cancelled" && (
                              <Menu.Item leftSection={<IconRefresh size={14} />} color="orange" onClick={() => handleRectifyInvoice(inv)}>{t("payments.rectificar")}</Menu.Item>
                            )}
                            {inv.status === "draft" && (
                              <>
                                <Menu.Divider />
                                <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDeleteInvoice(inv)}>{t("payments.eliminar")}</Menu.Item>
                              </>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            </ScrollArea>
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="subscriptions">
          <Box className="nv-card" p={0}>
            <ScrollArea type="auto">
              <Table style={{ minWidth: 700 }}>
              <Table.Thead style={{ backgroundColor: "var(--nv-surface)" }}>
                <Table.Tr>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.cliente")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.plan")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.estado")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" style={{ fontSize: "10px" }}>{t("payments.proximaRenovacion")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>{t("payments.importe")}</Table.Th>
                  <Table.Th c="dimmed" fw={600} tt="uppercase" ta="right" style={{ fontSize: "10px" }}>{t("payments.acciones")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subscriptions.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center" py="xl" size="sm">{t("payments.noHaySuscripciones")}</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {subscriptions.map((sub) => (
                  <Table.Tr key={sub.id} style={{ transition: "background 0.2s" }}>
                    <Table.Td>
                      <Text fw={500} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        {sub.client_name || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{sub.plan_name || sub.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(sub.status)} variant="light" radius="xl">
                        {getStatusLabel(sub.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("es-ES") : "—"}</Text>
                      {sub.cancel_at_period_end && (
                        <Text c="red" size="xs">{t("payments.cancelaAlFinalizar")}</Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        €{formatDecimal(Number(sub.amount), 2)}/{
                          sub.interval === "week" ? "semana" :
                          sub.interval === "biweekly" ? "quincenal" :
                          sub.interval === "month" ? "mes" :
                          sub.interval === "quarter" ? "trimestre" :
                          sub.interval === "semester" ? "semestre" :
                          sub.interval === "year" ? "año" : sub.interval || "mes"
                        }
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        {sub.status === "active" && (
                          <Tooltip label={t("payments.cancelarSuscripcion")}>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              radius="xl"
                              onClick={() => handleCancelSubscription(sub)}
                              loading={cancelSubscription.isPending}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            </ScrollArea>
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="products">
          {products.length === 0 && (
            <Box className="nv-card" p="xl">
              <Text c="dimmed" ta="center">{t("payments.noHayProductosCreadosUsa")}</Text>
            </Box>
          )}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg" className="stagger">
            {products.map((product) => (
              <Box key={product.id} className="nv-card" p="lg">
                <Group justify="space-between" mb="sm">
                  <Badge
                    color={
                      product.type === "subscription"
                        ? "blue"
                        : product.type === "package"
                          ? "green"
                          : "orange"
                    }
                    variant="light"
                    radius="xl"
                  >
                    {product.type === "subscription"
                      ? "Suscripción"
                      : product.type === "package"
                        ? "Bono"
                        : "Puntual"}
                  </Badge>
                  <Group gap="xs">
                    <Switch
                      checked={product.is_active}
                      color="green"
                      size="sm"
                      onChange={() => handleToggleActive(product)}
                    />
                    <CopyButton value={getPublicLink(product)}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "¡Copiado!" : "Copiar enlace público"}>
                          <ActionIcon
                            color={copied ? "green" : "gray"}
                            variant="light"
                            radius="xl"
                            size="sm"
                            onClick={copy}
                          >
                            {copied ? <IconCheck size={14} /> : <IconLink size={14} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Group>

                <Text fw={600} mb="xs" size="lg" style={{ color: "var(--nv-text-primary)" }}>
                  {product.name}
                </Text>
                <Text c="dimmed" mb="md" size="sm">
                  {product.description}
                </Text>

                {product.sessions_included && (
                  <Badge mb="md" variant="outline" radius="xl">
                    {product.sessions_included} sesiones incluidas
                  </Badge>
                )}

                <Divider mb="md" style={{ borderColor: "var(--nv-border)" }} />

                <Group align="flex-end" justify="space-between">
                  <Box>
                    <Text fw={700} size="xl" style={{ color: "var(--nv-primary)" }}>
                      {product.price === 0 ? "Gratuito" : `€${product.price}`}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {product.type === "subscription" ? `/${product.interval === "year" ? "año" : "mes"}` : ""}
                    </Text>
                  </Box>
                  <Group gap="xs">
                    <Tooltip label={t("payments.editarProducto")}>
                      <ActionIcon color="blue" variant="light" radius="xl" onClick={() => handleOpenEditProduct(product)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t("payments.eliminarProducto")}>
                      <ActionIcon
                        color="red"
                        variant="light"
                        radius="xl"
                        onClick={() => handleDeleteProduct(product)}
                        loading={deleteProduct.isPending}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Box>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>

      {/* Product Modal (Create/Edit) */}
      <BottomSheet
        onClose={() => { closeProductModal(); setEditingProduct(null); productForm.reset(); }}
        opened={productModalOpened}
        size="md"
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={productForm.onSubmit(handleSaveProduct)}>
          <Stack>
            <TextInput
              label={t("payments.nombre")}
              placeholder={t("payments.planPremium")}
              required
              {...productForm.getInputProps("name")}
            />

            <Textarea
              label={t("payments.descripcion")}
              minRows={2}
              placeholder={t("payments.describeElProducto")}
              {...productForm.getInputProps("description")}
            />

            <Group grow>
              <NumberInput
                label={t("payments.precio")}
                min={0}
                placeholder="0"
                required
                decimalScale={2}
                {...productForm.getInputProps("price")}
              />
              <Select
                data={[
                  { value: "subscription", label: t("payments.suscripcion") },
                  { value: "package", label: t("payments.bonoPaquete") },
                  { value: "one_time", label: t("payments.pagoUnico") },
                ]}
                label={t("payments.tipo")}
                {...productForm.getInputProps("type")}
              />
            </Group>

            {productForm.values.type === "subscription" && (
              <Select
                data={[
                  { value: "month", label: t("payments.mensual") },
                  { value: "year", label: t("payments.anual") },
                  { value: "week", label: t("payments.semanal") },
                ]}
                label={t("payments.intervaloDeCobro")}
                {...productForm.getInputProps("interval")}
              />
            )}

            {productForm.values.type === "package" && (
              <NumberInput
                label={t("payments.sesionesIncluidas")}
                min={1}
                placeholder="0"
                {...productForm.getInputProps("sessions_included")}
              />
            )}

            <Group justify="flex-end" mt="md">
              <Button onClick={() => { closeProductModal(); setEditingProduct(null); productForm.reset(); }} variant="default">
                {t("payments.cancelar")}
              </Button>
              <Button type="submit" loading={createProduct.isPending || updateProduct.isPending}>
                {editingProduct ? "Guardar Cambios" : "Crear Producto"}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* New Charge Modal */}
      <BottomSheet
        onClose={closeChargeModal}
        opened={chargeModalOpened}
        size="md"
        title={t("payments.nuevoCobro")}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={chargeForm.onSubmit(handleCreateCharge)}>
          <Stack>
            <Select
              data={clientOptions}
              label={t("payments.cliente")}
              placeholder={t("payments.seleccionaUnCliente")}
              searchable
              clearable
              {...chargeForm.getInputProps("client_id")}
            />

            <Select
              data={products.map((p) => ({
                value: p.id,
                label: `${p.name} - €${p.price}`,
              }))}
              label={t("payments.producto")}
              placeholder={t("payments.seleccionaUnProductoOpcional")}
              clearable
              onChange={(val) => {
                chargeForm.setFieldValue("product_id", val || "");
                if (val) {
                  const prod = products.find(p => p.id === val);
                  if (prod) {
                    chargeForm.setFieldValue("amount", prod.price);
                    chargeForm.setFieldValue("description", prod.name);
                  }
                }
              }}
              value={chargeForm.values.product_id || null}
            />

            <NumberInput
              label={t("payments.importe")}
              min={0.01}
              placeholder="0"
              decimalScale={2}
              required
              {...chargeForm.getInputProps("amount")}
            />

            <Textarea
              label={t("payments.descripcion")}
              placeholder={t("payments.descripcionDelCobro")}
              {...chargeForm.getInputProps("description")}
            />

            <Group justify="flex-end" mt="md">
              <Button onClick={closeChargeModal} variant="default">
                {t("payments.cancelar")}
              </Button>
              <Button leftSection={<IconCreditCard size={16} />} type="submit" loading={createPayment.isPending}>
                {t("payments.crearCobro")}
              </Button>
            </Group>
          </Stack>
        </form>
      </BottomSheet>

      {/* Payment Detail Modal */}
      <BottomSheet
        onClose={closePaymentDetail}
        opened={paymentDetailOpened}
        size="md"
        title={t("payments.detalleDelPago")}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        {selectedPayment && (
          <Stack>
            <Group justify="space-between">
              <Text c="dimmed" size="sm">{t("payments.cliente")}</Text>
              <Text fw={500} size="sm">{selectedPayment.client_name || "—"}</Text>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">{t("payments.descripcion")}</Text>
              <Text fw={500} size="sm">{selectedPayment.description || "—"}</Text>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">{t("payments.importe")}</Text>
              <Text fw={700} size="lg" style={{ color: "var(--nv-primary)" }}>€{formatDecimal(Number(selectedPayment.amount), 2)}</Text>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">{t("payments.estado")}</Text>
              <Badge color={getStatusColor(selectedPayment.status)} variant="light" radius="xl">
                {getStatusLabel(selectedPayment.status)}
              </Badge>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">{t("payments.tipo")}</Text>
              <Text size="sm">{selectedPayment.payment_type === "subscription" ? "Suscripción" : selectedPayment.payment_type === "package" ? "Bono" : "Puntual"}</Text>
            </Group>
            <Divider style={{ borderColor: "var(--nv-border)" }} />
            <Group justify="space-between">
              <Text c="dimmed" size="sm">{t("payments.fechaDeCreacion")}</Text>
              <Text size="sm">{selectedPayment.created_at ? new Date(selectedPayment.created_at).toLocaleString("es-ES") : "—"}</Text>
            </Group>
            {selectedPayment.paid_at && (
              <>
                <Divider style={{ borderColor: "var(--nv-border)" }} />
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">{t("payments.fechaDePago")}</Text>
                  <Text size="sm">{new Date(selectedPayment.paid_at).toLocaleString("es-ES")}</Text>
                </Group>
              </>
            )}
            <Group justify="flex-end" mt="md" gap="sm">
              {selectedPayment.status === "pending" && (
                <>
                  <Button
                    color="green"
                    variant="light"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => { handleMarkPaid(selectedPayment); closePaymentDetail(); }}
                  >
                    {t("payments.marcarComoPagado")}
                  </Button>
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={16} />}
                    onClick={() => { handleDeletePaymentAction(selectedPayment); closePaymentDetail(); }}
                  >
                    {t("payments.eliminar")}
                  </Button>
                </>
              )}
              <Button onClick={closePaymentDetail} variant="default">
                {t("payments.cerrar")}
              </Button>
            </Group>
          </Stack>
        )}
      </BottomSheet>

      {/* ═══════════════ INVOICE CREATE/EDIT MODAL ═══════════════ */}
      <BottomSheet
        onClose={() => { closeInvoiceModal(); setEditingInvoice(null); invoiceForm.reset(); }}
        opened={invoiceModalOpened}
        size="xl"
        title={editingInvoice ? `Editar Factura ${editingInvoice.invoice_number}` : "Nueva Factura"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={invoiceForm.onSubmit(handleSaveInvoice)}>
          <ScrollArea.Autosize mah="75vh">
            <Stack gap="md" pr="xs">
              {/* Series + Number preview */}
              <Group grow>
                <Select
                  label={t("payments.serie")}
                  data={[{ value: "F", label: t("payments.fOrdinaria") }, { value: "R", label: t("payments.rRectificativa") }]}
                  {...invoiceForm.getInputProps("invoice_series")}
                />
                <TextInput
                  label={t("payments.numeroAuto")}
                  value={nextNumberData?.next_number || "—"}
                  disabled
                  styles={{ input: { fontFamily: "monospace", fontWeight: 600 } }}
                />
              </Group>

              <Divider label={t("payments.datosDelCliente")} labelPosition="left" />

              <Select
                label={t("payments.seleccionarCliente")}
                placeholder={t("payments.buscarCliente")}
                data={clientOptions}
                searchable
                clearable
                value={invoiceForm.values.client_id || null}
                onChange={handleClientSelectForInvoice}
              />
              <Group grow>
                <TextInput label={t("payments.nombreRazonSocial")} required {...invoiceForm.getInputProps("client_name")} />
                <TextInput label="NIF/CIF" placeholder="99999999R" {...invoiceForm.getInputProps("client_tax_id")} />
              </Group>
              <Group grow>
                <TextInput label={t("payments.direccion")} {...invoiceForm.getInputProps("client_address")} />
                <TextInput label={t("payments.ciudad")} {...invoiceForm.getInputProps("client_city")} />
                <TextInput label="C.P." {...invoiceForm.getInputProps("client_postal_code")} />
              </Group>
              <TextInput label={t("payments.emailDelCliente")} {...invoiceForm.getInputProps("client_email")} />

              <Divider label={t("payments.fechas")} labelPosition="left" />
              <Group grow>
                <DateInput label={t("payments.fechaEmision")} locale="es" valueFormat="DD/MM/YYYY" {...invoiceForm.getInputProps("issue_date")} />
                <DateInput label={t("payments.fechaVencimiento")} locale="es" valueFormat="DD/MM/YYYY" clearable {...invoiceForm.getInputProps("due_date")} />
                <Select
                  label={t("payments.metodoDePago")}
                  data={[
                    { value: "transferencia", label: t("payments.transferencia") },
                    { value: "tarjeta", label: t("payments.tarjeta") },
                    { value: "efectivo", label: t("payments.efectivo") },
                    { value: "domiciliacion", label: t("payments.domiciliacion") },
                    { value: "otro", label: t("payments.otro") },
                  ]}
                  {...invoiceForm.getInputProps("payment_method")}
                />
              </Group>

              <Divider label={t("payments.lineasDeFactura")} labelPosition="left" />

              {invoiceForm.values.items.map((item, idx) => (
                <Box key={idx} className="nv-card-compact" p="sm" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--nv-border)" }}>
                  <Group align="flex-start" gap="sm" wrap="wrap">
                    <TextInput
                      label={idx === 0 ? "Descripción" : undefined}
                      placeholder={t("payments.servicioDeEntrenamientoPersonal")}
                      style={{ flex: 3, minWidth: 200 }}
                      {...invoiceForm.getInputProps(`items.${idx}.description`)}
                    />
                    <NumberInput
                      label={idx === 0 ? "Ud." : undefined}
                      min={0.01}
                      decimalScale={2}
                      style={{ flex: 0.6, minWidth: 65 }}
                      {...invoiceForm.getInputProps(`items.${idx}.quantity`)}
                    />
                    <NumberInput
                      label={idx === 0 ? "Precio" : undefined}
                      min={0}
                      decimalScale={2}
                      suffix=" €"
                      style={{ flex: 1, minWidth: 90 }}
                      {...invoiceForm.getInputProps(`items.${idx}.unit_price`)}
                    />
                    <Select
                      label={idx === 0 ? "IVA" : undefined}
                      data={[
                        { value: "21", label: "21%" },
                        { value: "10", label: "10%" },
                        { value: "4", label: "4%" },
                        { value: "0", label: t("payments.exento") },
                      ]}
                      style={{ flex: 0.7, minWidth: 80 }}
                      value={String(item.tax_rate ?? 21)}
                      onChange={(v) => invoiceForm.setFieldValue(`items.${idx}.tax_rate`, v ? Number(v) : 21)}
                    />
                    <NumberInput
                      label={idx === 0 ? "Dto.%" : undefined}
                      min={0}
                      max={100}
                      suffix="%"
                      style={{ flex: 0.6, minWidth: 70 }}
                      {...invoiceForm.getInputProps(`items.${idx}.discount_value`)}
                    />
                    <Box style={{ flex: 0.5, minWidth: 80, textAlign: "right", paddingTop: idx === 0 ? 24 : 0 }}>
                      <Text fw={600} size="sm" style={{ color: "var(--nv-text-primary)" }}>
                        {(() => {
                          const sub = item.quantity * item.unit_price;
                          const disc = item.discount_type === "percentage" ? sub * (item.discount_value / 100) : item.discount_value;
                          const base = sub - disc;
                          const tax = base * ((item.tax_rate ?? 21) / 100);
                          return (base + tax).toLocaleString("es-ES", { minimumFractionDigits: 2 });
                        })()} €
                      </Text>
                    </Box>
                    {invoiceForm.values.items.length > 1 && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        radius="xl"
                        mt={idx === 0 ? 24 : 0}
                        onClick={() => invoiceForm.removeListItem("items", idx)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                </Box>
              ))}

              <Button
                variant="light"
                leftSection={<IconPlus size={14} />}
                size="xs"
                onClick={() => invoiceForm.insertListItem("items", { description: "", quantity: 1, unit_price: 0, tax_rate: 21, tax_name: "IVA", discount_type: "percentage", discount_value: 0 })}
              >
                {t("payments.anadirLinea")}
              </Button>

              {/* Totals summary */}
              <Box className="nv-card-compact" p="md" style={{ borderRadius: "var(--radius-sm)", backgroundColor: "var(--nv-surface-subtle)" }}>
                <Group grow mb="sm">
                  <Select
                    label={t("payments.descuentoGlobal")}
                    data={[{ value: "percentage", label: t("payments.porcentaje") }, { value: "fixed", label: t("payments.importeFijo") }]}
                    size="xs"
                    {...invoiceForm.getInputProps("discount_type")}
                  />
                  <NumberInput
                    label={invoiceForm.values.discount_type === "percentage" ? "% Descuento" : "€ Descuento"}
                    min={0}
                    decimalScale={2}
                    size="xs"
                    {...invoiceForm.getInputProps("discount_value")}
                  />
                </Group>
                <Stack gap={4}>
                  <Group justify="space-between"><Text size="sm" c="dimmed">{t("payments.subtotal")}</Text><Text size="sm" fw={500}>{invoiceLineTotals.subtotal.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Group>
                  {Object.entries(invoiceLineTotals.taxBreakdown).map(([rate, vals]) => (
                    <Group justify="space-between" key={rate}><Text size="sm" c="dimmed">IVA {rate}</Text><Text size="sm">{vals.tax.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Group>
                  ))}
                  {invoiceLineTotals.globalDisc > 0 && (
                    <Group justify="space-between"><Text size="sm" c="dimmed">{t("payments.descuento")}</Text><Text size="sm" c="red">-{invoiceLineTotals.globalDisc.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Group>
                  )}
                  <Divider my={4} />
                  <Group justify="space-between"><Text fw={700}>TOTAL</Text><Text fw={700} size="lg" style={{ color: "var(--nv-primary)" }}>{invoiceLineTotals.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Group>
                </Stack>
              </Box>

              <Divider label={t("payments.notas")} labelPosition="left" />
              <Textarea label={t("payments.notasParaElCliente")} minRows={2} {...invoiceForm.getInputProps("notes")} />
              <Textarea label={t("payments.notasInternas")} minRows={2} {...invoiceForm.getInputProps("internal_notes")} />
            </Stack>
          </ScrollArea.Autosize>

          <Group justify="flex-end" mt="lg">
            <Button onClick={() => { closeInvoiceModal(); setEditingInvoice(null); invoiceForm.reset(); }} variant="default">{t("payments.cancelar")}</Button>
            <Button type="submit" loading={createInvoice.isPending || updateInvoice.isPending}>
              {editingInvoice ? "Guardar Cambios" : "Crear Factura"}
            </Button>
          </Group>
        </form>
      </BottomSheet>

      {/* ═══════════════ INVOICE PREVIEW MODAL ═══════════════ */}
      <BottomSheet
        onClose={() => { closeInvoicePreview(); setPreviewInvoice(null); }}
        opened={invoicePreviewOpened}
        size="lg"
        title={previewInvoice ? `Factura ${previewInvoice.invoice_number}` : "Detalle"}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        {previewInvoice && (
          <ScrollArea.Autosize mah="75vh">
            <Stack gap="md" pr="xs">
              {/* Status + VeriFactu badge */}
              <Group justify="space-between">
                <Badge size="lg" color={invoiceStatusColor(previewInvoice.status)} variant="light" radius="xl">
                  {invoiceStatusLabel(previewInvoice.status)}
                </Badge>
                <Group gap="xs">
                  {previewInvoice.verifactu_hash && (
                    <Badge leftSection={<IconShieldCheck size={12} />} variant="light" color="green" radius="xl" size="sm">
                      {t("payments.verifactu")}
                    </Badge>
                  )}
                  <Badge variant="outline" radius="xl" size="sm">{previewInvoice.invoice_type}</Badge>
                </Group>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{t("payments.cliente")}</Text>
                  <Text fw={600}>{previewInvoice.client_name}</Text>
                  {previewInvoice.client_tax_id && <Text size="sm" c="dimmed">NIF: {previewInvoice.client_tax_id}</Text>}
                  {previewInvoice.client_address && <Text size="sm" c="dimmed">{previewInvoice.client_address}</Text>}
                  {previewInvoice.client_email && <Text size="sm" c="dimmed">{previewInvoice.client_email}</Text>}
                </Box>
                <Box>
                  <Group justify="space-between"><Text size="xs" c="dimmed">{t("payments.fechaEmision")}</Text><Text size="sm">{previewInvoice.issue_date ? new Date(previewInvoice.issue_date).toLocaleDateString("es-ES") : "—"}</Text></Group>
                  <Group justify="space-between"><Text size="xs" c="dimmed">{t("payments.vencimiento")}</Text><Text size="sm">{previewInvoice.due_date ? new Date(previewInvoice.due_date).toLocaleDateString("es-ES") : "—"}</Text></Group>
                  <Group justify="space-between"><Text size="xs" c="dimmed">{t("payments.metodoDePago")}</Text><Text size="sm">{previewInvoice.payment_method || "—"}</Text></Group>
                  {previewInvoice.paid_date && <Group justify="space-between"><Text size="xs" c="dimmed">{t("payments.fechaPago")}</Text><Text size="sm" c="green">{new Date(previewInvoice.paid_date).toLocaleDateString("es-ES")}</Text></Group>}
                </Box>
              </SimpleGrid>

              <Divider />

              {/* Items table */}
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ fontSize: "10px" }}>{t("payments.concepto")}</Table.Th>
                    <Table.Th style={{ fontSize: "10px" }} ta="center">{t("payments.ud")}</Table.Th>
                    <Table.Th style={{ fontSize: "10px" }} ta="right">{t("payments.precio")}</Table.Th>
                    <Table.Th style={{ fontSize: "10px" }} ta="center">IVA</Table.Th>
                    <Table.Th style={{ fontSize: "10px" }} ta="right">{t("payments.total")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {previewInvoice.items.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td><Text size="sm">{item.description}</Text></Table.Td>
                      <Table.Td ta="center"><Text size="sm">{item.quantity}</Text></Table.Td>
                      <Table.Td ta="right"><Text size="sm">{Number(item.unit_price).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Table.Td>
                      <Table.Td ta="center"><Text size="sm">{item.tax_rate != null ? `${item.tax_rate}%` : "—"}</Text></Table.Td>
                      <Table.Td ta="right"><Text size="sm" fw={500}>{Number(item.total).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {/* Totals */}
              <Box style={{ borderTop: "2px solid var(--nv-border)", paddingTop: 12 }}>
                <Group justify="space-between"><Text c="dimmed">{t("payments.subtotal")}</Text><Text>{Number(previewInvoice.subtotal).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Group>
                {Number(previewInvoice.discount_amount) > 0 && (
                  <Group justify="space-between"><Text c="dimmed">{t("payments.descuento")}</Text><Text c="red">-{Number(previewInvoice.discount_amount).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Group>
                )}
                <Group justify="space-between"><Text c="dimmed">IVA</Text><Text>{Number(previewInvoice.tax_amount).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Group>
                <Divider my="xs" />
                <Group justify="space-between"><Text fw={700} size="lg">TOTAL</Text><Text fw={700} size="lg" style={{ color: "var(--nv-primary)" }}>{Number(previewInvoice.total).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</Text></Group>
              </Box>

              {previewInvoice.notes && (
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>{t("payments.notas")}</Text>
                  <Text size="sm">{previewInvoice.notes}</Text>
                </Box>
              )}

              {/* VeriFactu info */}
              {previewInvoice.verifactu_hash && (
                <Box className="nv-card-compact" p="sm" style={{ borderRadius: "var(--radius-sm)", backgroundColor: "var(--nv-success-bg)" }}>
                  <Group gap="xs" mb={4}>
                    <IconShieldCheck size={16} color="var(--nv-success)" />
                    <Text size="sm" fw={600} style={{ color: "var(--nv-success)" }}>{t("payments.verifactu")}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">UUID: {previewInvoice.verifactu_uuid}</Text>
                  <Text size="xs" c="dimmed" style={{ wordBreak: "break-all" }}>Hash: {previewInvoice.verifactu_hash}</Text>
                </Box>
              )}

              {/* Audit log */}
              {auditLog.length > 0 && (
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">{t("payments.historialDeActividad")}</Text>
                  <Stack gap={4}>
                    {auditLog.map((entry) => (
                      <Group key={entry.id} gap="sm" style={{ borderBottom: "1px solid var(--nv-border)", paddingBottom: 4 }}>
                        <Text size="xs" c="dimmed" style={{ minWidth: 120 }}>
                          {new Date(entry.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </Text>
                        <Badge size="xs" variant="light" radius="xl">{auditActionLabel(entry.action)}</Badge>
                        {entry.user_name && <Text size="xs" c="dimmed">{entry.user_name}</Text>}
                      </Group>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Actions */}
              <Group justify="flex-end" mt="md" gap="sm">
                {previewInvoice.status === "draft" && (
                  <Button variant="light" color="blue" leftSection={<IconLock size={14} />} onClick={() => { handleFinalizeInvoice(previewInvoice); closeInvoicePreview(); }}>
                    {t("payments.emitir")}
                  </Button>
                )}
                {["finalized", "sent", "overdue"].includes(previewInvoice.status) && (
                  <Button variant="light" color="green" leftSection={<IconCheck size={14} />} onClick={() => { handleMarkInvoicePaid(previewInvoice); closeInvoicePreview(); }}>
                    {t("payments.marcarPagada")}
                  </Button>
                )}
                <Button variant="light" leftSection={<IconDownload size={14} />} onClick={() => handleDownloadPdf(previewInvoice)}>
                  PDF
                </Button>
                {previewInvoice.status !== "draft" && (
                  <Button variant="light" leftSection={<IconMail size={14} />} onClick={() => { handleSendInvoiceEmail(previewInvoice); closeInvoicePreview(); }}>
                    {t("payments.email")}
                  </Button>
                )}
                <Button onClick={() => { closeInvoicePreview(); setPreviewInvoice(null); }} variant="default">{t("payments.cerrar")}</Button>
              </Group>
            </Stack>
          </ScrollArea.Autosize>
        )}
      </BottomSheet>

      {/* ═══════════════ INVOICE SETTINGS MODAL ═══════════════ */}
      <BottomSheet
        onClose={closeSettingsModal}
        opened={settingsModalOpened}
        size="lg"
        title={t("payments.configuracionDeFacturacion")}
        radius="lg"
        styles={{ content: { backgroundColor: "var(--nv-paper-bg)" }, header: { backgroundColor: "var(--nv-paper-bg)" } }}
      >
        <form onSubmit={settingsForm.onSubmit(handleSaveSettings)}>
          <ScrollArea.Autosize mah="75vh">
            <Stack gap="md" pr="xs">
              <Divider label={t("payments.datosFiscales")} labelPosition="left" />
              <Group grow>
                <TextInput label={t("payments.nombreRazonSocial")} required {...settingsForm.getInputProps("business_name")} />
                <TextInput label="NIF/CIF" {...settingsForm.getInputProps("tax_id")} />
                <Select label={t("payments.tipo")} data={["NIF", "NIE", "CIF"]} {...settingsForm.getInputProps("nif_type")} />
              </Group>
              <Group grow>
                <TextInput label={t("payments.direccion")} {...settingsForm.getInputProps("address")} />
                <TextInput label={t("payments.ciudad")} {...settingsForm.getInputProps("city")} />
              </Group>
              <Group grow>
                <TextInput label="C.P." {...settingsForm.getInputProps("postal_code")} />
                <TextInput label={t("payments.provincia")} {...settingsForm.getInputProps("province")} />
                <TextInput label={t("payments.pais")} {...settingsForm.getInputProps("country")} />
              </Group>
              <Group grow>
                <TextInput label={t("payments.telefono")} {...settingsForm.getInputProps("phone")} />
                <TextInput label={t("payments.email")} {...settingsForm.getInputProps("email")} />
              </Group>

              <Divider label={t("payments.numeracion")} labelPosition="left" />
              <Group grow>
                <TextInput label={t("payments.prefijoFacturas")} {...settingsForm.getInputProps("invoice_prefix")} />
                <TextInput label={t("payments.prefijoRectificativas")} {...settingsForm.getInputProps("rectificative_prefix")} />
              </Group>

              <Divider label={t("payments.impuestosYPagos")} labelPosition="left" />
              <Group grow>
                <NumberInput label={t("payments.ivaPorDefecto")} min={0} max={100} {...settingsForm.getInputProps("default_tax_rate")} />
                <NumberInput label={t("payments.plazoDePagoDias")} min={0} {...settingsForm.getInputProps("payment_terms_days")} />
                <Select
                  label={t("payments.metodoDePago")}
                  data={["transferencia", "tarjeta", "efectivo", "domiciliacion", "otro"]}
                  {...settingsForm.getInputProps("default_payment_method")}
                />
              </Group>

              <Divider label={t("payments.datosBancarios")} labelPosition="left" />
              <Group grow>
                <TextInput label={t("payments.banco")} {...settingsForm.getInputProps("bank_name")} />
                <TextInput label="IBAN" placeholder="ES00 0000 0000 00 0000000000" {...settingsForm.getInputProps("bank_account")} />
              </Group>

              <Divider label={t("payments.pieDeFactura")} labelPosition="left" />
              <Textarea label={t("payments.textoDePieDeFactura")} minRows={2} {...settingsForm.getInputProps("footer_text")} />
              <Textarea label={t("payments.condicionesGenerales")} minRows={2} {...settingsForm.getInputProps("terms_and_conditions")} />

              <Divider label={<Group gap="xs"><IconShieldCheck size={14} /><span>{t("payments.verifactu")}</span></Group>} labelPosition="left" />

              <Box className="nv-card-compact" p="md" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--nv-border)" }}>
                <Group justify="space-between" mb="sm">
                  <Box>
                    <Text fw={600} size="sm">{t("payments.activarVerifactu")}</Text>
                    <Text size="xs" c="dimmed">{t("payments.envioDirectoAAeatCon")}</Text>
                  </Box>
                  <Switch
                    size="md"
                    color="green"
                    {...settingsForm.getInputProps("verifactu_enabled", { type: "checkbox" })}
                  />
                </Group>

                {settingsForm.values.verifactu_enabled && (
                  <Stack gap="sm">
                    <Select
                      label={t("payments.entornoDeEnvio")}
                      data={[
                        { value: "none", label: t("payments.soloHashLocalSinEnvio") },
                        { value: "direct_aeat_test", label: t("payments.preproduccionAeatPruebas") },
                        { value: "direct_aeat_prod", label: t("payments.produccionAeatReal") },
                      ]}
                      {...settingsForm.getInputProps("verifactu_mode")}
                    />

                    {(settingsForm.values.verifactu_mode === "direct_aeat_test" || settingsForm.values.verifactu_mode === "direct_aeat_prod") && (
                      <>
                        <Divider label={t("payments.certificadoDigitalFnmt")} labelPosition="left" variant="dashed" />

                        {certStatus?.has_certificate ? (
                          <Box p="md" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--nv-border)", background: "var(--nv-bg)" }}>
                            <Group justify="space-between" mb="sm">
                              <Group gap="xs">
                                <ThemeIcon size="md" radius="xl" variant="light" color={certStatus.is_expired ? "red" : "green"}>
                                  <IconShieldCheck size={16} />
                                </ThemeIcon>
                                <Box>
                                  <Text size="sm" fw={600}>{t("payments.certificadoConfigurado")}</Text>
                                  <Text size="xs" c="dimmed">{certStatus.subject}</Text>
                                </Box>
                              </Group>
                              <Badge color={certStatus.is_expired ? "red" : "green"} variant="light" size="sm">
                                {certStatus.is_expired ? "Expirado" : "Vigente"}
                              </Badge>
                            </Group>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                              {certStatus.nif && (
                                <Box>
                                  <Text size="xs" c="dimmed">NIF</Text>
                                  <Text size="sm" fw={500}>{certStatus.nif}</Text>
                                </Box>
                              )}
                              <Box>
                                <Text size="xs" c="dimmed">{t("payments.nSerie")}</Text>
                                <Text size="sm" fw={500} style={{ fontFamily: "monospace", fontSize: 11 }}>{certStatus.serial_number?.slice(0, 20)}...</Text>
                              </Box>
                              {certStatus.expires_at && (
                                <Box>
                                  <Text size="xs" c="dimmed">{t("payments.caduca")}</Text>
                                  <Text size="sm" fw={500}>{new Date(certStatus.expires_at).toLocaleDateString("es-ES")}</Text>
                                </Box>
                              )}
                              {certStatus.uploaded_at && (
                                <Box>
                                  <Text size="xs" c="dimmed">{t("payments.subido")}</Text>
                                  <Text size="sm" fw={500}>{new Date(certStatus.uploaded_at).toLocaleDateString("es-ES")}</Text>
                                </Box>
                              )}
                            </SimpleGrid>

                            {!showRevokeConfirm ? (
                              <Button
                                mt="md"
                                variant="subtle"
                                color="red"
                                size="xs"
                                leftSection={<IconTrash size={14} />}
                                onClick={() => setShowRevokeConfirm(true)}
                              >
                                {t("payments.revocarCertificado")}
                              </Button>
                            ) : (
                              <Alert color="red" mt="md" title={t("payments.revocarCertificado")} icon={<IconTrash size={16} />}>
                                <Text size="xs" mb="sm">{t("payments.seEliminaraDeFormaSegura")}</Text>
                                <Group gap="xs">
                                  <Button
                                    size="xs"
                                    color="red"
                                    loading={revokeCertificate.isPending}
                                    onClick={async () => {
                                      await revokeCertificate.mutateAsync();
                                      setShowRevokeConfirm(false);
                                    }}
                                  >
                                    {t("payments.siRevocar")}
                                  </Button>
                                  <Button size="xs" variant="subtle" onClick={() => setShowRevokeConfirm(false)}>
                                    {t("payments.cancelar")}
                                  </Button>
                                </Group>
                              </Alert>
                            )}
                          </Box>
                        ) : (
                          <Box p="md" style={{ borderRadius: "var(--radius-sm)", border: "2px dashed var(--nv-border)" }}>
                            <Dropzone
                              onDrop={(files) => setCertFile(files[0])}
                              maxSize={50 * 1024}
                              accept={{ "application/x-pkcs12": [".p12", ".pfx"] }}
                              multiple={false}
                              styles={{ inner: { pointerEvents: "all" } }}
                            >
                              <Group justify="center" gap="xl" mih={80} style={{ pointerEvents: "none" }}>
                                <Dropzone.Accept>
                                  <IconUpload size={40} stroke={1.5} color="var(--nv-primary)" />
                                </Dropzone.Accept>
                                <Dropzone.Reject>
                                  <IconX size={40} stroke={1.5} color="var(--mantine-color-red-6)" />
                                </Dropzone.Reject>
                                <Dropzone.Idle>
                                  <IconLock size={40} stroke={1.5} color="var(--nv-text-secondary)" />
                                </Dropzone.Idle>
                                <Box>
                                  <Text size="sm" fw={500}>
                                    {certFile ? certFile.name : "Arrastra tu certificado .p12 / .pfx aquí"}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {certFile ? `${formatDecimal(certFile.size / 1024, 1)} KB` : "Máximo 50 KB. El archivo solo se usa para extracción server-side."}
                                  </Text>
                                </Box>
                              </Group>
                            </Dropzone>

                            {certFile && (
                              <Stack gap="xs" mt="sm">
                                <PasswordInput
                                  label={t("payments.contrasenaDelCertificado")}
                                  placeholder={t("payments.introduceLaContrasenaDeTu")}
                                  value={certPassword}
                                  onChange={(e) => setCertPassword(e.currentTarget.value)}
                                  description={t("payments.soloSeUsaParaLa")}
                                />
                                <Button
                                  leftSection={<IconUpload size={16} />}
                                  loading={uploadCertificate.isPending}
                                  disabled={!certPassword}
                                  onClick={async () => {
                                    try {
                                      await uploadCertificate.mutateAsync({ file: certFile, password: certPassword });
                                      setCertFile(null);
                                      setCertPassword("");
                                    } catch { /* handled by hook */ }
                                  }}
                                >
                                  {t("payments.subirCertificado")}
                                </Button>
                              </Stack>
                            )}
                          </Box>
                        )}

                        <Divider label={t("payments.sistemaInformaticoObligatorioAeat")} labelPosition="left" variant="dashed" />
                        <Group grow>
                          <TextInput label={t("payments.razonSocialDesarrollador")} placeholder={settingsForm.values.business_name || "Tu empresa"} {...settingsForm.getInputProps("software_company_name")} />
                          <TextInput label={t("payments.nifDesarrollador")} placeholder={settingsForm.values.tax_id || "B12345678"} {...settingsForm.getInputProps("software_company_nif")} />
                        </Group>
                        <Group grow>
                          <TextInput label={t("payments.nombrePrograma")} {...settingsForm.getInputProps("software_name")} />
                          <TextInput label={t("payments.id2Chars")} maxLength={2} {...settingsForm.getInputProps("software_id")} />
                        </Group>
                        <Group grow>
                          <TextInput label={t("payments.version")} {...settingsForm.getInputProps("software_version")} />
                          <TextInput label={t("payments.nInstalacion")} {...settingsForm.getInputProps("software_install_number")} />
                        </Group>
                      </>
                    )}
                  </Stack>
                )}
              </Box>

              <Divider label={t("payments.diagnosticoVerifactu")} labelPosition="left" />
              <Box className="nv-card-compact" p="md" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--nv-border)" }}>
                <Text size="sm" c="dimmed" mb="sm">
                  {t("payments.ejecutaUnTestParaVerificar")}
                </Text>
                <Group>
                  <Button
                    variant="light"
                    leftSection={<IconShieldCheck size={16} />}
                    loading={testVerifactu.isPending}
                    onClick={async () => {
                      try {
                        const res = await testVerifactu.mutateAsync({ send_to_aeat: false });
                        setVerifactuTestResult(res.data as VeriFactuTestResult);
                      } catch { /* handled by hook */ }
                    }}
                  >
                    {t("payments.testLocal")}
                  </Button>
                  <Button
                    variant="filled"
                    color="orange"
                    leftSection={<IconShieldCheck size={16} />}
                    loading={testVerifactu.isPending}
                    disabled={!settingsForm.values.verifactu_enabled || !certStatus?.has_certificate}
                    onClick={async () => {
                      try {
                        const res = await testVerifactu.mutateAsync({ send_to_aeat: true });
                        setVerifactuTestResult(res.data as VeriFactuTestResult);
                      } catch { /* handled by hook */ }
                    }}
                  >
                    {t("payments.enviarAAeatPruebas")}
                  </Button>
                </Group>

                {verifactuTestResult && (
                  <Stack gap="xs" mt="md">
                    <Badge
                      size="lg"
                      color={verifactuTestResult.success ? "green" : "red"}
                      variant="light"
                    >
                      {verifactuTestResult.success ? "✓ Todos los checks pasaron" : "✗ Hay problemas que resolver"}
                    </Badge>

                    {verifactuTestResult.checks.map((check: { ok: boolean; detail: string }, i: number) => (
                      <Group key={i} gap="xs">
                        <ThemeIcon
                          size="xs"
                          radius="xl"
                          color={check.ok ? "green" : "red"}
                          variant="filled"
                        >
                          {check.ok ? <IconCheck size={10} /> : <IconX size={10} />}
                        </ThemeIcon>
                        <Text size="xs">{check.detail}</Text>
                      </Group>
                    ))}

                    {verifactuTestResult.verifactu_hash && (
                      <Box mt="xs" p="xs" style={{ background: "var(--nv-bg)", borderRadius: 8, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>
                        <Text size="xs" fw={600} mb={4}>{t("payments.hashSha256")}</Text>
                        {verifactuTestResult.verifactu_hash}
                      </Box>
                    )}
                    {verifactuTestResult.verifactu_qr_data && (
                      <Box p="xs" style={{ background: "var(--nv-bg)", borderRadius: 8, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>
                        <Text size="xs" fw={600} mb={4}>QR URL (AEAT):</Text>
                        {verifactuTestResult.verifactu_qr_data}
                      </Box>
                    )}
                    {(verifactuTestResult as any).aeat_response && (
                      <Box p="xs" style={{ background: "var(--nv-bg)", borderRadius: 8, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>
                        <Text size="xs" fw={600} mb={4}>{t("payments.respuestaAeat")}</Text>
                        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                          {JSON.stringify((verifactuTestResult as any).aeat_response, null, 2)}
                        </pre>
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
            </Stack>
          </ScrollArea.Autosize>

          <Group justify="flex-end" mt="lg">
            <Button onClick={closeSettingsModal} variant="default">{t("payments.cancelar")}</Button>
            <Button type="submit" loading={updateInvoiceSettings.isPending}>{t("payments.guardarConfiguracion")}</Button>
          </Group>
        </form>
      </BottomSheet>
    </Container>
  );
}

export default PaymentsPage;
