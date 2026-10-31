import { For, Show } from "solid-js";
import { action, useSubmission } from "@solidjs/router";

import {
  Avatar,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Flex,
  Group,
  Indicator,
  Input,
  InputNumber,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  message,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
  useColorScheme
} from "@boltronx/solid-ui";

// A server action: the form posts FormData to the server, with or without JavaScript.
const save = action(async (formData: FormData) => {
  "use server";
  return [...formData.entries()].map(([key, value]) => `${key} = ${String(value)}`);
}, "save");

export default function Home() {
  const submission = useSubmission(save);
  const { scheme, setMode } = useColorScheme();

  return (
    <main>
      <Stack gap="lg" style={{ padding: "24px", "max-width": "760px", margin: "0 auto" }}>
        <Group justify="space-between">
          <Title order={1}>Server-rendered page</Title>
          <Button onClick={() => setMode(scheme() === "dark" ? "light" : "dark")}>
            Theme: {scheme()}
          </Button>
        </Group>
        <Text c="dimmed">
          Rendered by SolidStart on the server, then hydrated. The form posts to a server action and
          works with JavaScript off.
        </Text>

        <Flex
          direction={{ base: "column", md: "row" }}
          gap="md"
          class="responsive-row"
          align="stretch"
        >
          <Card style={{ flex: "1" }}>
            <Group>
              <Indicator label={3} aria-label="3 unread notifications">
                <Avatar label="Ada Lovelace" />
              </Indicator>
              <Text>A column on phones, a row from md</Text>
            </Group>
          </Card>
          <Card style={{ flex: "1" }}>
            <Group>
              <Menu>
                <MenuTarget>
                  <Button>Menu</Button>
                </MenuTarget>
                <MenuDropdown>
                  <MenuItem onClick={() => message.success("Picked")}>Show a message</MenuItem>
                </MenuDropdown>
              </Menu>
              <Button onClick={() => message.info("Hydrated and interactive")}>Message</Button>
            </Group>
          </Card>
        </Flex>

        <form action={save} method="post">
          <Stack>
            <SimpleGrid minChildWidth="14rem">
              <Input label="Name" name="name" defaultValue="Ada" required />
              <InputNumber label="Budget" name="budget" currency="USD" defaultValue={1234.5} />
              <Select
                label="Country"
                name="country"
                searchable
                defaultValue="ph"
                options={[
                  { value: "ph", label: "Philippines" },
                  { value: "jp", label: "Japan" }
                ]}
              />
              <DatePicker label="Start" name="start" defaultValue="2026-10-05" clearable />
            </SimpleGrid>
            <Textarea label="Notes" name="notes" defaultValue="Hello" showCount maxLength={200} />
            <Checkbox label="Subscribe" name="subscribe" defaultChecked />
            <Switch label="Notifications" name="notifications" onLabel="ON" offLabel="OFF" />
            <Group justify="flex-end">
              <Button type="submit" variant="primary" loading={submission.pending}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>

        <Show when={submission.result}>
          {lines => (
            <Card>
              <Text fw={600}>The server action received</Text>
              <For each={lines()}>{line => <Text size="sm">{line}</Text>}</For>
            </Card>
          )}
        </Show>
      </Stack>
    </main>
  );
}
