export const meta = {
  title: "Variants",
  description: "default, primary, danger, light and subtle."
};

import { Button, Group } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Group wrap>
      <Button>Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="light">Light</Button>
      <Button variant="subtle">Subtle</Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </Group>
  );
}
