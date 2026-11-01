export const meta = {
  title: "Modal",
  description:
    "modal.open() resolves with the value the modal closes with. A form inside works like any other form."
};

import { Button, Group, Input, message, Modal, modal } from "@boltronx/solid-ui";

function confirmDelete() {
  return modal.open<"delete">({
    content: ctx => (
      <Modal>
        <Modal.Header title="Delete project?" {...ctx} />
        <Modal.Body>This removes the project and its files. You can't undo this.</Modal.Body>
        <Modal.Footer>
          <Button onClick={() => ctx.close()}>Cancel</Button>
          <Button variant="danger" onClick={() => ctx.close("delete")}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    )
  });
}

function rename() {
  return modal.open<{ name: string }>({
    // A top dialog on wide screens, a bottom sheet on phones
    position: { top: "10vh", bottom: 0 },
    content: ctx => (
      <Modal>
        <form
          onSubmit={event => {
            event.preventDefault();
            ctx.close({ name: String(new FormData(event.currentTarget).get("name")) });
          }}
        >
          <Modal.Header title="Rename" {...ctx} />
          <Modal.Body>
            <Input label="Name" name="name" defaultValue="Untitled" required autoFocus />
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => ctx.close()}>Cancel</Button>
            <Button type="submit" variant="primary">
              Rename
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    )
  });
}

async function onDelete() {
  if ((await confirmDelete()) === "delete") message.success("Project deleted");
}

async function onRename() {
  const result = await rename();
  // A dismissed modal resolves with its reason ("escape", "backdrop", ...) instead
  if (typeof result === "object") message.success(`Renamed to ${result.name}`);
}

export default function Demo() {
  return (
    <Group wrap>
      <Button variant="danger" onClick={onDelete}>
        Delete project
      </Button>
      <Button onClick={onRename}>Rename</Button>
    </Group>
  );
}
