export const meta = {
  title: "In a form",
  description: "Submits YYYY-MM-DD under its name, and validates required, min and max on submit."
};

import { useState } from "react";

import { Button, Code, DatePicker, Group, Stack } from "@boltronx/react-ui";

export default function Demo() {
  const [submitted, setSubmitted] = useState<string>();

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
        {submitted && <Code block>{submitted}</Code>}
      </Stack>
    </form>
  );
}
