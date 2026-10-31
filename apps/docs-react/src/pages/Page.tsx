import type { ReactNode } from "react";

import { Stack, Text, Title } from "@boltronx/react-ui";

/** Page heading plus content, with the spacing every docs page shares. */
export function Page(props: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <Stack gap="xl">
      <Stack gap="xs">
        <Title order={1}>{props.title}</Title>
        {props.lead ? (
          <Text size="md" c="dimmed">
            {props.lead}
          </Text>
        ) : null}
      </Stack>
      {props.children}
    </Stack>
  );
}

export function Section(props: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm">
      <Title order={2} size={3}>
        {props.title}
      </Title>
      {props.children}
    </Stack>
  );
}
