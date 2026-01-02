import {
  Anchor,
  Box,
  Breadcrumbs,
  Button,
  Group,
  Text,
} from "@mantine/core";
import { IconPlus, IconChevronRight } from "@tabler/icons-react";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ActionButton | React.ReactNode;
  secondaryAction?: ActionButton & { variant?: string };
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  subtitle,
  breadcrumbs,
  action,
  secondaryAction,
  children,
}: PageHeaderProps) {
  const displayDescription = description || subtitle;

  const isActionElement =
    action && typeof action === "object" && "type" in action;
  const actionButton = isActionElement
    ? undefined
    : (action as ActionButton | undefined);
  const actionElement = isActionElement
    ? (action as React.ReactNode)
    : undefined;

  return (
    <Box mb="xl" className="animate-in">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs 
          mb="md" 
          separator={<IconChevronRight size={14} color="var(--nv-slate-light)" />}
          styles={{
            root: { alignItems: "center" },
            separator: { marginLeft: 8, marginRight: 8 }
          }}
        >
          {breadcrumbs.map((item, index) =>
            item.href ? (
              <Anchor
                component={Link}
                key={index}
                to={item.href}
                size="sm"
                fw={500}
                style={{ 
                  color: "var(--nv-slate)",
                  textDecoration: "none",
                  transition: "color 0.2s"
                }}
                className="breadcrumb-link"
              >
                {item.label}
              </Anchor>
            ) : (
              <Text 
                key={index} 
                size="sm" 
                fw={600}
                style={{ color: "var(--nv-dark)" }}
              >
                {item.label}
              </Text>
            )
          )}
        </Breadcrumbs>
      )}

      <Group align="flex-start" justify="space-between" wrap="nowrap">
        <Box style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--nv-dark)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {title}
          </Text>
          {displayDescription && (
            <Text 
              mt="xs" 
              size="md"
              style={{ 
                color: "var(--nv-slate)",
                maxWidth: 500
              }}
            >
              {displayDescription}
            </Text>
          )}
        </Box>

        <Group gap="sm">
          {secondaryAction && (
            <Button
              leftSection={secondaryAction.icon}
              onClick={secondaryAction.onClick}
              variant="default"
              radius="xl"
              styles={{
                root: {
                  borderColor: "var(--border-medium)",
                  fontWeight: 600,
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "var(--nv-surface-subtle)",
                    borderColor: "var(--nv-slate-light)"
                  }
                }
              }}
            >
              {secondaryAction.label}
            </Button>
          )}
          {actionElement}
          {actionButton && (
            <Button
              leftSection={actionButton.icon || <IconPlus size={18} stroke={2.5} />}
              onClick={actionButton.onClick}
              radius="xl"
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                  boxShadow: "0 4px 14px rgba(231, 226, 71, 0.3)",
                  transition: "all 0.2s",
                  "&:hover": {
                    background: "var(--nv-accent-hover)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 20px rgba(231, 226, 71, 0.4)"
                  }
                }
              }}
            >
              {actionButton.label}
            </Button>
          )}
        </Group>
      </Group>

      {children && <Box mt="lg">{children}</Box>}

      <style>{`
        .breadcrumb-link:hover {
          color: var(--nv-primary) !important;
        }
      `}</style>
    </Box>
  );
}
