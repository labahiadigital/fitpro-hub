/**
 * Client-side PDF generator for client plans (nutrition + workout)
 * Uses jspdf and jspdf-autotable
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
  weight_kg?: number;
  height_cm?: number;
  allergies?: string[];
  intolerances?: string[];
  goals?: string;
}

interface PDFOptions {
  workspaceName?: string;
  trainerName?: string;
  client?: ClientData;
}

// ============ CONSTANTS ============

const PRIMARY_COLOR: [number, number, number] = [45, 106, 79]; // #2D6A4F
const SECONDARY_COLOR: [number, number, number] = [64, 145, 108]; // #40916C
const HEADER_BG: [number, number, number] = [233, 236, 239]; // #E9ECEF
const WARNING_BG: [number, number, number] = [255, 243, 205]; // #FFF3CD
const DANGER_COLOR: [number, number, number] = [220, 53, 69]; // #DC3545

const DAY_NAMES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

// ============ HELPERS ============

function toNumber(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(num) ? defaultValue : num;
}

function getItemMacros(item: MealItem) {
  const data = item.type === "food" ? item.food : item.supplement;
  if (!data) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  
  const servingSize = parseFloat(data.serving_size || "100") || 100;
  const factor = item.quantity_grams / servingSize;
  
  return {
    calories: toNumber(data.calories, 0) * factor,
    protein: toNumber(data.protein, 0) * factor,
    carbs: toNumber(data.carbs, 0) * factor,
    fat: toNumber(data.fat, 0) * factor,
  };
}

// ============ MAIN PDF GENERATOR ============

/**
 * Generate a complete client plan PDF with both nutrition and workout
 */
