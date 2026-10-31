export const meta = {
  title: "Icons and loading",
  description:
    "loading keeps the button's size and focus, and blocks clicks. For a submit button, see Forms: it also stops Enter from sending the form again."
};

import { createSignal } from "solid-js";

import { Button, Group, Stack } from "@boltronx/solid-ui";
import { IconDownload, IconPlus } from "@tabler/icons-solidjs";

export default function Demo() {
  const [saving, setSaving] = createSignal(false);
  const save = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  return (
    <Stack>
      <Group wrap>
        <Button leftSection={<IconPlus />}>New item</Button>
        <Button rightSection={<IconDownload />}>Export</Button>
        <Button variant="primary" loading={saving()} onClick={save}>
          {saving() ? "Saving" : "Save"}
        </Button>
      </Group>
      <Button variant="light" fullWidth>
        Full width
      </Button>
    </Stack>
  );
}
