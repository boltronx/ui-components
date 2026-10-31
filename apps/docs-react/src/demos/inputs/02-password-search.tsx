export const meta = { title: "InputPassword and InputSearch" };

import { InputPassword, InputSearch, SimpleGrid } from "@boltronx/react-ui";

export default function Demo() {
  return (
    <SimpleGrid minChildWidth="14rem">
      <InputPassword label="Password" autoComplete="current-password" />
      <InputSearch label="Search" placeholder="Type, then clear it" />
    </SimpleGrid>
  );
}
