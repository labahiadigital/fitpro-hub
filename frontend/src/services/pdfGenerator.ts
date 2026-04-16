/**
 * Lazy proxy for pdfGenerator.impl.ts.
 *
 * jsPDF + jspdf-autotable + their transitive deps (html2canvas, canvg, fflate,
 * dompurify…) add ~700 KB to the bundle that otherwise has no business being
 * downloaded until the user clicks "Exportar PDF".
 *
 * By re-exporting these as dynamic wrappers we keep every call site unchanged
 * while deferring the heavy import until the function is actually invoked.
 * The chunk lands in `vendor-pdf` (see vite.config.ts manualChunks) and is
 * fetched once, cached by the browser, and reused across subsequent exports.
 */
import type {
  generateClientPlanPDF as GenerateClientPlanPDF,
  generateMealPlanPDF as GenerateMealPlanPDF,
  generateWorkoutProgramPDF as GenerateWorkoutProgramPDF,
} from "./pdfGenerator.impl";

const loadImpl = () => import("./pdfGenerator.impl");

export const generateClientPlanPDF: typeof GenerateClientPlanPDF = async (...args) => {
  const mod = await loadImpl();
  return mod.generateClientPlanPDF(...args);
};

export const generateMealPlanPDF: typeof GenerateMealPlanPDF = async (...args) => {
  const mod = await loadImpl();
  return mod.generateMealPlanPDF(...args);
};

export const generateWorkoutProgramPDF: typeof GenerateWorkoutProgramPDF = async (...args) => {
  const mod = await loadImpl();
  return mod.generateWorkoutProgramPDF(...args);
};
