export const meta = {
  title: "InputNumber",
  description:
    "Shows grouped digits, submits the plain number. Values are clamped to min and max on blur."
};

import { useState } from "react";

import { InputNumber, SimpleGrid } from "@boltronx/react-ui";

export default function Demo() {
  const [price, setPrice] = useState<number | null>(1234.5);

  return (
    <SimpleGrid minChildWidth="14rem">
      <InputNumber label="Quantity" defaultValue={12} min={0} max={999} />
      <InputNumber
        label="Price"
        currency="PHP"
        value={price}
        onChange={setPrice}
        description={`Value: ${String(price)}`}
      />
    </SimpleGrid>
  );
}
