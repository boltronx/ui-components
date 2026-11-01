export const meta = { title: "Loader and Progress" };

import { Group, Loader, Progress, Stack } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Stack gap="md">
      <Group gap="lg">
        <Loader />
        <Loader variant="dots" />
        <Loader variant="bars" />
        <Loader size="md" color="var(--bx-danger)" />
      </Group>
      <Progress value={35} />
      <Progress value={70} size="lg" striped animated label="70%" />
    </Stack>
  );
}
