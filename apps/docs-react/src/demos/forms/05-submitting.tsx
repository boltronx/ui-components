export const meta = {
  title: "Submitting",
  description:
    "A submit button shows loading while the form sends, here from useFormStatus. Click it, or press Enter in the field, and keep pressing Enter while it saves: the form is sent once, and focus stays where it was."
};

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, Group, Input, message, Text } from "@boltronx/react-ui";

/** A stand-in for a request that takes a while, e.g. fetch("/api/subscribe", { body }). */
const save = (email: string) =>
  new Promise<string>(resolve => setTimeout(() => resolve(email), 1500));

/** Reads the pending state of the form it sits in, so it works with any form action. */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending}>
      {pending ? "Subscribing" : "Subscribe"}
    </Button>
  );
}

export default function Demo() {
  const [requests, setRequests] = useState(0);

  const subscribe = async (formData: FormData) => {
    setRequests(count => count + 1);
    const email = await save(String(formData.get("email")));
    message.success(`Subscribed ${email}`);
  };

  return (
    <form action={subscribe}>
      <Group align="flex-end">
        <Input label="Email" name="email" type="email" required style={{ flex: 1 }} />
        <SubmitButton />
      </Group>
      <Text size="sm" c="dimmed" style={{ marginTop: "var(--bx-spacing-xs)" }}>
        Requests sent: {requests}
      </Text>
    </form>
  );
}
