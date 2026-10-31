export const meta = { title: "Checkbox" };

import { Checkbox, Stack } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Stack gap="md">
      <Checkbox label="I agree to the terms" />
      <Checkbox label="Email me about updates" description="At most once a month." defaultChecked />
      <Checkbox label="Disabled" disabled />
    </Stack>
  );
}
