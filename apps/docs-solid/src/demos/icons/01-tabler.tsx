export const meta = {
  title: "Using Tabler Icons",
  description:
    "solid-ui ships no icon set. Install @tabler/icons-solidjs (or any library that renders an <svg>) and pass icons to sections and IconButton, which size them to fit."
};

import { Button, Group, IconButton, Input } from "@boltronx/solid-ui";
import { IconDownload, IconMail, IconSettings } from "@tabler/icons-solidjs";

export default function Demo() {
  return (
    <Group>
      <Button leftSection={<IconDownload />}>Export</Button>
      <IconButton tooltip="Settings">
        <IconSettings />
      </IconButton>
      <Input name="email" placeholder="you@example.com" leftSection={<IconMail />} />
    </Group>
  );
}
