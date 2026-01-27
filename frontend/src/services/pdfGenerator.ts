/**
 * Client-side PDF generator for meal plans
 * Uses jspdf and jspdf-autotable
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MealPlanData {
  id: string;
  name: string;
  description?: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  plan: {
    days: DayPlan[];
  };
  supplements?: SupplementData[];
  notes?: string;
  nutritional_advice?: string;
}

interface DayPlan {
  day: number;
  dayName?: string;
  meals: MealData[];
}

interface MealData {
  name: string;
  time?: string;
  foods: FoodItem[];
}

interface FoodItem {
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens?: string[];
}

interface SupplementData {
  name: string;
  dosage?: string;
  timing?: string;
  notes?: string;
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

// Colors
const PRIMARY_COLOR = "#2D6A4F";
const SECONDARY_COLOR = "#40916C";
const DANGER_COLOR = "#DC3545";
const WARNING_BG = "#FFF3CD";

// Helper to ensure value is a number
function toNumber(value: any, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? defaultValue : num;
}

export function generateMealPlanPDF(
  mealPlan: MealPlanData,
  options: PDFOptions = {}
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  const {
    workspaceName = "Trackfiz",
    trainerName = "Entrenador",
    client,
  } = options;

  const clientName = client
    ? `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Sin asignar"
    : "Sin asignar";

  const allergies = client?.allergies || [];
  const intolerances = client?.intolerances || [];
  const allRestrictions = [...allergies, ...intolerances];

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(20);
  doc.setTextColor(PRIMARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text(workspaceName, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(14);
  doc.setTextColor(SECONDARY_COLOR);
  doc.text(mealPlan.name, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Client info table
  doc.setFontSize(10);
  doc.setTextColor("#333333");
  doc.setFont("helvetica", "normal");

  const infoData = [
    ["Cliente:", clientName, "Entrenador:", trainerName],
    ["Fecha:", new Date().toLocaleDateString("es-ES"), "", ""],
  ];

  if (client?.weight_kg) {
    infoData.push([
      "Peso:",
      `${client.weight_kg} kg`,
      "Altura:",
      client.height_cm ? `${client.height_cm} cm` : "-",
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: infoData,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: "#666666" },
      2: { fontStyle: "bold", textColor: "#666666" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Energy requirements section
  doc.setFontSize(12);
  doc.setTextColor(SECONDARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("Cálculo de Requisitos Energéticos Diarios", margin, yPos);
  yPos += 5;

  doc.setFontSize(8);
  doc.setTextColor("#666666");
  doc.setFont("helvetica", "italic");
  const noteText =
    "Estos cálculos son meramente orientativos. La forma correcta de saber si la energía propuesta se ajusta al individuo es tras realizar un control periódico de resultados.";
  const splitNote = doc.splitTextToSize(noteText, pageWidth - margin * 2);
  doc.text(splitNote, margin, yPos);
  yPos += splitNote.length * 4 + 5;

  // Energy table - ensure all values are numbers
  const targetCalories = toNumber(mealPlan.target_calories, 2000);
  const targetProtein = toNumber(mealPlan.target_protein, 150);
  const targetCarbs = toNumber(mealPlan.target_carbs, 200);
  const targetFat = toNumber(mealPlan.target_fat, 70);
  
  const maintenanceKcal = targetCalories;
  const energyData = [
    ["Tipo de Objetivo", "Calorías Estimadas"],
    ["Energía Estimada para Mantenimiento", `${Math.round(maintenanceKcal)} kcal`],
    ["Hipertrofia o Aumento de Peso", `${Math.round(maintenanceKcal * 1.25)} kcal`],
    ["Definición o Pérdida de Peso", `${Math.round(maintenanceKcal * 0.75)} kcal`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [energyData[0]],
    body: energyData.slice(1),
    theme: "grid",
    headStyles: { fillColor: PRIMARY_COLOR, textColor: "#FFFFFF" },
    styles: { fontSize: 9, halign: "center" },
    bodyStyles: { textColor: "#333333" },
    alternateRowStyles: { fillColor: "#F8F9FA" },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Macros table
  checkPageBreak(50);
  doc.setFontSize(12);
  doc.setTextColor(SECONDARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("Objetivos Nutricionales Diarios", margin, yPos);
  yPos += 5;

  const proteinKcal = targetProtein * 4;
  const carbsKcal = targetCarbs * 4;
  const fatKcal = targetFat * 9;
  const totalKcal = proteinKcal + carbsKcal + fatKcal;
  const proteinPct = totalKcal > 0 ? Math.round((proteinKcal / totalKcal) * 100) : 33;
  const carbsPct = totalKcal > 0 ? Math.round((carbsKcal / totalKcal) * 100) : 34;
  const fatPct = totalKcal > 0 ? Math.round((fatKcal / totalKcal) * 100) : 33;

  const macrosData = [
    ["", "Calorías", "Proteína", "Carbohidratos", "Grasas"],
    [
      "Cantidad",
      `${Math.round(targetCalories)} kcal`,
      `${Math.round(targetProtein)}g`,
      `${Math.round(targetCarbs)}g`,
      `${Math.round(targetFat)}g`,
    ],
    ["% Kcal", "100%", `${proteinPct}%`, `${carbsPct}%`, `${fatPct}%`],
    [
      "Kcal",
      `${Math.round(totalKcal)}`,
      `${Math.round(proteinKcal)}`,
      `${Math.round(carbsKcal)}`,
      `${Math.round(fatKcal)}`,
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [macrosData[0]],
    body: macrosData.slice(1),
    theme: "grid",
    headStyles: { fillColor: PRIMARY_COLOR, textColor: "#FFFFFF" },
    styles: { fontSize: 9, halign: "center" },
    columnStyles: { 0: { fontStyle: "bold", fillColor: "#E9ECEF" } },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Allergies warning
  if (allRestrictions.length > 0) {
    checkPageBreak(30);
    doc.setFillColor(WARNING_BG);
    doc.rect(margin, yPos, pageWidth - margin * 2, 25, "F");
    doc.setFontSize(10);
    doc.setTextColor(DANGER_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("⚠️ ALERGIAS E INTOLERANCIAS", margin + 5, yPos + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `El cliente tiene las siguientes restricciones: ${allRestrictions.join(", ")}`,
      margin + 5,
      yPos + 16
    );
    yPos += 30;
  }

  // Days and meals
  const days = mealPlan.plan?.days || [];
  
  for (const day of days) {
    checkPageBreak(40);
    const dayName = day.dayName || `Día ${day.day}`;
    
    doc.setFontSize(12);
    doc.setTextColor(PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text(dayName, margin, yPos);
    yPos += 8;

    for (const meal of day.meals || []) {
      checkPageBreak(30);
      
      doc.setFontSize(10);
      doc.setTextColor(SECONDARY_COLOR);
      doc.setFont("helvetica", "italic");
      doc.text(`${meal.name}${meal.time ? ` - ${meal.time}` : ""}`, margin, yPos);
      yPos += 5;

      if (meal.foods && meal.foods.length > 0) {
        const foodData = meal.foods.map((food) => {
          let foodName = food.name || "Alimento";
          const foodAllergens = food.allergens || [];
          const hasAllergen = foodAllergens.some((a) =>
            allRestrictions.map((r) => r.toLowerCase()).includes(a.toLowerCase())
          );
          if (hasAllergen) {
            foodName = `⚠️ ${foodName}`;
          }
          // Ensure all numeric values are actual numbers
          const quantity = toNumber(food.quantity, 0);
          const calories = toNumber(food.calories, 0);
          const protein = toNumber(food.protein, 0);
          const carbs = toNumber(food.carbs, 0);
          const fat = toNumber(food.fat, 0);
          
          return [
            foodName,
            `${Math.round(quantity)}g`,
            Math.round(calories).toString(),
            protein.toFixed(1),
            carbs.toFixed(1),
            fat.toFixed(1),
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [["Alimento", "Cantidad", "Kcal", "P", "C", "G"]],
          body: foodData,
          theme: "grid",
          headStyles: { fillColor: "#E9ECEF", textColor: "#333333", fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { halign: "center", cellWidth: 20 },
            2: { halign: "center", cellWidth: 15 },
            3: { halign: "center", cellWidth: 15 },
            4: { halign: "center", cellWidth: 15 },
            5: { halign: "center", cellWidth: 15 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;
      }
    }
    yPos += 5;
  }

  // Supplements section
  checkPageBreak(40);
  doc.setFontSize(12);
  doc.setTextColor(SECONDARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("Suplementación Deportiva", margin, yPos);
  yPos += 8;

  const supplements = mealPlan.supplements || [];
  if (supplements.length > 0) {
    const suppData = supplements.map((supp) => [
      supp.name,
      supp.dosage || "-",
      supp.timing || "-",
      (supp.notes || "").substring(0, 30),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Suplemento", "Dosis", "Momento", "Notas"]],
      body: suppData,
      theme: "grid",
      headStyles: { fillColor: SECONDARY_COLOR, textColor: "#FFFFFF" },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor("#333333");
    doc.setFont("helvetica", "normal");
    const defaultSupps = [
      "• 1 Multivitamínico con comida 1 y comida 5",
      "• Omega 3 - con comida 1, 3 y 5",
      "• Intra entrenamiento: 10g EAAs + 10g GLUTAMINA + 10g CREATINA",
      "• Antes de dormir: ZMA 3 cápsulas",
    ];
    defaultSupps.forEach((line) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // Notes
  if (mealPlan.notes || mealPlan.description) {
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setTextColor(SECONDARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("Notas Adicionales", margin, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setTextColor("#333333");
    doc.setFont("helvetica", "normal");
    const notes = mealPlan.notes || mealPlan.description || "";
    const splitNotes = doc.splitTextToSize(notes, pageWidth - margin * 2);
    doc.text(splitNotes, margin, yPos);
    yPos += splitNotes.length * 4 + 5;
  }

  // Final warning
  checkPageBreak(30);
  doc.setFillColor(WARNING_BG);
  doc.rect(margin, yPos, pageWidth - margin * 2, 20, "F");
  doc.setFontSize(9);
  doc.setTextColor(DANGER_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("⚠️ AVISO IMPORTANTE", margin + 5, yPos + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const warningText =
    "Este plan nutricional es orientativo. Revise siempre los ingredientes de los alimentos para asegurarse de que no contienen ningún alérgeno.";
  const splitWarning = doc.splitTextToSize(warningText, pageWidth - margin * 2 - 10);
  doc.text(splitWarning, margin + 5, yPos + 12);
  yPos += 25;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor("#999999");
  doc.text(
    `Generado por ${workspaceName} - ${new Date().toLocaleString("es-ES")}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  // Save the PDF
  const fileName = `plan_nutricional_${mealPlan.name.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
