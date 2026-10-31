export const meta = {
  title: "Switch",
  description:
    "For a setting that takes effect right away. It is a checkbox underneath, so it submits, resets and validates the same way."
};

import { Stack, Switch } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Stack gap="md">
      <Switch label="Notifications" defaultChecked />
      <Switch label="Dark mode" description="Follows the system until you change it." />
      <Switch label="Disabled" disabled />
    </Stack>
  );
}
