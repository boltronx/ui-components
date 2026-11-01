import { A } from "@solidjs/router";

import { Anchor, Text } from "@boltronx/solid-ui";

import { Page } from "./Page";

export function NotFound() {
  return (
    <Page title="Page not found">
      <Text>
        This page doesn't exist.{" "}
        <Anchor component={A} href="/">
          Go to Getting started
        </Anchor>
        .
      </Text>
    </Page>
  );
}
