export const meta = {
  title: "View, then edit",
  description:
    "ReadOnlyProvider makes every input inside read-only, for a saved record shown before an Edit button."
};

import { createSignal } from "solid-js";

import {
  Button,
  Checkbox,
  Group,
  Input,
  ReadOnlyProvider,
  Select,
  SimpleGrid,
  Stack
} from "@boltronx/solid-ui";

export default function Demo() {
  const [editing, setEditing] = createSignal(false);

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        setEditing(false);
      }}
    >
      <Stack gap="md">
        <ReadOnlyProvider readOnly={!editing()}>
          <SimpleGrid minChildWidth="14rem" gap="md">
            <Input label="Company" name="company" defaultValue="Analytical Engines Ltd." />
            <Select
              label="Size"
              name="size"
              defaultValue="small"
              options={[
                { value: "small", label: "1–50 people" },
                { value: "large", label: "51+ people" }
              ]}
            />
          </SimpleGrid>
          <Checkbox label="Verified" name="verified" defaultChecked />
        </ReadOnlyProvider>
        <Group justify="flex-end">
          {editing() ? (
            <>
              <Button type="reset" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>Edit</Button>
          )}
        </Group>
      </Stack>
    </form>
  );
}
