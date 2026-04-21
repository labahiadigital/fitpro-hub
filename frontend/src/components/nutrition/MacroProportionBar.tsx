import { Badge, Box, Group, NumberInput, Stack, Text, Tooltip } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";

export interface MacroPct {
  protein: number;
  carbs: number;
  fat: number;
}

interface MacroProportionBarProps {
  value: MacroPct;
  onChange: (next: MacroPct) => void;
  targetCalories: number;
  /** Render compacto (sin el bloque de inputs numéricos) */
  compact?: boolean;
}

// Presets comunes utilizados en nutrición deportiva.
const PRESETS: Array<{ label: string; value: MacroPct; description: string }> = [
  { label: "Equilibrado", value: { protein: 30, carbs: 40, fat: 30 }, description: "Balance general" },
  { label: "Alto en proteína", value: { protein: 40, carbs: 35, fat: 25 }, description: "Definición / fuerza" },
  { label: "Volumen", value: { protein: 25, carbs: 55, fat: 20 }, description: "Ganancia muscular" },
  { label: "Low-carb", value: { protein: 35, carbs: 20, fat: 45 }, description: "Baja en carbos" },
  { label: "Cetogénica", value: { protein: 25, carbs: 5, fat: 70 }, description: "Keto" },
  { label: "Mediterránea", value: { protein: 20, carbs: 50, fat: 30 }, description: "Estilo mediterráneo" },
];

const MIN = 5;
const MAX = 90;

const COLORS = {
  protein: { bg: "var(--mantine-color-green-5)", text: "#16A34A", light: "var(--mantine-color-green-1)" },
  carbs: { bg: "var(--mantine-color-orange-5)", text: "#EA580C", light: "var(--mantine-color-orange-1)" },
  fat: { bg: "var(--mantine-color-grape-5)", text: "#9333EA", light: "var(--mantine-color-grape-1)" },
};

function clamp(n: number, min = MIN, max = MAX): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Asegura que los tres valores sumen 100 respetando MIN y MAX.
 * Si no lo suman, ajusta proporcionalmente.
 */
function normalize(p: number, c: number, f: number): MacroPct {
  const clamped = {
    protein: clamp(p),
    carbs: clamp(c),
    fat: clamp(f),
  };
  const sum = clamped.protein + clamped.carbs + clamped.fat;
  if (sum === 100) return clamped;
  const diff = 100 - sum;
  // Reparte el desbalance entre los dos mayores (priorizando carbs y fat).
  const keys: (keyof MacroPct)[] = ["carbs", "fat", "protein"];
  const adjusted = { ...clamped };
  let remaining = diff;
  for (const k of keys) {
    if (remaining === 0) break;
    const newVal = clamp(adjusted[k] + remaining);
    remaining -= newVal - adjusted[k];
    adjusted[k] = newVal;
  }
  return adjusted;
}

