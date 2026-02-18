export type FormulaType = 'mifflin' | 'harris';

export interface BMRInput {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: 'male' | 'female';
}

export function calculateBMR(input: BMRInput, formula: FormulaType = 'mifflin'): number {
  const { weight_kg, height_cm, age, gender } = input;

  if (formula === 'harris') {
    if (gender === 'male') {
      return 66.5 + (13.75 * weight_kg) + (5.003 * height_cm) - (6.75 * age);
    }
    return 655.1 + (9.563 * weight_kg) + (1.850 * height_cm) - (4.676 * age);
  }

  // Mifflin-St Jeor (default)
  if (gender === 'male') {
    return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
  }
  return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
}

export const ACTIVITY_MULTIPLIERS = {
  sedentary: { value: 1.2, label: 'Sedentario (poco o ningún ejercicio)' },
  light: { value: 1.375, label: 'Ligero (ejercicio 1-3 días/semana)' },
  moderate: { value: 1.55, label: 'Moderado (ejercicio 3-5 días/semana)' },
  active: { value: 1.725, label: 'Activo (ejercicio 6-7 días/semana)' },
  very_active: { value: 1.9, label: 'Muy activo (ejercicio muy intenso)' },
};

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel as keyof typeof ACTIVITY_MULTIPLIERS]?.value || 1.55;
  return bmr * multiplier;
}

export function calculateMacroPercentages(
  _calories: number,
  protein_g: number,
  carbs_g: number,
  fat_g: number
): { protein_pct: number; carbs_pct: number; fat_pct: number } {
  const totalCals = (protein_g * 4) + (carbs_g * 4) + (fat_g * 9);
  if (totalCals === 0) return { protein_pct: 0, carbs_pct: 0, fat_pct: 0 };

  return {
    protein_pct: Math.round((protein_g * 4 / totalCals) * 100),
    carbs_pct: Math.round((carbs_g * 4 / totalCals) * 100),
    fat_pct: Math.round((fat_g * 9 / totalCals) * 100),
  };
}

/**
 * Convert macro percentages to grams based on total calories.
 * protein_g = (calories * protein_pct / 100) / 4
 * carbs_g = (calories * carbs_pct / 100) / 4
 * fat_g = (calories * fat_pct / 100) / 9
 */
export function gramsFromPercentages(
  calories: number,
  protein_pct: number,
  carbs_pct: number,
  fat_pct: number
): { protein_g: number; carbs_g: number; fat_g: number } {
  return {
    protein_g: Math.round((calories * protein_pct / 100) / 4),
    carbs_g: Math.round((calories * carbs_pct / 100) / 4),
    fat_g: Math.round((calories * fat_pct / 100) / 9),
  };
}
