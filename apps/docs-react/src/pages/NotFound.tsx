import { Anchor, Text } from "@boltronx/react-ui";

import { RouterLink } from "../RouterLink";

import { Page } from "./Page";

export function NotFound() {
  return (
    <Page title="Page not found">
      <Text>
        This page does not exist.{" "}
        <Anchor component={RouterLink} href="/">
          Go to Getting started
        </Anchor>
        .
      </Text>
    </Page>
  );
}
