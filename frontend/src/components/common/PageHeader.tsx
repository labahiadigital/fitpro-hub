import {
  Anchor,
  Box,
  Breadcrumbs,
  Button,
  Group,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
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
  subtitle?: string; // Alias for description
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

  // Check if action is a React element or an action object
  const isActionElement =
    action && typeof action === "object" && "type" in action;
  const actionButton = isActionElement
    ? undefined
    : (action as ActionButton | undefined);
  const actionElement = isActionElement
    ? (action as React.ReactNode)
    : undefined;

  return (
    <Box mb="xl">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs mb="sm" separator="›">
          {breadcrumbs.map((item, index) =>
            item.href ? (
              <Anchor
                c="dimmed"
                component={Link}
                key={index}
                size="sm"
                to={item.href}
              >
                {item.label}
              </Anchor>
            ) : (
              <Text c="dimmed" key={index} size="sm">
                {item.label}
              </Text>
            )
          )}
        </Breadcrumbs>
      )}

      <Group align="flex-start" justify="space-between">
        <Box>
          <Title fw={700} order={2}>
            {title}
          </Title>
          {displayDescription && (
            <Text c="dimmed" mt={4} size="sm">
              {displayDescription}
            </Text>
          )}
        </Box>

        <Group gap="sm">
          {secondaryAction && (
            <Button
              leftSection={secondaryAction.icon}
              onClick={secondaryAction.onClick}
              variant={
                (secondaryAction.variant as "default" | "outline") || "default"
              }
            >
              {secondaryAction.label}
            </Button>
          )}
          {actionElement}
          {actionButton && (
            <Button
              leftSection={actionButton.icon || <IconPlus size={16} />}
              onClick={actionButton.onClick}
            >
              {actionButton.label}
            </Button>
          )}
        </Group>
      </Group>

      {children && <Box mt="md">{children}</Box>}
    </Box>
  );
}
