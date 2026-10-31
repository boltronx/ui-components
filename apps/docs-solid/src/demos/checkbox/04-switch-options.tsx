export const meta = {
  title: "Switch sizes, labels and icons",
  description:
    "onLabel and offLabel go inside the track, thumbIcon on the thumb. labelPosition works on Checkbox too."
};

import { Group, Stack, Switch } from "@boltronx/solid-ui";
import { IconMoon, IconSun } from "@tabler/icons-solidjs";

export default function Demo() {
  return (
    <Stack gap="md">
      <Group gap="lg" wrap>
        <Switch size="sm" label="Small" defaultChecked />
        <Switch size="md" label="Medium" defaultChecked />
        <Switch size="lg" label="Large" defaultChecked />
      </Group>
      <Switch label="Track labels" onLabel="ON" offLabel="OFF" defaultChecked />
      <Switch label="Track icons" size="lg" onLabel={<IconSun />} offLabel={<IconMoon />} />
      <Switch label="Thumb icon" size="lg" thumbIcon={<IconSun />} defaultChecked />
      <Switch label="Label on the left" labelPosition="left" />
    </Stack>
  );
}