export function MacroProportionBar({ value, onChange, targetCalories, compact = false }: MacroProportionBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<null | "handle1" | "handle2">(null);
  const [localValue, setLocalValue] = useState<MacroPct>(value);

  useEffect(() => {
    if (!dragging) setLocalValue(value);
  }, [value, dragging]);

  const current = dragging ? localValue : value;

  const commit = useCallback(
    (next: MacroPct) => {
      const normalized = normalize(next.protein, next.carbs, next.fat);
      onChange(normalized);
    },
    [onChange]
  );

  // Posiciones de los handles como % acumulado.
  const handle1Pos = current.protein;
  const handle2Pos = current.protein + current.carbs;

  // Handler común de drag para ambos handles.
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      const pct = Math.round(rawPct);

      setLocalValue((prev) => {
        if (dragging === "handle1") {
          // handle1 separa proteína | carbos. Proteína = pct, carbos = handle2Abs - pct, fat fija.
          const newProtein = clamp(pct);
          const handle2Abs = prev.protein + prev.carbs;
          const newCarbs = clamp(handle2Abs - newProtein, MIN, 100 - newProtein - MIN);
          const newFat = 100 - newProtein - newCarbs;
          return { protein: newProtein, carbs: newCarbs, fat: clamp(newFat) };
        }
        // handle2 separa carbos | grasas. carbs = pct - proteína; fat = 100 - pct.
        const newFat = clamp(100 - pct);
        const newCarbs = clamp(100 - prev.protein - newFat, MIN, 100 - prev.protein - MIN);
        const finalFat = 100 - prev.protein - newCarbs;
        return { protein: prev.protein, carbs: newCarbs, fat: clamp(finalFat) };
      });
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    if (dragging) {
      commit(localValue);
      setDragging(null);
    }
  }, [dragging, localValue, commit]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  const startDrag = (which: "handle1" | "handle2") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setLocalValue(value);
    setDragging(which);
  };

  // Teclado (accesibilidad)
  const handleKeyDown = (which: "handle1" | "handle2") => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    const isDecrement = e.key === "ArrowLeft" || e.key === "ArrowDown";
    const isIncrement = e.key === "ArrowRight" || e.key === "ArrowUp";
    if (!isDecrement && !isIncrement) return;
    e.preventDefault();
    const delta = isIncrement ? step : -step;
    if (which === "handle1") {
      const newProtein = clamp(value.protein + delta);
      const diff = newProtein - value.protein;
      const newCarbs = clamp(value.carbs - diff);
      const newFat = 100 - newProtein - newCarbs;
      commit({ protein: newProtein, carbs: newCarbs, fat: clamp(newFat) });
    } else {
      const newFat = clamp(value.fat - delta);
      const diff = newFat - value.fat;
      const newCarbs = clamp(value.carbs - diff);
      commit({ protein: value.protein, carbs: newCarbs, fat: newFat });
    }
  };

  const gramsProtein = Math.round((targetCalories * current.protein) / 100 / 4);
  const gramsCarbs = Math.round((targetCalories * current.carbs) / 100 / 4);
  const gramsFat = Math.round((targetCalories * current.fat) / 100 / 9);

  // Input numérico: al cambiar uno, repartir la diferencia entre los otros dos proporcionalmente.
  const handleNumberChange = (key: keyof MacroPct) => (raw: number | string) => {
    const v = clamp(typeof raw === "string" ? parseInt(raw, 10) || 0 : raw);
    const others = (["protein", "carbs", "fat"] as const).filter((k) => k !== key);
    const otherSum = value[others[0]] + value[others[1]];
    const remaining = 100 - v;
    let a: number;
    let b: number;
    if (otherSum <= 0) {
      a = Math.round(remaining / 2);
      b = remaining - a;
    } else {
      a = Math.round((value[others[0]] * remaining) / otherSum);
      b = remaining - a;
    }
    const next = {
      ...value,
      [key]: v,
      [others[0]]: clamp(a),
      [others[1]]: clamp(b),
    } as MacroPct;
    commit(next);
  };

  return (
    <Stack gap="sm">
      {/* Barra visual interactiva */}
      <Box>
        <Box
          ref={trackRef}
          style={{
            position: "relative",
            height: 44,
            borderRadius: 12,
            overflow: "hidden",
            background: "var(--mantine-color-gray-1)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
            touchAction: "none",
            userSelect: "none",
            cursor: dragging ? "grabbing" : "default",
          }}
        >
          {/* Segmento Proteína */}
          <Box
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${current.protein}%`,
              background: COLORS.protein.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: dragging ? "none" : "width 120ms ease",
            }}
          >
            {current.protein >= 10 && (
              <Text size="xs" fw={700} c="white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
                P {current.protein}%
              </Text>
            )}
          </Box>

          {/* Segmento Carbohidratos */}
          <Box
            style={{
              position: "absolute",
              left: `${current.protein}%`,
              top: 0,
              bottom: 0,
              width: `${current.carbs}%`,
              background: COLORS.carbs.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: dragging ? "none" : "all 120ms ease",
            }}
          >
            {current.carbs >= 10 && (
              <Text size="xs" fw={700} c="white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
                C {current.carbs}%
              </Text>
            )}
          </Box>

          {/* Segmento Grasas */}
          <Box
            style={{
              position: "absolute",
              left: `${handle2Pos}%`,
              top: 0,
              bottom: 0,
              width: `${current.fat}%`,
              background: COLORS.fat.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: dragging ? "none" : "all 120ms ease",
            }}
          >
            {current.fat >= 10 && (
              <Text size="xs" fw={700} c="white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
                G {current.fat}%
              </Text>
            )}
          </Box>

          {/* Handle 1 (separa P | C) */}
          <Tooltip label="Arrastra para ajustar Proteína / Carbohidratos" withArrow position="top">
            <Box
              role="slider"
              aria-label="Separador proteína y carbohidratos"
              aria-valuenow={handle1Pos}
              aria-valuemin={MIN}
              aria-valuemax={MAX}
              tabIndex={0}
              onPointerDown={startDrag("handle1")}
              onKeyDown={handleKeyDown("handle1")}
              style={{
                position: "absolute",
                left: `calc(${handle1Pos}% - 10px)`,
                top: -4,
                bottom: -4,
                width: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "ew-resize",
                zIndex: 2,
              }}
            >
              <Box
                style={{
                  width: 6,
                  height: "100%",
                  background: "white",
                  borderRadius: 4,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 0 0 1.5px rgba(0,0,0,0.08)",
                }}
              />
            </Box>
          </Tooltip>

          {/* Handle 2 (separa C | G) */}
          <Tooltip label="Arrastra para ajustar Carbohidratos / Grasas" withArrow position="top">
            <Box
              role="slider"
              aria-label="Separador carbohidratos y grasas"
              aria-valuenow={handle2Pos}
              aria-valuemin={MIN}
              aria-valuemax={MAX}
              tabIndex={0}
              onPointerDown={startDrag("handle2")}
              onKeyDown={handleKeyDown("handle2")}
              style={{
                position: "absolute",
                left: `calc(${handle2Pos}% - 10px)`,
                top: -4,
                bottom: -4,
                width: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "ew-resize",
                zIndex: 2,
              }}
            >
              <Box
                style={{
                  width: 6,
                  height: "100%",
                  background: "white",
                  borderRadius: 4,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25), 0 0 0 1.5px rgba(0,0,0,0.08)",
                }}
              />
            </Box>
          </Tooltip>
        </Box>

        {/* Resumen g bajo la barra */}
        <Group mt={6} justify="space-between" gap="xs" wrap="wrap">
          <Group gap={6} align="center">
            <Box w={10} h={10} style={{ borderRadius: 3, background: COLORS.protein.bg }} />
            <Text size="xs" c={COLORS.protein.text} fw={600}>
              Proteína {gramsProtein}g
            </Text>
          </Group>
          <Group gap={6} align="center">
            <Box w={10} h={10} style={{ borderRadius: 3, background: COLORS.carbs.bg }} />
            <Text size="xs" c={COLORS.carbs.text} fw={600}>
              Carbohidratos {gramsCarbs}g
            </Text>
          </Group>
          <Group gap={6} align="center">
            <Box w={10} h={10} style={{ borderRadius: 3, background: COLORS.fat.bg }} />
            <Text size="xs" c={COLORS.fat.text} fw={600}>
              Grasas {gramsFat}g
            </Text>
          </Group>
        </Group>
      </Box>

      {!compact && (
        <>
          {/* Inputs numéricos precisos */}
          <Group grow gap="xs">
            <NumberInput
              label="Proteína %"
              value={value.protein}
              onChange={handleNumberChange("protein")}
              min={MIN}
              max={MAX}
              step={1}
              size="xs"
              suffix="%"
              styles={{ label: { color: COLORS.protein.text, fontWeight: 600 } }}
            />
            <NumberInput
              label="Carbohidratos %"
              value={value.carbs}
              onChange={handleNumberChange("carbs")}
              min={MIN}
              max={MAX}
              step={1}
              size="xs"
              suffix="%"
              styles={{ label: { color: COLORS.carbs.text, fontWeight: 600 } }}
            />
            <NumberInput
              label="Grasas %"
              value={value.fat}
              onChange={handleNumberChange("fat")}
              min={MIN}
              max={MAX}
              step={1}
              size="xs"
              suffix="%"
              styles={{ label: { color: COLORS.fat.text, fontWeight: 600 } }}
            />
          </Group>

          {/* Presets rápidos */}
          <Group gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed" fw={600}>
              Presets:
            </Text>
            {PRESETS.map((preset) => {
              const isActive =
                value.protein === preset.value.protein &&
                value.carbs === preset.value.carbs &&
                value.fat === preset.value.fat;
              return (
                <Tooltip key={preset.label} label={preset.description} withArrow>
                  <Badge
                    size="sm"
                    variant={isActive ? "filled" : "light"}
                    color={isActive ? "blue" : "gray"}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => commit(preset.value)}
                  >
                    {preset.label} {preset.value.protein}/{preset.value.carbs}/{preset.value.fat}
                  </Badge>
                </Tooltip>
              );
            })}
          </Group>
        </>
      )}
    </Stack>
  );
}