export function generateClientPlanPDF(
  mealPlan: MealPlanData | null,
  workoutProgram: WorkoutProgramData | null,
  options: PDFOptions = {}
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let yPos = margin;

  const {
    workspaceName = "Trackfiz",
    trainerName = "Entrenador",
    client,
  } = options;

  const clientName = client
    ? `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Cliente"
    : "Cliente";

  const allergies = client?.allergies || [];
  const intolerances = client?.intolerances || [];
  const allRestrictions = [...allergies, ...intolerances];

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin - 15) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  const addFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generado por ${workspaceName} - ${new Date().toLocaleString("es-ES")} - Pagina ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    }
  };

  // ========== HEADER ==========
  doc.setFontSize(20);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text(workspaceName, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  doc.setFontSize(14);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text(`Plan Personalizado`, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Client info table
  const infoData: string[][] = [
    ["Cliente:", clientName, "Entrenador:", trainerName],
    ["Fecha:", new Date().toLocaleDateString("es-ES"), "", ""],
  ];

  if (client?.weight_kg || client?.height_cm) {
    infoData.push([
      "Peso:",
      client.weight_kg ? `${client.weight_kg} kg` : "-",
      "Altura:",
      client.height_cm ? `${client.height_cm} cm` : "-",
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    body: infoData,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5, textColor: [51, 51, 51] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 100, 100] },
      2: { fontStyle: "bold", textColor: [100, 100, 100] },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Restrictions warning
  if (allRestrictions.length > 0) {
    doc.setFillColor(...WARNING_BG);
    doc.rect(margin, yPos, pageWidth - margin * 2, 10, "F");
    doc.setFontSize(8);
    doc.setTextColor(...DANGER_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text(`RESTRICCIONES ALIMENTARIAS: ${allRestrictions.join(", ")}`, margin + 3, yPos + 6);
    yPos += 14;
  }

  // ========== NUTRITION SECTION ==========
  if (mealPlan) {
    checkPageBreak(30);
    
    // Section title
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("PLAN NUTRICIONAL", margin, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.setFont("helvetica", "normal");
    doc.text(mealPlan.name, margin, yPos);
    yPos += 8;

    // Macros summary table
    const targetCalories = toNumber(mealPlan.target_calories, 2000);
    const targetProtein = toNumber(mealPlan.target_protein, 150);
    const targetCarbs = toNumber(mealPlan.target_carbs, 200);
    const targetFat = toNumber(mealPlan.target_fat, 70);

    autoTable(doc, {
      startY: yPos,
      head: [["Calorias", "Proteina", "Carbohidratos", "Grasas"]],
      body: [[
        `${Math.round(targetCalories)} kcal`,
        `${Math.round(targetProtein)}g`,
        `${Math.round(targetCarbs)}g`,
        `${Math.round(targetFat)}g`,
      ]],
      theme: "grid",
      headStyles: { fillColor: PRIMARY_COLOR, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 9, halign: "center", cellPadding: 3 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Days and meals
    const days = mealPlan.plan?.days || [];
    
    for (const day of days) {
      checkPageBreak(25);
      const dayName = day.dayName || DAY_NAMES[(day.day - 1) % 7] || `Dia ${day.day}`;
      
      doc.setFontSize(10);
      doc.setTextColor(...SECONDARY_COLOR);
      doc.setFont("helvetica", "bold");
      doc.text(dayName, margin, yPos);
      yPos += 4;

      // Collect foods for this day
      const dayFoods: string[][] = [];
      
      for (const meal of day.meals || []) {
        const mealHeader = `${meal.name}${meal.time ? ` (${meal.time})` : ""}`;
        const items = meal.items || [];
        const legacyFoods = meal.foods || [];
        
        if (items.length > 0) {
          items.forEach((item, idx) => {
            const itemData = item.type === "food" ? item.food : item.supplement;
            if (!itemData) return;
            const macros = getItemMacros(item);
            dayFoods.push([
              idx === 0 ? mealHeader : "",
              itemData.name || "Sin nombre",
              `${Math.round(item.quantity_grams)}g`,
              Math.round(macros.calories).toString(),
              macros.protein.toFixed(1),
              macros.carbs.toFixed(1),
              macros.fat.toFixed(1),
            ]);
          });
        } else if (legacyFoods.length > 0) {
          legacyFoods.forEach((food, idx) => {
            dayFoods.push([
              idx === 0 ? mealHeader : "",
              food.name || "Sin nombre",
              `${Math.round(toNumber(food.quantity, 100))}g`,
              Math.round(toNumber(food.calories, 0)).toString(),
              toNumber(food.protein, 0).toFixed(1),
              toNumber(food.carbs, 0).toFixed(1),
              toNumber(food.fat, 0).toFixed(1),
            ]);
          });
        } else {
          dayFoods.push([mealHeader, "(sin alimentos)", "-", "-", "-", "-", "-"]);
        }
      }

      if (dayFoods.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [["Comida", "Alimento", "Cant.", "Kcal", "P", "C", "G"]],
          body: dayFoods,
          theme: "grid",
          headStyles: { fillColor: HEADER_BG, textColor: [51, 51, 51], fontSize: 7, fontStyle: "bold" },
          styles: { fontSize: 7, cellPadding: 1.5, textColor: [51, 51, 51] },
          columnStyles: {
            0: { cellWidth: 28, fontStyle: "bold" },
            1: { cellWidth: 48 },
            2: { halign: "center", cellWidth: 14 },
            3: { halign: "center", cellWidth: 14 },
            4: { halign: "center", cellWidth: 11 },
            5: { halign: "center", cellWidth: 11 },
            6: { halign: "center", cellWidth: 11 },
          },
        });
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }
    }

    // Supplements
    const supplements = mealPlan.supplements || [];
    if (supplements.length > 0) {
      checkPageBreak(20);
      doc.setFontSize(10);
      doc.setTextColor(...SECONDARY_COLOR);
      doc.setFont("helvetica", "bold");
      doc.text("Suplementacion", margin, yPos);
      yPos += 4;

      const suppData = supplements.map((supp) => [
        supp.name,
        supp.dosage || supp.how_to_take || "-",
        supp.timing || "-",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Suplemento", "Dosis", "Momento"]],
        body: suppData,
        theme: "grid",
        headStyles: { fillColor: SECONDARY_COLOR, textColor: [255, 255, 255], fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 2, textColor: [51, 51, 51] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Notes
    if (mealPlan.notes || mealPlan.nutritional_advice) {
      checkPageBreak(20);
      doc.setFontSize(9);
      doc.setTextColor(...SECONDARY_COLOR);
      doc.setFont("helvetica", "bold");
      doc.text("Notas:", margin, yPos);
      yPos += 4;
      doc.setFontSize(8);
      doc.setTextColor(51, 51, 51);
      doc.setFont("helvetica", "normal");
      const notes = mealPlan.nutritional_advice || mealPlan.notes || "";
      const splitNotes = doc.splitTextToSize(notes, pageWidth - margin * 2);
      doc.text(splitNotes, margin, yPos);
      yPos += splitNotes.length * 3.5 + 5;
    }
  }

  // ========== WORKOUT SECTION ==========
  if (workoutProgram && workoutProgram.days && workoutProgram.days.length > 0) {
    // Add page break before workout section
    doc.addPage();
    yPos = margin;

    // Section title
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("PLAN DE ENTRENAMIENTO", margin, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.setFont("helvetica", "normal");
    doc.text(workoutProgram.name, margin, yPos);
    
    if (workoutProgram.duration_weeks) {
      doc.text(` - ${workoutProgram.duration_weeks} semanas`, margin + doc.getTextWidth(workoutProgram.name), yPos);
    }
    yPos += 8;

    if (workoutProgram.description) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const desc = doc.splitTextToSize(workoutProgram.description, pageWidth - margin * 2);
      doc.text(desc, margin, yPos);
      yPos += desc.length * 3.5 + 5;
    }

    // Workout days
    for (const day of workoutProgram.days) {
      checkPageBreak(25);
      
      const dayName = day.dayName || DAY_NAMES[(day.day - 1) % 7] || `Dia ${day.day}`;
      
      doc.setFontSize(10);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.setFont("helvetica", "bold");
      doc.text(dayName, margin, yPos);
      
      if (day.isRestDay) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "italic");
        doc.text(" - Descanso", margin + doc.getTextWidth(dayName) + 2, yPos);
        yPos += 6;
        continue;
      }
      yPos += 4;

      // Collect exercises
      const exerciseRows: string[][] = [];
      
      for (const block of day.blocks || []) {
        const blockLabel = 
          block.type === "warmup" ? "Calentamiento" :
          block.type === "cooldown" ? "Estiramiento" :
          block.type === "superset" ? "Superserie" :
          block.type === "circuit" ? "Circuito" : "Principal";
        
        const blockName = block.name || blockLabel;
        
        if (block.exercises && block.exercises.length > 0) {
          block.exercises.forEach((ex, idx) => {
            exerciseRows.push([
              idx === 0 ? blockName : "",
              ex.exercise?.name || "Ejercicio",
              `${ex.sets}`,
              ex.reps,
              `${ex.rest_seconds}s`,
              ex.notes || "-",
            ]);
          });
        }
      }

      if (exerciseRows.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [["Bloque", "Ejercicio", "Series", "Reps", "Descanso", "Notas"]],
          body: exerciseRows,
          theme: "grid",
          headStyles: { fillColor: HEADER_BG, textColor: [51, 51, 51], fontSize: 7, fontStyle: "bold" },
          styles: { fontSize: 7, cellPadding: 1.5, textColor: [51, 51, 51] },
          columnStyles: {
            0: { cellWidth: 26, fontStyle: "bold" },
            1: { cellWidth: 42 },
            2: { halign: "center", cellWidth: 14 },
            3: { halign: "center", cellWidth: 18 },
            4: { halign: "center", cellWidth: 16 },
            5: { cellWidth: 32 },
          },
        });
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      if (day.notes) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "italic");
        doc.text(`Notas: ${day.notes}`, margin, yPos);
        yPos += 4;
      }
    }
  }

  // ========== FINAL WARNING ==========
  checkPageBreak(20);
  doc.setFillColor(...WARNING_BG);
  doc.rect(margin, yPos, pageWidth - margin * 2, 14, "F");
  doc.setFontSize(7);
  doc.setTextColor(...DANGER_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("AVISO IMPORTANTE", margin + 3, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(51, 51, 51);
  doc.text(
    "Estos planes son orientativos. Revise siempre los ingredientes de los alimentos. Consulte con un profesional de salud ante cualquier duda.",
    margin + 3,
    yPos + 10
  );

  // Add footer to all pages
  addFooter();

  // Save
  const fileName = `plan_${clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}

// ============ LEGACY EXPORTS (for backward compatibility) ============

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
