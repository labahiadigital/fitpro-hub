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
    <Box mb="lg" className="animate-in">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs 
          mb="sm" 
          separator={<IconChevronRight size={14} color="var(--nv-slate-light)" />}
          styles={{
            root: { alignItems: "center", flexWrap: "wrap" },
            separator: { marginLeft: 6, marginRight: 6 }
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

      {/* Desktop Layout */}
      <Group 
        align="flex-start" 
        justify="space-between" 
        wrap="wrap"
        gap="md"
        className="page-header-content"
      >
        <Box style={{ flex: 1, minWidth: 200 }}>
          <Text className="page-title">
            {title}
          </Text>
          {displayDescription && (
            <Text 
              mt={6} 
              className="page-subtitle"
            >
              {displayDescription}
            </Text>
          )}
        </Box>

        <Group gap="sm" wrap="wrap" className="page-header-actions">
          {secondaryAction && (
            <Button
              leftSection={secondaryAction.icon}
              onClick={secondaryAction.onClick}
              variant="default"
              radius="md"
              size="sm"
              styles={{
                root: {
                  borderColor: "var(--border-medium)",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }
              }}
            >
              <span className="btn-label-full">{secondaryAction.label}</span>
            </Button>
          )}
          {actionElement}
          {actionButton && (
            <Button
              leftSection={actionButton.icon || <IconPlus size={16} stroke={2.5} />}
              onClick={actionButton.onClick}
              radius="md"
              size="sm"
              styles={{
                root: {
                  background: "var(--nv-accent)",
                  color: "var(--nv-dark)",
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(231, 226, 71, 0.25)",
                  transition: "all 0.2s",
                  "&:hover": {
                    background: "var(--nv-accent-hover)",
                    boxShadow: "0 4px 12px rgba(231, 226, 71, 0.35)"
                  }
                }
              }}
            >
              <span className="btn-label-full">{actionButton.label}</span>
            </Button>
          )}
        </Group>
      </Group>

      {children && <Box mt="md">{children}</Box>}

      <style>{`
        .breadcrumb-link:hover {
          color: var(--nv-primary) !important;
        }
        
        @media (max-width: 640px) {
          .page-header-content {
            flex-direction: column;
            align-items: stretch !important;
          }
          
          .page-header-actions {
            width: 100%;
            justify-content: stretch;
          }
          
          .page-header-actions > button {
            flex: 1;
          }
        }
      `}</style>
    </Box>
  );
}
