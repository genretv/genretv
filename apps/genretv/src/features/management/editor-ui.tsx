import { Anchor, Badge, Box, Group, Stack, Text, type MantineSpacing } from "@mantine/core";
import type { ReactNode } from "react";

export function ManagementEditorSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <Stack className="management-editor-section" gap="sm" component="section">
      <div>
        <Text fw={750}>{title}</Text>
        {description != null && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
      </div>
      {children}
    </Stack>
  );
}

export function ManagementActionBar({ children, gap = "xs" }: { children: ReactNode; gap?: MantineSpacing }) {
  return (
    <Group className="management-action-bar" justify="space-between" align="center" gap={gap}>
      {children}
    </Group>
  );
}

export function ParsedListPreview({
  emptyLabel = "None parsed",
  label,
  values,
  variant = "light",
}: {
  emptyLabel?: string;
  label: string;
  values: readonly string[];
  variant?: "light" | "outline";
}) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Group gap={4}>
        {values.length === 0 ? (
          <Text size="xs" c="dimmed">
            {emptyLabel}
          </Text>
        ) : (
          values.map((value) => (
            <Badge key={`${label}-${value}`} size="xs" variant={variant}>
              {value}
            </Badge>
          ))
        )}
      </Group>
    </Stack>
  );
}

export function ParsedLinksPreview({
  emptyLabel = "No usable links parsed",
  links,
}: {
  emptyLabel?: string;
  links: readonly { kind?: string; label: string; url: string }[];
}) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        Parsed links
      </Text>
      {links.length === 0 ? (
        <Text size="xs" c="dimmed">
          {emptyLabel}
        </Text>
      ) : (
        <Stack gap={3}>
          {links.map((link) => (
            <Box key={`${link.label}-${link.url}`}>
              <Anchor href={link.url} target="_blank" size="xs">
                {link.kind == null ? link.label : `${link.kind}: ${link.label}`}
              </Anchor>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
