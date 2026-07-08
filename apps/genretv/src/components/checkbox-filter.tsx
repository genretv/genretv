import { Button, Checkbox, Group, Popover, ScrollArea, Stack, Text } from "@mantine/core";

interface CheckboxFilterProps {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onChange: (selected: string[]) => void;
}

export function CheckboxFilter({ label, options, selected, onChange }: CheckboxFilterProps) {
  const selectedSet = new Set(selected);
  const activeLabel = selected.length === 0 ? "All" : String(selected.length);
  const disabled = options.length === 0;

  const toggle = (option: string) => {
    if (selectedSet.has(option)) {
      onChange(selected.filter((value) => value !== option));
      return;
    }
    onChange([...selected, option]);
  };

  return (
    <Popover position="bottom-start" shadow="md" width={240}>
      <Popover.Target>
        <Button className="checkbox-filter-button" variant="default" disabled={disabled}>
          {label}: {disabled ? "None" : activeLabel}
        </Button>
      </Popover.Target>
      <Popover.Dropdown className="checkbox-filter-menu">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={650} size="sm">
              {label}
            </Text>
            <Button size="compact-xs" variant="subtle" disabled={selected.length === 0} onClick={() => onChange([])}>
              Clear
            </Button>
          </Group>
          <ScrollArea.Autosize mah={260}>
            <Stack gap={6}>
              {options.map((option) => (
                <Checkbox
                  key={option}
                  checked={selectedSet.has(option)}
                  label={option}
                  onChange={() => toggle(option)}
                />
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
