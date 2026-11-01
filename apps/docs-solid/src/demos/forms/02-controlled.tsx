export const meta = {
  title: "Controlled inputs",
  description: "Use value and onChange when other parts of the page react to a value as it changes."
};

import { createSignal } from "solid-js";

import { InputNumber, Select, SimpleGrid, Stack, Text } from "@boltronx/solid-ui";

const plans = [
  { value: "basic", label: "Basic: ₱500 / seat" },
  { value: "pro", label: "Pro: ₱1,200 / seat" }
];
const prices: Record<string, number> = { basic: 500, pro: 1200 };

export default function Demo() {
  const [plan, setPlan] = createSignal("basic");
  const [seats, setSeats] = createSignal<number | null>(3);
  const total = () => (prices[plan()] ?? 0) * (seats() ?? 0);

  return (
    <Stack>
      <SimpleGrid minChildWidth="14rem">
        <Select
          label="Plan"
          options={plans}
          value={plan()}
          onChange={value => setPlan(value as string)}
        />
        <InputNumber label="Seats" value={seats()} onChange={setSeats} min={1} max={500} />
      </SimpleGrid>
      <Text size="lg" fw={600}>
        Total: ₱{total().toLocaleString()} / month
      </Text>
    </Stack>
  );
}
