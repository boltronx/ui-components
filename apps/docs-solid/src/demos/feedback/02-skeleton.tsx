export const meta = { title: "Skeleton", description: "Placeholders while content loads." };

import { Group, Skeleton, Stack } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Group align="flex-start" gap="md">
      <Skeleton circle width={48} height={48} />
      <Stack gap="xs" style={{ flex: "1" }}>
        <Skeleton height={14} width="60%" />
        <Skeleton height={12} />
        <Skeleton height={12} width="80%" />
      </Stack>
    </Group>
  );
}
