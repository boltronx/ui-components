export const meta = {
  title: "IconButton",
  description: "tooltip also gives the button its accessible name."
};

import { Group, IconButton } from "@boltronx/solid-ui";
import { IconEdit, IconSettings, IconTrash } from "@tabler/icons-solidjs";

export default function Demo() {
  return (
    <Group>
      <IconButton tooltip="Settings">
        <IconSettings />
      </IconButton>
      <IconButton tooltip="Edit" color="primary" bordered>
        <IconEdit />
      </IconButton>
      <IconButton tooltip="Delete" color="danger" bordered>
        <IconTrash />
      </IconButton>
    </Group>
  );
}
