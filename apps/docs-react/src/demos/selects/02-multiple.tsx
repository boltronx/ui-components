export const meta = {
  title: "Multiple",
  description: "Submits one entry per value; read them with formData.getAll(name)."
};

import { Select, SimpleGrid } from "@boltronx/react-ui";

const skills = ["TypeScript", "React", "CSS", "Node.js", "SQL"].map(label => ({
  value: label.toLowerCase(),
  label
}));

export default function Demo() {
  return (
    <SimpleGrid minChildWidth="14rem">
      <Select label="Skills" options={skills} multiple defaultValue={["react", "css"]} />
      <Select
        label="One line"
        options={skills}
        multiple
        ellipsis
        clearable
        defaultValue={["typescript", "sql"]}
      />
    </SimpleGrid>
  );
}
