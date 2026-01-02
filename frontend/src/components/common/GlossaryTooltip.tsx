import { Tooltip, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

// Default glossary terms
const DEFAULT_GLOSSARY: Record<string, string> = {
  RM: "Repetición Máxima - El peso máximo que puedes levantar una vez",
  RPE: "Rate of Perceived Exertion - Escala de esfuerzo percibido del 1 al 10",
  AMRAP: "As Many Reps As Possible - Tantas repeticiones como sea posible",
  EMOM: "Every Minute On the Minute - Cada minuto durante un minuto",
  PR: "Personal Record - Récord personal",
  WOD: "Workout Of the Day - Entrenamiento del día",
  HIIT: "High Intensity Interval Training - Entrenamiento de intervalos de alta intensidad",
  LISS: "Low Intensity Steady State - Cardio de baja intensidad constante",
  TUT: "Time Under Tension - Tiempo bajo tensión",
  RIR: "Reps In Reserve - Repeticiones en reserva",
  TDEE: "Total Daily Energy Expenditure - Gasto energético diario total",
  BMR: "Basal Metabolic Rate - Tasa metabólica basal",
  NEAT: "Non-Exercise Activity Thermogenesis - Termogénesis por actividad no relacionada con ejercicio",
  KCAL: "Kilocalorías - Unidad de energía",
  MACROS: "Macronutrientes - Proteínas, carbohidratos y grasas",
  SUPERSETS: "Superseries - Dos ejercicios consecutivos sin descanso",
  DROPSETS: "Series descendentes - Reducir peso y continuar sin descanso",
  IIFYM: "If It Fits Your Macros - Si encaja en tus macros",
  BF: "Body Fat - Porcentaje de grasa corporal",
  LBM: "Lean Body Mass - Masa corporal magra",
  BMI: "Body Mass Index - Índice de masa corporal",
  DOMS: "Delayed Onset Muscle Soreness - Dolor muscular de aparición tardía",
  ROM: "Range of Motion - Rango de movimiento",
  TRX: "Total Resistance Exercise - Sistema de entrenamiento en suspensión",
  BCAA: "Branched Chain Amino Acids - Aminoácidos de cadena ramificada",
  EAA: "Essential Amino Acids - Aminoácidos esenciales",
  GH: "Growth Hormone - Hormona del crecimiento",
  MPS: "Muscle Protein Synthesis - Síntesis de proteína muscular",
};

interface GlossaryTooltipProps {
  term: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}

/**
 * GlossaryTooltip - Muestra un tooltip con la definición de un término/acrónimo
 * 
 * Uso:
 * <GlossaryTooltip term="RM">RM</GlossaryTooltip>
 * <GlossaryTooltip term="RPE" showIcon />
 */
export function GlossaryTooltip({ term, children, showIcon = false }: GlossaryTooltipProps) {
  // Use default glossary (can be extended with workspace custom glossary in the future)
  const glossary = {
    ...DEFAULT_GLOSSARY,
  };
  
  const definition = glossary[term.toUpperCase()];
  
  if (!definition) {
    return <>{children || term}</>;
  }
  
  return (
    <Tooltip
      label={definition}
      multiline
      w={300}
      withArrow
      position="top"
      transitionProps={{ transition: "fade", duration: 200 }}
    >
      <Text
        component="span"
        style={{
          cursor: "help",
          borderBottom: "1px dotted var(--mantine-color-gray-5)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {children || term}
        {showIcon && (
          <IconInfoCircle
            size={14}
            style={{ color: "var(--mantine-color-gray-5)" }}
          />
        )}
      </Text>
    </Tooltip>
  );
}

/**
 * Hook para obtener la definición de un término
 */
export function useGlossary() {
  // Use default glossary (can be extended with workspace custom glossary in the future)
  const glossary = {
    ...DEFAULT_GLOSSARY,
  };
  
  const getDefinition = (term: string): string | undefined => {
    return glossary[term.toUpperCase()];
  };
  
  const hasTerm = (term: string): boolean => {
    return term.toUpperCase() in glossary;
  };
  
  return { glossary, getDefinition, hasTerm };
}

/**
 * Componente para resaltar automáticamente términos del glosario en un texto
 */
interface AutoGlossaryProps {
  text: string;
}

export function AutoGlossary({ text }: AutoGlossaryProps) {
  const { glossary, hasTerm } = useGlossary();
  
  // Create regex pattern from all glossary terms
  const terms = Object.keys(glossary);
  const pattern = new RegExp(`\\b(${terms.join("|")})\\b`, "gi");
  
  // Split text by glossary terms
  const parts = text.split(pattern);
  
  return (
    <>
      {parts.map((part, index) => {
        if (hasTerm(part)) {
          return (
            <GlossaryTooltip key={index} term={part}>
              {part}
            </GlossaryTooltip>
          );
        }
        return part;
      })}
    </>
  );
}

export default GlossaryTooltip;
