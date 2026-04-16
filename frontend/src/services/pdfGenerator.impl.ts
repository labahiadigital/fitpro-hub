/**
 * Client-side PDF generator for client plans (nutrition + workout)
 *
 * Page structure:
 *   1. Cover page (portrait) – plan title, image placeholder, client name
 *   2. Summary & objectives (portrait) – client data, macros chart, goals
 *   3. Stats & progress (portrait) – placeholders for future data
 *   4+ Workout plan (LANDSCAPE) – one day per page, expanded columns
 *   N+ Nutrition plan (portrait) – grouped by day, hierarchical meals
 *   Last: Legal disclaimer page (portrait)
 *
 * Uses jsPDF + jspdf-autotable
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============ INTERFACES ============

interface MealItem {
  id: string;
  food_id?: string;
  supplement_id?: string;
  food?: {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    serving_size?: string;
  };
  supplement?: {
    id: string;
    name: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    serving_size?: string;
  };
  quantity_grams: number;
  type: "food" | "supplement";
  recipe_name?: string;
  recipe_group?: string;
}

interface Meal {
  id: string;
  name: string;
  time?: string;
  items?: MealItem[];
  foods?: FoodItem[];
}

interface NutritionDayPlan {
  day: number;
  dayName?: string;
  meals: Meal[];
}

interface FoodItem {
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface SupplementData {
  name: string;
  dosage?: string;
  timing?: string;
  how_to_take?: string;
}

interface MealPlanData {
  id: string;
  name: string;
  description?: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  plan: {
    days: NutritionDayPlan[];
  };
  supplements?: SupplementData[];
  notes?: string;
  nutritional_advice?: string;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  exercise: {
    id: string;
    name: string;
    muscle_groups?: string[];
    video_url?: string;
    image_url?: string;
  };
  sets: number;
  reps: string;
  rest_seconds: number;
  duration_type?: "reps" | "seconds" | "minutes";
  notes?: string;
  km?: number;
  duration_minutes?: number;
  speed?: number;
}

interface WorkoutBlock {
  id: string;
  name: string;
  type: "warmup" | "main" | "cooldown" | "superset" | "circuit";
  exercises: WorkoutExercise[];
  rounds?: number;
}

interface WorkoutDay {
  id: string;
  day: number;
  dayName: string;
  blocks: WorkoutBlock[];
  isRestDay: boolean;
  notes?: string;
}

interface WorkoutProgramData {
  id: string;
  name: string;
  description?: string;
  duration_weeks?: number;
  difficulty?: string;
  days?: WorkoutDay[];
}

interface ClientData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  weight_kg?: number;
  height_cm?: number;
  body_fat_pct?: number;
  activity_level?: string;
  allergies?: string[];
  intolerances?: string[];
  goals?: string;
  health_data?: Record<string, any>;
  avatar_url?: string;
}

interface PDFOptions {
  workspaceName?: string;
  trainerName?: string;
  client?: ClientData;
  branding?: {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  };
  workspaceLogo?: string;
  progressData?: {
    currentWeight?: number;
    startWeight?: number;
    measurements?: Array<{
      date: string;
      weight_kg?: number;
      body_fat_percentage?: number;
      muscle_mass_kg?: number;
      waist_cm?: number;
      hip_cm?: number;
      chest_cm?: number;
      arm_cm?: number;
      thigh_cm?: number;
      notes?: string;
    }>;
    workoutCompletionRate?: number;
    totalWorkouts?: number;
    completedWorkouts?: number;
    nutritionComplianceRate?: number;
    weightHistory?: Array<{ date: string; weight: number; body_fat: number; muscle_mass: number }>;
    photos?: Array<{ url: string; type?: string; date?: string }>;
  };
}

// ============ DESIGN TOKENS ============

const C = {
  primary: [30, 90, 70] as [number, number, number],
  primaryLight: [235, 245, 240] as [number, number, number],
  secondary: [55, 130, 100] as [number, number, number],
  accent: [220, 165, 50] as [number, number, number],
  accentBg: [255, 248, 230] as [number, number, number],
  danger: [200, 50, 50] as [number, number, number],
  dangerBg: [255, 235, 235] as [number, number, number],
  text: [35, 35, 35] as [number, number, number],
  textMuted: [120, 120, 120] as [number, number, number],
  headerBg: [245, 247, 249] as [number, number, number],
  border: [220, 225, 230] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  proteinColor: [59, 130, 246] as [number, number, number],
  carbsColor: [34, 197, 94] as [number, number, number],
  fatColor: [249, 115, 22] as [number, number, number],
  coverBg: [240, 245, 242] as [number, number, number],
};

const MARGIN_P = 14;
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16) || 0, parseInt(h.substring(2, 4), 16) || 0, parseInt(h.substring(4, 6), 16) || 0];
}

function lighten(rgb: [number, number, number], factor = 0.85): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
}

function getBrandColors(branding?: PDFOptions["branding"]) {
  if (!branding) return C;
  const primary = branding.primary_color ? hexToRgb(branding.primary_color) : C.primary;
  const secondary = branding.secondary_color ? hexToRgb(branding.secondary_color) : C.secondary;
  const accent = branding.accent_color ? hexToRgb(branding.accent_color) : C.accent;
  return {
    ...C,
    primary,
    primaryLight: lighten(primary, 0.88),
    secondary,
    accent,
    accentBg: lighten(accent, 0.85),
    coverBg: lighten(primary, 0.92),
  };
}

// ============ HELPERS ============

function toNum(value: unknown, def = 0): number {
  if (value === null || value === undefined) return def;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(n) ? def : n;
}

function getItemMacros(item: MealItem) {
  const data = item.type === "food" ? item.food : item.supplement;
  if (!data) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const f = item.quantity_grams / 100;
  return {
    calories: toNum(data.calories) * f,
    protein: toNum(data.protein) * f,
    carbs: toNum(data.carbs) * f,
    fat: toNum(data.fat) * f,
  };
}

function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function genderLabel(g?: string): string {
  if (!g) return "—";
  const map: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };
  return map[g.toLowerCase()] || g;
}

function goalLabel(g?: string): string {
  if (!g) return "—";
  const map: Record<string, string> = {
    lose_weight: "Pérdida de peso", gain_muscle: "Ganancia muscular",
    maintain: "Mantenimiento", improve_fitness: "Mejorar condición física",
    sports_performance: "Rendimiento deportivo", rehabilitation: "Rehabilitación",
    general_health: "Salud general",
  };
  return map[g] || g;
}

function activityLabel(a?: string): string {
  if (!a) return "—";
  const map: Record<string, string> = {
    sedentary: "Sedentario", light: "Ligero", lightly_active: "Ligeramente activo",
    moderate: "Moderado", moderately_active: "Moderadamente activo",
    active: "Activo", very_active: "Muy activo", extra_active: "Extremadamente activo",
    intense: "Intenso",
  };
  return map[a.toLowerCase()] || a;
}

function difficultyLabel(d?: string): string {
  if (!d) return "";
  const map: Record<string, string> = {
    beginner: "Principiante", intermediate: "Intermedio",
    advanced: "Avanzado", expert: "Experto",
  };
  return map[d.toLowerCase()] || d;
}

function blockTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    warmup: "Calentamiento", main: "Principal", cooldown: "Estiramiento",
    superset: "Superserie", circuit: "Circuito",
  };
  return map[type || "main"] || "Principal";
}

function drawTopBar(doc: jsPDF, colors?: typeof C) {
  const cc = colors || C;
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...cc.primary);
  doc.rect(0, 0, pw, 4, "F");
}

function drawBottomBar(doc: jsPDF, colors?: typeof C) {
  const cc = colors || C;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...cc.primary);
  doc.rect(0, ph - 3, pw, 3, "F");
}

// ============ MAIN PDF GENERATOR ============

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateClientPlanPDF(
  mealPlan: MealPlanData | null,
  workoutProgram: WorkoutProgramData | null,
  options: PDFOptions = {}
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const { workspaceName = "Trackfiz", trainerName = "Entrenador", client, progressData, branding, workspaceLogo } = options;
  const brandColors = getBrandColors(branding);
  const clientName = client
    ? `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Cliente"
    : "Cliente";

  const planTitle = workoutProgram?.name || mealPlan?.name || "Plan Personalizado";

  let avatarDataUrl: string | null = null;
  if (client?.avatar_url) {
    avatarDataUrl = await loadImageAsDataUrl(client.avatar_url);
  }

  let logoDataUrl: string | null = null;
  if (workspaceLogo) {
    logoDataUrl = await loadImageAsDataUrl(workspaceLogo);
  }

  const exerciseImages = new Map<string, string>();
  if (workoutProgram?.days) {
    const urls = new Set<string>();
    for (const day of workoutProgram.days) {
      for (const block of day.blocks || []) {
        for (const ex of block.exercises || []) {
          if (ex.exercise?.image_url) urls.add(ex.exercise.image_url);
        }
      }
    }
    const loadPromises = [...urls].map(async (url) => {
      const data = await loadImageAsDataUrl(url);
      if (data) exerciseImages.set(url, data);
    });
    await Promise.allSettled(loadPromises);
  }

  // ================================================================
  //  PAGE 1 — COVER (PORTRAIT)
  // ================================================================
  renderCoverPage(doc, planTitle, clientName, workspaceName, trainerName, logoDataUrl, brandColors);

  // ================================================================
  //  PAGE 2 — SUMMARY + OBJECTIVES (PORTRAIT)
  // ================================================================
  doc.addPage("a4", "portrait");
  drawTopBar(doc, brandColors);
  renderSummaryPage(doc, client, mealPlan, workoutProgram, trainerName, avatarDataUrl, brandColors);

  // ================================================================
  //  PAGE 3 — STATS & PROGRESS (PORTRAIT)
  // ================================================================
  doc.addPage("a4", "portrait");
  drawTopBar(doc, brandColors);
  await renderProgressPage(doc, client, progressData, brandColors);

  // ================================================================
  //  WORKOUT PLAN — PORTRAIT PAGES (1 day per page)
  // ================================================================
  if (workoutProgram?.days && workoutProgram.days.length > 0) {
    renderWorkoutSection(doc, workoutProgram, exerciseImages, brandColors);
  }

  // ================================================================
  //  NUTRITION PLAN — PORTRAIT PAGES
  // ================================================================
  if (mealPlan) {
    renderNutritionSection(doc, mealPlan, brandColors);
    renderShoppingListPage(doc, mealPlan, brandColors);
  }

  // ================================================================
  //  LEGAL DISCLAIMER — LAST PAGE (PORTRAIT)
  // ================================================================
  renderDisclaimerPage(doc, workspaceName, brandColors);

  // ================================================================
  //  FOOTER ON ALL PAGES
  // ================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pagePw = doc.internal.pageSize.getWidth();
    const pagePh = doc.internal.pageSize.getHeight();
    drawBottomBar(doc, brandColors);
    doc.setFontSize(5.5);
    doc.setTextColor(...brandColors.textMuted);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${workspaceName} — ${new Date().toLocaleDateString("es-ES")} — Pág. ${i}/${totalPages}`,
      pagePw / 2, pagePh - 5, { align: "center" }
    );
  }

  const fileName = `plan_${clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}

// ================================================================
//  PAGE 1: COVER
// ================================================================

function renderCoverPage(doc: jsPDF, _planTitle: string, clientName: string, workspaceName: string, trainerName: string, logoDataUrl?: string | null, colors?: typeof C) {
  const cc = colors || C;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFillColor(...cc.coverBg);
  doc.rect(0, 0, pw, ph, "F");

  doc.setFillColor(...cc.primary);
  doc.rect(0, 0, pw, 6, "F");

  let nameY = 40;
  doc.setFontSize(22);
  doc.setTextColor(...cc.primary);
  doc.setFont("helvetica", "bold");
  doc.text(workspaceName, pw / 2, nameY, { align: "center" });

  doc.setDrawColor(...cc.primary);
  doc.setLineWidth(0.5);
  doc.line(pw / 2 - 30, nameY + 6, pw / 2 + 30, nameY + 6);

  if (logoDataUrl) {
    try {
      const logoSize = 130;
      doc.addImage(logoDataUrl, "PNG", pw / 2 - logoSize / 2, nameY + 14, logoSize, logoSize);
    } catch { /* ignore */ }
  }

  const bottomY = ph - 60;

  doc.setDrawColor(...cc.primary);
  doc.setLineWidth(0.3);
  doc.line(pw / 2 - 40, bottomY, pw / 2 + 40, bottomY);

  doc.setFontSize(10);
  doc.setTextColor(...cc.textMuted);
  doc.setFont("helvetica", "normal");
  doc.text("Preparado para", pw / 2, bottomY + 8, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(...cc.primary);
  doc.setFont("helvetica", "bold");
  doc.text(clientName, pw / 2, bottomY + 18, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(...cc.textMuted);
  doc.setFont("helvetica", "normal");
  doc.text(`Entrenador: ${trainerName}`, pw / 2, bottomY + 26, { align: "center" });
  doc.text(new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }), pw / 2, bottomY + 32, { align: "center" });
}

