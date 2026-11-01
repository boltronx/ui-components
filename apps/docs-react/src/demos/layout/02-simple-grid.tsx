export const meta = {
  title: "SimpleGrid",
  description:
    "Fits as many columns as the width allows. Resize the window to see it reflow; no breakpoints needed."
};

import { Card, SimpleGrid, Text } from "@boltronx/react-ui";

export default function Demo() {
  return (
    <SimpleGrid minChildWidth="10rem" gap="sm">
      {[1, 2, 3, 4, 5, 6].map(item => (
        <Card key={item}>
          <Text>Card {item}</Text>
        </Card>
      ))}
    </SimpleGrid>
  );
}
