/**
 * Client-side PDF generator for client plans (nutrition + workout)
 * Page 1 (portrait): client summary + macros
 * Pages 2+ (landscape): nutrition plan in compact 2-column grid
 * Then (landscape): workout plan in compact layout
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
  };
  sets: number;
  reps: string;
  rest_seconds: number;
  duration_type?: "reps" | "seconds" | "minutes";
  notes?: string;
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
};

const M = 10; // margin for landscape pages (compact)
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
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function genderLabel(g?: string): string {
  if (!g) return "—";
  const map: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };
  return map[g.toLowerCase()] || g;
}

function goalLabel(g?: string): string {
  if (!g) return "—";
  const map: Record<string, string> = {
    lose_weight: "Pérdida de peso",
    gain_muscle: "Ganancia muscular",
    maintain: "Mantenimiento",
    improve_fitness: "Mejorar condición física",
    sports_performance: "Rendimiento deportivo",
    rehabilitation: "Rehabilitación",
    general_health: "Salud general",
  };
  return map[g] || g;
}

function activityLabel(a?: string): string {
  if (!a) return "—";
  const map: Record<string, string> = {
    sedentary: "Sedentario",
    light: "Ligero",
    lightly_active: "Ligeramente activo",
    moderate: "Moderado",
    moderately_active: "Moderadamente activo",
    active: "Activo",
    very_active: "Muy activo",
    extra_active: "Extremadamente activo",
    intense: "Intenso",
  };
  return map[a.toLowerCase()] || a;
}

function difficultyLabel(d?: string): string {
  if (!d) return "";
  const map: Record<string, string> = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
    expert: "Experto",
  };
  return map[d.toLowerCase()] || d;
}

/** Build a flat row array for one nutrition day */
function buildDayRows(day: NutritionDayPlan) {
  const meals = day.meals || [];
  const rows: string[][] = [];
  let tCal = 0, tP = 0, tC = 0, tF = 0;
  for (const meal of meals) {
    const label = meal.name + (meal.time ? ` (${meal.time})` : "");
    const items = meal.items || [];
    const legacyFoods = meal.foods || [];

    if (items.length > 0) {
      items.forEach((item, idx) => {
        const data = item.type === "food" ? item.food : item.supplement;
        if (!data) return;
        const m = getItemMacros(item);
        tCal += m.calories; tP += m.protein; tC += m.carbs; tF += m.fat;
        rows.push([
          idx === 0 ? label : "",
          data.name || "—",
          `${Math.round(item.quantity_grams)}g`,
          Math.round(m.calories).toString(),
          m.protein.toFixed(1),
          m.carbs.toFixed(1),
          m.fat.toFixed(1),
        ]);
      });
    } else if (legacyFoods.length > 0) {
      legacyFoods.forEach((food, idx) => {
        const cal = toNum(food.calories), p = toNum(food.protein), c = toNum(food.carbs), f = toNum(food.fat);
        tCal += cal; tP += p; tC += c; tF += f;
        rows.push([
          idx === 0 ? label : "",
          food.name || "—",
          `${Math.round(toNum(food.quantity, 100))}g`,
          Math.round(cal).toString(),
          p.toFixed(1), c.toFixed(1), f.toFixed(1),
        ]);
      });
    }
  }
  rows.push(["", "TOTAL", "", Math.round(tCal).toString(), tP.toFixed(1), tC.toFixed(1), tF.toFixed(1)]);
  return rows;
}

// ============ MAIN PDF GENERATOR ============

