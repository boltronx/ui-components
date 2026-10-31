export const meta = {
  title: "Closable and persistent messages",
  description:
    "closable adds a close button. 0 seconds keeps a message until it is closed, and makes it closable. Every call returns a function that closes its message, for one that waits on work."
};

import { Button, Group, message } from "@boltronx/solid-ui";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function upload() {
  const close = message.info("Uploading report.pdf…", 0);
  await wait(2500);
  close();
  message.success("Uploaded report.pdf");
}

export default function Demo() {
  return (
    <Group wrap>
      <Button onClick={() => message.error("Payment failed", { closable: true })}>Closable</Button>
      <Button onClick={() => message.warning("You're offline. Changes are saved locally.", 0)}>
        Until closed
      </Button>
      <Button onClick={upload}>Upload</Button>
    </Group>
  );
}
