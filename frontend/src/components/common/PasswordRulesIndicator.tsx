import { Group, Stack, Text } from "@mantine/core";
import { IconCheck, IconCircle, IconX } from "@tabler/icons-react";

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const DEFAULT_PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "Mínimo 8 caracteres",
    test: (v) => v.length >= 8,
  },
  {
    id: "uppercase",
    label: "Al menos una letra mayúscula (A-Z)",
    test: (v) => /[A-Z]/.test(v),
  },
  {
    id: "lowercase",
    label: "Al menos una letra minúscula (a-z)",
    test: (v) => /[a-z]/.test(v),
  },
  {
    id: "number",
    label: "Al menos un número (0-9)",
    test: (v) => /[0-9]/.test(v),
  },
];

export function isStrongPassword(value: string, rules = DEFAULT_PASSWORD_RULES): boolean {
  return rules.every((r) => r.test(value));
}

export function passwordValidator(value: string): string | null {
  if (!value) return "Introduce una contraseña";
  for (const rule of DEFAULT_PASSWORD_RULES) {
    if (!rule.test(value)) return rule.label;
  }
  return null;
}

interface PasswordRulesIndicatorProps {
  value: string;
  /** Si es true, muestra los iconos en blanco para fondos oscuros (auth pages). */
  dark?: boolean;
  rules?: PasswordRule[];
}

export function PasswordRulesIndicator({
  value,
  dark = false,
  rules = DEFAULT_PASSWORD_RULES,
}: PasswordRulesIndicatorProps) {
  const dimColor = dark ? "rgba(255,255,255,0.45)" : "var(--mantine-color-gray-6)";
  const okColor = dark ? "var(--nv-accent, #52B788)" : "var(--mantine-color-green-7)";
  const koColor = dark ? "rgba(255, 95, 95, 0.85)" : "var(--mantine-color-red-7)";
  return (
    <Stack gap={4} mt={6}>
      {rules.map((rule) => {
        const empty = value.length === 0;
        const ok = !empty && rule.test(value);
        const Icon = empty ? IconCircle : ok ? IconCheck : IconX;
        const color = empty ? dimColor : ok ? okColor : koColor;
        return (
          <Group key={rule.id} gap={6} wrap="nowrap" align="center">
            <Icon size={12} color={color} stroke={2.5} />
            <Text size="xs" c={empty ? dimColor : ok ? okColor : koColor}>
              {rule.label}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}
