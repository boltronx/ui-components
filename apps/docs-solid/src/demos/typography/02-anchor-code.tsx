export const meta = {
  title: "Anchor and Code",
  description: "With a router, pass component={A} to keep client-side navigation."
};

import { Anchor, Code, Stack, Text } from "@boltronx/solid-ui";

const snippet = `const data = new FormData(form);
console.log(data.get("email"));`;

export default function Demo() {
  return (
    <Stack>
      <Text>
        Read the <Anchor href="https://docs.solidjs.com">Solid docs</Anchor>, or the{" "}
        <Anchor href="https://github.com/boltronx/ui-components" underline="always">
          source code
        </Anchor>
        .
      </Text>
      <Text>
        Install it with <Code>npm install @boltronx/solid-ui</Code>.
      </Text>
      <Code block>{snippet}</Code>
    </Stack>
  );
}
