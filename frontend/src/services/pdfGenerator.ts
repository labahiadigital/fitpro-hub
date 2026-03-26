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
}

interface PDFOptions {
  workspaceName?: string;
  trainerName?: string;
  client?: ClientData;
  progressData?: {
    currentWeight?: number;
    startWeight?: number;
    measurements?: Array<{ date: string; weight_kg?: number; body_fat_percentage?: number }>;
    workoutCompletionRate?: number;
    totalWorkouts?: number;
    completedWorkouts?: number;
    nutritionComplianceRate?: number;
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
const M = 10;
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
// ============ HELPERS ============

function toNum(value: unknown, def = 0): number {
  if (value === null || value === undefined) return def;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(n) ? def : n;
}

function getItemMacros(item: MealItem) {
  const data = item.type === "food" ? item.food : item.supplement;
  if (!data) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const serving = parseFloat(data.serving_size || "100") || 100;
  const f = item.quantity_grams / serving;
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

function drawTopBar(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pw, 4, "F");
}

function drawBottomBar(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...C.primary);
  doc.rect(0, ph - 3, pw, 3, "F");
}

// ============ MAIN PDF GENERATOR ============

export function generateClientPlanPDF(
  mealPlan: MealPlanData | null,
  workoutProgram: WorkoutProgramData | null,
  options: PDFOptions = {}
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const { workspaceName = "Trackfiz", trainerName = "Entrenador", client, progressData } = options;
  const clientName = client
    ? `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Cliente"
    : "Cliente";

  const planTitle = workoutProgram?.name || mealPlan?.name || "Plan Personalizado";

  // ================================================================
  //  PAGE 1 — COVER (PORTRAIT)
  // ================================================================
  renderCoverPage(doc, planTitle, clientName, workspaceName, trainerName);

  // ================================================================
  //  PAGE 2 — SUMMARY + OBJECTIVES (PORTRAIT)
  // ================================================================
  doc.addPage("a4", "portrait");
  drawTopBar(doc);
  renderSummaryPage(doc, client, mealPlan, workoutProgram, trainerName);

  // ================================================================
  //  PAGE 3 — STATS & PROGRESS (PORTRAIT)
  // ================================================================
  doc.addPage("a4", "portrait");
  drawTopBar(doc);
  renderProgressPage(doc, client, progressData);

  // ================================================================
  //  WORKOUT PLAN — LANDSCAPE PAGES (1 day per page)
  // ================================================================
  if (workoutProgram?.days && workoutProgram.days.length > 0) {
    renderWorkoutSection(doc, workoutProgram);
  }

  // ================================================================
  //  NUTRITION PLAN — PORTRAIT PAGES
  // ================================================================
  if (mealPlan) {
    renderNutritionSection(doc, mealPlan);
  }

  // ================================================================
  //  LEGAL DISCLAIMER — LAST PAGE (PORTRAIT)
  // ================================================================
  renderDisclaimerPage(doc, workspaceName);

  // ================================================================
  //  FOOTER ON ALL PAGES
  // ================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pagePw = doc.internal.pageSize.getWidth();
    const pagePh = doc.internal.pageSize.getHeight();
    drawBottomBar(doc);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.textMuted);
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

function renderCoverPage(doc: jsPDF, planTitle: string, clientName: string, workspaceName: string, trainerName: string) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFillColor(...C.coverBg);
  doc.rect(0, 0, pw, ph, "F");

  drawTopBar(doc);

  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pw, 6, "F");

  doc.setFontSize(14);
  doc.setTextColor(...C.secondary);
  doc.setFont("helvetica", "normal");
  doc.text(workspaceName, pw / 2, 28, { align: "center" });

  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.line(pw / 2 - 30, 34, pw / 2 + 30, 34);

  doc.setFontSize(26);
  doc.setTextColor(...C.primary);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(planTitle, pw - 60);
  doc.text(titleLines, pw / 2, 52, { align: "center" });

  const imageY = 75;
  const imageW = 120;
  const imageH = 100;
  const imageX = (pw - imageW) / 2;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(imageX, imageY, imageW, imageH, 4, 4, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(imageX, imageY, imageW, imageH, 4, 4, "S");

  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
  doc.setFont("helvetica", "italic");
  doc.text("Espacio reservado para imagen", pw / 2, imageY + imageH / 2, { align: "center" });

  const bottomY = ph - 60;

  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.3);
  doc.line(pw / 2 - 40, bottomY, pw / 2 + 40, bottomY);

  doc.setFontSize(10);
  doc.setTextColor(...C.textMuted);
  doc.setFont("helvetica", "normal");
  doc.text("Preparado para", pw / 2, bottomY + 8, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(...C.primary);
  doc.setFont("helvetica", "bold");
  doc.text(clientName, pw / 2, bottomY + 18, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
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
) {
  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - MARGIN_P * 2;
  let y = 12;

  doc.setFontSize(14);
  doc.setTextColor(...C.primary);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DEL CLIENTE", MARGIN_P, y);
  y += 2;
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_P, y, MARGIN_P + 55, y);
  y += 5;

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
    styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: C.text },
    columnStyles: {
      0: { fontStyle: "bold", textColor: C.textMuted, cellWidth: 28 },
      1: { cellWidth: 56 },
      2: { fontStyle: "bold", textColor: C.textMuted, cellWidth: 28 },
      3: { cellWidth: 56 },
    },
    alternateRowStyles: { fillColor: C.headerBg },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  const wt = toNum(client?.weight_kg);
  const ht = toNum(client?.height_cm);
  if (wt > 0 && ht > 0) {
    const imc = wt / ((ht / 100) ** 2);
    let imcCat = "Normopeso", imcCol = C.secondary;
    if (imc < 18.5) { imcCat = "Bajo peso"; imcCol = C.accent; }
    else if (imc >= 25 && imc < 30) { imcCat = "Sobrepeso"; imcCol = C.accent; }
    else if (imc >= 30) { imcCat = "Obesidad"; imcCol = C.danger; }

    doc.setFillColor(...C.primaryLight);
    doc.roundedRect(MARGIN_P, y, contentW, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
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
    doc.setFillColor(...C.dangerBg);
    doc.roundedRect(MARGIN_P, y, contentW, 12, 2, 2, "F");
    doc.setDrawColor(...C.danger);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_P, y, MARGIN_P, y + 12);
    doc.setFontSize(7);
    doc.setTextColor(...C.danger);
    doc.setFont("helvetica", "bold");
    doc.text("RESTRICCIONES ALIMENTARIAS", MARGIN_P + 4, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.text);
    doc.text(allRestrictions.join(", "), MARGIN_P + 4, y + 9);
    y += 15;
  }

  // --- MACRONUTRIENT OBJECTIVES ---
  if (mealPlan) {
    doc.setFontSize(12);
    doc.setTextColor(...C.primary);
    doc.setFont("helvetica", "bold");
    doc.text("OBJETIVOS NUTRICIONALES", MARGIN_P, y);
    y += 2;
    doc.setDrawColor(...C.primary);
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
      styles: { fontSize: 7.5, cellPadding: 2, textColor: C.text, lineColor: C.border, lineWidth: 0.3 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 28 }, 1: { halign: "center", cellWidth: 20 },
        2: { halign: "center", cellWidth: 20 }, 3: { halign: "center", cellWidth: 22 },
      },
      didParseCell: (data: any) => {
        if (data.row.index === 0) { data.cell.styles.fillColor = C.primary; data.cell.styles.textColor = C.white; data.cell.styles.fontStyle = "bold"; }
        if (data.row.index === 4) { data.cell.styles.fillColor = C.primaryLight; data.cell.styles.fontStyle = "bold"; }
        if (data.column.index === 0) {
          if (data.row.index === 1) data.cell.styles.textColor = C.proteinColor;
          if (data.row.index === 2) data.cell.styles.textColor = C.carbsColor;
          if (data.row.index === 3) data.cell.styles.textColor = C.fatColor;
        }
      },
    });

    const chartCX = MARGIN_P + 90 + 38;
    const chartCY = tableStartY + 18;
    const chartR = 16;
    const slices = [
      { pct: proPct, color: C.proteinColor, label: "Proteínas" },
      { pct: carbPct, color: C.carbsColor, label: "Carbohidratos" },
      { pct: fatPct, color: C.fatColor, label: "Grasas" },
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
    doc.setFontSize(10); doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold");
    doc.text(`${Math.round(tCal)}`, chartCX, chartCY - 1, { align: "center" });
    doc.setFontSize(5.5); doc.setTextColor(...C.textMuted);
    doc.text("kcal/día", chartCX, chartCY + 3, { align: "center" });

    const legY = chartCY + chartR + 4;
    let legX = chartCX - 24;
    for (const s of slices) {
      doc.setFillColor(...s.color); doc.rect(legX, legY, 2.5, 2.5, "F");
      doc.setFontSize(5.5); doc.setTextColor(...C.text); doc.setFont("helvetica", "normal");
      doc.text(`${s.label} ${s.pct}%`, legX + 3.5, legY + 2.2);
      legX += 20;
    }
    y = Math.max((doc as any).lastAutoTable.finalY, legY + 4) + 5;
  }

  // --- WORKOUT OBJECTIVES ---
  if (workoutProgram) {
    doc.setFontSize(12);
    doc.setTextColor(...C.primary);
    doc.setFont("helvetica", "bold");
    doc.text("OBJETIVOS DE ENTRENAMIENTO", MARGIN_P, y);
    y += 2;
    doc.setDrawColor(...C.primary);
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
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: C.text },
      columnStyles: { 0: { fontStyle: "bold", textColor: C.textMuted, cellWidth: 32 }, 1: {} },
      alternateRowStyles: { fillColor: C.headerBg },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  const clientGoal = client?.goals || client?.health_data?.fitness_goal;
  if (clientGoal && mealPlan) {
    doc.setFillColor(...C.accentBg);
    doc.roundedRect(MARGIN_P, y, contentW, 10, 2, 2, "F");
    doc.setFontSize(8); doc.setTextColor(...C.textMuted); doc.setFont("helvetica", "bold");
    doc.text("Objetivo:", MARGIN_P + 4, y + 6.5);
    doc.setTextColor(...C.primary);
    doc.text(`${goalLabel(clientGoal)} — ${Math.round(toNum(mealPlan.target_calories, 2000))} kcal/día`, MARGIN_P + 25, y + 6.5);
  }
}

// ================================================================
//  PAGE 3: STATS & PROGRESS (placeholders)
// ================================================================

function renderProgressPage(doc: jsPDF, client: ClientData | undefined, progressData?: PDFOptions["progressData"]) {
  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - MARGIN_P * 2;
  let y = 12;

  doc.setFontSize(14); doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold");
  doc.text("ESTADÍSTICAS Y PROGRESO", MARGIN_P, y);
  y += 2;
  doc.setDrawColor(...C.primary); doc.setLineWidth(0.4); doc.line(MARGIN_P, y, MARGIN_P + 55, y);
  y += 6;

  const halfW = (contentW - 4) / 2;
  const boxH = 50;

  const drawStatBox = (x: number, yPos: number, w: number, h: number, title: string, content: string) => {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, yPos, w, h, 3, 3, "F");
    doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.roundedRect(x, yPos, w, h, 3, 3, "S");

    doc.setFillColor(...C.primary);
    doc.roundedRect(x, yPos, w, 7, 3, 3, "F");
    doc.rect(x, yPos + 4, w, 3, "F");
    doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text(title, x + 4, yPos + 5);

    doc.setFontSize(7); doc.setTextColor(...C.textMuted); doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(content, w - 8);
    doc.text(lines, x + 4, yPos + 13);
  };

  const currentWeight = progressData?.currentWeight || client?.weight_kg;
  const startWeight = progressData?.startWeight;
  const weightStr = currentWeight ? `Peso actual: ${currentWeight} kg` : "Sin datos de peso registrados";
  const weightDelta = (currentWeight && startWeight) ? `\nCambio: ${(currentWeight - startWeight).toFixed(1)} kg` : "";
  const bfStr = client?.body_fat_pct ? `\n% Grasa corporal: ${client.body_fat_pct}%` : "";

  drawStatBox(MARGIN_P, y, halfW, boxH, "SITUACIÓN ACTUAL", weightStr + weightDelta + bfStr + "\n\nDatos registrados hasta la fecha.");
  drawStatBox(MARGIN_P + halfW + 4, y, halfW, boxH, "EVOLUCIÓN DE MEDIDAS", "Gráfica de evolución disponible en la app.\n\nConsulta tu perfil para ver la evolución de peso, medidas corporales y % grasa.");
  y += boxH + 6;

  const completionRate = progressData?.workoutCompletionRate;
  const totalWk = progressData?.totalWorkouts;
  const completedWk = progressData?.completedWorkouts;
  let wkContent = "Consulta la app para ver tus estadísticas de entrenamiento.";
  if (completionRate !== undefined) {
    wkContent = `Tasa de cumplimiento: ${completionRate}%`;
    if (totalWk !== undefined && completedWk !== undefined) wkContent += `\nSesiones: ${completedWk}/${totalWk}`;
  }

  const nutritionRate = progressData?.nutritionComplianceRate;
  let nutContent = "Consulta la app para ver tu cumplimiento nutricional diario.";
  if (nutritionRate !== undefined) nutContent = `Tasa de cumplimiento: ${nutritionRate}%`;

  drawStatBox(MARGIN_P, y, halfW, boxH, "CUMPLIMIENTO DE ENTRENAMIENTOS", wkContent);
  drawStatBox(MARGIN_P + halfW + 4, y, halfW, boxH, "CUMPLIMIENTO NUTRICIONAL", nutContent);
  y += boxH + 8;

  doc.setFillColor(...C.accentBg);
  doc.roundedRect(MARGIN_P, y, contentW, 12, 2, 2, "F");
  doc.setFontSize(7); doc.setTextColor(...C.accent); doc.setFont("helvetica", "bold");
  doc.text("NOTA", MARGIN_P + 4, y + 5);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...C.text); doc.setFontSize(6.5);
  doc.text("Los datos detallados de progreso y gráficas de evolución están disponibles en tu perfil de la aplicación.", MARGIN_P + 4, y + 9.5);
}

// ================================================================
//  WORKOUT SECTION — LANDSCAPE, 1 DAY PER PAGE
// ================================================================

function renderWorkoutSection(doc: jsPDF, workoutProgram: WorkoutProgramData) {
  const activeDays = (workoutProgram.days || []).filter(d => {
    if (d.isRestDay) return false;
    return (d.blocks || []).some(b => b.exercises && b.exercises.length > 0);
  });
  const restDays = (workoutProgram.days || []).filter(d => d.isRestDay);

  for (let i = 0; i < activeDays.length; i++) {
    const day = activeDays[i];
    doc.addPage("a4", "landscape");
    drawTopBar(doc);
    const pw = doc.internal.pageSize.getWidth();
    const contentW = pw - M * 2;
    let y = 10;

    if (i === 0) {
      doc.setFontSize(13); doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold");
      doc.text("PLAN DE ENTRENAMIENTO", M, y + 4);
      let sub = workoutProgram.name;
      if (workoutProgram.duration_weeks) sub += ` — ${workoutProgram.duration_weeks} sem.`;
      if (workoutProgram.difficulty) sub += ` — ${difficultyLabel(workoutProgram.difficulty)}`;
      doc.setFontSize(8); doc.setTextColor(...C.secondary); doc.setFont("helvetica", "normal");
      doc.text(sub, M + 62, y + 4);
      y += 10;
    }

    const dayName = day.dayName || DAY_NAMES[(day.day - 1) % 7] || `Día ${day.day}`;
    doc.setFillColor(...C.primary);
    doc.roundedRect(M, y, contentW, 7, 1.5, 1.5, "F");
    doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text(dayName, M + 4, y + 5);
    y += 9;

    const rows: (string | { content: string; styles?: any })[][] = [];
    for (const block of day.blocks || []) {
      const bName = block.name || blockTypeLabel(block.type);
      for (let j = 0; j < (block.exercises || []).length; j++) {
        const ex = block.exercises[j];
        const isCardio = /cinta|andar|caminar|bici|cycling|running|cardio|elíptica/i.test(ex.exercise?.name || "");
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

    autoTable(doc, {
      startY: y,
      head: [["Bloque", "Ejercicio", "Img", "Ser.", "Reps", "Desc.", "Km", "Tiempo", "Vel.", "URL"]],
      body: rows,
      theme: "grid",
      tableWidth: contentW,
      margin: { left: M },
      headStyles: { fillColor: C.headerBg, textColor: C.text, fontSize: 6.5, fontStyle: "bold", lineColor: C.border, lineWidth: 0.2 },
      styles: { fontSize: 6, cellPadding: 1.5, textColor: C.text, lineColor: C.border, lineWidth: 0.15, overflow: "ellipsize" },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: "bold" },
        1: { cellWidth: contentW - 26 - 16 - 11 - 16 - 14 - 14 - 14 - 14 - 16 },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 11, halign: "center" },
        4: { cellWidth: 16, halign: "center" },
        5: { cellWidth: 14, halign: "center" },
        6: { cellWidth: 14, halign: "center" },
        7: { cellWidth: 14, halign: "center" },
        8: { cellWidth: 14, halign: "center" },
        9: { cellWidth: 16, halign: "center" },
      },
      alternateRowStyles: { fillColor: C.headerBg },
      showHead: "firstPage",
      rowPageBreak: "avoid",
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 2) {
          data.cell.styles.fontStyle = "italic";
          data.cell.styles.textColor = C.textMuted;
        }
      },
    });

    if (day.notes) {
      const tblEnd = (doc as any).lastAutoTable.finalY + 3;
      doc.setFontSize(6.5); doc.setTextColor(...C.textMuted); doc.setFont("helvetica", "italic");
      doc.text(`Notas: ${day.notes}`, M, tblEnd);
    }
  }

  if (restDays.length > 0) {
    const lastPw = doc.internal.pageSize.getWidth();
    const lastContentW = lastPw - M * 2;
    const lastY = (doc as any).lastAutoTable?.finalY || 20;
    const restY = lastY + 8;
    doc.setFillColor(...C.headerBg);
    doc.roundedRect(M, restY, lastContentW, 7, 1, 1, "F");
    doc.setFontSize(7); doc.setTextColor(...C.textMuted); doc.setFont("helvetica", "italic");
    const restNames = restDays.map(d => d.dayName || DAY_NAMES[(d.day - 1) % 7]).join(", ");
    doc.text(`Días de descanso: ${restNames}`, M + 3, restY + 4.5);
  }
}

// ================================================================
//  NUTRITION SECTION — PORTRAIT, 1 DAY PER PAGE
// ================================================================

function renderNutritionSection(doc: jsPDF, mealPlan: MealPlanData) {
  const days = (mealPlan.plan?.days || []).filter(d => {
    const meals = d.meals || [];
    return meals.length > 0 && meals.some(m => (m.items && m.items.length > 0) || (m.foods && m.foods.length > 0));
  });
  if (days.length === 0) return;

  for (let di = 0; di < days.length; di++) {
    const day = days[di];
    doc.addPage("a4", "portrait");
    drawTopBar(doc);
    const pw = doc.internal.pageSize.getWidth();
    const contentW = pw - MARGIN_P * 2;
    let y = 12;

    if (di === 0) {
      doc.setFontSize(13); doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold");
      doc.text("PLAN NUTRICIONAL", MARGIN_P, y);
      doc.setFontSize(8); doc.setTextColor(...C.secondary); doc.setFont("helvetica", "normal");
      doc.text(mealPlan.name, MARGIN_P + 48, y);
      y += 8;
    }

    const dayName = day.dayName || DAY_NAMES[(day.day - 1) % 7] || `Día ${day.day}`;
    doc.setFillColor(...C.secondary);
    doc.roundedRect(MARGIN_P, y, contentW, 7, 1.5, 1.5, "F");
    doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text(dayName, MARGIN_P + 4, y + 5);
    y += 10;

    let dayCalTotal = 0, dayPTotal = 0, dayCTotal = 0, dayFTotal = 0;

    for (const meal of day.meals || []) {
      const mealLabel = meal.name + (meal.time ? ` (${meal.time})` : "");

      doc.setFillColor(...C.primaryLight);
      doc.roundedRect(MARGIN_P, y, contentW, 6, 1, 1, "F");
      doc.setFontSize(8); doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold");
      doc.text(mealLabel, MARGIN_P + 3, y + 4.2);
      y += 8;

      const items = meal.items || [];
      const legacyFoods = meal.foods || [];

      interface GroupedRecipe { name: string; items: { name: string; qty: string; cal: number; p: number; c: number; f: number }[] }
      const recipes: GroupedRecipe[] = [];
      let currentRecipe: GroupedRecipe | null = null;

      if (items.length > 0) {
        for (const item of items) {
          const data = item.type === "food" ? item.food : item.supplement;
          if (!data) continue;
          const m = getItemMacros(item);
          const recipeName = item.recipe_name || "";
          if (recipeName && (!currentRecipe || currentRecipe.name !== recipeName)) {
            currentRecipe = { name: recipeName, items: [] };
            recipes.push(currentRecipe);
          } else if (!recipeName && currentRecipe) {
            currentRecipe = null;
          }

          const entry = {
            name: data.name || "—",
            qty: `${Math.round(item.quantity_grams)}g`,
            cal: m.calories, p: m.protein, c: m.carbs, f: m.fat,
          };
          if (currentRecipe) {
            currentRecipe.items.push(entry);
          } else {
            recipes.push({ name: "", items: [entry] });
          }
        }
      } else if (legacyFoods.length > 0) {
        for (const food of legacyFoods) {
          recipes.push({
            name: "", items: [{
              name: food.name || "—", qty: `${Math.round(toNum(food.quantity, 100))}g`,
              cal: toNum(food.calories), p: toNum(food.protein), c: toNum(food.carbs), f: toNum(food.fat),
            }]
          });
        }
      }

      const tableRows: string[][] = [];
      let mealCal = 0, mealP = 0, mealC = 0, mealF = 0;

      for (const recipe of recipes) {
        if (recipe.name) {
          tableRows.push([`🍳 ${recipe.name}`, "", "", "", "", ""]);
        }
        for (const it of recipe.items) {
          const prefix = recipe.name ? "    " : "";
          tableRows.push([
            `${prefix}${it.name}`, it.qty,
            Math.round(it.cal).toString(), it.p.toFixed(1), it.c.toFixed(1), it.f.toFixed(1),
          ]);
          mealCal += it.cal; mealP += it.p; mealC += it.c; mealF += it.f;
        }
      }
      dayCalTotal += mealCal; dayPTotal += mealP; dayCTotal += mealC; dayFTotal += mealF;
      tableRows.push(["TOTAL", "", Math.round(mealCal).toString(), mealP.toFixed(1), mealC.toFixed(1), mealF.toFixed(1)]);

      autoTable(doc, {
        startY: y,
        head: [["Alimento", "Cant.", "Kcal", "P", "C", "G"]],
        body: tableRows,
        theme: "grid",
        tableWidth: contentW,
        margin: { left: MARGIN_P },
        headStyles: { fillColor: C.headerBg, textColor: C.text, fontSize: 6.5, fontStyle: "bold", lineColor: C.border, lineWidth: 0.2 },
        styles: { fontSize: 6, cellPadding: 1.5, textColor: C.text, lineColor: C.border, lineWidth: 0.15, overflow: "ellipsize" },
        columnStyles: {
          0: { cellWidth: contentW - 14 - 14 - 12 - 12 - 12 },
          1: { halign: "center", cellWidth: 14 },
          2: { halign: "center", cellWidth: 14 },
          3: { halign: "center", cellWidth: 12 },
          4: { halign: "center", cellWidth: 12 },
          5: { halign: "center", cellWidth: 12 },
        },
        showHead: "firstPage",
        rowPageBreak: "avoid",
        didParseCell: (data: any) => {
          if (data.section !== "body") return;
          const isTotal = data.row.index === tableRows.length - 1;
          if (isTotal) { data.cell.styles.fillColor = C.primaryLight; data.cell.styles.fontStyle = "bold"; }
          const txt = String(tableRows[data.row.index]?.[0] || "");
          if (txt.startsWith("🍳")) {
            data.cell.styles.fillColor = C.accentBg;
            if (data.column.index === 0) data.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    doc.setFillColor(...C.primaryLight);
    doc.roundedRect(MARGIN_P, y, contentW, 8, 2, 2, "F");
    doc.setFontSize(7.5); doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold");
    doc.text(
      `Total del día:  ${Math.round(dayCalTotal)} kcal  |  P: ${dayPTotal.toFixed(1)}g  |  C: ${dayCTotal.toFixed(1)}g  |  G: ${dayFTotal.toFixed(1)}g`,
      MARGIN_P + 4, y + 5.5
    );
  }

  // Supplements
  const supplements = mealPlan.supplements || [];
  if (supplements.length > 0) {
    doc.addPage("a4", "portrait");
    drawTopBar(doc);
    const pw = doc.internal.pageSize.getWidth();
    const contentW = pw - MARGIN_P * 2;
    let y = 12;
    doc.setFontSize(12); doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold");
    doc.text("SUPLEMENTACIÓN", MARGIN_P, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Suplemento", "Dosis / Modo de empleo", "Momento"]],
      body: supplements.map(s => [s.name, s.dosage || s.how_to_take || "—", s.timing || "—"]),
      theme: "grid", tableWidth: contentW, margin: { left: MARGIN_P },
      headStyles: { fillColor: C.secondary, textColor: C.white, fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2, textColor: C.text, lineColor: C.border, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: C.headerBg },
    });
  }

  if (mealPlan.notes || mealPlan.nutritional_advice) {
    const currentPw = doc.internal.pageSize.getWidth();
    const cW = currentPw - MARGIN_P * 2;
    let ny = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 60;
    doc.setFontSize(8); doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold");
    doc.text("Notas:", MARGIN_P, ny);
    ny += 4;
    doc.setFontSize(7); doc.setTextColor(...C.text); doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(mealPlan.nutritional_advice || mealPlan.notes || "", cW);
    doc.text(noteLines, MARGIN_P, ny);
  }
}

// ================================================================
//  LAST PAGE: LEGAL DISCLAIMER
// ================================================================

function renderDisclaimerPage(doc: jsPDF, workspaceName: string) {
  doc.addPage("a4", "portrait");
  drawTopBar(doc);
  const pw = doc.internal.pageSize.getWidth();
  const contentW = pw - MARGIN_P * 2;
  let y = 16;

  doc.setFontSize(14); doc.setTextColor(...C.danger); doc.setFont("helvetica", "bold");
  doc.text("AVISO LEGAL Y RENUNCIA DE RESPONSABILIDAD", pw / 2, y, { align: "center" });
  y += 3;
  doc.setDrawColor(...C.danger); doc.setLineWidth(0.4);
  doc.line(MARGIN_P + 20, y, pw - MARGIN_P - 20, y);
  y += 8;

  doc.setFontSize(7.5); doc.setTextColor(...C.text); doc.setFont("helvetica", "normal");

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
  doc.setFillColor(...C.dangerBg);
  doc.roundedRect(MARGIN_P, y, contentW, 42, 3, 3, "F");
  doc.setDrawColor(...C.danger); doc.setLineWidth(0.5);
  doc.line(MARGIN_P, y, MARGIN_P, y + 42);

  doc.setFontSize(8); doc.setTextColor(...C.danger); doc.setFont("helvetica", "bold");
  doc.text("AVISO LEGAL", MARGIN_P + 5, y + 6);

  doc.setFontSize(7); doc.setTextColor(...C.text); doc.setFont("helvetica", "normal");
  const legalText = `Al utilizar este Plan de Entrenamiento / Dieta, usted reconoce que el ejercicio físico y los cambios nutricionales conllevan riesgos para la salud. ${workspaceName} no se hace responsable de las lesiones, enfermedades o problemas de salud derivados de la aplicación de este contenido.\n\nEste documento no constituye una receta médica. Es responsabilidad del usuario asegurarse de que está físicamente apto para realizar las actividades propuestas. Si siente dolor, mareos o molestias graves, deténgase de inmediato y busque atención médica.`;
  const legalLines = doc.splitTextToSize(legalText, contentW - 12);
  doc.text(legalLines, MARGIN_P + 5, y + 12);

  y += 48;

  doc.setFillColor(...C.accentBg);
  doc.roundedRect(MARGIN_P, y, contentW, 28, 3, 3, "F");
  doc.setDrawColor(...C.accent); doc.setLineWidth(0.5);
  doc.line(MARGIN_P, y, MARGIN_P, y + 28);

  doc.setFontSize(8); doc.setTextColor(...C.accent); doc.setFont("helvetica", "bold");
  doc.text("NOTA SOBRE LOS DATOS", MARGIN_P + 5, y + 6);

  doc.setFontSize(7); doc.setTextColor(...C.text); doc.setFont("helvetica", "normal");
  const dataDisclaimer = "Trackfiz no es responsable de los datos mostrados en este documento. La información aquí contenida ha sido confeccionada por el profesional y el cliente que utilizan la plataforma. Este documento es únicamente una plantilla que muestra los datos reflejados por los usuarios de la aplicación.";
  const dataLines = doc.splitTextToSize(dataDisclaimer, contentW - 12);
  doc.text(dataLines, MARGIN_P + 5, y + 12);

  y += 34;
  doc.setFontSize(6.5); doc.setTextColor(...C.textMuted); doc.setFont("helvetica", "italic");
  doc.text(`Documento generado el ${new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}`, pw / 2, y, { align: "center" });
}

// ============ LEGACY EXPORTS ============

export function generateMealPlanPDF(
  mealPlan: MealPlanData,
  options: PDFOptions = {}
): void {
  generateClientPlanPDF(mealPlan, null, options);
}

export function generateWorkoutProgramPDF(
  program: WorkoutProgramData,
  options: PDFOptions = {}
): void {
  generateClientPlanPDF(null, program, options);
}
