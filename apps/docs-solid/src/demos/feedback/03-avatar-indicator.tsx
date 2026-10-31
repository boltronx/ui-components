export const meta = { title: "Avatar and Indicator" };

import { Avatar, Group, IconButton, Indicator } from "@boltronx/solid-ui";
import { IconBell } from "@tabler/icons-solidjs";

export default function Demo() {
  return (
    <Group gap="lg">
      <Avatar label="Ada Lovelace" />
      <Avatar label="Grace Hopper" color="var(--bx-success)" />
      <Indicator label={3}>
        <IconButton aria-label="Notifications" bordered>
          <IconBell />
        </IconButton>
      </Indicator>
      <Indicator label={120} maxValue={99}>
        <Avatar label="Linus" />
      </Indicator>
    </Group>
  );
}
