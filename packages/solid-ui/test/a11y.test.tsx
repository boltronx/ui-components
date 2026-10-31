// Runs axe-core, the standard accessibility rule engine, over every component in its main states,
// open dropdowns and dialogs included. jsdom has no layout, so color contrast is not checked here.
import type { JSX } from "solid-js";
import { cleanup, render, screen } from "@solidjs/testing-library";

import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import {
  Anchor,
  Autocomplete,
  Avatar,
  Button,
  Card,
  Checkbox,
  Code,
  DatePicker,
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
  modal,
  Navlink,
  Pagination,
  Progress,
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
  Title
} from "../src";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana", description: "Yellow" },
  { value: "cherry", label: "Cherry", disabled: true }
];

/** The axe violations on the whole document (dropdowns and dialogs are portaled to <body>). */
async function violations() {
  const results = await axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: {
      // jsdom has no layout or colors.
      "color-contrast": { enabled: false },
      // Components are rendered without a page around them.
      region: { enabled: false },
      "page-has-heading-one": { enabled: false },
      "landmark-one-main": { enabled: false }
    }
  });
  return results.violations.map(
    violation =>
      `${violation.id}: ${violation.help}\n  ${violation.nodes.map(node => node.html).join("\n  ")}`
  );
}

async function expectAccessible(ui: () => JSX.Element) {
  render(ui);
  expect(await violations()).toEqual([]);
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("accessibility (axe)", () => {
  it("text inputs, with labels, descriptions, errors and the disabled state", () =>
    expectAccessible(() => (
      <form>
        <Input label="Name" description="As on your ID" required />
        <Input label="Email" error="Enter a valid email" />
        <Input aria-label="Unlabelled but named" />
        <InputPassword label="Password" />
        <InputSearch label="Search" defaultValue="tea" />
        <InputNumber label="Amount" currency="USD" defaultValue={12} />
        <Textarea label="Notes" showCount maxLength={20} defaultValue="Almost at the limit" />
        <Input label="Disabled" disabled />
      </form>
    )));

  it("closed Select, Autocomplete and DatePicker", () =>
    expectAccessible(() => (
      <form>
        <Select label="Fruit" options={fruits} defaultValue="apple" clearable />
        <Select label="Fruits" options={fruits} multiple defaultValue={["apple", "banana"]} />
        <Select aria-label="Fruit without a visible label" options={fruits} />
        <Autocomplete label="City" options={fruits} />
        <DatePicker label="Due" clearable defaultValue="2026-10-05" />
      </form>
    )));

  it("an open Select, with search", async () => {
    render(() => <Select label="Fruit" options={fruits} searchable />);
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByRole("listbox");
    await userEvent.keyboard("{ArrowDown}");
    expect(await violations()).toEqual([]);
  });

  it("an open Select with nothing found, and one loading", async () => {
    render(() => (
      <>
        <Select label="Fruit" options={[]} nothingFoundMessage="No fruit" />
        <Select label="Loading" options={[]} loading />
      </>
    ));
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByText("No fruit");
    expect(await violations()).toEqual([]);
  });

  it("an open Autocomplete", async () => {
    render(() => <Autocomplete label="City" options={fruits} />);
    await userEvent.click(screen.getByLabelText("City"));
    await screen.findByRole("listbox");
    await userEvent.keyboard("{ArrowDown}");
    expect(await violations()).toEqual([]);
  });

  it("an open DatePicker", async () => {
    render(() => <DatePicker label="Due" defaultValue="2026-10-05" />);
    await userEvent.click(screen.getByLabelText("Due"));
    await screen.findByRole("dialog", { name: "Choose a date" });
    expect(await violations()).toEqual([]);
  });

  it("checkboxes and switches", () =>
    expectAccessible(() => (
      <>
        <Checkbox label="Remember me" description="For 30 days" />
        <Switch label="Notifications" defaultChecked />
        <Switch label="With labels" size="lg" onLabel="ON" offLabel="OFF" />
        <Checkbox label="Some picked" indeterminate labelPosition="left" />
        <Checkbox label="Disabled" disabled />
      </>
    )));

  it("buttons", () =>
    expectAccessible(() => (
      <Group>
        <Button>Save</Button>
        <Button loading>Saving</Button>
        <IconButton tooltip="Settings">
          <svg aria-hidden="true" />
        </IconButton>
        <IconButton aria-label="Delete row 3" tooltip="Delete">
          <svg aria-hidden="true" />
        </IconButton>
        <SplitButton dropdown={<MenuItem>Save as draft</MenuItem>}>Save</SplitButton>
      </Group>
    )));

  it("an open Menu, with a selected item", async () => {
    render(() => (
      <Menu>
        <MenuTarget>
          <IconButton tooltip="Theme">
            <svg aria-hidden="true" />
          </IconButton>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem selected>Light</MenuItem>
          <MenuItem selected={false}>Dark</MenuItem>
          <MenuDivider />
          <MenuItem disabled>Unavailable</MenuItem>
        </MenuDropdown>
      </Menu>
    ));
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));
    await screen.findByRole("menu");
    expect(await violations()).toEqual([]);
  });

  it("a Menu whose target is not focusable on its own", () =>
    expectAccessible(() => (
      <Menu>
        <MenuTarget ariaLabel="Account">
          <Avatar label="Ada Lovelace" />
        </MenuTarget>
        <MenuDropdown>
          <MenuItem>Sign out</MenuItem>
        </MenuDropdown>
      </Menu>
    )));

  it("an open Modal", async () => {
    void modal.open({
      content: ctx => (
        <Modal>
          <Modal.Header title="Edit profile" {...ctx} />
          <Modal.Body>
            <Input label="Name" />
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => ctx.close()}>Done</Button>
          </Modal.Footer>
        </Modal>
      )
    });
    await screen.findByRole("dialog", { name: "Edit profile" });
    expect(await violations()).toEqual([]);
    modal.closeAll();
  });

  it("feedback: Loader, Progress, Skeleton, Avatar and Indicator", () =>
    expectAccessible(() => (
      <Stack>
        <Loader />
        <Progress value={40} label="40%" />
        <Progress value={70} aria-label="Upload progress" />
        <Skeleton height={20} />
        <Avatar label="Ada Lovelace" />
        <Indicator label={3} aria-label="3 unread notifications">
          <Avatar label="Grace Hopper" />
        </Indicator>
      </Stack>
    )));

  it("data: Table, its empty and loading states, and Pagination", () =>
    expectAccessible(() => (
      <Stack>
        <Table
          aria-label="Orders"
          stackBelow={0}
          columns={[
            { header: "Order", render: row => row.id },
            { header: "Total", render: row => row.total, align: "right" }
          ]}
          data={[
            { id: "A-1", total: "$12" },
            { id: "A-2", total: "$30" }
          ]}
          onRowClick={() => {}}
        />
        <Table
          aria-label="Orders with row actions"
          stackBelow={0}
          columns={[{ header: "Order", render: row => row.id }]}
          data={[{ id: "B-1" }, { id: "B-2" }]}
          onRowClick={() => {}}
          rowLabel={row => `Open order ${row.id}`}
        />
        <Table<{ id: string }>
          aria-label="Empty"
          stackBelow={0}
          columns={[{ header: "Id", render: row => row.id }]}
          data={[]}
        />
        <Table
          aria-label="Loading"
          stackBelow={0}
          loading
          columns={[{ header: "Id", render: row => row.id }]}
          data={[{ id: "1" }]}
        />
        <Pagination page={2} totalPages={10} onChange={() => {}} />
        <Pagination
          aria-label="Results pages"
          page={2}
          totalPages={10}
          compact
          onChange={() => {}}
        />
      </Stack>
    )));

  it("layout, typography and navigation", () =>
    expectAccessible(() => (
      <Stack>
        <Title order={2}>Settings</Title>
        <Text>
          Read the <Anchor href="#docs">docs</Anchor> or run <Code>pnpm check</Code>.
        </Text>
        <SimpleGrid>
          <Card>One</Card>
          <Card>Two</Card>
        </SimpleGrid>
        <nav aria-label="Main">
          <Navlink href="#home" label="Home" active />
          <Navlink label="Projects" opened>
            <Navlink href="#site" label="Website" />
          </Navlink>
        </nav>
        <ScrollArea height={100}>
          <Text>Scrollable content</Text>
        </ScrollArea>
        <ScrollArea height={100} focusable aria-label="Terms of service">
          <Text>Long terms</Text>
        </ScrollArea>
      </Stack>
    )));
});