export function generateClientPlanPDF(
  mealPlan: MealPlanData | null,
  workoutProgram: WorkoutProgramData | null,
  options: PDFOptions = {}
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let pw = doc.internal.pageSize.getWidth();
  let ph = doc.internal.pageSize.getHeight();
  let contentW = pw - 14 * 2;
  let y = 14;
  const MARGIN_P = 14;

  const { workspaceName = "Trackfiz", trainerName = "Entrenador", client } = options;
  const clientName = client
    ? `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Cliente"
    : "Cliente";

  const drawTopBar = () => {
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, pw, 4, "F");
  };

  // ================================================================
  //  PAGE 1 (PORTRAIT): CLIENT SUMMARY
  // ================================================================
  drawTopBar();
  y = 12;

  doc.setFontSize(20);
  doc.setTextColor(...C.primary);
  doc.setFont("helvetica", "bold");
  doc.text(workspaceName, pw / 2, y, { align: "center" });
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(...C.secondary);
  doc.setFont("helvetica", "normal");
  doc.text("Plan Personalizado", pw / 2, y, { align: "center" });
  y += 2;

  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_P + 40, y, pw - MARGIN_P - 40, y);
  y += 7;

  // Section: Client summary
  doc.setFontSize(11);
  doc.setTextColor(...C.primary);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DEL CLIENTE", MARGIN_P, y);
  y += 1.5;
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_P, y, MARGIN_P + 50, y);
  y += 4;

  const age = calcAge(client?.birth_date || client?.health_data?.birth_date);
  const actLevel = client?.activity_level || client?.health_data?.activity_level;

  const clientInfoRows: string[][] = [
    ["Nombre", clientName, "Entrenador", trainerName],
    ["Género", genderLabel(client?.gender), "Edad", age ? `${age} años` : "—"],
    ["Peso", client?.weight_kg ? `${client.weight_kg} kg` : "—", "Altura", client?.height_cm ? `${client.height_cm} cm` : "—"],
    ["Objetivo", goalLabel(client?.goals), "Actividad", activityLabel(actLevel)],
  ];
  if (client?.email || client?.phone) {
    clientInfoRows.push(["Email", client?.email || "—", "Teléfono", client?.phone || "—"]);
  }

  autoTable(doc, {
    startY: y,
    body: clientInfoRows,
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

  // IMC
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

  // Allergies
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

  // ================================================================
  //  MACRONUTRIENT SUMMARY + PIE CHART
  // ================================================================
  if (mealPlan) {
    doc.setFontSize(11);
    doc.setTextColor(...C.primary);
    doc.setFont("helvetica", "bold");
    doc.text("OBJETIVOS NUTRICIONALES", MARGIN_P, y);
    y += 1.5;
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
      startY: y,
      body: macroTableData,
      theme: "grid",
      tableWidth: 90,
      margin: { left: MARGIN_P },
      styles: { fontSize: 7.5, cellPadding: 2, textColor: C.text, lineColor: C.border, lineWidth: 0.3 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 28 },
        1: { halign: "center", cellWidth: 20 },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "center", cellWidth: 22 },
      },
      didParseCell: (data: any) => {
        if (data.row.index === 0) {
          data.cell.styles.fillColor = C.primary;
          data.cell.styles.textColor = C.white;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.row.index === 4) {
          data.cell.styles.fillColor = C.primaryLight;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === 0) {
          if (data.row.index === 1) data.cell.styles.textColor = C.proteinColor;
          if (data.row.index === 2) data.cell.styles.textColor = C.carbsColor;
          if (data.row.index === 3) data.cell.styles.textColor = C.fatColor;
        }
      },
    });

    // Donut chart on the right
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
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + (sweep * i) / steps;
        pts.push([chartCX + chartR * Math.cos(a), chartCY + chartR * Math.sin(a)]);
      }
      for (let i = 1; i < pts.length - 1; i++) {
        doc.triangle(chartCX, chartCY, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "F");
      }
      startAngle = end;
    }

    doc.setFillColor(255, 255, 255);
    doc.circle(chartCX, chartCY, chartR * 0.55, "F");

    doc.setFontSize(10);
    doc.setTextColor(...C.primary);
    doc.setFont("helvetica", "bold");
    doc.text(`${Math.round(tCal)}`, chartCX, chartCY - 1, { align: "center" });
    doc.setFontSize(5.5);
    doc.setTextColor(...C.textMuted);
    doc.text("kcal/día", chartCX, chartCY + 3, { align: "center" });

    const legY = chartCY + chartR + 4;
    let legX = chartCX - 24;
    for (const s of slices) {
      doc.setFillColor(...s.color);
      doc.rect(legX, legY, 2.5, 2.5, "F");
      doc.setFontSize(5.5);
      doc.setTextColor(...C.text);
      doc.setFont("helvetica", "normal");
      doc.text(`${s.label} ${s.pct}%`, legX + 3.5, legY + 2.2);
      legX += 20;
    }

    y = Math.max((doc as any).lastAutoTable.finalY, legY + 4) + 5;

    const clientGoal = client?.goals || client?.health_data?.fitness_goal;
    if (clientGoal) {
      doc.setFillColor(...C.accentBg);
      doc.roundedRect(MARGIN_P, y, contentW, 10, 2, 2, "F");
      doc.setFontSize(8);
      doc.setTextColor(...C.textMuted);
      doc.setFont("helvetica", "bold");
      doc.text("Objetivo calórico:", MARGIN_P + 4, y + 6.5);
      doc.setTextColor(...C.primary);
      doc.text(`${goalLabel(clientGoal)} — ${Math.round(tCal)} kcal/día`, MARGIN_P + 38, y + 6.5);
      y += 13;
    }
  }

  // ================================================================
  //  NUTRITION PLAN — LANDSCAPE PAGES, 2-COLUMN LAYOUT
  // ================================================================
  if (mealPlan) {
    const days = (mealPlan.plan?.days || []).filter(d => {
      const meals = d.meals || [];
      return meals.length > 0 && meals.some(m => (m.items && m.items.length > 0) || (m.foods && m.foods.length > 0));
    });

    if (days.length > 0) {
      doc.addPage("a4", "landscape");
      pw = doc.internal.pageSize.getWidth();
      ph = doc.internal.pageSize.getHeight();
      contentW = pw - M * 2;
      y = M;

      drawTopBar();
      y = 8;

      doc.setFontSize(12);
      doc.setTextColor(...C.primary);
      doc.setFont("helvetica", "bold");
      doc.text("PLAN NUTRICIONAL", M, y + 4);
      doc.setFontSize(8);
      doc.setTextColor(...C.secondary);
      doc.setFont("helvetica", "normal");
      doc.text(mealPlan.name, M + 50, y + 4);
      y += 9;

      const colW = (contentW - 4) / 2;
      const tableHead = [["Comida", "Alimento", "Cant.", "Kcal", "P", "C", "G"]];
      const colStyles: Record<number, any> = {
        0: { cellWidth: 22, fontStyle: "bold" },
        1: { cellWidth: colW - 22 - 10 - 10 - 9 - 9 - 9 },
        2: { halign: "center", cellWidth: 10 },
        3: { halign: "center", cellWidth: 10 },
        4: { halign: "center", cellWidth: 9 },
        5: { halign: "center", cellWidth: 9 },
        6: { halign: "center", cellWidth: 9 },
      };

      for (let i = 0; i < days.length; i += 2) {
        const leftDay = days[i];
        const rightDay = i + 1 < days.length ? days[i + 1] : null;

        if (i > 0) {
          if (y + 30 > ph - M - 8) {
            doc.addPage("a4", "landscape");
            pw = doc.internal.pageSize.getWidth();
            ph = doc.internal.pageSize.getHeight();
            drawTopBar();
            y = 8;
          }
        }

        // LEFT column
        const leftName = leftDay.dayName || DAY_NAMES[(leftDay.day - 1) % 7] || `Día ${leftDay.day}`;
        const leftRows = buildDayRows(leftDay);

        doc.setFillColor(...C.secondary);
        doc.roundedRect(M, y, colW, 5.5, 1, 1, "F");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(leftName, M + 3, y + 4);

        const leftStartY = y + 7;
        autoTable(doc, {
          startY: leftStartY,
          head: tableHead,
          body: leftRows,
          theme: "grid",
          tableWidth: colW,
          margin: { left: M, right: pw - M - colW },
          headStyles: { fillColor: C.headerBg, textColor: C.text, fontSize: 6, fontStyle: "bold", lineColor: C.border, lineWidth: 0.2 },
          styles: { fontSize: 5.5, cellPadding: 1.2, textColor: C.text, lineColor: C.border, lineWidth: 0.15, overflow: "ellipsize" },
          columnStyles: colStyles,
          didParseCell: (data: any) => {
            if (data.section === "body" && data.row.index === leftRows.length - 1) {
              data.cell.styles.fillColor = C.primaryLight;
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
        const leftEndY = (doc as any).lastAutoTable.finalY;

        // RIGHT column
        let rightEndY = leftStartY;
        if (rightDay) {
          const rightName = rightDay.dayName || DAY_NAMES[(rightDay.day - 1) % 7] || `Día ${rightDay.day}`;
          const rightRows = buildDayRows(rightDay);
          const rightX = M + colW + 4;

          doc.setFillColor(...C.secondary);
          doc.roundedRect(rightX, y, colW, 5.5, 1, 1, "F");
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.text(rightName, rightX + 3, y + 4);

          autoTable(doc, {
            startY: leftStartY,
            head: tableHead,
            body: rightRows,
            theme: "grid",
            tableWidth: colW,
            margin: { left: rightX, right: pw - rightX - colW },
            headStyles: { fillColor: C.headerBg, textColor: C.text, fontSize: 6, fontStyle: "bold", lineColor: C.border, lineWidth: 0.2 },
            styles: { fontSize: 5.5, cellPadding: 1.2, textColor: C.text, lineColor: C.border, lineWidth: 0.15, overflow: "ellipsize" },
            columnStyles: colStyles,
            didParseCell: (data: any) => {
              if (data.section === "body" && data.row.index === rightRows.length - 1) {
                data.cell.styles.fillColor = C.primaryLight;
                data.cell.styles.fontStyle = "bold";
              }
            },
          });
          rightEndY = (doc as any).lastAutoTable.finalY;
        }

        y = Math.max(leftEndY, rightEndY) + 5;
      }

      // Supplements
      const supplements = mealPlan.supplements || [];
      if (supplements.length > 0) {
        if (y + 20 > ph - M - 8) {
          doc.addPage("a4", "landscape");
          drawTopBar();
          y = 8;
        }
        doc.setFontSize(9);
        doc.setTextColor(...C.primary);
        doc.setFont("helvetica", "bold");
        doc.text("SUPLEMENTACIÓN", M, y + 3);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Suplemento", "Dosis / Modo de empleo", "Momento"]],
          body: supplements.map(s => [s.name, s.dosage || s.how_to_take || "—", s.timing || "—"]),
          theme: "grid",
          tableWidth: contentW,
          margin: { left: M },
          headStyles: { fillColor: C.secondary, textColor: C.white, fontSize: 7 },
          styles: { fontSize: 6.5, cellPadding: 1.8, textColor: C.text, lineColor: C.border, lineWidth: 0.2 },
          alternateRowStyles: { fillColor: C.headerBg },
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }

      // Notes
      if (mealPlan.notes || mealPlan.nutritional_advice) {
        if (y + 12 > ph - M - 8) {
          doc.addPage("a4", "landscape");
          drawTopBar();
          y = 8;
        }
        doc.setFontSize(7.5);
        doc.setTextColor(...C.primary);
        doc.setFont("helvetica", "bold");
        doc.text("Notas:", M, y + 3);
        y += 5;
        doc.setFontSize(6.5);
        doc.setTextColor(...C.text);
        doc.setFont("helvetica", "normal");
        const noteLines = doc.splitTextToSize(mealPlan.nutritional_advice || mealPlan.notes || "", contentW);
        doc.text(noteLines, M, y);
        y += noteLines.length * 3 + 4;
      }
    }
  }

  // ================================================================
  //  WORKOUT PLAN — LANDSCAPE, 2-COLUMN LAYOUT
  // ================================================================
  if (workoutProgram && workoutProgram.days && workoutProgram.days.length > 0) {
    doc.addPage("a4", "landscape");
    pw = doc.internal.pageSize.getWidth();
    ph = doc.internal.pageSize.getHeight();
    contentW = pw - M * 2;
    drawTopBar();
    y = 8;

    doc.setFontSize(12);
    doc.setTextColor(...C.primary);
    doc.setFont("helvetica", "bold");
    doc.text("PLAN DE ENTRENAMIENTO", M, y + 4);

    let sub = workoutProgram.name;
    if (workoutProgram.duration_weeks) sub += ` — ${workoutProgram.duration_weeks} sem.`;
    if (workoutProgram.difficulty) sub += ` — ${difficultyLabel(workoutProgram.difficulty)}`;
    doc.setFontSize(8);
    doc.setTextColor(...C.secondary);
    doc.setFont("helvetica", "normal");
    doc.text(sub, M + 62, y + 4);
    y += 9;

    const activeDays = workoutProgram.days.filter(d => {
      if (d.isRestDay) return false;
      const blocks = d.blocks || [];
      return blocks.some(b => b.exercises && b.exercises.length > 0);
    });

    const colW = (contentW - 4) / 2;
    const wkHead = [["Bloque", "Ejercicio", "Ser.", "Reps", "Desc."]];
    const wkColStyles: Record<number, any> = {
      0: { cellWidth: 22, fontStyle: "bold" },
      1: { cellWidth: colW - 22 - 9 - 12 - 10 },
      2: { halign: "center", cellWidth: 9 },
      3: { halign: "center", cellWidth: 12 },
      4: { halign: "center", cellWidth: 10 },
    };

    for (let i = 0; i < activeDays.length; i += 2) {
      const leftDay = activeDays[i];
      const rightDay = i + 1 < activeDays.length ? activeDays[i + 1] : null;

      if (i > 0 && y + 30 > ph - M - 8) {
        doc.addPage("a4", "landscape");
        pw = doc.internal.pageSize.getWidth();
        ph = doc.internal.pageSize.getHeight();
        drawTopBar();
        y = 8;
      }

      const buildExRows = (day: WorkoutDay): string[][] => {
        const rows: string[][] = [];
        for (const block of day.blocks || []) {
          const bLabel =
            block.type === "warmup" ? "Calentam." :
            block.type === "cooldown" ? "Estiram." :
            block.type === "superset" ? "Superserie" :
            block.type === "circuit" ? "Circuito" :
            block.name || "Principal";
          const bName = block.name || bLabel;
          for (let j = 0; j < (block.exercises || []).length; j++) {
            const ex = block.exercises[j];
            rows.push([
              j === 0 ? bName : "",
              ex.exercise?.name || "Ejercicio",
              `${ex.sets}`,
              typeof ex.reps === "string" ? ex.reps : `${ex.reps}`,
              `${ex.rest_seconds}s`,
            ]);
          }
        }
        return rows;
      };

      // LEFT
      const leftName = leftDay.dayName || DAY_NAMES[(leftDay.day - 1) % 7] || `Día ${leftDay.day}`;
      const leftRows = buildExRows(leftDay);

      doc.setFillColor(...C.primary);
      doc.roundedRect(M, y, colW, 5.5, 1, 1, "F");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(leftName, M + 3, y + 4);

      const startY = y + 7;
      autoTable(doc, {
        startY,
        head: wkHead,
        body: leftRows,
        theme: "grid",
        tableWidth: colW,
        margin: { left: M, right: pw - M - colW },
        headStyles: { fillColor: C.headerBg, textColor: C.text, fontSize: 6, fontStyle: "bold", lineColor: C.border, lineWidth: 0.2 },
        styles: { fontSize: 5.5, cellPadding: 1.2, textColor: C.text, lineColor: C.border, lineWidth: 0.15, overflow: "ellipsize" },
        columnStyles: wkColStyles,
        alternateRowStyles: { fillColor: C.headerBg },
      });
      const leftEnd = (doc as any).lastAutoTable.finalY;

      // RIGHT
      let rightEnd = startY;
      if (rightDay) {
        const rightName = rightDay.dayName || DAY_NAMES[(rightDay.day - 1) % 7] || `Día ${rightDay.day}`;
        const rightRows = buildExRows(rightDay);
        const rightX = M + colW + 4;

        doc.setFillColor(...C.primary);
        doc.roundedRect(rightX, y, colW, 5.5, 1, 1, "F");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(rightName, rightX + 3, y + 4);

        autoTable(doc, {
          startY,
          head: wkHead,
          body: rightRows,
          theme: "grid",
          tableWidth: colW,
          margin: { left: rightX, right: pw - rightX - colW },
          headStyles: { fillColor: C.headerBg, textColor: C.text, fontSize: 6, fontStyle: "bold", lineColor: C.border, lineWidth: 0.2 },
          styles: { fontSize: 5.5, cellPadding: 1.2, textColor: C.text, lineColor: C.border, lineWidth: 0.15, overflow: "ellipsize" },
          columnStyles: wkColStyles,
          alternateRowStyles: { fillColor: C.headerBg },
        });
        rightEnd = (doc as any).lastAutoTable.finalY;
      }

      y = Math.max(leftEnd, rightEnd) + 5;
    }

    // Rest days summary
    const restDays = workoutProgram.days.filter(d => d.isRestDay);
    if (restDays.length > 0) {
      if (y + 8 > ph - M - 8) {
        doc.addPage("a4", "landscape");
        drawTopBar();
        y = 8;
      }
      doc.setFillColor(...C.headerBg);
      doc.roundedRect(M, y, contentW, 6, 1, 1, "F");
      doc.setFontSize(7);
      doc.setTextColor(...C.textMuted);
      doc.setFont("helvetica", "italic");
      const restNames = restDays.map(d => d.dayName || DAY_NAMES[(d.day - 1) % 7]).join(", ");
      doc.text(`Días de descanso: ${restNames}`, M + 3, y + 4);
      y += 9;
    }
  }

  // ================================================================
  //  DISCLAIMER + FOOTER ON ALL PAGES
  // ================================================================
  // Add disclaimer on last page
  const lastPw = doc.internal.pageSize.getWidth();
  const lastPh = doc.internal.pageSize.getHeight();
  const lastM = doc.internal.pageSize.getWidth() > 250 ? M : MARGIN_P;
  const lastCW = lastPw - lastM * 2;

  if (y + 14 > lastPh - lastM - 8) {
    doc.addPage();
    y = lastM;
  }

  doc.setFillColor(...C.accentBg);
  doc.roundedRect(lastM, y, lastCW, 12, 2, 2, "F");
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.4);
  doc.line(lastM, y, lastM, y + 12);
  doc.setFontSize(7);
  doc.setTextColor(...C.danger);
  doc.setFont("helvetica", "bold");
  doc.text("AVISO", lastM + 3, y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...C.text);
  doc.text("Planes orientativos. Consulte con un profesional de salud ante cualquier duda.", lastM + 3, y + 9);

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pagePw = doc.internal.pageSize.getWidth();
    const pagePh = doc.internal.pageSize.getHeight();

    doc.setFillColor(...C.primary);
    doc.rect(0, pagePh - 3, pagePw, 3, "F");

    doc.setFontSize(5.5);
    doc.setTextColor(...C.textMuted);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${workspaceName} — ${new Date().toLocaleDateString("es-ES")} — Pág. ${i}/${totalPages}`,
      pagePw / 2,
      pagePh - 5,
      { align: "center" }
    );
  }

  const fileName = `plan_${clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
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
