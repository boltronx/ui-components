export const meta = {
  title: "Modals inside your app",
  description:
    "Render <ModalHost /> once inside your providers, and modal content can use them: here the router's useNavigate. Without it, modals still open, but can't see your app's context."
};

import { useNavigate } from "@solidjs/router";

import { Button, Modal, modal } from "@boltronx/solid-ui";

// In the app's root layout, inside the router:
//   <ModalHost />

function GoToTheming(props: { onGo: () => void }) {
  const navigate = useNavigate();
  return (
    <Button
      variant="primary"
      onClick={() => {
        props.onGo();
        navigate("/theming");
      }}
    >
      Open Theming
    </Button>
  );
}

function openTour() {
  return modal.open({
    content: ctx => (
      <Modal>
        <Modal.Header title="Make it yours" {...ctx} />
        <Modal.Body>Colors, radius and fonts are CSS variables. See the theming guide.</Modal.Body>
        <Modal.Footer>
          <Button onClick={() => ctx.close()}>Later</Button>
          <GoToTheming onGo={() => ctx.close()} />
        </Modal.Footer>
      </Modal>
    )
  });
}

export default function Demo() {
  return <Button onClick={openTour}>Take the tour</Button>;
}
