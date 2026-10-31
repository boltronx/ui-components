export const meta = {
  title: "Select all (indeterminate)",
  description:
    "indeterminate shows a dash for a partly picked list. It is only a look, so set it from the state you already keep."
};

import { useState } from "react";

import { Checkbox, Stack } from "@boltronx/react-ui";

const toppings = ["Cheese", "Mushrooms", "Olives"];

export default function Demo() {
  const [picked, setPicked] = useState<string[]>(["Cheese"]);
  const all = picked.length === toppings.length;

  return (
    <Stack gap="xs">
      <Checkbox
        label="All toppings"
        checked={all}
        indeterminate={picked.length > 0 && !all}
        onChange={() => setPicked(all ? [] : toppings)}
      />
      <Stack gap="xs" style={{ paddingLeft: "1.75rem" }}>
        {toppings.map(topping => (
          <Checkbox
            key={topping}
            label={topping}
            name="toppings"
            value={topping}
            checked={picked.includes(topping)}
            onChange={event => {
              // Read now: the event is done by the time React runs the updater.
              const { checked } = event.currentTarget;
              setPicked(current =>
                checked ? [...current, topping] : current.filter(item => item !== topping)
              );
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
}
