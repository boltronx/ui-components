"use client";

import {
  Button,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  message,
  Modal,
  modal,
  useColorScheme
} from "@boltronx/react-ui";

/** The imperative and stateful parts: they only run in the browser, after hydration. */
export function Interactive() {
  const { scheme, setMode } = useColorScheme();

  return (
    <Group>
      <Button onClick={() => setMode(scheme === "dark" ? "light" : "dark")}>Theme: {scheme}</Button>
      <Button onClick={() => message.success("Saved")}>Message</Button>
      <Button
        onClick={() =>
          void modal.open({
            content: ctx => (
              <Modal>
                <Modal.Header title="Hello" {...ctx} />
                <Modal.Body>From a client component.</Modal.Body>
              </Modal>
            )
          })
        }
      >
        Modal
      </Button>
      <Menu>
        <MenuTarget>
          <Button>Actions</Button>
        </MenuTarget>
        <MenuDropdown>
          <MenuItem>Edit</MenuItem>
        </MenuDropdown>
      </Menu>
    </Group>
  );
}
