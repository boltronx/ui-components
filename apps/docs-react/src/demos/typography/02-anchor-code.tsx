export const meta = {
  title: "Anchor and Code",
  description:
    "With a router, pass its link as component, e.g. Next.js Link, to keep client-side navigation."
};

import { Anchor, Code, Stack, Text } from "@boltronx/react-ui";

const snippet = `const data = new FormData(form);
console.log(data.get("email"));`;

export default function Demo() {
  return (
    <Stack>
      <Text>
        Read the <Anchor href="https://react.dev">React docs</Anchor>, or the{" "}
        <Anchor href="https://github.com/boltronx/ui-components" underline="always">
          source code
        </Anchor>
        .
      </Text>
      <Text>
        Install it with <Code>npm install @boltronx/react-ui</Code>.
      </Text>
      <Code block>{snippet}</Code>
    </Stack>
  );
}
