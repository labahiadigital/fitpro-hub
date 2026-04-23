/**
 * Listado único y centralizado de alergias e intolerancias alimentarias.
 *
 * Este archivo es la ÚNICA fuente de verdad para las opciones que aparecen:
 *   - En el onboarding del cliente (tres variantes: pública, invitación y pública-legacy).
 *   - En el detalle del cliente (modal "Editar Alergias e Intolerancias").
 *   - En el formulario global del sistema "Cuestionario alimentación"
 *     (pregunta: "¿Tienes alguna alergia alimentaria diagnosticada?").
 *   - En cualquier badge o selector de alérgenos del resto de la app.
 *
 * Los `id` son estables (snake_case sin tildes) y NO deben cambiarse para
 * mantener compatibilidad con datos ya almacenados en `client.health_data`.
 */

export type DietaryCategory = "allergy" | "intolerance";

export interface DietaryRestriction {
  /** Identificador estable persistido en BD. No cambiar. */
  id: string;
  /** Nombre corto para mostrar en badges / listas compactas. */
  short_label: string;
  /** Etiqueta descriptiva para selectores y formularios. */
  label: string;
  /** Emoji representativo opcional. */
  icon?: string;
  /** Clasificación clínica (alergia real vs. intolerancia). */
  category: DietaryCategory;
}

/**
 * Listado maestro. Mantener las primeras entradas alineadas con el listado
 * que el equipo de nutrición pide mostrar explícitamente en el cuestionario
 * del sistema (ver comentario del usuario del 2026-04-20).
 */
export const DIETARY_RESTRICTIONS: DietaryRestriction[] = [
  {
    id: "lactosa",
    short_label: "Lactosa",
    label: "Lactosa (leche y derivados)",
    icon: "🥛",
    category: "intolerance",
  },
  {
    id: "fructosa",
    short_label: "Fructosa",
    label: "Fructosa (frutas y miel)",
    icon: "🍯",
    category: "intolerance",
  },
  {
    id: "gluten",
    short_label: "Gluten",
    label: "Gluten (trigo, cebada, centeno)",
    icon: "🌾",
    category: "allergy",
  },
  {
    id: "sorbitol",
    short_label: "Sorbitol",
    label: "Sorbitol (edulcorantes y frutas de hueso)",
    icon: "🍬",
    category: "intolerance",
  },
  {
    id: "sulfitos",
    short_label: "Sulfitos",
    label: "Sulfitos (vino y conservas)",
    icon: "🍷",
    category: "allergy",
  },
  {
    id: "histamina",
    short_label: "Histamina",
    label: "Histamina (fermentados y embutidos)",
    icon: "🧀",
    category: "intolerance",
  },
  {
    id: "glutamato_monosodico",
    short_label: "Glutamato monosódico",
    label: "Glutamato monosódico (ultraprocesados)",
    icon: "🧂",
    category: "intolerance",
  },
  // Resto de alérgenos UE 14 + adicionales de uso frecuente.
  { id: "huevo", short_label: "Huevo", label: "Huevo", icon: "🥚", category: "allergy" },
  { id: "pescado", short_label: "Pescado", label: "Pescado", icon: "🐟", category: "allergy" },
  { id: "mariscos", short_label: "Mariscos", label: "Mariscos (crustáceos)", icon: "🦐", category: "allergy" },
  { id: "moluscos", short_label: "Moluscos", label: "Moluscos", icon: "🦪", category: "allergy" },
  { id: "frutos_secos", short_label: "Frutos secos", label: "Frutos secos", icon: "🥜", category: "allergy" },
  { id: "cacahuete", short_label: "Cacahuete", label: "Cacahuete", icon: "🥜", category: "allergy" },
  { id: "soja", short_label: "Soja", label: "Soja", icon: "🫘", category: "allergy" },
  { id: "apio", short_label: "Apio", label: "Apio", icon: "🥬", category: "allergy" },
  { id: "mostaza", short_label: "Mostaza", label: "Mostaza", icon: "🟡", category: "allergy" },
  { id: "sesamo", short_label: "Sésamo", label: "Sésamo", icon: "⚪", category: "allergy" },
  { id: "altramuces", short_label: "Altramuces", label: "Altramuces", icon: "🫘", category: "allergy" },
  { id: "fodmap", short_label: "FODMAP", label: "FODMAP", icon: "🍎", category: "intolerance" },
  { id: "cafeina", short_label: "Cafeína", label: "Cafeína", icon: "☕", category: "intolerance" },
  { id: "alcohol", short_label: "Alcohol", label: "Alcohol", icon: "🍺", category: "intolerance" },
];

export const ALLERGEN_OPTIONS = DIETARY_RESTRICTIONS.filter(
  (o) => o.category === "allergy",
);

export const INTOLERANCE_OPTIONS = DIETARY_RESTRICTIONS.filter(
  (o) => o.category === "intolerance",
);

/** Formato listo para `<MultiSelect data={...} />` de Mantine. */
export const ALLERGENS_SELECT_DATA = ALLERGEN_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));

export const INTOLERANCES_SELECT_DATA = INTOLERANCE_OPTIONS.map((o) => ({
  value: o.id,
  label: o.label,
}));

/**
 * Labels completos (incluye descripción) de TODAS las restricciones, en el
 * orden en que deben aparecer en el cuestionario del sistema. Se usa en la
 * migración Alembic del formulario global y permite que la respuesta se
 * guarde con el texto legible directamente.
 */
export const ALL_DIETARY_FORM_OPTIONS = DIETARY_RESTRICTIONS.map((o) => o.label);

/** Lookup rápido por id. */
export function findDietaryRestriction(
  id: string,
): DietaryRestriction | undefined {
  const normalized = id.toLowerCase();
  return DIETARY_RESTRICTIONS.find(
    (o) =>
      o.id.toLowerCase() === normalized ||
      o.short_label.toLowerCase() === normalized ||
      o.label.toLowerCase() === normalized,
  );
}
