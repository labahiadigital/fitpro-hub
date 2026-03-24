export interface RecipeItem {
  food_id: string;
  name: string;
  type: "food" | "supplement";
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type RecipeDifficulty = "easy" | "medium" | "hard";

export type RecipeCategory =
  | "Desayunos"
  | "Almuerzos"
  | "Cenas"
  | "Snacks"
  | "Post-entreno"
  | "Pre-entreno"
  | "Batidos"
  | "Postres saludables"
  | "Meal prep"
  | "Otros";

export const RECIPE_CATEGORIES: RecipeCategory[] = [
  "Desayunos",
  "Almuerzos",
  "Cenas",
  "Snacks",
  "Post-entreno",
  "Pre-entreno",
  "Batidos",
  "Postres saludables",
  "Meal prep",
  "Otros",
];

export const RECIPE_DIFFICULTIES: { value: RecipeDifficulty; label: string }[] = [
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Media" },
  { value: "hard", label: "Difícil" },
];

export interface Recipe {
  id: string;
  workspace_id: string | null;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  difficulty?: RecipeDifficulty;
  image_url?: string;
  notes?: string;
  is_public: boolean;
  is_global: boolean;
  items: RecipeItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_sugar: number;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  tag?: string;
}

export interface RecipeFormValues {
  name: string;
  description: string;
  category: string;
  tags: string[];
  servings: number;
  prep_time_minutes: number | "";
  cook_time_minutes: number | "";
  difficulty: string;
  image_url: string;
  notes: string;
  is_public: boolean;
  items: RecipeItem[];
}
