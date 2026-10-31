// Every component in the states a server render can show, used by the SSR and hydration tests.
// Ids come from createUniqueId, so the server and client trees must match for them to line up.
import {
  Anchor,
  Autocomplete,
  Avatar,
  Button,
  Card,
  Checkbox,
  Code,
  DatePicker,
  Flex,
  Group,
  IconButton,
  Indicator,
  Input,
  InputNumber,
  InputPassword,
  InputSearch,
  Loader,
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Modal,
  Navlink,
  Pagination,
  Progress,
  ReadOnlyProvider,
  ScrollArea,
  Select,
  SimpleGrid,
  Skeleton,
  SplitButton,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  Title,
  useColorScheme
} from "../../src";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana", description: "Yellow" },
  { value: "cherry", label: "Cherry", disabled: true }
];

function ThemeLabel(props: { schemeKey?: string }) {
  // Read once, as the key picks which shared state to use.
  // eslint-disable-next-line solid/reactivity
  const { scheme } = useColorScheme({ key: props.schemeKey });
  return <Text component="span">Theme: {scheme()}</Text>;
}

export function KitchenSink(props: { schemeKey?: string }) {
  return (
    <form>
      <Stack>
        <Title order={2}>Everything</Title>
        <Text>
          Read the <Anchor href="#docs">docs</Anchor> or run <Code>pnpm check</Code>.
        </Text>
        <Code block>{"const a = 1;"}</Code>
        <ThemeLabel schemeKey={props.schemeKey} />
        <Group>
          <Button>Save</Button>
          <Button loading>Saving</Button>
          <IconButton tooltip="Settings">
            <svg aria-hidden="true" />
          </IconButton>
          <SplitButton dropdown={<MenuItem>Save as draft</MenuItem>}>Save</SplitButton>
          <Menu>
            <MenuTarget>
              <Button>Actions</Button>
            </MenuTarget>
            <MenuDropdown>
              <MenuItem>Edit</MenuItem>
              <MenuDivider />
              <MenuItem disabled>Archive</MenuItem>
            </MenuDropdown>
          </Menu>
        </Group>
        <Input label="Name" description="As on your ID" defaultValue="Ada" required />
        <Input label="Email" error="Enter a valid email" />
        <InputPassword label="Password" />
        <InputSearch label="Search" defaultValue="tea" />
        <InputNumber label="Amount" name="amount" currency="USD" defaultValue={1234.5} />
        <Textarea label="Notes" showCount maxLength={20} defaultValue="Hi" autoSize />
        <Checkbox label="Remember me" defaultChecked />
        <Switch
          label="Notifications"
          size="lg"
          onLabel="ON"
          offLabel="OFF"
          thumbIcon={<svg aria-hidden="true" />}
        />
        <Checkbox label="All" indeterminate labelPosition="left" />
        <Flex direction={{ base: "column", md: "row" }} gap="sm" component="section">
          <Text>One</Text>
        </Flex>
        <Select label="Fruit" name="fruit" options={fruits} defaultValue="apple" clearable />
        <Select label="Fruits" options={fruits} multiple defaultValue={["apple", "banana"]} />
        <Autocomplete label="City" options={fruits} defaultValue="Ap" />
        <DatePicker label="Due" name="due" defaultValue="2026-10-05" clearable />
        <ReadOnlyProvider readOnly>
          <Input label="Locked" defaultValue="read only" />
        </ReadOnlyProvider>
        <SimpleGrid>
          <Card>One</Card>
          <Card shadow="sm">Two</Card>
        </SimpleGrid>
        <Loader />
        <Loader variant="dots" />
        <Progress value={40} label="40%" />
        <Skeleton height={20} />
        <Avatar label="Ada Lovelace" />
        <Indicator label={120} aria-label="120 unread notifications">
          <Avatar label="Grace Hopper" />
        </Indicator>
        <nav aria-label="Main">
          <Navlink href="#home" label="Home" active />
          <Navlink label="Projects">
            <Navlink href="#site" label="Website" />
          </Navlink>
        </nav>
        <ScrollArea height={100}>
          <Text>Scrollable content</Text>
        </ScrollArea>
        <Table
          aria-label="Orders"
          columns={[
            { header: "Order", render: (row: { id: string }) => row.id, fixed: "left" },
            { header: "Total", render: () => "$12", align: "right" }
          ]}
          data={[{ id: "A-1" }, { id: "A-2" }]}
          pagination={{
            page: 1,
            pageSize: 2,
            totalItems: 6,
            onChange: () => {},
            itemName: "order"
          }}
        />
        <Pagination page={2} totalPages={10} onChange={() => {}} />
        <Modal aria-label="Inline modal card">
          <Modal.Header title="Inline" />
          <Modal.Body>Body</Modal.Body>
          <Modal.Footer>Footer</Modal.Footer>
        </Modal>
      </Stack>
    </form>
  );
}
