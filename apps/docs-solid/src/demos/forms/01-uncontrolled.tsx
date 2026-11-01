export const meta = {
  title: "An uncontrolled form",
  description:
    "Edit the fields, then submit to see the FormData, or reset to bring the defaults back."
};

import { createSignal, Show } from "solid-js";

import {
  Button,
  Checkbox,
  Code,
  DatePicker,
  Group,
  Input,
  InputNumber,
  Select,
  SimpleGrid,
  Stack,
  Textarea
} from "@boltronx/solid-ui";

const roles = [
  { value: "engineer", label: "Engineer" },
  { value: "designer", label: "Designer" },
  { value: "manager", label: "Manager" }
];

const tags = ["Remote", "Full-time", "Mentor"].map(label => ({
  value: label.toLowerCase(),
  label
}));

/** FormData as a plain object; keys that appear more than once become arrays. */
function toObject(data: FormData) {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(data.keys())) {
    const values = data.getAll(key).map(String);
    result[key] = values.length > 1 ? values : values[0]!;
  }
  return result;
}

export default function Demo() {
  const [submitted, setSubmitted] = createSignal<string>();

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        setSubmitted(JSON.stringify(toObject(new FormData(event.currentTarget)), null, 2));
      }}
      onReset={() => setSubmitted(undefined)}
    >
      <Stack gap="md">
        <SimpleGrid minChildWidth="14rem" gap="md">
          <Input label="Name" name="name" defaultValue="Ada Lovelace" required />
          <Input label="Email" name="email" type="email" defaultValue="ada@example.com" />
          <Select label="Role" name="role" options={roles} defaultValue="engineer" required />
          <Select label="Tags" name="tags" options={tags} multiple defaultValue={["remote"]} />
          <InputNumber label="Salary" name="salary" currency="PHP" defaultValue={85000} min={0} />
          <DatePicker label="Start date" name="startDate" defaultValue="2026-11-02" required />
        </SimpleGrid>
        <Textarea label="Bio" name="bio" defaultValue="First programmer." autoSize maxRows={4} />
        <Checkbox label="Subscribe to the newsletter" name="newsletter" defaultChecked />
        <Group justify="flex-end">
          <Button type="reset">Reset</Button>
          <Button type="submit" variant="primary">
            Submit
          </Button>
        </Group>
        <Show when={submitted()}>{json => <Code block>{json()}</Code>}</Show>
      </Stack>
    </form>
  );
}
