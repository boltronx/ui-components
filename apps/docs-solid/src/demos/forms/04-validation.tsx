export const meta = {
  title: "Showing errors",
  description:
    "Submit with empty fields. Each error is read out by screen readers as it appears, and focusFirstInvalid moves focus to the first field that needs fixing."
};

import { createSignal } from "solid-js";

import { Button, focusFirstInvalid, Group, Input, Select, Stack } from "@boltronx/solid-ui";

type Errors = Partial<Record<"name" | "email" | "team", string>>;

const teams = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" }
];

export default function Demo() {
  const [errors, setErrors] = createSignal<Errors>({});

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const next: Errors = {};
    if (!String(data.get("name")).trim()) next.name = "Enter your name";
    if (!String(data.get("email")).includes("@"))
      next.email = "Enter an email like ada@example.com";
    if (!data.get("team")) next.team = "Pick a team";
    setErrors(next);
    void focusFirstInvalid(form);
  };

  return (
    <form noValidate onSubmit={submit} onReset={() => setErrors({})}>
      <Stack style={{ "max-width": "22rem" }}>
        <Input label="Name" name="name" required error={errors().name} />
        <Input label="Email" name="email" type="email" required error={errors().email} />
        <Select label="Team" name="team" options={teams} required error={errors().team} />
        <Group>
          <Button type="submit" variant="primary">
            Join
          </Button>
          <Button type="reset">Reset</Button>
        </Group>
      </Stack>
    </form>
  );
}
