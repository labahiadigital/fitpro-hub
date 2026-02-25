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

export function useInvoices(params?: { status?: string; client_id?: string; series?: string; from_date?: string; to_date?: string }) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: async () => erpApi.listInvoices(params),
    select: (res) => res.data as Invoice[],
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

export function useInvoiceSettings() {
  return useQuery({
    queryKey: ["invoice-settings"],
    queryFn: async () => erpApi.getSettings(),
    select: (res) => res.data as InvoiceSettings | null,
  });
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: ["invoice-stats"],
    queryFn: async () => erpApi.getInvoiceStats(),
    select: (res) => res.data as InvoiceStats,
  });
}

export function useNextInvoiceNumber(series?: string) {
  return useQuery({
    queryKey: ["next-invoice-number", series],
    queryFn: async () => erpApi.getNextNumber(series),
    select: (res) => res.data as { next_number: string; series: string },
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
      notifications.show({ title: "Factura creada", message: "La factura se ha creado correctamente", color: "green" });
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
      notifications.show({ title: "Factura actualizada", message: "Los cambios se han guardado", color: "green" });
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
      notifications.show({ title: "Factura eliminada", message: "La factura en borrador ha sido eliminada", color: "green" });
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
      notifications.show({ title: "Factura finalizada", message: "La factura ha sido emitida con hash VeriFactu", color: "green" });
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
      notifications.show({ title: "Factura pagada", message: "La factura se ha marcado como pagada", color: "green" });
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
      notifications.show({ title: "Email enviado", message: "La factura se ha enviado por email", color: "green" });
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
      notifications.show({ title: "Factura duplicada", message: "Se ha creado una copia como borrador", color: "green" });
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
      notifications.show({ title: "Factura rectificativa creada", message: "Se ha creado la factura rectificativa como borrador", color: "green" });
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
      notifications.show({ title: "Configuración guardada", message: "La configuración de facturación se ha actualizado", color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al guardar configuración", color: "red" });
    },
  });
}

// ── Certificate ──

export function useCertificateStatus() {
  return useQuery({
    queryKey: ["certificate-status"],
    queryFn: async () => erpApi.getCertificateStatus(),
    select: (res) => res.data as CertificateStatus,
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
      notifications.show({ title: "Certificado subido", message: "El certificado se ha configurado correctamente", color: "green" });
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
      notifications.show({ title: "Certificado revocado", message: "El certificado ha sido eliminado de forma segura", color: "green" });
    },
    onError: (e: any) => {
      notifications.show({ title: "Error", message: e?.response?.data?.detail || "Error al revocar el certificado", color: "red" });
    },
  });
}