// ================================================================
//  PAGE 2: SUMMARY + OBJECTIVES
// ================================================================

function renderSummaryPage(
  doc: jsPDF,
  client: ClientData | undefined,
  mealPlan: MealPlanData | null,
  workoutProgram: WorkoutProgramData | null,
  trainerName: string,
  avatarDataUrl?: string | null,
  colors?: typeof C,
) {
  const cc = colors || C;
  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - MARGIN_P * 2;
  let y = 12;

  doc.setFontSize(14);
  doc.setTextColor(...cc.primary);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DEL CLIENTE", MARGIN_P, y);
  y += 2;
  doc.setDrawColor(...cc.primary);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_P, y, MARGIN_P + 55, y);
  y += 5;

  if (avatarDataUrl) {
    const avatarSize = 22;
    const avatarX = pw - MARGIN_P - avatarSize;
    const avatarY = 8;
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(avatarX - 1, avatarY - 1, avatarSize + 2, avatarSize + 2, 3, 3, "F");
      doc.setDrawColor(...cc.primary);
      doc.setLineWidth(0.5);
      doc.roundedRect(avatarX - 1, avatarY - 1, avatarSize + 2, avatarSize + 2, 3, 3, "S");
      doc.addImage(avatarDataUrl, "JPEG", avatarX, avatarY, avatarSize, avatarSize);
    } catch { /* ignore image errors */ }
  }

  const age = calcAge(client?.birth_date || client?.health_data?.birth_date);
  const actLevel = client?.activity_level || client?.health_data?.activity_level;
  const clientName = client ? `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Cliente" : "Cliente";

  const infoRows: string[][] = [
    ["Nombre", clientName, "Entrenador", trainerName],
    ["Género", genderLabel(client?.gender), "Edad", age ? `${age} años` : "—"],
    ["Peso", client?.weight_kg ? `${client.weight_kg} kg` : "—", "Altura", client?.height_cm ? `${client.height_cm} cm` : "—"],
    ["Objetivo", goalLabel(client?.goals), "Actividad", activityLabel(actLevel)],
  ];
  if (client?.body_fat_pct) {
    infoRows.push(["% Grasa", `${client.body_fat_pct}%`, "", ""]);
  }
  if (client?.email || client?.phone) {
    infoRows.push(["Email", client?.email || "—", "Teléfono", client?.phone || "—"]);
  }

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: cc.text },
    columnStyles: {
      0: { fontStyle: "bold", textColor: cc.textMuted, cellWidth: 28 },
      1: { cellWidth: 56 },
      2: { fontStyle: "bold", textColor: cc.textMuted, cellWidth: 28 },
      3: { cellWidth: 56 },
    },
    alternateRowStyles: { fillColor: cc.headerBg },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  const wt = toNum(client?.weight_kg);
  const ht = toNum(client?.height_cm);
  if (wt > 0 && ht > 0) {
    const imc = wt / ((ht / 100) ** 2);
    let imcCat = "Normopeso", imcCol = cc.secondary;
    if (imc < 18.5) { imcCat = "Bajo peso"; imcCol = cc.accent; }
    else if (imc >= 25 && imc < 30) { imcCat = "Sobrepeso"; imcCol = cc.accent; }
    else if (imc >= 30) { imcCat = "Obesidad"; imcCol = cc.danger; }

    doc.setFillColor(...cc.primaryLight);
    doc.roundedRect(MARGIN_P, y, contentW, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...cc.textMuted);
    doc.setFont("helvetica", "bold");
    doc.text("IMC:", MARGIN_P + 4, y + 6.5);
    doc.setTextColor(...imcCol);
    doc.text(`${imc.toFixed(1)} — ${imcCat}`, MARGIN_P + 18, y + 6.5);
    y += 13;
  }

  const allergies = client?.allergies || client?.health_data?.allergens || [];
  const intolerances = client?.intolerances || client?.health_data?.intolerances || [];
  const allRestrictions = [...allergies, ...intolerances];
  if (allRestrictions.length > 0) {
    doc.setFillColor(...cc.dangerBg);
    doc.roundedRect(MARGIN_P, y, contentW, 12, 2, 2, "F");
    doc.setDrawColor(...cc.danger);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_P, y, MARGIN_P, y + 12);
    doc.setFontSize(7);
    doc.setTextColor(...cc.danger);
    doc.setFont("helvetica", "bold");
    doc.text("RESTRICCIONES ALIMENTARIAS", MARGIN_P + 4, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...cc.text);
    doc.text(allRestrictions.join(", "), MARGIN_P + 4, y + 9);
    y += 15;
  }

  if (mealPlan) {
    doc.setFontSize(12);
    doc.setTextColor(...cc.primary);
    doc.setFont("helvetica", "bold");
    doc.text("OBJETIVOS NUTRICIONALES", MARGIN_P, y);
    y += 2;
    doc.setDrawColor(...cc.primary);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_P, y, MARGIN_P + 50, y);
    y += 4;

    const tCal = toNum(mealPlan.target_calories, 2000);
    const tPro = toNum(mealPlan.target_protein, 150);
    const tCarb = toNum(mealPlan.target_carbs, 200);
    const tFat = toNum(mealPlan.target_fat, 70);
    const proKcal = tPro * 4, carbKcal = tCarb * 4, fatKcal = tFat * 9;
    const totalKcal = proKcal + carbKcal + fatKcal;
    const proPct = totalKcal > 0 ? Math.round((proKcal / totalKcal) * 100) : 33;
    const carbPct = totalKcal > 0 ? Math.round((carbKcal / totalKcal) * 100) : 34;
    const fatPct = totalKcal > 0 ? 100 - proPct - carbPct : 33;

    const macroTableData = [
      ["", "Cantidad", "Kcal", "% Kcal"],
      ["Proteínas", `${Math.round(tPro)}g`, `${Math.round(proKcal)}`, `${proPct}%`],
      ["Carbohidratos", `${Math.round(tCarb)}g`, `${Math.round(carbKcal)}`, `${carbPct}%`],
      ["Grasas", `${Math.round(tFat)}g`, `${Math.round(fatKcal)}`, `${fatPct}%`],
      ["TOTAL", "", `${Math.round(totalKcal)}`, "100%"],
    ];

    const tableStartY = y;
    autoTable(doc, {
      startY: y, body: macroTableData, theme: "grid", tableWidth: 90,
      margin: { left: MARGIN_P },
      styles: { fontSize: 7.5, cellPadding: 2, textColor: cc.text, lineColor: cc.border, lineWidth: 0.3 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 28 }, 1: { halign: "center", cellWidth: 20 },
        2: { halign: "center", cellWidth: 20 }, 3: { halign: "center", cellWidth: 22 },
      },
      didParseCell: (data: any) => {
        if (data.row.index === 0) { data.cell.styles.fillColor = cc.primary; data.cell.styles.textColor = cc.white; data.cell.styles.fontStyle = "bold"; }
        if (data.row.index === 4) { data.cell.styles.fillColor = cc.primaryLight; data.cell.styles.fontStyle = "bold"; }
        if (data.column.index === 0) {
          if (data.row.index === 1) data.cell.styles.textColor = cc.proteinColor;
          if (data.row.index === 2) data.cell.styles.textColor = cc.carbsColor;
          if (data.row.index === 3) data.cell.styles.textColor = cc.fatColor;
        }
      },
    });

    const chartCX = MARGIN_P + 90 + 38;
    const chartCY = tableStartY + 18;
    const chartR = 16;
    const slices = [
      { pct: proPct, color: cc.proteinColor, label: "Proteínas" },
      { pct: carbPct, color: cc.carbsColor, label: "Carbohidratos" },
      { pct: fatPct, color: cc.fatColor, label: "Grasas" },
    ];
    let startAngle = -Math.PI / 2;
    for (const slice of slices) {
      if (slice.pct <= 0) continue;
      const sweep = (slice.pct / 100) * 2 * Math.PI;
      const end = startAngle + sweep;
      doc.setFillColor(...slice.color);
      doc.setDrawColor(...slice.color);
      doc.setLineWidth(0.1);
      const pts: [number, number][] = [[chartCX, chartCY]];
      const steps = Math.max(10, Math.round(sweep * 18));
      for (let j = 0; j <= steps; j++) {
        const a = startAngle + (sweep * j) / steps;
        pts.push([chartCX + chartR * Math.cos(a), chartCY + chartR * Math.sin(a)]);
      }
      for (let j = 1; j < pts.length - 1; j++) {
        doc.triangle(chartCX, chartCY, pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], "F");
      }
      startAngle = end;
    }
    doc.setFillColor(255, 255, 255);
    doc.circle(chartCX, chartCY, chartR * 0.55, "F");
    doc.setFontSize(10); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
    doc.text(`${Math.round(tCal)}`, chartCX, chartCY - 1, { align: "center" });
    doc.setFontSize(5.5); doc.setTextColor(...cc.textMuted);
    doc.text("kcal/día", chartCX, chartCY + 3, { align: "center" });

    const legY = chartCY + chartR + 4;
    let legX = chartCX - 24;
    for (const s of slices) {
      doc.setFillColor(...s.color); doc.rect(legX, legY, 2.5, 2.5, "F");
      doc.setFontSize(5.5); doc.setTextColor(...cc.text); doc.setFont("helvetica", "normal");
      doc.text(`${s.label} ${s.pct}%`, legX + 3.5, legY + 2.2);
      legX += 20;
    }
    y = Math.max((doc as any).lastAutoTable.finalY, legY + 4) + 5;
  }

  if (workoutProgram) {
    doc.setFontSize(12);
    doc.setTextColor(...cc.primary);
    doc.setFont("helvetica", "bold");
    doc.text("OBJETIVOS DE ENTRENAMIENTO", MARGIN_P, y);
    y += 2;
    doc.setDrawColor(...cc.primary);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_P, y, MARGIN_P + 55, y);
    y += 5;

    const wkRows: string[][] = [
      ["Programa", workoutProgram.name],
    ];
    if (workoutProgram.duration_weeks) wkRows.push(["Duración", `${workoutProgram.duration_weeks} semanas`]);
    if (workoutProgram.difficulty) wkRows.push(["Nivel", difficultyLabel(workoutProgram.difficulty)]);
    const activeDays = (workoutProgram.days || []).filter(d => !d.isRestDay && d.blocks?.some(b => b.exercises?.length > 0));
    wkRows.push(["Días activos", `${activeDays.length} días/semana`]);
    if (workoutProgram.description) wkRows.push(["Descripción", workoutProgram.description]);

    autoTable(doc, {
      startY: y, body: wkRows, theme: "plain",
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: cc.text },
      columnStyles: { 0: { fontStyle: "bold", textColor: cc.textMuted, cellWidth: 32 }, 1: {} },
      alternateRowStyles: { fillColor: cc.headerBg },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  const clientGoal = client?.goals || client?.health_data?.fitness_goal;
  if (clientGoal && mealPlan) {
    doc.setFillColor(...cc.accentBg);
    doc.roundedRect(MARGIN_P, y, contentW, 10, 2, 2, "F");
    doc.setFontSize(8); doc.setTextColor(...cc.textMuted); doc.setFont("helvetica", "bold");
    doc.text("Objetivo:", MARGIN_P + 4, y + 6.5);
    doc.setTextColor(...cc.primary);
    doc.text(`${goalLabel(clientGoal)} — ${Math.round(toNum(mealPlan.target_calories, 2000))} kcal/día`, MARGIN_P + 25, y + 6.5);
  }
}

// ================================================================
//  PAGE 3: STATS & PROGRESS (placeholders)
// ================================================================

async function renderProgressPage(doc: jsPDF, client: ClientData | undefined, progressData?: PDFOptions["progressData"], colors?: typeof C) {
  const cc = colors || C;
  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - MARGIN_P * 2;
  let y = 12;

  doc.setFontSize(14); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
  doc.text("ESTADÍSTICAS Y PROGRESO", MARGIN_P, y);
  y += 2;
  doc.setDrawColor(...cc.primary); doc.setLineWidth(0.4); doc.line(MARGIN_P, y, MARGIN_P + 55, y);
  y += 6;

  doc.setFontSize(10); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
  doc.text("Situación Actual", MARGIN_P, y);
  y += 4;

  const currentWeight = progressData?.currentWeight || client?.weight_kg;
  const startWeight = progressData?.startWeight;
  const statusRows: string[][] = [];
  if (currentWeight) statusRows.push(["Peso actual", `${currentWeight} kg`]);
  if (startWeight) statusRows.push(["Peso inicial", `${startWeight} kg`]);
  if (currentWeight && startWeight) statusRows.push(["Variación", `${(currentWeight - startWeight).toFixed(1)} kg`]);
  if (client?.body_fat_pct) statusRows.push(["% Grasa corporal", `${client.body_fat_pct}%`]);
  if (client?.height_cm) statusRows.push(["Altura", `${client.height_cm} cm`]);
  if (currentWeight && client?.height_cm) {
    const imc = currentWeight / ((client.height_cm / 100) ** 2);
    statusRows.push(["IMC", `${imc.toFixed(1)}`]);
  }
  if (statusRows.length === 0) statusRows.push(["Estado", "Sin datos registrados aún"]);

  autoTable(doc, {
    startY: y, body: statusRows, theme: "plain",
    styles: { fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 }, textColor: cc.text },
    columnStyles: { 0: { fontStyle: "bold", textColor: cc.textMuted, cellWidth: 38 }, 1: {} },
    alternateRowStyles: { fillColor: cc.headerBg },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  const measurements = progressData?.measurements || [];
  doc.setFontSize(10); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
  doc.text("Evolución de Medidas", MARGIN_P, y);
  y += 4;

  if (measurements.length > 0) {
    const measHead = ["Fecha", "Peso (kg)", "% Grasa", "M. Muscular", "Cintura", "Cadera", "Pecho", "Brazo", "Muslo"];
    const measBody = measurements.map(m => [
      new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" }),
      m.weight_kg != null ? `${m.weight_kg}` : "—",
      m.body_fat_percentage != null ? `${m.body_fat_percentage}%` : "—",
      m.muscle_mass_kg != null ? `${m.muscle_mass_kg}` : "—",
      m.waist_cm != null ? `${m.waist_cm}` : "—",
      m.hip_cm != null ? `${m.hip_cm}` : "—",
      m.chest_cm != null ? `${m.chest_cm}` : "—",
      m.arm_cm != null ? `${m.arm_cm}` : "—",
      m.thigh_cm != null ? `${m.thigh_cm}` : "—",
    ]);

    autoTable(doc, {
      startY: y, head: [measHead], body: measBody, theme: "grid",
      tableWidth: contentW, margin: { left: MARGIN_P },
      headStyles: { fillColor: cc.primary, textColor: cc.white, fontSize: 6, fontStyle: "bold" },
      styles: { fontSize: 6, cellPadding: 1.5, textColor: cc.text, lineColor: cc.border, lineWidth: 0.15, halign: "center" },
      columnStyles: { 0: { halign: "left", cellWidth: 22 } },
      alternateRowStyles: { fillColor: cc.headerBg },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  } else {
    doc.setFontSize(7); doc.setTextColor(...cc.textMuted); doc.setFont("helvetica", "italic");
    doc.text("No hay mediciones registradas todavía. Consulta tu perfil en la app para añadir medidas.", MARGIN_P, y);
    y += 8;
  }

  const halfW = (contentW - 4) / 2;

  doc.setFontSize(10); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
  doc.text("Cumplimiento", MARGIN_P, y);
  y += 5;

  const drawMiniBox = (x: number, yPos: number, w: number, title: string, value: string, subtitle: string, color: [number, number, number]) => {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, yPos, w, 24, 2, 2, "F");
    doc.setDrawColor(...cc.border); doc.setLineWidth(0.3);
    doc.roundedRect(x, yPos, w, 24, 2, 2, "S");
    doc.setFillColor(...color);
    doc.roundedRect(x, yPos, w, 6, 2, 2, "F");
    doc.rect(x, yPos + 3, w, 3, "F");
    doc.setFontSize(7); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text(title, x + 3, yPos + 4.2);
    doc.setFontSize(14); doc.setTextColor(...color); doc.setFont("helvetica", "bold");
    doc.text(value, x + w / 2, yPos + 15, { align: "center" });
    doc.setFontSize(6); doc.setTextColor(...cc.textMuted); doc.setFont("helvetica", "normal");
    doc.text(subtitle, x + w / 2, yPos + 20, { align: "center" });
  };

  const completionRate = progressData?.workoutCompletionRate;
  const totalWk = progressData?.totalWorkouts;
  const completedWk = progressData?.completedWorkouts;
  const wkValue = completionRate != null ? `${completionRate}%` : "—";
  const wkSub = totalWk != null && completedWk != null ? `${completedWk}/${totalWk} sesiones` : "Sin datos";

  const nutritionRate = progressData?.nutritionComplianceRate;
  const nutValue = nutritionRate != null ? `${nutritionRate}%` : "—";
  const nutSub = nutritionRate != null ? "objetivos diarios" : "Sin datos";

  drawMiniBox(MARGIN_P, y, halfW, "ENTRENAMIENTOS", wkValue, wkSub, cc.primary);
  drawMiniBox(MARGIN_P + halfW + 4, y, halfW, "NUTRICIÓN", nutValue, nutSub, cc.secondary);
  y += 30;

  const weightHist = progressData?.weightHistory || [];
  if (weightHist.length >= 2) {
    if (y > 220) { doc.addPage("a4", "portrait"); drawTopBar(doc, cc); y = 12; }
    doc.setFontSize(10); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
    doc.text("Evolución Corporal", MARGIN_P, y);
    y += 5;

    const chartW = contentW;
    const chartH = 55;
    const chartX = MARGIN_P;
    const chartY = y;

    doc.setFillColor(250, 250, 250);
    doc.roundedRect(chartX, chartY, chartW, chartH, 2, 2, "F");
    doc.setDrawColor(...cc.border); doc.setLineWidth(0.2);
    doc.roundedRect(chartX, chartY, chartW, chartH, 2, 2, "S");

    const padX = 8;
    const padY = 5;
    const innerW = chartW - padX * 2;
    const innerH = chartH - padY * 2 - 6;

    type SeriesConfig = { values: number[]; color: [number, number, number]; label: string };
    const series: SeriesConfig[] = [];
    const weights = weightHist.map(w => w.weight).filter(v => v > 0);
    if (weights.length >= 2) series.push({ values: weightHist.map(w => w.weight), color: cc.primary, label: "Peso (kg)" });
    const fatValues = weightHist.map(w => w.body_fat || 0);
    if (fatValues.some(v => v > 0)) series.push({ values: fatValues, color: cc.danger, label: "% Grasa" });
    const muscleValues = weightHist.map(w => w.muscle_mass || 0);
    if (muscleValues.some(v => v > 0)) series.push({ values: muscleValues, color: cc.proteinColor, label: "M. Muscular (kg)" });

    const allVals = series.flatMap(s => s.values.filter(v => v > 0));
    const minV = Math.min(...allVals) - 1;
    const maxV = Math.max(...allVals) + 1;
    const rangeV = maxV - minV || 1;

    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.1);
    for (let g = 0; g <= 4; g++) {
      const gy = chartY + padY + (innerH * g) / 4;
      doc.line(chartX + padX, gy, chartX + padX + innerW, gy);
      const val = maxV - (rangeV * g) / 4;
      doc.setFontSize(4.5); doc.setTextColor(150, 150, 150);
      doc.text(`${val.toFixed(0)}`, chartX + 1, gy + 1.5);
    }

    for (const s of series) {
      doc.setDrawColor(...s.color); doc.setLineWidth(0.5);
      for (let i = 1; i < weightHist.length; i++) {
        if (s.values[i - 1] <= 0 || s.values[i] <= 0) continue;
        const x1 = chartX + padX + (innerW * (i - 1)) / (weightHist.length - 1);
        const y1 = chartY + padY + innerH - ((s.values[i - 1] - minV) / rangeV) * innerH;
        const x2 = chartX + padX + (innerW * i) / (weightHist.length - 1);
        const y2 = chartY + padY + innerH - ((s.values[i] - minV) / rangeV) * innerH;
        doc.line(x1, y1, x2, y2);
      }
      for (let i = 0; i < weightHist.length; i++) {
        if (s.values[i] <= 0) continue;
        const dotX = chartX + padX + (innerW * i) / (weightHist.length - 1);
        const dotY = chartY + padY + innerH - ((s.values[i] - minV) / rangeV) * innerH;
        doc.setFillColor(...s.color);
        doc.circle(dotX, dotY, 0.7, "F");
      }
    }

    if (weightHist.length > 0) {
      doc.setFontSize(4.5); doc.setTextColor(...cc.textMuted);
      const firstDate = new Date(weightHist[0].date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
      const lastDate = new Date(weightHist[weightHist.length - 1].date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
      doc.text(firstDate, chartX + padX, chartY + chartH - 1);
      doc.text(lastDate, chartX + padX + innerW - 8, chartY + chartH - 1);
    }

    const legendY = chartY + chartH - 5;
    let legendX = chartX + padX + 20;
    for (const s of series) {
      doc.setFillColor(...s.color);
      doc.circle(legendX, legendY, 1, "F");
      doc.setFontSize(4.5); doc.setTextColor(...cc.text); doc.setFont("helvetica", "normal");
      doc.text(s.label, legendX + 2.5, legendY + 1);
      legendX += doc.getTextWidth(s.label) + 8;
    }

    y = chartY + chartH + 5;
  }

  const photos = progressData?.photos || [];
  const frontPhotos = photos.filter(p => !p.type || p.type === "front" || p.type === "unknown").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (frontPhotos.length >= 1) {
    if (y > 200) { doc.addPage("a4", "portrait"); drawTopBar(doc, cc); y = 12; }
    doc.setFontSize(10); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
    doc.text("Evolución Física", MARGIN_P, y);
    y += 5;

    const firstPhoto = frontPhotos[0];
    const lastPhoto = frontPhotos.length > 1 ? frontPhotos[frontPhotos.length - 1] : null;
    const photoW = 45;
    const photoH = 60;
    const gap = 10;

    const photosToDraw = lastPhoto ? [firstPhoto, lastPhoto] : [firstPhoto];
    const totalW = photosToDraw.length * photoW + (photosToDraw.length - 1) * gap;
    let px = MARGIN_P + (contentW - totalW) / 2;

    for (const photo of photosToDraw) {
      try {
        const imgData = await loadImageAsDataUrl(photo.url);
        if (imgData) {
          doc.addImage(imgData, "JPEG", px, y, photoW, photoH);
          doc.setDrawColor(...cc.border); doc.setLineWidth(0.3);
          doc.rect(px, y, photoW, photoH, "S");
          if (photo.date) {
            doc.setFontSize(5.5); doc.setTextColor(...cc.textMuted); doc.setFont("helvetica", "normal");
            doc.text(new Date(photo.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" }), px + photoW / 2, y + photoH + 3, { align: "center" });
          }
        }
      } catch { /* ignore load errors */ }
      px += photoW + gap;
    }
    y += photoH + 8;
  }

  doc.setFillColor(...cc.accentBg);
  doc.roundedRect(MARGIN_P, y, contentW, 10, 2, 2, "F");
  doc.setFontSize(7); doc.setTextColor(...cc.accent); doc.setFont("helvetica", "bold");
  doc.text("NOTA", MARGIN_P + 4, y + 4);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...cc.text); doc.setFontSize(6.5);
  doc.text("Los datos detallados de progreso y gráficas de evolución están disponibles en tu perfil de la aplicación.", MARGIN_P + 4, y + 8);
}

// ================================================================
//  WORKOUT SECTION — LANDSCAPE, 1 DAY PER PAGE
// ================================================================

function renderWorkoutSection(doc: jsPDF, workoutProgram: WorkoutProgramData, exerciseImages: Map<string, string>, colors?: typeof C) {
  const cc = colors || C;
  const activeDays = (workoutProgram.days || []).filter(d => {
    if (d.isRestDay) return false;
    return (d.blocks || []).some(b => b.exercises && b.exercises.length > 0);
  });
  const restDays = (workoutProgram.days || []).filter(d => d.isRestDay);

  const IMG_COL_W = 14;
  const IMG_SIZE = 10;

  for (let i = 0; i < activeDays.length; i++) {
    const day = activeDays[i];
    doc.addPage("a4", "portrait");
    drawTopBar(doc, cc);
    const pw = doc.internal.pageSize.getWidth();
    const contentW = pw - MARGIN_P * 2;
    let y = 12;

    if (i === 0) {
      doc.setFontSize(13); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
      doc.text("PLAN DE ENTRENAMIENTO", MARGIN_P, y);
      let sub = workoutProgram.name;
      if (workoutProgram.duration_weeks) sub += ` — ${workoutProgram.duration_weeks} sem.`;
      if (workoutProgram.difficulty) sub += ` — ${difficultyLabel(workoutProgram.difficulty)}`;
      doc.setFontSize(8); doc.setTextColor(...cc.secondary); doc.setFont("helvetica", "normal");
      doc.text(sub, MARGIN_P + 62, y);
      y += 8;
    }

    const dayName = day.dayName || DAY_NAMES[(day.day - 1) % 7] || `Día ${day.day}`;
    doc.setFillColor(...cc.primary);
    doc.roundedRect(MARGIN_P, y, contentW, 7, 1.5, 1.5, "F");
    doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text(dayName, MARGIN_P + 4, y + 5);
    y += 9;

    const exerciseImageMap: { row: number; dataUrl: string }[] = [];
    const rows: (string | { content: string; styles?: Record<string, unknown> })[][] = [];
    for (const block of day.blocks || []) {
      const bName = block.name || blockTypeLabel(block.type);
      for (let j = 0; j < (block.exercises || []).length; j++) {
        const ex = block.exercises[j];
        const isCardio = /cinta|andar|caminar|bici|cycling|running|cardio|elíptica/i.test(ex.exercise?.name || "");

        const imgUrl = ex.exercise?.image_url;
        if (imgUrl && exerciseImages.has(imgUrl)) {
          exerciseImageMap.push({ row: rows.length, dataUrl: exerciseImages.get(imgUrl)! });
        }

        rows.push([
          j === 0 ? bName : "",
          ex.exercise?.name || "Ejercicio",
          "",
          `${ex.sets}`,
          typeof ex.reps === "string" ? ex.reps : `${ex.reps}`,
          `${ex.rest_seconds}s`,
          isCardio && ex.km ? `${ex.km}` : "",
          isCardio && ex.duration_minutes ? `${ex.duration_minutes}'` : "",
          isCardio && ex.speed ? `${ex.speed}` : "",
          ex.exercise?.video_url ? { content: "Ver", styles: { textColor: [59, 130, 246] } } : "",
        ]);
      }
    }

    const remainingW = contentW - 24 - IMG_COL_W - 10 - 13 - 12 - 12 - 12 - 12 - 14;

    autoTable(doc, {
      startY: y,
      head: [["Bloque", "Ejercicio", "Img", "Ser.", "Reps", "Desc.", "Km", "Tpo.", "Vel.", "URL"]],
      body: rows,
      theme: "grid",
      tableWidth: contentW,
      margin: { left: MARGIN_P },
      headStyles: { fillColor: cc.headerBg, textColor: cc.text, fontSize: 6, fontStyle: "bold", lineColor: cc.border, lineWidth: 0.2 },
      styles: { fontSize: 6, cellPadding: 1.5, textColor: cc.text, lineColor: cc.border, lineWidth: 0.15, overflow: "ellipsize", minCellHeight: IMG_SIZE + 2 },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: "bold" },
        1: { cellWidth: remainingW },
        2: { cellWidth: IMG_COL_W, halign: "center" },
        3: { cellWidth: 10, halign: "center" },
        4: { cellWidth: 13, halign: "center" },
        5: { cellWidth: 12, halign: "center" },
        6: { cellWidth: 12, halign: "center" },
        7: { cellWidth: 12, halign: "center" },
        8: { cellWidth: 12, halign: "center" },
        9: { cellWidth: 14, halign: "center" },
      },
      alternateRowStyles: { fillColor: cc.headerBg },
      showHead: "firstPage",
      rowPageBreak: "avoid",
      didDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index === 2) {
          const match = exerciseImageMap.find(e => e.row === data.row.index);
          if (match) {
            const cellX = data.cell.x + (data.cell.width - IMG_SIZE) / 2;
            const cellY = data.cell.y + (data.cell.height - IMG_SIZE) / 2;
            try {
              doc.addImage(match.dataUrl, "JPEG", cellX, cellY, IMG_SIZE, IMG_SIZE);
            } catch { /* ignore */ }
          }
        }
        if (data.section === "body" && data.column.index === 9) {
          const cellContent = rows[data.row.index]?.[9];
          if (cellContent && typeof cellContent === "object" && "content" in cellContent) {
            const ex = activeDays[i].blocks.flatMap(b => b.exercises)[data.row.index];
            if (ex?.exercise?.video_url) {
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: ex.exercise.video_url });
            }
          }
        }
      },
    });

    if (day.notes) {
      const tblEnd = (doc as any).lastAutoTable.finalY + 3;
      doc.setFontSize(6.5); doc.setTextColor(...cc.textMuted); doc.setFont("helvetica", "italic");
      doc.text(`Notas: ${day.notes}`, MARGIN_P, tblEnd);
    }
  }

  if (restDays.length > 0) {
    const lastContentW = doc.internal.pageSize.getWidth() - MARGIN_P * 2;
    const lastY = (doc as any).lastAutoTable?.finalY || 20;
    const restY = lastY + 8;
    doc.setFillColor(...cc.headerBg);
    doc.roundedRect(MARGIN_P, restY, lastContentW, 7, 1, 1, "F");
    doc.setFontSize(7); doc.setTextColor(...cc.textMuted); doc.setFont("helvetica", "italic");
    const restNames = restDays.map(d => d.dayName || DAY_NAMES[(d.day - 1) % 7]).join(", ");
    doc.text(`Días de descanso: ${restNames}`, MARGIN_P + 3, restY + 4.5);
  }
}

