import i18next from "i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpApi } from "../services/api";
import { notifications } from "@mantine/notifications";

// ── Types ──

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_type: string;
  discount_value: number;
  tax_rate: number | null;
  tax_name?: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  position: number;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  invoice_number: string;
  invoice_series: string;
  invoice_type: string;
  client_id?: string;
  client_name: string;
  client_tax_id?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_country: string;
  client_email?: string;
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  discount_type: string;
  discount_value: number;
  tax_rate: number;
  tax_name: string;
  notes?: string;
  internal_notes?: string;
  payment_method?: string;
  payment_reference?: string;
  related_invoice_id?: string;
  pdf_url?: string;
  verifactu_status?: string;
  verifactu_hash?: string;
  verifactu_uuid?: string;
  verifactu_qr_data?: string;
  items: InvoiceItem[];
  created_at: string;
}

export interface InvoiceSettings {
  id: string;
  workspace_id: string;
  business_name: string;
  tax_id?: string;
  nif_type: string;
  address?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  country: string;
  phone?: string;
  email?: string;
  invoice_prefix: string;
  invoice_next_number: number;
  rectificative_prefix: string;
  rectificative_next_number: number;
  default_tax_rate: number;
  default_tax_name: string;
  payment_terms_days: number;
  default_payment_method: string;
  bank_account?: string;
  bank_name?: string;
  footer_text?: string;
  terms_and_conditions?: string;
  logo_url?: string;
  verifactu_enabled: boolean;
  verifactu_mode: string;
  software_company_name?: string;
  software_company_nif?: string;
  software_name?: string;
  software_id?: string;
  software_version?: string;
  software_install_number?: string;
  created_at: string;
}

export interface CertificateStatus {
  has_certificate: boolean;
  subject?: string;
  serial_number?: string;
  nif?: string;
  expires_at?: string;
  uploaded_at?: string;
  is_expired: boolean;
}

export interface InvoiceStats {
  total_invoiced: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  invoices_count: number;
  invoices_this_month: number;
  period_start: string;
  period_end: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  user_name?: string;
  created_at: string;
}

// ── Queries ──

export function useInvoices(
  params?: { status?: string; client_id?: string; series?: string; from_date?: string; to_date?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: async () => erpApi.listInvoices(params),
    select: (res) => res.data as Invoice[],
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => erpApi.getInvoice(id!),
    select: (res) => res.data as Invoice,
    enabled: !!id,
  });
}

export function useInvoiceSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["invoice-settings"],
    queryFn: async () => erpApi.getSettings(),
    select: (res) => res.data as InvoiceSettings | null,
    enabled: options?.enabled ?? true,
    // Settings rarely change — keep them fresh for 5 minutes so tab switches
    // and modal opens don't re-hit the backend.
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvoiceStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["invoice-stats"],
    queryFn: async () => erpApi.getInvoiceStats(),
    select: (res) => res.data as InvoiceStats,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}

export function useNextInvoiceNumber(series?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["next-invoice-number", series],
    queryFn: async () => erpApi.getNextNumber(series),
    select: (res) => res.data as { next_number: string; series: string },
    // Only meaningful while the invoice modal is open; don't pre-fetch it.
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}

export function useInvoiceAuditLog(invoiceId: string | null) {
  return useQuery({
    queryKey: ["invoice-audit-log", invoiceId],
    queryFn: async () => erpApi.getInvoiceAuditLog(invoiceId!),
    select: (res) => res.data as AuditLogEntry[],
    enabled: !!invoiceId,
  });
}

