export const meta = { title: "Card" };

import { Button, Card, Group, Stack, Text, Title } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Card shadow="sm" padding="lg">
      <Stack>
        <Title order={3} size={4}>
          Monthly report
        </Title>
        <Text c="dimmed">Revenue is up 12% compared with last month.</Text>
        <Group justify="flex-end">
          <Button variant="light">Open report</Button>
        </Group>
      </Stack>
    </Card>
  );
}
