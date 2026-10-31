export const meta = {
  title: "In a form",
  description: "Submits YYYY-MM-DD under its name, and validates required, min and max on submit."
};

import { createSignal, Show } from "solid-js";

import { Button, Code, DatePicker, Group, Stack } from "@boltronx/solid-ui";

export default function Demo() {
  const [submitted, setSubmitted] = createSignal<string>();

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSubmitted(`start=${data.get("start")}  end=${data.get("end")}`);
      }}
      onReset={() => setSubmitted(undefined)}
    >
      <Stack>
        <Group grow wrap align="flex-start">
          <DatePicker label="Start" name="start" required />
          <DatePicker label="End" name="end" defaultValue="2026-12-31" required />
        </Group>
        <Group justify="flex-end">
          <Button type="reset">Reset</Button>
          <Button type="submit" variant="primary">
            Submit
          </Button>
        </Group>
        <Show when={submitted()}>{text => <Code block>{text()}</Code>}</Show>
      </Stack>
    </form>
  );
}