// ── Mutations ──

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: object) => erpApi.createInvoice(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice-stats"] });
      qc.invalidateQueries({ queryKey: ["next-invoice-number"] });
      notifications.show({ title: i18next.t("hooks.invoiceCreated"), message: i18next.t("hooks.invoiceCreatedMsg"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al crear factura", color: "red" });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => erpApi.updateInvoice(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
      qc.invalidateQueries({ queryKey: ["invoice-stats"] });
      notifications.show({ title: i18next.t("hooks.invoiceUpdated"), message: i18next.t("hooks.itemChangesSaved"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al actualizar factura", color: "red" });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => erpApi.deleteInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice-stats"] });
      notifications.show({ title: i18next.t("hooks.invoiceDeleted"), message: i18next.t("hooks.invoiceDraftDeleted"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al eliminar factura", color: "red" });
    },
  });
}

export function useFinalizeInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => erpApi.finalizeInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
      qc.invalidateQueries({ queryKey: ["invoice-stats"] });
      notifications.show({ title: i18next.t("hooks.invoiceFinalized"), message: "La factura ha sido emitida con hash VeriFactu", color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al finalizar factura", color: "red" });
    },
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_method, payment_reference }: { id: string; payment_method?: string; payment_reference?: string }) =>
      erpApi.markInvoicePaid(id, { payment_method, payment_reference }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
      qc.invalidateQueries({ queryKey: ["invoice-stats"] });
      notifications.show({ title: i18next.t("hooks.invoicePaid"), message: i18next.t("hooks.invoicePaidMsg"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al marcar como pagada", color: "red" });
    },
  });
}

export function useSendInvoiceEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => erpApi.sendInvoiceEmail(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
      notifications.show({ title: i18next.t("hooks.emailSent"), message: i18next.t("hooks.invoiceEmailSent"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al enviar email", color: "red" });
    },
  });
}

export function useDuplicateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => erpApi.duplicateInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice-stats"] });
      qc.invalidateQueries({ queryKey: ["next-invoice-number"] });
      notifications.show({ title: i18next.t("hooks.invoiceDuplicated"), message: i18next.t("hooks.invoiceDuplicatedMsg"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al duplicar factura", color: "red" });
    },
  });
}

export function useCreateRectificative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => erpApi.rectifyInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
      qc.invalidateQueries({ queryKey: ["invoice-stats"] });
      qc.invalidateQueries({ queryKey: ["next-invoice-number"] });
      notifications.show({ title: i18next.t("hooks.rectInvoiceCreated"), message: i18next.t("hooks.rectInvoiceCreatedMsg"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al crear rectificativa", color: "red" });
    },
  });
}

export interface VeriFactuTestResult {
  success: boolean;
  invoice_number: string;
  invoice_type: string;
  verifactu_hash?: string;
  verifactu_uuid?: string;
  verifactu_qr_data?: string;
  verifactu_status?: string;
  verifactu_record?: Record<string, unknown>;
  aeat_response?: Record<string, unknown>;
  hash_chain_valid: boolean;
  settings_configured: boolean;
  checks: Array<{ check: string; ok: boolean; detail: string }>;
}

export function useTestVerifactu() {
  return useMutation({
    mutationFn: async (data?: object) => erpApi.testVerifactu(data),
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al ejecutar test VeriFactu", color: "red" });
    },
  });
}

export function useUpdateInvoiceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: object) => erpApi.saveSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-settings"] });
      notifications.show({ title: i18next.t("hooks.configSaved"), message: i18next.t("hooks.billingConfigUpdated"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al guardar configuración", color: "red" });
    },
  });
}

// ── Certificate ──

export function useCertificateStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["certificate-status"],
    queryFn: async () => erpApi.getCertificateStatus(),
    select: (res) => res.data as CertificateStatus,
    enabled: options?.enabled ?? true,
    // Certificate status changes only when the user uploads/revokes a cert.
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, password }: { file: File; password: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", password);
      return erpApi.uploadCertificate(formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificate-status"] });
      qc.invalidateQueries({ queryKey: ["invoice-settings"] });
      notifications.show({ title: i18next.t("hooks.certificateUploaded"), message: i18next.t("hooks.certificateConfigured"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al subir el certificado", color: "red" });
    },
  });
}

export function useRevokeCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => erpApi.revokeCertificate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificate-status"] });
      qc.invalidateQueries({ queryKey: ["invoice-settings"] });
      notifications.show({ title: i18next.t("hooks.certificateRevoked"), message: i18next.t("hooks.certificateRevokedMsg"), color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al revocar el certificado", color: "red" });
    },
  });
}
