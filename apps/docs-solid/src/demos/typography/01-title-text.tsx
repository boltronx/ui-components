export const meta = {
  title: "Title and Text",
  description: "Title's order sets the heading level; size changes only its look."
};

import { Stack, Text, Title } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Stack>
      <Title order={1}>Heading 1</Title>
      <Title order={2}>Heading 2</Title>
      <Title order={3}>Heading 3</Title>
      <Title order={2} size={5}>
        An h2 that looks like an h5
      </Title>
      <Text size="lg">Large text</Text>
      <Text>Regular text in a paragraph.</Text>
      <Text size="xs" c="dimmed">
        Small, dimmed text
      </Text>
      <Text c="danger" fw={600}>
        Danger color, bold
      </Text>
      <Text truncate style={{ "max-width": "16rem" }}>
        A long line that gets cut with an ellipsis when it overflows.
      </Text>
    </Stack>
  );
}
