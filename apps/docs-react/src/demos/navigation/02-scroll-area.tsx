export const meta = {
  title: "ScrollArea",
  description: "Thin overlay scrollbars that show on hover or while scrolling."
};

import { ScrollArea, Stack, Text } from "@boltronx/react-ui";

const rows = Array.from({ length: 20 }, (_, i) => i + 1);

export default function Demo() {
  return (
    <ScrollArea height={180} type="auto" style={{ border: "1px solid var(--bx-border)" }}>
      <Stack gap="xs" style={{ padding: "var(--bx-spacing-md)" }}>
        {rows.map(row => (
          <Text key={row}>Row {row}</Text>
        ))}
      </Stack>
    </ScrollArea>
  );
}
