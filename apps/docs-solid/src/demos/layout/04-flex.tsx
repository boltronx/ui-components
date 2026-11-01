export const meta = {
  title: "Flex",
  description:
    "For what Stack and Group don't cover. direction can change with the screen: a column on phones, a row from md (48rem). Resize the window to see it switch."
};

import { Button, Card, Flex, Text } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Flex direction={{ base: "column", md: "row" }} gap="md" align="stretch">
      <Card style={{ flex: "1" }}>
        <Text fw={600}>Starter</Text>
        <Text size="sm" c="dimmed">
          For trying things out.
        </Text>
      </Card>
      <Card style={{ flex: "1" }}>
        <Text fw={600}>Team</Text>
        <Text size="sm" c="dimmed">
          For a group that ships together.
        </Text>
      </Card>
      <Flex direction="column" justify="center" gap="xs">
        <Button variant="primary">Choose a plan</Button>
        <Button variant="subtle">Compare</Button>
      </Flex>
    </Flex>
  );
}
