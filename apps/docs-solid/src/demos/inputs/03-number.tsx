export const meta = {
  title: "InputNumber",
  description:
    "Shows grouped digits, submits the plain number. Values are clamped to min and max on blur."
};

import { createSignal } from "solid-js";

import { InputNumber, SimpleGrid } from "@boltronx/solid-ui";

export default function Demo() {
  const [price, setPrice] = createSignal<number | null>(1234.5);

  return (
    <SimpleGrid minChildWidth="14rem">
      <InputNumber label="Quantity" defaultValue={12} min={0} max={999} />
      <InputNumber
        label="Price"
        currency="PHP"
        value={price()}
        onChange={setPrice}
        description={`Value: ${String(price())}`}
      />
    </SimpleGrid>
  );
}
