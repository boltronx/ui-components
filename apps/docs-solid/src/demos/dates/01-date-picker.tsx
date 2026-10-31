export const meta = {
  title: "DatePicker",
  description:
    "Click the month to pick a month or year. Arrow keys move, Page Up/Down change month. With clearable, Backspace clears."
};

import { DatePicker, SimpleGrid, toISODate } from "@boltronx/solid-ui";

const today = toISODate(new Date());

export default function Demo() {
  return (
    <SimpleGrid minChildWidth="14rem">
      <DatePicker label="Due date" defaultValue={today} clearable />
      <DatePicker label="From today on" min={today} placeholder="Future dates only" />
      <DatePicker
        label="Weekdays only"
        excludeDate={iso => [0, 6].includes(new Date(`${iso}T00:00`).getDay())}
        firstDayOfWeek={1}
      />
      <DatePicker
        label="Long format"
        defaultValue={today}
        prefix="As of"
        format={{ dateStyle: "long" }}
      />
    </SimpleGrid>
  );
}
