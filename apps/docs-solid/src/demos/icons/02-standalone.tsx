export const meta = {
  title: "Size, color and labels",
  description:
    "On their own, icons take size, color and strokeWidth. Hide decorative icons from screen readers; give the ones that carry meaning a role and a label."
};

import { Group } from "@boltronx/solid-ui";
import { IconAlertCircle, IconBell, IconLock } from "@tabler/icons-solidjs";

export default function Demo() {
  return (
    <Group>
      <IconBell aria-hidden="true" size={16} />
      <IconBell aria-hidden="true" size={24} />
      <IconBell aria-hidden="true" size={32} strokeWidth={1.5} />
      <IconLock aria-hidden="true" color="var(--bx-primary)" />
      <IconAlertCircle role="img" aria-label="Warning" color="var(--bx-danger)" />
    </Group>
  );
}
