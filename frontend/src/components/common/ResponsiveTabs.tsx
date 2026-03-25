import { Select, Tabs } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { ReactNode } from "react";

interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface ResponsiveTabsProps {
  tabs: TabItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  children: ReactNode;
  /** Extra handler for specific tab clicks (e.g., "tags" opens a modal) */
  onTabClick?: (value: string) => boolean | void;
}

export function ResponsiveTabs({
  tabs,
  value,
  onChange,
  children,
  onTabClick,
}: ResponsiveTabsProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <>
      {isMobile && (
        <Select
          value={value}
          onChange={(v) => {
            if (v && onTabClick) {
              const handled = onTabClick(v);
              if (handled) return;
            }
            onChange(v);
          }}
          data={tabs.map((t) => ({ value: t.value, label: t.label }))}
          size="sm"
          radius="md"
          mb="md"
        />
      )}
      <Tabs value={value} onChange={(v) => {
        if (v && onTabClick) {
          const handled = onTabClick(v);
          if (handled) return;
        }
        onChange(v);
      }}>
        {!isMobile && (
          <Tabs.List mb="md" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            {tabs.map((t) => (
              <Tabs.Tab
                key={t.value}
                value={t.value}
                leftSection={t.icon}
                style={{ fontWeight: 600, fontSize: "13px" }}
              >
                {t.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        )}
        {children}
      </Tabs>
    </>
  );
}
