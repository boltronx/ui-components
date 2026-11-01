export const meta = { title: "Autocomplete", description: "Free text with suggestions." };

import { Autocomplete } from "@boltronx/solid-ui";

const cities = ["Manila", "Cebu", "Davao", "Iloilo", "Baguio"].map(label => ({
  value: label,
  label
}));

export default function Demo() {
  return <Autocomplete label="City" placeholder="Start typing" options={cities} />;
}
