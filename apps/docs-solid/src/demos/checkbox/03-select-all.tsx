export const meta = {
  title: "Select all (indeterminate)",
  description:
    "indeterminate shows a dash for a partly picked list. It is only a look, so set it from the state you already keep."
};

import { createSignal, For } from "solid-js";

import { Checkbox, Stack } from "@boltronx/solid-ui";

const toppings = ["Cheese", "Mushrooms", "Olives"];

export default function Demo() {
  const [picked, setPicked] = createSignal<string[]>(["Cheese"]);
  const all = () => picked().length === toppings.length;

  return (
    <Stack gap="xs">
      <Checkbox
        label="All toppings"
        checked={all()}
        indeterminate={picked().length > 0 && !all()}
        onChange={() => setPicked(all() ? [] : toppings)}
      />
      <Stack gap="xs" style={{ "padding-left": "1.75rem" }}>
        <For each={toppings}>
          {topping => (
            <Checkbox
              label={topping}
              name="toppings"
              value={topping}
              checked={picked().includes(topping)}
              onChange={event => {
                const { checked } = event.currentTarget;
                setPicked(current =>
                  checked ? [...current, topping] : current.filter(item => item !== topping)
                );
              }}
            />
          )}
        </For>
      </Stack>
    </Stack>
  );
}
