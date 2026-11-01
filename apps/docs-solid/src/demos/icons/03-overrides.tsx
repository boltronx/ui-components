export const meta = {
  title: "Replacing built-in icons",
  description:
    "The icons components draw themselves are swapped with props: chevronIcon, clearIcon and checkIcon on Select; visibilityToggleIcon on InputPassword; calendarIcon, previousIcon and nextIcon on DatePicker; closeIcon on Modal.Header; emptyIcon on Table; and icon in message options."
};

import { Button, Group, InputPassword, message, Select, Stack } from "@boltronx/solid-ui";
import {
  IconCircleCheckFilled,
  IconEye,
  IconEyeClosed,
  IconSelector,
  IconX
} from "@tabler/icons-solidjs";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" }
];

export default function Demo() {
  return (
    <Stack style={{ "max-width": "20rem" }}>
      <Select
        label="Fruit"
        options={fruits}
        clearable
        defaultValue="banana"
        chevronIcon={<IconSelector />}
        clearIcon={<IconX />}
        checkIcon={<IconCircleCheckFilled />}
      />
      <InputPassword
        label="Password"
        visibilityToggleIcon={({ visible }) => (visible ? <IconEyeClosed /> : <IconEye />)}
      />
      <Group>
        <Button onClick={() => message.success("Saved", { icon: <IconCircleCheckFilled /> })}>
          Show message
        </Button>
      </Group>
    </Stack>
  );
}
