export const meta = {
  title: "Submitting",
  description:
    "A submit button shows loading while the form sends, here from a signal set in onSubmit. Click it, or press Enter in the field, and keep pressing Enter while it saves: the form is sent once, and focus stays where it was."
};

import { createSignal } from "solid-js";

import { Button, Group, Input, message, Text } from "@boltronx/solid-ui";

/** A stand-in for a request that takes a while, e.g. fetch("/api/subscribe", { body }). */
const save = (email: string) =>
  new Promise<string>(resolve => setTimeout(() => resolve(email), 1500));

export default function Demo() {
  const [saving, setSaving] = createSignal(false);
  const [requests, setRequests] = createSignal(0);

  const subscribe = async (event: SubmitEvent) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    setSaving(true);
    setRequests(count => count + 1);
    try {
      const email = await save(String(data.get("email")));
      message.success(`Subscribed ${email}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={subscribe}>
      <Group align="flex-end">
        <Input label="Email" name="email" type="email" required style={{ flex: 1 }} />
        <Button type="submit" variant="primary" loading={saving()}>
          {saving() ? "Subscribing" : "Subscribe"}
        </Button>
      </Group>
      <Text size="sm" c="dimmed" style={{ "margin-top": "var(--bx-spacing-xs)" }}>
        Requests sent: {requests()}
      </Text>
    </form>
  );
}