// ================================================================
//  NUTRITION SECTION — PORTRAIT, 1 DAY PER PAGE
// ================================================================

function renderNutritionSection(doc: jsPDF, mealPlan: MealPlanData, brandColors?: typeof C) {
  const cc = brandColors || C;
  const plan = mealPlan.plan as any;
  const allDays: NutritionDayPlan[] = [];
  if (plan?.weeks && Array.isArray(plan.weeks)) {
    for (const w of plan.weeks) {
      for (const d of (w.days || [])) {
        allDays.push({ ...d, dayName: d.dayName ? `S${w.week} - ${d.dayName}` : `Semana ${w.week} - Día ${d.day}` });
      }
    }
  } else if (plan?.days) {
    allDays.push(...plan.days);
  }
  const days = allDays.filter(d => {
    const meals = d.meals || [];
    return meals.length > 0 && meals.some(m => (m.items && m.items.length > 0) || (m.foods && m.foods.length > 0));
  });
  if (days.length === 0) return;

  for (let di = 0; di < days.length; di++) {
    const day = days[di];
    doc.addPage("a4", "portrait");
    drawTopBar(doc, cc);
    const pw = doc.internal.pageSize.getWidth();
    const contentW = pw - MARGIN_P * 2;
    let y = 12;

    if (di === 0) {
      doc.setFontSize(13); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
      doc.text("PLAN NUTRICIONAL", MARGIN_P, y);
      doc.setFontSize(8); doc.setTextColor(...cc.secondary); doc.setFont("helvetica", "normal");
      doc.text(mealPlan.name, MARGIN_P + 48, y);
      y += 8;
    }

    const dayName = day.dayName || DAY_NAMES[(day.day - 1) % 7] || `Día ${day.day}`;
    doc.setFillColor(...cc.secondary);
    doc.roundedRect(MARGIN_P, y, contentW, 7, 1.5, 1.5, "F");
    doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text(dayName, MARGIN_P + 4, y + 5);
    y += 10;

    let dayCalTotal = 0, dayPTotal = 0, dayCTotal = 0, dayFTotal = 0;

    for (const meal of day.meals || []) {
      const mealLabel = meal.name + (meal.time ? ` (${meal.time})` : "");

      const items = meal.items || [];
      const legacyFoods = meal.foods || [];

      interface FoodEntry { name: string; qty: string; cal: number; p: number; c: number; f: number }
      interface RecipeGroup { name: string; foods: FoodEntry[] }
      const groups: Array<RecipeGroup | FoodEntry> = [];
      let currentRecipe: RecipeGroup | null = null;

      if (items.length > 0) {
        for (const item of items) {
          const data = item.type === "food" ? item.food : item.supplement;
          if (!data) continue;
          const m = getItemMacros(item);
          const recipeName = item.recipe_group || item.recipe_name || "";
          if (recipeName && (!currentRecipe || currentRecipe.name !== recipeName)) {
            currentRecipe = { name: recipeName, foods: [] };
            groups.push(currentRecipe);
          } else if (!recipeName && currentRecipe) {
            currentRecipe = null;
          }
          const entry: FoodEntry = {
            name: data.name || "—",
            qty: `${Math.round(item.quantity_grams)}g`,
            cal: m.calories, p: m.protein, c: m.carbs, f: m.fat,
          };
          if (currentRecipe) {
            currentRecipe.foods.push(entry);
          } else {
            groups.push(entry);
          }
        }
      } else if (legacyFoods.length > 0) {
        for (const food of legacyFoods) {
          groups.push({
            name: food.name || "—", qty: `${Math.round(toNum(food.quantity, 100))}g`,
            cal: toNum(food.calories), p: toNum(food.protein), c: toNum(food.carbs), f: toNum(food.fat),
          });
        }
      }

      // Build rows: Comida | Receta | Alimento | Cant | Kcal | P | C | G
      // _meta: "recipe" | "food-in-recipe" | "food-standalone" | "separator" | "total"
      const tableRows: Array<{ cells: string[]; meta: string }> = [];
      let mealCal = 0, mealP = 0, mealC = 0, mealF = 0;
      let isFirstRow = true;
      let lastWasRecipe = false;

      for (const group of groups) {
        if ("foods" in group) {
          // Recipe group
          if (lastWasRecipe) {
            tableRows.push({ cells: ["", "", "", "", "", "", "", ""], meta: "separator" });
          }
          const rCal = group.foods.reduce((s, i) => s + i.cal, 0);
          const rP = group.foods.reduce((s, i) => s + i.p, 0);
          const rC = group.foods.reduce((s, i) => s + i.c, 0);
          const rF = group.foods.reduce((s, i) => s + i.f, 0);
          const comidaCell = isFirstRow ? mealLabel : "";
          tableRows.push({ cells: [comidaCell, group.name, "", "", Math.round(rCal).toString(), rP.toFixed(1), rC.toFixed(1), rF.toFixed(1)], meta: "recipe" });
          isFirstRow = false;
          for (const fd of group.foods) {
            tableRows.push({ cells: ["", "", fd.name, fd.qty, Math.round(fd.cal).toString(), fd.p.toFixed(1), fd.c.toFixed(1), fd.f.toFixed(1)], meta: "food-in-recipe" });
            mealCal += fd.cal; mealP += fd.p; mealC += fd.c; mealF += fd.f;
          }
          lastWasRecipe = true;
        } else {
          // Standalone food
          if (lastWasRecipe) {
            tableRows.push({ cells: ["", "", "", "", "", "", "", ""], meta: "separator" });
            lastWasRecipe = false;
          }
          const comidaCell = isFirstRow ? mealLabel : "";
          tableRows.push({ cells: [comidaCell, "", group.name, group.qty, Math.round(group.cal).toString(), group.p.toFixed(1), group.c.toFixed(1), group.f.toFixed(1)], meta: "food-standalone" });
          mealCal += group.cal; mealP += group.p; mealC += group.c; mealF += group.f;
          isFirstRow = false;
        }
      }

      if (isFirstRow && tableRows.length === 0) {
        tableRows.push({ cells: [mealLabel, "", "", "", "", "", "", ""], meta: "food-standalone" });
      }

      dayCalTotal += mealCal; dayPTotal += mealP; dayCTotal += mealC; dayFTotal += mealF;
      tableRows.push({ cells: ["TOTAL", "", "", "", Math.round(mealCal).toString(), mealP.toFixed(1), mealC.toFixed(1), mealF.toFixed(1)], meta: "total" });

      const bodyRows = tableRows.map(r => r.cells);

      autoTable(doc, {
        startY: y,
        head: [["Comida", "Receta", "Alimento", "Cant.", "Kcal", "P", "C", "G"]],
        body: bodyRows,
        theme: "grid",
        tableWidth: contentW,
        margin: { left: MARGIN_P },
        headStyles: { fillColor: cc.headerBg, textColor: cc.text, fontSize: 6.5, fontStyle: "bold", lineColor: cc.border, lineWidth: 0.2 },
        styles: { fontSize: 6, cellPadding: 1.5, textColor: cc.text, lineColor: cc.border, lineWidth: 0.15, overflow: "ellipsize" },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 28 },
          2: { cellWidth: contentW - 28 - 28 - 14 - 12 - 10 - 10 - 10 },
          3: { halign: "center", cellWidth: 14 },
          4: { halign: "center", cellWidth: 12 },
          5: { halign: "center", cellWidth: 10 },
          6: { halign: "center", cellWidth: 10 },
          7: { halign: "center", cellWidth: 10 },
        },
        showHead: "firstPage",
        rowPageBreak: "avoid",
        didParseCell: (data: any) => {
          if (data.section !== "body") return;
          const meta = tableRows[data.row.index]?.meta;
          if (meta === "total") {
            data.cell.styles.fillColor = cc.primaryLight;
            data.cell.styles.fontStyle = "bold";
          } else if (meta === "recipe") {
            data.cell.styles.fillColor = cc.accentBg;
            if (data.column.index === 1) data.cell.styles.fontStyle = "bold";
          } else if (meta === "separator") {
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.cellPadding = 0.5;
            data.cell.styles.minCellHeight = 1.5;
          }
          if (meta !== "separator" && meta !== "total" && data.column.index === 0 && data.cell.raw) {
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    doc.setFillColor(...cc.primaryLight);
    doc.roundedRect(MARGIN_P, y, contentW, 8, 2, 2, "F");
    doc.setFontSize(7.5); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
    doc.text(
      `Total del día:  ${Math.round(dayCalTotal)} kcal  |  P: ${dayPTotal.toFixed(1)}g  |  C: ${dayCTotal.toFixed(1)}g  |  G: ${dayFTotal.toFixed(1)}g`,
      MARGIN_P + 4, y + 5.5
    );
  }

  // Supplements
  const supplements = mealPlan.supplements || [];
  if (supplements.length > 0) {
    doc.addPage("a4", "portrait");
    drawTopBar(doc, cc);
    const pw = doc.internal.pageSize.getWidth();
    const contentW = pw - MARGIN_P * 2;
    let y = 12;
    doc.setFontSize(12); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
    doc.text("SUPLEMENTACIÓN", MARGIN_P, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Suplemento", "Dosis / Modo de empleo", "Momento"]],
      body: supplements.map(s => [s.name, s.dosage || s.how_to_take || "—", s.timing || "—"]),
      theme: "grid", tableWidth: contentW, margin: { left: MARGIN_P },
      headStyles: { fillColor: cc.secondary, textColor: cc.white, fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2, textColor: cc.text, lineColor: cc.border, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: cc.headerBg },
    });
  }

  if (mealPlan.notes || mealPlan.nutritional_advice) {
    const currentPw = doc.internal.pageSize.getWidth();
    const cW = currentPw - MARGIN_P * 2;
    let ny = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 60;
    doc.setFontSize(8); doc.setTextColor(...cc.primary); doc.setFont("helvetica", "bold");
    doc.text("Notas:", MARGIN_P, ny);
    ny += 4;
    doc.setFontSize(7); doc.setTextColor(...cc.text); doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(mealPlan.nutritional_advice || mealPlan.notes || "", cW);
    doc.text(noteLines, MARGIN_P, ny);
  }
}

// ================================================================
//  SHOPPING LIST PAGE
// ================================================================

function renderShoppingListPage(doc: jsPDF, mealPlan: MealPlanData, colors?: typeof C) {
  const cc = colors || C;
  const days = mealPlan.plan?.days || [];
  if (days.length === 0) return;

  const foodMap = new Map<string, { name: string; totalGrams: number }>();

  for (const day of days) {
    for (const meal of day.meals || []) {
      const items = meal.items || [];
      const legacyFoods = meal.foods || [];

      for (const item of items) {
        const data = item.type === "supplement" ? item.supplement : item.food;
        if (!data) continue;
        const key = data.name?.toLowerCase().trim() || "";
        if (!key) continue;
        const existing = foodMap.get(key);
        if (existing) {
          existing.totalGrams += item.quantity_grams || 0;
        } else {
          foodMap.set(key, { name: data.name, totalGrams: item.quantity_grams || 0 });
        }
      }

      for (const food of legacyFoods) {
        const key = food.name?.toLowerCase().trim() || "";
        if (!key) continue;
        const existing = foodMap.get(key);
        const qty = typeof food.quantity === "number" ? food.quantity : 100;
        if (existing) {
          existing.totalGrams += qty;
        } else {
          foodMap.set(key, { name: food.name, totalGrams: qty });
        }
      }
    }
  }

  if (foodMap.size === 0) return;

  const sortedFoods = [...foodMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));

  doc.addPage("a4", "portrait");
  drawTopBar(doc, cc);
  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - MARGIN_P * 2;
  let y = 12;

  doc.setFontSize(12);
  doc.setTextColor(...cc.primary);
  doc.setFont("helvetica", "bold");
  doc.text("LISTA DE LA COMPRA SEMANAL", MARGIN_P, y);
  y += 3;

  doc.setFontSize(7);
  doc.setTextColor(...cc.textMuted);
  doc.setFont("helvetica", "normal");
  doc.text("Cantidades totales aproximadas para una semana de plan nutricional", MARGIN_P, y + 3);
  y += 8;

  const bodyRows = sortedFoods.map((f, i) => [
    (i + 1).toString(),
    f.name,
    `${Math.round(f.totalGrams)} g`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Alimento", "Cantidad total"]],
    body: bodyRows,
    theme: "grid",
    tableWidth: contentW,
    margin: { left: MARGIN_P },
    headStyles: {
      fillColor: cc.headerBg,
      textColor: cc.text,
      fontSize: 7,
      fontStyle: "bold",
      lineColor: cc.border,
      lineWidth: 0.2,
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      textColor: cc.text,
      lineColor: cc.border,
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: contentW - 10 - 28 },
      2: { cellWidth: 28, halign: "center" },
    },
    alternateRowStyles: { fillColor: cc.headerBg },
  });
}

