import { Anchor, Badge, Box, Group, Stack, Table, Text, type MantineSpacing } from "@mantine/core";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

export function ManagementEditRow({
  children,
  editLabel,
  onEdit,
}: {
  children: ReactNode;
  editLabel: string;
  onEdit: () => void;
}) {
  const handleClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (isExcludedEditTarget(event.target)) return;
    onEdit();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onEdit();
  };

  return (
    <Table.Tr
      aria-label={editLabel}
      className="management-edit-row"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Table.Tr>
  );
}

function isExcludedEditTarget(target: EventTarget): boolean {
  return target instanceof Element && target.closest("a, button, [data-management-row-title]") != null;
}

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
