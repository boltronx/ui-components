export const meta = {
  title: "message",
  description:
    "Short notifications, announced to screen readers (errors right away). Hovering one pauses its timer. Up to three show at once and the rest wait their turn; change that with message.config({ limit })."
};

import { Button, Group, message } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Group wrap>
      <Button onClick={() => message.success("Changes saved")}>Success</Button>
      <Button onClick={() => message.error("Couldn't reach the server")}>Error</Button>
      <Button onClick={() => message.warning("Your session ends in 5 minutes")}>Warning</Button>
      <Button onClick={() => message.info("A new version is available")}>Info</Button>
      <Button
        variant="subtle"
        onClick={() => {
          for (const n of [1, 2, 3, 4, 5]) message.info(`Upload ${n} of 5 finished`, 2);
        }}
      >
        Send five
      </Button>
    </Group>
  );
}