// ================================================================
//  LAST PAGE: LEGAL DISCLAIMER
// ================================================================

function renderDisclaimerPage(doc: jsPDF, workspaceName: string, colors?: typeof C) {
  const cc = colors || C;
  doc.addPage("a4", "portrait");
  drawTopBar(doc, cc);
  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - MARGIN_P * 2;
  let y = 16;

  doc.setFontSize(14); doc.setTextColor(...cc.danger); doc.setFont("helvetica", "bold");
  doc.text("AVISO LEGAL Y RENUNCIA DE RESPONSABILIDAD", pw / 2, y, { align: "center" });
  y += 3;
  doc.setDrawColor(...cc.danger); doc.setLineWidth(0.4);
  doc.line(MARGIN_P + 20, y, pw - MARGIN_P - 20, y);
  y += 8;

  doc.setFontSize(7.5); doc.setTextColor(...cc.text); doc.setFont("helvetica", "normal");

  const paragraphs = [
    "La información contenida en este plan tiene fines exclusivamente informativos y educativos. No pretende sustituir el consejo, diagnóstico o tratamiento médico profesional.",
    "Antes de comenzar cualquier programa de ejercicios o cambiar su dieta, se recomienda encarecidamente consultar con un médico o profesional de la salud calificado, especialmente si tiene condiciones preexistentes, está embarazada o toma medicación.",
    "Al participar en esta rutina, usted acepta que lo hace bajo su propio riesgo, de forma voluntaria, y asume toda la responsabilidad por cualquier lesión o daño que pueda sufrir.",
    "Los resultados pueden variar en función del esfuerzo individual, la genética y el punto de partida. No se garantizan resultados específicos.",
  ];

  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, contentW);
    doc.text(lines, MARGIN_P, y);
    y += lines.length * 3.5 + 3;
  }

  y += 4;
  doc.setFillColor(...cc.dangerBg);
  doc.roundedRect(MARGIN_P, y, contentW, 42, 3, 3, "F");
  doc.setDrawColor(...cc.danger); doc.setLineWidth(0.5);
  doc.line(MARGIN_P, y, MARGIN_P, y + 42);

  doc.setFontSize(8); doc.setTextColor(...cc.danger); doc.setFont("helvetica", "bold");
  doc.text("AVISO LEGAL", MARGIN_P + 5, y + 6);

  doc.setFontSize(7); doc.setTextColor(...cc.text); doc.setFont("helvetica", "normal");
  const legalText = `Al utilizar este Plan de Entrenamiento / Dieta, usted reconoce que el ejercicio físico y los cambios nutricionales conllevan riesgos para la salud. ${workspaceName} no se hace responsable de las lesiones, enfermedades o problemas de salud derivados de la aplicación de este contenido.\n\nEste documento no constituye una receta médica. Es responsabilidad del usuario asegurarse de que está físicamente apto para realizar las actividades propuestas. Si siente dolor, mareos o molestias graves, deténgase de inmediato y busque atención médica.`;
  const legalLines = doc.splitTextToSize(legalText, contentW - 12);
  doc.text(legalLines, MARGIN_P + 5, y + 12);

  y += 48;

  doc.setFillColor(...cc.accentBg);
  doc.roundedRect(MARGIN_P, y, contentW, 28, 3, 3, "F");
  doc.setDrawColor(...cc.accent); doc.setLineWidth(0.5);
  doc.line(MARGIN_P, y, MARGIN_P, y + 28);

  doc.setFontSize(8); doc.setTextColor(...cc.accent); doc.setFont("helvetica", "bold");
  doc.text("NOTA SOBRE LOS DATOS", MARGIN_P + 5, y + 6);

  doc.setFontSize(7); doc.setTextColor(...cc.text); doc.setFont("helvetica", "normal");
  const dataDisclaimer = "Trackfiz no es responsable de los datos mostrados en este documento. La información aquí contenida ha sido confeccionada por el profesional y el cliente que utilizan la plataforma. Este documento es únicamente una plantilla que muestra los datos reflejados por los usuarios de la aplicación.";
  const dataLines = doc.splitTextToSize(dataDisclaimer, contentW - 12);
  doc.text(dataLines, MARGIN_P + 5, y + 12);

  y += 34;
  doc.setFontSize(6.5); doc.setTextColor(...cc.textMuted); doc.setFont("helvetica", "italic");
  doc.text(`Documento generado el ${new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}`, pw / 2, y, { align: "center" });
}

// ============ LEGACY EXPORTS ============

export async function generateMealPlanPDF(
  mealPlan: MealPlanData,
  options: PDFOptions = {}
): Promise<void> {
  await generateClientPlanPDF(mealPlan, null, options);
}

export async function generateWorkoutProgramPDF(
  program: WorkoutProgramData,
  options: PDFOptions = {}
): Promise<void> {
  await generateClientPlanPDF(null, program, options);
}
