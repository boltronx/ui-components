export const meta = { title: "InputPassword and InputSearch" };

import { InputPassword, InputSearch, SimpleGrid } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <SimpleGrid minChildWidth="14rem">
      <InputPassword label="Password" autocomplete="current-password" />
      <InputSearch label="Search" placeholder="Type, then clear it" />
    </SimpleGrid>
  );
}
