export const meta = {
  title: "SimpleGrid",
  description:
    "Fits as many columns as the width allows. Resize the window to see it reflow; no breakpoints needed."
};

import { For } from "solid-js";

import { Card, SimpleGrid, Text } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <SimpleGrid minChildWidth="10rem" gap="sm">
      <For each={[1, 2, 3, 4, 5, 6]}>
        {item => (
          <Card>
            <Text>Card {item}</Text>
          </Card>
        )}
      </For>
    </SimpleGrid>
  );
}
