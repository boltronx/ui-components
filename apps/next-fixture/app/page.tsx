// A Server Component that imports the package barrel, the way an app would. The presentational
// components render here on the server; the interactive ones become client components. Props
// crossing into them must be serializable, so nothing here passes a function to a client
// component except a server action.
import {
  Anchor,
  Avatar,
  Button,
  Card,
  Checkbox,
  Code,
  DatePicker,
  Flex,
  Group,
  Indicator,
  Input,
  InputNumber,
  Loader,
  Progress,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  Textarea,
  Title
} from "@boltronx/react-ui";

import { Interactive } from "./interactive";
import { OrdersTable } from "./orders-table";

async function save(formData: FormData) {
  "use server";
  console.log("saved", Object.fromEntries(formData));
}

export default function Page() {
  return (
    <main>
      <Stack gap="lg" style={{ padding: 24, maxWidth: 720 }}>
        <Title order={1}>Server-rendered page</Title>
        <Text c="dimmed">
          Rendered by a Server Component. See <Anchor href="https://nextjs.org">Next.js</Anchor> and{" "}
          <Code>@boltronx/react-ui</Code>.
        </Text>
        <Flex direction={{ base: "column", md: "row" }} gap="sm" className="responsive-row">
          <Text>Flex column on phones, row from md</Text>
        </Flex>
        <SimpleGrid>
          <Card>
            <Group>
              <Indicator label={3} aria-label="3 unread notifications">
                <Avatar label="Ada Lovelace" />
              </Indicator>
              <Loader />
            </Group>
          </Card>
          <Card shadow="sm">
            <Progress value={60} label="60%" />
            <Skeleton height={12} />
          </Card>
        </SimpleGrid>

        <form action={save}>
          <Stack>
            <Input label="Name" name="name" defaultValue="Ada" required />
            <InputNumber label="Budget" name="budget" currency="USD" defaultValue={1234.5} />
            <Select
              label="Country"
              name="country"
              defaultValue="ph"
              options={[
                { value: "ph", label: "Philippines" },
                { value: "jp", label: "Japan" }
              ]}
            />
            <DatePicker label="Start" name="start" defaultValue="2026-10-05" />
            <Textarea label="Notes" name="notes" showCount maxLength={200} />
            <Checkbox label="Subscribe" name="subscribe" defaultChecked />
            <Switch label="Notifications" name="notifications" onLabel="ON" offLabel="OFF" />
            <Button type="submit" variant="primary">
              Save
            </Button>
          </Stack>
        </form>

        <OrdersTable />
        <Interactive />
      </Stack>
    </main>
  );
}
