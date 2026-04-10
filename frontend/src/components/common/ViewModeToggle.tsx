import { SegmentedControl } from "@mantine/core";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";

interface ViewModeToggleProps {
  value: "grid" | "list";
  onChange: (value: "grid" | "list") => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <SegmentedControl
      size="xs"
      radius="md"
      value={value}
      onChange={(v) => onChange(v as "grid" | "list")}
      data={[
        { value: "grid", label: <IconLayoutGrid size={14} /> },
        { value: "list", label: <IconList size={14} /> },
      ]}
    />
  );
}
