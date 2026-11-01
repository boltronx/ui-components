export const meta = {
  title: "Group and Stack",
  description: "Rows and columns with token-based gaps."
};

import { Button, Group, Stack } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Stack gap="md">
      <Group justify="space-between" wrap>
        <Button>Left</Button>
        <Group gap="xs">
          <Button>Middle</Button>
          <Button>Right</Button>
        </Group>
      </Group>
      <Group grow>
        <Button>Grows</Button>
        <Button>Equally</Button>
      </Group>
    </Stack>
  );
}
