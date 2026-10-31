export const meta = {
  title: "Select",
  description: "searchable filters the options; clearable adds a clear button."
};

import { Select, SimpleGrid } from "@boltronx/solid-ui";

const countries = [
  { value: "ph", label: "Philippines" },
  { value: "jp", label: "Japan" },
  { value: "sg", label: "Singapore", description: "Southeast Asia" },
  { value: "us", label: "United States" },
  { value: "de", label: "Germany", disabled: true }
];

export default function Demo() {
  return (
    <SimpleGrid minChildWidth="14rem">
      <Select label="Country" placeholder="Pick one" options={countries} />
      <Select
        label="Searchable"
        placeholder="Search countries"
        options={countries}
        searchable
        clearable
        defaultValue="jp"
      />
    </SimpleGrid>
  );
}
